import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    disableErrorMessages: process.env.NODE_ENV === 'production',
  }));

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  });

  const fastify: any = app.getHttpAdapter().getInstance();
  if (fastify?.addHook) {
    fastify.addHook('onRequest', async (req: any, reply: any) => {
      reply.header('X-Content-Type-Options', 'nosniff');
      reply.header('X-Frame-Options', 'DENY');
      reply.header('X-XSS-Protection', '1; mode=block');
      reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      reply.header('Referrer-Policy', 'no-referrer');
      reply.header('X-DNS-Prefetch-Control', 'off');
    });
  }

  const port = parseInt(process.env.PORT || '3007', 10);
    // OutboxWorker setup for reliable event publishing
  const dataSource = app.get(DataSource);
  const kafkaBrokers = process.env.KAFKA_BROKERS?.split(',') || [];
  if (kafkaBrokers.length > 0) {
    const { KafkaProducer, OutboxWorker, createLogger } = await import('@insurance/shared');
    const logger = createLogger({ serviceName: 'auth', level: process.env.LOG_LEVEL || 'info' });
    const kafkaProducer = new KafkaProducer({ brokers: kafkaBrokers, clientId: 'auth' }, logger);
    await kafkaProducer.connect();
    const outboxWorker = new OutboxWorker({
      dataSource,
      producer: kafkaProducer,
      logger,
      producerName: 'auth',
      pollIntervalMs: parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '5000', 10),
      batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '50', 10),
      maxAttempts: parseInt(process.env.OUTBOX_MAX_ATTEMPTS || '5', 10),
    });
    outboxWorker.start();
    console.log('OutboxWorker started for auth');
  }

await app.listen({ port, host: '0.0.0.0' });
}

bootstrap();
