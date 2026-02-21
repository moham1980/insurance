import { DataSource } from 'typeorm';
import { Kafka, Producer } from 'kafkajs';
import { OutboxEvent, createLogger, Logger } from '@insurance/shared';
import { Repository } from 'typeorm';

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
}

class OutboxRelay {
  private dataSource: DataSource;
  private kafka: Kafka;
  private producer: Producer;
  private outboxRepo: Repository<OutboxEvent>;
  private logger: Logger;
  private config: RelayConfig;
  private isRunning: boolean = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(config: RelayConfig) {
    this.config = config;
    this.logger = createLogger({
      serviceName: 'outbox-relay',
      prettyPrint: process.env.NODE_ENV !== 'production',
    });

    // Initialize Kafka
    this.kafka = new Kafka({
      clientId: config.kafkaConfig.clientId,
      brokers: config.kafkaConfig.brokers,
      retry: {
        initialRetryTime: 1000,
        retries: 5,
      },
    });
    this.producer = this.kafka.producer();

    // Initialize DataSource
    const { createDataSource } = require('@insurance/shared');
    this.dataSource = createDataSource({
      ...config.dbConfig,
      entities: [OutboxEvent],
      synchronize: false,
    });
  }

  async start(): Promise<void> {
    this.logger.info('Starting Outbox Relay...');

    // Connect to database
    await this.dataSource.initialize();
    this.outboxRepo = this.dataSource.getRepository(OutboxEvent);
    this.logger.info('Database connected');

    // Connect to Kafka
    await this.producer.connect();
    this.logger.info('Kafka producer connected');

    this.isRunning = true;
    this.poll();

    this.logger.info('Outbox Relay started successfully');
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

  private async poll(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const events = await this.outboxRepo.find({
        where: { status: 'pending' },
        order: { occurredAt: 'ASC' },
        take: this.config.batchSize,
      });

      if (events.length > 0) {
        this.logger.info(`Processing ${events.length} pending events`);

        for (const event of events) {
          await this.publishEvent(event);
        }
      }
    } catch (error) {
      this.logger.error('Error during polling', error as Error);
    }

    // Schedule next poll
    if (this.isRunning) {
      this.timer = setTimeout(() => this.poll(), this.config.pollIntervalMs);
    }
  }

  private async publishEvent(event: OutboxEvent): Promise<void> {
    try {
      // Determine partition key based on subject
      const subject = event.subjectJson as Record<string, string>;
      const partitionKey = subject.claimId || subject.policyId || subject.fraudCaseId || event.id;

      // Publish to Kafka
      await this.producer.send({
        topic: event.topic,
        messages: [
          {
            key: partitionKey,
            value: JSON.stringify({
              eventId: event.id,
              eventType: event.eventType,
              eventVersion: event.eventVersion,
              occurredAt: event.occurredAt.toISOString(),
              producer: 'outbox-relay',
              correlationId: event.correlationId,
              subject: event.subjectJson,
              payload: event.payloadJson,
            }),
            headers: {
              'X-Event-Type': event.eventType,
              'X-Event-Version': String(event.eventVersion),
              'X-Correlation-Id': event.correlationId,
            },
          },
        ],
      });

      // Mark as sent
      await this.outboxRepo.update(
        { id: event.id },
        { status: 'sent' }
      );

      this.logger.debug('Event published successfully', {
        eventId: event.id,
        topic: event.topic,
        eventType: event.eventType,
      });
    } catch (error) {
      this.logger.error('Failed to publish event', error as Error, {
        eventId: event.id,
        topic: event.topic,
      });

      // Mark as failed with retry count
      await this.outboxRepo.update(
        { id: event.id },
        {
          status: 'failed',
          attemptCount: () => '"attempt_count" + 1',
          errorMessage: (error as Error).message,
        }
      );
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
});

async function main() {
  try {
    await relay.start();

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');
      await relay.stop();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully');
      await relay.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start outbox relay:', error);
    process.exit(1);
  }
}

main();
