import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { DeadLetterQueueService, KafkaConsumer, consumeOnce, createLogger } from '@insurance/shared';
import { OrchestratorService } from './orchestrator.service';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  const port = parseInt(process.env.PORT || '3006', 10);

  const kafkaBrokers = process.env.KAFKA_BROKERS;
  if (typeof kafkaBrokers === 'string' && kafkaBrokers.trim().length > 0) {
    const logger = createLogger({ serviceName: 'orchestrator-service', level: process.env.LOG_LEVEL || 'info' });
    const dlqRetryIntervalMs = parseInt(process.env.DLQ_RETRY_INTERVAL_MS || '60000', 10);
    const consumer = new KafkaConsumer(
      {
        brokers: kafkaBrokers
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
        clientId: process.env.KAFKA_CLIENT_ID || 'orchestrator-service',
      },
      {
        groupId: process.env.KAFKA_GROUP_ID || 'orchestrator-service',
        topics: [],
      },
      logger
    );

    await consumer.connect();
    await consumer.subscribe(
      [
        'insurance.payment.prepared',
        'insurance.payment.finance_approved',
        'insurance.payment.executed',
        'insurance.payment.notified',
        'insurance.document.extraction.needs_review',
        'insurance.fraud.score_computed',
        'insurance.fraud.case.escalated',
        'insurance.complaint.created',
        'insurance.complaint.sla_breached',
      ],
      false
    );

    const ds = app.get(DataSource);
    const svc = app.get(OrchestratorService);
    const consumerName = process.env.CONSUMER_NAME || 'orchestrator-service';

    const dlq = new DeadLetterQueueService(
      {
        dataSource: ds,
        kafkaConfig: {
          brokers: kafkaBrokers
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean),
          clientId: process.env.KAFKA_CLIENT_ID || 'orchestrator-dlq',
        },
        maxRetries: parseInt(process.env.DLQ_MAX_RETRIES || '3', 10),
      },
      logger
    );
    await dlq.initialize();
    await dlq.startRetryProcessor(Number.isFinite(dlqRetryIntervalMs) ? dlqRetryIntervalMs : 60000);

    await consumer.run(async ({ topic, message }) => {
      const raw = message.value?.toString() || '{}';
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = { raw };
      }

      const eventId = parsed?.eventId;
      const claimId = parsed?.subject?.claimId || parsed?.payload?.claimId;
      const fraudCaseId = parsed?.subject?.fraudCaseId || parsed?.payload?.fraudCaseId;
      const paymentIntentId = parsed?.subject?.paymentIntentId || parsed?.payload?.paymentIntentId;
      const documentId = parsed?.subject?.documentId || parsed?.payload?.documentId;
      const complaintId = parsed?.subject?.complaintId || parsed?.payload?.complaintId;

      if (typeof eventId !== 'string' || eventId.length < 10) return;
      if (!claimId && !complaintId) return;

      const correlationId = parsed?.correlationId || (message.headers?.['x-correlation-id'] as any)?.toString?.() || 'n/a';
      const tenantId =
        (message.headers?.['x-tenant-id'] as any)?.toString?.() ||
        parsed?.subject?.tenantId ||
        parsed?.tenantId ||
        parsed?.payload?.tenantId ||
        '00000000-0000-0000-0000-000000000000';

      try {
        const res = await consumeOnce({
          dataSource: ds,
          consumerName,
          topic: String(topic),
          eventId: String(eventId),
          tenantId: String(tenantId),
          handler: async () => {
            if (String(topic) === 'insurance.document.extraction.needs_review') {
              if (!documentId) return;
              await svc.onDocumentNeedsReview({
                topic,
                correlationId: String(correlationId),
                tenantId: String(tenantId),
                claimId: String(claimId),
                documentId: String(documentId),
                payload: parsed,
              });
              return;
            }

            if (String(topic) === 'insurance.fraud.score_computed') {
              await svc.onFraudScoreComputed({
                topic,
                correlationId: String(correlationId),
                tenantId: String(tenantId),
                claimId: String(claimId),
                payload: parsed,
              });
              return;
            }

            if (String(topic) === 'insurance.complaint.created') {
              if (!complaintId) return;
              await svc.onComplaintCreated({
                topic,
                correlationId: String(correlationId),
                tenantId: String(tenantId),
                complaintId: String(complaintId),
                payload: parsed,
              });
              return;
            }

            if (String(topic) === 'insurance.complaint.sla_breached') {
              if (!complaintId) return;
              await svc.onComplaintSlaBreached({
                topic,
                correlationId: String(correlationId),
                tenantId: String(tenantId),
                complaintId: String(complaintId),
                payload: parsed,
              });
              return;
            }

            if (String(topic) === 'insurance.fraud.case.escalated') {
              if (!fraudCaseId || !claimId) return;
              await svc.onFraudCaseEscalated({
                topic,
                correlationId: String(correlationId),
                tenantId: String(tenantId),
                fraudCaseId: String(fraudCaseId),
                claimId: String(claimId),
                payload: parsed,
              });
              return;
            }

            await svc.onPaymentEvent({
              topic,
              correlationId: String(correlationId),
              tenantId: String(tenantId),
              claimId: String(claimId),
              paymentIntentId: paymentIntentId ? String(paymentIntentId) : undefined,
              payload: parsed,
            });
          },
        });

        if (res.consumed === false && res.reason === 'DUPLICATE') return;
      } catch (e: any) {
        const err = e instanceof Error ? e : new Error(String(e));
        logger.error('Kafka consume handler failed, sending to DLQ', err, {
          topic,
          claimId,
          eventId,
        });
        try {
          await dlq.addToDLQ(String(topic), message as any, err, process.env.KAFKA_GROUP_ID || 'orchestrator-service');
        } catch (dlqErr: any) {
          logger.error('Failed to add message to DLQ', dlqErr instanceof Error ? dlqErr : new Error(String(dlqErr)), { topic, claimId, eventId });
        }
      }
    });
  }

    // OutboxWorker setup for reliable event publishing
  const dataSource = app.get(DataSource);
  const outboxBrokers = process.env.KAFKA_BROKERS?.split(',') || [];
  if (outboxBrokers.length > 0) {
    const { KafkaProducer, OutboxWorker, createLogger } = await import('@insurance/shared');
    const logger = createLogger({ serviceName: 'orchestrator', level: process.env.LOG_LEVEL || 'info' });
    const kafkaProducer = new KafkaProducer({ brokers: outboxBrokers, clientId: 'orchestrator' }, logger);
    await kafkaProducer.connect();
    const outboxWorker = new OutboxWorker({
      dataSource,
      producer: kafkaProducer,
      logger,
      producerName: 'orchestrator',
      pollIntervalMs: parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '5000', 10),
      batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '50', 10),
      maxAttempts: parseInt(process.env.OUTBOX_MAX_ATTEMPTS || '5', 10),
    });
    outboxWorker.start();
    console.log('OutboxWorker started for orchestrator');
  }

await app.listen({ port, host: '0.0.0.0' });
}

bootstrap();
