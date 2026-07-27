import { Kafka } from 'kafkajs';
export class KafkaProducer {
    kafka;
    producer;
    logger;
    constructor(config, logger) {
        this.kafka = new Kafka({
            clientId: config.clientId,
            brokers: config.brokers,
            retry: config.retry,
        });
        this.producer = this.kafka.producer();
        this.logger = logger.child({ component: 'KafkaProducer' });
    }
    async connect() {
        await this.producer.connect();
        this.logger.info('Kafka producer connected');
    }
    async disconnect() {
        await this.producer.disconnect();
        this.logger.info('Kafka producer disconnected');
    }
    async send(message) {
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
        }
        catch (error) {
            this.logger.error('Failed to send message', error, { topic: message.topic });
            throw error;
        }
    }
}
export class KafkaConsumer {
    kafka;
    consumer;
    logger;
    constructor(config, consumeConfig, logger) {
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
    async connect() {
        await this.consumer.connect();
        this.logger.info('Kafka consumer connected');
    }
    async disconnect() {
        await this.consumer.disconnect();
        this.logger.info('Kafka consumer disconnected');
    }
    async subscribe(topics, fromBeginning = false) {
        for (const topic of topics) {
            await this.consumer.subscribe({ topic, fromBeginning });
            this.logger.info('Subscribed to topic', { topic, fromBeginning });
        }
    }
    async run(handler) {
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
                }
                catch (error) {
                    this.logger.error('Message processing failed', error, {
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
//# sourceMappingURL=kafka.js.map