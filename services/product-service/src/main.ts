import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  const port = parseInt(process.env.PORT || '3018', 10);
    // OutboxWorker setup for reliable event publishing
  const dataSource = app.get(DataSource);
  const kafkaBrokers = process.env.KAFKA_BROKERS?.split(',') || [];
  let outboxWorker: any;
  if (kafkaBrokers.length > 0) {
    const { KafkaProducer, OutboxWorker, createLogger } = await import('@insurance/shared');
    const logger = createLogger({ serviceName: 'product', level: process.env.LOG_LEVEL || 'info' });
    const kafkaProducer = new KafkaProducer({ brokers: kafkaBrokers, clientId: 'product' }, logger);
    await kafkaProducer.connect();
    outboxWorker = new OutboxWorker({
      dataSource,
      producer: kafkaProducer,
      logger,
      producerName: 'product',
      pollIntervalMs: parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '5000', 10),
      batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '50', 10),
      maxAttempts: parseInt(process.env.OUTBOX_MAX_ATTEMPTS || '5', 10),
    });
    await outboxWorker.start();
    logger.info('OutboxWorker started for product');
  }

  app.enableShutdownHooks();
  app.getHttpAdapter().getInstance().addHook('onClose', async () => {
    if (outboxWorker) await outboxWorker.stop();
  });

await app.listen({ port, host: '0.0.0.0' });
}

bootstrap();
