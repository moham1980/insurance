import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Kafka, Consumer, EachMessagePayload, KafkaMessage } from 'kafkajs';
import { createLogger, DeadLetterQueueService, EventEnvelope } from '@insurance/shared';
import { Claim } from './entities/Claim';

@Injectable()
export class ClaimsEventsConsumer implements OnModuleInit, OnModuleDestroy {
  private consumer?: Consumer;
  private dlq?: DeadLetterQueueService;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private readonly maxRetries = 5;
  private retryCount = 0;

  private logger = createLogger({
    serviceName: 'claims-service',
    prettyPrint: process.env.NODE_ENV !== 'production',
  });

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    this.dlq = new DeadLetterQueueService({ dataSource: this.dataSource }, this.logger as any);
    try {
      await this.start();
    } catch (err) {
      this.logger.error('Failed to start Kafka consumer on init, will retry in background', err as Error);
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
    const groupId = process.env.KAFKA_CONSUMER_GROUP || 'claims-events-v1';

    const kafka = new Kafka({ clientId: 'claims-service', brokers: kafkaBrokers });
    this.consumer = kafka.consumer({ groupId });
    await this.consumer.connect();

    const topics = [
      'insurance.fraud.case.escalated',
      'insurance.fraud.case.resolved',
      'insurance.payment.executed',
      'insurance.payment.failed',
    ];
    for (const topic of topics) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
    }

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.handleMessage(payload);
      },
    });

    this.logger.info('Claims events consumer started', { groupId, topics });
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    const rawValue = message.value?.toString() || '{}';
    const fallbackEventId = `${topic}-${partition}-${message.offset}`;
    let eventId = fallbackEventId;

    try {
      const envelope: EventEnvelope<any> = JSON.parse(rawValue);
      eventId = envelope.eventId || fallbackEventId;

      await this.dataSource.transaction(async (manager) => {
        const consumerName = 'claims-events';
        const inserted = await manager.query(
          `INSERT INTO consumed_events(event_id, consumer_name, consumed_at, topic)
           VALUES ($1, $2, NOW(), $3)
           ON CONFLICT (event_id, consumer_name) DO NOTHING
           RETURNING event_id;`,
          [eventId, consumerName, topic],
        );

        if (!Array.isArray(inserted) || inserted.length === 0) {
          this.logger.debug('Skipping already consumed event', { eventId, topic });
          return;
        }

        await this.handleVerifiedEvent(envelope, topic, manager);

        await manager.query(
          `UPDATE consumed_events
           SET processed = true, processed_at = NOW()
           WHERE event_id = $1 AND consumer_name = $2;`,
          [eventId, consumerName],
        );
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to process event, sending to DLQ', error, { topic, eventId });
      await this.sendToDLQ(topic, message, error, partition);
    }
  }

  private async sendToDLQ(topic: string, message: KafkaMessage, error: Error, partition: number): Promise<void> {
    try {
      await this.dlq?.initialize?.();
      await this.dlq?.addToDLQ(topic, message, error, 'claims-events', partition);
    } catch (dlqErr) {
      this.logger.error('Failed to add message to DLQ', dlqErr as Error, { topic, eventId: message.key?.toString() });
    }
  }

  private async handleVerifiedEvent(
    envelope: EventEnvelope<any>,
    topic: string,
    manager: EntityManager,
  ): Promise<void> {
    if (topic.startsWith('insurance.fraud.')) {
      await this.handleFraudEvent(envelope, manager);
    } else if (topic.startsWith('insurance.payment.')) {
      await this.handlePaymentEvent(envelope, topic, manager);
    }
  }

  private async handleFraudEvent(envelope: EventEnvelope<any>, manager: EntityManager): Promise<void> {
    const claimId = envelope.subject?.claimId;
    const eventTenantId = envelope.subject?.tenantId || envelope.payload?.tenantId;

    if (!claimId) {
      this.logger.warn('Fraud event without claimId, skipping', { eventId: envelope.eventId });
      return;
    }

    const claimRepo = manager.getRepository(Claim);
    const claim = await claimRepo.findOne({ where: { claimId } });
    if (!claim) {
      this.logger.warn('Claim not found for fraud event', { claimId, eventId: envelope.eventId });
      return;
    }

    this.assertTenantMatch(claim, eventTenantId);

    if (envelope.eventType === 'FraudCaseEscalated') {
      this.assertAllowedStates('fraud escalation', claim.status, ['registered', 'assessed', 'adjuster_review']);
      claim.requiresHumanTriage = true;
      claim.status = 'adjuster_review';
      claim.metadata = {
        ...(claim.metadata || {}),
        fraudEscalatedAt: new Date().toISOString(),
        fraudEventId: envelope.eventId,
      };
      await claimRepo.save(claim);
      this.logger.info('Claim marked for human triage due to fraud escalation', {
        claimId,
        tenantId: claim.tenantId,
        eventId: envelope.eventId,
      });
    } else if (envelope.eventType === 'FraudCaseResolved') {
      const resolution = envelope.payload?.resolution;
      if (resolution === 'confirmed_fraud') {
        this.assertAllowedStates('fraud resolution', claim.status, ['registered', 'assessed', 'adjuster_review', 'approved']);
        claim.status = 'rejected';
        claim.metadata = {
          ...(claim.metadata || {}),
          fraudResolution: 'confirmed_fraud',
          fraudResolvedAt: new Date().toISOString(),
          fraudEventId: envelope.eventId,
        };
        await claimRepo.save(claim);
        this.logger.info('Claim rejected due to confirmed fraud', {
          claimId,
          tenantId: claim.tenantId,
          eventId: envelope.eventId,
        });
      } else if (resolution === 'cleared') {
        claim.metadata = {
          ...(claim.metadata || {}),
          fraudResolution: 'cleared',
          fraudResolvedAt: new Date().toISOString(),
          fraudEventId: envelope.eventId,
        };
        await claimRepo.save(claim);
        this.logger.info('Fraud case cleared for claim', {
          claimId,
          tenantId: claim.tenantId,
          eventId: envelope.eventId,
        });
      } else {
        this.logger.warn('Unknown fraud resolution, ignoring', { claimId, resolution, eventId: envelope.eventId });
      }
    }
  }

  private async handlePaymentEvent(
    envelope: EventEnvelope<any>,
    topic: string,
    manager: EntityManager,
  ): Promise<void> {
    const claimId = envelope.subject?.claimId;
    const eventTenantId = envelope.subject?.tenantId || envelope.payload?.tenantId;

    if (!claimId) {
      this.logger.warn('Payment event without claimId, skipping', { eventId: envelope.eventId });
      return;
    }

    const claimRepo = manager.getRepository(Claim);
    const claim = await claimRepo.findOne({ where: { claimId } });
    if (!claim) {
      this.logger.warn('Claim not found for payment event', { claimId, eventId: envelope.eventId });
      return;
    }

    this.assertTenantMatch(claim, eventTenantId);

    const amount = envelope.payload?.amount;
    const currency = envelope.payload?.currency || 'IRR';
    const paymentReference = envelope.payload?.paymentId || envelope.payload?.paymentReference;
    const status = envelope.payload?.status;

    if (envelope.eventType === 'PaymentExecuted' || topic === 'insurance.payment.executed') {
      this.verifyPayment(claim, amount, currency, paymentReference, status);
      this.assertAllowedStates('payment executed', claim.status, ['approved', 'paid']);
      claim.paidAmount = amount;
      claim.paymentReference = paymentReference ?? claim.paymentReference;
      claim.status = 'paid';
      claim.metadata = {
        ...(claim.metadata || {}),
        paymentExecutedAt: new Date().toISOString(),
        paymentEventId: envelope.eventId,
      };
      await claimRepo.save(claim);
      this.logger.info('Claim marked as paid', {
        claimId,
        tenantId: claim.tenantId,
        paidAmount: amount,
        paymentReference,
        eventId: envelope.eventId,
      });
    } else if (envelope.eventType === 'PaymentFailed' || topic === 'insurance.payment.failed') {
      this.assertAllowedStates('payment failed', claim.status, ['approved', 'paid']);
      claim.metadata = {
        ...(claim.metadata || {}),
        paymentFailedAt: new Date().toISOString(),
        paymentFailureReason: envelope.payload?.reason,
        paymentEventId: envelope.eventId,
      };
      if (claim.status === 'paid') {
        // Revert to approved so the payment can be retried/reconciled
        claim.status = 'approved';
      }
      await claimRepo.save(claim);
      this.logger.warn('Payment failed for claim', {
        claimId,
        tenantId: claim.tenantId,
        reason: envelope.payload?.reason,
        eventId: envelope.eventId,
      });
    }
  }

  private assertTenantMatch(claim: Claim, eventTenantId?: string): void {
    if (!eventTenantId) return;
    if (claim.tenantId !== eventTenantId) {
      const err: any = new Error(`Cross-tenant event ignored: expected ${claim.tenantId}, got ${eventTenantId}`);
      err.code = 'CROSS_TENANT_ACCESS_DENIED';
      throw err;
    }
  }

  private assertAllowedStates(context: string, current: string, allowed: string[]): void {
    if (!allowed.includes(current)) {
      const err: any = new Error(`${context}: invalid claim state ${current}`);
      err.code = 'INVALID_STATE';
      throw err;
    }
  }

  private verifyPayment(
    claim: Claim,
    amount: any,
    currency: string,
    paymentReference: any,
    status?: string,
  ): void {
    if (status && status !== 'executed' && status !== 'settled') {
      const err: any = new Error(`Payment status ${status} is not final`);
      err.code = 'INVALID_STATE';
      throw err;
    }
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
      const err: any = new Error('Invalid payment amount in event');
      err.code = 'AMOUNT_MISMATCH';
      throw err;
    }
    if (claim.approvedAmount != null && Math.abs(amount - claim.approvedAmount) > 1e-6) {
      const err: any = new Error(`Payment amount ${amount} does not match approved amount ${claim.approvedAmount}`);
      err.code = 'AMOUNT_MISMATCH';
      throw err;
    }
    if (claim.currency && claim.currency !== currency) {
      const err: any = new Error(`Payment currency ${currency} does not match claim currency ${claim.currency}`);
      err.code = 'CURRENCY_MISMATCH';
      throw err;
    }
    if (!paymentReference) {
      const err: any = new Error('Payment event missing payment reference');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
  }
}
