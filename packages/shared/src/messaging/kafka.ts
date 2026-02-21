import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
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

export class KafkaProducer {
  private kafka: Kafka;
  private producer: Producer;
  private logger: Logger;

  constructor(config: KafkaConfig, logger: Logger) {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      retry: config.retry,
    });
    this.producer = this.kafka.producer();
    this.logger = logger.child({ component: 'KafkaProducer' });
  }

  async connect(): Promise<void> {
    await this.producer.connect();
    this.logger.info('Kafka producer connected');
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
    this.logger.info('Kafka producer disconnected');
  }

  async send(message: ProduceMessage): Promise<void> {
    try {
      await this.producer.send({
        topic: message.topic,
        messages: message.messages.map(m => ({
          key: m.key,
          value: m.value,
          headers: m.headers,
        })),
      });
      this.logger.debug('Message sent', { topic: message.topic });
    } catch (error) {
      this.logger.error('Failed to send message', error as Error, { topic: message.topic });
      throw error;
    }
  }
}

export interface ConsumeConfig {
  groupId: string;
  topics: string[];
  fromBeginning?: boolean;
}

export type MessageHandler = (payload: EachMessagePayload) => Promise<void>;

export class KafkaConsumer {
  private kafka: Kafka;
  private consumer: Consumer;
  private logger: Logger;

  constructor(config: KafkaConfig, consumeConfig: ConsumeConfig, logger: Logger) {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      retry: config.retry,
    });
    this.consumer = this.kafka.consumer({
      groupId: consumeConfig.groupId,
    });
    this.logger = logger.child({ component: 'KafkaConsumer', groupId: consumeConfig.groupId });
  }

  async connect(): Promise<void> {
    await this.consumer.connect();
    this.logger.info('Kafka consumer connected');
  }

  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
    this.logger.info('Kafka consumer disconnected');
  }

  async subscribe(topics: string[], fromBeginning: boolean = false): Promise<void> {
    for (const topic of topics) {
      await this.consumer.subscribe({ topic, fromBeginning });
      this.logger.info('Subscribed to topic', { topic, fromBeginning });
    }
  }

  async run(handler: MessageHandler): Promise<void> {
    await this.consumer.run({
      eachMessage: async (payload) => {
        const { topic, partition, message } = payload;
        
        try {
          await handler(payload);
          
          this.logger.debug('Message processed', {
            topic,
            partition,
            offset: message.offset,
          });
        } catch (error) {
          this.logger.error('Message processing failed', error as Error, {
            topic,
            partition,
            offset: message.offset,
          });
          throw error;
        }
      },
    });
  }
}
