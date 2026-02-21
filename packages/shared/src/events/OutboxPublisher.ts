import { DataSource, Repository } from 'typeorm';
import { OutboxEvent } from './OutboxEvent';
import { EventEnvelope } from './EventEnvelope';
import { v4 as uuidv4 } from 'uuid';

export interface PublishOptions {
  topic: string;
  eventType: string;
  eventVersion: number;
  correlationId: string;
  subject: Record<string, string>;
  payload: unknown;
  producer?: string;
}

export class OutboxPublisher {
  private outboxRepo: Repository<OutboxEvent>;

  constructor(dataSource: DataSource) {
    this.outboxRepo = dataSource.getRepository(OutboxEvent);
  }

  async publish(options: PublishOptions): Promise<string> {
    const eventId = uuidv4();
    const occurredAt = new Date();

    const outboxEvent = this.outboxRepo.create({
      id: eventId,
      occurredAt,
      topic: options.topic,
      eventType: options.eventType,
      eventVersion: options.eventVersion,
      correlationId: options.correlationId,
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
    await this.outboxRepo.update(
      { id: eventId },
      { 
        status: 'failed',
        errorMessage,
        attemptCount: () => '"attempt_count" + 1'
      }
    );
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
