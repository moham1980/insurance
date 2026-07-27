import { Kafka, Consumer, Producer, ConsumerRunConfig, ProducerRecord } from 'kafkajs';

export class KafkaHelper {
  private static kafka: Kafka;
  private static producers: Map<string, Producer> = new Map();
  private static consumers: Map<string, Consumer> = new Map();

  static getKafka(): Kafka {
    if (!this.kafka) {
      this.kafka = new Kafka({
        clientId: 'test-helper',
        brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      });
    }
    return this.kafka;
  }

  static async getProducer(clientId: string = 'test-producer'): Promise<Producer> {
    if (this.producers.has(clientId)) {
      return this.producers.get(clientId)!;
    }

    const producer = this.getKafka().producer();
    await producer.connect();
    this.producers.set(clientId, producer);
    return producer;
  }

  static async getConsumer(groupId: string = 'test-consumer-group'): Promise<Consumer> {
    if (this.consumers.has(groupId)) {
      return this.consumers.get(groupId)!;
    }

    const consumer = this.getKafka().consumer({ groupId });
    await consumer.connect();
    this.consumers.set(groupId, consumer);
    return consumer;
  }

  static async produceMessage(params: {
    topic: string;
    key?: string;
    value: any;
    headers?: Record<string, string>;
  }): Promise<void> {
    const producer = await this.getProducer();
    const record: ProducerRecord = {
      topic: params.topic,
      messages: [
        {
          key: params.key,
          value: JSON.stringify(params.value),
          headers: params.headers,
        },
      ],
    };
    await producer.send(record);
  }

  static async consumeMessages(params: {
    topic: string;
    groupId?: string;
    fromBeginning?: boolean;
    maxMessages?: number;
    timeoutMs?: number;
  }): Promise<any[]> {
    const consumer = await this.getConsumer(params.groupId);
    const messages: any[] = [];

    await consumer.subscribe({ 
      topic: params.topic, 
      fromBeginning: params.fromBeginning || false 
    });

    const runConfig: ConsumerRunConfig = {
      eachMessage: async ({ topic, partition, message }) => {
        messages.push({
          topic,
          partition,
          key: message.key?.toString(),
          value: JSON.parse(message.value?.toString() || '{}'),
          headers: message.headers,
        });

        if (params.maxMessages && messages.length >= params.maxMessages) {
          await consumer.stop();
        }
      },
    };

    const consumerPromise = consumer.run(runConfig);

    if (params.timeoutMs) {
      setTimeout(async () => {
        await consumer.stop();
      }, params.timeoutMs);
    }

    await consumerPromise;
    return messages;
  }

  static async waitForEvent(params: {
    topic: string;
    filter?: (message: any) => boolean;
    timeoutMs?: number;
    groupId?: string;
  }): Promise<any> {
    const startTime = Date.now();
    const timeoutMs = params.timeoutMs || 30000;

    const consumer = await this.getConsumer(params.groupId);
    await consumer.subscribe({ topic: params.topic, fromBeginning: false });

    return new Promise((resolve, reject) => {
      const runConfig: ConsumerRunConfig = {
        eachMessage: async ({ message }) => {
          const value = JSON.parse(message.value?.toString() || '{}');
          
          if (!params.filter || params.filter(value)) {
            await consumer.stop();
            resolve(value);
          }
        },
      };

      consumer.run(runConfig);

      setTimeout(async () => {
        await consumer.stop();
        reject(new Error(`Event not received within ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  static async cleanup(): Promise<void> {
    for (const [clientId, producer] of this.producers) {
      await producer.disconnect();
    }
    this.producers.clear();

    for (const [groupId, consumer] of this.consumers) {
      await consumer.disconnect();
    }
    this.consumers.clear();
  }

  static async createTopic(topic: string): Promise<void> {
    const admin = this.getKafka().admin();
    await admin.connect();
    await admin.createTopics({
      topics: [{ topic }],
    });
    await admin.disconnect();
  }

  static async deleteTopic(topic: string): Promise<void> {
    const admin = this.getKafka().admin();
    await admin.connect();
    await admin.deleteTopics({
      topics: [topic],
    });
    await admin.disconnect();
  }
}
