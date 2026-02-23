import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { DataSource } from 'typeorm';
import { Repository } from 'typeorm';
import { ConsumedEvent, createLogger, EventEnvelope, OutboxPublisher } from '@insurance/shared';
import { DocumentEntity } from './entities/DocumentEntity';
import { GeminiService } from './gemini/gemini.service';
import { DeepSeekService } from './deepseek/deepseek.service';

@Injectable()
export class DocumentAiConsumer implements OnModuleInit, OnModuleDestroy {
  private logger = createLogger({
    serviceName: 'document-ai-service',
    prettyPrint: process.env.NODE_ENV !== 'production',
  });

  private consumer?: Consumer;
  private outboxPublisher: OutboxPublisher;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(DocumentEntity) private readonly docRepo: Repository<DocumentEntity>,
    @InjectRepository(ConsumedEvent) private readonly consumedRepo: Repository<ConsumedEvent>,
    private readonly geminiService: GeminiService,
    private readonly deepSeekService: DeepSeekService
  ) {
    this.outboxPublisher = new OutboxPublisher(this.dataSource);
  }

  async onModuleInit(): Promise<void> {
    await this.startConsumer();
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer?.disconnect();
  }

  private async ensureIdempotent(eventId: string, consumerName: string, topic: string): Promise<boolean> {
    const existing = await this.consumedRepo.findOne({ where: { eventId, consumerName } });
    if (existing) return false;

    await this.consumedRepo.save(this.consumedRepo.create({ eventId, consumerName, topic }));
    return true;
  }

  private mockExtract(doc: DocumentEntity): { extractedText: string; extractedFields: Record<string, unknown> } {
    const extractedText = `Mock extraction for document ${doc.documentId} (${doc.documentType})`;

    const fields: Record<string, unknown> = {
      documentType: doc.documentType,
      fileName: doc.fileName,
      storageRef: doc.storageRef,
      confidence: 0.85,
    };

    if (doc.documentType === 'invoice') {
      fields.invoiceNumber = `INV-${String(doc.documentId).slice(0, 8)}`;
      fields.totalAmount = 1000000;
      fields.currency = 'IRR';
    }

    return { extractedText, extractedFields: fields };
  }

  private async processDocument(documentId: string, correlationId: string): Promise<void> {
    const doc = await this.docRepo.findOne({ where: { documentId } });
    if (!doc) {
      this.logger.warn('Document not found - skipping', { documentId, correlationId });
      return;
    }

    await this.docRepo.update({ documentId }, { status: 'extracting', updatedAt: new Date() });

    let extractedText: string;
    let extractedFields: Record<string, unknown>;

    try {
      const mimeType = doc.mimeType || '';
      if (mimeType.startsWith('image/')) {
        const imageBytes = await this.tryFetchBytes(doc.storageRef);
        if (imageBytes) {
          const text = await this.geminiService.extractTextFromImage(imageBytes, mimeType);
          const analysis = await this.deepSeekService.analyzeText({ text, task: 'insurance_document', language: 'fa' });
          extractedText = text;
          extractedFields = {
            documentType: doc.documentType,
            fileName: doc.fileName,
            storageRef: doc.storageRef,
            confidence: 0.85,
            summary: analysis.summary,
            keyPoints: analysis.keyPoints,
            aiProvider: {
              image: 'gemini',
              analysis: 'deepseek',
            },
          };
        } else {
          const mocked = this.mockExtract(doc);
          extractedText = mocked.extractedText;
          extractedFields = {
            ...mocked.extractedFields,
            warning: 'Image bytes unavailable; fallback to mock extraction',
          };
        }
      } else {
        const mocked = this.mockExtract(doc);
        const analysis = await this.deepSeekService.analyzeText({ text: mocked.extractedText, task: 'insurance_document', language: 'fa' });
        extractedText = mocked.extractedText;
        extractedFields = {
          ...mocked.extractedFields,
          summary: analysis.summary,
          keyPoints: analysis.keyPoints,
          aiProvider: {
            analysis: 'deepseek',
          },
        };
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('AI processing failed - fallback to mock extraction', error, { documentId, correlationId });
      const mocked = this.mockExtract(doc);
      extractedText = mocked.extractedText;
      extractedFields = {
        ...mocked.extractedFields,
        warning: 'AI processing failed; fallback to mock extraction',
      };
    }

    await this.docRepo.update(
      { documentId },
      {
        status: 'extracted',
        extractedText,
        extractedFields,
        updatedAt: new Date(),
      }
    );

    await this.outboxPublisher.publish({
      topic: 'insurance.document.extracted',
      eventType: 'DocumentExtracted',
      eventVersion: 1,
      correlationId,
      subject: {
        documentId: doc.documentId,
        claimId: doc.claimId,
      },
      payload: {
        documentId: doc.documentId,
        claimId: doc.claimId,
        status: 'extracted',
        extractedFields,
        extractedTextPreview: extractedText.slice(0, 256),
        confidence: (extractedFields as any).confidence,
      },
    });

    this.logger.info('Document extracted', { documentId, correlationId });
  }

  private async tryFetchBytes(storageRef: string): Promise<Buffer | null> {
    try {
      if (!storageRef) return null;

      if (storageRef.startsWith('http://') || storageRef.startsWith('https://')) {
        const res = await fetch(storageRef);
        if (!res.ok) return null;
        const ab = await res.arrayBuffer();
        return Buffer.from(ab);
      }

      return null;
    } catch {
      return null;
    }
  }

  private async startConsumer(): Promise<void> {
    const kafkaBrokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
    const consumerGroupId = process.env.KAFKA_CONSUMER_GROUP || 'document-ai-v1';

    const kafka = new Kafka({ clientId: 'document-ai-service', brokers: kafkaBrokers });
    this.consumer = kafka.consumer({ groupId: consumerGroupId });

    await this.consumer.connect();

    const topics = ['insurance.document.uploaded', 'insurance.document.linked'];
    for (const topic of topics) {
      await this.consumer.subscribe({ topic, fromBeginning: true });
    }

    this.logger.info('Kafka consumer started', { groupId: consumerGroupId, topics });

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        const { topic, message } = payload;
        const rawValue = message.value?.toString('utf-8');
        if (!rawValue) return;

        const envelope = JSON.parse(rawValue) as EventEnvelope<any>;

        const ok = await this.ensureIdempotent(envelope.eventId, consumerGroupId, topic);
        if (!ok) return;

        const documentId = envelope.subject?.documentId || envelope.payload?.documentId;
        if (!documentId) {
          this.logger.warn('No documentId in event - skipping', { eventId: envelope.eventId, topic });
          return;
        }

        await this.processDocument(documentId, envelope.correlationId);
      },
    });
  }
}
