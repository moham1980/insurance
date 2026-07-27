import { DataSource } from 'typeorm';
import { OutboxEvent } from './OutboxEvent';
import { DeadLetterEvent } from './DeadLetterEvent';
import { createEventEnvelope } from './EventEnvelope';
import type { Logger } from '../observability';
import type { KafkaProducer } from '../messaging';

export type OutboxWorkerConfig = {
  dataSource: DataSource;
  producer: KafkaProducer;
  logger: Logger;
  producerName: string;
  pollIntervalMs?: number;
  batchSize?: number;
  maxAttempts?: number;
  dlqOnPermanentFailure?: boolean;
  baseRetryDelayMs?: number;
};

export class OutboxWorker {
  private readonly config: Required<Pick<OutboxWorkerConfig, 'pollIntervalMs' | 'batchSize' | 'maxAttempts'>> & OutboxWorkerConfig;
  private readonly logger: Logger;
  private timer: any;
  private running = false;
  private inFlight = false;

  constructor(config: OutboxWorkerConfig) {
    this.config = {
      pollIntervalMs: 1000,
      batchSize: 50,
      maxAttempts: 10,
      dlqOnPermanentFailure: true,
      baseRetryDelayMs: 250,
      ...config,
    };
    this.logger = config.logger.child({ component: 'OutboxWorker', producerName: config.producerName });
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((r) => setTimeout(r, ms));
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    await this.config.producer.connect();

    this.timer = setInterval(() => {
      void this.tick();
    }, this.config.pollIntervalMs);

    void this.tick();
    this.logger.info('Outbox worker started', {
      pollIntervalMs: this.config.pollIntervalMs,
      batchSize: this.config.batchSize,
    });
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    await this.config.producer.disconnect();
    this.logger.info('Outbox worker stopped');
  }

  private async tick(): Promise<void> {
    if (!this.running) return;
    if (this.inFlight) return;
    this.inFlight = true;

    try {
      await this.processBatch();
    } catch (e: any) {
      this.logger.error('Outbox tick failed', e as Error);
    } finally {
      this.inFlight = false;
    }
  }

  private async processBatch(): Promise<void> {
    const { dataSource, batchSize, maxAttempts } = this.config;

    const rows = (await dataSource.query(
      `
      SELECT id
      FROM outbox_events
      WHERE status = 'pending'
        AND attempt_count < $1
      ORDER BY occurred_at ASC
      LIMIT $2
      `,
      [maxAttempts, batchSize]
    )) as Array<{ id: string }>;

    if (!Array.isArray(rows) || rows.length === 0) return;

    for (const row of rows) {
      await this.sendOne(row.id);
    }
  }

  private async sendOne(eventId: string): Promise<void> {
    let backoffMs = 0;

    await this.config.dataSource.transaction(async (manager) => {
      const [row] = (await manager.query(
        `
        SELECT *
        FROM outbox_events
        WHERE id = $1
          AND status = 'pending'
          AND attempt_count < $2
        FOR UPDATE SKIP LOCKED
        `,
        [eventId, this.config.maxAttempts]
      )) as Array<Record<string, any>>;

      if (!row) return;

      const lagMs = Date.now() - new Date(row.occurred_at).getTime();
      const tenantId = row.tenant_id || (row.subject_json?.tenantId as string | undefined);
      const traceparent = row.subject_json?.traceparent as string | undefined;

      if (lagMs > 60_000) {
        this.logger.warn('Outbox event lag exceeds 60s', { eventId: row.id, lagMs, topic: row.topic });
      }

      const envelope = createEventEnvelope({
        eventId: row.id,
        eventType: row.event_type,
        eventVersion: row.event_version,
        occurredAt: row.occurred_at,
        producer: this.config.producerName,
        correlationId: row.correlation_id,
        tenantId,
        traceparent,
        subject: row.subject_json,
        payload: row.payload_json,
      });

      const value = JSON.stringify(envelope);

      try {
        await this.config.producer.send({
          topic: row.topic,
          messages: [
            {
              key: row.id,
              value,
              headers: {
                'x-correlation-id': row.correlation_id,
                'x-event-type': row.event_type,
                'x-event-version': String(row.event_version),
                ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
                ...(traceparent ? { traceparent } : {}),
              },
            },
          ],
        });

        await manager.query(`UPDATE outbox_events SET status='sent' WHERE id=$1`, [row.id]);

        this.logger.info('Outbox event relayed', {
          eventId: row.id,
          topic: row.topic,
          lagMs,
          correlationId: row.correlation_id,
          producerName: this.config.producerName,
        });
      } catch (e: any) {
        const attemptCount = (row.attempt_count || 0) + 1;
        const status = attemptCount >= this.config.maxAttempts ? 'failed' : 'pending';

        backoffMs = Math.min(30_000, this.config.baseRetryDelayMs! * Math.pow(2, Math.max(0, attemptCount - 1)));

        await manager.query(
          `
          UPDATE outbox_events
          SET status=$2,
              attempt_count=$3,
              error_message=$4
          WHERE id=$1
          `,
          [row.id, status, attemptCount, String(e?.message || e)]
        );

        if (status === 'failed') {
          this.logger.error('Outbox event permanently failed', e as Error, { eventId: row.id, topic: row.topic });

          if (this.config.dlqOnPermanentFailure) {
            try {
              const dlqRepo = manager.getRepository(DeadLetterEvent);
              const dlq = dlqRepo.create({
                originalEventId: row.id,
                topic: row.topic,
                tenantId: row.tenant_id || tenantId || '',
                partition: null,
                offset: null,
                key: row.id,
                value: {
                  eventId: row.id,
                  eventType: row.event_type,
                  eventVersion: row.event_version,
                  occurredAt: new Date(row.occurred_at).toISOString(),
                  correlationId: row.correlation_id,
                  subject: row.subject_json,
                  payload: row.payload_json,
                  lagMs,
                },
                headers: { 'x-correlation-id': row.correlation_id },
                errorMessage: String(e?.message || e),
                errorStack: e?.stack ? String(e.stack) : null,
                consumerGroup: `outbox:${this.config.producerName}`,
                retryCount: 0,
                maxRetries: 0,
                status: 'failed',
                nextRetryAt: null,
                lastErrorAt: new Date(),
                resolvedAt: null,
                createdAt: new Date(),
              });
              await dlqRepo.save(dlq);
            } catch (dlqErr: any) {
              this.logger.error('Failed to persist outbox DLQ entry', dlqErr as Error, { eventId: row.id });
            }
          }
        }
      }
    });

    if (backoffMs > 0) {
      await this.sleep(backoffMs);
    }
  }
}
