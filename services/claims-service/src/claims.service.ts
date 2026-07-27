import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Claim } from './entities/Claim';
import { OutboxPublisher, consumeOnce, EventEnvelope, circuitBreakerRegistry } from '@insurance/shared';
import { auditLogger } from './audit.logger';

@Injectable()
export class ClaimsService {
  private readonly logger = new Logger(ClaimsService.name);
  private outboxPublisher: OutboxPublisher;
  private cachedServiceToken: string | null = null;
  private cachedServiceTokenExpMs: number = 0;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Claim) private readonly claimRepo: Repository<Claim>
  ) {
    this.outboxPublisher = new OutboxPublisher(this.dataSource);
  }

  private getOrchestratorUrl(): string | null {
    const url = process.env.ORCHESTRATOR_URL;
    if (typeof url === 'string' && url.length > 0) return url;
    return null;
  }

  private getAuthServiceUrl(): string | null {
    const url = process.env.AUTH_SERVICE_URL;
    if (typeof url === 'string' && url.length > 0) return url;
    return null;
  }

  private getPolicyServiceUrl(): string | null {
    const url = process.env.POLICY_SERVICE_URL;
    if (typeof url === 'string' && url.length > 0) return url;
    return null;
  }

  private getPartyKycServiceUrl(): string | null {
    const url = process.env.PARTY_KYC_SERVICE_URL;
    if (typeof url === 'string' && url.length > 0) return url;
    return null;
  }

  private async getServiceToken(params: { correlationId: string }): Promise<string | null> {
    const now = Date.now();
    if (this.cachedServiceToken && now < this.cachedServiceTokenExpMs) return this.cachedServiceToken;

    const authUrl = this.getAuthServiceUrl();
    const issuerKey = process.env.SERVICE_TOKEN_ISSUER_KEY;
    const serviceId = process.env.SERVICE_ID;
    if (!authUrl || !issuerKey || !serviceId) return null;

    const ttlSeconds = Math.max(60, parseInt(process.env.SERVICE_TOKEN_TTL_SECONDS || '900', 10) || 900);
    try {
      const resp = await fetch(`${authUrl}/service-token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-correlation-id': params.correlationId,
          'x-service-issuer-key': issuerKey,
        },
        body: JSON.stringify({
          serviceId,
          permissions: ['orchestrations:saga_start'],
        }),
      });

      const json: any = await resp.json().catch(() => null);
      const token = json?.data?.token;
      if (typeof token !== 'string' || token.length < 10) return null;

      this.cachedServiceToken = token;
      this.cachedServiceTokenExpMs = Date.now() + (ttlSeconds - 30) * 1000;
      return token;
    } catch {
      return null;
    }
  }

  private readonly httpTimeoutMs: number = Math.max(1000, parseInt(process.env.HTTP_TIMEOUT_MS || '5000', 10) || 5000);
  private readonly maxAmount: number = 1e12;

  private validateAmount(value: any, field: string): number {
    if (typeof value !== 'number') {
      const err: any = new Error(`${field} must be a finite non-negative number`);
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    if (!Number.isFinite(value) || Number.isNaN(value)) {
      const err: any = new Error(`${field} must be finite (not NaN or Infinity)`);
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    if (value < 0) {
      const err: any = new Error(`${field} must be non-negative`);
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    if (value > this.maxAmount) {
      const err: any = new Error(`${field} exceeds maximum allowed value`);
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    return value;
  }

  private validateCurrency(currency: any): string {
    if (!currency || typeof currency !== 'string') return 'IRR';
    const c = currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(c)) {
      const err: any = new Error('currency must be a 3-letter ISO code');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    return c;
  }

  private hashPayload(payload: Record<string, unknown>): string {
    const canonical = JSON.stringify(payload, Object.keys(payload ?? {}).sort());
    return createHash('sha256').update(canonical).digest('hex');
  }

  private assertTenantMatch(claim: Claim, tenantId?: string): void {
    if (!tenantId) return;
    if (claim.tenantId !== tenantId) {
      const err: any = new Error('Cross-tenant access denied');
      err.code = 'CROSS_TENANT_ACCESS_DENIED';
      throw err;
    }
  }

  private assertSoD(claim: Claim, actorUserId: string | undefined, action: 'approve' | 'pay'): void {
    const meta = claim.metadata || {};
    if (action === 'approve' && actorUserId && meta.assessedBy === actorUserId) {
      const err: any = new Error('SoD conflict: assessor cannot approve the same claim');
      err.code = 'CONFLICT_OF_INTEREST';
      throw err;
    }
    if (action === 'pay' && actorUserId && (meta.approvedBy === actorUserId || meta.assessedBy === actorUserId)) {
      const err: any = new Error('SoD conflict: payer cannot be the same as approver/assessor');
      err.code = 'CONFLICT_OF_INTEREST';
      throw err;
    }
  }

  private recordActor(claim: Claim, actorUserId: string | undefined, action: string): void {
    if (!actorUserId) return;
    claim.metadata = claim.metadata || {};
    claim.metadata[`${action}By`] = actorUserId;
    claim.metadata[`${action}At`] = new Date().toISOString();
  }

  private async fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.httpTimeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private async fetchJson(url: string, init?: RequestInit): Promise<any> {
    const breaker = circuitBreakerRegistry.get('claims-external', {
      failureThreshold: 3,
      successThreshold: 2,
      timeoutMs: 30000,
      resetTimeoutMs: 60000,
    });
    return breaker.execute(async () => {
      const res = await this.fetchWithTimeout(url, init);
      if (!res.ok) {
        const err: any = new Error(`HTTP ${res.status} from ${url}`);
        err.code = 'EXTERNAL_SERVICE_ERROR';
        err.status = res.status;
        throw err;
      }
      return res.json().catch(() => null);
    });
  }

  private async generateClaimNumber(claimRepo: Repository<Claim>): Promise<string> {
    try {
      const result = await claimRepo.query('SELECT nextval(\'claim_number_seq\') as seq');
      const seq = parseInt(result?.[0]?.seq, 10);
      if (Number.isFinite(seq)) {
        const date = new Date();
        const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
        return `CLM-${ymd}-${String(seq).padStart(6, '0')}`;
      }
    } catch {
      // Sequence doesn't exist yet — fall back to timestamp + random
    }
    return `CLM-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }

  async createClaim(params: {
    correlationId: string;
    tenantId: string;
    actorUserId?: string;
    policyId: string;
    claimantPartyId: string;
    lossDate: string;
    lossType: string;
    description?: string;
    idempotencyKey?: string;
    idempotencyPayloadHash?: string;
  }): Promise<Claim> {
    const tenantId = params.tenantId;
    if (!tenantId) {
      const err: any = new Error('tenantId is required');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const payloadHash = params.idempotencyKey
      ? params.idempotencyPayloadHash || this.hashPayload(params as any)
      : null;

    if (params.idempotencyKey) {
      const existing = await this.claimRepo.findOne({
        where: { tenantId, idempotencyKey: params.idempotencyKey } as any,
      });
      if (existing) {
        if (existing.idempotencyPayloadHash && payloadHash && existing.idempotencyPayloadHash !== payloadHash) {
          const err: any = new Error('Idempotency key conflict: payload mismatch');
          err.code = 'IDEMPOTENCY_CONFLICT';
          throw err;
        }
        return existing;
      }
    }

    return await this.dataSource.transaction(async (manager) => {
      const claimRepo = manager.getRepository(Claim);

      const claimNumber = await this.generateClaimNumber(claimRepo);
      const claim = claimRepo.create({
        claimId: uuidv4(),
        tenantId,
        claimNumber,
        policyId: params.policyId,
        claimantPartyId: params.claimantPartyId,
        lossDate: new Date(params.lossDate),
        lossType: params.lossType,
        description: params.description || null,
        status: 'registered',
        requiresHumanTriage: true,
        idempotencyKey: params.idempotencyKey || null,
        idempotencyPayloadHash: payloadHash,
      });

      await claimRepo.save(claim);

      await this.publishClaimEvent({
        correlationId: params.correlationId,
        topic: 'insurance.claim.registered',
        eventType: 'ClaimRegistered',
        claim,
        tenantId,
        manager,
        payload: {
          claimantPartyId: claim.claimantPartyId,
          lossDate: claim.lossDate.toISOString(),
          lossType: claim.lossType,
          requiresHumanTriage: claim.requiresHumanTriage,
          createdAt: claim.createdAt?.toISOString?.() ?? new Date().toISOString(),
        },
      });

      return claim;
    });
  }

  async getClaim(params: { claimId: string; tenantId?: string }): Promise<Claim | null> {
    const where: any = { claimId: params.claimId };
    if (params.tenantId) where.tenantId = params.tenantId;
    return this.claimRepo.findOne({ where });
  }

  async listClaims(params: {
    tenantId?: string;
    policyId?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: Claim[]; total: number }> {
    const qb = this.claimRepo.createQueryBuilder('claim');

    if (params.tenantId) {
      qb.andWhere('claim.tenant_id = :tenantId', { tenantId: params.tenantId });
    }

    if (params.policyId) {
      qb.andWhere('claim.policy_id = :policyId', { policyId: params.policyId });
    }

    if (params.status) {
      qb.andWhere('claim.status = :status', { status: params.status });
    }

    qb.orderBy('claim.created_at', 'DESC')
      .limit(params.limit)
      .offset(params.offset);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  private assertAllowedStates(action: string, current: Claim['status'], allowed: Array<Claim['status']>) {
    if (!allowed.includes(current)) {
      const err: any = new Error(`Invalid state transition for ${action}: current=${current}`);
      err.code = 'INVALID_STATE';
      err.details = { action, current, allowed };
      throw err;
    }
  }

  private async publishClaimEvent(params: {
    correlationId: string;
    topic: string;
    eventType: string;
    tenantId?: string;
    claim: Claim;
    payload: Record<string, unknown>;
    manager?: EntityManager;
  }): Promise<void> {
    const publisher = params.manager
      ? new OutboxPublisher(params.manager)
      : this.outboxPublisher;

    await publisher.publish({
      topic: params.topic,
      eventType: params.eventType,
      eventVersion: 1,
      correlationId: params.correlationId,
      subject: {
        claimId: params.claim.claimId,
        claimNumber: params.claim.claimNumber,
        policyId: params.claim.policyId,
        tenantId: params.tenantId ?? params.claim.tenantId,
      },
      payload: {
        claimId: params.claim.claimId,
        claimNumber: params.claim.claimNumber,
        policyId: params.claim.policyId,
        tenantId: params.tenantId ?? params.claim.tenantId,
        status: params.claim.status,
        updatedAt: params.claim.updatedAt?.toISOString?.() ?? new Date().toISOString(),
        ...params.payload,
      },
    });
  }

  async assessClaim(params: {
    correlationId: string;
    tenantId?: string;
    actorUserId?: string;
    claimId: string;
    assessedAmount: number;
  }): Promise<Claim | null> {
    return await this.dataSource.transaction(async (manager) => {
      const claimRepo = manager.getRepository(Claim);

      const where: any = { claimId: params.claimId };
      if (params.tenantId) where.tenantId = params.tenantId;
      const claim = await claimRepo.findOne({
        where,
        lock: { mode: 'pessimistic_write' },
      });
      if (!claim) return null;

      this.assertTenantMatch(claim, params.tenantId);

      if (claim.status === 'assessed' || claim.status === 'approved' || claim.status === 'paid' || claim.status === 'closed') {
        return claim;
      }

      this.assertAllowedStates('claims:assess', claim.status, ['registered']);

      const assessedAmount = this.validateAmount(params.assessedAmount, 'assessedAmount');

      claim.assessedAmount = assessedAmount;
      claim.status = 'assessed';
      this.recordActor(claim, params.actorUserId, 'assessed');
      await claimRepo.save(claim);

      await this.publishClaimEvent({
        correlationId: params.correlationId,
        topic: 'insurance.claim.assessed',
        eventType: 'ClaimAssessed',
        tenantId: params.tenantId,
        claim,
        manager,
        payload: {
          assessedAmount,
          assessedBy: params.actorUserId,
        },
      });

      return claim;
    });
  }

  async approveClaim(params: {
    correlationId: string;
    claimId: string;
    approvedAmount: number;
    currency?: string;
    authorization?: string;
    tenantId?: string;
    actorUserId?: string;
  }): Promise<Claim | null> {
    return await this.dataSource.transaction(async (manager) => {
      const claimRepo = manager.getRepository(Claim);

      const where: any = { claimId: params.claimId };
      if (params.tenantId) where.tenantId = params.tenantId;
      const claim = await claimRepo.findOne({
        where,
        lock: { mode: 'pessimistic_write' },
      });
      if (!claim) return null;

      this.assertTenantMatch(claim, params.tenantId);

      if (claim.status === 'approved' || claim.status === 'paid' || claim.status === 'closed') {
        return claim;
      }

      this.assertAllowedStates('claims:approve', claim.status, ['assessed']);

      if (!claim.policyValidated) {
        const err: any = new Error('Policy must be validated before approval');
        err.code = 'POLICY_NOT_VALIDATED';
        throw err;
      }

      const approvedAmount = this.validateAmount(params.approvedAmount, 'approvedAmount');
      const currency = this.validateCurrency(params.currency);

      if (claim.assessedAmount != null && approvedAmount > claim.assessedAmount) {
        const err: any = new Error('approvedAmount cannot exceed assessedAmount');
        err.code = 'AMOUNT_LIMIT_EXCEEDED';
        throw err;
      }

      if (currency !== claim.currency) {
        const err: any = new Error('Currency mismatch');
        err.code = 'CURRENCY_MISMATCH';
        throw err;
      }

      this.assertSoD(claim, params.actorUserId, 'approve');

      claim.approvedAmount = approvedAmount;
      claim.status = 'approved';
      this.recordActor(claim, params.actorUserId, 'approved');
      await claimRepo.save(claim);

      const publish = (topic: string, eventType: string, payload: Record<string, unknown>) =>
        this.publishClaimEvent({
          correlationId: params.correlationId,
          topic,
          eventType,
          tenantId: params.tenantId,
          claim,
          manager,
          payload,
        });

      await publish('insurance.claim.approved', 'ClaimApproved', { approvedAmount, approvedBy: params.actorUserId });
      await publish('insurance.claim.decided', 'ClaimDecided', { decision: 'approved', approvedAmount });
      await publish('insurance.claim.payment_requested', 'ClaimPaymentRequested', {
        approvedAmount,
        currency: claim.currency,
        requestedAt: new Date().toISOString(),
      });

      const orchUrl = this.getOrchestratorUrl();
      if (orchUrl) {
        const svcToken = await this.getServiceToken({ correlationId: params.correlationId });
        if (!svcToken) {
          const err: any = new Error('Service token not available for payment saga');
          err.code = 'SAGA_START_FAILED';
          throw err;
        }

        const sagaResp = await this.fetchWithTimeout(`${orchUrl}/orchestrations/sagas`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-correlation-id': params.correlationId,
            ...(params.tenantId ? { 'x-tenant-id': params.tenantId } : {}),
            ...(params.actorUserId ? { 'x-user-id': params.actorUserId } : {}),
            authorization: `Bearer ${svcToken}`,
          },
          body: JSON.stringify({
            sagaType: 'ClaimPayment',
            claimId: claim.claimId,
            context: { approvedAmount, currency: claim.currency },
          }),
        });

        if (!sagaResp.ok) {
          const text = await sagaResp.text().catch(() => `HTTP ${sagaResp.status}`);
          const err: any = new Error(`Saga start failed: ${text}`);
          err.code = 'SAGA_START_FAILED';
          throw err;
        }
      }

      return claim;
    });
  }

  async rejectClaim(params: {
    correlationId: string;
    tenantId?: string;
    actorUserId?: string;
    claimId: string;
    reason: string;
  }): Promise<Claim | null> {
    return await this.dataSource.transaction(async (manager) => {
      const claimRepo = manager.getRepository(Claim);

      const where: any = { claimId: params.claimId };
      if (params.tenantId) where.tenantId = params.tenantId;
      const claim = await claimRepo.findOne({
        where,
        lock: { mode: 'pessimistic_write' },
      });
      if (!claim) return null;

      this.assertTenantMatch(claim, params.tenantId);

      if (claim.status === 'rejected') {
        return claim;
      }

      this.assertAllowedStates('claims:reject', claim.status, ['registered', 'assessed']);

      claim.status = 'rejected';
      this.recordActor(claim, params.actorUserId, 'rejected');
      await claimRepo.save(claim);

      const publish = (topic: string, eventType: string, payload: Record<string, unknown>) =>
        this.publishClaimEvent({
          correlationId: params.correlationId,
          topic,
          eventType,
          tenantId: params.tenantId,
          claim,
          manager,
          payload,
        });

      await publish('insurance.claim.rejected', 'ClaimRejected', { reason: params.reason, rejectedBy: params.actorUserId });
      await publish('insurance.claim.decided', 'ClaimDecided', { decision: 'rejected', reason: params.reason });

      return claim;
    });
  }

  async payClaim(params: {
    correlationId: string;
    tenantId?: string;
    actorUserId?: string;
    claimId: string;
    paidAmount: number;
    paymentReference?: string;
  }): Promise<Claim | null> {
    return await this.dataSource.transaction(async (manager) => {
      const claimRepo = manager.getRepository(Claim);

      const where: any = { claimId: params.claimId };
      if (params.tenantId) where.tenantId = params.tenantId;
      const claim = await claimRepo.findOne({
        where,
        lock: { mode: 'pessimistic_write' },
      });
      if (!claim) return null;

      this.assertTenantMatch(claim, params.tenantId);

      if (claim.status === 'paid' || claim.status === 'closed') {
        return claim;
      }

      this.assertAllowedStates('claims:pay', claim.status, ['approved']);

      const paidAmount = this.validateAmount(params.paidAmount, 'paidAmount');
      if (claim.approvedAmount != null && paidAmount > claim.approvedAmount) {
        const err: any = new Error('paidAmount cannot exceed approvedAmount');
        err.code = 'AMOUNT_LIMIT_EXCEEDED';
        throw err;
      }
      if (paidAmount !== claim.approvedAmount) {
        const err: any = new Error('paidAmount must equal approvedAmount');
        err.code = 'AMOUNT_MISMATCH';
        throw err;
      }

      if (params.paymentReference) {
        const dup = await claimRepo.findOne({
          where: { tenantId: claim.tenantId, paymentReference: params.paymentReference } as any,
        });
        if (dup && dup.claimId !== claim.claimId) {
          const err: any = new Error('Payment reference already used');
          err.code = 'PAYMENT_REFERENCE_DUPLICATE';
          throw err;
        }
      }

      this.assertSoD(claim, params.actorUserId, 'pay');

      claim.paidAmount = paidAmount;
      claim.paymentReference = params.paymentReference || null;
      claim.status = 'paid';
      this.recordActor(claim, params.actorUserId, 'paid');
      await claimRepo.save(claim);

      await this.publishClaimEvent({
        correlationId: params.correlationId,
        topic: 'insurance.claim.paid',
        eventType: 'ClaimPaid',
        tenantId: params.tenantId,
        claim,
        manager,
        payload: {
          paidAmount,
          paymentReference: params.paymentReference,
          paidBy: params.actorUserId,
        },
      });

      return claim;
    });
  }

  async closeClaim(params: {
    correlationId: string;
    tenantId?: string;
    actorUserId?: string;
    claimId: string;
  }): Promise<Claim | null> {
    return await this.dataSource.transaction(async (manager) => {
      const claimRepo = manager.getRepository(Claim);

      const where: any = { claimId: params.claimId };
      if (params.tenantId) where.tenantId = params.tenantId;
      const claim = await claimRepo.findOne({
        where,
        lock: { mode: 'pessimistic_write' },
      });
      if (!claim) return null;

      this.assertTenantMatch(claim, params.tenantId);

      if (claim.status === 'closed') {
        return claim;
      }

      this.assertAllowedStates('claims:close', claim.status, ['paid', 'rejected']);

      claim.status = 'closed';
      this.recordActor(claim, params.actorUserId, 'closed');
      await claimRepo.save(claim);

      await this.publishClaimEvent({
        correlationId: params.correlationId,
        topic: 'insurance.claim.closed',
        eventType: 'ClaimClosed',
        tenantId: params.tenantId,
        claim,
        manager,
        payload: { closedBy: params.actorUserId },
      });

      return claim;
    });
  }

  async referToAdjuster(params: {
    correlationId: string;
    tenantId?: string;
    actorUserId?: string | null;
    claimId: string;
    adjusterId: string;
    reason: string;
  }): Promise<Claim | null> {
    return await this.dataSource.transaction(async (manager) => {
      const claimRepo = manager.getRepository(Claim);

      const where: any = { claimId: params.claimId };
      if (params.tenantId) where.tenantId = params.tenantId;
      const claim = await claimRepo.findOne({
        where,
        lock: { mode: 'pessimistic_write' },
      });
      if (!claim) return null;

      this.assertTenantMatch(claim, params.tenantId);

      this.assertAllowedStates('claims:refer_adjuster', claim.status, ['registered', 'assessed']);

      claim.status = 'adjuster_review';
      claim.metadata = claim.metadata || {};
      claim.metadata.adjusterId = params.adjusterId;
      claim.metadata.adjusterReferralReason = params.reason;
      claim.metadata.adjusterReferralAt = new Date().toISOString();
      claim.metadata.adjusterReferralBy = params.actorUserId;
      await claimRepo.save(claim);

      await this.publishClaimEvent({
        correlationId: params.correlationId,
        topic: 'insurance.claim.referred_to_adjuster',
        eventType: 'ClaimReferredToAdjuster',
        tenantId: params.tenantId,
        claim,
        manager,
        payload: {
          adjusterId: params.adjusterId,
          reason: params.reason,
          referredBy: params.actorUserId,
          referredAt: new Date().toISOString(),
        },
      });

      return claim;
    });
  }

  // Deductible and franchise calculation
  async calculateDeductible(params: {
    claimId: string;
    tenantId?: string;
    grossClaimAmount: number;
    deductibleAmount?: number;
    deductiblePercentage?: number;
    franchiseAmount?: number;
    franchisePercentage?: number;
  }): Promise<{
    grossClaimAmount: number;
    deductibleAmount: number;
    franchiseAmount: number;
    netPayableAmount: number;
    deductions: Array<{ type: string; amount: number; description: string }>;
  }> {
    return await this.dataSource.transaction(async (manager) => {
      const claimRepo = manager.getRepository(Claim);

      const grossClaimAmount = this.validateAmount(params.grossClaimAmount, 'grossClaimAmount');
      const deductibleAmount = this.validateAmount(params.deductibleAmount || 0, 'deductibleAmount');
      const deductiblePct = this.validateAmount(params.deductiblePercentage || 0, 'deductiblePercentage');
      const franchiseAmount = this.validateAmount(params.franchiseAmount || 0, 'franchiseAmount');
      const franchisePct = this.validateAmount(params.franchisePercentage || 0, 'franchisePercentage');

      const where: any = { claimId: params.claimId };
      if (params.tenantId) where.tenantId = params.tenantId;
      const claim = await claimRepo.findOne({
        where,
        lock: { mode: 'pessimistic_write' },
      });
      if (!claim) { const err: any = new Error('Not found'); err.code = 'NOT_FOUND'; throw err; }

      this.assertTenantMatch(claim, params.tenantId);

      const deductions: Array<{ type: string; amount: number; description: string }> = [];
      let remainingAmount = grossClaimAmount;

      const deductibleFromPct = (grossClaimAmount * deductiblePct) / 100;
      const totalDeductible = Math.min(grossClaimAmount, Math.max(deductibleAmount, deductibleFromPct));

      if (totalDeductible > 0) {
        deductions.push({ type: 'deductible', amount: totalDeductible, description: `Deductible: ${deductibleAmount > 0 ? 'fixed ' + deductibleAmount : ''}${deductiblePct > 0 ? (deductibleAmount > 0 ? ' + ' : '') + deductiblePct + '%' : ''}` });
        remainingAmount -= totalDeductible;
      }

      const franchiseFromPct = (grossClaimAmount * franchisePct) / 100;
      const totalFranchise = Math.min(grossClaimAmount, Math.max(franchiseAmount, franchiseFromPct));

      if (totalFranchise > 0 && grossClaimAmount > totalFranchise) {
        deductions.push({ type: 'franchise', amount: totalFranchise, description: `Franchise: ${franchiseAmount > 0 ? 'fixed ' + franchiseAmount : ''}${franchisePct > 0 ? (franchiseAmount > 0 ? ' + ' : '') + franchisePct + '%' : ''}` });
        remainingAmount -= totalFranchise;
      }

      const netPayableAmount = Math.max(0, remainingAmount);

      claim.grossClaimAmount = grossClaimAmount;
      claim.deductibleAmount = totalDeductible;
      claim.deductiblePercentage = deductiblePct;
      claim.franchiseAmount = totalFranchise > 0 && grossClaimAmount > totalFranchise ? totalFranchise : 0;
      claim.franchisePercentage = franchisePct;
      claim.assessedAmount = netPayableAmount;
      claim.status = 'assessed';
      this.recordActor(claim, undefined, 'assessed');
      claim.updatedAt = new Date();
      await claimRepo.save(claim);

      await this.publishClaimEvent({
        correlationId: params.claimId,
        topic: 'insurance.claim.deductible_calculated',
        eventType: 'ClaimDeductibleCalculated',
        tenantId: params.tenantId,
        claim,
        manager,
        payload: {
          grossClaimAmount,
          deductibleAmount: totalDeductible,
          franchiseAmount: totalFranchise > 0 && grossClaimAmount > totalFranchise ? totalFranchise : 0,
          netPayableAmount,
          deductions,
        },
      });

      return {
        grossClaimAmount,
        deductibleAmount: totalDeductible,
        franchiseAmount: totalFranchise > 0 && grossClaimAmount > totalFranchise ? totalFranchise : 0,
        netPayableAmount,
        deductions,
      };
    });
  }

  // FNOL Automation
  async createFnolClaim(params: {
    correlationId: string;
    tenantId: string;
    actorUserId?: string;
    policyId: string;
    claimantPartyId: string;
    lossDate: string;
    lossType: string;
    description?: string;
    notificationChannel: 'web' | 'mobile_app' | 'sms' | 'email' | 'call_center';
    notificationSource?: string;
    contactPhone?: string;
    contactEmail?: string;
    locationAddress?: string;
    locationCity?: string;
    locationProvince?: string;
    witnesses?: Array<{ name: string; phone?: string; relation?: string }>;
    attachedDocuments?: Array<{ documentId: string; documentType: string; fileName: string }>;
  }): Promise<Claim> {
    const tenantId = params.tenantId;
    if (!tenantId) {
      const err: any = new Error('tenantId is required');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    return await this.dataSource.transaction(async (manager) => {
      const claimRepo = manager.getRepository(Claim);

      const claimNumber = await this.generateClaimNumber(claimRepo);
      const triageResult = this.autoTriageClaim({ lossType: params.lossType, description: params.description });

      const claim = claimRepo.create({
        claimId: uuidv4(),
        tenantId,
        claimNumber,
        policyId: params.policyId,
        claimantPartyId: params.claimantPartyId,
        lossDate: new Date(params.lossDate),
        lossType: params.lossType,
        description: params.description || null,
        status: 'registered',
        requiresHumanTriage: triageResult.requiresHumanTriage,
        notificationChannel: params.notificationChannel,
        notificationSource: params.notificationSource || null,
        autoTriageScore: triageResult.score,
        autoTriageCategory: triageResult.category,
        policyValidated: false,
        contactPhone: params.contactPhone || null,
        contactEmail: params.contactEmail || null,
        locationAddress: params.locationAddress || null,
        locationCity: params.locationCity || null,
        locationProvince: params.locationProvince || null,
        witnesses: params.witnesses || null,
        attachedDocuments: params.attachedDocuments || null,
        metadata: {
          fnolSource: params.notificationChannel,
          autoTriage: triageResult,
        },
      });

      await claimRepo.save(claim);

      await this.publishClaimEvent({
        correlationId: params.correlationId,
        topic: 'insurance.claim.registered',
        eventType: 'ClaimRegistered',
        tenantId,
        claim,
        manager,
        payload: {
          claimantPartyId: claim.claimantPartyId,
          lossDate: claim.lossDate.toISOString(),
          lossType: claim.lossType,
          requiresHumanTriage: claim.requiresHumanTriage,
          notificationChannel: claim.notificationChannel,
          autoTriageScore: claim.autoTriageScore,
          autoTriageCategory: claim.autoTriageCategory,
          createdAt: claim.createdAt?.toISOString?.() ?? new Date().toISOString(),
        },
      });

      if (triageResult.category === 'high') {
        await this.autoAssignAdjuster({
          correlationId: params.correlationId,
          tenantId,
          actorUserId: params.actorUserId,
          claim,
          manager,
        });
      }

      return claim;
    });
  }

  private autoTriageClaim(params: { lossType: string; description?: string }): {
    score: number;
    category: 'low' | 'medium' | 'high';
    requiresHumanTriage: boolean;
  } {
    let score = 0;
    const lossTypeLower = params.lossType.toLowerCase();
    const descriptionLower = params.description?.toLowerCase() || '';

    // High-risk keywords in description (English + Persian)
    const highRiskKeywords = [
      'fire', 'theft', 'accident', 'collision', 'injury', 'death', 'severe', 'critical',
      'آتش', 'سرقت', 'تصادف', 'حادثه', 'جراحت', 'مرگ', 'فوت', 'خسارت شدید', 'بحرانی',
    ];
    const mediumRiskKeywords = [
      'damage', 'break', 'loss', 'stolen', 'minor', 'moderate',
      'آسیب', 'شکستگی', 'خسارت', 'خرابی', 'جزئی', 'متوسط',
    ];

    highRiskKeywords.forEach((keyword) => {
      if (descriptionLower.includes(keyword)) score += 30;
    });

    mediumRiskKeywords.forEach((keyword) => {
      if (descriptionLower.includes(keyword)) score += 15;
    });

    // Loss type scoring
    if (lossTypeLower.includes('fire') || lossTypeLower.includes('theft') || lossTypeLower.includes('accident')) {
      score += 40;
    } else if (lossTypeLower.includes('damage') || lossTypeLower.includes('break')) {
      score += 20;
    }

    // Determine category
    let category: 'low' | 'medium' | 'high' = 'low';
    let requiresHumanTriage = true;

    if (score >= 60) {
      category = 'high';
      requiresHumanTriage = true;
    } else if (score >= 30) {
      category = 'medium';
      requiresHumanTriage = true;
    } else {
      category = 'low';
      requiresHumanTriage = false;
    }

    return { score, category, requiresHumanTriage };
  }

  private async autoAssignAdjuster(params: {
    correlationId: string;
    tenantId?: string;
    actorUserId?: string;
    claim: Claim;
    manager: any;
    authorization?: string;
  }): Promise<void> {
    const claimRepo = params.manager.getRepository(Claim);
    let assignedAdjusterId: string | null = null;
    let assignmentReason = 'manual_queue';

    try {
      const adjusterPool = await this.getAdjusterPool(params.claim, params.authorization);

      if (adjusterPool.length > 0) {
        const claimType = params.claim.lossType || 'general';
        const incidentLocation = params.claim.metadata?.incidentLocation as string | undefined;

        let candidates = adjusterPool.filter((a) =>
          !a.specialties || a.specialties.length === 0 || a.specialties.includes(claimType) || a.specialties.includes('general'),
        );

        if (incidentLocation && candidates.length > 0) {
          const locationMatch = candidates.filter((a) =>
            a.serviceAreas && a.serviceAreas.some((area) => incidentLocation.includes(area) || area.includes(incidentLocation)),
          );
          if (locationMatch.length > 0) {
            candidates = locationMatch;
            assignmentReason = 'skill_geo_match';
          }
        } else if (candidates.length > 0) {
          assignmentReason = 'skill_match';
        }

        if (candidates.length > 0) {
          candidates.sort((a, b) => (a.openClaimsCount || 0) - (b.openClaimsCount || 0));
          assignedAdjusterId = candidates[0].adjusterId;
        }
      }
    } catch (error) {
      this.logger.warn('Failed to auto-assign adjuster, falling back to manual queue', { claimId: params.claim.claimId, error: (error as Error).message });
    }

    params.claim.autoAssignedAdjusterId = assignedAdjusterId;
    params.claim.status = assignedAdjusterId ? 'adjuster_review' : 'registered';
    params.claim.metadata = params.claim.metadata || {};
    params.claim.metadata.autoAssignedAt = new Date().toISOString();
    params.claim.metadata.assignmentReason = assignmentReason;
    await claimRepo.save(params.claim);

    await this.publishClaimEvent({
      correlationId: params.correlationId,
      topic: assignedAdjusterId
        ? 'insurance.claim.adjuster_assigned'
        : 'insurance.claim.adjuster_assignment_requested',
      eventType: assignedAdjusterId ? 'ClaimAdjusterAssigned' : 'ClaimAdjusterAssignmentRequested',
      tenantId: params.tenantId,
      claim: params.claim,
      manager: params.manager,
      payload: {
        adjusterId: assignedAdjusterId,
        assignmentReason,
        autoTriageCategory: params.claim.autoTriageCategory,
        autoTriageScore: params.claim.autoTriageScore,
        requestedAt: new Date().toISOString(),
      },
    });
  }

  private async getAdjusterPool(claim: Claim, authorization?: string): Promise<
    Array<{
      adjusterId: string;
      name: string;
      specialties: string[];
      serviceAreas: string[];
      openClaimsCount: number;
    }>
  > {
    const adjusterServiceUrl = process.env.ADJUSTER_SERVICE_URL || process.env.SALES_NETWORK_URL;
    if (!adjusterServiceUrl) return [];

    try {
      const data: any = await this.fetchJson(
        `${adjusterServiceUrl}/adjusters/available?claimType=${encodeURIComponent(claim.lossType || '')}`,
        {
          headers: {
            'content-type': 'application/json',
            'x-tenant-id': claim.tenantId,
            ...(authorization ? { 'authorization': authorization } : {}),
          },
        },
      );
      return (data?.data || []) as any[];
    } catch (err) {
      this.logger.warn('Failed to fetch adjuster pool', { claimId: claim.claimId, error: (err as Error).message });
      return [];
    }
  }

  async getFnolFormDefaults(params: {
    correlationId: string;
    tenantId?: string;
    policyId: string;
    authorization?: string;
  }): Promise<{
    policyId: string;
    policyNumber: string;
    insuredPartyId: string;
    insuredName: string;
    insuredPhone: string;
    insuredEmail: string;
    insuredAddress: string;
    productCode: string;
    productName: string;
    coverageTypes: string[];
    policyStatus: string;
    effectiveFrom: string;
    effectiveTo: string;
    vehicleInfo?: {
      make: string;
      model: string;
      year: number;
      plateNumber: string;
      vin: string;
    };
    propertyInfo?: {
      address: string;
      city: string;
      province: string;
      postalCode: string;
      type: string;
      constructionYear: number;
    };
    lossTypeOptions: string[];
    notificationChannelOptions: string[];
  }> {
    const policyServiceUrl = this.getPolicyServiceUrl();
    const partyKycServiceUrl = this.getPartyKycServiceUrl();

    if (!policyServiceUrl) {
      const err: any = new Error('Policy service not configured');
      err.code = 'POLICY_SERVICE_NOT_CONFIGURED';
      throw err;
    }

    const headers: any = {
      'content-type': 'application/json',
      'x-correlation-id': params.correlationId,
      ...(params.tenantId ? { 'x-tenant-id': params.tenantId } : {}),
      ...(params.authorization ? { 'authorization': params.authorization } : {}),
    };

    const policyData: any = await this.fetchJson(`${policyServiceUrl}/policies/${params.policyId}`, { headers });
    const policy = policyData?.data;
    if (!policy) {
      const err: any = new Error('Policy not found');
      err.code = 'POLICY_NOT_FOUND';
      throw err;
    }

    let party: any = null;
    const partyId = policy?.partyId;
    if (partyKycServiceUrl && partyId) {
      try {
        const partyData: any = await this.fetchJson(`${partyKycServiceUrl}/party/${partyId}`, { headers });
        const result = partyData?.data;
        party = result?.party || null;
      } catch (error: any) {
        this.logger.warn(`Failed to fetch party ${partyId} from party-kyc-service: ${error.message}`);
      }
    }

    const appData = policy?.applicationData || {};
    const coverages = policy?.coverages || {};
    const coverageTypes = Array.isArray(coverages) ? coverages.map((c: any) => c.type || c) : Object.keys(coverages);

    return {
      policyId: params.policyId,
      policyNumber: policy?.policyNumber || params.policyId,
      insuredPartyId: partyId || params.policyId,
      insuredName: party?.fullName || appData?.insuredName || '',
      insuredPhone: party?.mobile || appData?.insuredPhone || '',
      insuredEmail: appData?.insuredEmail || '',
      insuredAddress: appData?.insuredAddress || '',
      productCode: policy?.lineOfBusiness || appData?.productCode || '',
      productName: appData?.productName || policy?.lineOfBusiness || '',
      coverageTypes,
      policyStatus: policy?.status || 'unknown',
      effectiveFrom: policy?.startDate || '',
      effectiveTo: policy?.endDate || '',
      vehicleInfo: appData?.vehicleInfo || undefined,
      propertyInfo: appData?.propertyInfo || undefined,
      lossTypeOptions: [
        'accident',
        'theft',
        'fire',
        'third_party',
        'glass_breakage',
        'natural_disaster',
      ],
      notificationChannelOptions: ['web', 'mobile_app', 'sms', 'email', 'call_center'],
    };
  }

  async validatePolicyForClaim(params: {
    correlationId: string;
    tenantId?: string;
    claimId: string;
    authorization?: string;
  }): Promise<{
    valid: boolean;
    policyActive: boolean;
    coverageValid: boolean;
    withinPolicyPeriod: boolean;
    message: string;
    details: Record<string, any>;
  }> {
    return await this.dataSource.transaction(async (manager) => {
      const claimRepo = manager.getRepository(Claim);

      const where: any = { claimId: params.claimId };
      if (params.tenantId) where.tenantId = params.tenantId;
      const claim = await claimRepo.findOne({
        where,
        lock: { mode: 'pessimistic_write' },
      });
      if (!claim) { const err: any = new Error('Claim not found'); err.code = 'NOT_FOUND'; throw err; }

      this.assertTenantMatch(claim, params.tenantId);

      const policyServiceUrl = this.getPolicyServiceUrl();
      if (!policyServiceUrl) {
        const err: any = new Error('Policy service not configured');
        err.code = 'POLICY_SERVICE_NOT_CONFIGURED';
        throw err;
      }

      const headers: any = {
        'content-type': 'application/json',
        'x-correlation-id': params.correlationId,
        'x-tenant-id': claim.tenantId,
        ...(params.authorization ? { 'authorization': params.authorization } : {}),
      };

      const policyData: any = await this.fetchJson(`${policyServiceUrl}/policies/${claim.policyId}`, { headers });
      const policy = policyData?.data;
      if (!policy) {
        const err: any = new Error('Policy not found');
        err.code = 'POLICY_NOT_FOUND';
        throw err;
      }

      const effectiveFrom = policy.startDate ? new Date(policy.startDate) : null;
      const effectiveTo = policy.endDate ? new Date(policy.endDate) : null;
      const coverages = policy.coverages || {};
      const coverageTypes = Array.isArray(coverages) ? coverages.map((c: any) => c.type || c) : Object.keys(coverages);

      const withinPolicyPeriod = effectiveFrom && effectiveTo
        ? claim.lossDate >= effectiveFrom && claim.lossDate <= effectiveTo
        : false;
      const policyActive = policy.status === 'active';
      const lossTypeLower = (claim.lossType || '').toLowerCase();
      const coverageValid = coverageTypes.some((c: any) => (typeof c === 'string' ? c : c.type || '').toString().toLowerCase() === lossTypeLower);
      const valid = policyActive && withinPolicyPeriod && coverageValid;

      const validationDetails = {
        policyId: claim.policyId,
        policyStatus: policy.status || 'unknown',
        effectiveFrom: effectiveFrom?.toISOString() || null,
        effectiveTo: effectiveTo?.toISOString() || null,
        lossDate: claim.lossDate.toISOString(),
        lossType: claim.lossType,
        coverageTypes,
      };

      claim.policyValidated = valid;
      claim.policyValidationResult = {
        valid,
        policyActive,
        coverageValid,
        withinPolicyPeriod,
        ...validationDetails,
      };
      await claimRepo.save(claim);

      return {
        valid,
        policyActive,
        coverageValid,
        withinPolicyPeriod,
        message: valid ? 'Policy validation successful' : 'Policy validation failed',
        details: validationDetails,
      };
    });
  }
private maskPii(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null;
  if (value.length <= 4) return '****';
  return value.substring(0, 2) + '*'.repeat(Math.max(4, value.length - 4)) + value.substring(value.length - 2);
}

private maskPiiFields(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const piiKeys = ['nationalId', 'mobile', 'contactPhone', 'contactEmail', 'iban', 'destinationIban', 'beneficiaryPartyId', 'subjectNationalId'];
  const masked = { ...data };
  for (const key of Object.keys(masked)) {
    if (piiKeys.includes(key) && typeof masked[key] === 'string') {
      masked[key] = this.maskPii(masked[key]);
    }
  }
  return masked;
}


}
