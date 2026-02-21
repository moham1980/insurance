import express, { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { Kafka, EachMessagePayload } from 'kafkajs';
import { ConsumedEvent, createDataSource, createLogger, EventEnvelope } from '@insurance/shared';
import { RmClaimCase } from './entities/RmClaimCase';

const logger = createLogger({
  serviceName: 'claims-readmodel-service',
  prettyPrint: process.env.NODE_ENV !== 'production',
});

const app = express();
app.use(express.json());

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'postgres',
};

const kafkaBrokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const consumerGroupId = process.env.KAFKA_CONSUMER_GROUP || 'claims-readmodel-v1';
const httpPort = parseInt(process.env.PORT || '3002', 10);

let rmRepo: Repository<RmClaimCase>;
let consumedRepo: Repository<ConsumedEvent>;

async function ensureIdempotent(eventId: string, consumerName: string, topic: string): Promise<boolean> {
  const existing = await consumedRepo.findOne({ where: { eventId, consumerName } });
  if (existing) return false;

  const consumed = consumedRepo.create({
    eventId,
    consumerName,
    topic,
  });

  await consumedRepo.save(consumed);
  return true;
}

async function upsertRmClaimCase(envelope: EventEnvelope<any>): Promise<void> {
  const claimId = envelope.subject?.claimId || envelope.payload?.claimId;
  if (!claimId) {
    logger.warn('Skipping event without claimId', { eventId: envelope.eventId });
    return;
  }

  const claimNumber = envelope.subject?.claimNumber || envelope.payload?.claimNumber;
  const policyId = envelope.subject?.policyId || envelope.payload?.policyId;

  await rmRepo.upsert(
    {
      claimId,
      claimNumber,
      policyId,
      status: envelope.payload?.status || 'registered',
      lossDate: envelope.payload?.lossDate ? new Date(envelope.payload.lossDate) : null,
      lossType: envelope.payload?.lossType || null,
      requiresHumanTriage: envelope.payload?.requiresHumanTriage ?? null,
      createdAt: envelope.payload?.createdAt ? new Date(envelope.payload.createdAt) : null,
      lastEventId: envelope.eventId,
      updatedAt: new Date(),
    },
    ['claimId']
  );
}

async function applyEvent(envelope: EventEnvelope<any>): Promise<void> {
  const eventType = envelope.eventType;

  switch (eventType) {
    case 'ClaimRegistered':
    case 'ClaimAssessed':
    case 'ClaimApproved':
    case 'ClaimRejected':
    case 'ClaimPaid':
    case 'ClaimClosed':
      await upsertRmClaimCase(envelope);
      return;
    default:
      logger.warn('Unknown eventType - ignored', { eventType, eventId: envelope.eventId });
  }
}

async function startConsumer(): Promise<void> {
  const kafka = new Kafka({
    clientId: 'claims-readmodel-service',
    brokers: kafkaBrokers,
  });

  const consumer = kafka.consumer({ groupId: consumerGroupId });
  await consumer.connect();
  const topics = [
    'insurance.claim.registered',
    'insurance.claim.assessed',
    'insurance.claim.approved',
    'insurance.claim.rejected',
    'insurance.claim.paid',
    'insurance.claim.closed',
  ];

  for (const topic of topics) {
    await consumer.subscribe({ topic, fromBeginning: true });
  }

  logger.info('Kafka consumer started', { groupId: consumerGroupId });

  await consumer.run({
    eachMessage: async (payload: EachMessagePayload) => {
      const { topic, message } = payload;
      const rawValue = message.value?.toString('utf-8');
      if (!rawValue) return;

      const envelope = JSON.parse(rawValue) as EventEnvelope<any>;

      const shouldProcess = await ensureIdempotent(envelope.eventId, consumerGroupId, topic);
      if (!shouldProcess) {
        return;
      }

      await applyEvent(envelope);
    },
  });
}

function startHttpApi(): void {
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'claims-readmodel-service' });
  });

  app.get('/rm/claims', async (req: Request, res: Response) => {
    const { policyId, status, limit = '50', offset = '0' } = req.query;

    const qb = rmRepo.createQueryBuilder('rm');

    if (policyId) qb.andWhere('rm.policy_id = :policyId', { policyId });
    if (status) qb.andWhere('rm.status = :status', { status });

    qb.orderBy('rm.updated_at', 'DESC')
      .limit(parseInt(limit as string, 10))
      .offset(parseInt(offset as string, 10));

    const [rows, total] = await qb.getManyAndCount();

    res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      },
    });
  });

  app.get('/rm/claims/:claimId', async (req: Request, res: Response) => {
    const { claimId } = req.params;
    const row = await rmRepo.findOne({ where: { claimId } });
    if (!row) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
    }
    return res.json({ success: true, data: row });
  });

  app.get('/rm/claims/summary', async (req: Request, res: Response) => {
    const rows = await rmRepo
      .createQueryBuilder('rm')
      .select('rm.status', 'status')
      .addSelect('COUNT(1)', 'count')
      .groupBy('rm.status')
      .getRawMany();

    const total = rows.reduce((acc, r) => acc + parseInt(r.count, 10), 0);

    return res.json({
      success: true,
      data: {
        total,
        byStatus: rows.map((r) => ({ status: r.status, count: parseInt(r.count, 10) })),
      },
    });
  });

  app.listen(httpPort, () => {
    logger.info('HTTP API listening', { port: httpPort });
  });
}

async function main(): Promise<void> {
  const dataSource = createDataSource({
    ...dbConfig,
    entities: [RmClaimCase],
    synchronize: false,
  });

  await dataSource.initialize();
  rmRepo = dataSource.getRepository(RmClaimCase);
  consumedRepo = dataSource.getRepository(ConsumedEvent);

  logger.info('Database connected');

  startHttpApi();
  await startConsumer();
}

main().catch((err) => {
  logger.error('Fatal error in claims-readmodel-service', err as Error);
  process.exit(1);
});
