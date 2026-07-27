import { DataSource } from 'typeorm';
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
export declare class OutboxWorker {
    private readonly config;
    private readonly logger;
    private timer;
    private running;
    private inFlight;
    constructor(config: OutboxWorkerConfig);
    private sleep;
    start(): Promise<void>;
    stop(): Promise<void>;
    private tick;
    private processBatch;
    private sendOne;
}
