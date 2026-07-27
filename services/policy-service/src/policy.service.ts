import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OutboxPublisher } from '@insurance/shared';
import { Policy } from './entities/Policy';
import { PolicyChange } from './entities/PolicyChange';
import { PolicyInquiry } from './entities/PolicyInquiry';
import { PolicyRenewal, type RenewalStatus } from './entities/PolicyRenewal';
import { auditLogger } from './audit.logger';

@Injectable()
export class PolicyService {
  // OutboxPublisher is now created per-operation inside transactions

  private getPaymentsServiceUrl(): string | null {
    const url = process.env.PAYMENTS_SERVICE_URL;
    if (typeof url === 'string' && url.length > 0) return url;
    return null;
  }

  private async nextPolicyNumber(): Promise<string> {
    try {
      const result = await this.dataSource.query("SELECT nextval('policy_number_seq') as seq");
      const seq = parseInt(result[0]?.seq ?? '0', 10);
      if (seq > 0) {
        return `PLC-${new Date().getFullYear()}-${String(seq).padStart(8, '0')}`;
      }
    } catch {
      // Fallback if sequence doesn't exist yet
    }
    return `PLC-${new Date().getFullYear()}-${Date.now().toString(36).slice(-8).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Policy) private readonly policyRepo: Repository<Policy>,
    @InjectRepository(PolicyChange) private readonly changeRepo: Repository<PolicyChange>,
    @InjectRepository(PolicyInquiry) private readonly inquiryRepo: Repository<PolicyInquiry>,
    @InjectRepository(PolicyRenewal) private readonly renewalRepo: Repository<PolicyRenewal>
  ) {
  }

  private async publishPolicyEvent(params: {
    topic: string;
    eventType: string;
    correlationId: string;
    policy: Policy;
    payload?: Record<string, unknown>;
    outbox: OutboxPublisher;
  }): Promise<void> {
    await params.outbox.publish({
      topic: params.topic,
      eventType: params.eventType,
      eventVersion: 1,
      correlationId: params.correlationId,
      subject: {
        policyId: params.policy.policyId,
        policyNumber: params.policy.policyNumber,
        tenantId: params.policy.tenantId || undefined,
      },
      payload: {
        policyId: params.policy.policyId,
        policyNumber: params.policy.policyNumber,
        tenantId: params.policy.tenantId || undefined,
        uniqueCode: params.policy.uniqueCode,
        status: params.policy.status,
        partyId: params.policy.partyId,
        producerOrgUnitId: params.policy.producerOrgUnitId,
        lineOfBusiness: params.policy.lineOfBusiness,
        startDate: params.policy.startDate?.toISOString?.(),
        endDate: params.policy.endDate?.toISOString?.(),
        premiumAmount: params.policy.premiumAmount,
        createdAt: params.policy.createdAt?.toISOString?.(),
        updatedAt: params.policy.updatedAt?.toISOString?.(),
        ...(params.payload || {}),
      },
    });
  }

  private assertAllowedStates(action: string, current: Policy['status'], allowed: Array<Policy['status']>) {
    if (!allowed.includes(current)) {
      const err: any = new Error(`Invalid state transition for ${action}: current=${current}`);
      err.code = 'INVALID_STATE';
      err.details = { action, current, allowed };
      throw err;
    }
  }

  private assertTenantMatch(policy: Policy, tenantId: string | null | undefined, action: string): void {
    if (!tenantId) return;
    if (policy.tenantId && policy.tenantId !== tenantId) {
      const err: any = new Error(`Tenant mismatch for ${action}: policy belongs to another tenant`);
      err.code = 'FORBIDDEN';
      throw err;
    }
  }

  private requireCorrelationId(correlationId?: string): string {
    if (typeof correlationId === 'string' && correlationId.length > 0) return correlationId;
    return uuidv4();
  }

  private validatePolicyDates(startDate: string, endDate: string): void {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      const err: any = new Error('Invalid policy dates');
      err.code = 'VALIDATION_ERROR';
      err.details = { startDate, endDate };
      throw err;
    }
    if (end.getTime() <= start.getTime()) {
      const err: any = new Error('endDate must be after startDate');
      err.code = 'VALIDATION_ERROR';
      err.details = { startDate, endDate };
      throw err;
    }
  }

  private validatePremium(premium: number): void {
    if (typeof premium !== 'number' || !Number.isFinite(premium) || premium <= 0) {
      const err: any = new Error('premiumAmount must be a positive finite number');
      err.code = 'VALIDATION_ERROR';
      err.details = { premiumAmount: premium };
      throw err;
    }
  }

  private getUnderwritingUrl(): string | null {
    const url = process.env.UNDERWRITING_URL;
    if (typeof url === 'string' && url.length > 0) return url;
    return null;
  }

  private assertNotCancelled(action: string, current: Policy['status']) {
    if (current === 'cancelled') {
      const err: any = new Error(`Invalid state transition for ${action}: current=${current}`);
      err.code = 'INVALID_STATE';
      err.details = { action, current, allowed: [] };
      throw err;
    }
  }

  private mapSanhabReasonCode(latest: PolicyInquiry | null): string {
    if (!latest) return 'SANHAB_NO_INQUIRY';
    const rc = String(latest.resultCode || 'UNKNOWN').toUpperCase();
    if (rc.includes('NOT_FOUND') || rc === 'NO_POLICY') return 'SANHAB_NOT_FOUND';
    if (rc.includes('MISMATCH') || rc.includes('NOT_MATCH')) return 'SANHAB_MISMATCH';
    if (rc.includes('DELAY') || rc.includes('PENDING')) return 'SANHAB_DELAY';
    return `SANHAB_${rc}`;
  }

  private detectInquiryMethod(body: { nationalId?: string; uniqueCode?: string; policyNumber?: string; vin?: string }): PolicyInquiry['method'] {
    const hasNat = typeof body?.nationalId === 'string' && body.nationalId.trim().length > 0;
    const hasUc = typeof body?.uniqueCode === 'string' && body.uniqueCode.trim().length > 0;
    if (hasNat && hasUc) return 'nationalId_uniqueCode';
    if (typeof body?.policyNumber === 'string' && body.policyNumber.trim().length > 0) return 'policyNumber';
    if (typeof body?.vin === 'string' && body.vin.trim().length > 0) return 'vin';
    return 'unknown';
  }

  private async createSanhabFollowupWorkItem(params: {
    policyId: string;
    inquiry: PolicyInquiry | null;
    correlationId: string;
    tenantId?: string;
    actorUserId?: string | null;
    authorization?: string;
  }): Promise<{ workItemId: string | null; workItemSagaId: string | null }> {
    if (params.inquiry?.workItemId) {
      return { workItemId: params.inquiry.workItemId, workItemSagaId: params.inquiry.workItemSagaId };
    }

    const orchUrl = this.getOrchestratorUrl();
    if (!orchUrl || !params.authorization) return { workItemId: null, workItemSagaId: null };

    try {
      const reasonCode = this.mapSanhabReasonCode(params.inquiry);
      const wiRes = await fetch(`${orchUrl}/work-items/sanhab-followup`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-correlation-id': params.correlationId,
          ...(params.tenantId ? { 'x-tenant-id': params.tenantId } : {}),
          ...(params.actorUserId ? { 'x-user-id': params.actorUserId } : {}),
          authorization: params.authorization,
        },
        body: JSON.stringify({
          policyId: params.policyId,
          reasonCode,
          inquiry: params.inquiry?.query || {},
          result: params.inquiry
            ? { resultCode: params.inquiry.resultCode, payload: params.inquiry.payload }
            : { resultCode: 'NO_INQUIRY' },
          priority: 'high',
        }),
      });

      const wiJson = (await wiRes.json().catch(() => null)) as any;
      if (wiRes.ok && wiJson && wiJson.success === true && wiJson.data?.workItemId) {
        const workItemId = String(wiJson.data.workItemId);
        const workItemSagaId = wiJson.data?.sagaId ? String(wiJson.data.sagaId) : null;
        return { workItemId, workItemSagaId };
      }
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.warn('policy.integration.orchestrator.work_item.create.failed', {
        correlationId: params.correlationId,
        tenantId: params.tenantId,
        actorUserId: params.actorUserId,
        policyId: params.policyId,
        errorMessage: err.message,
      });
    }

    return { workItemId: null, workItemSagaId: null };
  }

  async getPolicyTimeline(params: {
    policyId: string;
    tenantId?: string;
    limit: number;
    offset: number;
    includeChanges: boolean;
    includeInquiries: boolean;
  }): Promise<{ rows: any[]; total: number }> {
    const take = Math.min(params.limit || 50, 200);
    const skip = params.offset || 0;

    const fetchCount = take + skip;

    const [changesResult, inquiriesResult] = await Promise.all([
      params.includeChanges
        ? this.listPolicyChanges({ policyId: params.policyId, tenantId: params.tenantId, limit: fetchCount, offset: 0 })
        : Promise.resolve({ rows: [] as any[], total: 0 }),
      params.includeInquiries
        ? this.listSanhabInquiries({ policyId: params.policyId, tenantId: params.tenantId, limit: fetchCount, offset: 0 })
        : Promise.resolve({ rows: [] as any[], total: 0 }),
    ]);

    const combined = [] as any[];
    for (const c of changesResult.rows) {
      combined.push({
        kind: 'change',
        id: c.changeId,
        createdAt: c.createdAt,
        data: c,
      });
    }
    for (const i of inquiriesResult.rows) {
      combined.push({
        kind: 'inquiry',
        id: i.inquiryId,
        createdAt: i.createdAt,
        data: i,
      });
    }

    combined.sort((a, b) => {
      const at = new Date(a.createdAt).getTime();
      const bt = new Date(b.createdAt).getTime();
      if (bt !== at) return bt - at;
      return String(b.id).localeCompare(String(a.id));
    });

    const rows = combined.slice(skip, skip + take);
    const total = (changesResult.total || 0) + (inquiriesResult.total || 0);
    return { rows, total };
  }

  private getRegulatoryUrl(): string {
    const url = process.env.REGULATORY_GATEWAY_URL || process.env.REGULATORY_URL;
    if (typeof url === 'string' && url.length > 0) return url;
    if (process.env.NODE_ENV === 'production') {
      const err: any = new Error('REGULATORY_GATEWAY_URL is required in production');
      err.code = 'CONFIGURATION_ERROR';
      throw err;
    }
    // Development only: explicit unset means integration is not configured.
    const err: any = new Error('REGULATORY_GATEWAY_URL is not configured');
    err.code = 'SANHAB_NOT_CONFIGURED';
    throw err;
  }

  private getOrchestratorUrl(): string | null {
    const url = process.env.ORCHESTRATOR_URL;
    if (typeof url === 'string' && url.length > 0) return url;
    return null;
  }

  private async getLatestInquiry(policyId: string): Promise<PolicyInquiry | null> {
    return await this.inquiryRepo.findOne({ where: { policyId }, order: { createdAt: 'DESC' as any } });
  }

  private async ensureSanhabQualityGate(params: {
    policyId: string;
    correlationId: string;
    tenantId?: string;
    actorUserId?: string | null;
    authorization?: string;
    action: 'issue' | 'set_unique_code';
  }): Promise<{ latestInquiry: PolicyInquiry | null; workItemId?: string | null; workItemSagaId?: string | null }> {
    const latest = await this.getLatestInquiry(params.policyId);

    const overrideType = params.action === 'issue' ? 'quality_gate_override_issue' : 'quality_gate_override_set_unique_code';
    const override = await this.changeRepo.findOne({ where: { policyId: params.policyId, type: overrideType as any }, order: { createdAt: 'DESC' as any } });
    if (override) {
      const gateTime = latest ? latest.createdAt : new Date(0);
      if (override.createdAt > gateTime) {
        return { latestInquiry: latest, workItemId: latest?.workItemId || null, workItemSagaId: latest?.workItemSagaId || null };
      }
    }

    if (latest && latest.resultCode === 'OK') {
      // Inquiry freshness check: provider TTL (default 5 minutes); expiry recorded in expires_at wins.
      const now = Date.now();
      const ttl = latest.expiresAt ? new Date(latest.expiresAt).getTime() : new Date(latest.createdAt).getTime() + 5 * 60 * 1000;
      if (now > ttl) {
        const err: any = new Error('SANHAB inquiry result has expired');
        err.code = 'QUALITY_GATE_FAILED';
        err.details = { inquiryId: latest.inquiryId, expiredAt: new Date(ttl).toISOString() };
        throw err;
      }
      // Idempotency: same provider correlation is required for issue/set_unique_code action.
      if (!latest.providerCorrelationId && !latest.providerSignature) {
        const err: any = new Error('SANHAB inquiry missing provider correlation/signature');
        err.code = 'QUALITY_GATE_FAILED';
        err.details = { inquiryId: latest.inquiryId };
        throw err;
      }
      return { latestInquiry: latest, workItemId: latest.workItemId, workItemSagaId: latest.workItemSagaId };
    }

    // Create follow-up work item (if possible) to route operational handling.
    let workItemId: string | null | undefined = latest?.workItemId;
    let workItemSagaId: string | null | undefined = latest?.workItemSagaId;

    const orchUrl = this.getOrchestratorUrl();
    if (!workItemId && orchUrl && params.authorization) {
      try {
        const reasonCode = this.mapSanhabReasonCode(latest);
        const wiRes = await fetch(`${orchUrl}/work-items/sanhab-followup`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-correlation-id': params.correlationId,
            ...(params.tenantId ? { 'x-tenant-id': params.tenantId } : {}),
            ...(params.actorUserId ? { 'x-user-id': params.actorUserId } : {}),
            authorization: params.authorization,
          },
          body: JSON.stringify({
            policyId: params.policyId,
            reasonCode,
            inquiry: latest?.query || {},
            result: latest ? { resultCode: latest.resultCode, payload: latest.payload } : { resultCode: 'NO_INQUIRY' },
            priority: 'high',
          }),
        });

        const wiJson = (await wiRes.json().catch(() => null)) as any;
        if (wiRes.ok && wiJson && wiJson.success === true && wiJson.data?.workItemId) {
          workItemId = String(wiJson.data.workItemId);
          workItemSagaId = wiJson.data?.sagaId ? String(wiJson.data.sagaId) : null;
        }
      } catch {
        // ignore
      }
    }

    // Persist linkage for traceability.
    if (workItemId) {
      if (latest) {
        if (!latest.workItemId) {
          latest.workItemId = workItemId;
          latest.workItemSagaId = workItemSagaId || null;
          await this.inquiryRepo.save(latest);
        }
      } else {
        const synthetic = this.inquiryRepo.create({
          inquiryId: uuidv4(),
          policyId: params.policyId,
          method: 'unknown',
          query: {},
          resultCode: 'NO_INQUIRY',
          payload: null,
          workItemId,
          workItemSagaId: workItemSagaId || null,
          correlationId: params.correlationId,
          createdAt: new Date(),
        });
        await this.inquiryRepo.save(synthetic);
      }
    }

    const err: any = new Error(
      latest
        ? `Quality gate failed for ${params.action}: latest SANHAB inquiry result is ${latest.resultCode}`
        : `Quality gate failed for ${params.action}: missing SANHAB inquiry`
    );
    err.code = 'QUALITY_GATE_FAILED';
    err.details = {
      policyId: params.policyId,
      action: params.action,
      latestInquiry: latest
        ? {
            inquiryId: latest.inquiryId,
            resultCode: latest.resultCode,
            createdAt: latest.createdAt,
            workItemId: latest.workItemId,
            workItemSagaId: latest.workItemSagaId,
          }
        : null,
      workItemId: workItemId || null,
      workItemSagaId: workItemSagaId || null,
    };
    throw err;
  }

  async quote(params: {
    partyId: string;
    lineOfBusiness: string;
    startDate: string;
    endDate: string;
    coverages?: any;
    deductibles?: any;
    installments?: any;
    premiumAmount: number;
    tenantId?: string;
    correlationId?: string;
    producerOrgUnitId?: string | null;
    idempotencyKey?: string;
  }): Promise<Policy> {
    this.validatePolicyDates(params.startDate, params.endDate);
    this.validatePremium(params.premiumAmount);
    const correlationId = this.requireCorrelationId(params.correlationId);

    if (params.idempotencyKey) {
      const existing = await this.policyRepo.findOne({ where: { idempotencyKey: params.idempotencyKey } as any });
      if (existing) {
        this.assertTenantMatch(existing, params.tenantId, 'quote');
        return existing;
      }
    }

    return await this.dataSource.transaction(async (manager) => {
      const policy = this.policyRepo.create({
        policyId: uuidv4(),
        tenantId: params.tenantId ?? null,
        policyNumber: await this.nextPolicyNumber(),
        uniqueCode: null,
        status: 'inquiry',
        partyId: params.partyId,
        producerOrgUnitId: params.producerOrgUnitId ?? null,
        lineOfBusiness: params.lineOfBusiness,
        startDate: new Date(params.startDate),
        endDate: new Date(params.endDate),
        premiumAmount: params.premiumAmount,
        coverages: params.coverages ?? null,
        deductibles: params.deductibles ?? null,
        installments: params.installments ?? null,
        applicationData: null,
        riskAssessment: null,
        idempotencyKey: params.idempotencyKey || null,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await manager.getRepository(Policy).save(policy);

      await this.publishPolicyEvent({
        topic: 'insurance.policy.quoted',
        eventType: 'PolicyQuoted',
        correlationId,
        policy,
        outbox: new OutboxPublisher(manager),
      });

      return policy;
    });
  }

  async listPolicyChanges(params: { policyId: string; tenantId?: string; limit: number; offset: number }): Promise<{ rows: PolicyChange[]; total: number }> {
    const take = Math.min(params.limit || 50, 200);
    const skip = params.offset || 0;

    const qb = this.changeRepo.createQueryBuilder('c');
    qb.where('c.policy_id = :policyId', { policyId: params.policyId });
    if (params.tenantId) qb.andWhere('c.tenant_id = :tenantId', { tenantId: params.tenantId });
    qb.orderBy('c.created_at', 'DESC')
      .take(take)
      .skip(skip);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async submitDocs(params: {
    policyId: string;
    applicationData: Record<string, any>;
    tenantId?: string;
    actorUserId?: string | null;
    correlationId?: string;
  }): Promise<Policy | null> {
    const correlationId = this.requireCorrelationId(params.correlationId);

    return await this.dataSource.transaction(async (manager) => {
      const policy = await manager.getRepository(Policy).findOne({
        where: { policyId: params.policyId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!policy) return null;

      this.assertTenantMatch(policy, params.tenantId, 'submit_docs');
      this.assertNotCancelled('submit_docs', policy.status);

      if (policy.status !== 'inquiry') {
        const err: any = new Error(`Invalid state transition: ${policy.status} -> docs_pending`);
        err.code = 'INVALID_STATE';
        throw err;
      }

      policy.applicationData = params.applicationData;
      policy.status = 'docs_pending';
      policy.updatedAt = new Date();
      await manager.getRepository(Policy).save(policy);

      await this.publishPolicyEvent({
        topic: 'insurance.policy.docs_submitted',
        eventType: 'PolicyDocsSubmitted',
        correlationId,
        policy,
        outbox: new OutboxPublisher(manager),
      });

      return policy;
    });
  }

  async riskAssess(params: {
    policyId: string;
    riskAssessment: Record<string, any>;
    correlationId?: string;
    tenantId?: string;
    actorUserId?: string | null;
    authorization?: string;
  }): Promise<Policy | null> {
    const correlationId = this.requireCorrelationId(params.correlationId);

    const updatedPolicy = await this.dataSource.transaction(async (manager) => {
      const policy = await manager.getRepository(Policy).findOne({
        where: { policyId: params.policyId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!policy) return null;

      this.assertTenantMatch(policy, params.tenantId, 'risk_assess');
      this.assertNotCancelled('risk_assess', policy.status);

      if (policy.status !== 'docs_pending') {
        const err: any = new Error(`Invalid state transition: ${policy.status} -> uw_pending`);
        err.code = 'INVALID_STATE';
        throw err;
      }

      policy.riskAssessment = params.riskAssessment;
      policy.status = 'uw_pending';
      policy.updatedAt = new Date();
      await manager.getRepository(Policy).save(policy);

      await this.publishPolicyEvent({
        topic: 'insurance.policy.risk_assessed',
        eventType: 'PolicyRiskAssessed',
        correlationId,
        policy,
        outbox: new OutboxPublisher(manager),
      });

      return policy;
    });

    if (!updatedPolicy) return null;

    // Underwriting request is performed outside the DB transaction to avoid long locks.
    const uwUrl = this.getUnderwritingUrl();
    if (uwUrl && params.authorization) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const res = await fetch(`${uwUrl}/underwriting/requests`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'content-type': 'application/json',
            'x-correlation-id': correlationId,
            ...(params.tenantId ? { 'x-tenant-id': params.tenantId } : {}),
            ...(params.actorUserId ? { 'x-user-id': params.actorUserId } : {}),
            authorization: params.authorization,
          },
          body: JSON.stringify({
            policyId: updatedPolicy.policyId,
            reasonCode: 'policy_stage3_risk_assess',
            input: params.riskAssessment,
          }),
        });
        clearTimeout(timeout);
        const json = (await res.json().catch(() => null)) as any;
        if (res.ok && json && json.success === true) {
          const change = this.changeRepo.create({
            changeId: uuidv4(),
            tenantId: params.tenantId ?? null,
            policyId: updatedPolicy.policyId,
            type: 'underwriting_requested',
            actorUserId: params.actorUserId ?? null,
            correlationId,
            payload: {
              underwritingRequestId: json?.data?.underwritingRequestId || null,
              workItemId: json?.data?.workItemId || null,
              workItemSagaId: json?.data?.workItemSagaId || null,
            },
            createdAt: new Date(),
          });
          await this.changeRepo.save(change);
        }
      } catch (e: any) {
        clearTimeout(timeout);
        const err = e instanceof Error ? e : new Error(String(e));
        auditLogger.warn('policy.integration.underwriting.request.failed', {
          correlationId,
          tenantId: params.tenantId,
          actorUserId: params.actorUserId,
          policyId: updatedPolicy.policyId,
          errorMessage: err.message,
        });
      }
    }

    return updatedPolicy;
  }

  async applyUnderwritingDecision(params: {
    policyId: string;
    decision: 'approved' | 'rejected' | 'escalated';
    notes?: string;
    actorUserId?: string | null;
    tenantId?: string;
    correlationId?: string;
  }): Promise<Policy | null> {
    const correlationId = this.requireCorrelationId(params.correlationId);

    return await this.dataSource.transaction(async (manager) => {
      const policy = await manager.getRepository(Policy).findOne({
        where: { policyId: params.policyId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!policy) return null;

      this.assertTenantMatch(policy, params.tenantId, 'underwriting_decision');
      this.assertNotCancelled('underwriting_decision', policy.status);

      if (policy.status !== 'uw_pending') {
        const err: any = new Error(`Invalid state transition: ${policy.status} -> underwriting_decision`);
        err.code = 'INVALID_STATE';
        throw err;
      }

      if (params.decision === 'approved') {
        policy.status = 'risk_assessed';
      } else if (params.decision === 'rejected') {
        policy.status = 'uw_rejected';
      } else {
        policy.status = 'uw_pending';
      }

      policy.updatedAt = new Date();
      await manager.getRepository(Policy).save(policy);

      const change = manager.getRepository(PolicyChange).create({
        changeId: uuidv4(),
        tenantId: params.tenantId ?? null,
        policyId: policy.policyId,
        type: 'underwriting_decision',
        actorUserId: params.actorUserId ?? null,
        correlationId,
        reason: params.notes || null,
        before: { status: 'uw_pending' },
        after: { status: policy.status, decision: params.decision },
        payload: {
          decision: params.decision,
          notes: params.notes || null,
        },
        createdAt: new Date(),
      });
      await manager.getRepository(PolicyChange).save(change);

      await this.publishPolicyEvent({
        topic: 'insurance.policy.underwriting_decided',
        eventType: 'PolicyUnderwritingDecided',
        correlationId,
        policy,
        payload: {
          decision: params.decision,
          notes: params.notes || null,
        },
        outbox: new OutboxPublisher(manager),
      });

      return policy;
    });
  }

  async issue(params: {
    policyId: string;
    paymentId?: string;
    correlationId?: string;
    tenantId?: string;
    actorUserId?: string | null;
    authorization?: string;
  }): Promise<Policy | null> {
    const correlationId = this.requireCorrelationId(params.correlationId);

    return await this.dataSource.transaction(async (manager) => {
      const policy = await manager.getRepository(Policy).findOne({
        where: { policyId: params.policyId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!policy) return null;

      this.assertTenantMatch(policy, params.tenantId, 'issue');
      this.assertNotCancelled('issue', policy.status);

      if (policy.status !== 'risk_assessed') {
        const err: any = new Error(`Invalid state transition: ${policy.status} -> issued`);
        err.code = 'INVALID_STATE';
        throw err;
      }

      const paymentsUrl = this.getPaymentsServiceUrl();
      if (!paymentsUrl) {
        const err: any = new Error('Payments service is not configured');
        err.code = 'PAYMENT_SERVICE_UNAVAILABLE';
        throw err;
      }

      if (!params.paymentId) {
        const err: any = new Error('paymentId is required to verify premium payment');
        err.code = 'PAYMENT_REQUIRED';
        throw err;
      }

      let paymentStatus: any = null;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const verifyHeaders: Record<string, string> = { 'content-type': 'application/json' };
        if (params.authorization) verifyHeaders['authorization'] = params.authorization;
        if (params.tenantId) verifyHeaders['x-tenant-id'] = params.tenantId;
        const res = await fetch(`${paymentsUrl}/api/v1/ecosystem/payments/${params.paymentId}`, {
          method: 'GET',
          signal: controller.signal,
          headers: verifyHeaders,
        });
        clearTimeout(timeout);
        paymentStatus = (await res.json().catch(() => ({}))) as any;
        if (!res.ok) {
          const err: any = new Error(paymentStatus?.error?.message || 'Payments service returned an error');
          err.code = 'PAYMENT_SERVICE_ERROR';
          throw err;
        }
      } catch (e: any) {
        const caught = e as any;
        const err = caught?.code ? caught : new Error('Payments service unreachable');
        (err as any).code = (err as any).code || 'PAYMENT_SERVICE_UNAVAILABLE';
        throw err;
      }

      const paymentData = paymentStatus?.data || paymentStatus || {};
      const status = String(paymentData.status || '').toLowerCase();
      const settledStatuses = new Set(['settled', 'paid', 'confirmed', 'executed', 'success']);
      if (!settledStatuses.has(status)) {
        const err: any = new Error(`Premium payment not settled: ${status}`);
        err.code = 'PAYMENT_REQUIRED';
        err.details = { paymentId: params.paymentId, status };
        throw err;
      }

      if (paymentData.policyId && paymentData.policyId !== policy.policyId) {
        const err: any = new Error('Payment policyId does not match');
        err.code = 'PAYMENT_MISMATCH';
        throw err;
      }
      if (paymentData.tenantId && paymentData.tenantId !== policy.tenantId) {
        const err: any = new Error('Payment tenantId does not match');
        err.code = 'PAYMENT_MISMATCH';
        throw err;
      }
      if (paymentData.amount !== undefined && policy.premiumAmount !== undefined && Number(paymentData.amount) !== Number(policy.premiumAmount)) {
        const err: any = new Error('Payment amount does not match policy premium');
        err.code = 'PAYMENT_MISMATCH';
        throw err;
      }

      await this.ensureSanhabQualityGate({
        policyId: policy.policyId,
        correlationId,
        tenantId: params.tenantId,
        actorUserId: params.actorUserId,
        authorization: params.authorization,
        action: 'issue',
      });

      policy.status = 'issued';
      policy.updatedAt = new Date();
      await manager.getRepository(Policy).save(policy);

      await this.publishPolicyEvent({
        topic: 'insurance.policy.issued',
        eventType: 'PolicyIssued',
        correlationId,
        policy,
        payload: { paymentId: params.paymentId },
        outbox: new OutboxPublisher(manager),
      });

      return policy;
    });
  }

  async setUniqueCode(params: {
    policyId: string;
    uniqueCode: string;
    actorUserId?: string | null;
    correlationId?: string;
    tenantId?: string;
    authorization?: string;
  }): Promise<Policy | null> {
    const correlationId = this.requireCorrelationId(params.correlationId);

    return await this.dataSource.transaction(async (manager) => {
      const policy = await manager.getRepository(Policy).findOne({
        where: { policyId: params.policyId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!policy) return null;

      this.assertTenantMatch(policy, params.tenantId, 'set_unique_code');
      this.assertNotCancelled('set_unique_code', policy.status);

      if (policy.status !== 'issued') {
        const err: any = new Error(`Invalid state transition: ${policy.status} -> active`);
        err.code = 'INVALID_STATE';
        throw err;
      }

      await this.ensureSanhabQualityGate({
        policyId: policy.policyId,
        correlationId,
        tenantId: params.tenantId,
        actorUserId: params.actorUserId,
        authorization: params.authorization,
        action: 'set_unique_code',
      });

      policy.uniqueCode = params.uniqueCode;
      policy.status = 'active';
      policy.updatedAt = new Date();
      await manager.getRepository(Policy).save(policy);

      await this.publishPolicyEvent({
        topic: 'insurance.policy.unique_code_set',
        eventType: 'PolicyUniqueCodeSet',
        correlationId,
        policy,
        payload: { uniqueCode: params.uniqueCode },
        outbox: new OutboxPublisher(manager),
      });

      const change = manager.getRepository(PolicyChange).create({
        changeId: uuidv4(),
        tenantId: params.tenantId ?? null,
        policyId: policy.policyId,
        type: 'unique_code_set',
        actorUserId: params.actorUserId ?? null,
        correlationId,
        reason: 'Sanhab registration completed',
        before: { status: 'issued', uniqueCode: null },
        after: { status: 'active', uniqueCode: params.uniqueCode },
        payload: { uniqueCode: params.uniqueCode },
        createdAt: new Date(),
      });
      await manager.getRepository(PolicyChange).save(change);

      return policy;
    });
  }

  async endorse(params: {
    policyId: string;
    endorsementType: 'coverage_change' | 'premium_change' | 'beneficiary_change' | 'address_change' | 'vehicle_change' | 'other';
    payload: Record<string, any>;
    effectiveDate?: string;
    reason?: string;
    actorUserId?: string | null;
    tenantId?: string;
    correlationId?: string;
  }): Promise<Policy | null> {
    const correlationId = this.requireCorrelationId(params.correlationId);

    return await this.dataSource.transaction(async (manager) => {
      const policy = await manager.getRepository(Policy).findOne({
        where: { policyId: params.policyId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!policy) return null;

      this.assertTenantMatch(policy, params.tenantId, 'endorse');
      this.assertNotCancelled('endorse', policy.status);
      this.assertAllowedStates('endorse', policy.status, ['active']);

      const before = {
        coverages: policy.coverages,
        premiumAmount: policy.premiumAmount,
        endDate: policy.endDate,
        applicationData: policy.applicationData,
      };

      const endorsementPayload: Record<string, any> = {
        type: params.endorsementType,
        effectiveDate: params.effectiveDate || new Date().toISOString(),
        reason: params.reason,
        changes: params.payload,
        previousValues: {},
      };

      if (!params.payload || typeof params.payload !== 'object') {
        const err: any = new Error('payload is required (object)');
        err.code = 'VALIDATION_ERROR';
        throw err;
      }

      policy.applicationData = policy.applicationData || {};

      if (params.endorsementType === 'coverage_change') {
        endorsementPayload.previousValues = { coverages: policy.coverages };
        policy.coverages = { ...(policy.coverages || {}), ...params.payload };
      } else if (params.endorsementType === 'premium_change') {
        const newPremium = params.payload.newPremiumAmount;
        if (newPremium === undefined || newPremium === null) {
          const err: any = new Error('newPremiumAmount is required for premium_change');
          err.code = 'VALIDATION_ERROR';
          throw err;
        }
        if (typeof newPremium !== 'number' || !Number.isFinite(newPremium) || newPremium <= 0) {
          const err: any = new Error('newPremiumAmount must be a positive finite number');
          err.code = 'VALIDATION_ERROR';
          throw err;
        }
        endorsementPayload.previousValues = { premiumAmount: policy.premiumAmount };
        policy.premiumAmount = newPremium;
        if (params.payload.newEndDate) {
          this.validatePolicyDates(policy.startDate.toISOString(), params.payload.newEndDate);
          policy.endDate = new Date(params.payload.newEndDate);
        }
      } else if (params.endorsementType === 'beneficiary_change') {
        if (!params.payload.beneficiary) {
          const err: any = new Error('beneficiary is required for beneficiary_change');
          err.code = 'VALIDATION_ERROR';
          throw err;
        }
        endorsementPayload.previousValues = { beneficiary: policy.applicationData?.beneficiary };
        policy.applicationData.beneficiary = params.payload.beneficiary;
      } else if (params.endorsementType === 'address_change') {
        if (!params.payload.address) {
          const err: any = new Error('address is required for address_change');
          err.code = 'VALIDATION_ERROR';
          throw err;
        }
        endorsementPayload.previousValues = { address: policy.applicationData?.address };
        policy.applicationData.address = params.payload.address;
      } else if (params.endorsementType === 'vehicle_change') {
        if (!params.payload.vehicle) {
          const err: any = new Error('vehicle is required for vehicle_change');
          err.code = 'VALIDATION_ERROR';
          throw err;
        }
        endorsementPayload.previousValues = { vehicle: policy.applicationData?.vehicle };
        policy.applicationData.vehicle = params.payload.vehicle;
      }

      policy.status = 'endorsed';
      policy.updatedAt = new Date();
      await manager.getRepository(Policy).save(policy);

      const after = {
        coverages: policy.coverages,
        premiumAmount: policy.premiumAmount,
        endDate: policy.endDate,
        applicationData: policy.applicationData,
      };

      await this.publishPolicyEvent({
        topic: 'insurance.policy.endorsed',
        eventType: 'PolicyEndorsed',
        correlationId,
        policy,
        payload: endorsementPayload,
        outbox: new OutboxPublisher(manager),
      });

      const change = manager.getRepository(PolicyChange).create({
        changeId: uuidv4(),
        tenantId: params.tenantId ?? null,
        policyId: policy.policyId,
        type: 'endorsement',
        actorUserId: params.actorUserId ?? null,
        correlationId,
        reason: params.reason || null,
        before,
        after,
        payload: endorsementPayload,
        createdAt: new Date(),
      });
      await manager.getRepository(PolicyChange).save(change);

      return policy;
    });
  }

  async listEndorsements(params: { policyId: string; tenantId?: string; limit: number; offset: number }): Promise<{ rows: PolicyChange[]; total: number }> {
    const take = Math.min(params.limit || 50, 200);
    const skip = params.offset || 0;

    const qb = this.changeRepo.createQueryBuilder('c');
    qb.where('c.policy_id = :policyId', { policyId: params.policyId });
    if (params.tenantId) qb.andWhere('c.tenant_id = :tenantId', { tenantId: params.tenantId });
    qb.andWhere('c.type = :type', { type: 'endorsement' })
      .orderBy('c.created_at', 'DESC')
      .take(take)
      .skip(skip);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async convertQuoteToPolicy(params: {
    quote: {
      productId: string;
      partyId: string;
      lineOfBusiness: string;
      startDate: string;
      endDate: string;
      premiumAmount: number;
      coverages?: any;
      deductibles?: any;
      installments?: any;
      exposure?: Record<string, any>;
    };
    producerOrgUnitId?: string | null;
    actorUserId?: string | null;
    tenantId?: string;
    correlationId?: string;
    idempotencyKey?: string;
  }): Promise<Policy> {
    this.validatePolicyDates(params.quote.startDate, params.quote.endDate);
    this.validatePremium(params.quote.premiumAmount);
    const correlationId = this.requireCorrelationId(params.correlationId);

    if (params.idempotencyKey) {
      const existing = await this.policyRepo.findOne({ where: { idempotencyKey: params.idempotencyKey } as any });
      if (existing) {
        this.assertTenantMatch(existing, params.tenantId, 'convert_quote');
        return existing;
      }
    }

    return await this.dataSource.transaction(async (manager) => {
      const policy = this.policyRepo.create({
        policyId: uuidv4(),
        tenantId: params.tenantId ?? null,
        policyNumber: await this.nextPolicyNumber(),
        uniqueCode: null,
        status: 'inquiry',
        partyId: params.quote.partyId,
        producerOrgUnitId: params.producerOrgUnitId ?? null,
        lineOfBusiness: params.quote.lineOfBusiness,
        startDate: new Date(params.quote.startDate),
        endDate: new Date(params.quote.endDate),
        premiumAmount: params.quote.premiumAmount,
        coverages: params.quote.coverages ?? null,
        deductibles: params.quote.deductibles ?? null,
        installments: params.quote.installments ?? null,
        applicationData: {
          ...params.quote.exposure,
          quoteSource: 'product_service',
          productId: params.quote.productId,
        },
        riskAssessment: null,
        autoRenew: false,
        renewalCount: 0,
        maxRenewals: 10,
        renewalParentId: null,
        renewalReminderSentAt: null,
        renewalNotifiedAt: null,
        idempotencyKey: params.idempotencyKey || null,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await manager.getRepository(Policy).save(policy);

      await this.publishPolicyEvent({
        topic: 'insurance.policy.quoted',
        eventType: 'PolicyQuoted',
        correlationId,
        policy,
        outbox: new OutboxPublisher(manager),
      });

      return policy;
    });
  }

  async cancel(params: {
    policyId: string;
    reason?: string;
    actorUserId?: string | null;
    tenantId?: string;
    correlationId?: string;
  }): Promise<Policy | null> {
    const correlationId = this.requireCorrelationId(params.correlationId);

    return await this.dataSource.transaction(async (manager) => {
      const policy = await manager.getRepository(Policy).findOne({
        where: { policyId: params.policyId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!policy) return null;

      this.assertTenantMatch(policy, params.tenantId, 'cancel');
      this.assertNotCancelled('cancel', policy.status);
      this.assertAllowedStates('cancel', policy.status, ['issued', 'active']);

      policy.status = 'cancelled';
      policy.updatedAt = new Date();
      await manager.getRepository(Policy).save(policy);

      await this.publishPolicyEvent({
        topic: 'insurance.policy.cancelled',
        eventType: 'PolicyCancelled',
        correlationId,
        policy,
        payload: { reason: params.reason || null },
        outbox: new OutboxPublisher(manager),
      });

      const change = manager.getRepository(PolicyChange).create({
        changeId: uuidv4(),
        tenantId: params.tenantId ?? null,
        policyId: policy.policyId,
        type: 'cancellation',
        actorUserId: params.actorUserId ?? null,
        correlationId,
        reason: params.reason || null,
        before: { status: policy.status },
        after: { status: 'cancelled' },
        payload: { reason: params.reason || null },
        createdAt: new Date(),
      });
      await manager.getRepository(PolicyChange).save(change);

      return policy;
    });
  }

  async renew(params: {
    policyId: string;
    newEndDate?: string;
    newPremium?: number;
    actorUserId?: string | null;
    tenantId?: string;
    correlationId?: string;
  }): Promise<Policy | null> {
    const correlationId = this.requireCorrelationId(params.correlationId);

    return await this.dataSource.transaction(async (manager) => {
      const policyRepo = manager.getRepository(Policy);
      const policy = await policyRepo.findOne({
        where: { policyId: params.policyId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!policy) return null;

      this.assertTenantMatch(policy, params.tenantId, 'renew');
      this.assertNotCancelled('renew', policy.status);
      this.assertAllowedStates('renew', policy.status, ['active']);

      if (policy.renewalCount >= policy.maxRenewals) {
        const err: any = new Error('Maximum number of renewals reached');
        err.code = 'RENEWAL_LIMIT_REACHED';
        throw err;
      }

      const startDate = new Date(policy.endDate.getTime() + 1);
      const endDate = params.newEndDate ? new Date(params.newEndDate) : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
      this.validatePolicyDates(startDate.toISOString(), endDate.toISOString());

      policy.status = 'renewed';
      policy.updatedAt = new Date();
      await policyRepo.save(policy);

      const newPremium = params.newPremium ?? policy.premiumAmount;
      this.validatePremium(newPremium);

      const newPolicy = policyRepo.create({
        policyId: uuidv4(),
        tenantId: policy.tenantId,
        policyNumber: await this.nextPolicyNumber(),
        uniqueCode: null,
        partyId: policy.partyId,
        producerOrgUnitId: policy.producerOrgUnitId,
        lineOfBusiness: policy.lineOfBusiness,
        status: 'inquiry',
        startDate,
        endDate,
        premiumAmount: newPremium,
        coverages: policy.coverages,
        deductibles: policy.deductibles,
        installments: policy.installments,
        applicationData: policy.applicationData,
        riskAssessment: policy.riskAssessment,
        autoRenew: policy.autoRenew,
        renewalCount: (policy.renewalCount || 0) + 1,
        maxRenewals: policy.maxRenewals,
        renewalParentId: policy.policyId,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await policyRepo.save(newPolicy);

      await this.publishPolicyEvent({
        topic: 'insurance.policy.renewed',
        eventType: 'PolicyRenewed',
        correlationId,
        policy: newPolicy,
        payload: { oldPolicyId: policy.policyId, newPolicyId: newPolicy.policyId, newEndDate: params.newEndDate || null },
        outbox: new OutboxPublisher(manager),
      });

      const change = manager.getRepository(PolicyChange).create({
        changeId: uuidv4(),
        tenantId: params.tenantId ?? null,
        policyId: policy.policyId,
        type: 'renewal',
        actorUserId: params.actorUserId ?? null,
        correlationId,
        payload: { oldPolicyId: policy.policyId, newPolicyId: newPolicy.policyId, newEndDate: endDate.toISOString() },
        createdAt: new Date(),
      });
      await manager.getRepository(PolicyChange).save(change);

      return newPolicy;
    });
  }

  async getPolicy(policyId: string, tenantId?: string): Promise<Policy | null> {
    const where: any = { policyId };
    if (tenantId) where.tenantId = tenantId;
    const policy = await this.policyRepo.findOne({ where });
    if (!policy) return null;
    if (tenantId && policy.tenantId && policy.tenantId !== tenantId) return null;
    return policy;
  }

  async listPolicies(params: {
    partyId?: string;
    uniqueCode?: string;
    tenantId?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: Policy[]; total: number }> {
    const qb = this.policyRepo.createQueryBuilder('p');
    if (params.tenantId) qb.andWhere('p.tenant_id = :tenantId', { tenantId: params.tenantId });
    if (params.partyId) qb.andWhere('p.party_id = :partyId', { partyId: params.partyId });
    if (params.uniqueCode) qb.andWhere('p.unique_code = :uniqueCode', { uniqueCode: params.uniqueCode });

    qb.orderBy('p.updated_at', 'DESC').limit(params.limit).offset(params.offset);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async sanhabInquiry(params: {
    policyId: string;
    actorUserId?: string | null;
    tenantId?: string;
    correlationId?: string;
    authorization?: string;
    body: { nationalId?: string; uniqueCode?: string; policyNumber?: string; vin?: string };
  }): Promise<{ inquiry: PolicyInquiry; response: any }> {
    const policy = await this.policyRepo.findOne({ where: { policyId: params.policyId } });
    if (!policy) {
      const err: any = new Error('Policy not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    this.assertTenantMatch(policy, params.tenantId, 'sanhab_inquiry');
    const correlationId = this.requireCorrelationId(params.correlationId);
    const queryHash = this.hashObject(params.body || {});

    const url = this.getRegulatoryUrl();
    const res = await fetch(`${url}/reg/sanhab/inquiry`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': correlationId,
        ...(params.tenantId ? { 'x-tenant-id': params.tenantId } : {}),
        ...(params.actorUserId ? { 'x-user-id': params.actorUserId } : {}),
        ...(params.authorization ? { authorization: params.authorization } : {}),
      },
      body: JSON.stringify(params.body || {}),
    });

    const json = (await res.json().catch(() => null)) as any;
    if (!res.ok || !json || json.success !== true) {
      const msg = json?.error?.message || `Regulatory inquiry failed (HTTP ${res.status})`;
      const err: any = new Error(msg);
      err.code = json?.error?.code || 'UPSTREAM_ERROR';

      const inquiry = this.inquiryRepo.create({
        inquiryId: uuidv4(),
        tenantId: params.tenantId ?? null,
        policyId: policy.policyId,
        method: this.detectInquiryMethod(params.body || {}),
        query: params.body || {},
        queryHash,
        resultCode: String(err.code),
        payload: json && typeof json === 'object' ? json : null,
        workItemId: null,
        workItemSagaId: null,
        correlationId,
        createdAt: new Date(),
      });

      const { workItemId, workItemSagaId } = await this.createSanhabFollowupWorkItem({
        policyId: policy.policyId,
        inquiry,
        correlationId,
        tenantId: params.tenantId,
        actorUserId: params.actorUserId,
        authorization: params.authorization,
      });
      if (workItemId) {
        inquiry.workItemId = workItemId;
        inquiry.workItemSagaId = workItemSagaId;
      }

      const saved = await this.inquiryRepo.save(inquiry);
      err.details = { inquiryId: saved.inquiryId, workItemId: saved.workItemId, workItemSagaId: saved.workItemSagaId };
      throw err;
    }

    const data = json.data || {};
    const method = (data.method as string) || 'unknown';
    const resultCode = (data.resultCode as string) || 'UNKNOWN';
    const payload = (data.payload as any) || null;
    const wiId = typeof data.workItemId === 'string' ? data.workItemId : null;
    const wiSagaId = typeof data.workItemSagaId === 'string' ? data.workItemSagaId : null;
    const providerCorrelationId = typeof data.providerCorrelationId === 'string' ? data.providerCorrelationId : (typeof data.correlationId === 'string' ? data.correlationId : null);
    const providerSignature = typeof data.providerSignature === 'string' ? data.providerSignature : null;
    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : new Date(Date.now() + 5 * 60 * 1000);

    const inquiry = this.inquiryRepo.create({
      inquiryId: uuidv4(),
      tenantId: params.tenantId ?? null,
      policyId: policy.policyId,
      method: (method as any) || this.detectInquiryMethod(params.body || {}),
      query: data.inquiry || params.body || {},
      queryHash,
      resultCode,
      payload,
      workItemId: wiId,
      workItemSagaId: wiSagaId,
      providerCorrelationId,
      providerSignature,
      expiresAt,
      correlationId,
      createdAt: new Date(),
    });

    if (resultCode !== 'OK' && !inquiry.workItemId) {
      const { workItemId, workItemSagaId } = await this.createSanhabFollowupWorkItem({
        policyId: policy.policyId,
        inquiry,
        correlationId,
        tenantId: params.tenantId,
        actorUserId: params.actorUserId,
        authorization: params.authorization,
      });
      if (workItemId) {
        inquiry.workItemId = workItemId;
        inquiry.workItemSagaId = workItemSagaId;
      }
    }

    const saved = await this.inquiryRepo.save(inquiry);
    return { inquiry: saved, response: data };
  }

  async sanhabSmsInquiry(params: {
    actorUserId?: string | null;
    tenantId?: string;
    correlationId?: string;
    authorization?: string;
    body: {
      nationalId?: string;
      uniqueCode?: string;
      policyNumber?: string;
      vin?: string;
      phoneNumber?: string;
    };
  }): Promise<{ inquiry: PolicyInquiry; response: any }> {
    const correlationId = params.correlationId || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const url = this.getRegulatoryUrl();
    const res = await fetch(`${url}/reg/sanhab/inquiry`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': correlationId,
        ...(params.tenantId ? { 'x-tenant-id': params.tenantId } : {}),
        ...(params.actorUserId ? { 'x-user-id': params.actorUserId } : {}),
        ...(params.authorization ? { authorization: params.authorization } : {}),
      },
      body: JSON.stringify({
        nationalId: params.body.nationalId,
        uniqueCode: params.body.uniqueCode,
        policyNumber: params.body.policyNumber,
        vin: params.body.vin,
      }),
    });

    const json = (await res.json().catch(() => null)) as any;
    if (!res.ok || !json || json.success !== true) {
      const msg = json?.error?.message || `Regulatory SMS inquiry failed (HTTP ${res.status})`;
      const err: any = new Error(msg);
      err.code = json?.error?.code || 'UPSTREAM_ERROR';

      const inquiry = this.inquiryRepo.create({
        inquiryId: uuidv4(),
        policyId: null,
        method: this.detectInquiryMethod({
          nationalId: params.body.nationalId,
          uniqueCode: params.body.uniqueCode,
          policyNumber: params.body.policyNumber,
          vin: params.body.vin,
        }),
        query: {
          nationalId: params.body.nationalId,
          uniqueCode: params.body.uniqueCode,
          policyNumber: params.body.policyNumber,
          vin: params.body.vin,
          phoneNumber: params.body.phoneNumber,
        },
        resultCode: String(err.code),
        payload: json && typeof json === 'object' ? json : null,
        workItemId: null,
        workItemSagaId: null,
        correlationId,
        createdAt: new Date(),
      });

      const saved = await this.inquiryRepo.save(inquiry);
      err.details = { inquiryId: saved.inquiryId };
      throw err;
    }

    const data = json.data || {};
    const method = (data.method as string) || 'unknown';
    const resultCode = (data.resultCode as string) || 'UNKNOWN';
    const payload = (data.payload as any) || null;

    const inquiry = this.inquiryRepo.create({
      inquiryId: uuidv4(),
      policyId: null,
      method: (method as any) || this.detectInquiryMethod({
        nationalId: params.body.nationalId,
        uniqueCode: params.body.uniqueCode,
        policyNumber: params.body.policyNumber,
        vin: params.body.vin,
      }),
      query: {
        nationalId: params.body.nationalId,
        uniqueCode: params.body.uniqueCode,
        policyNumber: params.body.policyNumber,
        vin: params.body.vin,
        phoneNumber: params.body.phoneNumber,
      },
      resultCode,
      payload,
      workItemId: null,
      workItemSagaId: null,
      correlationId,
      createdAt: new Date(),
    });

    const saved = await this.inquiryRepo.save(inquiry);
    return { inquiry: saved, response: data };
  }

  async listSanhabInquiries(params: { policyId?: string; tenantId?: string; limit: number; offset: number }): Promise<{ rows: PolicyInquiry[]; total: number }> {
    const take = Math.min(params.limit || 50, 200);
    const skip = params.offset || 0;

    const qb = this.inquiryRepo.createQueryBuilder('i');
    if (params.policyId) qb.where('i.policy_id = :policyId', { policyId: params.policyId });
    if (params.tenantId) qb.andWhere('i.tenant_id = :tenantId', { tenantId: params.tenantId });
    qb.orderBy('i.created_at', 'DESC')
      .take(take)
      .skip(skip);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async qualityGateOverride(params: {
    policyId: string;
    actorUserId?: string | null;
    tenantId?: string;
    correlationId?: string;
    overrideAction: 'issue' | 'set_unique_code';
    reason: string;
  }): Promise<{ changeId: string; policyId: string; type: string; createdAt: Date } | null> {
    if (!params.reason || params.reason.length < 10) {
      const err: any = new Error('Override reason is required (min 10 chars)');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    const correlationId = this.requireCorrelationId(params.correlationId);

    const policy = await this.policyRepo.findOne({ where: { policyId: params.policyId } });
    if (!policy) return null;
    this.assertTenantMatch(policy, params.tenantId, 'quality_gate_override');

    const type = params.overrideAction === 'issue' ? 'quality_gate_override_issue' : 'quality_gate_override_set_unique_code';
    const change = this.changeRepo.create({
      changeId: uuidv4(),
      tenantId: params.tenantId ?? null,
      policyId: policy.policyId,
      type: type as any,
      actorUserId: params.actorUserId ?? null,
      correlationId,
      reason: params.reason,
      payload: { reason: params.reason, action: params.overrideAction },
      createdAt: new Date(),
    });

    const saved = await this.changeRepo.save(change);
    return { changeId: saved.changeId, policyId: saved.policyId, type: saved.type, createdAt: saved.createdAt };
  }

  // Auto-renewal methods
  async setAutoRenew(params: {
    policyId: string;
    autoRenew: boolean;
    maxRenewals?: number;
    actorUserId?: string | null;
    tenantId?: string;
    correlationId?: string;
  }): Promise<Policy> {
    const correlationId = this.requireCorrelationId(params.correlationId);

    return await this.dataSource.transaction(async (manager) => {
      const policy = await manager.getRepository(Policy).findOne({
        where: { policyId: params.policyId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!policy) {
        const err: any = new Error('Policy not found');
        err.code = 'NOT_FOUND';
        throw err;
      }

      this.assertTenantMatch(policy, params.tenantId, 'set_auto_renew');
      this.assertAllowedStates('set_auto_renew', policy.status, ['active', 'issued']);

      policy.autoRenew = params.autoRenew;
      if (params.maxRenewals !== undefined && params.maxRenewals > 0) {
        policy.maxRenewals = params.maxRenewals;
      }
      policy.updatedAt = new Date();

      await manager.getRepository(Policy).save(policy);

      await this.publishPolicyEvent({
        topic: params.autoRenew ? 'insurance.policy.auto_renew_enabled' : 'insurance.policy.auto_renew_disabled',
        eventType: params.autoRenew ? 'AutoRenewEnabled' : 'AutoRenewDisabled',
        correlationId,
        policy,
        payload: {
          actorUserId: params.actorUserId,
          maxRenewals: policy.maxRenewals,
        },
        outbox: new OutboxPublisher(manager),
      });

      const change = manager.getRepository(PolicyChange).create({
        changeId: uuidv4(),
        tenantId: params.tenantId ?? null,
        policyId: policy.policyId,
        type: 'auto_renew_updated',
        actorUserId: params.actorUserId ?? null,
        correlationId,
        reason: `autoRenew changed to ${params.autoRenew}`,
        before: { autoRenew: !params.autoRenew },
        after: { autoRenew: params.autoRenew, maxRenewals: policy.maxRenewals },
        payload: { autoRenew: params.autoRenew, maxRenewals: policy.maxRenewals },
        createdAt: new Date(),
      });
      await manager.getRepository(PolicyChange).save(change);

      auditLogger.info('policy.auto_renew.updated', {
        policyId: params.policyId,
        autoRenew: params.autoRenew,
        actorUserId: params.actorUserId,
      });

      return policy;
    });
  }

  async scheduleRenewal(params: {
    policyId: string;
    newStartDate: Date;
    newEndDate: Date;
    newPremium?: number;
    type?: 'automatic' | 'manual' | 'scheduled';
    actorUserId?: string | null;
    tenantId?: string;
    notes?: string;
  }): Promise<PolicyRenewal> {
    const policy = await this.policyRepo.findOne({ where: { policyId: params.policyId } });
    if (!policy) {
      const err: any = new Error('Policy not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    this.assertTenantMatch(policy, params.tenantId, 'schedule_renewal');

    if (policy.status !== 'active') {
      const err: any = new Error('Policy must be active to schedule renewal');
      err.code = 'INVALID_STATE';
      throw err;
    }

    if (policy.renewalCount >= policy.maxRenewals) {
      const err: any = new Error('Maximum number of renewals reached');
      err.code = 'RENEWAL_LIMIT_REACHED';
      throw err;
    }

    this.validatePolicyDates(params.newStartDate.toISOString(), params.newEndDate.toISOString());

    const newPremium = params.newPremium ?? policy.premiumAmount;
    if (newPremium !== undefined && newPremium !== policy.premiumAmount) {
      this.validatePremium(newPremium);
    }

    const renewal = this.renewalRepo.create({
      renewalId: uuidv4(),
      tenantId: params.tenantId ?? null,
      policyId: params.policyId,
      parentPolicyId: policy.renewalParentId,
      newPolicyId: null,
      type: params.type || 'manual',
      status: 'pending' as RenewalStatus,
      previousStartDate: policy.startDate,
      previousEndDate: policy.endDate,
      newStartDate: params.newStartDate,
      newEndDate: params.newEndDate,
      previousPremium: policy.premiumAmount,
      newPremium,
      premiumAdjustmentReason: params.notes || null,
      dueDate: params.newStartDate,
      reminderSentAt: null,
      reminderCount: 0,
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
      notes: params.notes || null,
      createdAt: new Date(),
    });

    await this.renewalRepo.save(renewal);

    auditLogger.info('policy.renewal.scheduled', {
      policyId: params.policyId,
      renewalId: renewal.renewalId,
      type: renewal.type,
      actorUserId: params.actorUserId,
    });

    return renewal;
  }

  async approveRenewal(params: {
    renewalId: string;
    actorUserId: string;
    tenantId?: string;
    correlationId?: string;
    reason?: string;
  }): Promise<PolicyRenewal> {
    const correlationId = this.requireCorrelationId(params.correlationId);

    return await this.dataSource.transaction(async (manager) => {
      const renewal = await manager.getRepository(PolicyRenewal).findOne({
        where: { renewalId: params.renewalId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!renewal) {
        const err: any = new Error('Renewal not found');
        err.code = 'NOT_FOUND';
        throw err;
      }

      if (params.tenantId && renewal.tenantId && renewal.tenantId !== params.tenantId) {
        const err: any = new Error('Tenant mismatch');
        err.code = 'FORBIDDEN';
        throw err;
      }

      if (renewal.status !== 'pending' && renewal.status !== 'reminder_sent') {
        const err: any = new Error('Renewal must be in pending or reminder_sent state');
        err.code = 'INVALID_STATE';
        throw err;
      }

      const policy = await manager.getRepository(Policy).findOne({
        where: { policyId: renewal.policyId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!policy) {
        const err: any = new Error('Policy not found');
        err.code = 'NOT_FOUND';
        throw err;
      }

      this.assertTenantMatch(policy, params.tenantId, 'approve_renewal');

      if (policy.renewalCount >= policy.maxRenewals) {
        const err: any = new Error('Maximum number of renewals reached');
        err.code = 'RENEWAL_LIMIT_REACHED';
        throw err;
      }

      this.validatePolicyDates(renewal.newStartDate.toISOString(), renewal.newEndDate.toISOString());

      const newPolicy = manager.getRepository(Policy).create({
        policyId: uuidv4(),
        tenantId: policy.tenantId,
        policyNumber: await this.nextPolicyNumber(),
        uniqueCode: null,
        status: 'inquiry',
        partyId: policy.partyId,
        producerOrgUnitId: policy.producerOrgUnitId,
        lineOfBusiness: policy.lineOfBusiness,
        startDate: renewal.newStartDate,
        endDate: renewal.newEndDate,
        premiumAmount: renewal.newPremium ?? policy.premiumAmount,
        coverages: policy.coverages,
        deductibles: policy.deductibles,
        installments: policy.installments,
        applicationData: policy.applicationData,
        riskAssessment: policy.riskAssessment,
        autoRenew: policy.autoRenew,
        renewalCount: (policy.renewalCount || 0) + 1,
        maxRenewals: policy.maxRenewals,
        renewalParentId: policy.policyId,
        renewalReminderSentAt: null,
        renewalNotifiedAt: null,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await manager.getRepository(Policy).save(newPolicy);

      policy.status = 'renewed';
      policy.updatedAt = new Date();
      await manager.getRepository(Policy).save(policy);

      renewal.status = 'completed';
      renewal.newPolicyId = newPolicy.policyId;
      renewal.approvedBy = params.actorUserId;
      renewal.approvedAt = new Date();
      await manager.getRepository(PolicyRenewal).save(renewal);

      await this.publishPolicyEvent({
        topic: 'insurance.policy.renewed',
        eventType: 'PolicyRenewed',
        correlationId,
        policy: newPolicy,
        payload: {
          originalPolicyId: policy.policyId,
          renewalId: renewal.renewalId,
          approvedBy: params.actorUserId,
          previousEndDate: renewal.previousEndDate,
          newStartDate: renewal.newStartDate,
        },
        outbox: new OutboxPublisher(manager),
      });

      auditLogger.info('policy.renewal.approved', {
        policyId: policy.policyId,
        renewalId: renewal.renewalId,
        newPolicyId: newPolicy.policyId,
        actorUserId: params.actorUserId,
      });

      return renewal;
    });
  }

  async rejectRenewal(params: {
    renewalId: string;
    actorUserId: string;
    tenantId?: string;
    reason: string;
  }): Promise<PolicyRenewal> {
    const renewal = await this.renewalRepo.findOne({ where: { renewalId: params.renewalId } });
    if (!renewal) {
      const err: any = new Error('Renewal not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (params.tenantId && renewal.tenantId && renewal.tenantId !== params.tenantId) {
      const err: any = new Error('Tenant mismatch');
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (renewal.status !== 'pending' && renewal.status !== 'reminder_sent') {
      const err: any = new Error('Renewal must be in pending or reminder_sent state');
      err.code = 'INVALID_STATE';
      throw err;
    }

    if (!params.reason) {
      const err: any = new Error('Rejection reason is required');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    renewal.status = 'rejected';
    renewal.rejectionReason = params.reason;
    renewal.notes = params.reason;
    await this.renewalRepo.save(renewal);

    auditLogger.info('policy.renewal.rejected', {
      policyId: renewal.policyId,
      renewalId: renewal.renewalId,
      actorUserId: params.actorUserId,
      reason: params.reason,
    });

    return renewal;
  }

  async getRenewals(params: { policyId?: string; tenantId?: string; status?: string; limit: number; offset: number }): Promise<{ rows: PolicyRenewal[]; total: number }> {
    const qb = this.renewalRepo.createQueryBuilder('r');
    if (params.tenantId) qb.andWhere('r.tenant_id = :tenantId', { tenantId: params.tenantId });
    if (params.policyId) qb.andWhere('r.policy_id = :pid', { pid: params.policyId });
    if (params.status) qb.andWhere('r.status = :st', { st: params.status });
    qb.orderBy('r.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async getPoliciesForRenewal(params: { tenantId?: string; daysBeforeExpiry: number; limit: number; offset: number }): Promise<{ rows: Policy[]; total: number }> {
    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() + params.daysBeforeExpiry);

    const qb = this.policyRepo.createQueryBuilder('p');
    if (params.tenantId) qb.andWhere('p.tenant_id = :tenantId', { tenantId: params.tenantId });
    qb.where('p.status IN (:...statuses)', { statuses: ['active', 'issued'] })
      .andWhere('p.auto_renew = :autoRenew', { autoRenew: true })
      .andWhere('p.end_date <= :cutoffDate', { cutoffDate })
      .andWhere('p.end_date >= :now', { now })
      .andWhere('(p.renewal_count IS NULL OR p.renewal_count < p.max_renewals)')
      .orderBy('p.end_date', 'ASC')
      .limit(params.limit)
      .offset(params.offset);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async sendRenewalReminder(params: { renewalId: string; tenantId?: string; actorUserId?: string; correlationId?: string }): Promise<PolicyRenewal> {
    const correlationId = this.requireCorrelationId(params.correlationId);

    return await this.dataSource.transaction(async (manager) => {
      const renewal = await manager.getRepository(PolicyRenewal).findOne({
        where: { renewalId: params.renewalId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!renewal) {
        const err: any = new Error('Renewal not found');
        err.code = 'NOT_FOUND';
        throw err;
      }

      if (params.tenantId && renewal.tenantId && renewal.tenantId !== params.tenantId) {
        const err: any = new Error('Tenant mismatch');
        err.code = 'FORBIDDEN';
        throw err;
      }

      if (renewal.status !== 'pending') {
        const err: any = new Error('Renewal must be in pending state');
        err.code = 'INVALID_STATE';
        throw err;
      }

      renewal.reminderSentAt = new Date();
      renewal.reminderCount = (renewal.reminderCount || 0) + 1;
      if (renewal.reminderCount >= 1) {
        renewal.status = 'reminder_sent';
      }
      await manager.getRepository(PolicyRenewal).save(renewal);

      const policy = await manager.getRepository(Policy).findOne({ where: { policyId: renewal.policyId } });
      if (policy) {
        policy.renewalReminderSentAt = new Date();
        await manager.getRepository(Policy).save(policy);
      }

      await this.publishPolicyEvent({
        topic: 'insurance.policy.renewal_reminder',
        eventType: 'RenewalReminderSent',
        correlationId,
        policy: policy || undefined,
        payload: {
          renewalId: renewal.renewalId,
          reminderCount: renewal.reminderCount,
          actorUserId: params.actorUserId,
        },
        outbox: new OutboxPublisher(manager),
      });

      auditLogger.info('policy.renewal.reminder_sent', {
        policyId: renewal.policyId,
        renewalId: renewal.renewalId,
        reminderCount: renewal.reminderCount,
      });

      return renewal;
    });
  }

  private hashObject(obj: Record<string, unknown>): string {
    try {
      const str = JSON.stringify(Object.keys(obj ?? {}).sort().reduce((acc, k) => { acc[k] = obj[k]; return acc; }, {} as any));
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
      }
      return hash.toString(16);
    } catch {
      return '0';
    }
  }
}
