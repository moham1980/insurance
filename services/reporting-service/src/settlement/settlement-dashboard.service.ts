import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { P6EventProducer } from '../events/p6-event-producer';

export interface SettlementSummaryParams {
  tenantId?: string;
  brokerOrganizationId?: string;
  periodId?: string;
  startDate?: string;
  endDate?: string;
}

export interface SettlementSummary {
  brokerOrganizationId: string | null;
  periodId: string | null;
  policyCount: number;
  premiumAmount: number;
  commissionAmount: number;
  claimPaidAmount: number;
  netSettlement: number;
  currency: string;
}

@Injectable()
export class SettlementDashboardService {
  private readonly logger = new Logger(SettlementDashboardService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly eventProducer: P6EventProducer,
  ) {}

  async getSummary(params: SettlementSummaryParams): Promise<SettlementSummary> {
    const { tenantId, brokerOrganizationId, startDate, endDate, periodId } = params;

    const start = startDate || (periodId ? `${periodId}-01` : this.defaultStart());
    const end = endDate || (periodId ? `${periodId}-31` : new Date().toISOString());

    let policyQb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'policyCount')
      .addSelect('COALESCE(SUM(premium_amount), 0)', 'premiumAmount')
      .from('rm_policies', 'p')
      .where('p.issued_at >= :startDate', { startDate: start })
      .andWhere('p.issued_at <= :endDate', { endDate: end });

    if (tenantId) policyQb = policyQb.andWhere('p.tenant_id = :tenantId', { tenantId });
    if (brokerOrganizationId) policyQb = policyQb.andWhere('p.broker_organization_id = :brokerOrg', { brokerOrg: brokerOrganizationId });

    const policyStats = await policyQb.getRawOne();

    let claimQb = this.dataSource
      .createQueryBuilder()
      .select('COALESCE(SUM(cp.approved_amount), 0)', 'claimPaidAmount')
      .from('rm_claim_payments', 'cp')
      .innerJoin('rm_policies', 'p', 'p.policy_id = cp.policy_id')
      .where('cp.claim_paid_at >= :startDate', { startDate: start })
      .andWhere('cp.claim_paid_at <= :endDate', { endDate: end });

    if (tenantId) claimQb = claimQb.andWhere('cp.tenant_id = :tenantId', { tenantId });
    if (brokerOrganizationId) claimQb = claimQb.andWhere('p.broker_organization_id = :brokerOrg', { brokerOrg: brokerOrganizationId });

    const claimStats = await claimQb.getRawOne();

    const premium = Number(policyStats?.premiumAmount || 0);
    const claimPaid = Number(claimStats?.claimPaidAmount || 0);

    const rateQb = this.dataSource
      .createQueryBuilder()
      .select('commission_rate_bps', 'bps')
      .from('rm_sales_network', 's')
      .where('s.organization_id = :brokerOrg', { brokerOrg: brokerOrganizationId });
    const rateRow = brokerOrganizationId ? await rateQb.getRawOne() : null;
    const bps = rateRow?.bps ? Number(rateRow.bps) : 0;
    const commission = (premium * bps) / 10000;

    const result: SettlementSummary = {
      brokerOrganizationId: brokerOrganizationId || null,
      periodId: periodId || null,
      policyCount: Number(policyStats?.policyCount || 0),
      premiumAmount: premium,
      commissionAmount: commission,
      claimPaidAmount: claimPaid,
      netSettlement: premium - commission - claimPaid,
      currency: 'IRR',
    };

    try {
      await this.eventProducer.publishSettlementReconciled(
        brokerOrganizationId || 'unknown',
        result.netSettlement,
        tenantId,
      );
    } catch (err: any) {
      this.logger.error('Failed to publish SettlementReconciled event', { error: err?.message });
    }

    return result;
  }

  async getBrokerSettlements(tenantId?: string, startDate?: string, endDate?: string): Promise<SettlementSummary[]> {
    const start = startDate || this.defaultStart();
    const end = endDate || new Date().toISOString();

    const raw = await this.dataSource
      .createQueryBuilder()
      .select('p.broker_organization_id', 'brokerOrganizationId')
      .addSelect('COUNT(*)', 'policyCount')
      .addSelect('COALESCE(SUM(p.premium_amount), 0)', 'premiumAmount')
      .from('rm_policies', 'p')
      .where('p.issued_at >= :startDate', { startDate: start })
      .andWhere('p.issued_at <= :endDate', { endDate: end })
      .andWhere('p.broker_organization_id IS NOT NULL')
      .groupBy('p.broker_organization_id')
      .setParameter('tenantId', tenantId)
      .getRawMany();

    const summaries: SettlementSummary[] = [];
    for (const row of raw) {
      const brokerId = row.brokerOrganizationId;
      const rateRow = await this.dataSource
        .createQueryBuilder()
        .select('commission_rate_bps', 'bps')
        .from('rm_sales_network', 's')
        .where('s.organization_id = :brokerOrg', { brokerOrg: brokerId })
        .getRawOne();
      const bps = rateRow?.bps ? Number(rateRow.bps) : 0;
      const premium = Number(row.premiumAmount || 0);
      const commission = (premium * bps) / 10000;

      let claimQb = this.dataSource
        .createQueryBuilder()
        .select('COALESCE(SUM(cp.approved_amount), 0)', 'claimPaid')
        .from('rm_claim_payments', 'cp')
        .innerJoin('rm_policies', 'p2', 'p2.policy_id = cp.policy_id')
        .where('p2.broker_organization_id = :brokerOrg', { brokerOrg: brokerId })
        .andWhere('cp.claim_paid_at >= :startDate', { startDate: start })
        .andWhere('cp.claim_paid_at <= :endDate', { endDate: end });
      if (tenantId) claimQb = claimQb.andWhere('cp.tenant_id = :tenantId', { tenantId });
      const claimStats = await claimQb.getRawOne();
      const claimPaid = Number(claimStats?.claimPaid || 0);

      summaries.push({
        brokerOrganizationId: brokerId,
        periodId: null,
        policyCount: Number(row.policyCount || 0),
        premiumAmount: premium,
        commissionAmount: commission,
        claimPaidAmount: claimPaid,
        netSettlement: premium - commission - claimPaid,
        currency: 'IRR',
      });
    }

    return summaries;
  }

  private defaultStart(): string {
    const now = new Date();
    return new Date(now.getFullYear(), 0, 1).toISOString();
  }
}
