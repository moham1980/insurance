import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { createLogger } from '@insurance/shared';
import { EcosystemSyncService } from './services/ecosystem-sync.service';

async function bootstrap() {
  const logger = createLogger({
    serviceName: 'ai-governance-service',
    prettyPrint: process.env.NODE_ENV !== 'production',
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { logger: false },
  );

  const port = parseInt(process.env.PORT || '3027', 10);
    // OutboxWorker setup for reliable event publishing
  const dataSource = app.get(DataSource);
  const kafkaBrokers = process.env.KAFKA_BROKERS?.split(',') || [];
  if (kafkaBrokers.length > 0) {
    const { KafkaProducer, OutboxWorker, createLogger } = await import('@insurance/shared');
    const logger = createLogger({ serviceName: 'ai-governance', level: process.env.LOG_LEVEL || 'info' });
    const kafkaProducer = new KafkaProducer({ brokers: kafkaBrokers, clientId: 'ai-governance' }, logger);
    await kafkaProducer.connect();
    const outboxWorker = new OutboxWorker({
      dataSource,
      producer: kafkaProducer,
      logger,
      producerName: 'ai-governance',
      pollIntervalMs: parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '5000', 10),
      batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '50', 10),
      maxAttempts: parseInt(process.env.OUTBOX_MAX_ATTEMPTS || '5', 10),
    });
    outboxWorker.start();
    console.log('OutboxWorker started for ai-governance');

    const { KafkaConsumer } = await import('@insurance/shared');
    const kafkaConsumer = new KafkaConsumer({
      brokers: kafkaBrokers,
      clientId: 'ai-governance-consumer',
    }, {
      groupId: 'ai-governance-policy-sync',
      topics: [],
    }, logger);
    await kafkaConsumer.connect();
    await kafkaConsumer.subscribe(['ai.governance.policy.update']);
    kafkaConsumer.run(async ({ topic, message }) => {
      if (topic === 'ai.governance.policy.update') {
        try {
          const event = JSON.parse(message.value?.toString() || '{}');
          const ecosystemSyncService = app.get(EcosystemSyncService);
          await ecosystemSyncService.importPolicyUpdate({
            policyId: event.policyId,
            policyType: event.policyType,
            rules: event.rules,
            effectiveFrom: event.effectiveFrom,
            sourceSystem: event.sourceSystem || 'ecosystem',
          });
          logger.info(`Policy update ${event.policyId} applied from ecosystem`);
        } catch (e: any) {
          logger.error(`Failed to process policy update: ${e.message}`);
        }
      }
    });
    console.log('Kafka consumer started for ai.governance.policy.update');
  }

await app.listen(port, '0.0.0.0');
  logger.info(`AI Governance Service running on port ${port}`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
