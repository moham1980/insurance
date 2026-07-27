import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { DeadLetterQueueService, KafkaConsumer, consumeOnce, createLogger, KafkaProducer, OutboxWorker } from '@insurance/shared';
import { PaymentsService } from './payments.service';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  const port = parseInt(process.env.PORT || '3004', 10);

  const kafkaBrokers = process.env.KAFKA_BROKERS;
  if (typeof kafkaBrokers === 'string' && kafkaBrokers.trim().length > 0) {
    const logger = createLogger({ serviceName: 'payments-service', level: process.env.LOG_LEVEL || 'info' });
    const dlqRetryIntervalMs = parseInt(process.env.DLQ_RETRY_INTERVAL_MS || '60000', 10);
    const brokers = kafkaBrokers
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

    const producer = new KafkaProducer(
      {
        brokers,
        clientId: 'payments-service',
      },
      logger
    );
    const dataSource = app.get(DataSource);
    const dbSchema = process.env.DB_SCHEMA || 'public';
    await dataSource.query(`SET search_path TO ${dbSchema}, public;`);
    const worker = new OutboxWorker({
      dataSource,
      producer,
      logger,
      producerName: 'payments-service',
      pollIntervalMs: parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '1000', 10),
      batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '50', 10),
      maxAttempts: parseInt(process.env.OUTBOX_MAX_ATTEMPTS || '10', 10),
    });
    await worker.start();

    const consumer = new KafkaConsumer(
      {
        brokers,
        clientId: process.env.KAFKA_CLIENT_ID || 'payments-service',
      },
      {
        groupId: process.env.KAFKA_GROUP_ID || 'payments-service',
        topics: [],
      },
      logger
    );
    await consumer.connect();
    await consumer.subscribe(['insurance.claim.payment_requested', 'bank.payment.completed'], false);

    const dlq = new DeadLetterQueueService(
      {
        dataSource,
        kafkaConfig: {
          brokers,
          clientId: process.env.KAFKA_CLIENT_ID || 'payments-dlq',
        },
        maxRetries: parseInt(process.env.DLQ_MAX_RETRIES || '3', 10),
      },
      logger
    );
    await dlq.initialize();
    await dlq.startRetryProcessor(Number.isFinite(dlqRetryIntervalMs) ? dlqRetryIntervalMs : 60000);

    const svc = app.get(PaymentsService);
    const consumerName = process.env.CONSUMER_NAME || 'payments-service';

    await consumer.run(async ({ topic, message }) => {
      const raw = message.value?.toString() || '{}';
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = { raw };
      }

      const eventId = parsed?.eventId;
      if (typeof eventId !== 'string' || eventId.length < 10) return;

      const correlationId = parsed?.correlationId || (message.headers?.['x-correlation-id'] as any)?.toString?.() || 'n/a';
      const claimId = parsed?.subject?.claimId || parsed?.payload?.claimId;
      const approvedAmount = parsed?.payload?.approvedAmount;
      const paymentIntentId = parsed?.subject?.paymentIntentId || parsed?.payload?.paymentIntentId;
      const tenantId = parsed?.subject?.tenantId || parsed?.payload?.tenantId;
      const currency = parsed?.payload?.currency;

      if (!claimId && !paymentIntentId) return;

      try {
        const res = await consumeOnce({
          dataSource,
          consumerName,
          topic: String(topic),
          eventId: String(eventId),
          handler: async () => {
            if (String(topic) === 'bank.payment.completed') {
              if (!paymentIntentId) {
                throw new Error('bank.payment.completed missing paymentIntentId');
              }
              if (!tenantId) {
                throw new Error('bank.payment.completed missing tenantId');
              }
              await svc.confirmBankPayment({
                correlationId: String(correlationId),
                tenantId: String(tenantId),
                paymentIntentId: String(paymentIntentId),
                bankTransactionId: parsed?.payload?.transactionId || parsed?.payload?.providerRef || '',
                amount: typeof approvedAmount === 'number' ? approvedAmount : undefined,
                currency: typeof currency === 'string' ? currency : undefined,
              });
              return;
            }
            if (String(topic) !== 'insurance.claim.payment_requested') return;
            if (typeof approvedAmount !== 'number' || !Number.isFinite(approvedAmount) || approvedAmount <= 0) {
              const err: any = new Error('Invalid approvedAmount for payment request');
              err.code = 'VALIDATION_ERROR';
              throw err;
            }
            if (!tenantId) {
              const err: any = new Error('insurance.claim.payment_requested missing tenantId');
              err.code = 'VALIDATION_ERROR';
              throw err;
            }

            await svc.preparePayment({
              correlationId: String(correlationId),
              tenantId: String(tenantId),
              idempotencyKey: `claim-payment-requested:${String(eventId)}`,
              claimId: String(claimId),
              amount: approvedAmount,
              currency: currency || 'IRR',
            });
          },
        });
        if (res.consumed === false && res.reason === 'DUPLICATE') return;
      } catch (e: any) {
        const err = e instanceof Error ? e : new Error(String(e));
        logger.error('ClaimPaymentRequested consume failed, sending to DLQ', err, { topic, eventId, claimId });
        try {
          await dlq.addToDLQ(String(topic), message as any, err, process.env.KAFKA_GROUP_ID || 'payments-service');
        } catch (dlqErr: any) {
          logger.error('Failed to add message to DLQ', dlqErr instanceof Error ? dlqErr : new Error(String(dlqErr)), { topic, eventId, claimId });
        }
      }
    });
  }

  await app.listen({ port, host: '0.0.0.0' });
}

bootstrap();
