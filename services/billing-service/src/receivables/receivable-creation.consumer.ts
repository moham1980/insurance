import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { BrokerageReceivable } from './receivable.entity';
import { OutboxEvent, ConsumedEvent } from '@insurance/shared';
import { Kafka } from 'kafkajs';

export interface ReceivableCreationPayload {
  installmentId: string;
  planId: string;
  policyId: string;
  installmentNo: number;
  amount: number;
  currency: string;
  dueDate: string;
  premiumAmount?: number;
  tempReceivableRef?: string;
  tenantId?: string;
  creditorOrganizationId?: string;
  debtorOrganizationId?: string;
}

export interface InstallmentReceivableSyncPayload {
  installmentId: string;
  receivableId: string;
  installmentStatus: string;
  expectedReceivableStatus: string;
  overdue?: boolean;
  gracePeriodEnd?: string;
  amount?: number;
  currency?: string;
}

@Injectable()
export class ReceivableCreationConsumer implements OnModuleInit {
  private readonly logger = new Logger(ReceivableCreationConsumer.name);
  private kafka: Kafka | null = null;
  private consumer: any = null;
  private running = false;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(BrokerageReceivable) private readonly receivableRepo: Repository<BrokerageReceivable>,
  ) {}

  async onModuleInit() {
    const brokers = process.env.KAFKA_BROKERS || process.env.KAFKA_BROKER || 'localhost:9092';
    this.kafka = new Kafka({
      clientId: 'billing-receivable-consumer',
      brokers: brokers.split(','),
    });

    this.consumer = this.kafka.consumer({ groupId: 'billing-receivable-creation' });

    try {
      await this.consumer.connect();
      await this.consumer.subscribe({
        topics: [
          'insurance.collections.receivable.creation.requested',
          'insurance.collections.installment.receivable.sync',
        ],
        fromBeginning: false,
      });

      this.running = true;
      this.logger.log('ReceivableCreationConsumer connected and subscribed');

      this.consumer.run({
        eachMessage: async ({ topic, partition, message }: any) => {
          if (!this.running) return;
          try {
            const value = message.value?.toString();
            if (!value) return;
            const event = JSON.parse(value);
            await this.handleMessage(topic, event);
          } catch (err: any) {
            this.logger.error(`Failed to process message on topic ${topic}: ${err?.message}`, err?.stack);
          }
        },
      });
    } catch (err: any) {
      this.logger.warn(`Kafka not available, receivable consumer will retry: ${err?.message}`);
      setTimeout(() => this.onModuleInit(), 5000);
    }
  }

  async onModuleDestroy() {
    this.running = false;
    try {
      await this.consumer?.disconnect();
    } catch {}
  }

  private async handleMessage(topic: string, event: any): Promise<void> {
    const payload = event?.payload || event;
    const correlationId = event?.correlationId || 'unknown';
    const tenantId = event?.tenantId || null;

    if (topic === 'insurance.collections.receivable.creation.requested') {
      await this.handleReceivableCreation(payload as ReceivableCreationPayload, correlationId, tenantId);
    } else if (topic === 'insurance.collections.installment.receivable.sync') {
      await this.handleReceivableSync(payload as InstallmentReceivableSyncPayload, correlationId);
    }
  }

  private async handleReceivableCreation(payload: ReceivableCreationPayload, correlationId: string, tenantId: string | null): Promise<void> {
    const { installmentId, planId, policyId, amount, currency, dueDate } = payload;

    // Idempotency: check if receivable already exists for this installment
    const existing = await this.receivableRepo.findOne({
      where: { sourceType: 'INSTALLMENT', sourceId: installmentId },
    });
    if (existing) {
      this.logger.log(`Receivable already exists for installment ${installmentId}, skipping`);
      return;
    }

    const receivable = this.receivableRepo.create({
      receivableId: uuidv4(),
      tenantId: tenantId || payload.tenantId || '00000000-0000-0000-0000-000000000000',
      creditorOrganizationId: payload.creditorOrganizationId || '00000000-0000-0000-0000-000000000000',
      debtorOrganizationId: payload.debtorOrganizationId || '00000000-0000-0000-0000-000000000000',
      relatedPolicyId: policyId,
      type: 'SERVICE_FEE',
      amount,
      currency,
      dueDate: new Date(dueDate),
      status: 'open',
      sourceType: 'INSTALLMENT',
      sourceId: installmentId,
      journalEntryId: null,
    });

    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(BrokerageReceivable);
      const outbox = new OutboxPublisher(manager);

      await repo.save(receivable);

      await outbox.publish({
        topic: 'insurance.billing.receivable.created',
        eventType: 'ReceivableCreated',
        eventVersion: 1,
        correlationId,
        subject: { policyId, receivableId: receivable.receivableId },
        payload: {
          receivableId: receivable.receivableId,
          installmentId,
          planId,
          policyId,
          amount,
          currency,
          dueDate,
          status: 'open',
        },
      });
    });

    this.logger.log(`Created receivable ${receivable.receivableId} for installment ${installmentId}`);
  }

  private async handleReceivableSync(payload: InstallmentReceivableSyncPayload, correlationId: string): Promise<void> {
    const { receivableId, expectedReceivableStatus, installmentId } = payload;

    const receivable = await this.receivableRepo.findOne({ where: { receivableId } });
    if (!receivable) {
      this.logger.warn(`Receivable ${receivableId} not found for sync from installment ${installmentId}`);
      return;
    }

    if (receivable.status === expectedReceivableStatus) {
      this.logger.log(`Receivable ${receivableId} already in status ${expectedReceivableStatus}, skipping sync`);
      return;
    }

    const validStatuses = ['open', 'paid', 'written_off', 'disputed'];
    if (!validStatuses.includes(expectedReceivableStatus)) {
      this.logger.warn(`Invalid receivable status ${expectedReceivableStatus} for receivable ${receivableId}`);
      return;
    }

    receivable.status = expectedReceivableStatus as any;
    await this.receivableRepo.save(receivable);

    this.logger.log(
      `Synced receivable ${receivableId} to status ${expectedReceivableStatus} from installment ${installmentId}`,
    );
  }
}

// Minimal OutboxPublisher for local use (to avoid circular import issues)
class OutboxPublisher {
  constructor(private manager: any) {}

  async publish(event: any): Promise<void> {
    const repo = this.manager.getRepository(OutboxEvent);
    await repo.save({
      eventId: uuidv4(),
      topic: event.topic,
      eventType: event.eventType,
      eventVersion: event.eventVersion || 1,
      correlationId: event.correlationId,
      tenantId: event.tenantId || null,
      subject: event.subject || {},
      payload: event.payload || {},
      createdAt: new Date(),
      publishedAt: null,
    });
  }
}
