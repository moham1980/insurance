import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TCoRReport } from '../entities/TCoRReport';
import { P6EventProducer } from '../events/p6-event-producer';

export interface GenerateTCoRParams {
  tenantId?: string;
  periodId: string;
  periodStartDate: string;
  periodEndDate: string;
  reportType?: string;
  actorUserId?: string;
}

export interface TCoRAggregate {
  totalPremium: number;
  totalClaimPaid: number;
  acquisitionCost: number;
  operatingExpense: number;
  reinsuranceCost: number;
  totalCostOfRisk: number;
  combinedRatio: number;
  lossRatio: number;
  expenseRatio: number;
  currency: string;
}

@Injectable()
export class TCoRReportCalculator {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly eventProducer: P6EventProducer,
  ) {}

  async list(tenantId?: string, status?: string, limit = 50, offset = 0): Promise<{ rows: TCoRReport[]; total: number }> {
    const repo = this.dataSource.getRepository(TCoRReport);
    const qb = repo.createQueryBuilder('r');
    if (tenantId) qb.andWhere('r.tenant_id = :tenantId', { tenantId });
    if (status) qb.andWhere('r.status = :status', { status });
    qb.orderBy('r.created_at', 'DESC').take(limit).skip(offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async get(reportId: string, tenantId?: string): Promise<TCoRReport | null> {
    const repo = this.dataSource.getRepository(TCoRReport);
    const where: any = { reportId };
    if (tenantId) where.tenantId = tenantId;
    return repo.findOne({ where });
  }

  async createDraft(params: GenerateTCoRParams): Promise<TCoRReport> {
    const repo = this.dataSource.getRepository(TCoRReport);
    const existing = await repo.findOne({
      where: {
        tenantId: params.tenantId || null,
        periodId: params.periodId,
      } as any,
    });
    if (existing) return existing;
    const row = repo.create({
      tenantId: params.tenantId || null,
      periodId: params.periodId,
      periodStartDate: new Date(params.periodStartDate),
      periodEndDate: new Date(params.periodEndDate),
      reportType: params.reportType || 'tcor',
      status: 'draft',
      currency: 'IRR',
    });
    return repo.save(row);
  }

  async generate(reportId: string, tenantId?: string): Promise<TCoRReport | null> {
    const repo = this.dataSource.getRepository(TCoRReport);
    const report = await this.get(reportId, tenantId);
    if (!report) return null;

    const start = report.periodStartDate ? report.periodStartDate.toISOString() : report.periodId;
    const end = report.periodEndDate ? report.periodEndDate.toISOString() : report.periodId;

    const aggregate = await this.calculateTCoR({
      tenantId,
      startDate: start,
      endDate: end,
    });

    report.totalPremium = String(aggregate.totalPremium);
    report.totalClaimPaid = String(aggregate.totalClaimPaid);
    report.acquisitionCost = String(aggregate.acquisitionCost);
    report.operatingExpense = String(aggregate.operatingExpense);
    report.reinsuranceCost = String(aggregate.reinsuranceCost);
    report.totalCostOfRisk = String(aggregate.totalCostOfRisk);
    report.combinedRatio = String(aggregate.combinedRatio);
    report.lossRatio = String(aggregate.lossRatio);
    report.expenseRatio = String(aggregate.expenseRatio);
    report.currency = aggregate.currency;
    report.status = 'generated';
    report.generatedAt = new Date();
    report.payload = { ...aggregate };

    const saved = await repo.save(report);
    await this.eventProducer.publishTCoRReportGenerated(saved.reportId, tenantId);
    return saved;
  }

  async drilldown(reportId: string, by: string, tenantId?: string): Promise<Record<string, any>[]> {
    const report = await this.get(reportId, tenantId);
    if (!report) return [];

    const start = report.periodStartDate ? report.periodStartDate.toISOString() : report.periodId;
    const end = report.periodEndDate ? report.periodEndDate.toISOString() : report.periodId;

    if (by === 'policy') {
      let qb = this.dataSource
        .createQueryBuilder()
        .select('p.policy_id', 'policyId')
        .addSelect('p.policy_number', 'policyNumber')
        .addSelect('p.line_of_business', 'lineOfBusiness')
        .addSelect('p.premium_amount', 'premiumAmount')
        .addSelect('COALESCE(cp.claim_paid, 0)', 'claimPaid')
        .from('rm_policies', 'p')
        .leftJoin(
          '(SELECT cp2.policy_id, SUM(cp2.approved_amount) AS claim_paid FROM rm_claim_payments cp2 WHERE cp2.claim_paid_at >= :startDate AND cp2.claim_paid_at <= :endDate GROUP BY cp2.policy_id)',
          'cp',
          'cp.policy_id = p.policy_id',
        )
        .where('p.issued_at >= :startDate', { startDate: start })
        .andWhere('p.issued_at <= :endDate', { endDate: end });
      if (tenantId) qb = qb.andWhere('p.tenant_id = :tenantId', { tenantId });
      qb = qb.orderBy('p.premium_amount', 'DESC').take(200);
      return qb.getRawMany();
    }

    if (by === 'lineOfBusiness') {
      let qb = this.dataSource
        .createQueryBuilder()
        .select('p.line_of_business', 'lineOfBusiness')
        .addSelect('COUNT(*)', 'policyCount')
        .addSelect('COALESCE(SUM(p.premium_amount), 0)', 'premiumAmount')
        .addSelect('COALESCE(SUM(cp.claim_paid), 0)', 'claimPaid')
        .from('rm_policies', 'p')
        .leftJoin(
          '(SELECT cp2.policy_id, SUM(cp2.approved_amount) AS claim_paid FROM rm_claim_payments cp2 WHERE cp2.claim_paid_at >= :startDate AND cp2.claim_paid_at <= :endDate GROUP BY cp2.policy_id)',
          'cp',
          'cp.policy_id = p.policy_id',
        )
        .where('p.issued_at >= :startDate', { startDate: start })
        .andWhere('p.issued_at <= :endDate', { endDate: end });
      if (tenantId) qb = qb.andWhere('p.tenant_id = :tenantId', { tenantId });
      qb = qb.groupBy('p.line_of_business').orderBy('premiumAmount', 'DESC');
      return qb.getRawMany();
    }

    if (by === 'carrier') {
      let qb = this.dataSource
        .createQueryBuilder()
        .select('p.issuer_organization_id', 'carrierId')
        .addSelect('COUNT(*)', 'policyCount')
        .addSelect('COALESCE(SUM(p.premium_amount), 0)', 'premiumAmount')
        .addSelect('COALESCE(SUM(cp.claim_paid), 0)', 'claimPaid')
        .from('rm_policies', 'p')
        .leftJoin(
          '(SELECT cp2.policy_id, SUM(cp2.approved_amount) AS claim_paid FROM rm_claim_payments cp2 WHERE cp2.claim_paid_at >= :startDate AND cp2.claim_paid_at <= :endDate GROUP BY cp2.policy_id)',
          'cp',
          'cp.policy_id = p.policy_id',
        )
        .where('p.issued_at >= :startDate', { startDate: start })
        .andWhere('p.issued_at <= :endDate', { endDate: end })
        .andWhere('p.issuer_organization_id IS NOT NULL');
      if (tenantId) qb = qb.andWhere('p.tenant_id = :tenantId', { tenantId });
      qb = qb.groupBy('p.issuer_organization_id').orderBy('premiumAmount', 'DESC');
      return qb.getRawMany();
    }

    return [];
  }

  async approve(reportId: string, actorUserId: string, tenantId?: string): Promise<TCoRReport | null> {
    const repo = this.dataSource.getRepository(TCoRReport);
    const report = await this.get(reportId, tenantId);
    if (!report) return null;
    report.approvedBy = actorUserId;
    report.status = 'approved';
    return repo.save(report);
  }

  async submit(reportId: string, tenantId?: string): Promise<TCoRReport | null> {
    const repo = this.dataSource.getRepository(TCoRReport);
    const report = await this.get(reportId, tenantId);
    if (!report) return null;
    report.status = 'submitted';
    report.submittedAt = new Date();
    const saved = await repo.save(report);
    await this.eventProducer.publishTCoRReportSubmitted(saved.reportId, tenantId);
    return saved;
  }

  private async calculateTCoR(params: { tenantId?: string; startDate: string; endDate: string }): Promise<TCoRAggregate> {
    const { tenantId, startDate, endDate } = params;

    let policyQb = this.dataSource
      .createQueryBuilder()
      .select('COALESCE(SUM(premium_amount), 0)', 'totalPremium')
      .from('rm_policies', 'p')
      .where('p.issued_at >= :startDate', { startDate })
      .andWhere('p.issued_at <= :endDate', { endDate });
    if (tenantId) policyQb = policyQb.andWhere('p.tenant_id = :tenantId', { tenantId });
    const policyStats = await policyQb.getRawOne();

    let claimQb = this.dataSource
      .createQueryBuilder()
      .select('COALESCE(SUM(approved_amount), 0)', 'totalClaimPaid')
      .from('rm_claim_payments', 'cp')
      .where('cp.claim_paid_at >= :startDate', { startDate })
      .andWhere('cp.claim_paid_at <= :endDate', { endDate });
    if (tenantId) claimQb = claimQb.andWhere('cp.tenant_id = :tenantId', { tenantId });
    const claimStats = await claimQb.getRawOne();

    let riQb = this.dataSource
      .createQueryBuilder()
      .select('COALESCE(SUM(ceded_premium), 0)', 'reinsuranceCost')
      .from('rm_ri_ceded', 'ri')
      .where('ri.ceded_at >= :startDate', { startDate })
      .andWhere('ri.ceded_at <= :endDate', { endDate });
    if (tenantId) riQb = riQb.andWhere('ri.tenant_id = :tenantId', { tenantId });
    const riStats = await riQb.getRawOne();

    const totalPremium = Number(policyStats?.totalPremium || 0);
    const totalClaimPaid = Number(claimStats?.totalClaimPaid || 0);
    const reinsuranceCost = Number(riStats?.reinsuranceCost || 0);

    const acquisitionCost = totalPremium * 0.15;
    const operatingExpense = totalPremium * 0.10;
    const totalCostOfRisk = totalClaimPaid + acquisitionCost + operatingExpense + reinsuranceCost;

    const combinedRatio = totalPremium > 0 ? (totalCostOfRisk / totalPremium) * 100 : 0;
    const lossRatio = totalPremium > 0 ? (totalClaimPaid / totalPremium) * 100 : 0;
    const expenseRatio = totalPremium > 0 ? ((acquisitionCost + operatingExpense) / totalPremium) * 100 : 0;

    return {
      totalPremium,
      totalClaimPaid,
      acquisitionCost,
      operatingExpense,
      reinsuranceCost,
      totalCostOfRisk,
      combinedRatio,
      lossRatio,
      expenseRatio,
      currency: 'IRR',
    };
  }
}
