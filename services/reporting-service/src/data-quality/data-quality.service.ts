import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { DataQualityIssue } from '../entities/DataQualityIssue';
import { P6EventProducer } from '../events/p6-event-producer';

export interface DataQualityRule {
  ruleId: string;
  ruleName: string;
  entityType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RunRulesResult {
  rulesRun: number;
  issuesCreated: number;
}

@Injectable()
export class DataQualityService {
  private readonly rules: DataQualityRule[] = [
    { ruleId: 'unique_code_missing', ruleName: 'Active policy missing unique code', entityType: 'policy', severity: 'high' },
    { ruleId: 'negative_premium', ruleName: 'Negative premium amount', entityType: 'policy', severity: 'critical' },
    { ruleId: 'broker_org_missing', ruleName: 'Issued policy missing broker organization', entityType: 'policy', severity: 'medium' },
    { ruleId: 'claim_no_policy', ruleName: 'Claim payment without matching policy', entityType: 'claim', severity: 'high' },
    { ruleId: 'policy_no_payment', ruleName: 'Issued policy without premium payment', entityType: 'policy', severity: 'medium' },
  ];

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly eventProducer: P6EventProducer,
  ) {}

  async listIssues(tenantId?: string, status?: string, limit = 50, offset = 0): Promise<{ rows: DataQualityIssue[]; total: number }> {
    const repo = this.dataSource.getRepository(DataQualityIssue);
    const qb = repo.createQueryBuilder('i');
    if (tenantId) qb.andWhere('i.tenant_id = :tenantId', { tenantId });
    if (status) qb.andWhere('i.status = :status', { status });
    qb.orderBy('i.created_at', 'DESC').take(limit).skip(offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async getIssue(issueId: string, tenantId?: string): Promise<DataQualityIssue | null> {
    const repo = this.dataSource.getRepository(DataQualityIssue);
    const where: any = { issueId };
    if (tenantId) where.tenantId = tenantId;
    return repo.findOne({ where });
  }

  async resolveIssue(issueId: string, actorUserId: string, tenantId?: string): Promise<DataQualityIssue | null> {
    const repo = this.dataSource.getRepository(DataQualityIssue);
    const issue = await this.getIssue(issueId, tenantId);
    if (!issue) return null;
    issue.status = 'resolved';
    issue.resolvedBy = actorUserId;
    issue.resolvedAt = new Date();
    const saved = await repo.save(issue);
    await this.eventProducer.publishDataQualityIssueResolved(saved.issueId, actorUserId, tenantId);
    return saved;
  }

  async runReconciliation(tenantId?: string): Promise<RunRulesResult> {
    const repo = this.dataSource.getRepository(DataQualityIssue);
    let totalIssues = 0;

    for (const rule of this.rules) {
      const issues = await this.evaluateRule(rule, tenantId);
      for (const issue of issues) {
        const existing = await repo.findOne({
          where: {
            tenantId: issue.tenantId || null,
            ruleId: issue.ruleId,
            entityType: issue.entityType,
            entityId: issue.entityId,
            status: 'open',
          } as any,
        });
        if (!existing) {
          const row = repo.create({ ...issue, issueId: uuidv4() });
          await repo.save(row);
          await this.eventProducer.publishDataQualityIssueDetected(row.issueId, row.ruleId, row.severity, tenantId);
          totalIssues++;
        }
      }
    }

    return { rulesRun: this.rules.length, issuesCreated: totalIssues };
  }

  private async evaluateRule(rule: DataQualityRule, tenantId?: string): Promise<Partial<DataQualityIssue>[]> {
    switch (rule.ruleId) {
      case 'unique_code_missing':
        return this.findPoliciesWithoutUniqueCode(tenantId);
      case 'negative_premium':
        return this.findNegativePremiums(tenantId);
      case 'broker_org_missing':
        return this.findMissingBrokerOrg(tenantId);
      case 'claim_no_policy':
        return this.findClaimPaymentsWithoutPolicy(tenantId);
      case 'policy_no_payment':
        return this.findPoliciesWithoutPayment(tenantId);
      default:
        return [];
    }
  }

  private async findPoliciesWithoutUniqueCode(tenantId?: string): Promise<Partial<DataQualityIssue>[]> {
    let qb = this.dataSource
      .createQueryBuilder()
      .select(['policy_id', 'policy_number', 'tenant_id'])
      .from('rm_policies', 'p')
      .where("status = 'active'")
      .andWhere('unique_code IS NULL');
    if (tenantId) qb = qb.andWhere('p.tenant_id = :tenantId', { tenantId });
    const rows = await qb.getRawMany();
    return rows.map((r: any) => ({
      ruleId: 'unique_code_missing',
      ruleName: 'Active policy missing unique code',
      entityType: 'policy',
      entityId: String(r.policy_id),
      severity: 'high' as const,
      issueMessage: `Policy ${r.policy_number} is active but has no unique code`,
      payload: { policyNumber: r.policy_number },
      tenantId: r.tenant_id,
    }));
  }

  private async findNegativePremiums(tenantId?: string): Promise<Partial<DataQualityIssue>[]> {
    let qb = this.dataSource
      .createQueryBuilder()
      .select(['policy_id', 'policy_number', 'premium_amount', 'tenant_id'])
      .from('rm_policies', 'p')
      .where('premium_amount < 0');
    if (tenantId) qb = qb.andWhere('p.tenant_id = :tenantId', { tenantId });
    const rows = await qb.getRawMany();
    return rows.map((r: any) => ({
      ruleId: 'negative_premium',
      ruleName: 'Negative premium amount',
      entityType: 'policy',
      entityId: String(r.policy_id),
      severity: 'critical' as const,
      issueMessage: `Policy ${r.policy_number} has negative premium ${r.premium_amount}`,
      payload: { policyNumber: r.policy_number, premiumAmount: r.premium_amount },
      tenantId: r.tenant_id,
    }));
  }

  private async findMissingBrokerOrg(tenantId?: string): Promise<Partial<DataQualityIssue>[]> {
    let qb = this.dataSource
      .createQueryBuilder()
      .select(['policy_id', 'policy_number', 'tenant_id'])
      .from('rm_policies', 'p')
      .where('issued_at IS NOT NULL')
      .andWhere('broker_organization_id IS NULL');
    if (tenantId) qb = qb.andWhere('p.tenant_id = :tenantId', { tenantId });
    const rows = await qb.getRawMany();
    return rows.map((r: any) => ({
      ruleId: 'broker_org_missing',
      ruleName: 'Issued policy missing broker organization',
      entityType: 'policy',
      entityId: String(r.policy_id),
      severity: 'medium' as const,
      issueMessage: `Policy ${r.policy_number} is issued without broker organization`,
      payload: { policyNumber: r.policy_number },
      tenantId: r.tenant_id,
    }));
  }

  private async findClaimPaymentsWithoutPolicy(tenantId?: string): Promise<Partial<DataQualityIssue>[]> {
    let qb = this.dataSource
      .createQueryBuilder()
      .select(['cp.claim_id', 'cp.claim_number', 'cp.tenant_id'])
      .from('rm_claim_payments', 'cp')
      .leftJoin('rm_policies', 'p', 'p.policy_id = cp.policy_id')
      .where('p.policy_id IS NULL');
    if (tenantId) qb = qb.andWhere('cp.tenant_id = :tenantId', { tenantId });
    const rows = await qb.getRawMany();
    return rows.map((r: any) => ({
      ruleId: 'claim_no_policy',
      ruleName: 'Claim payment without matching policy',
      entityType: 'claim',
      entityId: String(r.claim_id),
      severity: 'high' as const,
      issueMessage: `Claim payment ${r.claim_number} has no matching policy`,
      payload: { claimNumber: r.claim_number },
      tenantId: r.tenant_id,
    }));
  }

  private async findPoliciesWithoutPayment(tenantId?: string): Promise<Partial<DataQualityIssue>[]> {
    let qb = this.dataSource
      .createQueryBuilder()
      .select(['p.policy_id', 'p.policy_number', 'p.premium_amount', 'p.tenant_id'])
      .from('rm_policies', 'p')
      .leftJoin('rm_payments', 'pay', 'pay.policy_id = p.policy_id AND pay.payment_type = :premium', { premium: 'premium' })
      .where('p.issued_at IS NOT NULL')
      .andWhere('pay.payment_id IS NULL');
    if (tenantId) qb = qb.andWhere('p.tenant_id = :tenantId', { tenantId });
    const rows = await qb.getRawMany();
    return rows.map((r: any) => ({
      ruleId: 'policy_no_payment',
      ruleName: 'Issued policy without premium payment',
      entityType: 'policy',
      entityId: String(r.policy_id),
      severity: 'medium' as const,
      issueMessage: `Policy ${r.policy_number} issued without premium payment`,
      payload: { policyNumber: r.policy_number, premiumAmount: r.premium_amount },
      tenantId: r.tenant_id,
    }));
  }
}
