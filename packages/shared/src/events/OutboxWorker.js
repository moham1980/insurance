import { In } from 'typeorm';
import { OutboxEvent } from './OutboxEvent';
import { DeadLetterEvent } from './DeadLetterEvent';
import { createEventEnvelope } from './EventEnvelope';
export class OutboxWorker {
    config;
    logger;
    timer;
    running = false;
    inFlight = false;
    constructor(config) {
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
    async sleep(ms) {
        await new Promise((r) => setTimeout(r, ms));
    }
    async start() {
        if (this.running)
            return;
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
    async stop() {
        if (!this.running)
            return;
        this.running = false;
        if (this.timer)
            clearInterval(this.timer);
        await this.config.producer.disconnect();
        this.logger.info('Outbox worker stopped');
    }
    async tick() {
        if (!this.running)
            return;
        if (this.inFlight)
            return;
        this.inFlight = true;
        try {
            await this.processBatch();
        }
        catch (e) {
            this.logger.error('Outbox tick failed', e);
        }
        finally {
            this.inFlight = false;
        }
    }
    async processBatch() {
        const { dataSource, batchSize } = this.config;
        await dataSource.transaction(async (manager) => {
            const rows = (await manager.query(`
        SELECT id
        FROM outbox_events
        WHERE status = 'pending'
          AND attempt_count < $1
        ORDER BY occurred_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT $2
        `, [this.config.maxAttempts, batchSize]));
            if (!Array.isArray(rows) || rows.length === 0)
                return;
            const ids = rows.map((r) => r.id);
            const repo = manager.getRepository(OutboxEvent);
            const events = await repo.find({
                where: { id: In(ids) },
            });
            const index = new Map();
            ids.forEach((id, i) => index.set(id, i));
            events.sort((a, b) => (index.get(a.id) ?? 0) - (index.get(b.id) ?? 0));
            for (const ev of events) {
                await this.sendOne(manager, ev);
            }
        });
    }
    async sendOne(manager, ev) {
        try {
            const tenantId = ev.subjectJson?.tenantId;
            const traceparent = ev.subjectJson?.traceparent;
            const envelope = createEventEnvelope({
                eventId: ev.id,
                eventType: ev.eventType,
                eventVersion: ev.eventVersion,
                occurredAt: ev.occurredAt,
                producer: this.config.producerName,
                correlationId: ev.correlationId,
                tenantId,
                traceparent,
                subject: ev.subjectJson,
                payload: ev.payloadJson,
            });
            const value = JSON.stringify(envelope);
            await this.config.producer.send({
                topic: ev.topic,
                messages: [
                    {
                        key: ev.id,
                        value,
                        headers: {
                            'x-correlation-id': ev.correlationId,
                            'x-event-type': ev.eventType,
                            'x-event-version': String(ev.eventVersion),
                            ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
                            ...(traceparent ? { traceparent } : {}),
                        },
                    },
                ],
            });
            await manager.query(`UPDATE outbox_events SET status='sent' WHERE id=$1`, [ev.id]);
        }
        catch (e) {
            const attemptCount = (ev.attemptCount || 0) + 1;
            const status = attemptCount >= this.config.maxAttempts ? 'failed' : 'pending';
            const delay = Math.min(30_000, this.config.baseRetryDelayMs * Math.pow(2, Math.max(0, attemptCount - 1)));
            await this.sleep(delay);
            await manager.query(`
        UPDATE outbox_events
        SET status=$2,
            attempt_count=attempt_count + 1,
            error_message=$3
        WHERE id=$1
        `, [ev.id, status, String(e?.message || e)]);
            if (status === 'failed') {
                this.logger.error('Outbox event permanently failed', e, { eventId: ev.id, topic: ev.topic });
                if (this.config.dlqOnPermanentFailure) {
                    try {
                        const dlqRepo = manager.getRepository(DeadLetterEvent);
                        const dlq = dlqRepo.create({
                            originalEventId: ev.id,
                            topic: ev.topic,
                            partition: null,
                            offset: null,
                            key: ev.id,
                            value: {
                                eventId: ev.id,
                                eventType: ev.eventType,
                                eventVersion: ev.eventVersion,
                                occurredAt: ev.occurredAt.toISOString(),
                                correlationId: ev.correlationId,
                                subject: ev.subjectJson,
                                payload: ev.payloadJson,
                            },
                            headers: { 'x-correlation-id': ev.correlationId },
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
                    }
                    catch (dlqErr) {
                        this.logger.error('Failed to persist outbox DLQ entry', dlqErr, { eventId: ev.id });
                    }
                }
            }
        }
    }
}
//# sourceMappingURL=OutboxWorker.js.map