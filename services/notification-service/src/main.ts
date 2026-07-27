import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  const port = parseInt(process.env.PORT || '3025', 10);

  await app.init();

  const dataSource = app.get(DataSource);
  const schema = process.env.DB_SCHEMA || 'notification';
  await dataSource.query(`SET search_path TO "${schema}", public`);

  // OutboxWorker setup for reliable event publishing
  const kafkaBrokers = process.env.KAFKA_BROKERS?.split(',') || [];
  if (kafkaBrokers.length > 0 && process.env.KAFKA_ENABLED !== 'false') {
    const { KafkaProducer, OutboxWorker, createLogger } = await import('@insurance/shared');
    const logger = createLogger({ serviceName: 'notification', level: process.env.LOG_LEVEL || 'info' });
    const kafkaProducer = new KafkaProducer({ brokers: kafkaBrokers, clientId: 'notification' }, logger);
    await kafkaProducer.connect();
    const outboxWorker = new OutboxWorker({
      dataSource,
      producer: kafkaProducer,
      logger,
      producerName: 'notification',
      pollIntervalMs: parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '5000', 10),
      batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '50', 10),
      maxAttempts: parseInt(process.env.OUTBOX_MAX_ATTEMPTS || '5', 10),
    });
    outboxWorker.start();
    console.log('OutboxWorker started for notification');
  }

  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Notification Service listening on port ${port}`);
}

bootstrap();
