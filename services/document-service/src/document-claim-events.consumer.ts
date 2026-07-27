import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { v5 as uuidv5 } from 'uuid';
import { ConsumedEvent, consumeOnce, createLogger, EventEnvelope, DeadLetterQueueService } from '@insurance/shared';
import { Document } from './entities/Document';

@Injectable()
export class DocumentClaimEventsConsumer implements OnModuleInit, OnModuleDestroy {
  private consumer?: Consumer;
  private dlq?: DeadLetterQueueService;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private readonly maxRetries = 5;
  private retryCount = 0;

  private logger = createLogger({
    serviceName: 'document-service',
    prettyPrint: process.env.NODE_ENV !== 'production',
  });

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ConsumedEvent) private readonly consumedRepo: Repository<ConsumedEvent>,
    @InjectRepository(Document) private readonly documentRepo: Repository<Document>,
  ) {}

  async onModuleInit(): Promise<void> {
    this.dlq = new DeadLetterQueueService(
      { dataSource: this.dataSource },
      this.logger as any,
    );
    try {
      await this.start();
    } catch (err) {
      this.logger.error('Failed to start document claim events consumer on init, will retry in background', err as Error);
      this.scheduleRetry();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    await this.consumer?.disconnect();
  }

  private scheduleRetry(): void {
    const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000);
    this.retryTimer = setTimeout(async () => {
      this.retryCount++;
      if (this.retryCount > this.maxRetries) {
        this.logger.error(`Kafka consumer max retries (${this.maxRetries}) exhausted, giving up`);
        return;
      }
      try {
        await this.start();
        this.retryCount = 0;
      } catch (err) {
        this.logger.error(`Kafka consumer retry ${this.retryCount} failed`, err as Error);
        this.scheduleRetry();
      }
    }, delay);
  }

  private async start(): Promise<void> {
    const brokersEnv = process.env.KAFKA_BROKERS;
    if (!brokersEnv) {
      throw new Error('KAFKA_BROKERS environment variable is required');
    }
    const kafkaBrokers = brokersEnv.split(',').map((x) => x.trim()).filter(Boolean);
    const groupId = process.env.KAFKA_CONSUMER_GROUP || 'document-claims-v1';

    const kafka = new Kafka({
      clientId: 'document-service',
      brokers: kafkaBrokers,
    });
    this.consumer = kafka.consumer({ groupId });
    await this.consumer.connect();

    const topics = [
      'insurance.claim.registered',
      'insurance.claim.closed',
    ];
    for (const topic of topics) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
    }

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.handleMessage(payload);
      },
    });

    this.logger.info('Document claim events consumer started', { groupId, topics });
  }

  private deterministicEventId(topic: string, partition: number, offset: string): string {
    const seed = `${topic}-${partition}-${offset}`;
    return uuidv5(seed, uuidv5.DNS);
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    const rawEventId = message.key?.toString() || `${topic}-${partition}-${message.offset}`;

    let envelope: EventEnvelope<any>;
    try {
      envelope = JSON.parse(message.value?.toString() || '{}');
    } catch (err) {
      this.logger.error('Failed to parse claim event payload, sending to DLQ', err as Error, { topic, rawEventId });
      await this.sendToDLQ(topic, message, err as Error, partition);
      return;
    }

    const evtId = envelope.eventId || this.deterministicEventId(topic, partition, message.offset?.toString() || '0');
    const consumerName = 'document-claims';

    try {
      const result = await consumeOnce<void>({
        dataSource: this.dataSource,
        consumerName,
        topic,
        eventId: evtId,
        handler: async () => {
          if (topic === 'insurance.claim.registered' && envelope.eventType === 'ClaimRegistered') {
            await this.handleClaimRegistered(envelope);
          } else if (topic === 'insurance.claim.closed' && envelope.eventType === 'ClaimClosed') {
            await this.handleClaimClosed(envelope);
          }
        },
      });

      if (!result.consumed) {
        this.logger.debug('Skipping already consumed event', { eventId: evtId, topic });
      }
    } catch (err) {
      this.logger.error('Failed to process claim event, sending to DLQ', err as Error, { topic, eventId: evtId });
      await this.sendToDLQ(topic, message, err as Error, partition);
    }
  }

  private async sendToDLQ(topic: string, message: any, err: Error, partition: number): Promise<void> {
    try {
      await this.dlq?.addToDLQ(topic, message, err, 'document-claims', partition).catch((dlqErr: Error) => {
        this.logger.error('Failed to add message to DLQ', dlqErr, { topic });
      });
    } catch (dlqErr) {
      this.logger.error('Failed to send to DLQ', dlqErr as Error, { topic });
    }
  }

  private async handleClaimRegistered(envelope: EventEnvelope<any>): Promise<void> {
    const claimId = envelope.subject?.claimId;
    if (!claimId) {
      this.logger.warn('ClaimRegistered event without claimId, skipping', { eventId: envelope.eventId });
      return;
    }

    this.logger.info('Claim registered event received, preparing document slot', {
      claimId,
      tenantId: envelope.tenantId,
      eventId: envelope.eventId,
    });
  }

  private async handleClaimClosed(envelope: EventEnvelope<any>): Promise<void> {
    const claimId = envelope.subject?.claimId;
    if (!claimId) {
      this.logger.warn('ClaimClosed event without claimId, skipping', { eventId: envelope.eventId });
      return;
    }

    const tenantId = envelope.tenantId;
    if (!tenantId) {
      this.logger.warn('ClaimClosed event without tenantId, skipping', { claimId, eventId: envelope.eventId });
      return;
    }

    const docs = await this.documentRepo.find({ where: { claimId, tenantId } });
    let updated = 0;
    for (const doc of docs) {
      if (doc.status === 'pending' || doc.status === 'extracting') {
        doc.status = 'failed';
        await this.documentRepo.save(doc);
        updated++;
      }
    }

    this.logger.info('Claim closed, marked pending documents as failed', {
      claimId, tenantId, documentCount: docs.length, updatedCount: updated, eventId: envelope.eventId,
    });
  }
}

