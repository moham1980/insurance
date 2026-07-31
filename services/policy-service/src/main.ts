import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { createLogger, createTracer, KafkaProducer, OutboxWorker } from '@insurance/shared';

const tracer = createTracer({
  serviceName: 'policy-service',
  otlpEndpoint: process.env.OTEL_OTLP_ENDPOINT,
  jaegerEndpoint: process.env.OTEL_JAEGER_ENDPOINT,
});
tracer.start();

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  const port = parseInt(process.env.PORT || '3014', 10);

  const kafkaBrokers = process.env.KAFKA_BROKERS;
  if (typeof kafkaBrokers === 'string' && kafkaBrokers.trim().length > 0) {
    const logger = createLogger({ serviceName: 'policy-service', level: process.env.LOG_LEVEL || 'info' });
    const producer = new KafkaProducer(
      {
        brokers: kafkaBrokers
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
        clientId: 'policy-service',
      },
      logger
    );
    const dataSource = app.get(DataSource);
    const worker = new OutboxWorker({
      dataSource,
      producer,
      logger,
      producerName: 'policy-service',
      pollIntervalMs: parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '1000', 10),
      batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '50', 10),
      maxAttempts: parseInt(process.env.OUTBOX_MAX_ATTEMPTS || '10', 10),
    });
    await worker.start();
  }

  await app.listen({ port, host: '0.0.0.0' });
}

bootstrap();
