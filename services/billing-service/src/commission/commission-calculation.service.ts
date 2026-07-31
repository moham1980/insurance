import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CommissionSplit, CommissionSplitRole } from './commission-split.entity';
import { resolveCommissionSchedule, CommissionSchedule } from './commission-tier-resolver';
import { OutboxPublisher } from '@insurance/shared';

@Injectable()
export class CommissionCalculationService {
  constructor(
    @InjectRepository(CommissionSplit) private readonly splitRepo: Repository<CommissionSplit>,
    private readonly dataSource: DataSource,
  ) {}

  async calculateAndAccrue(params: {
    tenantId: string;
    brokerOrganizationId: string;
    sourceType: string;
    sourceId: string;
    premiumGross: string;
    premiumNet?: string;
    currency: string;
    distributionAgreementId?: string;
    distributionAgreementSnapshot?: Record<string, any>;
    commissionScheduleSnapshot?: Record<string, any>;
    effectiveFrom: Date;
    correlationId: string;
  }): Promise<CommissionSplit[]> {
    const schedule = resolveCommissionSchedule({
      distributionAgreementId: params.distributionAgreementId,
      distributionAgreementSnapshot: params.distributionAgreementSnapshot,
      currency: params.currency,
    });

    const netBase = typeof params.premiumNet === 'string' ? BigInt(params.premiumNet) : BigInt(params.premiumGross);
    const grossBase = BigInt(params.premiumGross);

    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const splits: CommissionSplit[] = [];

      for (const tier of (schedule.tiers as any[])) {
        const baseAmount = tier.base === 'premium_net' ? netBase : grossBase;
        const amount = (baseAmount * BigInt(Number(tier.shareBps))) / BigInt(10000);

        const split = new CommissionSplit();
        split.splitId = uuidv4();
        split.tenantId = params.tenantId;
        split.journalEntryId = null;
        split.partyId = tier.partyId || null;
        split.organizationId = tier.organizationId || params.brokerOrganizationId;
        split.role = (tier.role as CommissionSplitRole) || 'BROKER';
        split.base = tier.base as any;
        split.shareBps = Number(tier.shareBps);
        split.amount = amount.toString();
        split.currency = params.currency;
        split.effectiveFrom = params.effectiveFrom;
        split.status = 'accrued';
        split.commissionScheduleSnapshot = params.commissionScheduleSnapshot || { schedule, sourceSnapshot: params.distributionAgreementSnapshot };
        split.sourceType = params.sourceType;
        split.sourceId = params.sourceId;

        await manager.save(CommissionSplit, split);
        splits.push(split);

        await outbox.publish({
          topic: 'insurance.billing.commission.accrued',
          eventType: 'CommissionSplitAccrued',
          eventVersion: 1,
          correlationId: params.correlationId,
          tenantId: params.tenantId,
          subject: { splitId: split.splitId, sourceId: params.sourceId },
          payload: {
            splitId: split.splitId,
            sourceType: params.sourceType,
            sourceId: params.sourceId,
            organizationId: split.organizationId,
            role: split.role,
            amount: split.amount,
            currency: split.currency,
          },
        });
      }

      return splits;
    });
  }

  async linkSplitsToJournalEntry(journalEntryId: string, splitIds: string[]): Promise<void> {
    if (splitIds.length === 0) return;
    await this.splitRepo.update({ splitId: splitIds } as any, { journalEntryId });
  }

  async getSplitsForSource(tenantId: string, sourceType: string, sourceId: string): Promise<CommissionSplit[]> {
    return this.splitRepo.find({
      where: { tenantId, sourceType, sourceId },
      order: { createdAt: 'ASC' as any },
    });
  }

  async adjustCommissionSplit(params: {
    tenantId: string;
    splitId: string;
    newAmount: string;
    reason: string;
    adjustedByPartyId: string;
    correlationId: string;
  }): Promise<CommissionSplit> {
    const split = await this.splitRepo.findOne({
      where: { tenantId: params.tenantId, splitId: params.splitId },
    });
    if (!split) throw new Error('Commission split not found');
    if (split.status === 'clawback' || split.status === 'voided') {
      throw new Error(`Cannot adjust split in status ${split.status}`);
    }

    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const splitRepo = manager.getRepository(CommissionSplit);

      const oldAmount = split.amount;
      split.amount = params.newAmount;
      split.commissionScheduleSnapshot = {
        ...(split.commissionScheduleSnapshot || {}),
        adjustment: {
          oldAmount,
          newAmount: params.newAmount,
          reason: params.reason,
          adjustedByPartyId: params.adjustedByPartyId,
          adjustedAt: new Date().toISOString(),
        },
      };
      const saved = await splitRepo.save(split);

      await outbox.publish({
        topic: 'insurance.billing.commission.adjusted',
        eventType: 'CommissionSplitAdjusted',
        eventVersion: 1,
        correlationId: params.correlationId,
        tenantId: params.tenantId,
        subject: { splitId: split.splitId, sourceId: split.sourceId },
        payload: {
          splitId: split.splitId,
          tenantId: params.tenantId,
          sourceType: split.sourceType,
          sourceId: split.sourceId,
          organizationId: split.organizationId,
          role: split.role,
          oldAmount,
          newAmount: params.newAmount,
          currency: split.currency,
          reason: params.reason,
          adjustedByPartyId: params.adjustedByPartyId,
        },
      });

      return saved;
    });
  }
}
