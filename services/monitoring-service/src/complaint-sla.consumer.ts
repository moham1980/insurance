import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DeadLetterQueueService, KafkaConsumer, consumeOnce, createLogger } from '@insurance/shared';
import { MonitoringService } from './monitoring.service';

@Injectable()
export class ComplaintSlaConsumer implements OnModuleInit, OnModuleDestroy {
  private consumer?: KafkaConsumer;
  private dlq?: DeadLetterQueueService;

  private readonly logger = createLogger({
    serviceName: 'monitoring-service',
    level: process.env.LOG_LEVEL || 'info',
  }).child({ component: 'ComplaintSlaConsumer' });

  constructor(private readonly dataSource: DataSource, private readonly monitoringService: MonitoringService) {}

  async onModuleInit(): Promise<void> {
    const kafkaBrokers = process.env.KAFKA_BROKERS;
    if (typeof kafkaBrokers !== 'string' || kafkaBrokers.trim().length === 0) {
      this.logger.info('Kafka disabled; ComplaintSlaConsumer not started');
      return;
    }

    const brokers = kafkaBrokers
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

    this.consumer = new KafkaConsumer(
      {
        brokers,
        clientId: process.env.KAFKA_CLIENT_ID || 'monitoring-service',
      },
      {
        groupId: process.env.KAFKA_GROUP_ID || 'monitoring-service',
        topics: [],
      },
      this.logger
    );

    await this.consumer.connect();
    await this.consumer.subscribe(['insurance.complaint.sla_breached'], false);

    const dlqRetryIntervalMs = parseInt(process.env.DLQ_RETRY_INTERVAL_MS || '60000', 10);
    this.dlq = new DeadLetterQueueService(
      {
        dataSource: this.dataSource,
        kafkaConfig: {
          brokers,
          clientId: process.env.KAFKA_CLIENT_ID || 'monitoring-dlq',
        },
        maxRetries: parseInt(process.env.DLQ_MAX_RETRIES || '3', 10),
      },
      this.logger
    );

    await this.dlq.initialize();
    await this.dlq.startRetryProcessor(Number.isFinite(dlqRetryIntervalMs) ? dlqRetryIntervalMs : 60000);

    const consumerName = process.env.CONSUMER_NAME || 'monitoring-service';

    await this.consumer.run(async ({ topic, message }) => {
      const raw = message.value?.toString() || '{}';
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = { raw };
      }

      const eventId = parsed?.eventId;
      const correlationId =
        parsed?.correlationId || (message.headers?.['x-correlation-id'] as any)?.toString?.() || (message.headers?.['X-Correlation-Id'] as any)?.toString?.() || 'n/a';

      if (typeof eventId !== 'string' || eventId.length < 10) return;

      try {
        const res = await consumeOnce({
          dataSource: this.dataSource,
          consumerName,
          topic: String(topic),
          eventId: String(eventId),
          handler: async () => {
            if (String(topic) !== 'insurance.complaint.sla_breached') return;
            await this.monitoringService.onComplaintSlaBreached({
              correlationId: String(correlationId),
              envelope: parsed,
            });
          },
        });
        if (res.consumed === false && res.reason === 'DUPLICATE') return;
      } catch (e: any) {
        const err = e instanceof Error ? e : new Error(String(e));
        this.logger.error('Complaint SLA breach consume failed, sending to DLQ', err, { topic, eventId });
        try {
          await this.dlq?.addToDLQ(String(topic), message as any, err, process.env.KAFKA_GROUP_ID || 'monitoring-service');
        } catch (dlqErr: any) {
          this.logger.error('Failed to add to DLQ', dlqErr instanceof Error ? dlqErr : new Error(String(dlqErr)), { topic, eventId });
        }
      }
    });

    this.logger.info('ComplaintSlaConsumer started');
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer?.disconnect();
  }
}
