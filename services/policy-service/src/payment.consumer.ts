import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { ConsumedEvent, DeadLetterEvent } from '@insurance/shared';
import { PolicyService } from './policy.service';

@Injectable()
export class PaymentConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentConsumer.name);
  private readonly consumerName = 'policy-service';
  private kafka: Kafka | null = null;
  private consumer: Consumer | null = null;

  constructor(
    private readonly policyService: PolicyService,
    @InjectRepository(ConsumedEvent)
    private readonly consumedEventRepo: Repository<ConsumedEvent>,
    @InjectRepository(DeadLetterEvent)
    private readonly deadLetterRepo: Repository<DeadLetterEvent>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    const brokers = process.env.KAFKA_BROKERS?.split(',').map(b => b.trim()).filter(Boolean) || [];
    if (brokers.length === 0) {
      this.logger.warn('KAFKA_BROKERS not set, PaymentConsumer will not start');
      return;
    }

    this.kafka = new Kafka({
      clientId: 'policy-service-consumer',
      brokers,
    });

    this.consumer = this.kafka.consumer({ groupId: 'policy-service-payment-group' });
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'insurance.payment.executed', fromBeginning: false });

    this.logger.log('PaymentConsumer subscribed to insurance.payment.executed');

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.handleMessage(payload);
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.consumer) {
        await this.consumer.disconnect();
        this.logger.log('PaymentConsumer disconnected');
      }
    } catch (err) {
      this.logger.error('Error disconnecting PaymentConsumer', err);
    }
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    const key = message.key?.toString() || '';
    const value = message.value?.toString() || '';

    let event: any;
    try {
      event = JSON.parse(value);
    } catch {
      this.logger.error(`Failed to parse message on ${topic}:${partition}:${message.offset}`);
      await this.deadLetterRepo.save({
        topic,
        partition,
        offset: message.offset,
        key,
        value,
        error: 'JSON_PARSE_ERROR',
        consumerName: this.consumerName,
        createdAt: new Date(),
      });
      // Mark consumed for malformed messages so Kafka does not redeliver poison payload.
      return;
    }

    const eventId = event.eventId || event.id || `${topic}-${key}-${partition}-${message.offset}`;
    const correlationId = event.correlationId || key;

    const existing = await this.consumedEventRepo.findOne({
      where: { eventId, consumerName: this.consumerName },
    });
    if (existing) {
      this.logger.debug(`Duplicate message skipped: eventId=${eventId}`);
      return;
    }

    const policyId = event.payload?.policyId;
    const paymentId = event.payload?.paymentId;
    if (!policyId || !paymentId) {
      this.logger.warn(`Payment executed event missing policyId/paymentId, eventId=${eventId}`);
      await this.deadLetterRepo.save({
        topic,
        partition,
        offset: message.offset,
        key,
        value,
        error: `MISSING_FIELDS: policyId=${policyId}, paymentId=${paymentId}`,
        consumerName: this.consumerName,
        createdAt: new Date(),
      });
      return;
    }

    try {
      this.logger.log(`Processing payment.executed for policyId=${policyId}, paymentId=${paymentId}, eventId=${eventId}`);

      // Issue is idempotent and fail-closed: it verifies payment with payments-service.
      await this.policyService.issue({
        policyId,
        paymentId,
        correlationId,
        tenantId: event.tenantId,
        actorUserId: event.actorUserId || null,
      });

      // Only mark consumed after successful, atomic processing.
      await this.consumedEventRepo.save({
        eventId,
        consumerName: this.consumerName,
        topic,
        processedAt: new Date(),
      });

      this.logger.log(`Policy ${policyId} auto-issued after payment confirmation`);
    } catch (err: any) {
      this.logger.error(
        `Failed to process payment.executed event: ${err?.message || err}`,
        err?.stack,
      );

      // Record failure details, but do NOT mark consumed so Kafka will retry.
      // Permanent/non-retriable failures will reach retry limits and can be routed to DLQ by Kafka/ops.
      await this.deadLetterRepo.save({
        topic,
        partition,
        offset: message.offset,
        key,
        value,
        error: err?.message || 'PROCESSING_ERROR',
        consumerName: this.consumerName,
        createdAt: new Date(),
      });

      // Re-throw to prevent Kafka offset commit and enable retry semantics.
      throw err;
    }
  }
}
