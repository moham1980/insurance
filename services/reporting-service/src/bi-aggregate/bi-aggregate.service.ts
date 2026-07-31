import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { P6EventProducer } from '../events/p6-event-producer';

export interface BiDashboardParams {
  tenantId?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class BiAggregateService {
  private readonly logger = new Logger(BiAggregateService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly eventProducer: P6EventProducer,
  ) {}

  async getExecutiveDashboard(tenantId?: string): Promise<Record<string, any>> {
    const policyMetrics = await this.getPolicyMetrics(tenantId);
    const claimMetrics = await this.getClaimMetrics(tenantId);
    const fraudMetrics = await this.getFraudMetrics(tenantId);
    const kpiSummary = await this.getKpiSummary(tenantId);

    const result = {
      policyMetrics,
      claimMetrics,
      fraudMetrics,
      underwritingMetrics: await this.getUnderwritingMetrics(tenantId),
      salesNetworkMetrics: await this.getSalesNetworkMetrics(tenantId),
      commissionMetrics: await this.getCommissionMetrics(tenantId),
      settlementOutstanding: await this.getSettlementOutstanding(tenantId),
      complaintMetrics: await this.getComplaintMetrics(tenantId),
      kpiSummary,
    };

    try {
      await this.eventProducer.publishBIAggregateRefreshed(tenantId);
    } catch (err: any) {
      this.logger.error('Failed to publish BIAggregateRefreshed event', { error: err?.message });
    }

    return result;
  }

  async getCockpit(params: BiDashboardParams): Promise<Record<string, any>> {
    const start = params.startDate || this.defaultStartOfYear();
    const end = params.endDate || new Date().toISOString();

    const revenue = await this.aggregateRevenue(params.tenantId, start, end);
    const claims = await this.aggregateClaims(params.tenantId, start, end);
    const expenses = await this.aggregateExpenses(params.tenantId, start, end);
    const profit = revenue - claims - expenses;

    return {
      revenue,
      claims,
      expenses,
      profit,
      combinedRatio: revenue > 0 ? ((claims + expenses) / revenue) * 100 : 0,
      lossRatio: revenue > 0 ? (claims / revenue) * 100 : 0,
      expenseRatio: revenue > 0 ? (expenses / revenue) * 100 : 0,
      period: { startDate: start, endDate: end },
    };
  }

  private async getPolicyMetrics(tenantId?: string): Promise<Record<string, any>> {
    let qb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'total')
      .addSelect("SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)", 'active')
      .addSelect("SUM(CASE WHEN cancelled_at IS NOT NULL THEN 1 ELSE 0 END)", 'cancelled')
      .addSelect('COALESCE(SUM(premium_amount), 0)', 'totalPremium')
      .from('rm_policies', 'p');
    if (tenantId) qb = qb.andWhere('p.tenant_id = :tenantId', { tenantId });
    const row = await qb.getRawOne();
    const total = Number(row?.total || 0);
    const active = Number(row?.active || 0);
    const cancelled = Number(row?.cancelled || 0);
    return {
      total,
      active,
      cancelled,
      totalPremium: Number(row?.totalPremium || 0),
      retentionRate: total > 0 ? ((active - cancelled) / total) * 100 : 0,
      premiumByLineOfBusiness: await this.getPremiumByDimension('line_of_business', tenantId),
      premiumByCarrier: await this.getPremiumByDimension('servicing_organization_id', tenantId),
      premiumByBroker: await this.getPremiumByDimension('broker_organization_id', tenantId),
      premiumByChannel: await this.getPremiumByDimension('sales_channel_type', tenantId),
    };
  }

  private async getClaimMetrics(tenantId?: string): Promise<Record<string, any>> {
    let qb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'total')
      .addSelect('COALESCE(SUM(approved_amount), 0)', 'totalPaid')
      .from('rm_claim_payments', 'cp');
    if (tenantId) qb = qb.andWhere('cp.tenant_id = :tenantId', { tenantId });
    const row = await qb.getRawOne();
    const total = Number(row?.total || 0);
    const totalPaid = Number(row?.totalPaid || 0);
    let policyCount = 0;
    let pQb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'cnt')
      .from('rm_policies', 'p');
    if (tenantId) pQb = pQb.andWhere('p.tenant_id = :tenantId', { tenantId });
    const pRow = await pQb.getRawOne();
    policyCount = Number(pRow?.cnt || 0);
    return {
      total,
      totalPaid,
      frequency: policyCount > 0 ? total / policyCount : 0,
      severity: total > 0 ? totalPaid / total : 0,
    };
  }

  private async getCommissionMetrics(tenantId?: string): Promise<Record<string, any>> {
    let qb = this.dataSource
      .createQueryBuilder()
      .select('COALESCE(SUM((commission_split_snapshot->>\'accrued\')::numeric), 0)', 'accrued')
      .addSelect('COALESCE(SUM((commission_split_snapshot->>\'paid\')::numeric), 0)', 'paid')
      .from('rm_policies', 'p')
      .where('commission_split_snapshot IS NOT NULL');
    if (tenantId) qb = qb.andWhere('p.tenant_id = :tenantId', { tenantId });
    const row = await qb.getRawOne();
    return {
      accrued: Number(row?.accrued || 0),
      paid: Number(row?.paid || 0),
      outstanding: Number(row?.accrued || 0) - Number(row?.paid || 0),
    };
  }

  private async getSettlementOutstanding(tenantId?: string): Promise<Record<string, any>> {
    let qb = this.dataSource
      .createQueryBuilder()
      .select('COALESCE(SUM(amount), 0)', 'outstanding')
      .addSelect('COUNT(*)', 'count')
      .from('rm_payments', 'pay')
      .where("pay.status != 'settled'");
    if (tenantId) qb = qb.andWhere('pay.tenant_id = :tenantId', { tenantId });
    const row = await qb.getRawOne();
    return {
      outstanding: Number(row?.outstanding || 0),
      count: Number(row?.count || 0),
    };
  }

  private async getComplaintMetrics(tenantId?: string): Promise<Record<string, any>> {
    let qb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'total')
      .addSelect("SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END)", 'open')
      .from('rm_complaint_sla_breaches', 'c');
    if (tenantId) qb = qb.andWhere('c.tenant_id = :tenantId', { tenantId });
    const row = await qb.getRawOne();
    return {
      total: Number(row?.total || 0),
      open: Number(row?.open || 0),
    };
  }

  private async getPremiumByDimension(column: string, tenantId?: string): Promise<Array<Record<string, any>>> {
    let qb = this.dataSource
      .createQueryBuilder()
      .select(column, 'dimension')
      .addSelect('COALESCE(SUM(premium_amount), 0)', 'premium')
      .addSelect('COUNT(*)', 'count')
      .from('rm_policies', 'p')
      .where(`${column} IS NOT NULL`)
      .groupBy(column)
      .orderBy('premium', 'DESC')
      .limit(10);
    if (tenantId) qb = qb.andWhere('p.tenant_id = :tenantId', { tenantId });
    const rows = await qb.getRawMany();
    return rows.map((r: any) => ({ dimension: r.dimension, premium: Number(r.premium || 0), count: Number(r.count || 0) }));
  }

  private async getFraudMetrics(tenantId?: string): Promise<Record<string, any>> {
    let qb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'total')
      .addSelect("SUM(CASE WHEN hold_claim = true THEN 1 ELSE 0 END)", 'holdCount')
      .from('rm_fraud_signals', 'f');
    if (tenantId) qb = qb.andWhere('f.tenant_id = :tenantId', { tenantId });
    const row = await qb.getRawOne();
    return {
      total: Number(row?.total || 0),
      holdCount: Number(row?.holdCount || 0),
      holdRate: Number(row?.total || 0) > 0 ? (Number(row?.holdCount || 0) / Number(row?.total || 0)) * 100 : 0,
    };
  }

  private async getUnderwritingMetrics(tenantId?: string): Promise<Record<string, any>> {
    let qb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'total')
      .from('rm_underwriting', 'u');
    if (tenantId) qb = qb.andWhere('u.tenant_id = :tenantId', { tenantId });
    const row = await qb.getRawOne();
    return { total: Number(row?.total || 0) };
  }

  private async getSalesNetworkMetrics(tenantId?: string): Promise<Record<string, any>> {
    let qb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'total')
      .from('rm_sales_network', 's');
    if (tenantId) qb = qb.andWhere('s.tenant_id = :tenantId', { tenantId });
    const row = await qb.getRawOne();
    return { total: Number(row?.total || 0) };
  }

  private async getKpiSummary(tenantId?: string): Promise<Array<Record<string, any>>> {
    const repo = this.dataSource.getRepository('kpi_snapshot');
    const qb = (repo as any).createQueryBuilder('k');
    if (tenantId) qb.andWhere('k.tenant_id = :tenantId', { tenantId });
    qb.orderBy('k.created_at', 'DESC').take(20);
    const rows = await qb.getMany();
    return (rows || []).map((r: any) => ({
      kpiKey: r.kpiKey,
      value: r.latestValue,
      unit: r.unit,
      trend: r.trend,
    }));
  }

  private async aggregateRevenue(tenantId: string | undefined, startDate: string, endDate: string): Promise<number> {
    let qb = this.dataSource
      .createQueryBuilder()
      .select('COALESCE(SUM(premium_amount), 0)', 'total')
      .from('rm_policies', 'p')
      .where('p.issued_at >= :startDate', { startDate })
      .andWhere('p.issued_at <= :endDate', { endDate });
    if (tenantId) qb = qb.andWhere('p.tenant_id = :tenantId', { tenantId });
    const row = await qb.getRawOne();
    return Number(row?.total || 0);
  }

  private async aggregateClaims(tenantId: string | undefined, startDate: string, endDate: string): Promise<number> {
    let qb = this.dataSource
      .createQueryBuilder()
      .select('COALESCE(SUM(approved_amount), 0)', 'total')
      .from('rm_claim_payments', 'cp')
      .where('cp.claim_paid_at >= :startDate', { startDate })
      .andWhere('cp.claim_paid_at <= :endDate', { endDate });
    if (tenantId) qb = qb.andWhere('cp.tenant_id = :tenantId', { tenantId });
    const row = await qb.getRawOne();
    return Number(row?.total || 0);
  }

  private async aggregateExpenses(tenantId: string | undefined, startDate: string, endDate: string): Promise<number> {
    const revenue = await this.aggregateRevenue(tenantId, startDate, endDate);
    return Math.round(revenue * 0.25);
  }

  private defaultStartOfYear(): string {
    const now = new Date();
    return new Date(now.getFullYear(), 0, 1).toISOString();
  }
}
