import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  await app.register(multipart as any);
  await app.init();

  const port = parseInt(process.env.PORT || '3004', 10);

  const dataSource = app.get(DataSource);
  const schema = (dataSource.options as any).schema || process.env.DB_SCHEMA || 'public';
  await dataSource.query(`SET search_path TO "${schema}", public;`);
  console.log(`Search path set to "${schema}", public`);

  // OutboxWorker setup for reliable event publishing
  const kafkaBrokers = process.env.KAFKA_BROKERS?.split(',') || [];
  if (kafkaBrokers.length > 0) {
    const { KafkaProducer, OutboxWorker, createLogger } = await import('@insurance/shared');
    const logger = createLogger({ serviceName: 'document', level: process.env.LOG_LEVEL || 'info' });
    const kafkaProducer = new KafkaProducer({ brokers: kafkaBrokers, clientId: 'document' }, logger);
    await kafkaProducer.connect();
    const outboxWorker = new OutboxWorker({
      dataSource,
      producer: kafkaProducer,
      logger,
      producerName: 'document',
      pollIntervalMs: parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '5000', 10),
      batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '50', 10),
      maxAttempts: parseInt(process.env.OUTBOX_MAX_ATTEMPTS || '5', 10),
    });
    outboxWorker.start();
    console.log('OutboxWorker started for document');
  }

  await app.listen({ port, host: '0.0.0.0' });
}

bootstrap();
