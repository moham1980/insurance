import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ProxyAgent, setGlobalDispatcher } from 'undici';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from '../../common/src/all-exceptions.filter';

async function bootstrap() {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (proxyUrl) {
    setGlobalDispatcher(new ProxyAgent(proxyUrl));
  }

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  const fastify: any = app.getHttpAdapter().getInstance();
  if (fastify?.addHook) {
    fastify.addHook('onRequest', async (req: any, reply: any) => {
      const correlationId =
        req?.headers?.['x-correlation-id'] ||
        req?.headers?.['X-Correlation-Id'] ||
        `document-ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      req.correlationId = correlationId;
      reply.header('X-Correlation-Id', correlationId);
    });
  }

  app.useGlobalFilters(new AllExceptionsFilter());
  const port = parseInt(process.env.PORT || '3021', 10);
    // OutboxWorker setup for reliable event publishing
  const dataSource = app.get(DataSource);
  const kafkaBrokers = process.env.KAFKA_BROKERS?.split(',') || [];
  if (kafkaBrokers.length > 0) {
    const { KafkaProducer, OutboxWorker, createLogger } = await import('@insurance/shared');
    const logger = createLogger({ serviceName: 'document-ai-service', level: process.env.LOG_LEVEL || 'info' });
    const kafkaProducer = new KafkaProducer({ brokers: kafkaBrokers, clientId: 'document-ai-service' }, logger);
    await kafkaProducer.connect();
    const outboxWorker = new OutboxWorker({
      dataSource,
      producer: kafkaProducer,
      logger,
      producerName: 'document-ai-service',
      pollIntervalMs: parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '5000', 10),
      batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '50', 10),
      maxAttempts: parseInt(process.env.OUTBOX_MAX_ATTEMPTS || '5', 10),
    });
    outboxWorker.start();
    console.log('OutboxWorker started for document-ai-service');
  }

await app.listen({ port, host: '0.0.0.0' });
}

bootstrap();
