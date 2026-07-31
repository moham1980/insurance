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
import { DistributionAgreement } from './entities/DistributionAgreement';
import { CommissionTier } from './entities/CommissionTier';
import { ClawbackRule } from './entities/ClawbackRule';
import { Lead, LeadStatus, LeadPriority } from './entities/Lead';

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
    @InjectRepository(DistributionAgreement) private readonly agreementRepo: Repository<DistributionAgreement>,
    @InjectRepository(CommissionTier) private readonly tierRepo: Repository<CommissionTier>,
    @InjectRepository(ClawbackRule) private readonly clawbackRuleRepo: Repository<ClawbackRule>,
    @InjectRepository(ConsumedEvent) private readonly consumedRepo: Repository<ConsumedEvent>,
    @InjectRepository(Lead) private readonly leadRepo: Repository<Lead>,
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
    const method: string = config?.method || 'GET';
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await firstValueFrom(
          method === 'POST'
            ? this.httpService.post<T>(url, config?.body, { headers: config?.headers })
            : this.httpService.get<T>(url, config)
        );
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

  async listPartners(params: { kind?: SalesPartnerKind; status?: SalesPartnerStatus; organizationId?: string; parentPartnerId?: string; limit: number; offset: number; actorOrgUnitId?: string | null; actorOrganizationId?: string | null; allowAll: boolean }) {
    const qb = this.partnersRepo.createQueryBuilder('p');

    if (params.kind) qb.andWhere('p.kind = :kind', { kind: params.kind });
    if (params.status) qb.andWhere('p.status = :status', { status: params.status });
    if (params.organizationId) qb.andWhere('p.organization_id = :organizationId', { organizationId: params.organizationId });
    if (params.parentPartnerId) qb.andWhere('p.parent_partner_id = :parentPartnerId', { parentPartnerId: params.parentPartnerId });

    if (!params.allowAll) {
      if (!params.actorOrgUnitId && !params.actorOrganizationId) return { rows: [], total: 0 };
      const orConditions: string[] = [];
      if (params.actorOrgUnitId) {
        orConditions.push('p.org_unit_id = :actorOrgUnitId');
        qb.setParameter('actorOrgUnitId', params.actorOrgUnitId);
      }
      if (params.actorOrganizationId) {
        orConditions.push('p.organization_id = :actorOrganizationId');
        qb.setParameter('actorOrganizationId', params.actorOrganizationId);
      }
      qb.andWhere(`(${orConditions.join(' OR ')})`);
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
    organizationId?: string | null;
    parentPartnerId?: string | null;
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
            organizationId: params.organizationId ?? null,
            parentPartnerId: params.parentPartnerId ?? null,
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
      row.organizationId = params.organizationId ?? row.organizationId;
      row.parentPartnerId = params.parentPartnerId ?? row.parentPartnerId;
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

  async setPartnerStatus(params: { orgUnitId: string; status: SalesPartnerStatus; actorUserId?: string | null; correlationId?: string }): Promise<SalesPartner | null> {
    const result = await this.dataSource.transaction(async (manager) => {
      const p = await manager.findOne(SalesPartner, { where: { orgUnitId: params.orgUnitId } });
      if (!p) return null;
      const previousStatus = p.status;
      p.status = params.status;
      p.updatedAt = new Date();
      await manager.save(p);
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.sales.partner.status_changed',
        eventType: 'SalesPartnerStatusChanged',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { partnerId: p.partnerId, orgUnitId: p.orgUnitId },
        payload: {
          partnerId: p.partnerId,
          orgUnitId: p.orgUnitId,
          organizationId: p.organizationId,
          previousStatus,
          status: p.status,
        },
      });

      if (params.status === 'suspended' || params.status === 'terminated') {
        await outbox.publish({
          topic: 'insurance.sales.partner.suspended',
          eventType: 'SalesPartnerSuspended',
          eventVersion: 1,
          correlationId: params.correlationId || uuidv4(),
          subject: { partnerId: p.partnerId, orgUnitId: p.orgUnitId },
          payload: {
            partnerId: p.partnerId,
            orgUnitId: p.orgUnitId,
            organizationId: p.organizationId,
            status: p.status,
            reason: `Partner ${params.status} by ${params.actorUserId ?? 'system'}`,
          },
        });
      }

      return p;
    });

    if (params.status === 'suspended' || params.status === 'terminated') {
      await this.syncPartnerSuspensionWithAuth({
        orgUnitId: params.orgUnitId,
        status: params.status,
        correlationId: params.correlationId,
      });
    }

    return result;
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
    distributionAgreementId?: string | null;
    lineOfBusiness?: string | null;
    base: 'premium_gross' | 'premium_net';
    rateBps?: number | null;
    fixedFeeAmount?: string | null;
    splitPercentBps?: number | null;
    capAmountMinor?: string | null;
    floorAmountMinor?: string | null;
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
        distributionAgreementId: params.distributionAgreementId ?? null,
        status: 'draft',
        lineOfBusiness: params.lineOfBusiness ?? null,
        base: params.base,
        rateBps: params.rateBps ?? null,
        fixedFeeAmount: params.fixedFeeAmount ?? null,
        splitPercentBps: params.splitPercentBps ?? null,
        capAmountMinor: params.capAmountMinor ?? null,
        floorAmountMinor: params.floorAmountMinor ?? null,
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
          distributionAgreementId: c.distributionAgreementId,
          status: c.status,
          base: c.base,
          rateBps: c.rateBps,
          splitPercentBps: c.splitPercentBps,
          capAmountMinor: c.capAmountMinor,
          floorAmountMinor: c.floorAmountMinor,
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
          distributionAgreementId: c.distributionAgreementId,
          status: c.status,
        },
      });

      return c;
    });
  }

  async terminateContract(contractId: string, reason: string, actorUserId?: string | null, correlationId?: string): Promise<CommissionContract | null> {
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const c = await manager.findOne(CommissionContract, { where: { contractId } });
      if (!c) return null;
      c.status = 'terminated';
      c.updatedAt = new Date();
      await manager.save(c);

      await outbox.publish({
        topic: 'insurance.sales.contract.terminated',
        eventType: 'CommissionContractTerminated',
        eventVersion: 1,
        correlationId: correlationId || uuidv4(),
        subject: { contractId: c.contractId, orgUnitId: c.orgUnitId },
        payload: {
          contractId: c.contractId,
          orgUnitId: c.orgUnitId,
          distributionAgreementId: c.distributionAgreementId,
          status: c.status,
          reason,
          terminatedBy: actorUserId ?? null,
        },
      });

      await outbox.publish({
        topic: 'insurance.product.contract.expired',
        eventType: 'ContractExpiredProductVisibilityRevoke',
        eventVersion: 1,
        correlationId: correlationId || uuidv4(),
        subject: { contractId: c.contractId, orgUnitId: c.orgUnitId },
        payload: {
          contractId: c.contractId,
          orgUnitId: c.orgUnitId,
          distributionAgreementId: c.distributionAgreementId,
          lineOfBusiness: c.lineOfBusiness,
          reason,
          action: 'revoke_product_visibility',
        },
      });

      return c;
    });
  }

  // ========== Distribution Agreement Management ==========

  async createDistributionAgreement(params: {
    tenantId: string;
    carrierOrganizationId: string;
    distributorOrganizationId: string;
    agreementType: 'brokerage' | 'agency' | 'mga' | 'referral';
    effectiveFrom: string;
    effectiveTo?: string | null;
    linesOfBusiness?: string[];
    productScope?: string[];
    territories?: string[];
    bindingAuthorityAmountMinor: string;
    bindingAuthorityCurrency?: string;
    settlementTerms?: Record<string, any>;
    documentRefs?: string[];
    actorUserId?: string | null;
    correlationId?: string;
  }): Promise<DistributionAgreement> {
    return await this.dataSource.transaction(async (manager) => {
      const agreement = manager.create(DistributionAgreement, {
        tenantId: params.tenantId,
        carrierOrganizationId: params.carrierOrganizationId,
        distributorOrganizationId: params.distributorOrganizationId,
        agreementType: params.agreementType,
        version: 1,
        effectiveFrom: new Date(params.effectiveFrom),
        effectiveTo: params.effectiveTo ? new Date(params.effectiveTo) : null,
        status: 'draft',
        linesOfBusiness: params.linesOfBusiness ?? [],
        productScope: params.productScope ?? [],
        territories: params.territories ?? [],
        bindingAuthorityAmountMinor: params.bindingAuthorityAmountMinor,
        bindingAuthorityCurrency: params.bindingAuthorityCurrency ?? 'IRR',
        settlementTerms: params.settlementTerms ?? {},
        documentRefs: params.documentRefs ?? [],
      });
      await manager.save(agreement);

      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.sales.agreement.created',
        eventType: 'DistributionAgreementCreated',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { agreementId: agreement.agreementId },
        payload: {
          agreementId: agreement.agreementId,
          carrierOrganizationId: agreement.carrierOrganizationId,
          distributorOrganizationId: agreement.distributorOrganizationId,
          agreementType: agreement.agreementType,
          status: agreement.status,
          effectiveFrom: agreement.effectiveFrom?.toISOString?.() ?? null,
        },
      });

      return agreement;
    });
  }

  async listDistributionAgreements(params: {
    carrierOrganizationId?: string;
    distributorOrganizationId?: string;
    status?: string;
    agreementType?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: DistributionAgreement[]; total: number }> {
    const qb = this.agreementRepo.createQueryBuilder('a');
    if (params.carrierOrganizationId) qb.andWhere('a.carrier_organization_id = :carrierOrganizationId', { carrierOrganizationId: params.carrierOrganizationId });
    if (params.distributorOrganizationId) qb.andWhere('a.distributor_organization_id = :distributorOrganizationId', { distributorOrganizationId: params.distributorOrganizationId });
    if (params.status) qb.andWhere('a.status = :status', { status: params.status });
    if (params.agreementType) qb.andWhere('a.agreement_type = :agreementType', { agreementType: params.agreementType });
    qb.orderBy('a.updated_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async getDistributionAgreement(agreementId: string): Promise<DistributionAgreement | null> {
    return await this.agreementRepo.findOne({ where: { agreementId } });
  }

  async activateDistributionAgreement(params: {
    agreementId: string;
    actorUserId?: string | null;
    correlationId?: string;
  }): Promise<DistributionAgreement | null> {
    return await this.dataSource.transaction(async (manager) => {
      const agreement = await manager.findOne(DistributionAgreement, { where: { agreementId: params.agreementId } });
      if (!agreement) return null;
      agreement.status = 'active';
      agreement.updatedAt = new Date();
      await manager.save(agreement);

      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.sales.agreement.activated',
        eventType: 'DistributionAgreementActivated',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { agreementId: agreement.agreementId },
        payload: {
          agreementId: agreement.agreementId,
          status: agreement.status,
        },
      });

      return agreement;
    });
  }

  async terminateDistributionAgreement(params: {
    agreementId: string;
    reason?: string;
    actorUserId?: string | null;
    correlationId?: string;
  }): Promise<DistributionAgreement | null> {
    return await this.dataSource.transaction(async (manager) => {
      const agreement = await manager.findOne(DistributionAgreement, { where: { agreementId: params.agreementId } });
      if (!agreement) return null;
      agreement.status = 'terminated';
      agreement.updatedAt = new Date();
      await manager.save(agreement);

      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.sales.agreement.terminated',
        eventType: 'DistributionAgreementTerminated',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { agreementId: agreement.agreementId },
        payload: {
          agreementId: agreement.agreementId,
          status: agreement.status,
          reason: params.reason ?? null,
        },
      });

      return agreement;
    });
  }

  // ========== Commission Tier Management ==========

  async createCommissionTier(params: {
    agreementId: string;
    tierType: 'percentage' | 'fixed' | 'tiered';
    lineOfBusiness?: string | null;
    minPremiumAmountMinor?: string | null;
    maxPremiumAmountMinor?: string | null;
    rateBps?: number | null;
    fixedAmountMinor?: string | null;
    capAmountMinor?: string | null;
    floorAmountMinor?: string | null;
    splitPercentBps?: number | null;
    hierarchyLevel?: string | null;
    currency?: string;
    rules?: Record<string, any> | null;
  }): Promise<CommissionTier> {
    const tier = this.tierRepo.create({
      agreementId: params.agreementId,
      tierType: params.tierType,
      lineOfBusiness: params.lineOfBusiness ?? null,
      minPremiumAmountMinor: params.minPremiumAmountMinor ?? null,
      maxPremiumAmountMinor: params.maxPremiumAmountMinor ?? null,
      rateBps: params.rateBps ?? null,
      fixedAmountMinor: params.fixedAmountMinor ?? null,
      capAmountMinor: params.capAmountMinor ?? null,
      floorAmountMinor: params.floorAmountMinor ?? null,
      splitPercentBps: params.splitPercentBps ?? null,
      hierarchyLevel: params.hierarchyLevel ?? null,
      currency: params.currency ?? 'IRR',
      rules: params.rules ?? null,
    });
    return await this.tierRepo.save(tier);
  }

  async listCommissionTiers(agreementId: string): Promise<CommissionTier[]> {
    return await this.tierRepo.find({ where: { agreementId } });
  }

  async deleteCommissionTier(tierId: string): Promise<void> {
    await this.tierRepo.delete({ tierId });
  }

  // ========== Clawback Rule Management ==========

  async createClawbackRule(params: {
    agreementId: string;
    triggerEvent: string;
    windowDays?: number;
    rateBps?: number;
    fixedAmountMinor?: string | null;
    currency?: string;
    rules?: Record<string, any> | null;
  }): Promise<ClawbackRule> {
    const rule = this.clawbackRuleRepo.create({
      agreementId: params.agreementId,
      triggerEvent: params.triggerEvent,
      windowDays: params.windowDays ?? 365,
      rateBps: params.rateBps ?? 0,
      fixedAmountMinor: params.fixedAmountMinor ?? null,
      currency: params.currency ?? 'IRR',
      rules: params.rules ?? null,
    });
    return await this.clawbackRuleRepo.save(rule);
  }

  async listClawbackRules(agreementId: string): Promise<ClawbackRule[]> {
    return await this.clawbackRuleRepo.find({ where: { agreementId } });
  }

  async deleteClawbackRule(ruleId: string): Promise<void> {
    await this.clawbackRuleRepo.delete({ ruleId } as any);
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
    const totalPremium = attributions.reduce((sum, a) => sum + (parseFloat(a.premiumAmount || '0') || 0), 0);

    const ledgerEntries = await this.ledgerRepo.find({ where: { orgUnitId: params.orgUnitId } });
    const pendingCommission = ledgerEntries.filter(e => e.status === 'accrued').reduce((sum, e) => sum + (parseFloat(e.commissionAmount) || 0), 0);
    const paidCommission = ledgerEntries.filter(e => e.status === 'paid' || e.status === 'settled').reduce((sum, e) => sum + (parseFloat(e.commissionAmount) || 0), 0);

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

  private async findActiveDistributionAgreement(organizationId: string, lineOfBusiness: string | null, occurredAt: Date): Promise<DistributionAgreement | null> {
    const qb = this.agreementRepo.createQueryBuilder('a');
    qb.where('a.distributor_organization_id = :organizationId', { organizationId })
      .andWhere('a.status = :status', { status: 'active' })
      .andWhere('a.effective_from <= :t', { t: occurredAt.toISOString() })
      .andWhere('(a.effective_to IS NULL OR a.effective_to >= :t2)', { t2: occurredAt.toISOString() });

    if (lineOfBusiness) {
      qb.andWhere('(a.lines_of_business IS NULL OR a.lines_of_business @> :lob::jsonb)', { lob: JSON.stringify([lineOfBusiness]) });
    }

    qb.orderBy('a.effective_from', 'DESC');
    return await qb.getOne();
  }

  private async findCommissionTiers(agreementId: string, lineOfBusiness: string | null, premiumAmountMinor: string): Promise<CommissionTier[]> {
    const qb = this.tierRepo.createQueryBuilder('t');
    qb.where('t.agreement_id = :agreementId', { agreementId });

    if (lineOfBusiness) {
      qb.andWhere('(t.line_of_business IS NULL OR t.line_of_business = :lob)', { lob: lineOfBusiness });
    }

    const premium = BigInt(String(premiumAmountMinor || '0'));
    qb.andWhere('(t.min_premium_amount_minor IS NULL OR t.min_premium_amount_minor <= :premium)', { premium: premium.toString() });
    qb.andWhere('(t.max_premium_amount_minor IS NULL OR t.max_premium_amount_minor >= :premium2)', { premium2: premium.toString() });

    qb.orderBy('t.rate_bps', 'DESC');
    return await qb.getMany();
  }

  private calcCommission(params: {
    premiumAmount: string | number | null | undefined;
    contract: CommissionContract | null;
    tiers?: CommissionTier[];
  }): { commissionAmount: string; contractId: string | null; currency: string; splitAmount: string | null; agreementId: string | null } {
    const premium = params.premiumAmount !== null && params.premiumAmount !== undefined ? Number(params.premiumAmount) : 0;
    if (!params.contract && (!params.tiers || params.tiers.length === 0)) {
      return { commissionAmount: '0', contractId: null, currency: 'IRR', splitAmount: null, agreementId: null };
    }

    let commission = 0;
    let agreementId: string | null = null;

    if (params.tiers && params.tiers.length > 0) {
      const tier = params.tiers[0];
      agreementId = tier.agreementId;
      const rateBps = typeof tier.rateBps === 'number' ? tier.rateBps : 0;
      const fixed = tier.fixedAmountMinor !== null && tier.fixedAmountMinor !== undefined ? Number(tier.fixedAmountMinor) : 0;
      commission = (premium * rateBps) / 10000 + fixed;
    } else if (params.contract) {
      const rateBps = typeof params.contract.rateBps === 'number' ? params.contract.rateBps : 0;
      const fixed = params.contract.fixedFeeAmount !== null && params.contract.fixedFeeAmount !== undefined ? Number(params.contract.fixedFeeAmount) : 0;
      commission = (premium * rateBps) / 10000 + fixed;
    }

    let splitAmount: number | null = null;
    const splitBps = params.contract?.splitPercentBps ?? params.tiers?.[0]?.splitPercentBps ?? null;
    if (splitBps !== null && typeof splitBps === 'number') {
      splitAmount = (commission * splitBps) / 10000;
    }

    const capMinor = params.contract?.capAmountMinor ?? params.tiers?.[0]?.capAmountMinor ?? null;
    const floorMinor = params.contract?.floorAmountMinor ?? params.tiers?.[0]?.floorAmountMinor ?? null;
    if (capMinor !== null && capMinor !== undefined) {
      const cap = Number(capMinor);
      if (commission > cap) commission = cap;
    }
    if (floorMinor !== null && floorMinor !== undefined) {
      const floor = Number(floorMinor);
      if (commission < floor) commission = floor;
    }

    return {
      commissionAmount: String(commission),
      contractId: params.contract?.contractId ?? null,
      currency: params.contract?.currency ?? params.tiers?.[0]?.currency ?? 'IRR',
      splitAmount: splitAmount !== null ? String(splitAmount) : null,
      agreementId,
    };
  }

  async calculateCommissionForPolicy(params: {
    policyId: string;
    orgUnitId: string;
    organizationId?: string | null;
    lineOfBusiness: string | null;
    premiumAmount: number;
    currency?: string;
    occurredAt?: Date;
  }): Promise<{ commissionAmount: string; contractId: string | null; distributionAgreementId: string | null; currency: string; contract: CommissionContract | null; splitAmount: string | null }> {
    const validOccurredAt = params.occurredAt || new Date();
    const contract = await this.findActiveContract(params.orgUnitId, params.lineOfBusiness, validOccurredAt);

    let tiers: CommissionTier[] = [];
    let agreementId: string | null = null;

    if (contract?.distributionAgreementId) {
      agreementId = contract.distributionAgreementId;
      tiers = await this.findCommissionTiers(agreementId, params.lineOfBusiness, String(params.premiumAmount));
    } else if (params.organizationId) {
      const agreement = await this.findActiveDistributionAgreement(params.organizationId, params.lineOfBusiness, validOccurredAt);
      if (agreement) {
        agreementId = agreement.agreementId;
        tiers = await this.findCommissionTiers(agreementId, params.lineOfBusiness, String(params.premiumAmount));
      }
    }

    const calc = this.calcCommission({ premiumAmount: params.premiumAmount, contract, tiers });
    return {
      commissionAmount: calc.commissionAmount,
      contractId: calc.contractId,
      distributionAgreementId: calc.agreementId,
      currency: params.currency || calc.currency,
      contract,
      splitAmount: calc.splitAmount,
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

    let tiers: CommissionTier[] = [];
    if (contract?.distributionAgreementId) {
      tiers = await this.findCommissionTiers(contract.distributionAgreementId, existingLedger.lineOfBusiness, String(existingLedger.premiumAmount || '0'));
    } else if (attr.organizationId) {
      const agreement = await this.findActiveDistributionAgreement(attr.organizationId, existingLedger.lineOfBusiness, attr.issuedAt);
      if (agreement) {
        tiers = await this.findCommissionTiers(agreement.agreementId, existingLedger.lineOfBusiness, String(existingLedger.premiumAmount || '0'));
      }
    }

    const calc = this.calcCommission({ premiumAmount: existingLedger.premiumAmount, contract, tiers });

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

    const partner = await this.partnersRepo.findOne({ where: { orgUnitId } });
    const organizationId = partner?.organizationId ?? null;

    let tiers: CommissionTier[] = [];
    if (contract?.distributionAgreementId) {
      tiers = await this.findCommissionTiers(contract.distributionAgreementId, typeof lob === 'string' ? lob : null, String(premiumAmount || '0'));
    } else if (organizationId) {
      const agreement = await this.findActiveDistributionAgreement(organizationId, typeof lob === 'string' ? lob : null, validOccurredAt);
      if (agreement) {
        tiers = await this.findCommissionTiers(agreement.agreementId, typeof lob === 'string' ? lob : null, String(premiumAmount || '0'));
      }
    }

    const calc = this.calcCommission({ premiumAmount, contract, tiers });

    await this.dataSource.transaction(async (manager) => {
      const entry = manager.create(CommissionLedgerEntry, {
        ledgerEntryId: uuidv4(),
        eventId: envelope.eventId,
        eventType: envelope.eventType,
        occurredAt: validOccurredAt,
        orgUnitId,
        organizationId,
        agentId: partner?.partnerId ?? null,
        policyId,
        policyNumber: typeof policyNumber === 'string' ? policyNumber : null,
        lineOfBusiness: typeof lob === 'string' ? lob : null,
        premiumAmount: premiumAmount !== null && premiumAmount !== undefined ? String(premiumAmount) : null,
        commissionAmount: calc.commissionAmount,
        currency: calc.currency,
        contractId: calc.contractId,
        distributionAgreementId: calc.agreementId,
        status: 'accrued',
        voidReason: null,
        metadata: {
          correlationId: envelope.correlationId,
          splitAmount: calc.splitAmount,
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
          organizationId,
          policyId,
          commissionAmount: entry.commissionAmount,
          currency: entry.currency,
          contractId: entry.contractId,
          distributionAgreementId: entry.distributionAgreementId,
          splitAmount: calc.splitAmount,
          status: entry.status,
        },
      });

      await manager.save(
        manager.create(SalesPolicyAttribution, {
          policyId,
          orgUnitId,
          organizationId,
          agentId: partner?.partnerId ?? null,
          policyNumber: typeof policyNumber === 'string' ? policyNumber : null,
          premiumAmount: premiumAmount !== null && premiumAmount !== undefined ? String(premiumAmount) : null,
          commissionRate: contract?.rateBps ? String(contract.rateBps / 10000) : null,
          commissionAmount: calc.commissionAmount,
          commissionSplitAmount: calc.splitAmount,
          distributionAgreementId: calc.agreementId,
          lineOfBusiness: typeof lob === 'string' ? lob : null,
          policyStatus: 'ACTIVE',
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
            organizationId,
            day,
            policiesIssuedCount: 0,
            policiesRenewedCount: 0,
            policiesCancelledCount: 0,
            policiesActiveCount: 0,
            policiesLapsedCount: 0,
            complaintsCreatedCount: 0,
            claimsCreatedCount: 0,
            claimsAmount: '0',
            claimsPaidAmount: '0',
            newCustomersCount: 0,
            premiumIssuedAmount: '0',
            premiumRenewedAmount: '0',
            commissionAccruedAmount: '0',
            commissionClawbackAmount: '0',
            currency: calc.currency,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

      k.policiesIssuedCount = (k.policiesIssuedCount || 0) + 1;
      k.policiesActiveCount = (k.policiesActiveCount || 0) + 1;
      k.premiumIssuedAmount = String(Number(k.premiumIssuedAmount || '0') + Number(premiumAmount || 0));
      k.commissionAccruedAmount = String(Number(k.commissionAccruedAmount || '0') + Number(calc.commissionAmount || 0));
      const issuedCount = k.policiesIssuedCount || 0;
      if (issuedCount > 0) {
        k.avgPremiumPerPolicyMinor = String(Number(k.premiumIssuedAmount || '0') / issuedCount);
      }
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
    const premiumAmount = envelope.payload?.premiumAmount ?? null;

    const partner = await this.partnersRepo.findOne({ where: { orgUnitId } });
    const organizationId = partner?.organizationId ?? null;

    await this.dataSource.transaction(async (manager) => {
      const kExisting = await manager.findOne(SalesKpiDaily, { where: { orgUnitId, day } as any });
      const k = kExisting
        ? kExisting
        : manager.create(SalesKpiDaily, {
            kpiId: uuidv4(),
            orgUnitId,
            organizationId,
            day,
            policiesIssuedCount: 0,
            policiesRenewedCount: 0,
            policiesCancelledCount: 0,
            policiesActiveCount: 0,
            policiesLapsedCount: 0,
            complaintsCreatedCount: 0,
            claimsCreatedCount: 0,
            claimsAmount: '0',
            claimsPaidAmount: '0',
            newCustomersCount: 0,
            premiumIssuedAmount: '0',
            premiumRenewedAmount: '0',
            commissionAccruedAmount: '0',
            commissionClawbackAmount: '0',
            currency: 'IRR',
            createdAt: new Date(),
            updatedAt: new Date(),
          });

      k.policiesRenewedCount = (k.policiesRenewedCount || 0) + 1;
      k.premiumRenewedAmount = String(Number(k.premiumRenewedAmount || '0') + Number(premiumAmount || 0));
      k.updatedAt = new Date();
      await manager.save(k);

      const attr = await manager.findOne(SalesPolicyAttribution, { where: { policyId } });
      if (attr) {
        attr.policyStatus = 'RENEWED';
        attr.updatedAt = new Date();
        await manager.save(attr);
      }
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
    const cancellationReason = envelope.payload?.cancellationReason ?? 'policy_cancelled';

    const partner = await this.partnersRepo.findOne({ where: { orgUnitId } });
    const organizationId = partner?.organizationId ?? null;

    await this.dataSource.transaction(async (manager) => {
      const ledgerEntry = await manager.findOne(CommissionLedgerEntry, {
        where: { policyId, status: 'accrued' } as any,
      });

      let clawbackAmount = 0;
      let clawbackApplied = false;

      if (ledgerEntry) {
        const agreementId = ledgerEntry.distributionAgreementId;
        if (agreementId) {
          const clawbackRules = await this.clawbackRuleRepo.find({ where: { agreementId } as any });
          const matchingRule = clawbackRules.find(r => r.triggerEvent === 'policy_cancelled' || r.triggerEvent === 'cancellation');

          if (matchingRule) {
            const issuedAt = ledgerEntry.occurredAt;
            const daysSinceIssue = Math.floor((validOccurredAt.getTime() - issuedAt.getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceIssue <= (matchingRule.windowDays || 365)) {
              const rateBps = typeof matchingRule.rateBps === 'number' ? matchingRule.rateBps : 0;
              const fixedClawback = matchingRule.fixedAmountMinor !== null && matchingRule.fixedAmountMinor !== undefined ? Number(matchingRule.fixedAmountMinor) : 0;
              clawbackAmount = (Number(ledgerEntry.commissionAmount) * rateBps) / 10000 + fixedClawback;
              clawbackApplied = true;
            }
          }
        }

        if (clawbackApplied) {
          ledgerEntry.status = 'clawback';
          ledgerEntry.clawbackAmount = String(clawbackAmount);
          ledgerEntry.clawbackReason = cancellationReason;
          ledgerEntry.clawbackDate = validOccurredAt;
          ledgerEntry.updatedAt = new Date();
          await manager.save(ledgerEntry);

          const outbox = new OutboxPublisher(manager);
          await outbox.publish({
            topic: 'insurance.sales.commission.clawback',
            eventType: 'CommissionClawbackApplied',
            eventVersion: 1,
            correlationId: envelope.correlationId || uuidv4(),
            subject: { ledgerEntryId: ledgerEntry.ledgerEntryId, orgUnitId, policyId },
            payload: {
              ledgerEntryId: ledgerEntry.ledgerEntryId,
              orgUnitId,
              organizationId,
              policyId,
              clawbackAmount: String(clawbackAmount),
              clawbackReason: cancellationReason,
              originalCommissionAmount: ledgerEntry.commissionAmount,
            },
          });

          await outbox.publish({
            topic: 'insurance.billing.clawback.request',
            eventType: 'ClawbackRequested',
            eventVersion: 1,
            correlationId: envelope.correlationId || uuidv4(),
            subject: { ledgerEntryId: ledgerEntry.ledgerEntryId, orgUnitId, policyId },
            payload: {
              policyId,
              orgUnitId,
              organizationId,
              ledgerEntryId: ledgerEntry.ledgerEntryId,
              clawbackAmount: String(clawbackAmount),
              reason: cancellationReason,
              originalCommissionAmount: ledgerEntry.commissionAmount,
            },
          });
        }
      }

      const attr = await manager.findOne(SalesPolicyAttribution, { where: { policyId } });
      if (attr) {
        attr.policyStatus = 'CANCELLED';
        attr.updatedAt = new Date();
        await manager.save(attr);
      }

      const kExisting = await manager.findOne(SalesKpiDaily, { where: { orgUnitId, day } as any });
      const k = kExisting
        ? kExisting
        : manager.create(SalesKpiDaily, {
            kpiId: uuidv4(),
            orgUnitId,
            organizationId,
            day,
            policiesIssuedCount: 0,
            policiesRenewedCount: 0,
            policiesCancelledCount: 0,
            policiesActiveCount: 0,
            policiesLapsedCount: 0,
            complaintsCreatedCount: 0,
            claimsCreatedCount: 0,
            claimsAmount: '0',
            claimsPaidAmount: '0',
            newCustomersCount: 0,
            premiumIssuedAmount: '0',
            premiumRenewedAmount: '0',
            commissionAccruedAmount: '0',
            commissionClawbackAmount: '0',
            currency: 'IRR',
            createdAt: new Date(),
            updatedAt: new Date(),
          });

      k.policiesCancelledCount = (k.policiesCancelledCount || 0) + 1;
      k.policiesActiveCount = Math.max(0, (k.policiesActiveCount || 0) - 1);
      if (clawbackApplied) {
        k.commissionClawbackAmount = String(Number(k.commissionClawbackAmount || '0') + clawbackAmount);
      }
      k.updatedAt = new Date();
      await manager.save(k);
    });
  }

  private async applyPolicyEndorsed(envelope: EventEnvelope<any>): Promise<void> {
    const policyId = envelope.subject?.policyId || envelope.payload?.policyId;
    if (!policyId || typeof policyId !== 'string') return;

    const endorsementType = envelope.payload?.endorsementType;
    const occurredAt = new Date(envelope.occurredAt);
    const validOccurredAt = Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt;

    if (endorsementType === 'broker_change') {
      const newDistributionOrgId = envelope.payload?.distributionOrganizationId;
      const oldDistributionOrgId = envelope.payload?.previousValues?.distributionOrganizationId;

      await this.dataSource.transaction(async (manager) => {
        const attr = await manager.findOne(SalesPolicyAttribution, { where: { policyId } });
        if (attr) {
          if (oldDistributionOrgId) {
            attr.metadata = {
              ...(attr.metadata || {}),
              brokerChangedAt: validOccurredAt.toISOString(),
              previousDistributionOrganizationId: oldDistributionOrgId,
            };
          }
          attr.updatedAt = new Date();
          await manager.save(attr);
        }

        if (oldDistributionOrgId) {
          const oldLedger = await manager.findOne(CommissionLedgerEntry, {
            where: { policyId, status: 'accrued' } as any,
          });
          if (oldLedger) {
            oldLedger.status = 'void';
            oldLedger.voidReason = 'broker_change';
            oldLedger.updatedAt = new Date();
            await manager.save(oldLedger);
          }
        }
      });

      this.logger.info('PolicyEndorsed: broker_change processed', {
        policyId,
        newDistributionOrgId,
        oldDistributionOrgId,
        eventId: envelope.eventId,
      });
    }
  }

  private async applySalesNetworkSync(envelope: EventEnvelope<any>): Promise<void> {
    const policyId = envelope.subject?.policyId || envelope.payload?.policyId;
    if (!policyId || typeof policyId !== 'string') return;

    const syncType = envelope.payload?.syncType;
    const distributionOrganizationId = envelope.payload?.distributionOrganizationId;
    const status = envelope.payload?.status;

    this.logger.info('SalesNetworkPolicySync received', {
      policyId,
      syncType,
      distributionOrganizationId,
      status,
      eventId: envelope.eventId,
    });

    await this.dataSource.transaction(async (manager) => {
      const attr = await manager.findOne(SalesPolicyAttribution, { where: { policyId } });
      if (attr) {
        if (syncType === 'policy_cancelled' || status === 'cancelled') {
          attr.policyStatus = 'CANCELLED';
        } else if (syncType === 'policy_renewed') {
          attr.policyStatus = 'RENEWED';
        } else if (syncType === 'policy_issued') {
          attr.policyStatus = 'ACTIVE';
        } else if (syncType === 'broker_changed') {
          attr.metadata = {
            ...(attr.metadata || {}),
            brokerChangedAt: new Date().toISOString(),
            newDistributionOrganizationId: distributionOrganizationId,
          };
        }
        attr.updatedAt = new Date();
        await manager.save(attr);
      }
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

  // Issue 4.3: Handle KYC status changed events from party-kyc-service
  private async applyKycStatusChanged(envelope: EventEnvelope<any>): Promise<void> {
    const partyId = envelope.subject?.partyId || envelope.payload?.partyId;
    const kycStatus = envelope.payload?.kycStatus;
    const actionRequired = envelope.payload?.actionRequired;
    const roles: string[] = envelope.payload?.roles || [];

    if (!partyId || !kycStatus) return;

    this.logger.info('Processing KYC status change', {
      partyId,
      kycStatus,
      actionRequired,
      roles,
      eventId: envelope.eventId,
    });

    // Find sales partners linked to this party ID
    // Sales partners may be linked via metadata.partyId or legalNationalId
    const partners = await this.partnersRepo
      .createQueryBuilder('sp')
      .where("sp.metadata->>'partyId' = :partyId", { partyId })
      .getMany();

    if (partners.length === 0) {
      this.logger.info('No sales partners found for party', { partyId });
      return;
    }

    for (const partner of partners) {
      if (actionRequired === 'suspend_agent' || kycStatus === 'rejected') {
        // Suspend the partner if KYC is rejected
        if (partner.status !== SalesPartnerStatus.SUSPENDED && partner.status !== SalesPartnerStatus.TERMINATED) {
          partner.status = SalesPartnerStatus.SUSPENDED;
          partner.updatedAt = new Date();
          await this.partnersRepo.save(partner);
          this.logger.info('Suspended sales partner due to KYC rejection', {
            partnerId: partner.partnerId,
            partyId,
          });
        }
      } else if (actionRequired === 'activate_agent' || kycStatus === 'approved') {
        // Reactivate the partner if KYC is approved
        if (partner.status === SalesPartnerStatus.SUSPENDED) {
          partner.status = SalesPartnerStatus.ACTIVE;
          partner.updatedAt = new Date();
          await this.partnersRepo.save(partner);
          this.logger.info('Reactivated sales partner due to KYC approval', {
            partnerId: partner.partnerId,
            partyId,
          });
        }
      }
    }
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
      case 'PolicyEndorsed':
        await this.applyPolicyEndorsed(envelope);
        return;
      case 'SalesNetworkPolicySync':
        await this.applySalesNetworkSync(envelope);
        return;
      case 'ComplaintCreated':
        await this.applyComplaintCreated(envelope);
        return;
      case 'KycStatusChanged':
        await this.applyKycStatusChanged(envelope);
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

    const topics = ['insurance.policy.issued', 'insurance.policy.renewed', 'insurance.policy.cancelled', 'insurance.policy.endorsed', 'insurance.policy.sales_network_sync', 'insurance.complaint.created', 'insurance.party.kyc_status_changed'];
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

  async getAgentStats(params: { agentId: string; partnerId: string; organizationId?: string | null; startDate?: string; endDate?: string; lineOfBusiness?: string }): Promise<{
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
    const startDate = params.startDate ? new Date(params.startDate) : monthStart;
    const endDate = params.endDate ? new Date(params.endDate) : now;

    // Get policies attribution for this agent
    const attrWhere: any = { agentId: params.agentId };
    if (params.organizationId) attrWhere.organizationId = params.organizationId;
    if (params.lineOfBusiness) attrWhere.lineOfBusiness = params.lineOfBusiness;
    const policyAttributions = await this.attrRepo.find({ 
      where: attrWhere 
    });

    const totalPolicies = policyAttributions.length;
    const activePolicies = policyAttributions.filter(p => p.policyStatus === 'ACTIVE').length;
    const pendingPolicies = policyAttributions.filter(p => p.policyStatus === 'PENDING' || p.policyStatus === 'RENEWED').length;

    // Get commissions for this agent
    const ledgerWhere: any = { agentId: params.agentId };
    if (params.organizationId) ledgerWhere.organizationId = params.organizationId;
    const commissions = await this.ledgerRepo.find({ where: ledgerWhere });
    const totalCommission = commissions.reduce((sum, c) => sum + (parseFloat(c.commissionAmount) || 0), 0);
    const pendingCommission = commissions.filter(c => c.status === 'accrued')
      .reduce((sum, c) => sum + (parseFloat(c.commissionAmount) || 0), 0);

    // Get monthly KPIs from KPI table
    const kpiQueryBuilder = this.kpiRepo
      .createQueryBuilder('k')
      .where('k.org_unit_id = :orgUnitId', { orgUnitId: params.partnerId })
      .andWhere('k.day >= :start', { start: startDate })
      .andWhere('k.day <= :end', { end: endDate });

    if (params.lineOfBusiness) {
      kpiQueryBuilder.andWhere('k.line_of_business = :lob', { lob: params.lineOfBusiness });
    }

    const monthlyKpis = await kpiQueryBuilder.getMany();

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
      const claimsServiceUrl = process.env.CLAIMS_SERVICE_URL || 'http://localhost:18002';
      const url = `${claimsServiceUrl}/claims/count?agentId=${encodeURIComponent(agentId)}&partnerId=${encodeURIComponent(partnerId)}&status=pending`;
      const response = await this.fetchWithRetry<{ success: boolean; count: number }>(url);
      if (response.success && typeof response.count === 'number') {
        return response.count;
      }
      return 0;
    } catch (error) {
      this.logger.error('Error fetching pending claims from claims service', error as Error, { agentId, partnerId });
      return 0;
    }
  }

  async getAgentPolicies(params: {
    agentId: string;
    partnerId: string;
    organizationId?: string | null;
    status?: string;
    fromDate?: string;
    toDate?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: any[]; total: number }> {
    const qb = this.attrRepo.createQueryBuilder('a');

    qb.andWhere('a.agent_id = :agentId', { agentId: params.agentId });

    if (params.organizationId) {
      qb.andWhere('a.organization_id = :organizationId', { organizationId: params.organizationId });
    }

    if (params.status) {
      qb.andWhere('a.policy_status = :status', { status: params.status });
    }

    if (params.fromDate) {
      qb.andWhere('a.issued_at >= :fromDate', { fromDate: new Date(params.fromDate) });
    }

    if (params.toDate) {
      qb.andWhere('a.issued_at <= :toDate', { toDate: new Date(params.toDate) });
    }

    qb.orderBy('a.issued_at', 'DESC').limit(params.limit).offset(params.offset);

    const [rows, total] = await qb.getManyAndCount();

    // Transform to match contract format
    const transformedRows = rows.map(row => ({
      id: row.policyId,
      policyId: row.policyId,
      policyNumber: row.policyNumber || 'Unknown',
      status: row.policyStatus || 'UNKNOWN',
      premium: parseFloat(row.premiumAmount || '0') || 0,
      issueDate: row.issuedAt?.toISOString().split('T')[0] || '',
      commissionRate: parseFloat(row.commissionRate || '0') || 0,
      commissionAmount: parseFloat(row.commissionAmount || '0') || 0,
      lineOfBusiness: row.lineOfBusiness || null,
    }));

    return { rows: transformedRows, total };
  }

  async getAgentClaims(params: {
    agentId: string;
    partnerId: string;
    organizationId?: string | null;
    status?: string;
    fromDate?: string;
    toDate?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: any[]; total: number }> {
    try {
      const claimsServiceUrl = process.env.CLAIMS_SERVICE_URL || 'http://localhost:18002';
      let url = `${claimsServiceUrl}/claims?agentId=${params.agentId}&limit=${params.limit}&offset=${params.offset}`;
      if (params.organizationId) url += `&organizationId=${encodeURIComponent(params.organizationId)}`;
      
      if (params.status) url += `&status=${params.status}`;
      if (params.fromDate) url += `&fromDate=${params.fromDate}`;
      if (params.toDate) url += `&toDate=${params.toDate}`;

      const response = await this.fetchWithRetry<{ success: boolean; data: any[]; total: number }>(url);
      
      if (response.success) {
        return { rows: response.data, total: response.total };
      }
      
      // Fallback: get claims from policy attributions
      const fallbackAttrWhere: any = { agentId: params.agentId };
      if (params.organizationId) fallbackAttrWhere.organizationId = params.organizationId;
      const attributions = await this.attrRepo.find({ where: fallbackAttrWhere });
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
    organizationId?: string | null;
    limit: number;
    offset: number;
  }): Promise<{ rows: any[]; total: number }> {
    try {
      const partyServiceUrl = process.env.PARTY_KYC_SERVICE_URL || 'http://localhost:18006';
      const claimsServiceUrl = process.env.CLAIMS_SERVICE_URL || 'http://localhost:18002';
      const policyServiceUrl = process.env.POLICY_SERVICE_URL || 'http://localhost:18007';

      const attrWhere: any = { agentId: params.agentId };
      if (params.organizationId) attrWhere.organizationId = params.organizationId;
      const attributions = await this.attrRepo.find({ where: attrWhere });
      if (attributions.length === 0) {
        return { rows: [], total: 0 };
      }

      const policyIds = attributions.map(a => a.policyId);

      const policyMap = new Map<string, { customerId: string; customerName: string; customerNationalId: string; customerPhone: string; customerEmail: string }>();
      try {
        const policyUrl = `${policyServiceUrl}/api/v1/policies?policyIds=${policyIds.slice(0, 100).join(',')}&limit=100`;
        const policyResponse = await this.fetchWithRetry<{ success: boolean; data: any[] }>(policyUrl);
        if (policyResponse.success && Array.isArray(policyResponse.data)) {
          for (const p of policyResponse.data) {
            policyMap.set(p.policyId || p.id, {
              customerId: p.customerId || p.insuredId || '',
              customerName: p.customerName || p.insuredName || '',
              customerNationalId: p.customerNationalId || p.insuredNationalId || '',
              customerPhone: p.customerPhone || p.insuredPhone || '',
              customerEmail: p.customerEmail || p.insuredEmail || '',
            });
          }
        }
      } catch (error) {
        this.logger.warn('Failed to get policy data from policy service', { agentId: params.agentId });
      }

      const customerMap = new Map<string, { name: string; nationalId: string; phone: string; email: string; policiesCount: number; totalPremium: number }>();
      for (const attr of attributions) {
        const policyData = policyMap.get(attr.policyId);
        const customerId = policyData?.customerId || '';
        if (!customerId) continue;

        const existing = customerMap.get(customerId) || { name: '', nationalId: '', phone: '', email: '', policiesCount: 0, totalPremium: 0 };
        existing.policiesCount += 1;
        existing.totalPremium += parseFloat(attr.premiumAmount || '0') || 0;
        if (!existing.name) existing.name = policyData.customerName;
        if (!existing.nationalId) existing.nationalId = policyData.customerNationalId;
        if (!existing.phone) existing.phone = policyData.customerPhone;
        if (!existing.email) existing.email = policyData.customerEmail;
        customerMap.set(customerId, existing);
      }

      let customerEntries = Array.from(customerMap.entries());
      const total = customerEntries.length;
      customerEntries = customerEntries.slice(params.offset, params.offset + params.limit);

      const rows = await Promise.all(customerEntries.map(async ([customerId, data]) => {
        let customerDetails: any = {};
        try {
          const partyUrl = `${partyServiceUrl}/party?nationalId=${encodeURIComponent(data.nationalId)}&limit=1`;
          const partyResponse = await this.fetchWithRetry<{ success: boolean; data: any[] }>(partyUrl);
          if (partyResponse.success && partyResponse.data.length > 0) {
            customerDetails = partyResponse.data[0];
          }
        } catch (error) {
          this.logger.warn('Failed to get customer details from party service', { customerId });
        }

        let claimsCount = 0;
        try {
          const claimsUrl = `${claimsServiceUrl}/claims?customerId=${encodeURIComponent(customerId)}&limit=1`;
          const claimsResponse = await this.fetchWithRetry<{ success: boolean; total: number }>(claimsUrl);
          if (claimsResponse.success) {
            claimsCount = claimsResponse.total;
          }
        } catch (error) {
          this.logger.warn('Failed to get claims count for customer', { customerId });
        }

        return {
          id: customerId,
          nationalId: data.nationalId,
          name: customerDetails.fullName || data.name || 'Unknown',
          phone: customerDetails.mobile || data.phone || '',
          email: customerDetails.email || data.email || null,
          policiesCount: data.policiesCount,
          claimsCount,
          totalPremium: data.totalPremium,
        };
      }));

      return { rows, total };
    } catch (error) {
      this.logger.error('Failed to get agent customers', error as Error, { agentId: params.agentId });
      return { rows: [], total: 0 };
    }
  }

  async getAgentCommissions(params: {
    agentId: string;
    partnerId: string;
    organizationId?: string | null;
    status?: string;
    fromDate?: string;
    toDate?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: any[]; total: number }> {
    const qb = this.ledgerRepo.createQueryBuilder('l');

    qb.andWhere('l.agent_id = :agentId', { agentId: params.agentId });

    if (params.organizationId) {
      qb.andWhere('l.organization_id = :organizationId', { organizationId: params.organizationId });
    }

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
      ledgerEntryId: row.ledgerEntryId,
      policyId: row.policyId,
      policyNumber: row.policyNumber || 'Unknown',
      contractId: row.contractId || '',
      distributionAgreementId: row.distributionAgreementId || null,
      commissionRate: parseFloat(row.commissionRate) || 0,
      commissionAmount: parseFloat(row.commissionAmount) || 0,
      status: row.status as 'accrued' | 'paid' | 'settled' | 'clawback' | 'voided',
      dueDate: row.dueDate?.toISOString().split('T')[0] || '',
      paidDate: row.paidDate?.toISOString().split('T')[0] || undefined,
      clawbackAmount: row.clawbackAmount ? parseFloat(row.clawbackAmount) : null,
      settlementBatchId: row.settlementBatchId || null,
    }));

    return { rows: transformedRows, total };
  }

  async getAgentKpis(params: {
    agentId: string;
    partnerId: string;
    organizationId?: string | null;
    fromDate?: string;
    toDate?: string;
    granularity?: 'daily' | 'monthly';
  }): Promise<any[]> {
    const now = new Date();
    const fromDate = params.fromDate ? new Date(params.fromDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const toDate = params.toDate ? new Date(params.toDate) : now;

    const kpiQb = this.kpiRepo
      .createQueryBuilder('k')
      .where('k.org_unit_id = :orgUnitId', { orgUnitId: params.partnerId })
      .andWhere('k.day >= :start', { start: fromDate })
      .andWhere('k.day <= :end', { end: toDate });

    if (params.organizationId) {
      kpiQb.andWhere('k.organization_id = :organizationId', { organizationId: params.organizationId });
    }

    const kpis = await kpiQb
      .orderBy('k.day', 'ASC')
      .getMany();

    return kpis.map(k => ({
      date: k.day,
      issuanceCount: k.policiesIssuedCount || 0,
      issuancePremium: parseFloat(k.premiumIssuedAmount) || 0,
      claimsCount: k.claimsCreatedCount || 0,
      claimsAmount: parseFloat(k.claimsAmount || '0') || 0,
      commissionEarned: parseFloat(k.commissionAccruedAmount) || 0,
      commissionClawback: parseFloat(k.commissionClawbackAmount || '0') || 0,
      persistencyRateBps: k.persistencyRateBps ?? null,
      retentionRateBps: k.retentionRateBps ?? null,
      lossRatioBps: k.lossRatioBps ?? null,
      newCustomers: k.newCustomersCount || 0,
    }));
  }

  async listSubAgents(params: {
    brokerPartnerId: string;
    status?: SalesPartnerStatus;
    limit: number;
    offset: number;
  }): Promise<{ rows: SalesPartner[]; total: number }> {
    const qb = this.partnersRepo.createQueryBuilder('p');
    qb.where('p.parent_partner_id = :brokerPartnerId', { brokerPartnerId: params.brokerPartnerId });
    if (params.status) qb.andWhere('p.status = :status', { status: params.status });
    qb.orderBy('p.updated_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async createSubAgent(params: {
    brokerPartnerId: string;
    orgUnitId: string;
    displayName: string;
    organizationId?: string | null;
    legalNationalId?: string | null;
    licenseCode?: string | null;
    contactMobile?: string | null;
    contactEmail?: string | null;
    bankIban?: string | null;
    metadata?: Record<string, any> | null;
    actorUserId?: string | null;
    correlationId?: string;
  }): Promise<SalesPartner> {
    return await this.dataSource.transaction(async (manager) => {
      const broker = await manager.findOne(SalesPartner, { where: { partnerId: params.brokerPartnerId } });
      if (!broker) {
        const err: any = new Error('Broker partner not found');
        err.code = 'BROKER_NOT_FOUND';
        throw err;
      }

      const subAgent = manager.create(SalesPartner, {
        partnerId: uuidv4(),
        orgUnitId: params.orgUnitId,
        kind: 'agent',
        status: 'pending',
        displayName: params.displayName,
        organizationId: params.organizationId ?? broker.organizationId ?? null,
        parentPartnerId: params.brokerPartnerId,
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
      await manager.save(subAgent);

      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.sales.sub_agent.created',
        eventType: 'SubAgentCreated',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { partnerId: subAgent.partnerId, brokerPartnerId: params.brokerPartnerId },
        payload: {
          partnerId: subAgent.partnerId,
          brokerPartnerId: params.brokerPartnerId,
          orgUnitId: subAgent.orgUnitId,
          organizationId: subAgent.organizationId,
          displayName: subAgent.displayName,
          status: subAgent.status,
        },
      });

      return subAgent;
    });
  }

  async suspendSubAgent(params: {
    brokerPartnerId: string;
    subAgentPartnerId: string;
    actorUserId?: string | null;
    correlationId?: string;
  }): Promise<SalesPartner | null> {
    return await this.dataSource.transaction(async (manager) => {
      const subAgent = await manager.findOne(SalesPartner, { where: { partnerId: params.subAgentPartnerId } });
      if (!subAgent || subAgent.parentPartnerId !== params.brokerPartnerId) return null;
      subAgent.status = 'suspended';
      subAgent.updatedAt = new Date();
      await manager.save(subAgent);

      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.sales.sub_agent.suspended',
        eventType: 'SubAgentSuspended',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { partnerId: subAgent.partnerId, brokerPartnerId: params.brokerPartnerId },
        payload: {
          partnerId: subAgent.partnerId,
          brokerPartnerId: params.brokerPartnerId,
          orgUnitId: subAgent.orgUnitId,
          organizationId: subAgent.organizationId,
          status: subAgent.status,
        },
      });

      return subAgent;
    });
  }

  async terminateSubAgent(params: {
    brokerPartnerId: string;
    subAgentPartnerId: string;
    actorUserId?: string | null;
    correlationId?: string;
  }): Promise<SalesPartner | null> {
    return await this.dataSource.transaction(async (manager) => {
      const subAgent = await manager.findOne(SalesPartner, { where: { partnerId: params.subAgentPartnerId } });
      if (!subAgent || subAgent.parentPartnerId !== params.brokerPartnerId) return null;
      subAgent.status = 'terminated';
      subAgent.updatedAt = new Date();
      await manager.save(subAgent);

      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.sales.sub_agent.terminated',
        eventType: 'SubAgentTerminated',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { partnerId: subAgent.partnerId, brokerPartnerId: params.brokerPartnerId },
        payload: {
          partnerId: subAgent.partnerId,
          brokerPartnerId: params.brokerPartnerId,
          orgUnitId: subAgent.orgUnitId,
          organizationId: subAgent.organizationId,
          status: subAgent.status,
        },
      });

      return subAgent;
    });
  }

  async getBrokerDashboard(params: {
    brokerPartnerId: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<{
    broker: { partnerId: string; displayName: string; organizationId: string | null };
    subAgentsCount: number;
    activeSubAgentsCount: number;
    suspendedSubAgentsCount: number;
    aggregatedKpis: {
      totalPoliciesIssued: number;
      totalPoliciesRenewed: number;
      totalPoliciesCancelled: number;
      totalPremiumIssued: number;
      totalPremiumRenewed: number;
      totalCommissionAccrued: number;
      totalCommissionClawback: number;
      persistencyRateBps: number | null;
      retentionRateBps: number | null;
      lossRatioBps: number | null;
      avgPremiumPerPolicy: number | null;
    };
    subAgentKpis: Array<{
      partnerId: string;
      displayName: string;
      status: string;
      policiesIssued: number;
      premiumIssued: number;
      commissionAccrued: number;
    }>;
  }> {
    const broker = await this.partnersRepo.findOne({ where: { partnerId: params.brokerPartnerId } });
    if (!broker) {
      const err: any = new Error('Broker not found');
      err.code = 'BROKER_NOT_FOUND';
      throw err;
    }

    const now = new Date();
    const fromDate = params.fromDate ? new Date(params.fromDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const toDate = params.toDate ? new Date(params.toDate) : now;

    const subAgents = await this.partnersRepo.find({ where: { parentPartnerId: params.brokerPartnerId } });
    const subAgentOrgUnitIds = subAgents.map(s => s.orgUnitId);

    let kpis: SalesKpiDaily[] = [];
    if (subAgentOrgUnitIds.length > 0) {
      kpis = await this.kpiRepo
        .createQueryBuilder('k')
        .where('k.org_unit_id IN (:...orgUnitIds)', { orgUnitIds: subAgentOrgUnitIds })
        .andWhere('k.day >= :start', { start: fromDate })
        .andWhere('k.day <= :end', { end: toDate })
        .getMany();
    }

    const aggregated = {
      totalPoliciesIssued: kpis.reduce((sum, k) => sum + (k.policiesIssuedCount || 0), 0),
      totalPoliciesRenewed: kpis.reduce((sum, k) => sum + (k.policiesRenewedCount || 0), 0),
      totalPoliciesCancelled: kpis.reduce((sum, k) => sum + (k.policiesCancelledCount || 0), 0),
      totalPremiumIssued: kpis.reduce((sum, k) => sum + (parseFloat(k.premiumIssuedAmount) || 0), 0),
      totalPremiumRenewed: kpis.reduce((sum, k) => sum + (parseFloat(k.premiumRenewedAmount) || 0), 0),
      totalCommissionAccrued: kpis.reduce((sum, k) => sum + (parseFloat(k.commissionAccruedAmount) || 0), 0),
      totalCommissionClawback: kpis.reduce((sum, k) => sum + (parseFloat(k.commissionClawbackAmount) || 0), 0),
      persistencyRateBps: null as number | null,
      retentionRateBps: null as number | null,
      lossRatioBps: null as number | null,
      avgPremiumPerPolicy: null as number | null,
    };

    const totalActive = aggregated.totalPoliciesIssued - aggregated.totalPoliciesCancelled;
    if (aggregated.totalPoliciesIssued > 0) {
      aggregated.persistencyRateBps = Math.round((totalActive / aggregated.totalPoliciesIssued) * 10000);
    }
    if (aggregated.totalPoliciesIssued > 0) {
      aggregated.retentionRateBps = aggregated.totalPoliciesRenewed > 0
        ? Math.round((aggregated.totalPoliciesRenewed / aggregated.totalPoliciesIssued) * 10000)
        : null;
    }
    const totalClaimsAmount = kpis.reduce((sum, k) => sum + (parseFloat(k.claimsAmount) || 0), 0);
    if (aggregated.totalPremiumIssued > 0) {
      aggregated.lossRatioBps = Math.round((totalClaimsAmount / aggregated.totalPremiumIssued) * 10000);
    }
    if (aggregated.totalPoliciesIssued > 0) {
      aggregated.avgPremiumPerPolicy = aggregated.totalPremiumIssued / aggregated.totalPoliciesIssued;
    }

    const subAgentKpiMap = new Map<string, { policiesIssued: number; premiumIssued: number; commissionAccrued: number }>();
    for (const kpi of kpis) {
      const existing = subAgentKpiMap.get(kpi.orgUnitId) || { policiesIssued: 0, premiumIssued: 0, commissionAccrued: 0 };
      existing.policiesIssued += kpi.policiesIssuedCount || 0;
      existing.premiumIssued += parseFloat(kpi.premiumIssuedAmount) || 0;
      existing.commissionAccrued += parseFloat(kpi.commissionAccruedAmount) || 0;
      subAgentKpiMap.set(kpi.orgUnitId, existing);
    }

    const subAgentKpis = subAgents.map(sa => {
      const k = subAgentKpiMap.get(sa.orgUnitId) || { policiesIssued: 0, premiumIssued: 0, commissionAccrued: 0 };
      return {
        partnerId: sa.partnerId,
        displayName: sa.displayName,
        status: sa.status,
        policiesIssued: k.policiesIssued,
        premiumIssued: k.premiumIssued,
        commissionAccrued: k.commissionAccrued,
      };
    });

    return {
      broker: {
        partnerId: broker.partnerId,
        displayName: broker.displayName,
        organizationId: broker.organizationId,
      },
      subAgentsCount: subAgents.length,
      activeSubAgentsCount: subAgents.filter(s => s.status === 'active' || s.status === 'verified').length,
      suspendedSubAgentsCount: subAgents.filter(s => s.status === 'suspended').length,
      aggregatedKpis: aggregated,
      subAgentKpis,
    };
  }

  async getLedgerReconciliation(params: {
    orgUnitId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<{
    ledgerTotalAccrued: number;
    ledgerTotalPaid: number;
    ledgerTotalClawback: number;
    billingSettlementTotal: number | null;
    difference: number | null;
    entries: Array<{ ledgerEntryId: string; policyId: string; commissionAmount: number; status: string; settlementBatchId: string | null }>;
  }> {
    const qb = this.ledgerRepo.createQueryBuilder('l');
    if (params.orgUnitId) qb.andWhere('l.org_unit_id = :orgUnitId', { orgUnitId: params.orgUnitId });
    if (params.fromDate) qb.andWhere('l.created_at >= :fromDate', { fromDate: new Date(params.fromDate) });
    if (params.toDate) qb.andWhere('l.created_at <= :toDate', { toDate: new Date(params.toDate) });
    qb.orderBy('l.created_at', 'DESC');
    const entries = await qb.getMany();

    const ledgerTotalAccrued = entries
      .filter(e => e.status === 'accrued')
      .reduce((sum, e) => sum + (parseFloat(e.commissionAmount) || 0), 0);
    const ledgerTotalPaid = entries
      .filter(e => e.status === 'paid' || e.status === 'settled')
      .reduce((sum, e) => sum + (parseFloat(e.commissionAmount) || 0), 0);
    const ledgerTotalClawback = entries
      .filter(e => e.status === 'clawback')
      .reduce((sum, e) => sum + (parseFloat(e.clawbackAmount || '0') || 0), 0);

    let billingSettlementTotal: number | null = null;
    try {
      const billingUrl = process.env.BILLING_SERVICE_URL || 'http://localhost:18010';
      const url = `${billingUrl}/api/v1/brokerage/settlements/total?orgUnitId=${encodeURIComponent(params.orgUnitId || '')}`;
      const response = await this.fetchWithRetry<{ success: boolean; total: number }>(url);
      if (response.success && typeof response.total === 'number') {
        billingSettlementTotal = response.total;
      }
    } catch (error) {
      this.logger.error('Failed to fetch settlement total from billing service', error as Error, { orgUnitId: params.orgUnitId });
    }

    const difference = billingSettlementTotal !== null ? ledgerTotalPaid - billingSettlementTotal : null;

    return {
      ledgerTotalAccrued,
      ledgerTotalPaid,
      ledgerTotalClawback,
      billingSettlementTotal,
      difference,
      entries: entries.map(e => ({
        ledgerEntryId: e.ledgerEntryId,
        policyId: e.policyId,
        commissionAmount: parseFloat(e.commissionAmount) || 0,
        status: e.status,
        settlementBatchId: e.settlementBatchId,
      })),
    };
  }

  async syncPartnerSuspensionWithAuth(params: {
    orgUnitId: string;
    status: SalesPartnerStatus;
    correlationId?: string;
  }): Promise<void> {
    if (params.status !== 'suspended' && params.status !== 'terminated') return;

    try {
      const authUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:18004';
      const url = `${authUrl}/api/v1/admin/organizations/${encodeURIComponent(params.orgUnitId)}/suspend`;
      await this.fetchWithRetry<{ success: boolean }>(url, {
        method: 'POST',
        body: JSON.stringify({ reason: `Partner ${params.status}`, correlationId: params.correlationId }),
      });
      this.logger.info('Partner suspension synced with auth-service', { orgUnitId: params.orgUnitId, status: params.status });
    } catch (error) {
      this.logger.error('Failed to sync partner suspension with auth-service', error as Error, { orgUnitId: params.orgUnitId });
    }
  }

  // ========== Lead Management ==========

  async createLead(params: {
    tenantId: string;
    partnerId: string;
    agentId?: string;
    organizationId?: string;
    customerName: string;
    phone: string;
    email?: string;
    productInterest: string;
    priority?: LeadPriority;
    notes?: string;
    correlationId?: string;
  }): Promise<Lead> {
    const lead = this.leadRepo.create({
      tenantId: params.tenantId,
      partnerId: params.partnerId,
      agentId: params.agentId || null,
      organizationId: params.organizationId || null,
      customerName: params.customerName,
      phone: params.phone,
      email: params.email || null,
      productInterest: params.productInterest,
      status: 'new',
      priority: params.priority || 'medium',
      notes: params.notes || null,
      assignedTo: null,
      convertedSubmissionId: null,
    });
    return await this.leadRepo.save(lead);
  }

  async listLeads(params: {
    agentId?: string;
    partnerId?: string;
    tenantId?: string;
    status?: LeadStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ rows: Lead[]; total: number }> {
    const where: any = {};
    if (params.agentId) where.agentId = params.agentId;
    if (params.partnerId) where.partnerId = params.partnerId;
    if (params.tenantId) where.tenantId = params.tenantId;
    if (params.status) where.status = params.status;

    const limit = Math.min(params.limit || 50, 200);
    const offset = params.offset || 0;

    const [rows, total] = await this.leadRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { rows, total };
  }

  async updateLead(params: {
    leadId: string;
    tenantId: string;
    customerName?: string;
    phone?: string;
    email?: string;
    productInterest?: string;
    status?: LeadStatus;
    priority?: LeadPriority;
    notes?: string;
  }): Promise<Lead | null> {
    const lead = await this.leadRepo.findOne({ where: { leadId: params.leadId, tenantId: params.tenantId } });
    if (!lead) return null;

    if (params.customerName !== undefined) lead.customerName = params.customerName;
    if (params.phone !== undefined) lead.phone = params.phone;
    if (params.email !== undefined) lead.email = params.email;
    if (params.productInterest !== undefined) lead.productInterest = params.productInterest;
    if (params.status !== undefined) lead.status = params.status;
    if (params.priority !== undefined) lead.priority = params.priority;
    if (params.notes !== undefined) lead.notes = params.notes;

    return await this.leadRepo.save(lead);
  }

  async assignLead(params: {
    leadId: string;
    tenantId: string;
    assignedTo: string;
  }): Promise<Lead | null> {
    const lead = await this.leadRepo.findOne({ where: { leadId: params.leadId, tenantId: params.tenantId } });
    if (!lead) return null;

    lead.assignedTo = params.assignedTo;
    if (lead.status === 'new') lead.status = 'contacted';

    return await this.leadRepo.save(lead);
  }

  async convertLead(params: {
    leadId: string;
    tenantId: string;
    submissionId: string;
  }): Promise<Lead | null> {
    const lead = await this.leadRepo.findOne({ where: { leadId: params.leadId, tenantId: params.tenantId } });
    if (!lead) return null;

    lead.convertedSubmissionId = params.submissionId;
    lead.status = 'converted';

    return await this.leadRepo.save(lead);
  }
}
