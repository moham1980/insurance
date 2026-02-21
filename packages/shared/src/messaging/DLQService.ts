import { Repository, DataSource } from 'typeorm';
import { Kafka, KafkaMessage } from 'kafkajs';
import { DeadLetterEvent } from '../events/DeadLetterEvent';
import { Logger } from '../observability';

export interface DLQConfig {
  dataSource: DataSource;
  kafkaConfig?: {
    brokers: string[];
    clientId?: string;
  };
  maxRetries?: number;
  retryDelays?: number[]; // in milliseconds
}

export class DeadLetterQueueService {
  private dlqRepo: Repository<DeadLetterEvent>;
  private kafka: Kafka | null = null;
  private logger: Logger;
  private config: DLQConfig;
  private retryDelays: number[];

  constructor(config: DLQConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.retryDelays = config.retryDelays || [1000, 5000, 15000]; // 1s, 5s, 15s
    this.dlqRepo = config.dataSource.getRepository(DeadLetterEvent);
  }

  async initialize(): Promise<void> {
    if (this.config.kafkaConfig) {
      this.kafka = new Kafka({
        clientId: this.config.kafkaConfig.clientId || 'dlq-service',
        brokers: this.config.kafkaConfig.brokers,
      });
    }
    this.logger.info('DLQ Service initialized');
  }

  async addToDLQ(
    topic: string,
    message: KafkaMessage,
    error: Error,
    consumerGroup: string,
    partition?: number
  ): Promise<DeadLetterEvent> {
    const dlqEntry = this.dlqRepo.create({
      originalEventId: `${topic}-${partition}-${message.offset}-${Date.now()}`,
      topic,
      partition: partition ?? null,
      offset: String(message.offset),
      key: message.key?.toString() || null,
      value: JSON.parse(message.value?.toString() || '{}'),
      headers: message.headers || null,
      errorMessage: error.message,
      errorStack: error.stack || null,
      consumerGroup,
      retryCount: 0,
      maxRetries: this.config.maxRetries || 3,
      status: 'pending',
      nextRetryAt: this.calculateNextRetryTime(0),
      lastErrorAt: new Date(),
    });

    await this.dlqRepo.save(dlqEntry);

    this.logger.warn('Event added to DLQ', {
      dlqId: dlqEntry.dlqId,
      topic,
      error: error.message,
      consumerGroup,
    });

    return dlqEntry;
  }

  private calculateNextRetryTime(retryCount: number): Date {
    const delay = this.retryDelays[retryCount] || this.retryDelays[this.retryDelays.length - 1];
    return new Date(Date.now() + delay);
  }

  async processRetries(): Promise<void> {
    const pendingRetries = await this.dlqRepo.find({
      where: {
        status: 'pending',
        nextRetryAt: { $lte: new Date() } as any,
        retryCount: { $lt: () => 'max_retries' } as any,
      },
      take: 100,
      order: { nextRetryAt: 'ASC' },
    });

    for (const entry of pendingRetries) {
      try {
        entry.status = 'retrying';
        await this.dlqRepo.save(entry);

        // Attempt to republish to original topic
        if (this.kafka) {
          const producer = this.kafka.producer();
          await producer.connect();
          await producer.send({
            topic: entry.topic,
            messages: [{
              key: entry.key || undefined,
              value: JSON.stringify(entry.value),
              headers: {
                ...entry.headers,
                'x-dlq-retry': String(entry.retryCount + 1),
                'x-dlq-id': entry.dlqId,
              },
            }],
          });
          await producer.disconnect();
        }

        entry.retryCount++;
        entry.nextRetryAt = this.calculateNextRetryTime(entry.retryCount);
        entry.status = entry.retryCount >= entry.maxRetries ? 'failed' : 'pending';
        await this.dlqRepo.save(entry);

        this.logger.info('DLQ retry processed', {
          dlqId: entry.dlqId,
          topic: entry.topic,
          retryCount: entry.retryCount,
        });
      } catch (error) {
        entry.retryCount++;
        entry.nextRetryAt = this.calculateNextRetryTime(entry.retryCount);
        entry.lastErrorAt = new Date();
        await this.dlqRepo.save(entry);

        this.logger.error('DLQ retry failed', error as Error, {
          dlqId: entry.dlqId,
          topic: entry.topic,
        });
      }
    }
  }

  async resolveDLQEntry(dlqId: string, resolution: 'manual' | 'auto'): Promise<void> {
    const entry = await this.dlqRepo.findOne({ where: { dlqId } });
    if (!entry) {
      throw new Error(`DLQ entry ${dlqId} not found`);
    }

    entry.status = 'resolved';
    entry.resolvedAt = new Date();
    await this.dlqRepo.save(entry);

    this.logger.info('DLQ entry resolved', { dlqId, resolution });
  }

  async getDLQStats(): Promise<{
    total: number;
    pending: number;
    retrying: number;
    failed: number;
    resolved: number;
  }> {
    const stats = await this.dlqRepo
      .createQueryBuilder('dlq')
      .select('dlq.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('dlq.status')
      .getRawMany();

    const result = { total: 0, pending: 0, retrying: 0, failed: 0, resolved: 0 };
    for (const row of stats) {
      result[row.status as keyof typeof result] = parseInt(row.count, 10);
      result.total += parseInt(row.count, 10);
    }
    return result;
  }

  async startRetryProcessor(intervalMs: number = 60000): Promise<void> {
    setInterval(async () => {
      try {
        await this.processRetries();
      } catch (error) {
        this.logger.error('Retry processor error', error as Error);
      }
    }, intervalMs);

    this.logger.info('DLQ retry processor started', { intervalMs });
  }
}
