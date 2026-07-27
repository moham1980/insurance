// @ts-nocheck
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConsumedEvent } from '@insurance/shared';
import { ReinsuranceService } from './reinsurance.service';
import { auditLogger } from './audit.logger';

interface PolicyIssuedEvent {
  eventType: 'PolicyIssued';
  policyId: string;
  policyNumber: string;
  productId: string;
  lineOfBusiness: string;
  premiumAmount: number;
  sumInsured: number;
  effectiveFrom: string;
  effectiveTo: string;
  currency: string;
  holderPartyId: string;
  issuedAt: string;
}

@Injectable()
export class PolicyConsumer implements OnModuleInit, OnModuleDestroy {
  private interval: NodeJS.Timeout | null = null;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly reinsuranceService: ReinsuranceService
  ) {}

  async onModuleInit() {
    this.interval = setInterval(() => this.consumeEvents(), 5000);
    auditLogger.info('reinsurance.policy.consumer.started', {});
  }

  async onModuleDestroy() {
    if (this.interval) clearInterval(this.interval);
    auditLogger.info('reinsurance.policy.consumer.stopped', {});
  }

  private async consumeEvents() {
    try {
      const eventRepo = this.dataSource.getRepository(ConsumedEvent);
      const pendingEvents = await eventRepo.find({
        where: { eventType: 'PolicyIssued', processed: false },
        order: { occurredAt: 'ASC' },
        take: 10,
      });

      for (const event of pendingEvents) {
        try {
          const payload: PolicyIssuedEvent = event.payload as any;
          await this.handlePolicyIssued(payload);
          event.processed = true;
          event.processedAt = new Date();
          await eventRepo.save(event);
          auditLogger.info('reinsurance.policy.issued.processed', {
            eventId: event.eventId,
            policyId: payload.policyId,
          });
        } catch (err: any) {
          auditLogger.error('reinsurance.policy.issued.error', {
            eventId: event.eventId,
            error: err.message,
          });
          event.error = err.message;
          event.retryCount = (event.retryCount || 0) + 1;
          if (event.retryCount >= 5) {
            event.processed = true;
            event.processedAt = new Date();
          }
          await eventRepo.save(event);
        }
      }
    } catch (err: any) {
      auditLogger.error('reinsurance.policy.consumer.error', { error: err.message });
    }
  }

  private async handlePolicyIssued(event: PolicyIssuedEvent) {
    const { policyId, policyNumber, lineOfBusiness, premiumAmount, sumInsured, effectiveFrom, effectiveTo, currency } = event;

    const activeTreaties = await this.reinsuranceService.listTreaties({
      status: 'active',
      lineOfBusiness,
      limit: 100,
      offset: 0,
    });

    for (const treaty of activeTreaties.rows) {
      const retentionRate = Number(treaty.retentionRate || 0);
      const cessionRate = Number(treaty.cessionRate || 0);
      const cededPremium = premiumAmount * (cessionRate / 100);
      const cededSumInsured = sumInsured * (cessionRate / 100);

      await this.reinsuranceService.createCession({
        treatyId: treaty.treatyId,
        policyId,
        policyNumber,
        cessionType: treaty.type,
        retentionRate,
        cessionRate,
        cededPremium,
        cededSumInsured,
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: new Date(effectiveTo),
        currency,
      });

      auditLogger.info('reinsurance.cession.auto_created', {
        policyId,
        treatyId: treaty.treatyId,
        cededPremium,
        cededSumInsured,
      });
    }
  }
}
