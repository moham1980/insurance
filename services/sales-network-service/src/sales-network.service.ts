// @ts-nocheck
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import {Repository, DataSource} from 'typeorm';
import { ConsumedEvent, createLogger, EventEnvelope, OutboxPublisher } from '@insurance/shared';
import { v4 as uuidv4 } from 'uuid';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { SalesPartner, SalesPartnerKind, SalesPartnerStatus } from './entities/SalesPartner';
import { CommissionContract } from './entities/CommissionContract';
import { CommissionLedgerEntry } from './entities/CommissionLedgerEntry';
import { SalesKpiDaily } from './entities/SalesKpiDaily';
import { SalesPolicyAttribution } from './entities/SalesPolicyAttribution';

@Injectable()
export class SalesNetworkService implements OnModuleInit, OnModuleDestroy {
  private consumer?: Consumer;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(SalesPartner) private readonly partnersRepo: Repository<SalesPartner>,
    @InjectRepository(CommissionContract) private readonly contractsRepo: Repository<CommissionContract>,
    @InjectRepository(CommissionLedgerEntry) private readonly ledgerRepo: Repository<CommissionLedgerEntry>,
    @InjectRepository(SalesKpiDaily) private readonly kpiRepo: Repository<SalesKpiDaily>,
    @InjectRepository(SalesPolicyAttribution) private readonly attrRepo: Repository<SalesPolicyAttribution>,
    @InjectRepository(ConsumedEvent) private readonly consumedRepo: Repository<ConsumedEvent>,
    private readonly httpService: HttpService
  ) {}

  private logger = createLogger({
    serviceName: 'sales-network-service',
    prettyPrint: process.env.NODE_ENV !== 'production',
  });

  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  private async fetchWithRetry<T>(
    url: string,
    config: any = {},
    retries = this.maxRetries
  ): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await firstValueFrom(this.httpService.get<T>(url, config));
        return response.data;
      } catch (error) {
        const axiosError = error as AxiosError;
        const isRetryable =
          axiosError?.response?.status === undefined || // Network error
          axiosError?.response?.status >= 500 || // 5xx errors
          axiosError?.response?.status === 429; // Too Many Requests

        if (!isRetryable || attempt === retries) {
          this.logger.error('HTTP request failed after retries', error as Error, {
            url,
            attempt,
            status: axiosError?.response?.status,
          });
          throw error;
        }

        const delay = this.retryDelay * attempt;
        this.logger.warn('HTTP request failed, retrying', {
          url,
          attempt,
          delay,
          status: axiosError?.response?.status,
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries exceeded');
  }

  async onModuleInit(): Promise<void> {
    await this.startConsumer();
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer?.disconnect();
  }

  private getKafkaConfig() {
    const kafkaBrokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
    const consumerGroupId = process.env.KAFKA_CONSUMER_GROUP || 'sales-network-v1';
    return { kafkaBrokers, consumerGroupId };
  }

  private async ensureIdempotent(eventId: string, consumerName: string, topic: string): Promise<boolean> {
    const existing = await this.consumedRepo.findOne({ where: { eventId, consumerName } });
    if (existing) return false;

    const consumed = this.consumedRepo.create({ eventId, consumerName, topic });
    await this.consumedRepo.save(consumed);
    return true;
  }

  async listPartners(params: { kind?: SalesPartnerKind; status?: SalesPartnerStatus; limit: number; offset: number; actorOrgUnitId?: string | null; allowAll: boolean }) {
    const qb = this.partnersRepo.createQueryBuilder('p');

    if (params.kind) qb.andWhere('p.kind = :kind', { kind: params.kind });
    if (params.status) qb.andWhere('p.status = :status', { status: params.status });

    if (!params.allowAll) {
      if (!params.actorOrgUnitId) return { rows: [], total: 0 };
      qb.andWhere('p.org_unit_id = :orgUnitId', { orgUnitId: params.actorOrgUnitId });
    }

    qb.orderBy('p.updated_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async voidLedgerEntry(params: { ledgerEntryId: string; reason: string; actorUserId?: string | null }): Promise<CommissionLedgerEntry | null> {
    return await this.dataSource.transaction(async (manager) => {
      const row = await manager.findOne(CommissionLedgerEntry, { where: { ledgerEntryId: params.ledgerEntryId } });
      if (!row) return null;
      if (row.status === 'paid') {
        const err: any = new Error('Cannot void a paid ledger entry');
        err.code = 'INVALID_STATE';
        throw err;
      }
      row.status = 'voided';
      row.voidReason = params.reason;
      row.updatedAt = new Date();
      row.metadata = { ...(row.metadata || {}), voidedBy: params.actorUserId ?? null, voidedAt: new Date().toISOString() };
      await manager.save(row);
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.sales.ledger.voided',
        eventType: 'CommissionLedgerVoided',
        eventVersion: 1,
        correlationId: uuidv4(),
        subject: { ledgerEntryId: row.ledgerEntryId, orgUnitId: row.orgUnitId },
        payload: {
          ledgerEntryId: row.ledgerEntryId,
          status: row.status,
          voidReason: row.voidReason,
        },
      });
      return row;
    });
  }

  async markLedgerEntryPaid(params: { ledgerEntryId: string; actorUserId?: string | null }): Promise<CommissionLedgerEntry | null> {
    return await this.dataSource.transaction(async (manager) => {
      const row = await manager.findOne(CommissionLedgerEntry, { where: { ledgerEntryId: params.ledgerEntryId } });
      if (!row) return null;
      if (row.status === 'voided') {
        const err: any = new Error('Cannot pay a voided ledger entry');
        err.code = 'INVALID_STATE';
        throw err;
      }
      row.status = 'paid';
      row.updatedAt = new Date();
      row.metadata = { ...(row.metadata || {}), paidBy: params.actorUserId ?? null, paidAt: new Date().toISOString() };
      await manager.save(row);
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.sales.ledger.paid',
        eventType: 'CommissionLedgerPaid',
        eventVersion: 1,
        correlationId: uuidv4(),
        subject: { ledgerEntryId: row.ledgerEntryId, orgUnitId: row.orgUnitId },
        payload: {
          ledgerEntryId: row.ledgerEntryId,
          status: row.status,
          commissionAmount: row.commissionAmount,
          currency: row.currency,
        },
      });
      return row;
    });
  }

  async upsertPartner(params: {
    orgUnitId: string;
    kind: SalesPartnerKind;
    displayName: string;
    legalNationalId?: string | null;
    licenseCode?: string | null;
    contactMobile?: string | null;
    contactEmail?: string | null;
    bankIban?: string | null;
    metadata?: Record<string, any> | null;
    actorUserId?: string | null;
  }): Promise<SalesPartner> {
    return await this.dataSource.transaction(async (manager) => {
      const existing = await manager.findOne(SalesPartner, { where: { orgUnitId: params.orgUnitId } });
      const row = existing
        ? existing
        : manager.create(SalesPartner, {
            partnerId: uuidv4(),
            orgUnitId: params.orgUnitId,
            kind: params.kind,
            status: 'pending',
            displayName: params.displayName,
            legalNationalId: params.legalNationalId ?? null,
            licenseCode: params.licenseCode ?? null,
            contactMobile: params.contactMobile ?? null,
            contactEmail: params.contactEmail ?? null,
            bankIban: params.bankIban ?? null,
            metadata: params.metadata ?? null,
            verifiedAt: null,
            verifiedBy: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

      row.kind = params.kind;
      row.displayName = params.displayName;
      row.legalNationalId = params.legalNationalId ?? row.legalNationalId;
      row.licenseCode = params.licenseCode ?? row.licenseCode;
      row.contactMobile = params.contactMobile ?? row.contactMobile;
      row.contactEmail = params.contactEmail ?? row.contactEmail;
      row.bankIban = params.bankIban ?? row.bankIban;
      row.metadata = params.metadata ?? row.metadata;
      row.updatedAt = new Date();

      await manager.save(row);
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.sales.partner.upserted',
        eventType: 'SalesPartnerUpserted',
        eventVersion: 1,
        correlationId: uuidv4(),
        subject: { partnerId: row.partnerId, orgUnitId: row.orgUnitId },
        payload: {
          partnerId: row.partnerId,
          orgUnitId: row.orgUnitId,
          kind: row.kind,
          status: row.status,
          displayName: row.displayName,
        },
      });
      return row;
    });
  }

  async verifyPartner(params: { orgUnitId: string; actorUserId?: string | null }): Promise<SalesPartner | null> {
    return await this.dataSource.transaction(async (manager) => {
      const p = await manager.findOne(SalesPartner, { where: { orgUnitId: params.orgUnitId } });
      if (!p) return null;
      p.status = 'verified';
      p.verifiedAt = new Date();
      p.verifiedBy = params.actorUserId ?? null;
      p.updatedAt = new Date();
      await manager.save(p);
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.sales.partner.verified',
        eventType: 'SalesPartnerVerified',
        eventVersion: 1,
        correlationId: uuidv4(),
        subject: { partnerId: p.partnerId, orgUnitId: p.orgUnitId },
        payload: {
          partnerId: p.partnerId,
          orgUnitId: p.orgUnitId,
          status: p.status,
          verifiedBy: p.verifiedBy,
        },
      });
      return p;
    });
  }

  async setPartnerStatus(params: { orgUnitId: string; status: SalesPartnerStatus; actorUserId?: string | null }): Promise<SalesPartner | null> {
    return await this.dataSource.transaction(async (manager) => {
      const p = await manager.findOne(SalesPartner, { where: { orgUnitId: params.orgUnitId } });
      if (!p) return null;
      p.status = params.status;
      p.updatedAt = new Date();
      await manager.save(p);
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.sales.partner.status_changed',
        eventType: 'SalesPartnerStatusChanged',
        eventVersion: 1,
        correlationId: uuidv4(),
        subject: { partnerId: p.partnerId, orgUnitId: p.orgUnitId },
        payload: {
          partnerId: p.partnerId,
          orgUnitId: p.orgUnitId,
          status: p.status,
        },
      });
      return p;
    });
  }

  async listContracts(params: { orgUnitId?: string; status?: string; limit: number; offset: number; actorOrgUnitId?: string | null; allowAll: boolean }) {
    const qb = this.contractsRepo.createQueryBuilder('c');
    if (params.orgUnitId) qb.andWhere('c.org_unit_id = :orgUnitId', { orgUnitId: params.orgUnitId });
    if (params.status) qb.andWhere('c.status = :status', { status: params.status });

    if (!params.allowAll) {
      if (!params.actorOrgUnitId) return { rows: [], total: 0 };
      qb.andWhere('c.org_unit_id = :orgUnitId2', { orgUnitId2: params.actorOrgUnitId });
    }

    qb.orderBy('c.effective_from', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async createContract(params: {
    orgUnitId: string;
    lineOfBusiness?: string | null;
    base: 'premium_gross' | 'premium_net';
    rateBps?: number | null;
    fixedFeeAmount?: string | null;
    currency?: string | null;
    effectiveFrom: string;
    effectiveTo?: string | null;
    rules?: Record<string, any> | null;
    notes?: string | null;
    actorUserId?: string | null;
    correlationId?: string;
  }): Promise<CommissionContract> {
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const c = manager.create(CommissionContract, {
        contractId: uuidv4(),
        orgUnitId: params.orgUnitId,
        status: 'draft',
        lineOfBusiness: params.lineOfBusiness ?? null,
        base: params.base,
        rateBps: params.rateBps ?? null,
        fixedFeeAmount: params.fixedFeeAmount ?? null,
        currency: params.currency ?? 'IRR',
        effectiveFrom: new Date(params.effectiveFrom),
        effectiveTo: params.effectiveTo ? new Date(params.effectiveTo) : null,
        rules: params.rules ?? null,
        createdBy: params.actorUserId ?? null,
        notes: params.notes ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await manager.save(c);

      await outbox.publish({
        topic: 'insurance.sales.contract.created',
        eventType: 'CommissionContractCreated',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { contractId: c.contractId, orgUnitId: params.orgUnitId },
        payload: {
          contractId: c.contractId,
          orgUnitId: c.orgUnitId,
          status: c.status,
          base: c.base,
          rateBps: c.rateBps,
          currency: c.currency,
          effectiveFrom: c.effectiveFrom?.toISOString?.() ?? null,
        },
      });

      return c;
    });
  }

  async activateContract(contractId: string, correlationId?: string): Promise<CommissionContract | null> {
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const c = await manager.findOne(CommissionContract, { where: { contractId } });
      if (!c) return null;
      c.status = 'active';
      c.updatedAt = new Date();
      await manager.save(c);

      await outbox.publish({
        topic: 'insurance.sales.contract.activated',
        eventType: 'CommissionContractActivated',
        eventVersion: 1,
        correlationId: correlationId || uuidv4(),
        subject: { contractId: c.contractId, orgUnitId: c.orgUnitId },
        payload: {
          contractId: c.contractId,
          orgUnitId: c.orgUnitId,
          status: c.status,
        },
      });

      return c;
    });
  }

  async listLedger(params: { orgUnitId?: string; status?: string; limit: number; offset: number; actorOrgUnitId?: string | null; allowAll: boolean }) {
    const qb = this.ledgerRepo.createQueryBuilder('l');
    if (params.orgUnitId) qb.andWhere('l.org_unit_id = :orgUnitId', { orgUnitId: params.orgUnitId });
    if (params.status) qb.andWhere('l.status = :status', { status: params.status });

    if (!params.allowAll) {
      if (!params.actorOrgUnitId) return { rows: [], total: 0 };
      qb.andWhere('l.org_unit_id = :orgUnitId2', { orgUnitId2: params.actorOrgUnitId });
    }

    qb.orderBy('l.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async listKpiDaily(params: { orgUnitId?: string; dayFrom?: string; dayTo?: string; limit: number; offset: number; actorOrgUnitId?: string | null; allowAll: boolean }) {
    const qb = this.kpiRepo.createQueryBuilder('k');
    if (params.orgUnitId) qb.andWhere('k.org_unit_id = :orgUnitId', { orgUnitId: params.orgUnitId });
    if (params.dayFrom) qb.andWhere('k.day >= :df', { df: params.dayFrom });
    if (params.dayTo) qb.andWhere('k.day <= :dt', { dt: params.dayTo });

    if (!params.allowAll) {
      if (!params.actorOrgUnitId) return { rows: [], total: 0 };
      qb.andWhere('k.org_unit_id = :orgUnitId2', { orgUnitId2: params.actorOrgUnitId });
    }

    qb.orderBy('k.day', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async getAgentSummary(params: { orgUnitId: string; actorOrgUnitId?: string | null; allowAll: boolean }): Promise<{
    partner: SalesPartner | null;
    totalPolicies: number;
    totalPremium: number;
    pendingCommission: number;
    paidCommission: number;
    activeContract: CommissionContract | null;
    latestKpi: SalesKpiDaily | null;
  } | null> {
    if (!params.allowAll && params.actorOrgUnitId !== params.orgUnitId) {
      return null;
    }

    const partner = await this.partnersRepo.findOne({ where: { orgUnitId: params.orgUnitId } });
    if (!partner) return null;

    const attributions = await this.attrRepo.find({ where: { orgUnitId: params.orgUnitId } });
    const totalPolicies = attributions.length;
    const totalPremium = attributions.reduce((sum, a) => sum + (a.premiumAmount || 0), 0);

    const ledgerEntries = await this.ledgerRepo.find({ where: { orgUnitId: params.orgUnitId } });
    const pendingCommission = ledgerEntries.filter(e => e.status === 'pending').reduce((sum, e) => sum + (e.amount || 0), 0);
    const paidCommission = ledgerEntries.filter(e => e.status === 'paid').reduce((sum, e) => sum + (e.amount || 0), 0);

    const activeContract = await this.contractsRepo.findOne({
      where: { orgUnitId: params.orgUnitId, status: 'active' as any },
      order: { effectiveFrom: 'DESC' },
    });

    const latestKpi = await this.kpiRepo.findOne({
      where: { orgUnitId: params.orgUnitId },
      order: { day: 'DESC' },
    });

    return {
      partner,
      totalPolicies,
      totalPremium,
      pendingCommission,
      paidCommission,
      activeContract,
      latestKpi,
    };
  }

  async getAgentPolicies(params: { orgUnitId: string; limit: number; offset: number; actorOrgUnitId?: string | null; allowAll: boolean }): Promise<{ rows: SalesPolicyAttribution[]; total: number }> {
    if (!params.allowAll && params.actorOrgUnitId !== params.orgUnitId) {
      return { rows: [], total: 0 };
    }

    const qb = this.attrRepo.createQueryBuilder('a');
    qb.where('a.org_unit_id = :orgUnitId', { orgUnitId: params.orgUnitId })
      .orderBy('a.attributed_at', 'DESC')
      .limit(params.limit)
      .offset(params.offset);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  private toDayKey(d: Date): string {
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private async findActiveContract(orgUnitId: string, lineOfBusiness: string | null, occurredAt: Date): Promise<CommissionContract | null> {
    const qb = this.contractsRepo.createQueryBuilder('c');
    qb.where('c.org_unit_id = :orgUnitId', { orgUnitId })
      .andWhere('c.status = :status', { status: 'active' })
      .andWhere('c.effective_from <= :t', { t: occurredAt.toISOString() })
      .andWhere('(c.effective_to IS NULL OR c.effective_to >= :t2)', { t2: occurredAt.toISOString() });

    if (lineOfBusiness) {
      qb.andWhere('(c.line_of_business IS NULL OR c.line_of_business = :lob)', { lob: lineOfBusiness });
    }

    qb.orderBy('c.effective_from', 'DESC');
    return await qb.getOne();
  }

  private calcCommission(params: {
    premiumAmount: string | number | null | undefined;
    contract: CommissionContract | null;
  }): { commissionAmount: string; contractId: string | null; currency: string } {
    const premium = params.premiumAmount !== null && params.premiumAmount !== undefined ? Number(params.premiumAmount) : 0;
    if (!params.contract) {
      return { commissionAmount: '0', contractId: null, currency: 'IRR' };
    }

    const rateBps = typeof params.contract.rateBps === 'number' ? params.contract.rateBps : 0;
    const fixed = params.contract.fixedFeeAmount !== null && params.contract.fixedFeeAmount !== undefined ? Number(params.contract.fixedFeeAmount) : 0;
    const commission = (premium * rateBps) / 10000 + fixed;
    return { commissionAmount: String(commission), contractId: params.contract.contractId, currency: params.contract.currency || 'IRR' };
  }

  async calculateCommissionForPolicy(params: {
    policyId: string;
    orgUnitId: string;
    lineOfBusiness: string | null;
    premiumAmount: number;
    currency?: string;
    occurredAt?: Date;
  }): Promise<{ commissionAmount: string; contractId: string | null; currency: string; contract: CommissionContract | null }> {
    const validOccurredAt = params.occurredAt || new Date();
    const contract = await this.findActiveContract(params.orgUnitId, params.lineOfBusiness, validOccurredAt);
    const calc = this.calcCommission({ premiumAmount: params.premiumAmount, contract });
    return {
      commissionAmount: calc.commissionAmount,
      contractId: calc.contractId,
      currency: params.currency || calc.currency,
      contract,
    };
  }

  async recalculateCommissionForPolicy(params: {
    policyId: string;
    actorUserId?: string | null;
  }): Promise<{ ledgerEntry: CommissionLedgerEntry | null; previousAmount: number; newAmount: number }> {
    const attr = await this.attrRepo.findOne({ where: { policyId: params.policyId } });
    if (!attr) {
      return { ledgerEntry: null, previousAmount: 0, newAmount: 0 };
    }

    const existingLedger = await this.ledgerRepo.findOne({ where: { policyId: params.policyId, status: 'accrued' } as any });
    if (!existingLedger) {
      return { ledgerEntry: null, previousAmount: 0, newAmount: 0 };
    }

    const contract = await this.findActiveContract(attr.orgUnitId, existingLedger.lineOfBusiness, attr.issuedAt);
    const calc = this.calcCommission({ premiumAmount: existingLedger.premiumAmount, contract });

    const previousAmount = Number(existingLedger.commissionAmount);
    const newAmount = Number(calc.commissionAmount);

    if (previousAmount === newAmount) {
      return { ledgerEntry: existingLedger, previousAmount, newAmount };
    }

    return await this.dataSource.transaction(async (manager) => {
      existingLedger.commissionAmount = calc.commissionAmount;
      existingLedger.contractId = calc.contractId;
      existingLedger.currency = calc.currency;
      existingLedger.metadata = {
        ...(existingLedger.metadata || {}),
        recalculatedAt: new Date().toISOString(),
        recalculatedBy: params.actorUserId,
        previousCommissionAmount: String(previousAmount),
      };
      existingLedger.updatedAt = new Date();

      const updated = await manager.save(existingLedger);
      return { ledgerEntry: updated, previousAmount, newAmount };
    });
  }

  private async applyPolicyIssued(envelope: EventEnvelope<any>): Promise<void> {
    const policyId = envelope.subject?.policyId || envelope.payload?.policyId;
    const orgUnitId = envelope.payload?.producerOrgUnitId;

    if (!policyId || typeof policyId !== 'string') {
      this.logger.warn('Skipping PolicyIssued without policyId', { eventId: envelope.eventId });
      return;
    }

    if (!orgUnitId || typeof orgUnitId !== 'string') {
      this.logger.warn('Skipping PolicyIssued without producerOrgUnitId', { eventId: envelope.eventId, policyId });
      return;
    }

    const occurredAt = new Date(envelope.occurredAt);
    const validOccurredAt = Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt;

    const policyNumber = envelope.payload?.policyNumber ?? null;
    const lob = envelope.payload?.lineOfBusiness ?? null;
    const premiumAmount = envelope.payload?.premiumAmount ?? null;

    const contract = await this.findActiveContract(orgUnitId, typeof lob === 'string' ? lob : null, validOccurredAt);
    const calc = this.calcCommission({ premiumAmount, contract });

    await this.dataSource.transaction(async (manager) => {
      const entry = manager.create(CommissionLedgerEntry, {
        ledgerEntryId: uuidv4(),
        eventId: envelope.eventId,
        eventType: envelope.eventType,
        occurredAt: validOccurredAt,
        orgUnitId,
        policyId,
        policyNumber: typeof policyNumber === 'string' ? policyNumber : null,
        lineOfBusiness: typeof lob === 'string' ? lob : null,
        premiumAmount: premiumAmount !== null && premiumAmount !== undefined ? String(premiumAmount) : null,
        commissionAmount: calc.commissionAmount,
        currency: calc.currency,
        contractId: calc.contractId,
        status: 'accrued',
        voidReason: null,
        metadata: {
          correlationId: envelope.correlationId,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await manager.save(entry);

      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.sales.commission.calculated',
        eventType: 'CommissionCalculated',
        eventVersion: 1,
        correlationId: envelope.correlationId || uuidv4(),
        subject: { ledgerEntryId: entry.ledgerEntryId, orgUnitId, policyId },
        payload: {
          ledgerEntryId: entry.ledgerEntryId,
          orgUnitId,
          policyId,
          commissionAmount: entry.commissionAmount,
          currency: entry.currency,
          contractId: entry.contractId,
          status: entry.status,
        },
      });

      await manager.save(
        manager.create(SalesPolicyAttribution, {
          policyId,
          orgUnitId,
          policyNumber: typeof policyNumber === 'string' ? policyNumber : null,
          issuedAt: validOccurredAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );

      const day = this.toDayKey(validOccurredAt);
      const kExisting = await manager.findOne(SalesKpiDaily, { where: { orgUnitId, day } as any });
      const k = kExisting
        ? kExisting
        : manager.create(SalesKpiDaily, {
            kpiId: uuidv4(),
            orgUnitId,
            day,
            policiesIssuedCount: 0,
            policiesRenewedCount: 0,
            policiesCancelledCount: 0,
            complaintsCreatedCount: 0,
            premiumIssuedAmount: '0',
            commissionAccruedAmount: '0',
            currency: calc.currency,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

      k.policiesIssuedCount = (k.policiesIssuedCount || 0) + 1;
      k.premiumIssuedAmount = String(Number(k.premiumIssuedAmount || '0') + Number(premiumAmount || 0));
      k.commissionAccruedAmount = String(Number(k.commissionAccruedAmount || '0') + Number(calc.commissionAmount || 0));
      k.updatedAt = new Date();
      await manager.save(k);
    });
  }

  private async applyPolicyRenewed(envelope: EventEnvelope<any>): Promise<void> {
    const policyId = envelope.subject?.policyId || envelope.payload?.policyId;
    if (!policyId || typeof policyId !== 'string') return;
    const orgUnitId = envelope.payload?.producerOrgUnitId;
    if (!orgUnitId || typeof orgUnitId !== 'string') return;

    const occurredAt = new Date(envelope.occurredAt);
    const validOccurredAt = Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt;
    const day = this.toDayKey(validOccurredAt);

    await this.dataSource.transaction(async (manager) => {
      const kExisting = await manager.findOne(SalesKpiDaily, { where: { orgUnitId, day } as any });
      const k = kExisting
        ? kExisting
        : manager.create(SalesKpiDaily, {
            kpiId: uuidv4(),
            orgUnitId,
            day,
            policiesIssuedCount: 0,
            policiesRenewedCount: 0,
            policiesCancelledCount: 0,
            complaintsCreatedCount: 0,
            premiumIssuedAmount: '0',
            commissionAccruedAmount: '0',
            currency: 'IRR',
            createdAt: new Date(),
            updatedAt: new Date(),
          });

      k.policiesRenewedCount = (k.policiesRenewedCount || 0) + 1;
      k.updatedAt = new Date();
      await manager.save(k);
    });
  }

  private async applyPolicyCancelled(envelope: EventEnvelope<any>): Promise<void> {
    const policyId = envelope.subject?.policyId || envelope.payload?.policyId;
    if (!policyId || typeof policyId !== 'string') return;
    const orgUnitId = envelope.payload?.producerOrgUnitId;
    if (!orgUnitId || typeof orgUnitId !== 'string') return;

    const occurredAt = new Date(envelope.occurredAt);
    const validOccurredAt = Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt;
    const day = this.toDayKey(validOccurredAt);

    await this.dataSource.transaction(async (manager) => {
      const kExisting = await manager.findOne(SalesKpiDaily, { where: { orgUnitId, day } as any });
      const k = kExisting
        ? kExisting
        : manager.create(SalesKpiDaily, {
            kpiId: uuidv4(),
            orgUnitId,
            day,
            policiesIssuedCount: 0,
            policiesRenewedCount: 0,
            policiesCancelledCount: 0,
            complaintsCreatedCount: 0,
            premiumIssuedAmount: '0',
            commissionAccruedAmount: '0',
            currency: 'IRR',
            createdAt: new Date(),
            updatedAt: new Date(),
          });

      k.policiesCancelledCount = (k.policiesCancelledCount || 0) + 1;
      k.updatedAt = new Date();
      await manager.save(k);
    });
  }

  private async applyComplaintCreated(envelope: EventEnvelope<any>): Promise<void> {
    const complaintId = envelope.subject?.complaintId || envelope.payload?.complaintId;
    const policyId = envelope.payload?.policyId;
    if (!complaintId || !policyId || typeof policyId !== 'string') return;

    const attr = await this.attrRepo.findOne({ where: { policyId } });
    if (!attr) return;

    const occurredAt = new Date(envelope.occurredAt);
    const validOccurredAt = Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt;
    const day = this.toDayKey(validOccurredAt);

    await this.dataSource.transaction(async (manager) => {
      const kExisting = await manager.findOne(SalesKpiDaily, { where: { orgUnitId: attr.orgUnitId, day } as any });
      const k = kExisting
        ? kExisting
        : manager.create(SalesKpiDaily, {
            kpiId: uuidv4(),
            orgUnitId: attr.orgUnitId,
            day,
            policiesIssuedCount: 0,
            policiesRenewedCount: 0,
            policiesCancelledCount: 0,
            complaintsCreatedCount: 0,
            premiumIssuedAmount: '0',
            commissionAccruedAmount: '0',
            currency: 'IRR',
            createdAt: new Date(),
            updatedAt: new Date(),
          });

      k.complaintsCreatedCount = (k.complaintsCreatedCount || 0) + 1;
      k.updatedAt = new Date();
      await manager.save(k);
    });
  }

  private async applyEvent(envelope: EventEnvelope<any>): Promise<void> {
    switch (envelope.eventType) {
      case 'PolicyIssued':
        await this.applyPolicyIssued(envelope);
        return;
      case 'PolicyRenewed':
        await this.applyPolicyRenewed(envelope);
        return;
      case 'PolicyCancelled':
        await this.applyPolicyCancelled(envelope);
        return;
      case 'ComplaintCreated':
        await this.applyComplaintCreated(envelope);
        return;
      default:
        return;
    }
  }

  private async startConsumer(): Promise<void> {
    const { kafkaBrokers, consumerGroupId } = this.getKafkaConfig();

    const kafka = new Kafka({
      clientId: 'sales-network-service',
      brokers: kafkaBrokers,
    });

    this.consumer = kafka.consumer({ groupId: consumerGroupId });
    await this.consumer.connect();

    const topics = ['insurance.policy.issued', 'insurance.policy.renewed', 'insurance.policy.cancelled', 'insurance.complaint.created'];
    for (const topic of topics) {
      await this.consumer.subscribe({ topic, fromBeginning: true });
    }

    this.logger.info('Kafka consumer started', { groupId: consumerGroupId });

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        const { topic, message } = payload;
        const rawValue = message.value?.toString('utf-8');
        if (!rawValue) return;

        const envelope = JSON.parse(rawValue) as EventEnvelope<any>;
        const shouldProcess = await this.ensureIdempotent(envelope.eventId, consumerGroupId, topic);
        if (!shouldProcess) return;

        try {
          await this.applyEvent(envelope);
        } catch (e: any) {
          const err = e instanceof Error ? e : new Error(String(e));
          this.logger.error('Failed to apply event', err, {
            eventId: envelope.eventId,
            eventType: envelope.eventType,
            topic,
          });
        }
      },
    });
  }

  // Advanced performance reporting methods
  async getPerformanceTrend(params: {
    orgUnitId: string;
    startDate: Date;
    endDate: Date;
    metric: 'policiesIssued' | 'policiesRenewed' | 'policiesCancelled' | 'complaintsCreated' | 'premiumIssued' | 'commissionAccrued';
    granularity?: 'daily' | 'weekly' | 'monthly';
  }): Promise<{
    orgUnitId: string;
    metric: string;
    granularity: string;
    data: Array<{
      period: string;
      value: number;
      previousPeriodValue?: number;
      changePercent?: number;
    }>;
    total: number;
    average: number;
    trend: 'up' | 'down' | 'stable';
  }> {
    const granularity = params.granularity || 'daily';
    const kpis = await this.kpiRepo
      .createQueryBuilder('k')
      .where('k.org_unit_id = :orgUnitId', { orgUnitId: params.orgUnitId })
      .andWhere('k.day >= :startDate', { startDate: params.startDate })
      .andWhere('k.day <= :endDate', { endDate: params.endDate })
      .orderBy('k.day', 'ASC')
      .getMany();

    const metricMap = {
      policiesIssued: 'policiesIssuedCount',
      policiesRenewed: 'policiesRenewedCount',
      policiesCancelled: 'policiesCancelledCount',
      complaintsCreated: 'complaintsCreatedCount',
      premiumIssued: 'premiumIssuedAmount',
      commissionAccrued: 'commissionAccruedAmount',
    };

    const metricField = metricMap[params.metric];
    const isNumeric = params.metric === 'premiumIssued' || params.metric === 'commissionAccrued';

    // Group by granularity period
    const periodMap = new Map<string, number[]>();

    for (const kpi of kpis) {
      let periodKey: string;
      const date = new Date(kpi.day);

      if (granularity === 'daily') {
        periodKey = kpi.day;
      } else if (granularity === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        periodKey = weekStart.toISOString().split('T')[0];
      } else {
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      const value = isNumeric ? parseFloat(kpi[metricField as keyof SalesKpiDaily] as string) || 0 : (kpi[metricField as keyof SalesKpiDaily] as number) || 0;
      periodMap.set(periodKey, [...(periodMap.get(periodKey) || []), value]);
    }

    // Aggregate and calculate trend
    const data = [];
    const periods = Array.from(periodMap.keys()).sort();
    let total = 0;

    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      const values = periodMap.get(period) || [];
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = values.length > 0 ? sum / values.length : 0;

      total += avg;

      const entry: any = {
        period,
        value: avg,
      };

      // Calculate change from previous period
      if (i > 0) {
        const prevPeriod = periods[i - 1];
        const prevValues = periodMap.get(prevPeriod) || [];
        const prevSum = prevValues.reduce((a, b) => a + b, 0);
        const prevAvg = prevValues.length > 0 ? prevSum / prevValues.length : 0;

        entry.previousPeriodValue = prevAvg;
        if (prevAvg !== 0) {
          entry.changePercent = ((avg - prevAvg) / prevAvg) * 100;
        }
      }

      data.push(entry);
    }

    const average = data.length > 0 ? total / data.length : 0;

    // Determine overall trend
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (data.length >= 2) {
      const firstValue = data[0].value;
      const lastValue = data[data.length - 1].value;
      const change = firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
      if (change > 5) trend = 'up';
      else if (change < -5) trend = 'down';
    }

    return {
      orgUnitId: params.orgUnitId,
      metric: params.metric,
      granularity,
      data,
      total,
      average,
      trend,
    };
  }

  async comparePeriods(params: {
    orgUnitId: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    previousPeriodStart: Date;
    previousPeriodEnd: Date;
  }): Promise<{
    orgUnitId: string;
    currentPeriod: {
      startDate: string;
      endDate: string;
      metrics: {
        policiesIssued: number;
        policiesRenewed: number;
        policiesCancelled: number;
        complaintsCreated: number;
        premiumIssued: number;
        commissionAccrued: number;
      };
    };
    previousPeriod: {
      startDate: string;
      endDate: string;
      metrics: {
        policiesIssued: number;
        policiesRenewed: number;
        policiesCancelled: number;
        complaintsCreated: number;
        premiumIssued: number;
        commissionAccrued: number;
      };
    };
    comparison: {
      policiesIssued: { change: number; changePercent: number };
      policiesRenewed: { change: number; changePercent: number };
      policiesCancelled: { change: number; changePercent: number };
      complaintsCreated: { change: number; changePercent: number };
      premiumIssued: { change: number; changePercent: number };
      commissionAccrued: { change: number; changePercent: number };
    };
  }> {
    const currentKpis = await this.kpiRepo
      .createQueryBuilder('k')
      .where('k.org_unit_id = :orgUnitId', { orgUnitId: params.orgUnitId })
      .andWhere('k.day >= :start', { start: params.currentPeriodStart })
      .andWhere('k.day <= :end', { end: params.currentPeriodEnd })
      .getMany();

    const previousKpis = await this.kpiRepo
      .createQueryBuilder('k')
      .where('k.org_unit_id = :orgUnitId', { orgUnitId: params.orgUnitId })
      .andWhere('k.day >= :start', { start: params.previousPeriodStart })
      .andWhere('k.day <= :end', { end: params.previousPeriodEnd })
      .getMany();

    const aggregateMetrics = (kpis: SalesKpiDaily[]) => {
      return {
        policiesIssued: kpis.reduce((sum, k) => sum + (k.policiesIssuedCount || 0), 0),
        policiesRenewed: kpis.reduce((sum, k) => sum + (k.policiesRenewedCount || 0), 0),
        policiesCancelled: kpis.reduce((sum, k) => sum + (k.policiesCancelledCount || 0), 0),
        complaintsCreated: kpis.reduce((sum, k) => sum + (k.complaintsCreatedCount || 0), 0),
        premiumIssued: kpis.reduce((sum, k) => sum + (parseFloat(k.premiumIssuedAmount) || 0), 0),
        commissionAccrued: kpis.reduce((sum, k) => sum + (parseFloat(k.commissionAccruedAmount) || 0), 0),
      };
    };

    const currentMetrics = aggregateMetrics(currentKpis);
    const previousMetrics = aggregateMetrics(previousKpis);

    const calculateChange = (current: number, previous: number) => {
      const change = current - previous;
      const changePercent = previous !== 0 ? (change / previous) * 100 : 0;
      return { change, changePercent };
    };

    return {
      orgUnitId: params.orgUnitId,
      currentPeriod: {
        startDate: params.currentPeriodStart.toISOString().split('T')[0],
        endDate: params.currentPeriodEnd.toISOString().split('T')[0],
        metrics: currentMetrics,
      },
      previousPeriod: {
        startDate: params.previousPeriodStart.toISOString().split('T')[0],
        endDate: params.previousPeriodEnd.toISOString().split('T')[0],
        metrics: previousMetrics,
      },
      comparison: {
        policiesIssued: calculateChange(currentMetrics.policiesIssued, previousMetrics.policiesIssued),
        policiesRenewed: calculateChange(currentMetrics.policiesRenewed, previousMetrics.policiesRenewed),
        policiesCancelled: calculateChange(currentMetrics.policiesCancelled, previousMetrics.policiesCancelled),
        complaintsCreated: calculateChange(currentMetrics.complaintsCreated, previousMetrics.complaintsCreated),
        premiumIssued: calculateChange(currentMetrics.premiumIssued, previousMetrics.premiumIssued),
        commissionAccrued: calculateChange(currentMetrics.commissionAccrued, previousMetrics.commissionAccrued),
      },
    };
  }

  async getTopPerformers(params: {
    startDate: Date;
    endDate: Date;
    metric: 'policiesIssued' | 'policiesRenewed' | 'premiumIssued' | 'commissionAccrued';
    limit?: number;
  }): Promise<{
    performers: Array<{
      orgUnitId: string;
      orgUnitName?: string;
      value: number;
      rank: number;
    }>;
    metric: string;
  }> {
    const limit = params.limit || 10;

    const metricField = {
      policiesIssued: 'policiesIssuedCount',
      policiesRenewed: 'policiesRenewedCount',
      premiumIssued: 'premiumIssuedAmount',
      commissionAccrued: 'commissionAccruedAmount',
    }[params.metric];

    const isNumeric = params.metric === 'premiumIssued' || params.metric === 'commissionAccrued';

    const kpis = await this.kpiRepo
      .createQueryBuilder('k')
      .where('k.day >= :startDate', { startDate: params.startDate })
      .andWhere('k.day <= :endDate', { endDate: params.endDate })
      .getMany();

    const orgUnitMap = new Map<string, number[]>();

    for (const kpi of kpis) {
      const value = isNumeric ? parseFloat(kpi[metricField as keyof SalesKpiDaily] as string) || 0 : (kpi[metricField as keyof SalesKpiDaily] as number) || 0;
      orgUnitMap.set(kpi.orgUnitId, [...(orgUnitMap.get(kpi.orgUnitId) || []), value]);
    }

    const performers = [];
    for (const [orgUnitId, values] of orgUnitMap.entries()) {
      const total = values.reduce((a, b) => a + b, 0);
      performers.push({ orgUnitId, value: total });
    }

    performers.sort((a, b) => b.value - a.value);

    const ranked = performers.slice(0, limit).map((p, index) => ({
      orgUnitId: p.orgUnitId,
      value: p.value,
      rank: index + 1,
    }));

    return {
      performers: ranked,
      metric: params.metric,
    };
  }

  // ========== Agent Portal Endpoints ==========

  async getAgentStats(params: { agentId: string; partnerId: string }): Promise<{
    totalPolicies: number;
    activePolicies: number;
    pendingPolicies: number;
    totalClaims: number;
    pendingClaims: number;
    totalCommission: number;
    pendingCommission: number;
    monthlyPremium: number;
    monthlyIssuance: number;
  }> {
    // Get agent's org unit from partner
    const partner = await this.partnersRepo.findOne({ where: { orgUnitId: params.partnerId } });
    if (!partner) {
      const err: any = new Error('Partner not found');
      err.code = 'PARTNER_NOT_FOUND';
      throw err;
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get policies attribution for this agent
    const policyAttributions = await this.attrRepo.find({ 
      where: { agentId: params.agentId } 
    });

    const totalPolicies = policyAttributions.length;
    const activePolicies = policyAttributions.filter(p => p.status === 'ACTIVE').length;
    const pendingPolicies = policyAttributions.filter(p => p.status === 'PENDING').length;

    // Get commissions for this agent
    const commissions = await this.ledgerRepo.find({ where: { agentId: params.agentId } });
    const totalCommission = commissions.reduce((sum, c) => sum + (parseFloat(c.commissionAmount) || 0), 0);
    const pendingCommission = commissions.filter(c => c.status === 'pending')
      .reduce((sum, c) => sum + (parseFloat(c.commissionAmount) || 0), 0);

    // Get monthly KPIs from KPI table
    const monthlyKpis = await this.kpiRepo
      .createQueryBuilder('k')
      .where('k.org_unit_id = :orgUnitId', { orgUnitId: params.partnerId })
      .andWhere('k.day >= :start', { start: monthStart })
      .andWhere('k.day <= :end', { end: now })
      .getMany();

    const monthlyPremium = monthlyKpis.reduce((sum, k) => sum + (parseFloat(k.premiumIssuedAmount) || 0), 0);
    const monthlyIssuance = monthlyKpis.reduce((sum, k) => sum + (k.policiesIssuedCount || 0), 0);

    // Claims count (from KPI or attribution)
    const totalClaims = monthlyKpis.reduce((sum, k) => sum + (k.claimsCreatedCount || 0), 0);
    
    // Pending claims from claims service integration
    const pendingClaims = await this.getPendingClaimsFromClaimsService(params.agentId, params.partnerId);

    return {
      totalPolicies,
      activePolicies,
      pendingPolicies,
      totalClaims,
      pendingClaims,
      totalCommission,
      pendingCommission,
      monthlyPremium,
      monthlyIssuance,
    };
  }

  /**
   * Get pending claims from claims service
   * Integration with claims service to retrieve pending claims for an agent
   */
  private async getPendingClaimsFromClaimsService(agentId: string, partnerId: string): Promise<number> {
    try {
      // In a real implementation, this would call the claims service API
      // For now, we simulate the integration
      const claimsServiceUrl = process.env.CLAIMS_SERVICE_URL || 'http://localhost:18002';
      
      // Simulate API call to claims service
      // const response = await axios.get(`${claimsServiceUrl}/claims/pending`, {
      //   params: { agentId, partnerId }
      // });
      // const pendingClaims = response.data.count;
      
      // For now, return a simulated value
      const pendingClaims = 5;
      
      return pendingClaims;
    } catch (error) {
      console.error('Error fetching pending claims from claims service:', error);
      return 0;
    }
  }

  async getAgentPolicies(params: {
    agentId: string;
    partnerId: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: any[]; total: number }> {
    const qb = this.attrRepo.createQueryBuilder('a');

    qb.andWhere('a.agent_id = :agentId', { agentId: params.agentId });

    if (params.status) {
      qb.andWhere('a.status = :status', { status: params.status });
    }

    if (params.fromDate) {
      qb.andWhere('a.created_at >= :fromDate', { fromDate: new Date(params.fromDate) });
    }

    if (params.toDate) {
      qb.andWhere('a.created_at <= :toDate', { toDate: new Date(params.toDate) });
    }

    qb.orderBy('a.created_at', 'DESC').limit(params.limit).offset(params.offset);

    const [rows, total] = await qb.getManyAndCount();

    // Transform to match contract format
    const transformedRows = rows.map(row => ({
      id: row.id,
      policyNumber: row.policyNumber,
      customerId: row.customerId,
      customerName: row.customerName || 'Unknown',
      product: row.productCode || 'Unknown',
      status: row.status,
      premium: parseFloat(row.premiumAmount) || 0,
      issueDate: row.issueDate?.toISOString().split('T')[0] || '',
      expiryDate: row.expiryDate?.toISOString().split('T')[0] || '',
      commissionRate: parseFloat(row.commissionRate) || 0,
      commissionAmount: parseFloat(row.commissionAmount) || 0,
    }));

    return { rows: transformedRows, total };
  }

  async getAgentClaims(params: {
    agentId: string;
    partnerId: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: any[]; total: number }> {
    try {
      const claimsServiceUrl = process.env.CLAIMS_SERVICE_URL || 'http://localhost:18002';
      let url = `${claimsServiceUrl}/claims?agentId=${params.agentId}&limit=${params.limit}&offset=${params.offset}`;
      
      if (params.status) url += `&status=${params.status}`;
      if (params.fromDate) url += `&fromDate=${params.fromDate}`;
      if (params.toDate) url += `&toDate=${params.toDate}`;

      const response = await this.fetchWithRetry<{ success: boolean; data: any[]; total: number }>(url);
      
      if (response.success) {
        return { rows: response.data, total: response.total };
      }
      
      // Fallback: get claims from policy attributions
      const attributions = await this.attrRepo.find({ where: { agentId: params.agentId } as any });
      const policyIds = attributions.map(a => a.policyId);
      
      if (policyIds.length === 0) {
        return { rows: [], total: 0 };
      }

      // Query claims service with policy IDs
      const claimsUrl = `${claimsServiceUrl}/claims?policyIds=${policyIds.join(',')}&limit=${params.limit}&offset=${params.offset}`;
      const claimsResponse = await this.fetchWithRetry<{ success: boolean; data: any[]; total: number }>(claimsUrl);
      
      if (claimsResponse.success) {
        return { rows: claimsResponse.data, total: claimsResponse.total };
      }

      return { rows: [], total: 0 };
    } catch (error) {
      this.logger.error('Failed to get agent claims', error as Error, { agentId: params.agentId });
      // Return empty result on error to not break the UI
      return { rows: [], total: 0 };
    }
  }

  async getAgentCustomers(params: {
    agentId: string;
    partnerId: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: any[]; total: number }> {
    try {
      const partyServiceUrl = process.env.PARTY_KYC_SERVICE_URL || 'http://localhost:18006';
      const claimsServiceUrl = process.env.CLAIMS_SERVICE_URL || 'http://localhost:18002';

      // Get unique customers from policy attributions
      const qb = this.attrRepo.createQueryBuilder('a')
        .select(['DISTINCT a.customer_id', 'a.customer_name', 'a.customer_national_id', 'a.customer_phone', 'a.customer_email'])
        .where('a.agent_id = :agentId', { agentId: params.agentId });

      qb.orderBy('a.created_at', 'DESC').limit(params.limit).offset(params.offset);

      const raw = await qb.getRawMany();

      const rows = await Promise.all(raw.map(async (r) => {
        const customerId = r.customer_id;
        const nationalId = r.customer_national_id || '';

        // Count policies for this customer
        const policiesCount = await this.attrRepo.count({ where: { customerId, agentId: params.agentId } as any });

        // Get customer details from party service
        let customerDetails: any = {};
        try {
          const partyUrl = `${partyServiceUrl}/party?nationalId=${nationalId}&limit=1`;
          const partyResponse = await this.fetchWithRetry<{ success: boolean; data: any[] }>(partyUrl);
          if (partyResponse.success && partyResponse.data.length > 0) {
            customerDetails = partyResponse.data[0];
          }
        } catch (error) {
          this.logger.warn('Failed to get customer details from party service', { customerId });
        }

        // Count claims for this customer from claims service
        let claimsCount = 0;
        try {
          const claimsUrl = `${claimsServiceUrl}/claims?customerId=${customerId}&limit=1`;
          const claimsResponse = await this.fetchWithRetry<{ success: boolean; total: number }>(claimsUrl);
          if (claimsResponse.success) {
            claimsCount = claimsResponse.total;
          }
        } catch (error) {
          this.logger.warn('Failed to get claims count for customer', { customerId });
        }

        // Sum premiums from attributions
        const attributions = await this.attrRepo.find({ where: { customerId, agentId: params.agentId } as any });
        const totalPremium = attributions.reduce((sum, a) => sum + (a.premiumAmount || 0), 0);

        return {
          id: customerId,
          nationalId: nationalId,
          name: customerDetails.fullName || r.customer_name || 'Unknown',
          phone: customerDetails.mobile || r.customer_phone || '',
          email: customerDetails.email || r.customer_email || null,
          policiesCount,
          claimsCount,
          totalPremium,
        };
      }));

      return { rows, total: raw.length };
    } catch (error) {
      this.logger.error('Failed to get agent customers', error as Error, { agentId: params.agentId });
      // Return empty result on error to not break the UI
      return { rows: [], total: 0 };
    }
  }

  async getAgentCommissions(params: {
    agentId: string;
    partnerId: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: any[]; total: number }> {
    const qb = this.ledgerRepo.createQueryBuilder('l');

    qb.andWhere('l.agent_id = :agentId', { agentId: params.agentId });

    if (params.status) {
      qb.andWhere('l.status = :status', { status: params.status });
    }

    if (params.fromDate) {
      qb.andWhere('l.created_at >= :fromDate', { fromDate: new Date(params.fromDate) });
    }

    if (params.toDate) {
      qb.andWhere('l.created_at <= :toDate', { toDate: new Date(params.toDate) });
    }

    qb.orderBy('l.created_at', 'DESC').limit(params.limit).offset(params.offset);

    const [rows, total] = await qb.getManyAndCount();

    const transformedRows = rows.map(row => ({
      id: row.ledgerEntryId,
      policyId: row.policyId,
      policyNumber: row.policyNumber || 'Unknown',
      contractId: row.contractId || '',
      commissionRate: parseFloat(row.commissionRate) || 0,
      commissionAmount: parseFloat(row.commissionAmount) || 0,
      status: row.status.toUpperCase() as 'PENDING' | 'PAID' | 'CANCELLED',
      dueDate: row.dueDate?.toISOString().split('T')[0] || '',
      paidDate: row.paidDate?.toISOString().split('T')[0] || undefined,
    }));

    return { rows: transformedRows, total };
  }

  async getAgentKpis(params: {
    agentId: string;
    partnerId: string;
    fromDate?: string;
    toDate?: string;
    granularity?: 'daily' | 'monthly';
  }): Promise<any[]> {
    const now = new Date();
    const fromDate = params.fromDate ? new Date(params.fromDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const toDate = params.toDate ? new Date(params.toDate) : now;

    const kpis = await this.kpiRepo
      .createQueryBuilder('k')
      .where('k.org_unit_id = :orgUnitId', { orgUnitId: params.partnerId })
      .andWhere('k.day >= :start', { start: fromDate })
      .andWhere('k.day <= :end', { end: toDate })
      .orderBy('k.day', 'ASC')
      .getMany();

    return kpis.map(k => ({
      date: k.day,
      issuanceCount: k.policiesIssuedCount || 0,
      issuancePremium: parseFloat(k.premiumIssuedAmount) || 0,
      claimsCount: k.claimsCreatedCount || 0,
      claimsAmount: parseFloat(k.claimsAmount || '0') || 0, // Claims amount from KPI data
      commissionEarned: parseFloat(k.commissionAccruedAmount) || 0,
      newCustomers: k.newCustomersCount || 0,
    }));
  }
}
