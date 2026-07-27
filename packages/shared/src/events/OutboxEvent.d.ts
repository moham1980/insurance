export declare class OutboxEvent {
    id: string;
    occurredAt: Date;
    topic: string;
    eventType: string;
    eventVersion: number;
    correlationId: string;
    subjectJson: object;
    payloadJson: object;
    status: 'pending' | 'sent' | 'failed';
    attemptCount: number;
    errorMessage: string | null;
}
