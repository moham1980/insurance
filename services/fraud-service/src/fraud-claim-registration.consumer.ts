import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { ConsumedEvent, createLogger, EventEnvelope, DeadLetterQueueService, OutboxPublisher } from '@insurance/shared';
import { FraudCase } from './entities/FraudCase';
import { FraudScoreAudit } from './entities/FraudScoreAudit';
import { v4 as uuidv4 } from 'uuid';
import { KafkaMessage } from 'kafkajs';

@Injectable()
export class FraudClaimRegistrationConsumer implements OnModuleInit, OnModuleDestroy {
  private consumer?: Consumer;
  private dlq?: DeadLetterQueueService;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private readonly maxRetries = 5;
  private retryCount = 0;

  private logger = createLogger({
    serviceName: 'fraud-service',
    prettyPrint: process.env.NODE_ENV !== 'production',
  });

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ConsumedEvent) private readonly consumedRepo: Repository<ConsumedEvent>,
    @InjectRepository(FraudCase) private readonly fraudRepo: Repository<FraudCase>,
    @InjectRepository(FraudScoreAudit) private readonly scoreAuditRepo: Repository<FraudScoreAudit>,
  ) {}

  async onModuleInit(): Promise<void> {
    this.dlq = new DeadLetterQueueService(
      { dataSource: this.dataSource },
      this.logger as any,
    );
    try {
      await this.start();
    } catch (err) {
      this.logger.error('Failed to start claim registration consumer on init, will retry in background', err as Error);
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
    const groupId = process.env.KAFKA_CONSUMER_GROUP_CLAIMS || 'fraud-claims-v1';

    const kafka = new Kafka({
      clientId: 'fraud-service-claims',
      brokers: kafkaBrokers,
    });
    this.consumer = kafka.consumer({ groupId });
    await this.consumer.connect();

    const topics = [
      'insurance.claim.registered',
    ];
    for (const topic of topics) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
    }

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.handleMessage(payload);
      },
    });

    this.logger.info('Fraud claim registration consumer started', { groupId, topics });
  }

  private async ensureIdempotent(eventId: string, consumerName: string, topic: string): Promise<boolean> {
    const existing = await this.consumedRepo.findOne({ where: { eventId, consumerName } });
    if (existing) return false;

    await this.consumedRepo.save(
      this.consumedRepo.create({
        eventId,
        consumerName,
        topic,
      }),
    );
    return true;
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    const eventId = message.key?.toString() || `${topic}-${partition}-${message.offset}`;

    try {
      const envelope: EventEnvelope<any> = JSON.parse(message.value?.toString() || '{}');
      const evtId = envelope.eventId || eventId;
      const consumerName = 'fraud-claims';

      const isNew = await this.ensureIdempotent(evtId, consumerName, topic);
      if (!isNew) {
        this.logger.debug('Skipping already consumed event', { eventId: evtId, topic });
        return;
      }

      if (envelope.eventType === 'ClaimRegistered') {
        await this.handleClaimRegistered(envelope);
      }
    } catch (err) {
      this.logger.error('Failed to process claim registration event, sending to DLQ', err as Error, { topic, eventId });
      try {
        await this.dlq?.addToDLQ(topic, message, err as Error, 'fraud-claims', partition).catch((dlqErr: Error) => {
          this.logger.error('Failed to add message to DLQ', dlqErr, { eventId });
        });
      } catch (dlqErr) {
        this.logger.error('Failed to send to DLQ', dlqErr as Error, { eventId });
      }
    }
  }

  private async handleClaimRegistered(envelope: EventEnvelope<any>): Promise<void> {
    const claimId = envelope.subject?.claimId;
    if (!claimId) {
      this.logger.warn('ClaimRegistered event without claimId, skipping', { eventId: envelope.eventId });
      return;
    }

    const claimData = envelope.payload || {};
    const policyId = claimData.policyId || envelope.subject?.policyId;
    const claimantPartyId = claimData.claimantPartyId;
    const lossType = claimData.lossType;
    const description = claimData.description;
    const grossClaimAmount = claimData.grossClaimAmount;

    this.logger.info('Processing ClaimRegistered for fraud scoring', {
      claimId, policyId, eventId: envelope.eventId,
    });

    await this.dataSource.transaction(async (manager) => {
      const fraudCase = manager.getRepository(FraudCase).create({
        claimId,
        claimNumber: claimData.claimNumber || claimId,
        policyId: policyId || null,
        partyId: claimantPartyId || null,
        score: 50,
        signals: ['auto_screening'],
        status: 'open',
        holdClaim: true,
        notes: `Auto-created from ClaimRegistered event. Loss type: ${lossType || 'unknown'}`,
        amount: grossClaimAmount || null,
        metadata: { lossType: lossType || null, description: description || null, sourceEventId: envelope.eventId },
      });
      await manager.getRepository(FraudCase).save(fraudCase);

      const scoreAudit = manager.getRepository(FraudScoreAudit).create({
        claimId,
        correlationId: envelope.correlationId || null,
        tenantId: envelope.tenantId || null,
        actorUserId: null,
        action: 'auto_screening',
        status: 'open',
        input: { lossType, description, grossClaimAmount, policyId, claimantPartyId },
        score: 50,
        signals: ['auto_screening'],
        threshold: 70,
        holdClaim: true,
      });
      await manager.getRepository(FraudScoreAudit).save(scoreAudit);

      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.fraud.screening.initiated',
        eventType: 'FraudScreeningInitiated',
        eventVersion: 1,
        correlationId: envelope.correlationId || uuidv4(),
        subject: { claimId, fraudCaseId: fraudCase.fraudCaseId },
        payload: {
          claimId,
          policyId: policyId || null,
          lossType: lossType || null,
          grossClaimAmount: grossClaimAmount || null,
          initialRiskLevel: 'medium',
        },
        producer: 'fraud-service',
      });
    });

    this.logger.info('Fraud screening initiated for claim', { claimId, eventId: envelope.eventId });
  }
}
