import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { KafkaConsumer, consumeOnce, createLogger } from '@insurance/shared';
import { ReinsuranceService } from './reinsurance.service';

interface PolicyIssuedPayload {
  policyId: string;
  policyNumber: string;
  productId?: string;
  productCode?: string;
  lineOfBusiness?: string;
  premiumAmount: number;
  sumInsured: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  currency?: string;
  holderPartyId?: string;
  tenantId?: string;
  issuedAt?: string;
}

interface EventEnvelope {
  eventId: string;
  eventType: string;
  tenantId?: string;
  payload: PolicyIssuedPayload;
}

@Injectable()
export class PolicyConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PolicyConsumer.name);
  private consumer: KafkaConsumer | null = null;

  constructor(
    private readonly dataSource: DataSource,
    private readonly reinsuranceService: ReinsuranceService
  ) {}

  async onModuleInit() {
    const kafkaBrokers = process.env.KAFKA_BROKERS;
    if (!kafkaBrokers || kafkaBrokers.trim().length === 0) {
      this.logger.warn('KAFKA_BROKERS not configured; PolicyConsumer will not start');
      return;
    }

    const logger = createLogger({ serviceName: 'reinsurance-service', level: process.env.LOG_LEVEL || 'info' });
    const brokers = kafkaBrokers.split(',').map((x) => x.trim()).filter(Boolean);

    this.consumer = new KafkaConsumer(
      {
        brokers,
        clientId: 'reinsurance-policy-consumer',
      },
      {
        groupId: process.env.KAFKA_RE_POLICY_GROUP_ID || 'reinsurance-policy-consumer-group',
        topics: [process.env.KAFKA_RE_POLICY_TOPIC || 'insurance.policy.events'],
        fromBeginning: false,
      },
      logger
    );

    await this.consumer.connect();
    await this.consumer.subscribe([process.env.KAFKA_RE_POLICY_TOPIC || 'insurance.policy.events'], false);

    await this.consumer.run(async (payload) => {
      const { topic, partition, message } = payload;
      const eventId = message.key?.toString() ?? `${topic}-${partition}-${message.offset}`;
      const rawValue = message.value?.toString();

      if (!rawValue) {
        this.logger.warn('Empty message value received', { topic, partition, offset: message.offset });
        return;
      }

      const envelope = JSON.parse(rawValue) as EventEnvelope;
      if (envelope.eventType !== 'PolicyIssued') {
        return;
      }

      const tenantId = (envelope.tenantId || envelope.payload?.tenantId || '').trim();
      if (!tenantId) {
        this.logger.warn('PolicyIssued event missing tenantId', { eventId: envelope.eventId || eventId });
        return;
      }

      await consumeOnce({
        dataSource: this.dataSource,
        consumerName: 'reinsurance-policy-consumer',
        tenantId,
        topic,
        eventId: envelope.eventId || eventId,
        handler: async () => {
          await this.handlePolicyIssued(envelope.payload, tenantId);
        },
      });
    });

    this.logger.log('PolicyConsumer Kafka consumer started');
  }

  async onModuleDestroy() {
    if (this.consumer) {
      await this.consumer.disconnect();
      this.logger.log('PolicyConsumer Kafka consumer stopped');
    }
  }

  private async handlePolicyIssued(payload: PolicyIssuedPayload, eventTenantId?: string) {
    const tenantId = (payload.tenantId || eventTenantId || '').trim();
    const productCode = (payload.productCode || payload.productId || payload.lineOfBusiness || '').trim();

    if (!tenantId) {
      throw new Error('PolicyIssued event missing tenantId');
    }

    const { policyId, policyNumber, premiumAmount, sumInsured, effectiveFrom, effectiveTo, currency } = payload;

    const activeTreaties = await this.reinsuranceService.listTreaties({
      tenantId,
      status: 'active',
      productCode,
      limit: 100,
      offset: 0,
    });

    if (activeTreaties.rows.length === 0) {
      this.logger.log(`No applicable treaty found for tenant ${tenantId} and product ${productCode}`);
      return;
    }

    for (const treaty of activeTreaties.rows) {
      await this.reinsuranceService.createCession({
        tenantId,
        treatyId: treaty.treatyId,
        policyId,
        policyNumber,
        sumInsured,
        premium: premiumAmount,
        cessionType: treaty.treatyType,
        retentionRate: treaty.retentionRate,
        cessionRate: treaty.cessionRate,
        cededPremium: premiumAmount * (this.n(treaty.cessionRate) / 100),
        cededSumInsured: sumInsured * (this.n(treaty.cessionRate) / 100),
        effectiveFrom,
        effectiveTo,
        currency: currency || 'IRR',
      });

      this.logger.log('reinsurance.cession.auto_created', {
        tenantId,
        policyId,
        treatyId: treaty.treatyId,
      });
    }
  }

  private n(v: any): number {
    const x = typeof v === 'number' ? v : v !== null && v !== undefined ? parseFloat(String(v)) : NaN;
    return Number.isFinite(x) ? x : 0;
  }
}
