import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { RegulatoryReport } from '../entities/RegulatoryReport';

const PII_FIELDS = [
  'national_id', 'nationalId', 'phone_number', 'phoneNumber', 'mobile', 'email',
  'address', 'birth_date', 'birthDate', 'iban', 'card_number', 'cardNumber',
];

@Injectable()
export class RegulatoryReportService {
  private readonly logger = new Logger(RegulatoryReportService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async list(tenantId?: string, reportType?: string, issuerId?: string, brokerOrganizationId?: string, status?: string, limit = 50, offset = 0): Promise<{ rows: RegulatoryReport[]; total: number }> {
    const repo = this.dataSource.getRepository(RegulatoryReport);
    const qb = repo.createQueryBuilder('r');
    if (tenantId) qb.andWhere('r.tenant_id = :tenantId', { tenantId });
    if (reportType) qb.andWhere('r.report_type = :reportType', { reportType });
    if (issuerId) qb.andWhere('r.issuer_id = :issuerId', { issuerId });
    if (brokerOrganizationId) qb.andWhere('r.broker_organization_id = :brokerOrganizationId', { brokerOrganizationId });
    if (status) qb.andWhere('r.status = :status', { status });
    qb.orderBy('r.created_at', 'DESC').take(limit).skip(offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async get(reportId: string, tenantId?: string): Promise<RegulatoryReport | null> {
    const repo = this.dataSource.getRepository(RegulatoryReport);
    const where: any = { reportId };
    if (tenantId) where.tenantId = tenantId;
    return repo.findOne({ where });
  }

  async create(params: { tenantId?: string; reportType: string; issuerId?: string; brokerOrganizationId?: string; periodId: string; periodStartDate?: string; periodEndDate?: string; }): Promise<RegulatoryReport> {
    const repo = this.dataSource.getRepository(RegulatoryReport);
    const row = repo.create({
      tenantId: params.tenantId || null,
      reportType: params.reportType,
      issuerId: params.issuerId || null,
      brokerOrganizationId: params.brokerOrganizationId || null,
      periodId: params.periodId,
      periodStartDate: params.periodStartDate ? new Date(params.periodStartDate) : null,
      periodEndDate: params.periodEndDate ? new Date(params.periodEndDate) : null,
      status: 'draft',
      format: 'json',
    });
    return repo.save(row);
  }

  async generate(reportId: string, tenantId?: string, actorUserId?: string): Promise<RegulatoryReport | null> {
    const repo = this.dataSource.getRepository(RegulatoryReport);
    const report = await this.get(reportId, tenantId);
    if (!report) return null;

    const startDate = report.periodStartDate?.toISOString();
    const endDate = report.periodEndDate?.toISOString();

    const payload = await this.aggregateRegulatoryData({
      tenantId,
      issuerId: report.issuerId || undefined,
      brokerOrganizationId: report.brokerOrganizationId || undefined,
      startDate,
      endDate,
    });

    report.status = 'generated';
    report.generatedAt = new Date();
    report.generatedBy = actorUserId || null;
    report.payload = this.maskPII(payload);
    report.xmlContent = this.toXML(report);
    report.format = 'xml';

    return repo.save(report);
  }

  async exportPDF(reportId: string, tenantId?: string): Promise<{ content: string; contentType: string }> {
    const report = await this.get(reportId, tenantId);
    if (!report) throw Object.assign(new Error('Report not found'), { code: 'NOT_FOUND' });

    const html = this.toHTML(report);
    return { content: html, contentType: 'text/html; charset=utf-8' };
  }

  async submit(reportId: string, tenantId?: string): Promise<RegulatoryReport | null> {
    const repo = this.dataSource.getRepository(RegulatoryReport);
    const report = await this.get(reportId, tenantId);
    if (!report) return null;

    if (report.status === 'submitted') {
      return report;
    }

    report.status = 'submitted';
    report.submittedAt = new Date();

    const secret = process.env.AUDIT_SIGNATURE_SECRET || 'default-signing-secret';
    const payloadStr = JSON.stringify({
      reportId: report.reportId,
      reportType: report.reportType,
      issuerId: report.issuerId,
      brokerOrganizationId: report.brokerOrganizationId,
      periodId: report.periodId,
      payload: report.payload,
      submittedAt: report.submittedAt.toISOString(),
    });
    report.signature = this.hmacSha256(payloadStr, secret);

    return repo.save(report);
  }

  private hmacSha256(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  private async aggregateRegulatoryData(params: { tenantId?: string; issuerId?: string; brokerOrganizationId?: string; startDate?: string; endDate?: string; }): Promise<Record<string, any>> {
    const { tenantId, issuerId, brokerOrganizationId, startDate, endDate } = params;

    let policyQb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'policyCount')
      .addSelect('COALESCE(SUM(premium_amount), 0)', 'premiumAmount')
      .addSelect('COALESCE(SUM(commission_amount), 0)', 'commissionAmount')
      .from('rm_policies', 'p')
      .where('p.issued_at IS NOT NULL');

    if (tenantId) policyQb = policyQb.andWhere('p.tenant_id = :tenantId', { tenantId });
    if (issuerId) policyQb = policyQb.andWhere('p.issuer_id = :issuerId', { issuerId });
    if (brokerOrganizationId) policyQb = policyQb.andWhere('p.broker_organization_id = :brokerOrg', { brokerOrg: brokerOrganizationId });
    if (startDate && endDate) {
      policyQb = policyQb.andWhere('p.issued_at >= :startDate', { startDate }).andWhere('p.issued_at <= :endDate', { endDate });
    }
    const policyStats = await policyQb.getRawOne();

    let claimQb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'claimCount')
      .addSelect('COALESCE(SUM(cp.approved_amount), 0)', 'claimPaidAmount')
      .from('rm_claim_payments', 'cp')
      .innerJoin('rm_policies', 'p', 'p.policy_id = cp.policy_id')
      .where('cp.claim_paid_at IS NOT NULL');

    if (tenantId) claimQb = claimQb.andWhere('cp.tenant_id = :tenantId', { tenantId });
    if (issuerId) claimQb = claimQb.andWhere('p.issuer_id = :issuerId', { issuerId });
    if (brokerOrganizationId) claimQb = claimQb.andWhere('p.broker_organization_id = :brokerOrg', { brokerOrg: brokerOrganizationId });
    if (startDate && endDate) {
      claimQb = claimQb.andWhere('cp.claim_paid_at >= :startDate', { startDate }).andWhere('cp.claim_paid_at <= :endDate', { endDate });
    }
    const claimStats = await claimQb.getRawOne();

    const premium = Number(policyStats?.premiumAmount || 0);
    const claims = Number(claimStats?.claimPaidAmount || 0);
    const commission = Number(policyStats?.commissionAmount || 0);

    return {
      issuerId: issuerId || null,
      brokerOrganizationId: brokerOrganizationId || null,
      periodStart: startDate || null,
      periodEnd: endDate || null,
      policyCount: Number(policyStats?.policyCount || 0),
      premiumAmount: premium,
      claimCount: Number(claimStats?.claimCount || 0),
      claimPaidAmount: claims,
      commissionAmount: commission,
      technicalResult: premium - claims - commission,
      lossRatio: premium > 0 ? (claims / premium) : 0,
      currency: 'IRR',
    };
  }

  private toXML(report: RegulatoryReport): string {
    const p = report.payload || {};
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return `<?xml version="1.0" encoding="UTF-8"?>
<RegulatoryReport>
  <ReportId>${esc(report.reportId)}</ReportId>
  <ReportType>${esc(report.reportType)}</ReportType>
  <IssuerId>${esc(report.issuerId)}</IssuerId>
  <BrokerOrganizationId>${esc(report.brokerOrganizationId)}</BrokerOrganizationId>
  <PeriodId>${esc(report.periodId)}</PeriodId>
  <PeriodStart>${esc(report.periodStartDate?.toISOString())}</PeriodStart>
  <PeriodEnd>${esc(report.periodEndDate?.toISOString())}</PeriodEnd>
  <Status>${esc(report.status)}</Status>
  <GeneratedAt>${esc(report.generatedAt?.toISOString())}</GeneratedAt>
  <Summary>
    <PolicyCount>${esc(p.policyCount)}</PolicyCount>
    <PremiumAmount>${esc(p.premiumAmount)}</PremiumAmount>
    <ClaimCount>${esc(p.claimCount)}</ClaimCount>
    <ClaimPaidAmount>${esc(p.claimPaidAmount)}</ClaimPaidAmount>
    <CommissionAmount>${esc(p.commissionAmount)}</CommissionAmount>
    <TechnicalResult>${esc(p.technicalResult)}</TechnicalResult>
    <LossRatio>${esc(p.lossRatio)}</LossRatio>
    <Currency>${esc(p.currency)}</Currency>
  </Summary>
</RegulatoryReport>`;
  }

  private toHTML(report: RegulatoryReport): string {
    const p = report.payload || {};
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Regulatory Report ${report.reportId}</title>
<style>
  body { font-family: Tahoma, Arial, sans-serif; margin: 20px; }
  h1 { color: #333; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background-color: #f5f5f5; }
</style>
</head>
<body>
<h1>Regulatory Report</h1>
<table>
  <tr><th>Report ID</th><td>${report.reportId}</td></tr>
  <tr><th>Type</th><td>${report.reportType}</td></tr>
  <tr><th>Issuer</th><td>${report.issuerId || 'N/A'}</td></tr>
  <tr><th>Broker Organization</th><td>${report.brokerOrganizationId || 'N/A'}</td></tr>
  <tr><th>Period</th><td>${report.periodId}</td></tr>
  <tr><th>Status</th><td>${report.status}</td></tr>
  <tr><th>Generated At</th><td>${report.generatedAt?.toISOString() || 'N/A'}</td></tr>
</table>
<h2>Summary</h2>
<table>
  <tr><th>Policy Count</th><td>${p.policyCount || 0}</td></tr>
  <tr><th>Premium Amount</th><td>${p.premiumAmount || 0} ${p.currency || 'IRR'}</td></tr>
  <tr><th>Claim Count</th><td>${p.claimCount || 0}</td></tr>
  <tr><th>Claim Paid Amount</th><td>${p.claimPaidAmount || 0} ${p.currency || 'IRR'}</td></tr>
  <tr><th>Commission Amount</th><td>${p.commissionAmount || 0} ${p.currency || 'IRR'}</td></tr>
  <tr><th>Technical Result</th><td>${p.technicalResult || 0} ${p.currency || 'IRR'}</td></tr>
  <tr><th>Loss Ratio</th><td>${((p.lossRatio || 0) * 100).toFixed(2)}%</td></tr>
</table>
</body>
</html>`;
  }

  private maskPII(payload: Record<string, any>): Record<string, any> {
    return this.deepMaskPII(payload);
  }

  private deepMaskPII(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') return obj;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map((item) => this.deepMaskPII(item));
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (PII_FIELDS.includes(key) && typeof value === 'string') {
        result[key] = value.length <= 4 ? '****' : value.slice(0, 2) + '****' + value.slice(-2);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.deepMaskPII(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}
