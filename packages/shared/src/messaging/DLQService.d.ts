import { DataSource } from 'typeorm';
import { KafkaMessage } from 'kafkajs';
import { DeadLetterEvent } from '../events/DeadLetterEvent';
import { Logger } from '../observability';
export interface DLQConfig {
    dataSource: DataSource;
    kafkaConfig?: {
        brokers: string[];
        clientId?: string;
    };
    maxRetries?: number;
    retryDelays?: number[];
}
export declare class DeadLetterQueueService {
    private dlqRepo;
    private kafka;
    private logger;
    private config;
    private retryDelays;
    constructor(config: DLQConfig, logger: Logger);
    initialize(): Promise<void>;
    addToDLQ(topic: string, message: KafkaMessage, error: Error, consumerGroup: string, partition?: number): Promise<DeadLetterEvent>;
    private calculateNextRetryTime;
    processRetries(): Promise<void>;
    resolveDLQEntry(dlqId: string, resolution: 'manual' | 'auto'): Promise<void>;
    getDLQStats(): Promise<{
        total: number;
        pending: number;
        retrying: number;
        failed: number;
        resolved: number;
    }>;
    startRetryProcessor(intervalMs?: number): Promise<void>;
}
