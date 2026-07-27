import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UnderwritingRequest } from './entities/UnderwritingRequest';
import { UnderwritingAppetite, RiskLevel, AppetiteDecision } from './entities/UnderwritingAppetite';
import { v4 as uuidv4 } from 'uuid';
import { auditLogger } from './audit.logger';
import { OutboxPublisher } from '@insurance/shared';
import { RiskScoringService } from './risk-scoring/risk-scoring.service';

@Injectable()
export class UnderwritingService {
  private readonly logger = new Logger(UnderwritingService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(UnderwritingRequest) private readonly reqRepo: Repository<UnderwritingRequest>,
    @InjectRepository(UnderwritingAppetite) private readonly appetiteRepo: Repository<UnderwritingAppetite>,
    private readonly riskScoring: RiskScoringService,
  ) {}

  private getOrchestratorUrl(): string | null {
    const url = process.env.ORCHESTRATOR_URL;
    if (typeof url === 'string' && url.length > 0) return url;
    return null;
  }

  private getPolicyServiceUrl(): string | null {
    const url = process.env.POLICY_SERVICE_URL || process.env.API_GATEWAY_URL;
    if (typeof url === 'string' && url.length > 0) return url;
    return null;
  }

  async createRequest(params: {
    policyId: string;
    reasonCode: string;
    input?: Record<string, any>;
    correlationId?: string;
    dueDate?: string;
    tenantId: string;
    actorUserId?: string | null;
    authorization?: string;
    source?: string;
    assignedUnderwriterId?: string;
  }): Promise<UnderwritingRequest> {
    if (!params.tenantId) {
      const err: any = new Error('tenantId is required');
      err.code = 'TENANT_REQUIRED';
      throw err;
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const r = manager.create(UnderwritingRequest, {
        underwritingRequestId: uuidv4(),
        tenantId: params.tenantId,
        policyId: params.policyId,
        status: 'pending',
        reasonCode: params.reasonCode,
        input: params.input || null,
        workItemId: null,
        workItemSagaId: null,
        assignedUnderwriterId: params.assignedUnderwriterId || null,
        decision: null,
        decisionNotes: null,
        escalationReason: null,
        decidedBy: null,
        decidedAt: null,
        result: null,
        riskAssessmentHistory: [],
        dueDate: params.dueDate ? new Date(params.dueDate) : null,
        correlationId: params.correlationId || null,
        source: params.source || null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await manager.save(r);

      await outbox.publish({
        topic: 'insurance.underwriting.request.created',
        eventType: 'UnderwritingRequestCreated',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { underwritingRequestId: r.underwritingRequestId, policyId: params.policyId, tenantId: params.tenantId },
        payload: {
          underwritingRequestId: r.underwritingRequestId,
          tenantId: params.tenantId,
          policyId: params.policyId,
          reasonCode: params.reasonCode,
          status: r.status,
          dueDate: r.dueDate?.toISOString?.() ?? null,
        },
      });

      return r;
    });

    const r = saved;
    const orchUrl = this.getOrchestratorUrl();
    if (orchUrl && params.authorization) {
      try {
        const res = await fetch(`${orchUrl}/work-items/underwriting-review`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-correlation-id': params.correlationId || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            ...(params.tenantId ? { 'x-tenant-id': params.tenantId } : {}),
            ...(params.actorUserId ? { 'x-user-id': params.actorUserId } : {}),
            authorization: params.authorization,
          },
          body: JSON.stringify({
            policyId: params.policyId,
            reasonCode: params.reasonCode,
            context: params.input || null,
            priority: 'high',
            dueDate: params.dueDate || null,
          }),
        });

        const json = (await res.json().catch(() => null)) as any;
        if (res.ok && json && json.success === true && json.data?.workItemId) {
          r.workItemId = String(json.data.workItemId);
          r.workItemSagaId = json.data?.sagaId ? String(json.data.sagaId) : null;
          r.status = 'in_review';
          r.updatedAt = new Date();
          await this.dataSource.transaction(async (manager) => {
            await manager.save(r);
          });
        }
      } catch (err: any) {
        this.logger.error('Orchestrator work item creation failed', err);
      }
    }

    return r;
  }

  async getRequest(underwritingRequestId: string, tenantId: string): Promise<UnderwritingRequest | null> {
    return await this.reqRepo.findOne({ where: { underwritingRequestId, tenantId } });
  }

  async listRequests(params: { status?: string; policyId?: string; tenantId: string; limit: number; offset: number }): Promise<{ rows: UnderwritingRequest[]; total: number }> {
    const take = Math.min(params.limit || 50, 200);
    const skip = params.offset || 0;

    const qb = this.reqRepo.createQueryBuilder('r');
    qb.andWhere('r.tenant_id = :tenantId', { tenantId: params.tenantId });
    if (params.status) qb.andWhere('r.status = :status', { status: params.status });
    if (params.policyId) qb.andWhere('r.policy_id = :policyId', { policyId: params.policyId });

    qb.orderBy('r.created_at', 'DESC').take(take).skip(skip);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async attachWorkItem(params: { underwritingRequestId: string; workItemId: string; workItemSagaId?: string | null; tenantId: string }): Promise<UnderwritingRequest | null> {
    const r = await this.reqRepo.findOne({ where: { underwritingRequestId: params.underwritingRequestId, tenantId: params.tenantId } });
    if (!r) return null;

    if (!r.workItemId) {
      r.workItemId = params.workItemId;
      r.workItemSagaId = params.workItemSagaId || null;
      r.status = 'in_review';
      r.updatedAt = new Date();
      await this.reqRepo.save(r);
    }

    return r;
  }

  async decide(params: {
    underwritingRequestId: string;
    decision: 'approved' | 'rejected' | 'escalated';
    decidedBy: string;
    notes?: string;
    result?: Record<string, any>;
    correlationId?: string;
    tenantId: string;
    actorUserId?: string | null;
    authorization?: string;
  }): Promise<UnderwritingRequest | null> {
    if (!params.tenantId) {
      const err: any = new Error('tenantId is required');
      err.code = 'TENANT_REQUIRED';
      throw err;
    }

    const existing = await this.reqRepo.findOne({ where: { underwritingRequestId: params.underwritingRequestId, tenantId: params.tenantId } });
    if (!existing) return null;

    if (existing.decision) {
      const err: any = new Error('Decision already recorded');
      err.code = 'ALREADY_DECIDED';
      throw err;
    }

    const policyUrl = this.getPolicyServiceUrl();
    if (!policyUrl || !params.authorization) {
      const err: any = new Error('Policy service unavailable');
      err.code = 'POLICY_SERVICE_UNAVAILABLE';
      throw err;
    }

    try {
      const res = await fetch(`${policyUrl}/policies/${existing.policyId}/underwriting/decision`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-correlation-id': params.correlationId || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          ...(params.tenantId ? { 'x-tenant-id': params.tenantId } : {}),
          ...(params.actorUserId ? { 'x-user-id': params.actorUserId } : {}),
          authorization: params.authorization,
        },
        body: JSON.stringify({ decision: params.decision, notes: params.notes || null, decidedBy: params.decidedBy }),
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json || json.success !== true) {
        const err: any = new Error(json?.error?.message || 'Failed to apply underwriting decision to policy');
        err.code = json?.error?.code || 'POLICY_DECISION_FAILED';
        throw err;
      }
    } catch (e: any) {
      const err: any = new Error(e?.message || 'Failed to apply underwriting decision to policy');
      err.code = e?.code || 'POLICY_DECISION_FAILED';
      throw err;
    }

    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const r = await manager.findOne(UnderwritingRequest, { where: { underwritingRequestId: params.underwritingRequestId, tenantId: params.tenantId } });
      if (!r) return null;

      r.decision = params.decision;
      r.decisionNotes = params.notes || null;
      r.decidedBy = params.decidedBy;
      r.decidedAt = new Date();
      r.result = params.result || null;
      r.status = params.decision;
      r.updatedAt = new Date();
      const saved = await manager.save(r);

      await outbox.publish({
        topic: 'insurance.underwriting.decision.made',
        eventType: 'UnderwritingDecisionMade',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { underwritingRequestId: r.underwritingRequestId, policyId: r.policyId, tenantId: r.tenantId },
        payload: {
          underwritingRequestId: r.underwritingRequestId,
          tenantId: r.tenantId,
          policyId: r.policyId,
          decision: r.decision,
          decidedBy: r.decidedBy,
          status: r.status,
          notes: r.decisionNotes,
        },
      });

      return saved;
    });
  }

  // SLA Enforcement
  async checkSlaBreaches(params: {
    hoursOverdue: number;
    limit: number;
    offset: number;
    tenantId: string;
  }): Promise<{ rows: UnderwritingRequest[]; total: number }> {
    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setHours(cutoffDate.getHours() - params.hoursOverdue);

    const qb = this.reqRepo.createQueryBuilder('r');
    qb.where('r.tenant_id = :tenantId', { tenantId: params.tenantId })
      .andWhere('r.status IN (:...statuses)', { statuses: ['pending', 'in_review'] })
      .andWhere('r.due_date IS NOT NULL')
      .andWhere('r.due_date < :cutoffDate', { cutoffDate })
      .orderBy('r.due_date', 'ASC')
      .limit(params.limit)
      .offset(params.offset);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async escalateOverdueReview(params: {
    underwritingRequestId: string;
    actorUserId: string;
    reason: string;
    tenantId: string;
  }): Promise<UnderwritingRequest> {
    return await this.dataSource.transaction(async (manager) => {
      const r = await manager.findOne(UnderwritingRequest, { where: { underwritingRequestId: params.underwritingRequestId, tenantId: params.tenantId } });
      if (!r) {
        const err: any = new Error('Request not found');
        err.code = 'NOT_FOUND';
        throw err;
      }

      if (r.status !== 'pending' && r.status !== 'in_review') {
        const err: any = new Error('Request must be pending or in review to escalate');
        err.code = 'INVALID_STATE';
        throw err;
      }

      r.status = 'escalated';
      r.decision = 'escalated';
      r.escalationReason = params.reason;
      r.decisionNotes = params.reason;
      r.decidedBy = params.actorUserId;
      r.decidedAt = new Date();
      r.updatedAt = new Date();
      await manager.save(r);

      auditLogger.info('underwriting.sla_escalated', {
        underwritingRequestId: r.underwritingRequestId,
        policyId: r.policyId,
        tenantId: r.tenantId,
        actorUserId: params.actorUserId,
        reason: params.reason,
        dueDate: r.dueDate,
      });

      return r;
    });
  }

  async getSlaMetrics(params: {
    tenantId: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<{
    totalPending: number;
    overdueCount: number;
    escalatedCount: number;
    avgResolutionHours: number | null;
    resolutionRate: number;
  }> {
    const now = new Date();
    const fromDate = params.fromDate ? new Date(params.fromDate) : null;
    const toDate = params.toDate ? new Date(params.toDate) : null;

    const totalPending = await this.reqRepo.count({
      where: { tenantId: params.tenantId, status: 'pending' },
    });

    const overdueCount = await this.reqRepo
      .createQueryBuilder('r')
      .where('r.tenant_id = :tenantId', { tenantId: params.tenantId })
      .andWhere('r.status = :status', { status: 'pending' })
      .andWhere('r.due_date IS NOT NULL')
      .andWhere('r.due_date < :now', { now })
      .getCount();

    const escalatedCount = await this.reqRepo.count({
      where: { tenantId: params.tenantId, status: 'escalated' },
    });

    const completedQb = this.reqRepo
      .createQueryBuilder('r')
      .select('AVG(EXTRACT(EPOCH FROM (r.decided_at - r.created_at))/3600)::float', 'avgResolutionHours')
      .addSelect('COUNT(*) FILTER (WHERE r.status IN (:...statuses))::float / NULLIF(COUNT(*), 0)', 'resolutionRate')
      .where('r.tenant_id = :tenantId', { tenantId: params.tenantId })
      .setParameter('statuses', ['approved', 'rejected', 'escalated'])
      .andWhere('r.decided_at IS NOT NULL')
      .andWhere('r.created_at IS NOT NULL');

    if (fromDate) {
      completedQb.andWhere('r.created_at >= :fromDate', { fromDate });
    }
    if (toDate) {
      completedQb.andWhere('r.created_at <= :toDate', { toDate });
    }

    const raw: any = await completedQb.getRawOne();
    const avgResolutionHours = raw?.avgResolutionHours ? Math.round(parseFloat(raw.avgResolutionHours) * 100) / 100 : null;
    const resolutionRate = raw?.resolutionRate ? Math.round(parseFloat(raw.resolutionRate) * 10000) / 100 : 0;

    return {
      totalPending,
      overdueCount,
      escalatedCount,
      avgResolutionHours,
      resolutionRate,
    };
  }

  // Risk Assessment Tools
  async assessRisk(params: {
    underwritingRequestId: string;
    factors: Record<string, any>;
    tenantId: string;
  }): Promise<{ riskScore: number; riskLevel: 'low' | 'medium' | 'high' | 'critical'; factors: Record<string, number>; recommendations: string[] }> {
    const r = await this.reqRepo.findOne({ where: { underwritingRequestId: params.underwritingRequestId, tenantId: params.tenantId } });
    if (!r) { const err: any = new Error('Request not found'); err.code = 'NOT_FOUND'; throw err; }

    const assessment = this.riskScoring.assess(params.tenantId, r.policyId, {
      age: params.factors.age,
      pastClaimsCount: params.factors.pastClaimsCount,
      coverageAmount: params.factors.coverageAmount,
      premiumAmount: params.factors.premiumAmount,
      itemAge: params.factors.itemAge,
      policyType: params.factors.policyType,
    });

    return await this.dataSource.transaction(async (manager) => {
      const request = await manager.findOne(UnderwritingRequest, { where: { underwritingRequestId: params.underwritingRequestId, tenantId: params.tenantId } });
      if (!request) { const err: any = new Error('Request not found'); err.code = 'NOT_FOUND'; throw err; }

      request.result = { ...(request.result || {}), riskAssessment: assessment };
      request.riskAssessmentHistory = [...(request.riskAssessmentHistory || []), assessment];
      request.updatedAt = new Date();
      await manager.save(request);

      return {
        riskScore: assessment.riskScore,
        riskLevel: assessment.riskLevel,
        factors: assessment.factors,
        recommendations: assessment.recommendations,
      };
    });
  }

  async getRiskMatrix(): Promise<{ matrix: Record<string, Record<string, number>>; levels: Record<string, { min: number; max: number; action: string }> }> {
    const matrix: Record<string, Record<string, number>> = {
      age: { '<25': 0.8, '25-35': 0.3, '35-50': 0.2, '50-65': 0.4, '>65': 0.6 },
      claimHistory: { '0': 0.1, '1-2': 0.5, '3+': 0.9 },
      coverageRatio: { '<100': 0.1, '100-500': 0.3, '500-1000': 0.5, '>1000': 0.7 },
      itemAge: { '<5': 0.1, '5-10': 0.3, '10-15': 0.4, '>15': 0.6 },
      policyType: { auto: 0.5, life: 0.3, health: 0.4, fire: 0.4, liability: 0.3, travel: 0.2 },
    };

    const levels: Record<string, { min: number; max: number; action: string }> = {
      low: { min: 0, max: 0.3, action: 'Standard approval process' },
      medium: { min: 0.3, max: 0.5, action: 'Standard approval with additional verification' },
      high: { min: 0.5, max: 0.7, action: 'Enhanced review required - senior underwriter approval' },
      critical: { min: 0.7, max: 1.0, action: 'Decline or refer to reinsurance - maximum scrutiny' },
    };

    return { matrix, levels };
  }

  async getRiskScoringHistory(underwritingRequestId: string, tenantId: string): Promise<Array<{ score: number; level: string; timestamp: string; factors: Record<string, number> }>> {
    const r = await this.reqRepo.findOne({ where: { underwritingRequestId, tenantId } });
    if (!r || !r.riskAssessmentHistory) return [];
    return r.riskAssessmentHistory.map((entry: any) => ({
      score: entry.riskScore,
      level: entry.riskLevel,
      timestamp: entry.assessedAt,
      factors: entry.factors,
    }));
  }

  // ===== Appetite Matrix & Delegated Authority =====

  async createAppetiteRule(params: {
    tenantId: string;
    lineOfBusiness: string;
    productId?: string;
    riskLevel: RiskLevel;
    decision: AppetiteDecision;
    minSumInsured?: number;
    maxSumInsured?: number;
    minPremium?: number;
    maxPremium?: number;
    authorityLevel?: string;
    approverRole?: string;
    priority?: number;
    slaHours?: number;
    correlationId?: string;
  }): Promise<UnderwritingAppetite> {
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const rule = manager.create(UnderwritingAppetite, {
        tenantId: params.tenantId,
        lineOfBusiness: params.lineOfBusiness,
        productId: params.productId || null,
        riskLevel: params.riskLevel,
        decision: params.decision,
        minSumInsured: params.minSumInsured ?? null,
        maxSumInsured: params.maxSumInsured ?? null,
        minPremium: params.minPremium ?? null,
        maxPremium: params.maxPremium ?? null,
        authorityLevel: params.authorityLevel || null,
        approverRole: params.approverRole || null,
        priority: params.priority ?? 0,
        slaHours: params.slaHours ?? 24,
        active: true,
      });
      const saved = await manager.save(rule);

      await outbox.publish({
        topic: 'insurance.underwriting.appetite_rule.created',
        eventType: 'UnderwritingAppetiteRuleCreated',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { ruleId: saved.id, lineOfBusiness: params.lineOfBusiness, tenantId: params.tenantId },
        payload: {
          ruleId: saved.id,
          tenantId: params.tenantId,
          lineOfBusiness: saved.lineOfBusiness,
          productId: saved.productId,
          riskLevel: saved.riskLevel,
          decision: saved.decision,
          minSumInsured: saved.minSumInsured,
          maxSumInsured: saved.maxSumInsured,
          minPremium: saved.minPremium,
          maxPremium: saved.maxPremium,
          priority: saved.priority,
          slaHours: saved.slaHours,
          active: saved.active,
        },
      });

      return saved;
    });
  }

  async evaluateAppetite(params: {
    tenantId: string;
    lineOfBusiness: string;
    productId?: string;
    riskLevel: RiskLevel;
    sumInsured?: number;
    premium?: number;
  }): Promise<{
    decision: AppetiteDecision;
    authorityLevel?: string;
    approverRole?: string;
    slaHours: number;
    matchedRuleId?: string;
  }> {
    const qb = this.appetiteRepo.createQueryBuilder('a')
      .where('a.tenant_id = :tenantId', { tenantId: params.tenantId })
      .andWhere('a.lineOfBusiness = :lob', { lob: params.lineOfBusiness })
      .andWhere('a.riskLevel = :riskLevel', { riskLevel: params.riskLevel })
      .andWhere('a.active = true')
      .orderBy('a.priority', 'DESC')
      .addOrderBy('a.created_at', 'DESC');

    if (params.productId) {
      qb.andWhere('(a.productId = :productId OR a.productId IS NULL)', { productId: params.productId });
    }

    const rules = await qb.getMany();

    for (const rule of rules) {
      const sumInsured = params.sumInsured;
      const premium = params.premium;

      const withinMinSumInsured = rule.minSumInsured === null || rule.minSumInsured === undefined || (sumInsured !== undefined && sumInsured >= rule.minSumInsured);
      const withinMaxSumInsured = rule.maxSumInsured === null || rule.maxSumInsured === undefined || (sumInsured !== undefined && sumInsured <= rule.maxSumInsured);
      const withinMinPremium = rule.minPremium === null || rule.minPremium === undefined || (premium !== undefined && premium >= rule.minPremium);
      const withinMaxPremium = rule.maxPremium === null || rule.maxPremium === undefined || (premium !== undefined && premium <= rule.maxPremium);

      if (withinMinSumInsured && withinMaxSumInsured && withinMinPremium && withinMaxPremium) {
        return {
          decision: rule.decision,
          authorityLevel: rule.authorityLevel || undefined,
          approverRole: rule.approverRole || undefined,
          slaHours: rule.slaHours,
          matchedRuleId: rule.id,
        };
      }
    }

    // Default fallback: refer
    return { decision: 'refer', slaHours: 48 };
  }

  async listAppetiteRules(params: {
    tenantId: string;
    lineOfBusiness?: string;
    productId?: string;
    active?: boolean;
    limit: number;
    offset: number;
  }): Promise<{ rows: UnderwritingAppetite[]; total: number }> {
    const qb = this.appetiteRepo.createQueryBuilder('a');
    qb.where('a.tenant_id = :tenantId', { tenantId: params.tenantId });
    if (params.lineOfBusiness) qb.andWhere('a.lineOfBusiness = :lob', { lob: params.lineOfBusiness });
    if (params.productId) qb.andWhere('a.productId = :productId', { productId: params.productId });
    if (params.active !== undefined) qb.andWhere('a.active = :active', { active: params.active });

    qb.orderBy('a.lineOfBusiness', 'ASC').addOrderBy('a.priority', 'DESC').addOrderBy('a.created_at', 'DESC');
    qb.take(params.limit).skip(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async updateAppetiteRule(
    params: {
      id: string;
      tenantId: string;
      correlationId?: string;
      updates: Partial<Pick<UnderwritingAppetite, 'decision' | 'minSumInsured' | 'maxSumInsured' | 'minPremium' | 'maxPremium' | 'authorityLevel' | 'approverRole' | 'priority' | 'slaHours' | 'active'>>;
    }
  ): Promise<UnderwritingAppetite | null> {
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const rule = await manager.findOne(UnderwritingAppetite, { where: { id: params.id, tenantId: params.tenantId } });
      if (!rule) return null;
      Object.assign(rule, params.updates);
      rule.updatedAt = new Date();
      const saved = await manager.save(rule);

      await outbox.publish({
        topic: 'insurance.underwriting.appetite_rule.updated',
        eventType: 'UnderwritingAppetiteRuleUpdated',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { ruleId: saved.id, tenantId: params.tenantId },
        payload: {
          ruleId: saved.id,
          tenantId: params.tenantId,
          lineOfBusiness: saved.lineOfBusiness,
          updates: params.updates,
        },
      });

      return saved;
    });
  }

  async deleteAppetiteRule(params: { id: string; tenantId: string; correlationId?: string }): Promise<boolean> {
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const rule = await manager.findOne(UnderwritingAppetite, { where: { id: params.id, tenantId: params.tenantId } });
      if (!rule) return false;

      await manager.remove(rule);

      await outbox.publish({
        topic: 'insurance.underwriting.appetite_rule.deleted',
        eventType: 'UnderwritingAppetiteRuleDeleted',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { ruleId: params.id, tenantId: params.tenantId },
        payload: {
          ruleId: params.id,
          tenantId: params.tenantId,
          lineOfBusiness: rule.lineOfBusiness,
        },
      });

      return true;
    });
  }
}
