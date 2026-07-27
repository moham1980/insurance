import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DataSource } from 'typeorm';
import { createLogger, KafkaProducer, OutboxWorker } from '@insurance/shared';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  const port = parseInt(process.env.PORT || '3003', 10);
  const schema = process.env.DB_SCHEMA || 'public';

  const dataSource = app.get(DataSource);
  if (dataSource.isInitialized) {
    await dataSource.query(`SET search_path TO "${schema}", public`);
  }

  const kafkaBrokers = process.env.KAFKA_BROKERS;
  if (typeof kafkaBrokers === 'string' && kafkaBrokers.trim().length > 0) {
    const logger = createLogger({ serviceName: 'fraud-service', level: process.env.LOG_LEVEL || 'info' });
    const producer = new KafkaProducer(
      {
        brokers: kafkaBrokers
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
        clientId: 'fraud-service',
      },
      logger
    );
    const dataSource = app.get(DataSource);
    const worker = new OutboxWorker({
      dataSource,
      producer,
      logger,
      producerName: 'fraud-service',
      pollIntervalMs: parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '1000', 10),
      batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '50', 10),
      maxAttempts: parseInt(process.env.OUTBOX_MAX_ATTEMPTS || '10', 10),
    });
    await worker.start();
  }

  await app.listen({ port, host: '0.0.0.0' });
}

bootstrap();
