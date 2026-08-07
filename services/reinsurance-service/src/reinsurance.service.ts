import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OutboxPublisher } from '@insurance/shared';
import { ReTreaty, type ReTreatyStatus } from './entities/ReTreaty';
import { ReCession, type ReCessionStatus } from './entities/ReCession';
import { ReStatement, type ReStatementStatus } from './entities/ReStatement';
import { ReReconciliation, type ReReconciliationStatus } from './entities/ReReconciliation';
import { ReClaimRecovery, type ReClaimRecoveryStatus } from './entities/ReClaimRecovery';
import { ReTicket, type ReTicketStatus } from './entities/ReTicket';
import { ReTicketMessage } from './entities/ReTicketMessage';
import { ReTicketAttachment } from './entities/ReTicketAttachment';
import { AuditLog } from './entities/AuditLog'; // P1 #10
import { EntityVersion } from './entities/EntityVersion'; // P1 #10

function clampInt(v: any, def: number, min: number, max: number): number {
  const n = parseInt(String(v ?? def), 10);
  if (Number.isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

@Injectable()
export class ReinsuranceService {
  private outboxPublisher!: OutboxPublisher;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ReTreaty) private readonly treatiesRepo: Repository<ReTreaty>,
    @InjectRepository(ReCession) private readonly cessionsRepo: Repository<ReCession>,
    @InjectRepository(ReStatement) private readonly statementsRepo: Repository<ReStatement>,
    @InjectRepository(ReReconciliation) private readonly reconciliationsRepo: Repository<ReReconciliation>,
    @InjectRepository(ReClaimRecovery) private readonly recoveriesRepo: Repository<ReClaimRecovery>,
    @InjectRepository(ReTicket) private readonly ticketsRepo: Repository<ReTicket>,
    @InjectRepository(ReTicketMessage) private readonly ticketMessagesRepo: Repository<ReTicketMessage>,
    @InjectRepository(ReTicketAttachment) private readonly ticketAttachmentsRepo: Repository<ReTicketAttachment>,
    @InjectRepository(AuditLog) private readonly auditLogRepo: Repository<AuditLog>, // P1 #10
    @InjectRepository(EntityVersion) private readonly entityVersionRepo: Repository<EntityVersion>, // P1 #10
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // P1 #10: Audit trail & versioning helpers
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Write an immutable audit log entry.
   */
  private async writeAuditLog(params: {
    resourceType: string;
    resourceId: string;
    action: string;
    actor: string;
    tenantId?: string | null;
    before?: Record<string, any> | null;
    after?: Record<string, any> | null;
  }): Promise<void> {
    const entry = this.auditLogRepo.create({
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      action: params.action,
      actor: params.actor,
      tenantId: params.tenantId ?? null,
      before: params.before ?? null,
      after: params.after ?? null,
    });
    await this.auditLogRepo.save(entry);
  }

  /**
   * Write an immutable entity version snapshot.
   */
  private async writeEntityVersion(params: {
    resourceType: string;
    resourceId: string;
    snapshot: Record<string, any>;
    actor: string;
    tenantId?: string | null;
  }): Promise<void> {
    const versions = await this.entityVersionRepo.find({
      where: { resourceType: params.resourceType, resourceId: params.resourceId },
      order: { version: 'DESC' },
      take: 1,
    });
    const nextVersion = (versions.length > 0 ? versions[0].version : 0) + 1;
    const entry = this.entityVersionRepo.create({
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      version: nextVersion,
      snapshot: params.snapshot,
      actor: params.actor,
      tenantId: params.tenantId ?? null,
    });
    await this.entityVersionRepo.save(entry);
  }

  private n(v: any): number {
    const x = typeof v === 'number' ? v : v !== null && v !== undefined ? parseFloat(String(v)) : NaN;
    return Number.isFinite(x) ? x : 0;
  }

  private isoDateAsDateTime(d: string): string {
    const s = String(d || '').trim();
    if (!s) return new Date().toISOString();
    if (s.includes('T')) return s;
    return `${s}T00:00:00.000Z`;
  }

  private async publishCededCalculated(params: {
    correlationId: string;
    treaty: ReTreaty;
    cession: ReCession;
  }): Promise<void> {
    const gross = this.n(params.cession.sumInsured) || this.n(params.cession.premium);
    const ceded = this.n(params.cession.cededAmount);
    const retained = Math.max(0, gross - ceded);

    await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.ri.ceded_calculated',
        eventType: 'CededCalculated',
        eventVersion: 1,
        correlationId: params.correlationId,
        tenantId: params.treaty.tenantId,
        subject: {
          contractId: params.treaty.treatyId,
          tenantId: params.treaty.tenantId,
          ...(params.cession.policyId ? { policyId: String(params.cession.policyId) } : {}),
        },
        payload: {
          calculationBasis: params.cession.policyId ? 'policy' : 'policy',
          grossAmount: gross,
          cededAmount: ceded,
          retainedAmount: retained,
          currency: params.treaty.currency || 'IRR',
          counterpartyId: params.treaty.reinsurerName,
        },
      });
    });
  }

  private async publishBorderauxGenerated(params: {
    correlationId: string;
    statement: ReStatement;
    treaty: ReTreaty;
  }): Promise<void> {
    const itemsCount = typeof (params.statement.totals as any)?.itemsCount === 'number' ? (params.statement.totals as any).itemsCount : 0;

    await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.ri.borderaux_generated',
        eventType: 'BorderauxGenerated',
        eventVersion: 1,
        correlationId: params.correlationId,
        tenantId: params.treaty.tenantId,
        subject: {
          borderauxId: params.statement.statementId,
          contractId: params.statement.treatyId,
          tenantId: params.treaty.tenantId,
        },
        payload: {
          periodStart: this.isoDateAsDateTime(params.statement.periodStart),
          periodEnd: this.isoDateAsDateTime(params.statement.periodEnd),
          itemsCount,
          documentId: (params.statement.totals as any)?.documentId ?? null,
        },
      });
    });
  }

  private async publishPeriodClosed(params: {
    correlationId: string;
    statement: ReStatement;
    treaty: ReTreaty;
    actorUserId?: string | null;
    notes?: string | null;
  }): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.reinsurance.period_closed',
        eventType: 'ReinsurancePeriodClosed',
        eventVersion: 1,
        correlationId: params.correlationId,
        tenantId: params.treaty.tenantId,
        subject: {
          treatyId: params.treaty.treatyId,
          statementId: params.statement.statementId,
          tenantId: params.treaty.tenantId,
        },
        payload: {
          treatyId: params.treaty.treatyId,
          statementId: params.statement.statementId,
          periodEnd: params.statement.periodEnd,
          totals: params.statement.totals,
          closedBy: params.actorUserId,
          closedAt: new Date().toISOString(),
          notes: params.notes,
        },
      });
    });
  }

  private async publishRecoveryIdentified(params: {
    correlationId: string;
    recovery: ReClaimRecovery;
    treaty: ReTreaty;
  }): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.ri.recovery_identified',
        eventType: 'RecoveryIdentified',
        eventVersion: 1,
        correlationId: params.correlationId,
        tenantId: params.treaty.tenantId,
        subject: {
          recoveryId: params.recovery.recoveryId,
          claimId: String(params.recovery.claimId),
          contractId: params.recovery.treatyId,
          tenantId: params.treaty.tenantId,
        },
        payload: {
          recoverableAmount: this.n(params.recovery.cededLossAmount),
          currency: params.recovery.currency || 'IRR',
          counterpartyId: params.treaty.reinsurerName,
          identifiedAt: new Date().toISOString(),
        },
      });
    });
  }

  private async publishRecoveryReceived(params: {
    correlationId: string;
    recovery: ReClaimRecovery;
  }): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.ri.recovery_received',
        eventType: 'RecoveryReceived',
        eventVersion: 1,
        correlationId: params.correlationId,
        tenantId: params.recovery.tenantId,
        subject: {
          recoveryId: params.recovery.recoveryId,
          claimId: String(params.recovery.claimId),
          contractId: params.recovery.treatyId,
          tenantId: params.recovery.tenantId,
        },
        payload: {
          receivedAt: new Date().toISOString(),
          amount: this.n(params.recovery.recoveredAmount),
          currency: params.recovery.currency || 'IRR',
          referenceNumber: null,
        },
      });
    });
  }

  private getTicketSlaResponseHoursDefault(): number | null {
    const v = process.env.RE_TICKETS_SLA_RESPONSE_HOURS;
    if (!v) return null;
    const n = parseInt(v, 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  }

  normalizePaging(limit: any, offset: any): { limit: number; offset: number } {
    return { limit: clampInt(limit, 50, 1, 200), offset: clampInt(offset, 0, 0, 1000000) };
  }

  // Treaties
  async createTreaty(params: {
    tenantId: string;
    treatyNumber: string;
    reinsurerName: string;
    treatyType: ReTreaty['treatyType'];
    effectiveFrom: string;
    effectiveTo?: string | null;
    currency?: string;
    retentionRate?: string | number | null;
    cessionRate?: string | number | null;
    config?: any | null;
    terms?: any | null;
    createdBy?: string | null;
  }): Promise<ReTreaty> {
    const tenantId = (params.tenantId || '').trim();
    const treatyNumber = (params.treatyNumber || '').trim();
    const reinsurerName = (params.reinsurerName || '').trim();

    if (!tenantId || !treatyNumber || !reinsurerName || !params.treatyType || !params.effectiveFrom) {
      throw new BadRequestException({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'tenantId, treatyNumber, reinsurerName, treatyType, effectiveFrom are required' },
      });
    }

    const existing = await this.treatiesRepo.findOne({ where: { tenantId, treatyNumber } });
    if (existing) {
      throw new BadRequestException({ success: false, error: { code: 'DUPLICATE', message: 'treatyNumber already exists for tenant' } });
    }

    const t = this.treatiesRepo.create({
      treatyId: uuidv4(),
      tenantId,
      treatyNumber,
      reinsurerName,
      treatyType: params.treatyType,
      status: 'draft',
      retentionRate: params.retentionRate !== undefined && params.retentionRate !== null ? String(params.retentionRate) : null,
      cessionRate: params.cessionRate !== undefined && params.cessionRate !== null ? String(params.cessionRate) : null,
      config: params.config ?? null,
      effectiveFrom: params.effectiveFrom,
      effectiveTo: params.effectiveTo ?? null,
      currency: params.currency || 'IRR',
      terms: params.terms ?? null,
      createdBy: params.createdBy ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.treatiesRepo.save(t);
    // P1 #10: write immutable audit log and entity version
    await this.writeAuditLog({
      resourceType: 're_treaty',
      resourceId: t.treatyId,
      action: 'created',
      actor: params.createdBy || 'system',
      tenantId: t.tenantId,
      before: null,
      after: { treatyId: t.treatyId, treatyNumber: t.treatyNumber, reinsurerName: t.reinsurerName, treatyType: t.treatyType, status: t.status },
    });
    await this.writeEntityVersion({
      resourceType: 're_treaty',
      resourceId: t.treatyId,
      snapshot: { treatyId: t.treatyId, treatyNumber: t.treatyNumber, reinsurerName: t.reinsurerName, treatyType: t.treatyType, status: t.status, retentionRate: t.retentionRate, cessionRate: t.cessionRate, effectiveFrom: t.effectiveFrom, effectiveTo: t.effectiveTo, currency: t.currency, terms: t.terms, config: t.config },
      actor: params.createdBy || 'system',
      tenantId: t.tenantId,
    });
    return t;
  }

  async getTreaty(tenantId: string, treatyId: string): Promise<ReTreaty | null> {
    return await this.treatiesRepo.findOne({ where: { tenantId, treatyId } });
  }

  async listTreaties(params: {
    tenantId: string;
    status?: ReTreatyStatus;
    reinsurerName?: string;
    lineOfBusiness?: string;
    productCode?: string;
    q?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: ReTreaty[]; total: number }> {
    const tenantId = (params.tenantId || '').trim();
    if (!tenantId) {
      throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'tenantId is required' } });
    }

    const qb = this.treatiesRepo.createQueryBuilder('t');
    qb.andWhere('t.tenant_id = :tenantId', { tenantId });

    if (params.status) qb.andWhere('t.status = :status', { status: params.status });
    if (params.reinsurerName) qb.andWhere('t.reinsurer_name = :rn', { rn: params.reinsurerName });
    if (params.q) qb.andWhere('(t.treaty_number ILIKE :q OR t.reinsurer_name ILIKE :q)', { q: `%${params.q}%` });

    // Filter by lineOfBusiness or productCode stored in terms JSONB
    const productFilter = params.productCode || params.lineOfBusiness;
    if (productFilter) {
      qb.andWhere(
        `(t.terms IS NULL OR (t.terms->>'productCodes') IS NULL OR EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(COALESCE(t.terms->'productCodes', '[]'::jsonb)) AS pc
          WHERE pc = :productCode
        ))`,
        { productCode: productFilter }
      );
    }

    qb.orderBy('t.created_at', 'DESC').limit(params.limit).offset(params.offset);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async updateTreaty(params: {
    tenantId: string;
    treatyId: string;
    reinsurerName?: string;
    effectiveFrom?: string;
    effectiveTo?: string | null;
    currency?: string;
    retentionRate?: string | number | null;
    cessionRate?: string | number | null;
    config?: any | null;
    terms?: any | null;
    status?: ReTreatyStatus;
  }): Promise<ReTreaty> {
    const t = await this.getTreaty(params.tenantId, params.treatyId);
    if (!t) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Treaty not found' } });

    if (params.reinsurerName !== undefined) {
      const rn = (params.reinsurerName || '').trim();
      if (!rn) throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'reinsurerName cannot be empty' } });
      t.reinsurerName = rn;
    }
    if (params.effectiveFrom !== undefined) t.effectiveFrom = params.effectiveFrom;
    if (params.effectiveTo !== undefined) t.effectiveTo = params.effectiveTo ?? null;
    if (params.currency !== undefined) t.currency = params.currency || 'IRR';
    if (params.retentionRate !== undefined) t.retentionRate = params.retentionRate !== null ? String(params.retentionRate) : null;
    if (params.cessionRate !== undefined) t.cessionRate = params.cessionRate !== null ? String(params.cessionRate) : null;
    if (params.config !== undefined) t.config = params.config ?? null;
    if (params.terms !== undefined) t.terms = params.terms ?? null;
    if (params.status !== undefined) t.status = params.status;

    t.updatedAt = new Date();
    await this.treatiesRepo.save(t);
    return t;
  }

  async closeTreaty(tenantId: string, treatyId: string): Promise<ReTreaty> {
    const t = await this.getTreaty(tenantId, treatyId);
    if (!t) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Treaty not found' } });
    t.status = 'closed';
    t.updatedAt = new Date();
    await this.treatiesRepo.save(t);
    return t;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // P1 #5 (SoD): Approval state machine — DRAFT → PENDING_APPROVAL → APPROVED/REJECTED
  // The submitter cannot be the approver (Segregation of Duties).
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Submit a treaty for approval.
   * Transitions: draft → pending_approval
   */
  async submitTreatyForApproval(tenantId: string, treatyId: string, submittedBy: string): Promise<ReTreaty> {
    const t = await this.getTreaty(tenantId, treatyId);
    if (!t) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Treaty not found' } });
    if (t.status !== 'draft') {
      throw new BadRequestException({ success: false, error: { code: 'INVALID_STATE', message: `Treaty must be in 'draft' status to submit for approval. Current: ${t.status}` } });
    }
    t.status = 'pending_approval';
    t.submittedBy = submittedBy;
    t.updatedAt = new Date();
    await this.treatiesRepo.save(t);
    return t;
  }

  /**
   * Approve a treaty that was submitted for approval.
   * Transitions: pending_approval → approved
   * SoD check: the approver must NOT be the same user as the submitter.
   */
  async approveTreaty(tenantId: string, treatyId: string, approvedBy: string): Promise<ReTreaty> {
    const t = await this.getTreaty(tenantId, treatyId);
    if (!t) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Treaty not found' } });
    if (t.status !== 'pending_approval') {
      throw new BadRequestException({ success: false, error: { code: 'INVALID_STATE', message: `Treaty must be in 'pending_approval' status to approve. Current: ${t.status}` } });
    }
    // P1 #5 (SoD): submitter cannot be the approver
    if (t.submittedBy && t.submittedBy === approvedBy) {
      throw new ForbiddenException({ success: false, error: { code: 'SOD_VIOLATION', message: 'Segregation of Duties violation: the submitter cannot approve their own submission' } });
    }
    t.status = 'approved';
    t.approvedBy = approvedBy;
    t.submittedBy = null;
    t.updatedAt = new Date();
    await this.treatiesRepo.save(t);
    return t;
  }

  /**
   * Reject a treaty that was submitted for approval.
   * Transitions: pending_approval → rejected
   * SoD check: the rejector must NOT be the same user as the submitter.
   */
  async rejectTreaty(tenantId: string, treatyId: string, rejectedBy: string, reason?: string): Promise<ReTreaty> {
    const t = await this.getTreaty(tenantId, treatyId);
    if (!t) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Treaty not found' } });
    if (t.status !== 'pending_approval') {
      throw new BadRequestException({ success: false, error: { code: 'INVALID_STATE', message: `Treaty must be in 'pending_approval' status to reject. Current: ${t.status}` } });
    }
    // P1 #5 (SoD): submitter cannot be the rejector
    if (t.submittedBy && t.submittedBy === rejectedBy) {
      throw new ForbiddenException({ success: false, error: { code: 'SOD_VIOLATION', message: 'Segregation of Duties violation: the submitter cannot reject their own submission' } });
    }
    t.status = 'rejected';
    t.approvedBy = rejectedBy;
    t.submittedBy = null;
    t.terms = { ...(t.terms || {}), rejectionReason: reason || null };
    t.updatedAt = new Date();
    await this.treatiesRepo.save(t);
    return t;
  }

  /**
   * Activate an approved treaty.
   * Transitions: approved → active
   */
  async activateTreaty(tenantId: string, treatyId: string): Promise<ReTreaty> {
    const t = await this.getTreaty(tenantId, treatyId);
    if (!t) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Treaty not found' } });
    if (t.status !== 'approved' && t.status !== 'draft') {
      throw new BadRequestException({ success: false, error: { code: 'INVALID_STATE', message: `Treaty must be in 'approved' or 'draft' status to activate. Current: ${t.status}` } });
    }
    t.status = 'active';
    t.updatedAt = new Date();
    await this.treatiesRepo.save(t);
    return t;
  }

  // Cessions
  async calculateAutomaticCessions(params: {
    tenantId: string;
    policyId: string;
    policyNumber?: string | null;
    sumInsured: number;
    premium: number;
    productCode: string;
    effectiveDate: string;
    correlationId: string;
  }): Promise<{
    cessions: ReCession[];
    totalCeded: number;
    totalRetained: number;
  }> {
    const tenantId = (params.tenantId || '').trim();
    if (!tenantId) {
      throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'tenantId is required' } });
    }

    const applicableTreaties = await this.treatiesRepo.find({
      where: {
        tenantId,
        status: 'active' as ReTreatyStatus,
      },
    });

    const cessions: ReCession[] = [];
    let totalCeded = 0;

    for (const treaty of applicableTreaties) {
      const isApplicable = this.isTreatyApplicable({
        treaty,
        productCode: params.productCode,
        effectiveDate: params.effectiveDate,
      });

      if (!isApplicable) continue;

      const cessionResult = this.calculateCessionAmount({
        treaty,
        sumInsured: params.sumInsured,
        premium: params.premium,
      });

      if (cessionResult.cededAmount > 0) {
        const cession = await this.createCession({
          tenantId,
          treatyId: treaty.treatyId,
          policyId: params.policyId,
          policyNumber: params.policyNumber ?? null,
          sumInsured: params.sumInsured,
          premium: params.premium,
          cessionPercent: cessionResult.cessionPercent,
          cededAmount: cessionResult.cededAmount,
          cededPremium: (params.premium * cessionResult.cessionPercent) / 100,
          cededSumInsured: cessionResult.cededAmount,
          cessionType: treaty.treatyType,
          retentionRate: treaty.retentionRate,
          cessionRate: treaty.cessionRate,
          effectiveFrom: treaty.effectiveFrom,
          effectiveTo: treaty.effectiveTo,
          currency: treaty.currency,
          notes: `Automatic cession calculated on issuance`,
          correlationId: params.correlationId,
        });

        cessions.push(cession);
        totalCeded += cessionResult.cededAmount;
      }
    }

    const totalRetained = Math.max(0, params.sumInsured - totalCeded);

    return { cessions, totalCeded, totalRetained };
  }

  private isTreatyApplicable(params: {
    treaty: ReTreaty;
    productCode: string;
    effectiveDate: string;
  }): boolean {
    const treaty = params.treaty;
    const effectiveDate = new Date(params.effectiveDate);

    if (treaty.effectiveFrom && new Date(treaty.effectiveFrom) > effectiveDate) return false;
    if (treaty.effectiveTo && new Date(treaty.effectiveTo) < effectiveDate) return false;

    const terms = (treaty.terms as any) || {};
    const productCodes: string[] = Array.isArray(terms.productCodes) ? terms.productCodes : [];
    if (productCodes.length > 0 && !productCodes.includes(params.productCode)) return false;

    const lob = terms.lineOfBusiness;
    if (lob && lob !== params.productCode) return false;

    return true;
  }

  // P0 fix: made public so PolicyConsumer can use it for correct cession calculation.
  calculateCessionAmount(params: {
    treaty: ReTreaty;
    sumInsured: number;
    premium: number;
  }): {
    cessionPercent: number;
    cededAmount: number;
  } {
    const treaty = params.treaty;
    const terms = (treaty.terms as any) || {};
    const config = (treaty.config as any) || {};

    const treatyType = terms.treatyType || config.treatyType || 'quota_share';

    let cessionPercent = 0;
    let cededAmount = 0;

    switch (treatyType) {
      case 'quota_share':
        cessionPercent = this.n(terms.cessionPercent ?? config.cessionPercent ?? treaty.cessionRate);
        cededAmount = (params.sumInsured * cessionPercent) / 100;
        break;

      case 'excess_of_loss':
        const retentionLimit = this.n(terms.retentionLimit ?? config.retentionLimit);
        if (params.sumInsured > retentionLimit) {
          cededAmount = params.sumInsured - retentionLimit;
          cessionPercent = (cededAmount / params.sumInsured) * 100;
        }
        break;

      case 'surplus':
        const surplusRetention = this.n(terms.retentionLimit ?? config.retentionLimit);
        const surplusCapacity = this.n(terms.capacity ?? config.capacity);
        if (params.sumInsured > surplusRetention) {
          const surplusAmount = params.sumInsured - surplusRetention;
          const cedibleSurplus = Math.min(surplusAmount, surplusCapacity);
          cessionPercent = this.n(terms.cessionPercent ?? config.cessionPercent ?? 50);
          cededAmount = (cedibleSurplus * cessionPercent) / 100;
        }
        break;

      default:
        cessionPercent = this.n(terms.cessionPercent ?? config.cessionPercent ?? treaty.cessionRate);
        cededAmount = (params.sumInsured * cessionPercent) / 100;
    }

    return { cessionPercent, cededAmount };
  }

  async createCession(params: {
    tenantId: string;
    treatyId: string;
    policyId?: string | null;
    policyNumber?: string | null;
    riskId?: string | null;
    sumInsured?: string | number | null;
    premium?: string | number | null;
    cessionPercent?: string | number | null;
    cededAmount?: string | number | null;
    cessionType?: string | null;
    retentionRate?: string | number | null;
    cessionRate?: string | number | null;
    cededPremium?: string | number | null;
    cededSumInsured?: string | number | null;
    effectiveFrom?: string | Date | null;
    effectiveTo?: string | Date | null;
    currency?: string | null;
    notes?: string | null;
    createdBy?: string | null;
    correlationId?: string;
  }): Promise<ReCession> {
    const tenantId = (params.tenantId || '').trim();
    const treatyId = (params.treatyId || '').trim();
    if (!tenantId || !treatyId) {
      throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'tenantId and treatyId are required' } });
    }

    const t = await this.getTreaty(tenantId, treatyId);
    if (!t) {
      throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'treatyId is invalid' } });
    }

    const toDateString = (v: string | Date | null | undefined): string | null => {
      if (!v) return null;
      if (v instanceof Date) return v.toISOString().split('T')[0];
      return String(v);
    };

    const c = this.cessionsRepo.create({
      cessionId: uuidv4(),
      tenantId,
      treatyId,
      policyId: params.policyId ?? null,
      policyNumber: params.policyNumber ?? null,
      riskId: params.riskId ?? null,
      cessionType: params.cessionType ?? null,
      sumInsured: params.sumInsured !== undefined && params.sumInsured !== null ? String(params.sumInsured) : null,
      premium: params.premium !== undefined && params.premium !== null ? String(params.premium) : null,
      cessionPercent: params.cessionPercent !== undefined && params.cessionPercent !== null ? String(params.cessionPercent) : null,
      cededAmount: params.cededAmount !== undefined && params.cededAmount !== null ? String(params.cededAmount) : null,
      cededPremium: params.cededPremium !== undefined && params.cededPremium !== null ? String(params.cededPremium) : null,
      cededSumInsured: params.cededSumInsured !== undefined && params.cededSumInsured !== null ? String(params.cededSumInsured) : null,
      retentionRate: params.retentionRate !== undefined && params.retentionRate !== null ? String(params.retentionRate) : null,
      cessionRate: params.cessionRate !== undefined && params.cessionRate !== null ? String(params.cessionRate) : null,
      effectiveFrom: toDateString(params.effectiveFrom),
      effectiveTo: toDateString(params.effectiveTo),
      currency: params.currency || 'IRR',
      status: 'pending',
      notes: params.notes ?? null,
      createdBy: params.createdBy ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.cessionsRepo.save(c);

    await this.publishCededCalculated({
      correlationId: params.correlationId || uuidv4(),
      treaty: t,
      cession: c,
    });
    return c;
  }

  async getCession(tenantId: string, cessionId: string): Promise<ReCession | null> {
    return await this.cessionsRepo.findOne({ where: { tenantId, cessionId } });
  }

  async listCessions(params: {
    tenantId: string;
    treatyId?: string;
    status?: ReCessionStatus;
    policyId?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: ReCession[]; total: number }> {
    const tenantId = (params.tenantId || '').trim();
    if (!tenantId) {
      throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'tenantId is required' } });
    }

    const qb = this.cessionsRepo.createQueryBuilder('c');
    qb.andWhere('c.tenant_id = :tenantId', { tenantId });

    if (params.treatyId) qb.andWhere('c.treaty_id = :tid', { tid: params.treatyId });
    if (params.status) qb.andWhere('c.status = :status', { status: params.status });
    if (params.policyId) qb.andWhere('c.policy_id = :policyId', { policyId: params.policyId });

    qb.orderBy('c.created_at', 'DESC').limit(params.limit).offset(params.offset);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async updateCession(params: {
    tenantId: string;
    cessionId: string;
    notes?: string | null;
    sumInsured?: string | number | null;
    premium?: string | number | null;
    cessionPercent?: string | number | null;
    cededAmount?: string | number | null;
    cededPremium?: string | number | null;
    cededSumInsured?: string | number | null;
    status?: ReCessionStatus;
    correlationId?: string;
  }): Promise<ReCession> {
    const c = await this.getCession(params.tenantId, params.cessionId);
    if (!c) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Cession not found' } });

    if (params.notes !== undefined) c.notes = params.notes ?? null;
    if (params.sumInsured !== undefined) c.sumInsured = params.sumInsured !== null ? String(params.sumInsured) : null;
    if (params.premium !== undefined) c.premium = params.premium !== null ? String(params.premium) : null;
    if (params.cessionPercent !== undefined) c.cessionPercent = params.cessionPercent !== null ? String(params.cessionPercent) : null;
    if (params.cededAmount !== undefined) c.cededAmount = params.cededAmount !== null ? String(params.cededAmount) : null;
    if (params.cededPremium !== undefined) c.cededPremium = params.cededPremium !== null ? String(params.cededPremium) : null;
    if (params.cededSumInsured !== undefined) c.cededSumInsured = params.cededSumInsured !== null ? String(params.cededSumInsured) : null;
    if (params.status !== undefined) c.status = params.status;

    c.updatedAt = new Date();
    await this.cessionsRepo.save(c);

    const t = await this.getTreaty(c.tenantId, c.treatyId);
    if (t) {
      await this.publishCededCalculated({
        correlationId: params.correlationId || uuidv4(),
        treaty: t,
        cession: c,
      });
    }
    return c;
  }

  async approveCession(params: { tenantId: string; cessionId: string; approved: boolean; notes?: string | null }): Promise<ReCession> {
    const c = await this.getCession(params.tenantId, params.cessionId);
    if (!c) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Cession not found' } });
    c.status = params.approved ? 'approved' : 'rejected';
    if (params.notes !== undefined) c.notes = params.notes ?? null;
    c.updatedAt = new Date();
    await this.cessionsRepo.save(c);

    const t = await this.getTreaty(c.tenantId, c.treatyId);
    if (t) {
      await this.publishCededCalculated({
        correlationId: uuidv4(),
        treaty: t,
        cession: c,
      });
    }
    return c;
  }

  // Statements
  async createStatement(params: {
    tenantId: string;
    treatyId: string;
    statementType: ReStatement['statementType'];
    periodStart: string;
    periodEnd: string;
    totals?: any | null;
    createdBy?: string | null;
  }): Promise<ReStatement> {
    const tenantId = (params.tenantId || '').trim();
    const treatyId = (params.treatyId || '').trim();
    if (!tenantId || !treatyId || !params.statementType || !params.periodStart || !params.periodEnd) {
      throw new BadRequestException({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'tenantId, treatyId, statementType, periodStart, periodEnd are required' },
      });
    }

    const t = await this.getTreaty(tenantId, treatyId);
    if (!t) throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'treatyId is invalid' } });

    const s = this.statementsRepo.create({
      statementId: uuidv4(),
      tenantId,
      treatyId,
      statementType: params.statementType,
      status: 'draft',
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      totals: params.totals ?? null,
      createdBy: params.createdBy ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.statementsRepo.save(s);
    return s;
  }

  async getStatement(tenantId: string, statementId: string): Promise<ReStatement | null> {
    return await this.statementsRepo.findOne({ where: { tenantId, statementId } });
  }

  async listStatements(params: {
    tenantId: string;
    treatyId?: string;
    status?: ReStatementStatus;
    statementType?: ReStatement['statementType'];
    limit: number;
    offset: number;
  }): Promise<{ rows: ReStatement[]; total: number }> {
    const tenantId = (params.tenantId || '').trim();
    if (!tenantId) {
      throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'tenantId is required' } });
    }

    const qb = this.statementsRepo.createQueryBuilder('s');
    qb.andWhere('s.tenant_id = :tenantId', { tenantId });
    if (params.treatyId) qb.andWhere('s.treaty_id = :tid', { tid: params.treatyId });
    if (params.status) qb.andWhere('s.status = :status', { status: params.status });
    if (params.statementType) qb.andWhere('s.statement_type = :st', { st: params.statementType });
    qb.orderBy('s.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async updateStatement(params: { tenantId: string; statementId: string; status?: ReStatementStatus; totals?: any | null }): Promise<ReStatement> {
    const s = await this.getStatement(params.tenantId, params.statementId);
    if (!s) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Statement not found' } });
    const prevStatus = s.status;
    if (params.status !== undefined) s.status = params.status;
    if (params.totals !== undefined) s.totals = params.totals ?? null;
    s.updatedAt = new Date();
    await this.statementsRepo.save(s);

    if (prevStatus !== 'issued' && s.status === 'issued' && s.statementType === 'bordereau') {
      const t = await this.getTreaty(s.tenantId, s.treatyId);
      if (t) {
        await this.publishBorderauxGenerated({ correlationId: uuidv4(), statement: s, treaty: t });
      }
    }

    return s;
  }

  // Reconciliations
  async createReconciliation(params: {
    tenantId: string;
    statementId: string;
    summary?: string | null;
    details?: any | null;
    createdBy?: string | null;
  }): Promise<ReReconciliation> {
    const tenantId = (params.tenantId || '').trim();
    const statementId = (params.statementId || '').trim();
    if (!tenantId || !statementId) {
      throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'tenantId and statementId are required' } });
    }

    const s = await this.getStatement(tenantId, statementId);
    if (!s) throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'statementId is invalid' } });

    const r = this.reconciliationsRepo.create({
      reconciliationId: uuidv4(),
      tenantId,
      statementId,
      status: 'open',
      summary: params.summary ?? null,
      details: params.details ?? null,
      createdBy: params.createdBy ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.reconciliationsRepo.save(r);
    return r;
  }

  async getReconciliation(tenantId: string, reconciliationId: string): Promise<ReReconciliation | null> {
    return await this.reconciliationsRepo.findOne({ where: { tenantId, reconciliationId } });
  }

  async listReconciliations(params: {
    tenantId: string;
    statementId?: string;
    status?: ReReconciliationStatus;
    limit: number;
    offset: number;
  }): Promise<{ rows: ReReconciliation[]; total: number }> {
    const tenantId = (params.tenantId || '').trim();
    if (!tenantId) {
      throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'tenantId is required' } });
    }

    const qb = this.reconciliationsRepo.createQueryBuilder('r');
    qb.andWhere('r.tenant_id = :tenantId', { tenantId });
    if (params.statementId) qb.andWhere('r.statement_id = :sid', { sid: params.statementId });
    if (params.status) qb.andWhere('r.status = :status', { status: params.status });
    qb.orderBy('r.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async updateReconciliation(params: {
    tenantId: string;
    reconciliationId: string;
    status?: ReReconciliationStatus;
    summary?: string | null;
    details?: any | null;
  }): Promise<ReReconciliation> {
    const r = await this.getReconciliation(params.tenantId, params.reconciliationId);
    if (!r)
      throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Reconciliation not found' } });

    if (params.status !== undefined) r.status = params.status;
    if (params.summary !== undefined) r.summary = params.summary ?? null;
    if (params.details !== undefined) r.details = params.details ?? null;

    r.updatedAt = new Date();
    await this.reconciliationsRepo.save(r);
    return r;
  }

  async exportSnapshot(params: {
    tenantId: string;
    treatiesLimit: number;
    cessionsLimit: number;
    statementsLimit: number;
    reconciliationsLimit: number;
    recoveriesLimit?: number;
    ticketsLimit?: number;
  }): Promise<{
    treaties: ReTreaty[];
    cessions: ReCession[];
    statements: ReStatement[];
    reconciliations: ReReconciliation[];
    recoveries: ReClaimRecovery[];
    tickets: ReTicket[];
  }> {
    const tenantId = (params.tenantId || '').trim();
    if (!tenantId) {
      throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'tenantId is required' } });
    }

    const treatiesLimit = clampInt(params.treatiesLimit, 200, 1, 2000);
    const cessionsLimit = clampInt(params.cessionsLimit, 200, 1, 2000);
    const statementsLimit = clampInt(params.statementsLimit, 200, 1, 2000);
    const reconciliationsLimit = clampInt(params.reconciliationsLimit, 200, 1, 2000);
    const recoveriesLimit = clampInt(params.recoveriesLimit ?? 200, 200, 1, 2000);
    const ticketsLimit = clampInt(params.ticketsLimit ?? 200, 200, 1, 2000);

    const [treaties, cessions, statements, reconciliations, recoveries, tickets] = await Promise.all([
      this.treatiesRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' }, take: treatiesLimit }),
      this.cessionsRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' }, take: cessionsLimit }),
      this.statementsRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' }, take: statementsLimit }),
      this.reconciliationsRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' }, take: reconciliationsLimit }),
      this.recoveriesRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' }, take: recoveriesLimit }),
      this.ticketsRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' }, take: ticketsLimit }),
    ]);

    return { treaties, cessions, statements, reconciliations, recoveries, tickets };
  }

  // Claim Recoveries
  async createRecovery(params: {
    tenantId: string;
    treatyId: string;
    claimId: string;
    policyId?: string | null;
    lossDate?: string | null;
    grossLossAmount?: string | number | null;
    cededLossAmount?: string | number | null;
    recoveredAmount?: string | number | null;
    currency?: string;
    status?: ReClaimRecoveryStatus;
    nextFollowUpAt?: string | null;
    notes?: string | null;
    createdBy?: string | null;
    correlationId?: string;
  }): Promise<ReClaimRecovery> {
    const tenantId = (params.tenantId || '').trim();
    const treatyId = (params.treatyId || '').trim();
    const claimId = (params.claimId || '').trim();
    if (!tenantId || !treatyId || !claimId) {
      throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'tenantId, treatyId and claimId are required' } });
    }
    const t = await this.getTreaty(tenantId, treatyId);
    if (!t) throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'treatyId is invalid' } });

    const r = this.recoveriesRepo.create({
      recoveryId: uuidv4(),
      tenantId,
      treatyId,
      claimId,
      policyId: params.policyId ?? null,
      lossDate: params.lossDate ?? null,
      grossLossAmount: params.grossLossAmount !== undefined && params.grossLossAmount !== null ? String(params.grossLossAmount) : null,
      cededLossAmount: params.cededLossAmount !== undefined && params.cededLossAmount !== null ? String(params.cededLossAmount) : null,
      recoveredAmount: params.recoveredAmount !== undefined && params.recoveredAmount !== null ? String(params.recoveredAmount) : null,
      currency: params.currency || 'IRR',
      status: params.status ?? 'open',
      nextFollowUpAt: params.nextFollowUpAt ? new Date(params.nextFollowUpAt) : null,
      notes: params.notes ?? null,
      createdBy: params.createdBy ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await this.recoveriesRepo.save(r);

    await this.publishRecoveryIdentified({
      correlationId: params.correlationId || uuidv4(),
      recovery: r,
      treaty: t,
    });
    return r;
  }

  async getRecovery(tenantId: string, recoveryId: string): Promise<ReClaimRecovery | null> {
    return await this.recoveriesRepo.findOne({ where: { tenantId, recoveryId } });
  }

  async listRecoveries(params: {
    tenantId: string;
    treatyId?: string;
    status?: ReClaimRecoveryStatus;
    claimId?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: ReClaimRecovery[]; total: number }> {
    const tenantId = (params.tenantId || '').trim();
    if (!tenantId) {
      throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'tenantId is required' } });
    }

    const qb = this.recoveriesRepo.createQueryBuilder('r');
    qb.andWhere('r.tenant_id = :tenantId', { tenantId });
    if (params.treatyId) qb.andWhere('r.treaty_id = :tid', { tid: params.treatyId });
    if (params.status) qb.andWhere('r.status = :status', { status: params.status });
    if (params.claimId) qb.andWhere('r.claim_id = :claimId', { claimId: params.claimId });
    qb.orderBy('r.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async updateRecovery(params: {
    tenantId: string;
    recoveryId: string;
    status?: ReClaimRecoveryStatus;
    recoveredAmount?: string | number | null;
    nextFollowUpAt?: string | null;
    notes?: string | null;
    correlationId?: string;
  }): Promise<ReClaimRecovery> {
    const r = await this.getRecovery(params.tenantId, params.recoveryId);
    if (!r) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Recovery not found' } });

    const prevRecoveredAmount = r.recoveredAmount;
    const prevStatus = r.status;
    if (params.status !== undefined) r.status = params.status;
    if (params.recoveredAmount !== undefined) r.recoveredAmount = params.recoveredAmount !== null ? String(params.recoveredAmount) : null;
    if (params.nextFollowUpAt !== undefined) r.nextFollowUpAt = params.nextFollowUpAt ? new Date(params.nextFollowUpAt) : null;
    if (params.notes !== undefined) r.notes = params.notes ?? null;
    r.updatedAt = new Date();
    await this.recoveriesRepo.save(r);

    const receivedTriggered =
      (params.recoveredAmount !== undefined && r.recoveredAmount !== null && r.recoveredAmount !== prevRecoveredAmount) ||
      (prevStatus !== r.status && ['partially_collected', 'collected'].includes(r.status));

    if (receivedTriggered) {
      await this.publishRecoveryReceived({
        correlationId: params.correlationId || uuidv4(),
        recovery: r,
      });
    }

    return r;
  }

  // Reconciliation Tickets
  async createTicket(params: {
    tenantId: string;
    reconciliationId: string;
    reasonCode: string;
    summary?: string | null;
    assignedTo?: string | null;
    slaResponseDueAt?: string | null;
    createdBy?: string | null;
  }): Promise<ReTicket> {
    const tenantId = (params.tenantId || '').trim();
    const reconciliationId = (params.reconciliationId || '').trim();
    const reasonCode = (params.reasonCode || '').trim();
    if (!tenantId || !reconciliationId || !reasonCode) {
      throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'tenantId, reconciliationId and reasonCode are required' } });
    }
    const rec = await this.getReconciliation(tenantId, reconciliationId);
    if (!rec) throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'reconciliationId is invalid' } });

    const now = new Date();
    const slaDefaultH = this.getTicketSlaResponseHoursDefault();
    const slaResponseDueAt = params.slaResponseDueAt
      ? new Date(params.slaResponseDueAt)
      : slaDefaultH
        ? new Date(now.getTime() + slaDefaultH * 60 * 60 * 1000)
        : null;

    const t = this.ticketsRepo.create({
      ticketId: uuidv4(),
      tenantId,
      reconciliationId,
      reasonCode,
      status: 'open',
      slaResponseDueAt,
      assignedTo: params.assignedTo ?? null,
      summary: params.summary ?? null,
      resolvedAt: null,
      createdBy: params.createdBy ?? null,
      createdAt: now,
      updatedAt: now,
    });
    await this.ticketsRepo.save(t);
    return t;
  }

  async getTicket(tenantId: string, ticketId: string): Promise<ReTicket | null> {
    return await this.ticketsRepo.findOne({ where: { tenantId, ticketId } });
  }

  async listTickets(params: {
    tenantId: string;
    reconciliationId?: string;
    status?: ReTicketStatus;
    assignedTo?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: ReTicket[]; total: number }> {
    const tenantId = (params.tenantId || '').trim();
    if (!tenantId) {
      throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'tenantId is required' } });
    }

    const qb = this.ticketsRepo.createQueryBuilder('t');
    qb.andWhere('t.tenant_id = :tenantId', { tenantId });
    if (params.reconciliationId) qb.andWhere('t.reconciliation_id = :rid', { rid: params.reconciliationId });
    if (params.status) qb.andWhere('t.status = :status', { status: params.status });
    if (params.assignedTo) qb.andWhere('t.assigned_to = :assignedTo', { assignedTo: params.assignedTo });
    qb.orderBy('t.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async assignTicket(params: { tenantId: string; ticketId: string; assignedTo: string | null }): Promise<ReTicket> {
    const t = await this.getTicket(params.tenantId, params.ticketId);
    if (!t) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    t.assignedTo = params.assignedTo;
    t.updatedAt = new Date();
    await this.ticketsRepo.save(t);
    return t;
  }

  async updateTicket(params: { tenantId: string; ticketId: string; status?: ReTicketStatus; summary?: string | null }): Promise<ReTicket> {
    const t = await this.getTicket(params.tenantId, params.ticketId);
    if (!t) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    if (params.status !== undefined) t.status = params.status;
    if (params.summary !== undefined) t.summary = params.summary ?? null;
    if (params.status === 'resolved' && !t.resolvedAt) t.resolvedAt = new Date();
    t.updatedAt = new Date();
    await this.ticketsRepo.save(t);
    return t;
  }

  async addTicketMessage(params: { tenantId: string; ticketId: string; messageType?: 'internal' | 'external'; body: string; createdBy?: string | null }): Promise<ReTicketMessage> {
    const tenantId = (params.tenantId || '').trim();
    const ticketId = (params.ticketId || '').trim();
    const body = (params.body || '').trim();
    if (!tenantId || !ticketId || !body) {
      throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'tenantId, ticketId and body are required' } });
    }
    const t = await this.getTicket(tenantId, ticketId);
    if (!t) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } });

    const m = this.ticketMessagesRepo.create({
      ticketMessageId: uuidv4(),
      tenantId,
      ticketId,
      messageType: params.messageType ?? 'internal',
      body,
      createdBy: params.createdBy ?? null,
      createdAt: new Date(),
    });
    await this.ticketMessagesRepo.save(m);
    return m;
  }

  async listTicketMessages(tenantId: string, ticketId: string): Promise<ReTicketMessage[]> {
    return await this.ticketMessagesRepo.find({ where: { tenantId, ticketId }, order: { createdAt: 'ASC' } });
  }

  async addTicketAttachment(params: { tenantId: string; ticketId: string; documentId: string; notes?: string | null; createdBy?: string | null }): Promise<ReTicketAttachment> {
    const tenantId = (params.tenantId || '').trim();
    const ticketId = (params.ticketId || '').trim();
    const documentId = (params.documentId || '').trim();
    if (!tenantId || !ticketId || !documentId) {
      throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'tenantId, ticketId and documentId are required' } });
    }
    const t = await this.getTicket(tenantId, ticketId);
    if (!t) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } });

    const a = this.ticketAttachmentsRepo.create({
      ticketAttachmentId: uuidv4(),
      tenantId,
      ticketId,
      documentId,
      notes: params.notes ?? null,
      createdBy: params.createdBy ?? null,
      createdAt: new Date(),
    });
    await this.ticketAttachmentsRepo.save(a);
    return a;
  }

  async listTicketAttachments(tenantId: string, ticketId: string): Promise<ReTicketAttachment[]> {
    return await this.ticketAttachmentsRepo.find({ where: { tenantId, ticketId }, order: { createdAt: 'DESC' } });
  }

  async registerExternalInvoice(params: {
    tenantId: string;
    statementId: string;
    invoiceNumber: string;
    invoiceDate: string;
    invoiceAmount: number;
    invoiceCurrency?: string;
    receivedFrom: string;
    createdBy?: string | null;
  }): Promise<ReReconciliation> {
    const tenantId = (params.tenantId || '').trim();
    const statement = await this.getStatement(tenantId, params.statementId);
    if (!statement) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Statement not found' } });

    const existingReconciliation = await this.reconciliationsRepo.findOne({ where: { tenantId, statementId: params.statementId } });
    if (existingReconciliation) {
      const previous = {
        externalInvoiceNumber: existingReconciliation.externalInvoiceNumber,
        externalInvoiceDate: existingReconciliation.externalInvoiceDate,
        externalInvoiceAmount: existingReconciliation.externalInvoiceAmount,
        externalInvoiceCurrency: existingReconciliation.externalInvoiceCurrency,
        receivedFrom: existingReconciliation.receivedFrom,
        updatedAt: existingReconciliation.updatedAt,
      };

      const history = (existingReconciliation.details as any)?.invoiceHistory || [];
      history.push({ ...previous, recordedAt: new Date().toISOString() });

      existingReconciliation.externalInvoiceNumber = params.invoiceNumber;
      existingReconciliation.externalInvoiceDate = params.invoiceDate;
      existingReconciliation.externalInvoiceAmount = params.invoiceAmount;
      existingReconciliation.externalInvoiceCurrency = params.invoiceCurrency || 'IRR';
      existingReconciliation.receivedFrom = params.receivedFrom;
      existingReconciliation.details = { ...(existingReconciliation.details || {}), invoiceHistory: history };
      existingReconciliation.updatedAt = new Date();
      await this.reconciliationsRepo.save(existingReconciliation);
      return existingReconciliation;
    }

    const reconciliation = this.reconciliationsRepo.create({
      reconciliationId: uuidv4(),
      tenantId,
      statementId: params.statementId,
      status: 'open',
      summary: `External invoice ${params.invoiceNumber} received`,
      details: { invoiceHistory: [] },
      externalInvoiceNumber: params.invoiceNumber,
      externalInvoiceDate: params.invoiceDate,
      externalInvoiceAmount: params.invoiceAmount,
      externalInvoiceCurrency: params.invoiceCurrency || 'IRR',
      receivedFrom: params.receivedFrom,
      matchedAt: null,
      matchConfidence: null,
      createdBy: params.createdBy ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await this.reconciliationsRepo.save(reconciliation);
    return reconciliation;
  }

  async autoMatchInvoice(params: {
    tenantId: string;
    reconciliationId: string;
    tolerancePercent?: number;
  }): Promise<{ reconciliation: ReReconciliation; matched: boolean; confidence: number; reason: string }> {
    const reconciliation = await this.getReconciliation(params.tenantId, params.reconciliationId);
    if (!reconciliation) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Reconciliation not found' } });

    const statement = await this.getStatement(params.tenantId, reconciliation.statementId);
    if (!statement) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Statement not found' } });

    const treaty = await this.getTreaty(params.tenantId, statement.treatyId);
    if (!treaty) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Treaty not found' } });

    const tolerancePercent = params.tolerancePercent || 5;
    const statementAmount = this.n((statement.totals as any)?.totalCededAmount ?? (statement.totals as any)?.cededAmount ?? 0);
    const invoiceAmount = this.n(reconciliation.externalInvoiceAmount);

    const amountDiff = Math.abs(statementAmount - invoiceAmount);
    const amountTolerance = (statementAmount * tolerancePercent) / 100;
    const amountMatch = amountDiff <= amountTolerance;

    const reinsurerMatch = reconciliation.receivedFrom?.toLowerCase().includes(treaty.reinsurerName?.toLowerCase()) || false;
    const invoiceDateMatch = this.checkInvoicePeriodMatch(reconciliation.externalInvoiceDate, statement.periodStart, statement.periodEnd);

    let confidence = 0;
    if (amountMatch) confidence += 40;
    if (reinsurerMatch) confidence += 30;
    if (invoiceDateMatch) confidence += 30;

    const matched = confidence >= 70;
    const reason = matched ? 'Auto-matched based on amount, reinsurer, and period' : 'Low confidence match - manual review required';

    if (matched) {
      reconciliation.status = 'matched';
      reconciliation.matchedAt = new Date();
      reconciliation.matchConfidence = confidence;
      reconciliation.summary = `Auto-matched with invoice ${reconciliation.externalInvoiceNumber} (confidence: ${confidence}%)`;
    } else {
      reconciliation.matchConfidence = confidence;
      reconciliation.summary = `Low confidence match (confidence: ${confidence}%) - manual review required`;
    }
    reconciliation.updatedAt = new Date();
    await this.reconciliationsRepo.save(reconciliation);

    return { reconciliation, matched, confidence, reason };
  }

  private checkInvoicePeriodMatch(invoiceDate: string | null, periodStart: string, periodEnd: string): boolean {
    if (!invoiceDate) return false;
    const invoice = new Date(invoiceDate);
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    const bufferDays = parseInt(process.env.RE_INVOICE_MATCH_BUFFER_DAYS || '3', 10) || 3;
    const bufferedStart = new Date(start.getTime() - bufferDays * 24 * 60 * 60 * 1000);
    const bufferedEnd = new Date(end.getTime() + bufferDays * 24 * 60 * 60 * 1000);
    return invoice >= bufferedStart && invoice <= bufferedEnd;
  }

  async closePeriod(params: {
    tenantId: string;
    treatyId: string;
    periodEnd: string;
    notes?: string | null;
    actorUserId?: string | null;
    correlationId?: string;
  }): Promise<{
    treatyId: string;
    periodEnd: string;
    closedAt: string;
    cessionsClosed: number;
    statementsCreated: number;
  }> {
    const tenantId = (params.tenantId || '').trim();
    if (!tenantId) {
      throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'tenantId is required' } });
    }

    return await this.dataSource.transaction(async (manager) => {
      const treatyRepo = manager.getRepository(ReTreaty);
      const cessionRepo = manager.getRepository(ReCession);
      const statementRepo = manager.getRepository(ReStatement);

      const treaty = await treatyRepo.findOne({ where: { tenantId, treatyId: params.treatyId } });
      if (!treaty) {
        throw new Error('Treaty not found');
      }

      const periodEndDate = new Date(params.periodEnd);
      if (isNaN(periodEndDate.getTime())) {
        throw new Error('Invalid periodEnd date');
      }

      const periodStartDate = new Date(periodEndDate.getFullYear(), periodEndDate.getMonth(), 1);
      const periodStartStr = periodStartDate.toISOString().split('T')[0];

      const cessions = await cessionRepo.find({
        where: {
          tenantId,
          treatyId: params.treatyId,
          status: 'approved' as ReCessionStatus,
        },
      });

      const applicableCessions = cessions.filter((c) => c.createdAt <= periodEndDate);

      if (applicableCessions.length === 0) {
        return {
          treatyId: params.treatyId,
          periodEnd: params.periodEnd,
          closedAt: new Date().toISOString(),
          cessionsClosed: 0,
          statementsCreated: 0,
        };
      }

      let existingStatement = await statementRepo.findOne({
        where: {
          tenantId,
          treatyId: params.treatyId,
          periodEnd: params.periodEnd,
        },
      });

      if (!existingStatement) {
        const totalCessions = applicableCessions.length;
        const totalCededAmount = applicableCessions.reduce((sum, c) => sum + this.n(c.cededAmount), 0);
        const totalPremium = applicableCessions.reduce((sum, c) => sum + this.n(c.premium), 0);

        const totals = {
          totalCessions,
          totalCededAmount: totalCededAmount.toFixed(2),
          totalPremium: totalPremium.toFixed(2),
        };

        existingStatement = statementRepo.create({
          statementId: uuidv4(),
          tenantId,
          treatyId: params.treatyId,
          statementType: 'period_close',
          periodStart: periodStartStr,
          periodEnd: params.periodEnd,
          totals,
          status: 'finalized' as ReStatementStatus,
          createdBy: params.actorUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await statementRepo.save(existingStatement);

        await this.publishPeriodClosed({
          correlationId: params.correlationId || uuidv4(),
          statement: existingStatement,
          treaty,
          actorUserId: params.actorUserId,
          notes: params.notes,
        });
      }

      for (const cession of applicableCessions) {
        cession.status = 'settled';
        cession.updatedAt = new Date();
        await cessionRepo.save(cession);
      }

      return {
        treatyId: params.treatyId,
        periodEnd: params.periodEnd,
        closedAt: new Date().toISOString(),
        cessionsClosed: applicableCessions.length,
        statementsCreated: 1,
      };
    });
  }
}
