import { DataSource, EntityManager } from 'typeorm';
import { OutboxEvent } from './OutboxEvent';
export interface PublishOptions {
    topic: string;
    eventType: string;
    eventVersion: number;
    correlationId: string;
    subject: Record<string, string>;
    payload: unknown;
    producer?: string;
}
export declare class OutboxPublisher {
    private outboxRepo;
    constructor(dataSourceOrManager: DataSource | EntityManager);
    publish(options: PublishOptions): Promise<string>;
    markAsSent(eventId: string): Promise<void>;
    markAsFailed(eventId: string, errorMessage: string): Promise<void>;
    getPendingEvents(limit?: number): Promise<OutboxEvent[]>;
    getFailedEvents(limit?: number): Promise<OutboxEvent[]>;
}
