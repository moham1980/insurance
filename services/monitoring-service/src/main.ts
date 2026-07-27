import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DataSource } from 'typeorm';
import { DeadLetterQueueService, KafkaConsumer, consumeOnce, createLogger } from '@insurance/shared';
import { AppModule } from './app.module';
import { MonitoringService } from './monitoring.service';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  const port = parseInt(process.env.PORT || '3008', 10);

  const kafkaBrokers = process.env.KAFKA_BROKERS;
  if (typeof kafkaBrokers === 'string' && kafkaBrokers.trim().length > 0) {
    const logger = createLogger({ serviceName: 'monitoring-service', level: process.env.LOG_LEVEL || 'info' });
    const dlqRetryIntervalMs = parseInt(process.env.DLQ_RETRY_INTERVAL_MS || '60000', 10);

    const brokers = kafkaBrokers
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

    const consumer = new KafkaConsumer(
      {
        brokers,
        clientId: process.env.KAFKA_CLIENT_ID || 'monitoring-service',
      },
      {
        groupId: process.env.KAFKA_GROUP_ID || 'monitoring-service',
        topics: [],
      },
      logger
    );
    await consumer.connect();
    await consumer.subscribe(['insurance.complaint.sla_breached'], false);

    const ds = app.get(DataSource);
    const svc = app.get(MonitoringService);
    const consumerName = process.env.CONSUMER_NAME || 'monitoring-service';

    const dlq = new DeadLetterQueueService(
      {
        dataSource: ds,
        kafkaConfig: {
          brokers,
          clientId: process.env.KAFKA_CLIENT_ID || 'monitoring-dlq',
        },
        maxRetries: parseInt(process.env.DLQ_MAX_RETRIES || '3', 10),
      },
      logger
    );
    await dlq.initialize();
    await dlq.startRetryProcessor(Number.isFinite(dlqRetryIntervalMs) ? dlqRetryIntervalMs : 60000);

    await consumer.run(async ({ topic, message }) => {
      const raw = message.value?.toString() || '{}';
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = { raw };
      }

      const eventId = parsed?.eventId;
      if (typeof eventId !== 'string' || eventId.length < 10) return;

      const correlationId =
        parsed?.correlationId || (message.headers?.['x-correlation-id'] as any)?.toString?.() || 'n/a';

      try {
        const res = await consumeOnce({
          dataSource: ds,
          consumerName,
          topic: String(topic),
          eventId: String(eventId),
          handler: async () => {
            if (String(topic) !== 'insurance.complaint.sla_breached') return;
            await svc.onComplaintSlaBreached({ correlationId: String(correlationId), envelope: parsed });
          },
        });
        if (res.consumed === false && res.reason === 'DUPLICATE') return;
      } catch (e: any) {
        const err = e instanceof Error ? e : new Error(String(e));
        logger.error('Kafka consume failed, sending to DLQ', err, { topic, eventId });
        try {
          await dlq.addToDLQ(String(topic), message as any, err, process.env.KAFKA_GROUP_ID || 'monitoring-service');
        } catch (dlqErr: any) {
          logger.error('Failed to add message to DLQ', dlqErr instanceof Error ? dlqErr : new Error(String(dlqErr)), { topic, eventId });
        }
      }
    });
  }

    // OutboxWorker setup for reliable event publishing
  const dataSource = app.get(DataSource);
  const outboxBrokers = process.env.KAFKA_BROKERS?.split(',') || [];
  if (outboxBrokers.length > 0) {
    const { KafkaProducer, OutboxWorker, createLogger } = await import('@insurance/shared');
    const logger = createLogger({ serviceName: 'monitoring', level: process.env.LOG_LEVEL || 'info' });
    const kafkaProducer = new KafkaProducer({ brokers: outboxBrokers, clientId: 'monitoring' }, logger);
    await kafkaProducer.connect();
    const outboxWorker = new OutboxWorker({
      dataSource,
      producer: kafkaProducer,
      logger,
      producerName: 'monitoring',
      pollIntervalMs: parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '5000', 10),
      batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '50', 10),
      maxAttempts: parseInt(process.env.OUTBOX_MAX_ATTEMPTS || '5', 10),
    });
    outboxWorker.start();
    console.log('OutboxWorker started for monitoring');
  }

await app.listen({ port, host: '0.0.0.0' });
}

bootstrap();
