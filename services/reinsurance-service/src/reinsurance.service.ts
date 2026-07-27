import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
    @InjectRepository(ReTicketAttachment) private readonly ticketAttachmentsRepo: Repository<ReTicketAttachment>
  ) {
    // OutboxPublisher is now created per-operation inside transactions
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

    await this.dataSource.transaction(async (manager) => { const outbox = new OutboxPublisher(manager); await outbox.publish({
      topic: 'insurance.ri.ceded_calculated',
      eventType: 'CededCalculated',
      eventVersion: 1,
      correlationId: params.correlationId,
      subject: {
        contractId: params.treaty.treatyId,
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
    }); });
  }

  private async publishBorderauxGenerated(params: {
    correlationId: string;
    statement: ReStatement;
    treaty: ReTreaty;
  }): Promise<void> {
    const itemsCount = typeof (params.statement.totals as any)?.itemsCount === 'number' ? (params.statement.totals as any).itemsCount : 0;

    await this.dataSource.transaction(async (manager) => { const outbox = new OutboxPublisher(manager); await outbox.publish({
      topic: 'insurance.ri.borderaux_generated',
      eventType: 'BorderauxGenerated',
      eventVersion: 1,
      correlationId: params.correlationId,
      subject: {
        borderauxId: params.statement.statementId,
        contractId: params.statement.treatyId,
      },
      payload: {
        periodStart: this.isoDateAsDateTime(params.statement.periodStart),
        periodEnd: this.isoDateAsDateTime(params.statement.periodEnd),
        itemsCount,
        documentId: (params.statement.totals as any)?.documentId ?? null,
      },
    }); });
  }

  private async publishRecoveryIdentified(params: {
    correlationId: string;
    recovery: ReClaimRecovery;
    treaty: ReTreaty;
  }): Promise<void> {
    await this.dataSource.transaction(async (manager) => { const outbox = new OutboxPublisher(manager); await outbox.publish({
      topic: 'insurance.ri.recovery_identified',
      eventType: 'RecoveryIdentified',
      eventVersion: 1,
      correlationId: params.correlationId,
      subject: {
        recoveryId: params.recovery.recoveryId,
        claimId: String(params.recovery.claimId),
        contractId: params.recovery.treatyId,
      },
      payload: {
        recoverableAmount: this.n(params.recovery.cededLossAmount),
        currency: params.recovery.currency || 'IRR',
        counterpartyId: params.treaty.reinsurerName,
        identifiedAt: new Date().toISOString(),
      },
    }); });
  }

  private async publishRecoveryReceived(params: {
    correlationId: string;
    recovery: ReClaimRecovery;
  }): Promise<void> {
    await this.dataSource.transaction(async (manager) => { const outbox = new OutboxPublisher(manager); await outbox.publish({
      topic: 'insurance.ri.recovery_received',
      eventType: 'RecoveryReceived',
      eventVersion: 1,
      correlationId: params.correlationId,
      subject: {
        recoveryId: params.recovery.recoveryId,
        claimId: String(params.recovery.claimId),
        contractId: params.recovery.treatyId,
      },
      payload: {
        receivedAt: new Date().toISOString(),
        amount: this.n(params.recovery.recoveredAmount),
        currency: params.recovery.currency || 'IRR',
        referenceNumber: null,
      },
    }); });
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

  async createTreaty(params: {
    treatyNumber: string;
    reinsurerName: string;
    treatyType: ReTreaty['treatyType'];
    effectiveFrom: string;
    effectiveTo?: string | null;
    currency?: string;
    terms?: any | null;
    createdBy?: string | null;
  }): Promise<ReTreaty> {
    const treatyNumber = (params.treatyNumber || '').trim();
    const reinsurerName = (params.reinsurerName || '').trim();

    if (!treatyNumber || !reinsurerName || !params.treatyType || !params.effectiveFrom) {
      throw new BadRequestException({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'treatyNumber, reinsurerName, treatyType, effectiveFrom are required' },
      });
    }

    const existing = await this.treatiesRepo.findOne({ where: { treatyNumber } });
    if (existing) {
      throw new BadRequestException({ success: false, error: { code: 'DUPLICATE', message: 'treatyNumber already exists' } });
    }

    const t = this.treatiesRepo.create({
      treatyId: uuidv4(),
      treatyNumber,
      reinsurerName,
      treatyType: params.treatyType,
      status: 'draft',
      effectiveFrom: params.effectiveFrom,
      effectiveTo: params.effectiveTo ?? null,
      currency: params.currency || 'IRR',
      terms: params.terms ?? null,
      createdBy: params.createdBy ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.treatiesRepo.save(t);
    return t;
  }

  async getTreaty(treatyId: string): Promise<ReTreaty | null> {
    return await this.treatiesRepo.findOne({ where: { treatyId } });
  }

  async listTreaties(params: {
    status?: ReTreatyStatus;
    reinsurerName?: string;
    lineOfBusiness?: string;
    q?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: ReTreaty[]; total: number }> {
    const qb = this.treatiesRepo.createQueryBuilder('t');

    if (params.status) qb.andWhere('t.status = :status', { status: params.status });
    if (params.reinsurerName) qb.andWhere('t.reinsurer_name = :rn', { rn: params.reinsurerName });
    if (params.q) qb.andWhere('(t.treaty_number ILIKE :q OR t.reinsurer_name ILIKE :q)', { q: `%${params.q}%` });

    qb.orderBy('t.created_at', 'DESC').limit(params.limit).offset(params.offset);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async updateTreaty(params: {
    treatyId: string;
    reinsurerName?: string;
    effectiveFrom?: string;
    effectiveTo?: string | null;
    currency?: string;
    terms?: any | null;
    status?: ReTreatyStatus;
  }): Promise<ReTreaty> {
    const t = await this.getTreaty(params.treatyId);
    if (!t) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Treaty not found' } });

    if (params.reinsurerName !== undefined) {
      const rn = (params.reinsurerName || '').trim();
      if (!rn) throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'reinsurerName cannot be empty' } });
      t.reinsurerName = rn;
    }
    if (params.effectiveFrom !== undefined) t.effectiveFrom = params.effectiveFrom;
    if (params.effectiveTo !== undefined) t.effectiveTo = params.effectiveTo ?? null;
    if (params.currency !== undefined) t.currency = params.currency || 'IRR';
    if (params.terms !== undefined) t.terms = params.terms ?? null;
    if (params.status !== undefined) t.status = params.status;

    t.updatedAt = new Date();
    await this.treatiesRepo.save(t);
    return t;
  }

  async closeTreaty(treatyId: string): Promise<ReTreaty> {
    const t = await this.getTreaty(treatyId);
    if (!t) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Treaty not found' } });
    t.status = 'closed';
    t.updatedAt = new Date();
    await this.treatiesRepo.save(t);
    return t;
  }

  // Cessions
  async calculateAutomaticCessions(params: {
    policyId: string;
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
    // Find applicable treaties for this product and date
    const applicableTreaties = await this.treatiesRepo.find({
      where: {
        status: 'active' as ReTreatyStatus,
      },
    });

    const cessions: ReCession[] = [];
    let totalCeded = 0;

    for (const treaty of applicableTreaties) {
      // Check if treaty is applicable based on product and date
      const isApplicable = this.isTreatyApplicable({
        treaty,
        productCode: params.productCode,
        effectiveDate: params.effectiveDate,
      });

      if (!isApplicable) {
        continue;
      }

      // Calculate cession based on treaty type
      const cessionResult = this.calculateCessionAmount({
        treaty,
        sumInsured: params.sumInsured,
        premium: params.premium,
      });

      if (cessionResult.cededAmount > 0) {
        const cession = await this.createCession({
          treatyId: treaty.treatyId,
          policyId: params.policyId,
          sumInsured: params.sumInsured,
          premium: params.premium,
          cessionPercent: cessionResult.cessionPercent,
          cededAmount: cessionResult.cededAmount,
          notes: `Automatic cession calculated on issuance`,
          correlationId: params.correlationId,
        });

        cessions.push(cession);
        totalCeded += cessionResult.cededAmount;
      }
    }

    const totalRetained = Math.max(0, params.sumInsured - totalCeded);

    return {
      cessions,
      totalCeded,
      totalRetained,
    };
  }

  private isTreatyApplicable(params: {
    treaty: ReTreaty;
    productCode: string;
    effectiveDate: string;
  }): boolean {
    const treaty = params.treaty;
    const effectiveDate = new Date(params.effectiveDate);

    // Check if treaty is within effective period
    if (treaty.effectiveFrom && new Date(treaty.effectiveFrom) > effectiveDate) {
      return false;
    }

    if (treaty.effectiveTo && new Date(treaty.effectiveTo) < effectiveDate) {
      return false;
    }

    // Check if treaty applies to this product
    // In a real implementation, this would check treaty.productCodes or similar
    // For now, we'll assume all active treaties are applicable
    return true;
  }

  private calculateCessionAmount(params: {
    treaty: ReTreaty;
    sumInsured: number;
    premium: number;
  }): {
    cessionPercent: number;
    cededAmount: number;
  } {
    const treaty = params.treaty;
    const treatyConfig = treaty.config as any || {};

    const treatyType = treatyConfig.treatyType || 'quota_share';

    let cessionPercent = 0;
    let cededAmount = 0;

    switch (treatyType) {
      case 'quota_share':
        // Quota Share: cession percentage is fixed
        cessionPercent = treatyConfig.cessionPercent || 0;
        cededAmount = (params.sumInsured * cessionPercent) / 100;
        break;

      case 'excess_of_loss':
        // Excess of Loss: cede amount above retention limit
        const retentionLimit = treatyConfig.retentionLimit || 0;
        if (params.sumInsured > retentionLimit) {
          cededAmount = params.sumInsured - retentionLimit;
          cessionPercent = (cededAmount / params.sumInsured) * 100;
        }
        break;

      case 'surplus':
        // Surplus: cede percentage of amount above retention
        const surplusRetention = treatyConfig.retentionLimit || 0;
        const surplusCapacity = treatyConfig.capacity || 0;
        if (params.sumInsured > surplusRetention) {
          const surplusAmount = params.sumInsured - surplusRetention;
          const cedibleSurplus = Math.min(surplusAmount, surplusCapacity);
          cessionPercent = treatyConfig.cessionPercent || 50;
          cededAmount = (cedibleSurplus * cessionPercent) / 100;
        }
        break;

      default:
        // Default to quota share with treaty's cession percentage
        cessionPercent = treatyConfig.cessionPercent || 0;
        cededAmount = (params.sumInsured * cessionPercent) / 100;
    }

    return {
      cessionPercent,
      cededAmount,
    };
  }

  async createCession(params: {
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
    effectiveFrom?: Date | null;
    effectiveTo?: Date | null;
    currency?: string | null;
    notes?: string | null;
    createdBy?: string | null;
    correlationId?: string;
  }): Promise<ReCession> {
    const treatyId = (params.treatyId || '').trim();
    if (!treatyId) {
      throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'treatyId is required' } });
    }

    const t = await this.getTreaty(treatyId);
    if (!t) {
      throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'treatyId is invalid' } });
    }

    const c = this.cessionsRepo.create({
      cessionId: uuidv4(),
      treatyId,
      policyId: params.policyId ?? null,
      riskId: params.riskId ?? null,
      sumInsured: params.sumInsured !== undefined && params.sumInsured !== null ? String(params.sumInsured) : null,
      premium: params.premium !== undefined && params.premium !== null ? String(params.premium) : null,
      cessionPercent:
        params.cessionPercent !== undefined && params.cessionPercent !== null ? String(params.cessionPercent) : null,
      cededAmount: params.cededAmount !== undefined && params.cededAmount !== null ? String(params.cededAmount) : null,
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

  async getCession(cessionId: string): Promise<ReCession | null> {
    return await this.cessionsRepo.findOne({ where: { cessionId } });
  }

  async listCessions(params: {
    treatyId?: string;
    status?: ReCessionStatus;
    policyId?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: ReCession[]; total: number }> {
    const qb = this.cessionsRepo.createQueryBuilder('c');

    if (params.treatyId) qb.andWhere('c.treaty_id = :tid', { tid: params.treatyId });
    if (params.status) qb.andWhere('c.status = :status', { status: params.status });
    if (params.policyId) qb.andWhere('c.policy_id = :policyId', { policyId: params.policyId });

    qb.orderBy('c.created_at', 'DESC').limit(params.limit).offset(params.offset);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async updateCession(params: {
    cessionId: string;
    notes?: string | null;
    sumInsured?: string | number | null;
    premium?: string | number | null;
    cessionPercent?: string | number | null;
    cededAmount?: string | number | null;
    status?: ReCessionStatus;
    correlationId?: string;
  }): Promise<ReCession> {
    const c = await this.getCession(params.cessionId);
    if (!c) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Cession not found' } });

    if (params.notes !== undefined) c.notes = params.notes ?? null;
    if (params.sumInsured !== undefined) c.sumInsured = params.sumInsured !== null ? String(params.sumInsured) : null;
    if (params.premium !== undefined) c.premium = params.premium !== null ? String(params.premium) : null;
    if (params.cessionPercent !== undefined)
      c.cessionPercent = params.cessionPercent !== null ? String(params.cessionPercent) : null;
    if (params.cededAmount !== undefined) c.cededAmount = params.cededAmount !== null ? String(params.cededAmount) : null;
    if (params.status !== undefined) c.status = params.status;

    c.updatedAt = new Date();
    await this.cessionsRepo.save(c);

    const t = await this.getTreaty(c.treatyId);
    if (t) {
      await this.publishCededCalculated({
        correlationId: params.correlationId || uuidv4(),
        treaty: t,
        cession: c,
      });
    }
    return c;
  }

  async approveCession(params: { cessionId: string; approved: boolean; notes?: string | null }): Promise<ReCession> {
    const c = await this.getCession(params.cessionId);
    if (!c) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Cession not found' } });
    c.status = params.approved ? 'approved' : 'rejected';
    if (params.notes !== undefined) c.notes = params.notes ?? null;
    c.updatedAt = new Date();
    await this.cessionsRepo.save(c);

    const t = await this.getTreaty(c.treatyId);
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
    treatyId: string;
    statementType: ReStatement['statementType'];
    periodStart: string;
    periodEnd: string;
    totals?: any | null;
    createdBy?: string | null;
  }): Promise<ReStatement> {
    const treatyId = (params.treatyId || '').trim();
    if (!treatyId || !params.statementType || !params.periodStart || !params.periodEnd) {
      throw new BadRequestException({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'treatyId, statementType, periodStart, periodEnd are required' },
      });
    }

    const t = await this.getTreaty(treatyId);
    if (!t) throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'treatyId is invalid' } });

    const s = this.statementsRepo.create({
      statementId: uuidv4(),
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

  async getStatement(statementId: string): Promise<ReStatement | null> {
    return await this.statementsRepo.findOne({ where: { statementId } });
  }

  async listStatements(params: {
    treatyId?: string;
    status?: ReStatementStatus;
    statementType?: ReStatement['statementType'];
    limit: number;
    offset: number;
  }): Promise<{ rows: ReStatement[]; total: number }> {
    const qb = this.statementsRepo.createQueryBuilder('s');
    if (params.treatyId) qb.andWhere('s.treaty_id = :tid', { tid: params.treatyId });
    if (params.status) qb.andWhere('s.status = :status', { status: params.status });
    if (params.statementType) qb.andWhere('s.statement_type = :st', { st: params.statementType });
    qb.orderBy('s.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async updateStatement(params: { statementId: string; status?: ReStatementStatus; totals?: any | null }): Promise<ReStatement> {
    const s = await this.getStatement(params.statementId);
    if (!s) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Statement not found' } });
    const prevStatus = s.status;
    if (params.status !== undefined) s.status = params.status;
    if (params.totals !== undefined) s.totals = params.totals ?? null;
    s.updatedAt = new Date();
    await this.statementsRepo.save(s);

    if (prevStatus !== 'issued' && s.status === 'issued' && s.statementType === 'bordereau') {
      const t = await this.getTreaty(s.treatyId);
      if (t) {
        await this.publishBorderauxGenerated({ correlationId: uuidv4(), statement: s, treaty: t });
      }
    }

    return s;
  }

  // Reconciliations
  async createReconciliation(params: {
    statementId: string;
    summary?: string | null;
    details?: any | null;
    createdBy?: string | null;
  }): Promise<ReReconciliation> {
    const statementId = (params.statementId || '').trim();
    if (!statementId) {
      throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'statementId is required' } });
    }

    const s = await this.getStatement(statementId);
    if (!s) throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'statementId is invalid' } });

    const r = this.reconciliationsRepo.create({
      reconciliationId: uuidv4(),
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

  async getReconciliation(reconciliationId: string): Promise<ReReconciliation | null> {
    return await this.reconciliationsRepo.findOne({ where: { reconciliationId } });
  }

  async listReconciliations(params: {
    statementId?: string;
    status?: ReReconciliationStatus;
    limit: number;
    offset: number;
  }): Promise<{ rows: ReReconciliation[]; total: number }> {
    const qb = this.reconciliationsRepo.createQueryBuilder('r');
    if (params.statementId) qb.andWhere('r.statement_id = :sid', { sid: params.statementId });
    if (params.status) qb.andWhere('r.status = :status', { status: params.status });
    qb.orderBy('r.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async updateReconciliation(params: {
    reconciliationId: string;
    status?: ReReconciliationStatus;
    summary?: string | null;
    details?: any | null;
  }): Promise<ReReconciliation> {
    const r = await this.getReconciliation(params.reconciliationId);
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
    const treatiesLimit = clampInt(params.treatiesLimit, 200, 1, 2000);
    const cessionsLimit = clampInt(params.cessionsLimit, 200, 1, 2000);
    const statementsLimit = clampInt(params.statementsLimit, 200, 1, 2000);
    const reconciliationsLimit = clampInt(params.reconciliationsLimit, 200, 1, 2000);
    const recoveriesLimit = clampInt(params.recoveriesLimit ?? 200, 200, 1, 2000);
    const ticketsLimit = clampInt(params.ticketsLimit ?? 200, 200, 1, 2000);

    const [treaties, cessions, statements, reconciliations, recoveries, tickets] = await Promise.all([
      this.treatiesRepo.find({ order: { createdAt: 'DESC' }, take: treatiesLimit }),
      this.cessionsRepo.find({ order: { createdAt: 'DESC' }, take: cessionsLimit }),
      this.statementsRepo.find({ order: { createdAt: 'DESC' }, take: statementsLimit }),
      this.reconciliationsRepo.find({ order: { createdAt: 'DESC' }, take: reconciliationsLimit }),
      this.recoveriesRepo.find({ order: { createdAt: 'DESC' }, take: recoveriesLimit }),
      this.ticketsRepo.find({ order: { createdAt: 'DESC' }, take: ticketsLimit }),
    ]);

    return { treaties, cessions, statements, reconciliations, recoveries, tickets };
  }

  // Claim Recoveries
  async createRecovery(params: {
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
    const treatyId = (params.treatyId || '').trim();
    const claimId = (params.claimId || '').trim();
    if (!treatyId || !claimId) {
      throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'treatyId and claimId are required' } });
    }
    const t = await this.getTreaty(treatyId);
    if (!t) throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'treatyId is invalid' } });

    const r = this.recoveriesRepo.create({
      recoveryId: uuidv4(),
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

  async getRecovery(recoveryId: string): Promise<ReClaimRecovery | null> {
    return await this.recoveriesRepo.findOne({ where: { recoveryId } });
  }

  async listRecoveries(params: {
    treatyId?: string;
    status?: ReClaimRecoveryStatus;
    claimId?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: ReClaimRecovery[]; total: number }> {
    const qb = this.recoveriesRepo.createQueryBuilder('r');
    if (params.treatyId) qb.andWhere('r.treaty_id = :tid', { tid: params.treatyId });
    if (params.status) qb.andWhere('r.status = :status', { status: params.status });
    if (params.claimId) qb.andWhere('r.claim_id = :claimId', { claimId: params.claimId });
    qb.orderBy('r.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async updateRecovery(params: {
    recoveryId: string;
    status?: ReClaimRecoveryStatus;
    recoveredAmount?: string | number | null;
    nextFollowUpAt?: string | null;
    notes?: string | null;
    correlationId?: string;
  }): Promise<ReClaimRecovery> {
    const r = await this.getRecovery(params.recoveryId);
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
    reconciliationId: string;
    reasonCode: string;
    summary?: string | null;
    assignedTo?: string | null;
    slaResponseDueAt?: string | null;
    createdBy?: string | null;
  }): Promise<ReTicket> {
    const reconciliationId = (params.reconciliationId || '').trim();
    const reasonCode = (params.reasonCode || '').trim();
    if (!reconciliationId || !reasonCode) {
      throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'reconciliationId and reasonCode are required' } });
    }
    const rec = await this.getReconciliation(reconciliationId);
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

  async getTicket(ticketId: string): Promise<ReTicket | null> {
    return await this.ticketsRepo.findOne({ where: { ticketId } });
  }

  async listTickets(params: {
    reconciliationId?: string;
    status?: ReTicketStatus;
    assignedTo?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: ReTicket[]; total: number }> {
    const qb = this.ticketsRepo.createQueryBuilder('t');
    if (params.reconciliationId) qb.andWhere('t.reconciliation_id = :rid', { rid: params.reconciliationId });
    if (params.status) qb.andWhere('t.status = :status', { status: params.status });
    if (params.assignedTo) qb.andWhere('t.assigned_to = :assignedTo', { assignedTo: params.assignedTo });
    qb.orderBy('t.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async assignTicket(params: { ticketId: string; assignedTo: string | null }): Promise<ReTicket> {
    const t = await this.getTicket(params.ticketId);
    if (!t) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    t.assignedTo = params.assignedTo;
    t.updatedAt = new Date();
    await this.ticketsRepo.save(t);
    return t;
  }

  async updateTicket(params: { ticketId: string; status?: ReTicketStatus; summary?: string | null }): Promise<ReTicket> {
    const t = await this.getTicket(params.ticketId);
    if (!t) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    if (params.status !== undefined) t.status = params.status;
    if (params.summary !== undefined) t.summary = params.summary ?? null;
    if (params.status === 'resolved' && !t.resolvedAt) t.resolvedAt = new Date();
    t.updatedAt = new Date();
    await this.ticketsRepo.save(t);
    return t;
  }

  async addTicketMessage(params: { ticketId: string; messageType?: 'internal' | 'external'; body: string; createdBy?: string | null }): Promise<ReTicketMessage> {
    const ticketId = (params.ticketId || '').trim();
    const body = (params.body || '').trim();
    if (!ticketId || !body) {
      throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'ticketId and body are required' } });
    }
    const t = await this.getTicket(ticketId);
    if (!t) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } });

    const m = this.ticketMessagesRepo.create({
      ticketMessageId: uuidv4(),
      ticketId,
      messageType: params.messageType ?? 'internal',
      body,
      createdBy: params.createdBy ?? null,
      createdAt: new Date(),
    });
    await this.ticketMessagesRepo.save(m);
    return m;
  }

  async listTicketMessages(ticketId: string): Promise<ReTicketMessage[]> {
    return await this.ticketMessagesRepo.find({ where: { ticketId }, order: { createdAt: 'ASC' } });
  }

  async addTicketAttachment(params: { ticketId: string; documentId: string; notes?: string | null; createdBy?: string | null }): Promise<ReTicketAttachment> {
    const ticketId = (params.ticketId || '').trim();
    const documentId = (params.documentId || '').trim();
    if (!ticketId || !documentId) {
      throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'ticketId and documentId are required' } });
    }
    const t = await this.getTicket(ticketId);
    if (!t) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } });

    const a = this.ticketAttachmentsRepo.create({
      ticketAttachmentId: uuidv4(),
      ticketId,
      documentId,
      notes: params.notes ?? null,
      createdBy: params.createdBy ?? null,
      createdAt: new Date(),
    });
    await this.ticketAttachmentsRepo.save(a);
    return a;
  }

  async registerExternalInvoice(params: {
    statementId: string;
    invoiceNumber: string;
    invoiceDate: string;
    invoiceAmount: number;
    invoiceCurrency?: string;
    receivedFrom: string;
    createdBy?: string | null;
  }): Promise<ReReconciliation> {
    const statement = await this.statementsRepo.findOne({ where: { statementId: params.statementId } });
    if (!statement) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Statement not found' } });

    const existingReconciliation = await this.reconciliationsRepo.findOne({ where: { statementId: params.statementId } });
    if (existingReconciliation) {
      existingReconciliation.externalInvoiceNumber = params.invoiceNumber;
      existingReconciliation.externalInvoiceDate = params.invoiceDate;
      existingReconciliation.externalInvoiceAmount = params.invoiceAmount;
      existingReconciliation.externalInvoiceCurrency = params.invoiceCurrency || 'IRR';
      existingReconciliation.receivedFrom = params.receivedFrom;
      existingReconciliation.updatedAt = new Date();
      await this.reconciliationsRepo.save(existingReconciliation);
      return existingReconciliation;
    }

    const reconciliation = this.reconciliationsRepo.create({
      reconciliationId: uuidv4(),
      statementId: params.statementId,
      status: 'open',
      summary: `External invoice ${params.invoiceNumber} received`,
      details: null,
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
    reconciliationId: string;
    tolerancePercent?: number;
  }): Promise<{ reconciliation: ReReconciliation; matched: boolean; confidence: number; reason: string }> {
    const reconciliation = await this.reconciliationsRepo.findOne({ where: { reconciliationId: params.reconciliationId } });
    if (!reconciliation) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Reconciliation not found' } });

    const statement = await this.statementsRepo.findOne({ where: { statementId: reconciliation.statementId } });
    if (!statement) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Statement not found' } });

    const treaty = await this.treatiesRepo.findOne({ where: { treatyId: statement.treatyId } });
    if (!treaty) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Treaty not found' } });

    const tolerancePercent = params.tolerancePercent || 5;
    const statementAmount = this.n((statement.totals as any)?.totalAmount || (statement.totals as any)?.cededAmount);
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
    const bufferDays = 30;
    const bufferedStart = new Date(start.getTime() - bufferDays * 24 * 60 * 60 * 1000);
    const bufferedEnd = new Date(end.getTime() + bufferDays * 24 * 60 * 60 * 1000);
    return invoice >= bufferedStart && invoice <= bufferedEnd;
  }

  async listTicketAttachments(ticketId: string): Promise<ReTicketAttachment[]> {
    return await this.ticketAttachmentsRepo.find({ where: { ticketId }, order: { createdAt: 'DESC' } });
  }

  async closePeriod(params: {
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
    return await this.dataSource.transaction(async (manager) => {
      const treatyRepo = manager.getRepository(ReTreaty);
      const cessionRepo = manager.getRepository(ReCession);
      const statementRepo = manager.getRepository(ReStatement);
      const outboxPublisher = new OutboxPublisher(manager);

      const treaty = await treatyRepo.findOne({ where: { treatyId: params.treatyId } });
      if (!treaty) {
        throw new Error('Treaty not found');
      }

      const periodEndDate = new Date(params.periodEnd);
      if (isNaN(periodEndDate.getTime())) {
        throw new Error('Invalid periodEnd date');
      }

      // Find all open cessions for this treaty up to the period end date
      const cessions = await cessionRepo.find({
        where: {
          treatyId: params.treatyId,
          status: 'approved' as ReCessionStatus,
        },
      });

      let cessionsClosed = 0;
      let statementsCreated = 0;

      for (const cession of cessions) {
        // Check if cession is within the period
        if (cession.createdAt <= periodEndDate) {
          // Create a statement for this cession if not already exists
          const existingStatement = await statementRepo.findOne({
            where: {
              treatyId: params.treatyId,
              periodEnd: params.periodEnd,
            },
          });

          if (!existingStatement) {
            // Calculate totals for the period
            const totals = {
              totalCessions: 1,
              totalCededAmount: cession.cededAmount || '0',
              totalPremium: cession.premium || '0',
            };

            const statement = statementRepo.create({
              statementId: uuidv4(),
              treatyId: params.treatyId,
              statementType: 'period_close' as any,
              periodStart: new Date(new Date(params.periodEnd).setDate(1)).toISOString().split('T')[0],
              periodEnd: params.periodEnd,
              totals,
              status: 'finalized' as ReStatementStatus,
              createdBy: params.actorUserId,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            await statementRepo.save(statement);
            statementsCreated++;

            // Publish period close event
            await outboxPublisher.publish({
              topic: 'insurance.reinsurance.period_closed',
              eventType: 'ReinsurancePeriodClosed',
              eventVersion: 1,
              correlationId: params.correlationId || uuidv4(),
              subject: {
                treatyId: params.treatyId,
                statementId: statement.statementId,
              },
              payload: {
                treatyId: params.treatyId,
                statementId: statement.statementId,
                periodEnd: params.periodEnd,
                totals,
                closedBy: params.actorUserId,
                closedAt: new Date().toISOString(),
                notes: params.notes,
              },
            });
          }

          cessionsClosed++;
        }
      }

      return {
        treatyId: params.treatyId,
        periodEnd: params.periodEnd,
        closedAt: new Date().toISOString(),
        cessionsClosed,
        statementsCreated,
      };
    });
  }
}
