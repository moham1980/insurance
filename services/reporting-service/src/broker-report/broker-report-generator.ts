import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { BrokerTransactionReport } from '../entities/BrokerTransactionReport';
import { DataQualityIssue } from '../entities/DataQualityIssue';
import { P6EventProducer } from '../events/p6-event-producer';

export interface GenerateBrokerReportParams {
  tenantId?: string;
  brokerOrganizationId?: string;
  periodId: string;
  periodStartDate: string;
  periodEndDate: string;
  reportType?: string;
  actorUserId?: string;
}

export interface BrokerReportAggregate {
  brokerOrganizationId: string | null;
  periodId: string;
  policyCount: number;
  premiumAmount: number;
  claimCount: number;
  claimPaidAmount: number;
  commissionAmount: number;
  technicalResult: number;
  currency: string;
}

@Injectable()
export class BrokerReportGenerator {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly eventProducer: P6EventProducer,
  ) {}

  async list(tenantId?: string, brokerOrganizationId?: string, status?: string, limit = 50, offset = 0): Promise<{ rows: BrokerTransactionReport[]; total: number }> {
    const repo = this.dataSource.getRepository(BrokerTransactionReport);
    const qb = repo.createQueryBuilder('r');
    if (tenantId) qb.andWhere('r.tenant_id = :tenantId', { tenantId });
    if (brokerOrganizationId) qb.andWhere('r.broker_organization_id = :brokerOrganizationId', { brokerOrganizationId });
    if (status) qb.andWhere('r.status = :status', { status });
    qb.orderBy('r.created_at', 'DESC').take(limit).skip(offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async get(reportId: string, tenantId?: string): Promise<BrokerTransactionReport | null> {
    const repo = this.dataSource.getRepository(BrokerTransactionReport);
    const where: any = { reportId };
    if (tenantId) where.tenantId = tenantId;
    return repo.findOne({ where });
  }

  async createDraft(params: GenerateBrokerReportParams): Promise<BrokerTransactionReport> {
    const repo = this.dataSource.getRepository(BrokerTransactionReport);
    const existing = await repo.findOne({
      where: {
        tenantId: params.tenantId || null,
        brokerOrganizationId: params.brokerOrganizationId || null,
        periodId: params.periodId,
      } as any,
    });
    if (existing) {
      return existing;
    }
    const row = repo.create({
      tenantId: params.tenantId || null,
      brokerOrganizationId: params.brokerOrganizationId || null,
      periodId: params.periodId,
      periodStartDate: new Date(params.periodStartDate),
      periodEndDate: new Date(params.periodEndDate),
      reportType: params.reportType || 'broker_transaction',
      status: 'draft',
      currency: 'IRR',
    });
    return repo.save(row);
  }

  async generate(reportId: string, tenantId?: string): Promise<BrokerTransactionReport | null> {
    const repo = this.dataSource.getRepository(BrokerTransactionReport);
    const report = await this.get(reportId, tenantId);
    if (!report) return null;

    const start = report.periodStartDate ? report.periodStartDate.toISOString() : report.periodId;
    const end = report.periodEndDate ? report.periodEndDate.toISOString() : report.periodId;

    const aggregate = await this.aggregateBrokerData({
      tenantId,
      brokerOrganizationId: report.brokerOrganizationId || undefined,
      startDate: start,
      endDate: end,
    });

    report.policyCount = aggregate.policyCount;
    report.premiumAmount = aggregate.premiumAmount ? String(aggregate.premiumAmount) : null;
    report.claimCount = aggregate.claimCount;
    report.claimPaidAmount = aggregate.claimPaidAmount ? String(aggregate.claimPaidAmount) : null;
    report.commissionAmount = aggregate.commissionAmount ? String(aggregate.commissionAmount) : null;
    report.technicalResult = aggregate.technicalResult ? String(aggregate.technicalResult) : null;
    report.currency = aggregate.currency;
    report.status = 'generated';
    report.generatedAt = new Date();
    report.payload = { ...aggregate };

    const saved = await repo.save(report);
    await this.eventProducer.publishBrokerReportGenerated(saved.reportId, tenantId);
    return saved;
  }

  async approve(reportId: string, actorUserId: string, tenantId?: string): Promise<BrokerTransactionReport | null> {
    const repo = this.dataSource.getRepository(BrokerTransactionReport);
    const report = await this.get(reportId, tenantId);
    if (!report) return null;
    report.approvedBy = actorUserId;
    report.status = 'approved';
    const saved = await repo.save(report);
    await this.eventProducer.publishBrokerReportApproved(saved.reportId, actorUserId, tenantId);
    return saved;
  }

  async submit(reportId: string, tenantId?: string): Promise<BrokerTransactionReport | null> {
    const repo = this.dataSource.getRepository(BrokerTransactionReport);
    const report = await this.get(reportId, tenantId);
    if (!report) return null;

    const dqRepo = this.dataSource.getRepository(DataQualityIssue);
    const criticalQb = dqRepo.createQueryBuilder('i').where("i.status = 'open'").andWhere("i.severity = 'critical'");
    if (tenantId) criticalQb.andWhere('i.tenant_id = :tenantId', { tenantId });
    const criticalCount = await criticalQb.getCount();
    if (criticalCount > 0) {
      throw Object.assign(new Error(`Cannot submit report: ${criticalCount} open critical data quality issues must be resolved first`), { code: 'CRITICAL_VIOLATIONS' });
    }

    report.status = 'submitted';
    report.submittedAt = new Date();
    const saved = await repo.save(report);
    await this.eventProducer.publishBrokerReportSubmitted(saved.reportId, tenantId);
    return saved;
  }

  private async aggregateBrokerData(params: {
    tenantId?: string;
    brokerOrganizationId?: string;
    startDate: string;
    endDate: string;
  }): Promise<BrokerReportAggregate> {
    const { tenantId, brokerOrganizationId } = params;

    let policyQb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'policyCount')
      .addSelect('COALESCE(SUM(premium_amount), 0)', 'premiumAmount')
      .from('rm_policies', 'p')
      .where('p.issued_at >= :startDate', { startDate: params.startDate })
      .andWhere('p.issued_at <= :endDate', { endDate: params.endDate });

    if (tenantId) policyQb = policyQb.andWhere('p.tenant_id = :tenantId', { tenantId });
    if (brokerOrganizationId) policyQb = policyQb.andWhere('p.broker_organization_id = :brokerOrg', { brokerOrg: brokerOrganizationId });

    const policyStats = await policyQb.getRawOne();

    let claimQb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'claimCount')
      .addSelect('COALESCE(SUM(cp.approved_amount), 0)', 'claimPaidAmount')
      .from('rm_claim_payments', 'cp')
      .innerJoin('rm_policies', 'p', 'p.policy_id = cp.policy_id')
      .where('cp.claim_paid_at >= :startDate', { startDate: params.startDate })
      .andWhere('cp.claim_paid_at <= :endDate', { endDate: params.endDate });

    if (tenantId) claimQb = claimQb.andWhere('cp.tenant_id = :tenantId', { tenantId });
    if (brokerOrganizationId) claimQb = claimQb.andWhere('p.broker_organization_id = :brokerOrg', { brokerOrg: brokerOrganizationId });

    const claimStats = await claimQb.getRawOne();

    const premium = Number(policyStats?.premiumAmount || 0);
    const claimPaid = Number(claimStats?.claimPaidAmount || 0);

    const commissionRateQb = this.dataSource
      .createQueryBuilder()
      .select('commission_rate_bps', 'commissionRateBps')
      .from('rm_sales_network', 's')
      .where('s.organization_id = :brokerOrg', { brokerOrg: brokerOrganizationId });
    const rateRow = brokerOrganizationId ? await commissionRateQb.getRawOne() : null;
    const bps = rateRow?.commissionRateBps ? Number(rateRow.commissionRateBps) : 0;
    const commission = (premium * bps) / 10000;

    return {
      brokerOrganizationId: brokerOrganizationId || null,
      periodId: '',
      policyCount: Number(policyStats?.policyCount || 0),
      premiumAmount: premium,
      claimCount: Number(claimStats?.claimCount || 0),
      claimPaidAmount: claimPaid,
      commissionAmount: commission,
      technicalResult: premium - claimPaid - commission,
      currency: 'IRR',
    };
  }
}
