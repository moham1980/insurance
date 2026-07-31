import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface EventEnvelope<T = any> {
  eventId: string;
  eventType: string;
  eventVersion?: number;
  correlationId?: string;
  occurredAt?: string;
  subject?: Record<string, any>;
  payload?: T;
}

@Injectable()
export class PolicyNotificationConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PolicyNotificationConsumer.name);
  private consumer?: Consumer;

  constructor(private readonly httpService: HttpService) {}

  async onModuleInit(): Promise<void> {
    const kafkaBrokers = process.env.KAFKA_BROKERS?.split(',') || [];
    if (kafkaBrokers.length === 0) {
      this.logger.warn('KAFKA_BROKERS not set, policy notification consumer disabled');
      return;
    }

    const kafka = new Kafka({
      clientId: 'customer-portal-policy-consumer',
      brokers: kafkaBrokers,
    });

    this.consumer = kafka.consumer({ groupId: 'customer-portal-policy-v1' });
    await this.consumer.connect();

    const topics = [
      'insurance.policy.customer_notification',
      'insurance.policy.broker_notification',
    ];

    for (const topic of topics) {
      await this.consumer.subscribe({ topic, fromBeginning: true });
    }

    this.logger.log('Policy notification consumer started');

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        const { topic, message } = payload;
        const rawValue = message.value?.toString('utf-8');
        if (!rawValue) return;

        try {
          const envelope = JSON.parse(rawValue) as EventEnvelope;
          await this.handleNotification(envelope, topic);
        } catch (e: any) {
          this.logger.error(`Failed to process ${topic} message: ${e.message}`, e.stack);
        }
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer?.disconnect();
  }

  private async handleNotification(envelope: EventEnvelope, topic: string): Promise<void> {
    const payload = envelope.payload || {};
    const notificationType = payload.notificationType || envelope.eventType;
    const partyId = payload.partyId || payload.customerPartyId;
    const policyId = payload.policyId;
    const policyNumber = payload.policyNumber;
    const message = payload.message || `Policy ${policyNumber || policyId} update: ${notificationType}`;

    this.logger.log(`Received ${topic}: type=${notificationType}, policyId=${policyId}, partyId=${partyId}`);

    // Forward to notification service for SMS/push notification to customer
    const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:18037';
    try {
      await firstValueFrom(
        this.httpService.post(`${notificationServiceUrl}/notifications/policy`, {
          partyId,
          policyId,
          policyNumber,
          notificationType,
          message,
          correlationId: envelope.correlationId,
          tenantId: payload.tenantId,
        }),
      );
    } catch (e: any) {
      this.logger.error(`Failed to forward notification to notification-service: ${e.message}`);
    }
  }
}
