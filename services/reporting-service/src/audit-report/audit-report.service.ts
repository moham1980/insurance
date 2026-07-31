import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { AuditReport } from '../entities/AuditReport';
import { P6EventProducer } from '../events/p6-event-producer';

export interface CreateAuditReportParams {
  tenantId?: string;
  reportType: string;
  periodId?: string;
  periodStartDate?: string;
  periodEndDate?: string;
  actorUserId?: string;
}

const VALID_REPORT_TYPES = [
  'policy_issuance',
  'claim_payments',
  'sanhab_submissions',
  'permission_usage',
  'access_log',
  'data_modifications',
  'consent_log',
];

const PII_FIELDS = [
  'national_id', 'nationalId', 'phone_number', 'phoneNumber', 'mobile', 'email',
  'address', 'birth_date', 'birthDate', 'iban', 'card_number', 'cardNumber',
];

@Injectable()
export class AuditReportService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly eventProducer: P6EventProducer,
  ) {}

  async list(tenantId?: string, reportType?: string, status?: string, limit = 50, offset = 0): Promise<{ rows: AuditReport[]; total: number }> {
    const repo = this.dataSource.getRepository(AuditReport);
    const qb = repo.createQueryBuilder('a');
    if (tenantId) qb.andWhere('a.tenant_id = :tenantId', { tenantId });
    if (reportType) qb.andWhere('a.report_type = :reportType', { reportType });
    if (status) qb.andWhere('a.status = :status', { status });
    qb.orderBy('a.created_at', 'DESC').take(limit).skip(offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async get(reportId: string, tenantId?: string): Promise<AuditReport | null> {
    const repo = this.dataSource.getRepository(AuditReport);
    const where: any = { reportId };
    if (tenantId) where.tenantId = tenantId;
    return repo.findOne({ where });
  }

  async create(params: CreateAuditReportParams): Promise<AuditReport> {
    const repo = this.dataSource.getRepository(AuditReport);
    if (!VALID_REPORT_TYPES.includes(params.reportType)) {
      throw Object.assign(new Error(`Invalid reportType: ${params.reportType}. Valid types: ${VALID_REPORT_TYPES.join(', ')}`), { code: 'VALIDATION_ERROR' });
    }
    const row = repo.create({
      tenantId: params.tenantId || null,
      reportType: params.reportType,
      periodId: params.periodId || null,
      periodStartDate: params.periodStartDate ? new Date(params.periodStartDate) : null,
      periodEndDate: params.periodEndDate ? new Date(params.periodEndDate) : null,
      status: 'draft',
    });
    return repo.save(row);
  }

  async generate(reportId: string, tenantId?: string, actorUserId?: string): Promise<AuditReport | null> {
    const repo = this.dataSource.getRepository(AuditReport);
    const report = await this.get(reportId, tenantId);
    if (!report) return null;

    let payload: Record<string, any> = {};
    const startDate = report.periodStartDate?.toISOString();
    const endDate = report.periodEndDate?.toISOString();

    switch (report.reportType) {
      case 'policy_issuance':
        payload = await this.auditPolicyIssuance(tenantId, startDate, endDate);
        break;
      case 'claim_payments':
        payload = await this.auditClaimPayments(tenantId, startDate, endDate);
        break;
      case 'sanhab_submissions':
        payload = await this.auditSanhabSubmissions(tenantId);
        break;
      case 'permission_usage':
        payload = await this.auditPermissionUsage(tenantId);
        break;
      case 'access_log':
        payload = await this.auditAccessLog(tenantId, startDate, endDate);
        break;
      case 'data_modifications':
        payload = await this.auditDataModifications(tenantId, startDate, endDate);
        break;
      case 'consent_log':
        payload = await this.auditConsentLog(tenantId, startDate, endDate);
        break;
      default:
        payload = { summary: 'No audit logic for report type' };
    }

    report.status = 'generated';
    report.generatedAt = new Date();
    report.generatedBy = actorUserId || null;
    report.payload = this.maskPII(payload);

    // Tamper-evident chaining: sign payload + previous signature
    const lastReport = await repo
      .createQueryBuilder('a')
      .where('a.signature IS NOT NULL')
      .orderBy('a.generated_at', 'DESC')
      .take(1)
      .getOne();

    report.previousSignature = lastReport?.signature || null;
    report.signature = this.signReport(report);

    const saved = await repo.save(report);
    await this.eventProducer.publishAuditReportGenerated(saved.reportId, saved.reportType, tenantId);
    return saved;
  }

  async exportReport(reportId: string, tenantId?: string): Promise<{ report: AuditReport; content: string; contentType: string }> {
    const report = await this.get(reportId, tenantId);
    if (!report) throw Object.assign(new Error('Report not found'), { code: 'NOT_FOUND' });

    report.exportMasked = true;
    const repo = this.dataSource.getRepository(AuditReport);
    await repo.save(report);

    const lines: string[] = [
      `Audit Report: ${report.reportType}`,
      `Report ID: ${report.reportId}`,
      `Period: ${report.periodStartDate?.toISOString() || 'N/A'} to ${report.periodEndDate?.toISOString() || 'N/A'}`,
      `Generated By: ${report.generatedBy || 'N/A'}`,
      `Generated At: ${report.generatedAt?.toISOString() || 'N/A'}`,
      `Signature: ${report.signature || 'N/A'}`,
      `Previous Signature: ${report.previousSignature || 'N/A'}`,
      '',
      '--- Payload (PII Masked) ---',
      JSON.stringify(report.payload, null, 2),
    ];

    return {
      report,
      content: lines.join('\n'),
      contentType: 'text/plain; charset=utf-8',
    };
  }

  private signReport(report: AuditReport): string {
    const data = [
      report.reportId,
      report.reportType,
      report.generatedAt?.toISOString() || '',
      JSON.stringify(report.payload),
      report.previousSignature || '',
    ].join('|');

    const secret = process.env.AUDIT_SIGNATURE_SECRET || 'insurance-audit-signing-key';
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  verifySignature(report: AuditReport): boolean {
    if (!report.signature) return false;
    const expected = this.signReport(report);
    return report.signature === expected;
  }

  private maskPII(payload: Record<string, any>): Record<string, any> {
    return this.deepMaskPII(payload);
  }

  private deepMaskPII(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') return obj;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepMaskPII(item));
    }

    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (PII_FIELDS.includes(key) && typeof value === 'string') {
        result[key] = this.maskValue(value);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.deepMaskPII(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private maskValue(value: string): string {
    if (value.length <= 4) return '****';
    return value.slice(0, 2) + '****' + value.slice(-2);
  }

  private async auditPolicyIssuance(tenantId?: string, startDate?: string, endDate?: string): Promise<Record<string, any>> {
    let qb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'total')
      .addSelect('status', 'status')
      .from('rm_policies', 'p')
      .groupBy('status');
    if (tenantId) qb = qb.andWhere('p.tenant_id = :tenantId', { tenantId });
    if (startDate && endDate) {
      qb = qb.andWhere('p.issued_at >= :startDate', { startDate }).andWhere('p.issued_at <= :endDate', { endDate });
    }
    const rows = await qb.getRawMany();
    return { byStatus: rows };
  }

  private async auditClaimPayments(tenantId?: string, startDate?: string, endDate?: string): Promise<Record<string, any>> {
    let qb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(approved_amount), 0)', 'totalApproved')
      .from('rm_claim_payments', 'cp');
    if (tenantId) qb = qb.andWhere('cp.tenant_id = :tenantId', { tenantId });
    if (startDate && endDate) {
      qb = qb.andWhere('cp.claim_paid_at >= :startDate', { startDate }).andWhere('cp.claim_paid_at <= :endDate', { endDate });
    }
    const row = await qb.getRawOne();
    return { count: Number(row?.count || 0), totalApproved: Number(row?.totalApproved || 0) };
  }

  private async auditSanhabSubmissions(tenantId?: string): Promise<Record<string, any>> {
    let qb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'total')
      .addSelect('sanhab_status', 'sanhabStatus')
      .from('rm_policies', 'p')
      .where('sanhab_status IS NOT NULL')
      .groupBy('sanhab_status');
    if (tenantId) qb = qb.andWhere('p.tenant_id = :tenantId', { tenantId });
    const rows = await qb.getRawMany();
    return { bySanhabStatus: rows };
  }

  private async auditPermissionUsage(tenantId?: string): Promise<Record<string, any>> {
    const repo = this.dataSource.getRepository('kpi_ingestion_audit');
    const qb = (repo as any).createQueryBuilder('a');
    if (tenantId) qb.andWhere('a.tenant_id = :tenantId', { tenantId });
    qb.orderBy('a.created_at', 'DESC').take(100);
    const rows = await qb.getMany();
    return { recentIngestionEvents: rows };
  }

  private async auditAccessLog(tenantId?: string, startDate?: string, endDate?: string): Promise<Record<string, any>> {
    let qb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'total')
      .addSelect('action', 'action')
      .from('audit_records', 'ar')
      .groupBy('action');
    if (tenantId) qb = qb.andWhere('ar.tenant_id = :tenantId', { tenantId });
    if (startDate && endDate) {
      qb = qb.andWhere('ar.created_at >= :startDate', { startDate }).andWhere('ar.created_at <= :endDate', { endDate });
    }
    const rows = await qb.getRawMany();
    return { byAction: rows };
  }

  private async auditDataModifications(tenantId?: string, startDate?: string, endDate?: string): Promise<Record<string, any>> {
    let qb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'total')
      .addSelect('entity_type', 'entityType')
      .addSelect('action', 'action')
      .from('audit_records', 'ar')
      .where("action IN ('create', 'update', 'delete')")
      .groupBy('entity_type, action');
    if (tenantId) qb = qb.andWhere('ar.tenant_id = :tenantId', { tenantId });
    if (startDate && endDate) {
      qb = qb.andWhere('ar.created_at >= :startDate', { startDate }).andWhere('ar.created_at <= :endDate', { endDate });
    }
    const rows = await qb.getRawMany();
    return { modifications: rows };
  }

  private async auditConsentLog(tenantId?: string, startDate?: string, endDate?: string): Promise<Record<string, any>> {
    let qb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'total')
      .addSelect('consent_type', 'consentType')
      .addSelect('consent_status', 'consentStatus')
      .from('rm_consent_log', 'cl')
      .groupBy('consent_type, consent_status');
    if (tenantId) qb = qb.andWhere('cl.tenant_id = :tenantId', { tenantId });
    if (startDate && endDate) {
      qb = qb.andWhere('cl.created_at >= :startDate', { startDate }).andWhere('cl.created_at <= :endDate', { endDate });
    }
    const rows = await qb.getRawMany();
    return { consentRecords: rows };
  }
}
