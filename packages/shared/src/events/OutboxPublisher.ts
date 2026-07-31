import { DataSource, EntityManager, Repository } from 'typeorm';
import { OutboxEvent } from './OutboxEvent';
import { EventEnvelope } from './EventEnvelope';
import { v4 as uuidv4 } from 'uuid';

export interface PublishOptions {
  topic: string;
  eventType: string;
  eventVersion: number;
  correlationId: string;
  tenantId?: string;
  organizationId?: string;
  subject: Record<string, any>;
  payload: unknown;
  producer?: string;
  dataClassification?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'PII';
}

function resolveTenantId(options: PublishOptions): string {
  if (options.tenantId) return options.tenantId;
  const subject = options.subject || {};
  const payload = (options.payload as Record<string, any>) || {};
  return (
    subject.tenantId ||
    subject.tenant_id ||
    payload.tenantId ||
    payload.tenant_id ||
    'unknown'
  );
}

export class OutboxPublisher {
  private outboxRepo: Repository<OutboxEvent>;

  constructor(dataSourceOrManager: DataSource | EntityManager) {
    this.outboxRepo = dataSourceOrManager.getRepository(OutboxEvent);
  }

  async publish(options: PublishOptions): Promise<string> {
    const eventId = uuidv4();
    const occurredAt = new Date();
    const tenantId = resolveTenantId(options);

    const outboxEvent = this.outboxRepo.create({
      id: eventId,
      occurredAt,
      topic: options.topic,
      eventType: options.eventType,
      eventVersion: options.eventVersion,
      correlationId: options.correlationId,
      tenantId,
      organizationId: options.organizationId || null,
      dataClassification: options.dataClassification || null,
      subjectJson: options.subject,
      payloadJson: options.payload as object,
      status: 'pending',
      attemptCount: 0,
    });

    await this.outboxRepo.save(outboxEvent);

    return eventId;
  }

  async markAsSent(eventId: string): Promise<void> {
    await this.outboxRepo.update(
      { id: eventId },
      { status: 'sent' }
    );
  }

  async markAsFailed(eventId: string, errorMessage: string): Promise<void> {
    const event = await this.outboxRepo.findOne({ where: { id: eventId } });
    if (!event) return;
    event.status = 'failed';
    event.errorMessage = errorMessage;
    event.attemptCount = (event.attemptCount || 0) + 1;
    await this.outboxRepo.save(event);
  }

  async getPendingEvents(limit: number = 100): Promise<OutboxEvent[]> {
    return this.outboxRepo.find({
      where: { status: 'pending' },
      order: { occurredAt: 'ASC' },
      take: limit,
    });
  }

  async getFailedEvents(limit: number = 100): Promise<OutboxEvent[]> {
    return this.outboxRepo.find({
      where: { status: 'failed' },
      order: { occurredAt: 'ASC' },
      take: limit,
    });
  }
}
