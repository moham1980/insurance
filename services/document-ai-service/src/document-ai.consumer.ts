import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { DataSource } from 'typeorm';
import { Repository } from 'typeorm';
import { ConsumedEvent, createLogger, EventEnvelope, markConsumed } from '@insurance/shared';
import { DocumentEntity } from './entities/DocumentEntity';
import { DocumentAiJob } from './entities/DocumentAiJob';

@Injectable()
export class DocumentAiConsumer implements OnModuleInit, OnModuleDestroy {
  private logger = createLogger({
    serviceName: 'document-ai-service',
    prettyPrint: process.env.NODE_ENV !== 'production',
  });

  private consumer?: Consumer;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(DocumentEntity) private readonly docRepo: Repository<DocumentEntity>,
    @InjectRepository(DocumentAiJob) private readonly jobRepo: Repository<DocumentAiJob>,
    @InjectRepository(ConsumedEvent) private readonly consumedRepo: Repository<ConsumedEvent>
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.startConsumer();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to start Kafka consumer', error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer?.disconnect();
  }

  private async startConsumer(): Promise<void> {
    const kafkaBrokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
    const consumerGroupId = process.env.KAFKA_CONSUMER_GROUP || 'document-ai-v1';

    this.logger.info('Initializing Kafka consumer', { kafkaBrokers, consumerGroupId });

    const kafka = new Kafka({ clientId: 'document-ai-service', brokers: kafkaBrokers });
    this.consumer = kafka.consumer({ groupId: consumerGroupId });

    await this.consumer.connect();

    this.logger.info('Kafka consumer connected', { groupId: consumerGroupId });

    const topics = ['insurance.document.uploaded', 'insurance.document.linked', 'insurance.claim.documents_attached'];
    for (const topic of topics) {
      await this.consumer.subscribe({ topic, fromBeginning: true });
    }

    this.logger.info('Kafka consumer started', { groupId: consumerGroupId, topics });

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        const { topic, message } = payload;
        try {
          const rawValue = message.value?.toString('utf-8');
          if (!rawValue) return;

          const envelope = JSON.parse(rawValue) as EventEnvelope<any>;
          this.logger.debug('Kafka message received', { topic, eventId: envelope.eventId });

          const ok = await markConsumed({
            dataSource: this.dataSource,
            consumerName: consumerGroupId,
            topic,
            eventId: envelope.eventId,
          });
          if (!ok) {
            this.logger.debug('Duplicate event - skipped', { topic, eventId: envelope.eventId });
            return;
          }

          const documentIds: string[] = [];

          const directDocumentId = envelope.subject?.documentId || envelope.payload?.documentId;
          if (directDocumentId) {
            documentIds.push(String(directDocumentId));
          }

          const embedded = envelope.payload?.documents;
          if (Array.isArray(embedded)) {
            for (const d of embedded) {
              if (d?.documentId) documentIds.push(String(d.documentId));
            }
          }

          const uniq = Array.from(new Set(documentIds)).filter(Boolean);
          if (uniq.length === 0) {
            this.logger.warn('No documentIds in event - skipping', { eventId: envelope.eventId, topic });
            return;
          }

          for (const documentId of uniq) {
            const doc = await this.docRepo.findOne({ where: { documentId } });
            if (!doc) {
              this.logger.warn('Document not found - cannot enqueue job', { documentId, topic, eventId: envelope.eventId });
              continue;
            }

            const dedupeKey = `${String(topic)}:${String(envelope.eventId)}:${String(documentId)}`;
            const existing = await this.jobRepo.findOne({ where: { dedupeKey } });
            if (existing) {
              this.logger.debug('Duplicate job enqueue skipped', { dedupeKey, jobId: existing.jobId });
              continue;
            }

            const job = this.jobRepo.create({
              dedupeKey,
              sourceTopic: String(topic),
              sourceEventId: String(envelope.eventId),
              documentId: String(documentId),
              claimId: doc.claimId || null,
              correlationId: envelope.correlationId || null,
              tenantId: envelope.tenantId || null,
              actorUserId: (envelope as any)?.actorUserId || null,
              traceparent: envelope.traceparent || null,
              status: 'pending',
              attempt: 0,
              maxAttempts: Math.max(1, parseInt(process.env.DOCUMENT_AI_MAX_ATTEMPTS || '5', 10) || 5),
              nextRunAt: new Date(),
              lockedAt: null,
              lockedBy: null,
              lastErrorMessage: null,
              lastErrorStack: null,
              dlqReason: null,
            });
            await this.jobRepo.save(job);

            this.logger.info('Document AI job enqueued', { jobId: job.jobId, documentId, topic, eventId: envelope.eventId });
          }
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          this.logger.error('Kafka message processing failed', error, {
            topic,
            offset: message.offset,
          });
        }
      },
    });
  }
}
