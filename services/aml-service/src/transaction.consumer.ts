import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConsumedEvent, DeadLetterQueueService } from '@insurance/shared';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Consumer, ConsumerSubscribeTopics, Kafka, EachMessagePayload } from 'kafkajs';
import { AmlService } from './aml.service';

@Injectable()
export class TransactionConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TransactionConsumer.name);
  private consumer: Consumer | null = null;
  private kafka: Kafka | null = null;
  private readonly consumerName = 'aml-transaction-consumer';
  private dlq?: DeadLetterQueueService;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private readonly maxRetries = 5;
  private retryCount = 0;

  constructor(
    private readonly amlService: AmlService,
    @InjectRepository(ConsumedEvent)
    private readonly consumedEventRepo: Repository<ConsumedEvent>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    this.dlq = new DeadLetterQueueService(
      { dataSource: this.dataSource },
      this.logger as any,
    );

    const brokers = process.env.KAFKA_BROKERS?.split(',') || [];
    if (brokers.length === 0) {
      this.logger.warn('KAFKA_BROKERS not set — AML transaction consumer will not start');
      return;
    }

    try {
      await this.startConsumer();
    } catch (error) {
      this.logger.error('Failed to start AML transaction consumer on init, will retry in background', error);
      this.scheduleRetry();
    }
  }

  private scheduleRetry(): void {
    const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000);
    this.retryTimer = setTimeout(async () => {
      this.retryCount++;
      if (this.retryCount > this.maxRetries) {
        this.logger.error(`Kafka consumer max retries (${this.maxRetries}) exhausted, giving up`);
        return;
      }
      try {
        await this.startConsumer();
        this.retryCount = 0;
      } catch (err) {
        this.logger.error(`Kafka consumer retry ${this.retryCount} failed`, err as Error);
        this.scheduleRetry();
      }
    }, delay);
  }

  private async startConsumer(): Promise<void> {
    const brokers = process.env.KAFKA_BROKERS!.split(',').map((x) => x.trim()).filter(Boolean);

    this.kafka = new Kafka({
      clientId: 'aml-service',
      brokers,
      sasl: process.env.KAFKA_SASL_MECHANISM
        ? {
            mechanism: (process.env.KAFKA_SASL_MECHANISM as any),
            username: process.env.KAFKA_SASL_USERNAME || '',
            password: process.env.KAFKA_SASL_PASSWORD || '',
          }
        : undefined,
      ssl: process.env.KAFKA_SSL === 'true',
    });

    this.consumer = this.kafka.consumer({ groupId: this.consumerName });

    const topics: ConsumerSubscribeTopics = {
      topics: [
        'insurance.payment.completed',
        'insurance.policy.issued',
        'insurance.claim.registered',
        'insurance.claim.paid',
        'insurance.collection.received',
      ],
      fromBeginning: false,
    };

    await this.consumer.subscribe(topics);
    this.logger.log('Subscribed to transaction topics for AML evaluation');

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.handleTransactionMessage(payload);
      },
    });

    this.logger.log('AML transaction consumer started');
  }

  private async handleTransactionMessage(payload: EachMessagePayload) {
    const { topic, partition, message } = payload;
    const key = message.key?.toString() || '';
    const value = message.value?.toString() || '';

    let event: any;
    try {
      event = JSON.parse(value);
    } catch (parseErr) {
      this.logger.error(`Failed to parse message value for topic ${topic}`, parseErr);
      return;
    }

    const eventId = event.eventId || event.id || `${topic}-${key}-${partition}-${message.offset}`;
    const correlationId = event.correlationId || key;

    // Idempotency check
    const existing = await this.consumedEventRepo.findOne({
      where: { eventId, consumerName: this.consumerName },
    });
    if (existing) {
      this.logger.debug(`Duplicate message skipped: eventId=${eventId}`);
      return;
    }

    try {

      this.logger.debug(`Processing AML evaluation for topic: ${topic}, key: ${key}`);
      const eventType = event.eventType || event.type;

      let transactionParams: any = null;

      // Map different event types to transaction evaluation parameters
      switch (topic) {
        case 'insurance.payment.completed':
          transactionParams = {
            partyId: event.subject?.partyId || event.payload?.partyId,
            partyName: event.subject?.partyName || event.payload?.partyName,
            transactionType: 'payment',
            amount: event.payload?.amount || event.payload?.paidAmount,
            currency: event.payload?.currency || 'IRR',
            referenceType: 'payment',
            referenceId: event.subject?.paymentId || event.payload?.paymentId,
            metadata: {
              paymentMethod: event.payload?.paymentMethod,
              bankAccount: event.payload?.bankAccount,
              ...event.payload,
            },
          };
          break;

        case 'insurance.policy.issued':
          transactionParams = {
            partyId: event.subject?.partyId || event.payload?.policyHolderId,
            partyName: event.subject?.partyName || event.payload?.policyHolderName,
            transactionType: 'policy_issuance',
            amount: event.payload?.sumInsured || event.payload?.premium,
            currency: event.payload?.currency || 'IRR',
            referenceType: 'policy',
            referenceId: event.subject?.policyId || event.payload?.policyId,
            metadata: {
              productCode: event.payload?.productCode,
              coverageTypes: event.payload?.coverageTypes,
              ...event.payload,
            },
          };
          break;

        case 'insurance.claim.registered':
          transactionParams = {
            partyId: event.subject?.partyId || event.payload?.claimantPartyId,
            partyName: event.subject?.partyName || event.payload?.claimantName,
            transactionType: 'claim_registration',
            amount: event.payload?.estimatedAmount || 0,
            currency: event.payload?.currency || 'IRR',
            referenceType: 'claim',
            referenceId: event.subject?.claimId || event.payload?.claimId,
            metadata: {
              lossType: event.payload?.lossType,
              lossDate: event.payload?.lossDate,
              ...event.payload,
            },
          };
          break;

        case 'insurance.claim.paid':
          transactionParams = {
            partyId: event.subject?.partyId || event.payload?.claimantPartyId,
            partyName: event.subject?.partyName || event.payload?.claimantName,
            transactionType: 'claim_payment',
            amount: event.payload?.paidAmount || event.payload?.amount,
            currency: event.payload?.currency || 'IRR',
            referenceType: 'claim',
            referenceId: event.subject?.claimId || event.payload?.claimId,
            metadata: {
              paymentMethod: event.payload?.paymentMethod,
              ...event.payload,
            },
          };
          break;

        case 'insurance.collection.received':
          transactionParams = {
            partyId: event.subject?.partyId || event.payload?.payerId,
            partyName: event.subject?.partyName || event.payload?.payerName,
            transactionType: 'collection',
            amount: event.payload?.amount || event.payload?.collectedAmount,
            currency: event.payload?.currency || 'IRR',
            referenceType: 'collection',
            referenceId: event.subject?.collectionId || event.payload?.collectionId,
            metadata: {
              collectionMethod: event.payload?.collectionMethod,
              ...event.payload,
            },
          };
          break;

        default:
          this.logger.warn(`Unknown topic for AML evaluation: ${topic}`);
          return;
      }

      if (!transactionParams.partyId || !transactionParams.amount) {
        this.logger.warn(`Missing required fields for AML evaluation: partyId=${transactionParams.partyId}, amount=${transactionParams.amount}`);
        return;
      }

      // Evaluate transaction against AML rules
      const result = await this.amlService.evaluateTransaction({
        ...transactionParams,
        correlationId,
      });

      this.logger.log(
        `AML evaluation completed: correlationId=${correlationId}, alerts=${result.alerts.length}, ` +
        `riskLevel=${result.riskLevel}, riskScore=${result.riskScore}`
      );

      // If high or critical risk, publish alert event via Outbox
      if (result.riskLevel === 'high' || result.riskLevel === 'critical') {
        this.logger.warn(`High/Critical AML risk detected: correlationId=${correlationId}, riskLevel=${result.riskLevel}`);
        const { OutboxPublisher } = await import('@insurance/shared');
        await this.dataSource.transaction(async (manager) => {
          const outbox = new OutboxPublisher(manager);
          for (const alert of result.alerts) {
            await outbox.publish({
              topic: 'insurance.aml.alert.created',
              eventType: 'AmlAlertCreated',
              eventVersion: 1,
              correlationId,
              subject: {
                alertId: alert.alertId,
                ruleId: alert.ruleId,
              },
              payload: {
                alertId: alert.alertId,
                riskLevel: result.riskLevel,
                riskScore: result.riskScore,
                ruleId: alert.ruleId,
                severity: alert.severity,
                title: alert.title,
                details: alert.details,
              },
            });
          }
        });
      }

      // Mark as consumed
      await this.consumedEventRepo.save({
        eventId,
        consumerName: this.consumerName,
        topic,
        processedAt: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error processing AML evaluation message`, error);
      // Send to dead letter queue
      if (this.dlq) {
        await this.dlq.addToDLQ(topic, { key, value, partition, offset: message.offset } as any, error instanceof Error ? error : new Error(String(error)), this.consumerName, partition).catch((dlqErr: Error) => {
          this.logger.error('Failed to send message to DLQ', dlqErr);
        });
      }
    }
  }

  async onModuleDestroy() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.consumer) {
      await this.consumer.disconnect();
      this.logger.log('AML transaction consumer stopped');
    }
  }
}
