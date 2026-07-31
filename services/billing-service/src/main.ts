import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { BillingService } from './billing.service';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  const port = parseInt(process.env.PORT || '3037', 10);

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));

  // OutboxWorker setup for reliable event publishing
  const dataSource = app.get(DataSource);
  const kafkaBrokers = process.env.KAFKA_BROKERS?.split(',') || [];
  if (kafkaBrokers.length > 0) {
    const { KafkaProducer, OutboxWorker, createLogger, KafkaConsumer, DeadLetterQueueService, consumeOnce } = await import('@insurance/shared');
    const logger = createLogger({ serviceName: 'billing', level: process.env.LOG_LEVEL || 'info' });
    const kafkaProducer = new KafkaProducer({ brokers: kafkaBrokers, clientId: 'billing' }, logger);
    await kafkaProducer.connect();
    const outboxWorker = new OutboxWorker({
      dataSource,
      producer: kafkaProducer,
      logger,
      producerName: 'billing',
      pollIntervalMs: parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '5000', 10),
      batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '50', 10),
      maxAttempts: parseInt(process.env.OUTBOX_MAX_ATTEMPTS || '5', 10),
    });
    outboxWorker.start();
    console.log('OutboxWorker started for billing');

    // Kafka consumer for insurance.payment.completed → auto-record payment
    const consumer = new KafkaConsumer(
      { brokers: kafkaBrokers, clientId: process.env.KAFKA_CLIENT_ID || 'billing' },
      { groupId: process.env.KAFKA_GROUP_ID || 'billing', topics: [] },
      logger,
    );
    await consumer.connect();
    await consumer.subscribe(['insurance.payment.completed'], false);

    const dlq = new DeadLetterQueueService(
      {
        dataSource,
        kafkaConfig: { brokers: kafkaBrokers, clientId: 'billing-dlq' },
        maxRetries: parseInt(process.env.DLQ_MAX_RETRIES || '3', 10),
      },
      logger,
    );
    await dlq.initialize();
    await dlq.startRetryProcessor(parseInt(process.env.DLQ_RETRY_INTERVAL_MS || '60000', 10));

    const billingService = app.get(BillingService);
    const consumerName = process.env.CONSUMER_NAME || 'billing';

    await consumer.run(async ({ topic, message }: { topic: string; message: any }) => {
      const raw = message.value?.toString() || '{}';
      let parsed: any;
      try { parsed = JSON.parse(raw); } catch { parsed = { raw }; }

      const eventId = parsed?.eventId;
      if (typeof eventId !== 'string' || eventId.length < 10) return;

      const correlationId = parsed?.correlationId || 'n/a';
      const claimId = parsed?.subject?.claimId || parsed?.payload?.claimId;
      const amount = parsed?.payload?.amount;
      const paymentIntentId = parsed?.subject?.paymentIntentId || parsed?.payload?.paymentIntentId;
      const tenantId = parsed?.subject?.tenantId || parsed?.payload?.tenantId;

      if (!tenantId || !claimId || typeof amount !== 'number') return;

      try {
        const res = await consumeOnce({
          dataSource,
          consumerName,
          tenantId,
          topic: String(topic),
          eventId: String(eventId),
          handler: async () => {
            if (String(topic) !== 'insurance.payment.completed') return;
            const invoices = await billingService.findInvoicesByClaimId(claimId, tenantId);
            for (const inv of invoices) {
              if (inv.status === 'pending' || inv.status === 'overdue') {
                await billingService.recordPayment({
                  invoiceId: inv.id,
                  tenantId,
                  amount,
                  paymentDate: new Date(),
                  reference: paymentIntentId || `bank-payment:${eventId}`,
                  correlationId: String(correlationId),
                });
              }
            }
          },
        });
        if (res.consumed === false && res.reason === 'DUPLICATE') return;
      } catch (e: any) {
        const err = e instanceof Error ? e : new Error(String(e));
        logger.error('PaymentCompleted consume failed, sending to DLQ', err, { topic, eventId, claimId, tenantId });
        try {
          await dlq.addToDLQ(String(topic), message as any, err, process.env.KAFKA_GROUP_ID || 'billing');
        } catch (dlqErr: any) {
          logger.error('Failed to add message to DLQ', dlqErr instanceof Error ? dlqErr : new Error(String(dlqErr)), { topic, eventId, claimId, tenantId });
        }
      }
    });
  }

  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Billing Service listening on port ${port}`);
}

bootstrap();
