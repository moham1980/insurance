export declare class DeadLetterEvent {
    dlqId: string;
    originalEventId: string;
    topic: string;
    partition: number | null;
    offset: string | null;
    key: string | null;
    value: any;
    headers: any | null;
    errorMessage: string;
    errorStack: string | null;
    consumerGroup: string;
    retryCount: number;
    maxRetries: number;
    status: 'pending' | 'retrying' | 'failed' | 'resolved';
    nextRetryAt: Date | null;
    lastErrorAt: Date;
    resolvedAt: Date | null;
    createdAt: Date;
}
