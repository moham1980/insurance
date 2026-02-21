import { Kafka, EachMessagePayload } from 'kafkajs';
import { Repository } from 'typeorm';
import { ConsumedEvent, createDataSource, createLogger, EventEnvelope, OutboxPublisher } from '@insurance/shared';
import { DocumentEntity } from './entities/DocumentEntity';

const logger = createLogger({
  serviceName: 'document-ai-service',
  prettyPrint: process.env.NODE_ENV !== 'production',
});

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'postgres',
};

const kafkaBrokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const consumerGroupId = process.env.KAFKA_CONSUMER_GROUP || 'document-ai-v1';

let docRepo: Repository<DocumentEntity>;
let consumedRepo: Repository<ConsumedEvent>;
let outboxPublisher: OutboxPublisher;

async function ensureIdempotent(eventId: string, consumerName: string, topic: string): Promise<boolean> {
  const existing = await consumedRepo.findOne({ where: { eventId, consumerName } });
  if (existing) return false;

  await consumedRepo.save(consumedRepo.create({ eventId, consumerName, topic }));
  return true;
}

function mockExtract(doc: DocumentEntity): { extractedText: string; extractedFields: Record<string, unknown> } {
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

async function processDocument(documentId: string, correlationId: string): Promise<void> {
  const doc = await docRepo.findOne({ where: { documentId } });
  if (!doc) {
    logger.warn('Document not found - skipping', { documentId, correlationId });
    return;
  }

  // Update to extracting
  await docRepo.update({ documentId }, { status: 'extracting', updatedAt: new Date() });

  // Extraction
  const { extractedText, extractedFields } = mockExtract(doc);

  // Update to extracted
  await docRepo.update(
    { documentId },
    {
      status: 'extracted',
      extractedText,
      extractedFields,
      updatedAt: new Date(),
    }
  );

  // Publish DocumentExtracted to outbox
  await outboxPublisher.publish({
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
      confidence: extractedFields.confidence,
    },
  });

  logger.info('Document extracted', { documentId, correlationId });
}

async function startConsumer(): Promise<void> {
  const kafka = new Kafka({ clientId: 'document-ai-service', brokers: kafkaBrokers });
  const consumer = kafka.consumer({ groupId: consumerGroupId });

  await consumer.connect();

  const topics = ['insurance.document.uploaded', 'insurance.document.linked'];
  for (const topic of topics) {
    await consumer.subscribe({ topic, fromBeginning: true });
  }

  logger.info('Kafka consumer started', { groupId: consumerGroupId, topics });

  await consumer.run({
    eachMessage: async (payload: EachMessagePayload) => {
      const { topic, message } = payload;
      const rawValue = message.value?.toString('utf-8');
      if (!rawValue) return;

      const envelope = JSON.parse(rawValue) as EventEnvelope<any>;

      const ok = await ensureIdempotent(envelope.eventId, consumerGroupId, topic);
      if (!ok) return;

      const documentId = envelope.subject?.documentId || envelope.payload?.documentId;
      if (!documentId) {
        logger.warn('No documentId in event - skipping', { eventId: envelope.eventId, topic });
        return;
      }

      await processDocument(documentId, envelope.correlationId);
    },
  });
}

async function main(): Promise<void> {
  const dataSource = createDataSource({
    ...dbConfig,
    entities: [DocumentEntity],
    synchronize: false,
  });

  await dataSource.initialize();
  docRepo = dataSource.getRepository(DocumentEntity);
  consumedRepo = dataSource.getRepository(ConsumedEvent);
  outboxPublisher = new OutboxPublisher(dataSource);

  logger.info('Database connected');

  await startConsumer();
}

main().catch((err) => {
  logger.error('Fatal error in document-ai-service', err as Error);
  process.exit(1);
});
