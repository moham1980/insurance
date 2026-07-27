import { DataSource, In } from 'typeorm';
import { Kafka, Producer } from 'kafkajs';
import { OutboxEvent, DeadLetterEvent, createDataSource, createEventEnvelope, createLogger, Logger } from '@insurance/shared';
import { Repository } from 'typeorm';
import { createServer } from 'http';

interface RelayConfig {
  dbConfig: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
  kafkaConfig: {
    brokers: string[];
    clientId: string;
  };
  pollIntervalMs: number;
  batchSize: number;
  maxAttempts: number;
  dlqOnPermanentFailure: boolean;
  baseRetryDelayMs: number;
}

class OutboxRelay {
  private dataSource: DataSource;
  private kafka: Kafka;
  private producer: Producer;
  private outboxRepo: Repository<OutboxEvent>;
  private dlqRepo: Repository<DeadLetterEvent>;
  private logger: Logger;
  private config: RelayConfig;
  private isRunning: boolean = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: RelayConfig) {
    this.config = config;
    this.logger = createLogger({
      serviceName: 'outbox-relay',
      prettyPrint: process.env.NODE_ENV !== 'production',
    });

    this.kafka = new Kafka({
      clientId: config.kafkaConfig.clientId,
      brokers: config.kafkaConfig.brokers,
      retry: {
        initialRetryTime: 1000,
        retries: 5,
      },
    });
    this.producer = this.kafka.producer();

    this.dataSource = createDataSource({
      ...config.dbConfig,
      entities: [OutboxEvent, DeadLetterEvent],
      synchronize: false,
    });
  }

  async start(): Promise<void> {
    this.logger.info('Starting Outbox Relay...');

    await this.dataSource.initialize();
    this.outboxRepo = this.dataSource.getRepository(OutboxEvent);
    this.dlqRepo = this.dataSource.getRepository(DeadLetterEvent);
    this.logger.info('Database connected');

    await this.producer.connect();
    this.logger.info('Kafka producer connected');

    this.isRunning = true;
    this.poll();

    this.logger.info('Outbox Relay started successfully', {
      maxAttempts: this.config.maxAttempts,
      dlqOnPermanentFailure: this.config.dlqOnPermanentFailure,
    });
  }

  isHealthy(): { db: boolean; kafka: boolean } {
    return {
      db: this.dataSource.isInitialized,
      kafka: this.isRunning,
    };
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping Outbox Relay...');
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    await this.producer.disconnect();
    await this.dataSource.destroy();

    this.logger.info('Outbox Relay stopped');
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((r) => setTimeout(r, ms));
  }

  private async poll(): Promise<void> {
    if (!this.isRunning) return;

    try {
      await this.processBatch();
    } catch (error) {
      this.logger.error('Error during polling', error as Error);
    }

    if (this.isRunning) {
      this.timer = setTimeout(() => this.poll(), this.config.pollIntervalMs);
    }
  }

  private async processBatch(): Promise<void> {
    const { batchSize, maxAttempts } = this.config;

    await this.dataSource.transaction(async (manager) => {
      const rows = (await manager.query(
        `
        SELECT id
        FROM outbox_events
        WHERE status = 'pending'
          AND attempt_count < $1
        ORDER BY occurred_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT $2
        `,
        [maxAttempts, batchSize],
      )) as Array<{ id: string }>;

      if (!Array.isArray(rows) || rows.length === 0) return;

      const ids = rows.map((r) => r.id);
      const repo = manager.getRepository(OutboxEvent);
      const events = await repo.find({
        where: { id: In(ids) },
      });

      const index = new Map<string, number>();
      ids.forEach((id, i) => index.set(id, i));
      events.sort((a, b) => (index.get(a.id) ?? 0) - (index.get(b.id) ?? 0));

      for (const ev of events) {
        await this.publishOne(manager, ev);
      }
    });
  }

  private async publishOne(manager: any, event: OutboxEvent): Promise<void> {
    const lagMs = Date.now() - new Date(event.occurredAt).getTime();
    try {
      const subject = event.subjectJson as Record<string, string>;
      const partitionKey = subject.claimId || subject.policyId || subject.fraudCaseId || event.id;

      const tenantId = (event.subjectJson as any)?.tenantId as string | undefined;
      const traceparent = (event.subjectJson as any)?.traceparent as string | undefined;

      if (lagMs > 60_000) {
        this.logger.warn('Outbox event lag exceeds 60s', { eventId: event.id, lagMs, topic: event.topic });
      }

      const envelope = createEventEnvelope({
        eventId: event.id,
        eventType: event.eventType,
        eventVersion: event.eventVersion,
        occurredAt: event.occurredAt,
        producer: 'outbox-relay',
        correlationId: event.correlationId,
        tenantId,
        traceparent,
        subject: event.subjectJson as any,
        payload: event.payloadJson,
      });

      await this.producer.send({
        topic: event.topic,
        messages: [
          {
            key: partitionKey,
            value: JSON.stringify(envelope),
            headers: {
              'x-event-type': event.eventType,
              'x-event-version': String(event.eventVersion),
              'x-correlation-id': event.correlationId,
              ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
              ...(traceparent ? { traceparent } : {}),
            },
          },
        ],
      });

      await manager.query(`UPDATE outbox_events SET status='sent' WHERE id=$1`, [event.id]);

      this.logger.info('Outbox event relayed', {
        eventId: event.id,
        topic: event.topic,
        lagMs,
        correlationId: event.correlationId,
      });
    } catch (e: any) {
      const attemptCount = (event.attemptCount || 0) + 1;
      const status = attemptCount >= this.config.maxAttempts ? 'failed' : 'pending';

      const delay = Math.min(30_000, this.config.baseRetryDelayMs! * Math.pow(2, Math.max(0, attemptCount - 1)));
      await this.sleep(delay);

      await manager.query(
        `
        UPDATE outbox_events
        SET status=$2,
            attempt_count=attempt_count + 1,
            error_message=$3
        WHERE id=$1
        `,
        [event.id, status, String(e?.message || e)],
      );

      if (status === 'failed') {
        this.logger.error('Outbox event permanently failed', e as Error, { eventId: event.id, topic: event.topic });

        if (this.config.dlqOnPermanentFailure) {
          try {
            const dlq = this.dlqRepo.create({
              originalEventId: event.id,
              topic: event.topic,
              partition: null,
              offset: null,
              key: event.id,
              value: {
                eventId: event.id,
                eventType: event.eventType,
                eventVersion: event.eventVersion,
                occurredAt: event.occurredAt.toISOString(),
                correlationId: event.correlationId,
                subject: event.subjectJson,
                payload: event.payloadJson,
                lagMs,
              },
              headers: { 'x-correlation-id': event.correlationId },
              errorMessage: String(e?.message || e),
              errorStack: e?.stack ? String(e.stack) : null,
              consumerGroup: 'outbox-relay',
              retryCount: attemptCount,
              maxRetries: this.config.maxAttempts,
              status: 'failed',
              nextRetryAt: null,
              lastErrorAt: new Date(),
              resolvedAt: null,
              createdAt: new Date(),
            });
            await manager.getRepository(DeadLetterEvent).save(dlq);
          } catch (dlqErr: any) {
            this.logger.error('Failed to persist outbox DLQ entry', dlqErr as Error, { eventId: event.id });
          }
        }
      }
    }
  }
}

// Main
const relay = new OutboxRelay({
  dbConfig: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'postgres',
  },
  kafkaConfig: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: 'outbox-relay',
  },
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '1000', 10),
  batchSize: parseInt(process.env.BATCH_SIZE || '100', 10),
  maxAttempts: parseInt(process.env.MAX_ATTEMPTS || '10', 10),
  dlqOnPermanentFailure: process.env.DLQ_ON_PERMANENT_FAILURE !== 'false',
  baseRetryDelayMs: parseInt(process.env.BASE_RETRY_DELAY_MS || '250', 10),
});

async function main() {
  const logger = createLogger({
    serviceName: 'outbox-relay',
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: process.env.NODE_ENV !== 'production',
  });

  try {
    await relay.start();

    // Start health check server
    const port = parseInt(process.env.PORT || '3041', 10);
    const healthServer = createServer((req, res) => {
      if (req.url === '/health') {
        const components: Record<string, string> = {};
        let status = 'ok';

        const health = relay.isHealthy();
        components.db = health.db ? 'ok' : 'error';
        components.kafka = health.kafka ? 'ok' : 'error';
        if (!health.db || !health.kafka) status = 'degraded';

        const statusCode = status === 'ok' ? 200 : 503;
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status, service: 'outbox-relay', timestamp: new Date().toISOString(), components, uptime: process.uptime() }));
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });
    healthServer.listen(port, () => {
      logger.info(`Health server listening on port ${port}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      try {
        await relay.stop();
      } finally {
        process.exitCode = 0;
      }
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      try {
        await relay.stop();
      } finally {
        process.exitCode = 0;
      }
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to start outbox relay', err);
    process.exitCode = 1;
  }
}

main();
