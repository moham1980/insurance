import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { Repository } from 'typeorm';
import { ConsumedEvent, createLogger, EventEnvelope, DeadLetterQueueService } from '@insurance/shared';
import { FraudDocumentAttachmentAudit } from './entities/FraudDocumentAttachmentAudit';

@Injectable()
export class FraudDocumentsConsumer implements OnModuleInit, OnModuleDestroy {
  private consumer?: Consumer;
  private dlq?: DeadLetterQueueService;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private readonly maxRetries = 5;
  private retryCount = 0;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ConsumedEvent) private readonly consumedRepo: Repository<ConsumedEvent>,
    @InjectRepository(FraudDocumentAttachmentAudit) private readonly auditRepo: Repository<FraudDocumentAttachmentAudit>
  ) {}

  private logger = createLogger({
    serviceName: 'fraud-service',
    prettyPrint: process.env.NODE_ENV !== 'production',
  });

  async onModuleInit(): Promise<void> {
    this.dlq = new DeadLetterQueueService(
      { dataSource: this.dataSource },
      this.logger as any
    );
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

  private getKafkaConfig() {
    const brokersEnv = process.env.KAFKA_BROKERS;
    if (!brokersEnv) {
      throw new Error('KAFKA_BROKERS environment variable is required');
    }
    const kafkaBrokers = brokersEnv.split(',');
    const consumerGroupId = process.env.KAFKA_CONSUMER_GROUP || 'fraud-documents-v1';
    return { kafkaBrokers, consumerGroupId };
  }

  private async ensureIdempotent(eventId: string, consumerName: string, topic: string): Promise<boolean> {
    const existing = await this.consumedRepo.findOne({ where: { eventId, consumerName } });
    if (existing) return false;

    await this.consumedRepo.save(
      this.consumedRepo.create({
        eventId,
        consumerName,
        topic,
      })
    );

    return true;
  }

  private safeJsonParseArray(s: any): string[] | null {
    if (typeof s !== 'string' || s.trim().length === 0) return null;
    try {
      const v = JSON.parse(s);
      if (!Array.isArray(v)) return null;
      return v.filter((x) => typeof x === 'string' && x.trim().length > 0);
    } catch {
      return null;
    }
  }

  private async applyClaimDocumentsAttached(envelope: EventEnvelope<any>): Promise<void> {
    if (envelope.eventType !== 'ClaimDocumentsAttached') return;

    const claimId = envelope.subject?.claimId;
    if (!claimId) {
      this.logger.warn('Skipping ClaimDocumentsAttached without claimId', { eventId: envelope.eventId });
      return;
    }

    const docs = Array.isArray(envelope.payload?.documents) ? envelope.payload.documents : [];
    for (const d of docs) {
      const documentId = d?.documentId;
      if (!documentId || typeof documentId !== 'string') continue;

      await this.auditRepo.save(
        this.auditRepo.create({
          claimId: String(claimId),
          documentId: String(documentId),
          documentType: d?.type ? String(d.type) : null,
          source: d?.source ? String(d.source) : null,
          storageRef: d?.storageRef ? String(d.storageRef) : null,
          correlationId: envelope.correlationId || null,
          tenantId: envelope.tenantId || null,
          actorUserId: null,
          eventId: envelope.eventId || null,
        })
      );
    }

    const subjectDocIds = this.safeJsonParseArray((envelope.subject as any)?.documentIds);
    if (subjectDocIds && subjectDocIds.length && docs.length === 0) {
      for (const documentId of subjectDocIds) {
        await this.auditRepo.save(
          this.auditRepo.create({
            claimId: String(claimId),
            documentId: String(documentId),
            documentType: null,
            source: null,
            storageRef: null,
            correlationId: envelope.correlationId || null,
            tenantId: envelope.tenantId || null,
            actorUserId: null,
            eventId: envelope.eventId || null,
          })
        );
      }
    }
  }

  private async start(): Promise<void> {
    const { kafkaBrokers, consumerGroupId } = this.getKafkaConfig();

    const kafka = new Kafka({
      clientId: 'fraud-service',
      brokers: kafkaBrokers.map((x) => x.trim()).filter(Boolean),
    });

    this.consumer = kafka.consumer({ groupId: consumerGroupId });
    await this.consumer.connect();

    const topics = ['insurance.claim.documents_attached'];
    for (const t of topics) {
      await this.consumer.subscribe({ topic: t, fromBeginning: true });
    }

    this.logger.info('Kafka consumer started', { groupId: consumerGroupId, topics });

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        const { topic, message, partition } = payload;
        const raw = message.value?.toString('utf-8');
        if (!raw) return;

        let envelope: EventEnvelope<any>;
        try {
          envelope = JSON.parse(raw) as EventEnvelope<any>;
        } catch (err) {
          this.logger.error('Failed to parse Kafka message, sending to DLQ', err as Error, { topic, offset: message.offset });
          if (this.dlq) {
            await this.dlq.addToDLQ(topic, message, err as Error, consumerGroupId, partition).catch((dlqErr: Error) => {
              this.logger.error('Failed to add message to DLQ', dlqErr);
            });
          }
          return;
        }

        try {
          const should = await this.ensureIdempotent(envelope.eventId, consumerGroupId, topic);
          if (!should) return;

          await this.applyClaimDocumentsAttached(envelope);
        } catch (err) {
          this.logger.error('Failed to process Kafka message, sending to DLQ', err as Error, { topic, eventId: envelope.eventId });
          if (this.dlq) {
            await this.dlq.addToDLQ(topic, message, err as Error, consumerGroupId, partition).catch((dlqErr: Error) => {
              this.logger.error('Failed to add message to DLQ', dlqErr);
            });
          }
        }
      },
    });
  }
}
