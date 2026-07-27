import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('UnderwritingBootstrap');
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  const port = parseInt(process.env.PORT || '3020', 10);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: false,
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  await app.register(helmet, { global: true });

  // OutboxWorker setup for reliable event publishing
  const dataSource = app.get(DataSource);
  const kafkaBrokers = process.env.KAFKA_BROKERS?.split(',').filter((b) => b.trim().length > 0) || [];
  let kafkaProducer: any;
  let outboxWorker: any;

  if (kafkaBrokers.length > 0) {
    const { KafkaProducer, OutboxWorker, createLogger } = await import('@insurance/shared');
    const eventLogger = createLogger({ serviceName: 'underwriting', level: process.env.LOG_LEVEL || 'info' });
    kafkaProducer = new KafkaProducer({ brokers: kafkaBrokers, clientId: 'underwriting' }, eventLogger);
    await kafkaProducer.connect();
    outboxWorker = new OutboxWorker({
      dataSource,
      producer: kafkaProducer,
      logger: eventLogger,
      producerName: 'underwriting',
      pollIntervalMs: parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '5000', 10),
      batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '50', 10),
      maxAttempts: parseInt(process.env.OUTBOX_MAX_ATTEMPTS || '5', 10),
    });
    outboxWorker.start();
    logger.log('OutboxWorker started for underwriting');
  } else {
    logger.warn('KAFKA_BROKERS is not set; outbox events will accumulate in the outbox table and will not be published');
  }

  app.enableShutdownHooks();
  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook('onClose', async () => {
    if (outboxWorker && typeof outboxWorker.stop === 'function') {
      outboxWorker.stop();
      logger.log('OutboxWorker stopped');
    }
    if (kafkaProducer && typeof kafkaProducer.disconnect === 'function') {
      await kafkaProducer.disconnect();
      logger.log('KafkaProducer disconnected');
    }
  });

  await app.listen({ port, host: '0.0.0.0' });
}

bootstrap();
