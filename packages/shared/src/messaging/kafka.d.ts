import { EachMessagePayload } from 'kafkajs';
import { Logger } from '../observability';
export interface KafkaConfig {
    brokers: string[];
    clientId: string;
    retry?: {
        initialRetryTime?: number;
        retries?: number;
    };
}
export interface ProduceMessage {
    topic: string;
    messages: Array<{
        key?: string;
        value: string;
        headers?: Record<string, string>;
    }>;
}
export declare class KafkaProducer {
    private kafka;
    private producer;
    private logger;
    constructor(config: KafkaConfig, logger: Logger);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    send(message: ProduceMessage): Promise<void>;
}
export interface ConsumeConfig {
    groupId: string;
    topics: string[];
    fromBeginning?: boolean;
}
export type MessageHandler = (payload: EachMessagePayload) => Promise<void>;
export declare class KafkaConsumer {
    private kafka;
    private consumer;
    private logger;
    constructor(config: KafkaConfig, consumeConfig: ConsumeConfig, logger: Logger);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    subscribe(topics: string[], fromBeginning?: boolean): Promise<void>;
    run(handler: MessageHandler): Promise<void>;
}
