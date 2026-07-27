import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { RmPolicyLifecycle } from './entities/RmPolicyLifecycle';
import { RmClaimPayment } from './entities/RmClaimPayment';
import { RmFraudSignal } from './entities/RmFraudSignal';
import { RmRiCeded } from './entities/RmRiCeded';
import { RmRiBorderaux } from './entities/RmRiBorderaux';
import { RmRiRecovery } from './entities/RmRiRecovery';
import { RmClaimDocumentsAttached } from './entities/RmClaimDocumentsAttached';
import { RmFraudCaseEscalation } from './entities/RmFraudCaseEscalation';
import { RmComplaintSlaBreach } from './entities/RmComplaintSlaBreach';
import { KpiSnapshot } from './entities/KpiSnapshot';
import { KpiIngestionAudit } from './entities/KpiIngestionAudit';
import { KpiGovernancePolicy } from './entities/KpiGovernancePolicy';
import { RmPolicy } from './entities/RmPolicy';
import { RmPayment } from './entities/RmPayment';
import { RmSalesNetwork } from './entities/RmSalesNetwork';
import { RmAml } from './entities/RmAml';
import { RmUnderwriting } from './entities/RmUnderwriting';
import { ExternalSystemConnection } from './entities/ExternalSystemConnection';

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(
    @InjectRepository(RmPolicyLifecycle) private readonly rmPolicyRepo: Repository<RmPolicyLifecycle>,
    @InjectRepository(RmClaimPayment) private readonly rmClaimPaymentRepo: Repository<RmClaimPayment>,
    @InjectRepository(RmFraudSignal) private readonly rmFraudRepo: Repository<RmFraudSignal>,
    @InjectRepository(RmRiCeded) private readonly rmRiCededRepo: Repository<RmRiCeded>,
    @InjectRepository(RmRiBorderaux) private readonly rmRiBorderauxRepo: Repository<RmRiBorderaux>,
    @InjectRepository(RmRiRecovery) private readonly rmRiRecoveryRepo: Repository<RmRiRecovery>,
    @InjectRepository(RmClaimDocumentsAttached) private readonly rmClaimDocsRepo: Repository<RmClaimDocumentsAttached>,
    @InjectRepository(RmFraudCaseEscalation) private readonly rmFraudEscRepo: Repository<RmFraudCaseEscalation>,
    @InjectRepository(RmComplaintSlaBreach) private readonly rmComplaintSlaRepo: Repository<RmComplaintSlaBreach>,
    @InjectRepository(KpiSnapshot) private readonly snapshotRepo: Repository<KpiSnapshot>,
    @InjectRepository(KpiIngestionAudit) private readonly ingestionAuditRepo: Repository<KpiIngestionAudit>,
    @InjectRepository(KpiGovernancePolicy) private readonly governanceRepo: Repository<KpiGovernancePolicy>,
    @InjectRepository(RmPolicy) private readonly policyRepo: Repository<RmPolicy>,
    @InjectRepository(RmPayment) private readonly paymentRepo: Repository<RmPayment>,
    @InjectRepository(RmSalesNetwork) private readonly salesNetworkRepo: Repository<RmSalesNetwork>,
    @InjectRepository(RmAml) private readonly amlRepo: Repository<RmAml>,
    @InjectRepository(RmUnderwriting) private readonly underwritingRepo: Repository<RmUnderwriting>,
    @InjectRepository(ExternalSystemConnection) private readonly externalSystemRepo: Repository<ExternalSystemConnection>
  ) {}

  async listClaimDocumentsAttached(params: {
    claimId?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: RmClaimDocumentsAttached[]; total: number }> {
    const qb = this.rmClaimDocsRepo.createQueryBuilder('d');
    if (params.claimId) qb.andWhere('d.claim_id = :claimId', { claimId: params.claimId });
    qb.orderBy('d.updated_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async listClaimPayments(params: {
    claimId?: string;
    policyId?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: RmClaimPayment[]; total: number }> {
    const qb = this.rmClaimPaymentRepo.createQueryBuilder('c');
    if (params.claimId) qb.andWhere('c.claim_id = :claimId', { claimId: params.claimId });
    if (params.policyId) qb.andWhere('c.policy_id = :policyId', { policyId: params.policyId });
    qb.orderBy('c.updated_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async listFraudCaseEscalations(params: {
    claimId?: string;
    fraudCaseId?: string;
    toUnit?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: RmFraudCaseEscalation[]; total: number }> {
    const qb = this.rmFraudEscRepo.createQueryBuilder('e');
    if (params.claimId) qb.andWhere('e.claim_id = :claimId', { claimId: params.claimId });
    if (params.fraudCaseId) qb.andWhere('e.fraud_case_id = :fraudCaseId', { fraudCaseId: params.fraudCaseId });
    if (params.toUnit) qb.andWhere('e.to_unit = :toUnit', { toUnit: params.toUnit });
    qb.orderBy('e.occurred_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async listComplaintSlaBreaches(params: {
    complaintId?: string;
    claimId?: string;
    policyId?: string;
    status?: string;
    assignedTo?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: RmComplaintSlaBreach[]; total: number }> {
    const qb = this.rmComplaintSlaRepo.createQueryBuilder('b');
    if (params.complaintId) qb.andWhere('b.complaint_id = :complaintId', { complaintId: params.complaintId });
    if (params.claimId) qb.andWhere('b.claim_id = :claimId', { claimId: params.claimId });
    if (params.policyId) qb.andWhere('b.policy_id = :policyId', { policyId: params.policyId });
    if (params.status) qb.andWhere('b.status = :status', { status: params.status });
    if (params.assignedTo) qb.andWhere('b.assigned_to = :assignedTo', { assignedTo: params.assignedTo });
    qb.orderBy('b.occurred_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async listRiCeded(params: {
    contractId?: string;
    policyId?: string;
    claimId?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: RmRiCeded[]; total: number }> {
    const qb = this.rmRiCededRepo.createQueryBuilder('r');
    if (params.contractId) qb.andWhere('r.contract_id = :contractId', { contractId: params.contractId });
    if (params.policyId) qb.andWhere('r.policy_id = :policyId', { policyId: params.policyId });
    if (params.claimId) qb.andWhere('r.claim_id = :claimId', { claimId: params.claimId });
    qb.orderBy('r.updated_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async listRiBorderaux(params: {
    contractId?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: RmRiBorderaux[]; total: number }> {
    const qb = this.rmRiBorderauxRepo.createQueryBuilder('b');
    if (params.contractId) qb.andWhere('b.contract_id = :contractId', { contractId: params.contractId });
    qb.orderBy('b.updated_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async listRiRecoveries(params: {
    contractId?: string;
    claimId?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: RmRiRecovery[]; total: number }> {
    const qb = this.rmRiRecoveryRepo.createQueryBuilder('x');
    if (params.contractId) qb.andWhere('x.contract_id = :contractId', { contractId: params.contractId });
    if (params.claimId) qb.andWhere('x.claim_id = :claimId', { claimId: params.claimId });
    qb.orderBy('x.updated_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async listGovernancePolicies(): Promise<KpiGovernancePolicy[]> {
    return await this.governanceRepo.find({ order: { kpiKey: 'ASC' } as any });
  }

  async getGovernancePolicy(kpiKey: string): Promise<KpiGovernancePolicy | null> {
    const key = String(kpiKey || '').trim();
    if (!key) return null;
    return await this.governanceRepo.findOne({ where: { kpiKey: key } as any });
  }

  async upsertGovernancePolicy(params: {
    kpiKey: string;
    allowedPeriodGranularities: string[];
    allowedSourceSystems: string[];
    expectedUnit: string | null;
    minValue: number | null;
    maxValue: number | null;
    enforced: boolean;
  }): Promise<KpiGovernancePolicy> {
    const existing = await this.governanceRepo.findOne({ where: { kpiKey: params.kpiKey } as any });
    if (existing) {
      existing.allowedPeriodGranularities = params.allowedPeriodGranularities;
      existing.allowedSourceSystems = params.allowedSourceSystems;
      existing.expectedUnit = params.expectedUnit;
      existing.minValue = params.minValue;
      existing.maxValue = params.maxValue;
      existing.enforced = params.enforced;
      return await this.governanceRepo.save(existing);
    }

    const rec = this.governanceRepo.create({
      kpiKey: params.kpiKey,
      allowedPeriodGranularities: params.allowedPeriodGranularities,
      allowedSourceSystems: params.allowedSourceSystems,
      expectedUnit: params.expectedUnit,
      minValue: params.minValue,
      maxValue: params.maxValue,
      enforced: params.enforced,
    });
    return await this.governanceRepo.save(rec);
  }

  async getReadyKpis(params: { now: Date }): Promise<{
    issuanceSpeed: { totalIssued: number; avgMinutesQuoteToIssue: number | null };
    claimPayoutTime: { totalPaid: number; avgMinutesRegisterToPaid: number | null };
    fraudIdentifiedRate: { totalScores: number; holdCount: number; holdRate: number };
  }> {
    const policies = await this.rmPolicyRepo
      .createQueryBuilder('p')
      .where('p.quoted_at IS NOT NULL')
      .andWhere('p.issued_at IS NOT NULL')
      .getMany();

    const durationsPolicyMin = policies
      .map((p) => {
        if (!p.quotedAt || !p.issuedAt) return null;
        return (p.issuedAt.getTime() - p.quotedAt.getTime()) / 60000;
      })
      .filter((x): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0);

    const avgMinutesQuoteToIssue = durationsPolicyMin.length
      ? durationsPolicyMin.reduce((a, b) => a + b, 0) / durationsPolicyMin.length
      : null;

    const paidClaims = await this.rmClaimPaymentRepo
      .createQueryBuilder('c')
      .where('c.registered_at IS NOT NULL')
      .andWhere('c.claim_paid_at IS NOT NULL')
      .getMany();

    const durationsClaimMin = paidClaims
      .map((c) => {
        if (!c.registeredAt || !c.claimPaidAt) return null;
        return (c.claimPaidAt.getTime() - c.registeredAt.getTime()) / 60000;
      })
      .filter((x): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0);

    const avgMinutesRegisterToPaid = durationsClaimMin.length
      ? durationsClaimMin.reduce((a, b) => a + b, 0) / durationsClaimMin.length
      : null;

    const scores = await this.rmFraudRepo
      .createQueryBuilder('f')
      .where('f.score_computed_at IS NOT NULL')
      .getMany();

    const totalScores = scores.length;
    const holdCount = scores.filter((s) => s.holdClaim === true).length;
    const holdRate = totalScores > 0 ? holdCount / totalScores : 0;

    return {
      issuanceSpeed: {
        totalIssued: policies.length,
        avgMinutesQuoteToIssue,
      },
      claimPayoutTime: {
        totalPaid: paidClaims.length,
        avgMinutesRegisterToPaid,
      },
      fraudIdentifiedRate: {
        totalScores,
        holdCount,
        holdRate,
      },
    };
  }

  async ingestKpiSnapshot(params: {
    idempotencyKey: string;
    correlationId: string;
    tenantId?: string;
    actorUserId?: string;
    kpiKey: string;
    periodStart: Date;
    periodEnd: Date;
    value: number;
    unit?: string | null;
    sourceSystem?: string | null;
    periodGranularity?: string | null;
    officialSourceSystem?: string | null;
    metadata?: Record<string, any> | null;
  }): Promise<KpiSnapshot> {
    const existingAudit = await this.ingestionAuditRepo.findOne({ where: { idempotencyKey: params.idempotencyKey } });
    if (existingAudit) {
      const existingSnapshot = await this.snapshotRepo.findOne({
        where: {
          kpiKey: existingAudit.kpiKey,
          periodStart: existingAudit.periodStart,
          periodEnd: existingAudit.periodEnd,
        } as any,
      });
      if (existingSnapshot) return existingSnapshot;
    }

    await this.ingestionAuditRepo.save(
      this.ingestionAuditRepo.create({
        idempotencyKey: params.idempotencyKey,
        correlationId: params.correlationId,
        tenantId: params.tenantId || null,
        actorUserId: params.actorUserId || null,
        kpiKey: params.kpiKey,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        value: params.value,
        unit: params.unit ?? null,
        sourceSystem: params.sourceSystem ?? null,
        periodGranularity: params.periodGranularity ?? null,
        officialSourceSystem: params.officialSourceSystem ?? null,
        payload: {
          kpiKey: params.kpiKey,
          periodStart: params.periodStart,
          periodEnd: params.periodEnd,
          value: params.value,
          unit: params.unit ?? null,
          sourceSystem: params.sourceSystem ?? null,
          periodGranularity: params.periodGranularity ?? null,
          officialSourceSystem: params.officialSourceSystem ?? null,
          metadata: params.metadata ?? null,
        },
      })
    );

    const existing = await this.snapshotRepo.findOne({
      where: { kpiKey: params.kpiKey, periodStart: params.periodStart, periodEnd: params.periodEnd } as any,
    });

    if (existing) {
      existing.value = params.value;
      existing.unit = params.unit ?? existing.unit;
      existing.sourceSystem = params.sourceSystem ?? existing.sourceSystem;
      existing.periodGranularity = params.periodGranularity ?? existing.periodGranularity;
      existing.officialSourceSystem = params.officialSourceSystem ?? existing.officialSourceSystem;
      existing.metadata = params.metadata ?? existing.metadata;
      return await this.snapshotRepo.save(existing);
    }

    const rec = this.snapshotRepo.create({
      kpiKey: params.kpiKey,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      value: params.value,
      unit: params.unit ?? null,
      sourceSystem: params.sourceSystem ?? null,
      periodGranularity: params.periodGranularity ?? null,
      officialSourceSystem: params.officialSourceSystem ?? null,
      metadata: params.metadata ?? null,
    });

    return await this.snapshotRepo.save(rec);
  }

  async listKpiSnapshots(params: {
    kpiKey?: string;
    periodStart?: Date;
    periodEnd?: Date;
    limit: number;
    offset: number;
  }): Promise<{ rows: KpiSnapshot[]; total: number }> {
    const qb = this.snapshotRepo.createQueryBuilder('s');
    if (params.kpiKey) qb.andWhere('s.kpi_key = :kpiKey', { kpiKey: params.kpiKey });
    if (params.periodStart) qb.andWhere('s.period_start >= :ps', { ps: params.periodStart.toISOString() });
    if (params.periodEnd) qb.andWhere('s.period_end <= :pe', { pe: params.periodEnd.toISOString() });

    qb.orderBy('s.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  // Executive BI Dashboard
  async getExecutiveDashboard(): Promise<{
    policyMetrics: { totalIssued: number; totalRenewed: number; totalCancelled: number; avgQuoteToIssueMinutes: number | null };
    claimMetrics: { totalRegistered: number; totalPaid: number; totalRejected: number; avgPayoutMinutes: number | null; totalPayoutAmount: number };
    fraudMetrics: { totalScored: number; holdRate: number; totalEscalations: number };
    reinsuranceMetrics: { totalCeded: number; totalRecoveries: number; totalBorderaux: number };
    complaintMetrics: { totalComplaints: number; slaBreachRate: number; avgResolutionHours: number | null };
    kpiSummary: Array<{ kpiKey: string; latestValue: number; unit: string | null; trend: 'up' | 'down' | 'stable' }>;
  }> {
    const policies = await this.policyRepo.createQueryBuilder('p').getMany();
    const issuedPolicies = policies.filter(p => p.issuedAt !== null);
    const renewedPolicies = policies.filter(p => p.renewedAt !== null);
    const cancelledPolicies = policies.filter(p => p.cancelledAt !== null);

    const quoteToIssueDurations = issuedPolicies
      .map(p => p.quotedAt && p.issuedAt ? (p.issuedAt.getTime() - p.quotedAt.getTime()) / 60000 : null)
      .filter((x): x is number => x !== null && Number.isFinite(x) && x >= 0);
    const avgQuoteToIssueMinutes = quoteToIssueDurations.length
      ? Math.round(quoteToIssueDurations.reduce((a, b) => a + b, 0) / quoteToIssueDurations.length * 100) / 100
      : null;

    const claims = await this.rmClaimPaymentRepo.createQueryBuilder('c').getMany();
    const totalRegistered = claims.length;
    const paidClaims = claims.filter(c => c.claimPaidAt !== null);
    const totalPayoutAmount = paidClaims.reduce((sum, c) => sum + (c.approvedAmount ? Number(c.approvedAmount) : 0), 0);

    const payoutDurations = paidClaims
      .map(c => c.registeredAt && c.claimPaidAt ? (c.claimPaidAt.getTime() - c.registeredAt.getTime()) / 60000 : null)
      .filter((x): x is number => x !== null && Number.isFinite(x) && x >= 0);
    const avgPayoutMinutes = payoutDurations.length
      ? Math.round(payoutDurations.reduce((a, b) => a + b, 0) / payoutDurations.length * 100) / 100
      : null;

    const fraudSignals = await this.rmFraudRepo.createQueryBuilder('f').getMany();
    const totalScored = fraudSignals.length;
    const holdCount = fraudSignals.filter(f => f.holdClaim === true).length;
    const holdRate = totalScored > 0 ? Math.round((holdCount / totalScored) * 1000) / 1000 : 0;

    const escalations = await this.rmFraudEscRepo.createQueryBuilder('e').getCount();

    const cededCount = await this.rmRiCededRepo.createQueryBuilder('r').getCount();
    const recoveryCount = await this.rmRiRecoveryRepo.createQueryBuilder('x').getCount();
    const borderauxCount = await this.rmRiBorderauxRepo.createQueryBuilder('b').getCount();

    const complaints = await this.rmComplaintSlaRepo.createQueryBuilder('c').getMany();
    const totalComplaints = complaints.length;
    const slaBreaches = complaints.filter(c => c.breachedAt !== null).length;
    const slaBreachRate = totalComplaints > 0 ? Math.round((slaBreaches / totalComplaints) * 1000) / 1000 : 0;

    const avgResolutionHours = null;

    // KPI trends (latest snapshot per kpiKey)
    const allSnapshots = await this.snapshotRepo.createQueryBuilder('s').orderBy('s.created_at', 'DESC').getMany();
    const latestByKpi: Record<string, { value: number; unit: string | null; createdAt: Date }> = {};
    for (const snap of allSnapshots) {
      if (!latestByKpi[snap.kpiKey]) {
        latestByKpi[snap.kpiKey] = { value: snap.value, unit: snap.unit, createdAt: snap.createdAt };
      }
    }
    const kpiSummary = Object.entries(latestByKpi).map(([kpiKey, data]) => ({
      kpiKey,
      latestValue: data.value,
      unit: data.unit,
      trend: 'stable' as 'up' | 'down' | 'stable',
    }));

    return {
      policyMetrics: {
        totalIssued: issuedPolicies.length,
        totalRenewed: renewedPolicies.length,
        totalCancelled: cancelledPolicies.length,
        avgQuoteToIssueMinutes,
      },
      claimMetrics: {
        totalRegistered,
        totalPaid: paidClaims.length,
        totalRejected: 0,
        avgPayoutMinutes,
        totalPayoutAmount: Math.round(totalPayoutAmount * 100) / 100,
      },
      fraudMetrics: {
        totalScored,
        holdRate,
        totalEscalations: escalations,
      },
      reinsuranceMetrics: {
        totalCeded: cededCount,
        totalRecoveries: recoveryCount,
        totalBorderaux: borderauxCount,
      },
      complaintMetrics: {
        totalComplaints,
        slaBreachRate,
        avgResolutionHours,
      },
      kpiSummary,
    };
  }

  async listPolicies(params: {
    policyId?: string;
    policyNumber?: string;
    status?: string;
    holderPartyId?: string;
    insuredPartyId?: string;
    lineOfBusiness?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: RmPolicy[]; total: number }> {
    const qb = this.policyRepo.createQueryBuilder('p');
    if (params.policyId) qb.andWhere('p.policy_id = :policyId', { policyId: params.policyId });
    if (params.policyNumber) qb.andWhere('p.policy_number = :policyNumber', { policyNumber: params.policyNumber });
    if (params.status) qb.andWhere('p.status = :status', { status: params.status });
    if (params.holderPartyId) qb.andWhere('p.holder_party_id = :holderPartyId', { holderPartyId: params.holderPartyId });
    if (params.insuredPartyId) qb.andWhere('p.insured_party_id = :insuredPartyId', { insuredPartyId: params.insuredPartyId });
    if (params.lineOfBusiness) qb.andWhere('p.line_of_business = :lineOfBusiness', { lineOfBusiness: params.lineOfBusiness });
    qb.orderBy('p.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async getPolicy(policyId: string): Promise<RmPolicy | null> {
    return await this.policyRepo.findOne({ where: { policyId } as any });
  }

  async listPayments(params: {
    paymentId?: string;
    paymentNumber?: string;
    policyId?: string;
    claimId?: string;
    status?: string;
    paymentType?: string;
    partyId?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: RmPayment[]; total: number }> {
    const qb = this.paymentRepo.createQueryBuilder('p');
    if (params.paymentId) qb.andWhere('p.payment_id = :paymentId', { paymentId: params.paymentId });
    if (params.paymentNumber) qb.andWhere('p.payment_number = :paymentNumber', { paymentNumber: params.paymentNumber });
    if (params.policyId) qb.andWhere('p.policy_id = :policyId', { policyId: params.policyId });
    if (params.claimId) qb.andWhere('p.claim_id = :claimId', { claimId: params.claimId });
    if (params.status) qb.andWhere('p.status = :status', { status: params.status });
    if (params.paymentType) qb.andWhere('p.payment_type = :paymentType', { paymentType: params.paymentType });
    if (params.partyId) qb.andWhere('p.party_id = :partyId', { partyId: params.partyId });
    qb.orderBy('p.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async getPayment(paymentId: string): Promise<RmPayment | null> {
    return await this.paymentRepo.findOne({ where: { paymentId } as any });
  }

  async listSalesPartners(params: {
    partnerId?: string;
    orgUnitId?: string;
    status?: string;
    partnerType?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: RmSalesNetwork[]; total: number }> {
    const qb = this.salesNetworkRepo.createQueryBuilder('s');
    if (params.partnerId) qb.andWhere('s.partner_id = :partnerId', { partnerId: params.partnerId });
    if (params.orgUnitId) qb.andWhere('s.org_unit_id = :orgUnitId', { orgUnitId: params.orgUnitId });
    if (params.status) qb.andWhere('s.status = :status', { status: params.status });
    if (params.partnerType) qb.andWhere('s.partner_type = :partnerType', { partnerType: params.partnerType });
    qb.orderBy('s.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async getSalesPartner(partnerId: string): Promise<RmSalesNetwork | null> {
    return await this.salesNetworkRepo.findOne({ where: { partnerId } as any });
  }

  async listAmlTransactions(params: {
    transactionId?: string;
    partyId?: string;
    status?: string;
    riskLevel?: string;
    transactionType?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: RmAml[]; total: number }> {
    const qb = this.amlRepo.createQueryBuilder('a');
    if (params.transactionId) qb.andWhere('a.transaction_id = :transactionId', { transactionId: params.transactionId });
    if (params.partyId) qb.andWhere('a.party_id = :partyId', { partyId: params.partyId });
    if (params.status) qb.andWhere('a.status = :status', { status: params.status });
    if (params.riskLevel) qb.andWhere('a.risk_level = :riskLevel', { riskLevel: params.riskLevel });
    if (params.transactionType) qb.andWhere('a.transaction_type = :transactionType', { transactionType: params.transactionType });
    qb.orderBy('a.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async getAmlTransaction(transactionId: string): Promise<RmAml | null> {
    return await this.amlRepo.findOne({ where: { transactionId } as any });
  }

  async listUnderwritingRequests(params: {
    requestId?: string;
    policyId?: string;
    status?: string;
    riskLevel?: string;
    underwriterId?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: RmUnderwriting[]; total: number }> {
    const qb = this.underwritingRepo.createQueryBuilder('u');
    if (params.requestId) qb.andWhere('u.request_id = :requestId', { requestId: params.requestId });
    if (params.policyId) qb.andWhere('u.policy_id = :policyId', { policyId: params.policyId });
    if (params.status) qb.andWhere('u.status = :status', { status: params.status });
    if (params.riskLevel) qb.andWhere('u.risk_level = :riskLevel', { riskLevel: params.riskLevel });
    if (params.underwriterId) qb.andWhere('u.underwriter_id = :underwriterId', { underwriterId: params.underwriterId });
    qb.orderBy('u.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async getUnderwritingRequest(requestId: string): Promise<RmUnderwriting | null> {
    return await this.underwritingRepo.findOne({ where: { requestId } as any });
  }

  // External system connection management methods
  async createExternalSystemConnection(params: {
    systemName: string;
    systemType: ExternalSystemConnection['systemType'];
    connectionConfig: any;
    syncFrequencyMinutes?: number;
    enabledDataTypes?: string[];
    createdBy?: string;
  }): Promise<ExternalSystemConnection> {
    const connection = this.externalSystemRepo.create({
      connectionId: uuidv4(),
      systemName: params.systemName,
      systemType: params.systemType,
      connectionConfig: params.connectionConfig,
      status: 'inactive',
      lastSyncAt: null,
      lastSyncStatus: null,
      lastSyncError: null,
      syncFrequencyMinutes: params.syncFrequencyMinutes || null,
      enabledDataTypes: params.enabledDataTypes || null,
      metadata: null,
      createdBy: params.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.externalSystemRepo.save(connection);
    this.logger.log(`External system connection created: ${connection.connectionId}`);

    return connection;
  }

  async updateExternalSystemConnection(
    connectionId: string,
    params: {
      systemName?: string;
      connectionConfig?: any;
      syncFrequencyMinutes?: number;
      enabledDataTypes?: string[];
      status?: ExternalSystemConnection['status'];
    }
  ): Promise<ExternalSystemConnection | null> {
    const connection = await this.externalSystemRepo.findOne({ where: { connectionId } });
    if (!connection) return null;

    if (params.systemName !== undefined) connection.systemName = params.systemName;
    if (params.connectionConfig !== undefined) connection.connectionConfig = params.connectionConfig;
    if (params.syncFrequencyMinutes !== undefined) connection.syncFrequencyMinutes = params.syncFrequencyMinutes;
    if (params.enabledDataTypes !== undefined) connection.enabledDataTypes = params.enabledDataTypes;
    if (params.status !== undefined) connection.status = params.status;
    connection.updatedAt = new Date();

    await this.externalSystemRepo.save(connection);
    this.logger.log(`External system connection updated: ${connectionId}`);

    return connection;
  }

  async getExternalSystemConnection(connectionId: string): Promise<ExternalSystemConnection | null> {
    return this.externalSystemRepo.findOne({ where: { connectionId } });
  }

  async listExternalSystemConnections(params: {
    systemType?: ExternalSystemConnection['systemType'];
    status?: ExternalSystemConnection['status'];
    limit: number;
    offset: number;
  }): Promise<{ rows: ExternalSystemConnection[]; total: number }> {
    const qb = this.externalSystemRepo.createQueryBuilder('c');
    if (params.systemType) qb.andWhere('c.system_type = :systemType', { systemType: params.systemType });
    if (params.status) qb.andWhere('c.status = :status', { status: params.status });
    qb.orderBy('c.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async deleteExternalSystemConnection(connectionId: string): Promise<boolean> {
    const result = await this.externalSystemRepo.delete({ connectionId });
    if (result.affected && result.affected > 0) {
      this.logger.log(`External system connection deleted: ${connectionId}`);
      return true;
    }
    return false;
  }

  async syncToExternalSystem(connectionId: string, params: {
    dataType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    success: boolean;
    syncedRecords?: number;
    error?: string;
  }> {
    const connection = await this.externalSystemRepo.findOne({ where: { connectionId } });
    if (!connection) {
      return { success: false, error: 'Connection not found' };
    }

    connection.status = 'syncing';
    connection.lastSyncAt = new Date();
    await this.externalSystemRepo.save(connection);

    try {
      let syncedRecords = 0;
      const config = connection.connectionConfig || {};

      // Based on system type, implement sync logic
      if (connection.systemType === 'financial' || connection.systemType === 'bi') {
        // Sync KPI snapshots
        const snapshots = await this.snapshotRepo
          .createQueryBuilder('s')
          .where('s.created_at >= :startDate', { startDate: params.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) })
          .andWhere('s.created_at <= :endDate', { endDate: params.endDate || new Date() })
          .limit(1000)
          .getMany();

        syncedRecords = snapshots.length;

        // In a real implementation, this would send data to external system via API
        // For now, we simulate the sync
        this.logger.log(`Synced ${syncedRecords} KPI snapshots to external system ${connection.systemName}`);
      }

      connection.status = 'active';
      connection.lastSyncStatus = 'success';
      connection.lastSyncError = null;
      connection.updatedAt = new Date();
      await this.externalSystemRepo.save(connection);

      return { success: true, syncedRecords };
    } catch (error: any) {
      connection.status = 'error';
      connection.lastSyncStatus = 'failed';
      connection.lastSyncError = error.message || 'Unknown error';
      connection.updatedAt = new Date();
      await this.externalSystemRepo.save(connection);

      this.logger.error(`Failed to sync to external system ${connection.systemName}: ${error.message}`);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  async getExternalSystemSyncStatus(connectionId: string): Promise<{
    connectionId: string;
    systemName: string;
    status: ExternalSystemConnection['status'];
    lastSyncAt: Date | null;
    lastSyncStatus: string | null;
    lastSyncError: string | null;
    syncFrequencyMinutes: number | null;
  } | null> {
    const connection = await this.externalSystemRepo.findOne({ where: { connectionId } });
    if (!connection) return null;

    return {
      connectionId: connection.connectionId,
      systemName: connection.systemName,
      status: connection.status,
      lastSyncAt: connection.lastSyncAt,
      lastSyncStatus: connection.lastSyncStatus,
      lastSyncError: connection.lastSyncError,
      syncFrequencyMinutes: connection.syncFrequencyMinutes,
    };
  }

  // Financial, Market Share, and Satisfaction KPIs
  async getFinancialKPIs(params: {
    startDate: Date;
    endDate: Date;
  }): Promise<{
    totalPremium: number;
    totalClaimsPaid: number;
    lossRatio: number;
    combinedRatio: number;
    profitMargin: number;
    gwp: number;
    nwp: number;
    technicalResult: number;
    period: {
      startDate: string;
      endDate: string;
    };
  }> {
    // Simulate financial KPI calculations
    // In a real implementation, this would query financial tables or aggregations
    const totalPremium = Math.random() * 1000000000 + 500000000;
    const totalClaimsPaid = totalPremium * (Math.random() * 0.4 + 0.5);
    const lossRatio = totalClaimsPaid / totalPremium;
    const combinedRatio = lossRatio + (Math.random() * 0.2 + 0.1);
    const profitMargin = 1 - combinedRatio;
    const gwp = totalPremium * 1.1;
    const nwp = gwp * 0.9;
    const technicalResult = gwp - totalClaimsPaid - (gwp * 0.15);

    return {
      totalPremium,
      totalClaimsPaid,
      lossRatio,
      combinedRatio,
      profitMargin,
      gwp,
      nwp,
      technicalResult,
      period: {
        startDate: params.startDate.toISOString(),
        endDate: params.endDate.toISOString(),
      },
    };
  }

  async getMarketShareKPIs(params: {
    startDate: Date;
    endDate: Date;
  }): Promise<{
    marketShare: number;
    marketRank: number;
    totalPoliciesSold: number;
    newCustomers: number;
    customerRetentionRate: number;
    competitorComparison: Array<{
      competitor: string;
      marketShare: number;
    }>;
    period: {
      startDate: string;
      endDate: string;
    };
  }> {
    // Simulate market share KPI calculations
    const marketShare = Math.random() * 15 + 5; // 5-20%
    const totalPoliciesSold = Math.floor(Math.random() * 50000 + 10000);
    const newCustomers = Math.floor(totalPoliciesSold * 0.3);
    const customerRetentionRate = Math.random() * 0.1 + 0.85; // 85-95%
    const marketRank = Math.floor(marketShare / 5) + 1;

    const competitorComparison = [
      { competitor: 'Competitor A', marketShare: Math.random() * 20 + 10 },
      { competitor: 'Competitor B', marketShare: Math.random() * 15 + 5 },
      { competitor: 'Competitor C', marketShare: Math.random() * 10 + 3 },
      { competitor: 'Competitor D', marketShare: Math.random() * 8 + 2 },
    ].sort((a, b) => b.marketShare - a.marketShare);

    return {
      marketShare,
      marketRank,
      totalPoliciesSold,
      newCustomers,
      customerRetentionRate,
      competitorComparison,
      period: {
        startDate: params.startDate.toISOString(),
        endDate: params.endDate.toISOString(),
      },
    };
  }

  async getSatisfactionKPIs(params: {
    startDate: Date;
    endDate: Date;
  }): Promise<{
    overallSatisfactionScore: number;
    npsScore: number;
    csatScore: number;
    responseTimeAvg: number;
    firstContactResolution: number;
    complaintResolutionRate: number;
    customerChurnRate: number;
    trends: {
      monthly: Array<{
        month: string;
        satisfactionScore: number;
      }>;
    };
    period: {
      startDate: string;
      endDate: string;
    };
  }> {
    // Simulate satisfaction KPI calculations
    const overallSatisfactionScore = Math.random() * 2 + 3; // 3-5 out of 5
    const npsScore = Math.floor(Math.random() * 40 - 20); // -20 to +20
    const csatScore = Math.random() * 20 + 80; // 80-100%
    const responseTimeAvg = Math.random() * 24 + 2; // 2-26 hours
    const firstContactResolution = Math.random() * 0.2 + 0.75; // 75-95%
    const complaintResolutionRate = Math.random() * 0.15 + 0.8; // 80-95%
    const customerChurnRate = Math.random() * 0.05 + 0.02; // 2-7%

    // Generate monthly trends
    const trends = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const startMonth = params.startDate.getMonth();
    const endMonth = params.endDate.getMonth();
    
    for (let i = 0; i < 6; i++) {
      const monthIndex = (startMonth + i) % 12;
      trends.push({
        month: months[monthIndex],
        satisfactionScore: Math.random() * 2 + 3,
      });
    }

    return {
      overallSatisfactionScore,
      npsScore,
      csatScore,
      responseTimeAvg,
      firstContactResolution,
      complaintResolutionRate,
      customerChurnRate,
      trends: {
        monthly: trends,
      },
      period: {
        startDate: params.startDate.toISOString(),
        endDate: params.endDate.toISOString(),
      },
    };
  }

  /**
   * Executive Cockpit: Combined Ratio KPIs
   * Combined Ratio = (Incurred Loss + Expenses) / Earned Premium
   */
  async getCombinedRatioKPIs(params: {
    startDate: Date;
    endDate: Date;
  }): Promise<{
    combinedRatio: number;
    lossRatio: number;
    expenseRatio: number;
    incurredLosses: number;
    earnedPremium: number;
    underwritingProfit: number;
    underwritingProfitMargin: number;
    trends: {
      monthly: Array<{
        month: string;
        combinedRatio: number;
        lossRatio: number;
        expenseRatio: number;
      }>;
    };
    period: {
      startDate: string;
      endDate: string;
    };
  }> {
    // Simulate combined ratio KPI calculations
    const earnedPremium = Math.random() * 1000000000 + 500000000; // 500M - 1.5B IRR
    const incurredLosses = earnedPremium * (Math.random() * 0.2 + 0.5); // 50-70% of premium
    const expenses = earnedPremium * (Math.random() * 0.15 + 0.2); // 20-35% of premium
    
    const lossRatio = incurredLosses / earnedPremium;
    const expenseRatio = expenses / earnedPremium;
    const combinedRatio = lossRatio + expenseRatio;
    
    const underwritingProfit = earnedPremium - incurredLosses - expenses;
    const underwritingProfitMargin = underwritingProfit / earnedPremium;

    // Generate monthly trends
    const trends = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const startMonth = params.startDate.getMonth();
    
    for (let i = 0; i < 6; i++) {
      const monthIndex = (startMonth + i) % 12;
      trends.push({
        month: months[monthIndex],
        combinedRatio: Math.random() * 0.3 + 0.7, // 70-100%
        lossRatio: Math.random() * 0.2 + 0.5, // 50-70%
        expenseRatio: Math.random() * 0.15 + 0.2, // 20-35%
      });
    }

    return {
      combinedRatio,
      lossRatio,
      expenseRatio,
      incurredLosses,
      earnedPremium,
      underwritingProfit,
      underwritingProfitMargin,
      trends: {
        monthly: trends,
      },
      period: {
        startDate: params.startDate.toISOString(),
        endDate: params.endDate.toISOString(),
      },
    };
  }

  /**
   * Executive Cockpit: Retention KPIs
   */
  async getRetentionKPIs(params: {
    startDate: Date;
    endDate: Date;
  }): Promise<{
    policyRetentionRate: number;
    customerRetentionRate: number;
    renewalRate: number;
    lapseRate: number;
    surrenderRate: number;
    averagePolicyTenure: number;
    churnReasons: Array<{
      reason: string;
      percentage: number;
    }>;
    trends: {
      monthly: Array<{
        month: string;
        retentionRate: number;
      }>;
    };
    period: {
      startDate: string;
      endDate: string;
    };
  }> {
    // Simulate retention KPI calculations
    const policyRetentionRate = Math.random() * 0.1 + 0.85; // 85-95%
    const customerRetentionRate = Math.random() * 0.1 + 0.85; // 85-95%
    const renewalRate = Math.random() * 0.15 + 0.75; // 75-90%
    const lapseRate = Math.random() * 0.1 + 0.05; // 5-15%
    const surrenderRate = Math.random() * 0.05 + 0.02; // 2-7%
    const averagePolicyTenure = Math.random() * 3 + 2; // 2-5 years

    const churnReasons = [
      { reason: 'Price', percentage: Math.random() * 30 + 20 },
      { reason: 'Service Quality', percentage: Math.random() * 20 + 10 },
      { reason: 'Competitor Offer', percentage: Math.random() * 15 + 10 },
      { reason: 'Coverage Needs', percentage: Math.random() * 15 + 10 },
      { reason: 'Other', percentage: Math.random() * 10 + 5 },
    ];

    // Generate monthly trends
    const trends = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const startMonth = params.startDate.getMonth();
    
    for (let i = 0; i < 6; i++) {
      const monthIndex = (startMonth + i) % 12;
      trends.push({
        month: months[monthIndex],
        retentionRate: Math.random() * 0.1 + 0.85,
      });
    }

    return {
      policyRetentionRate,
      customerRetentionRate,
      renewalRate,
      lapseRate,
      surrenderRate,
      averagePolicyTenure,
      churnReasons,
      trends: {
        monthly: trends,
      },
      period: {
        startDate: params.startDate.toISOString(),
        endDate: params.endDate.toISOString(),
      },
    };
  }

  /**
   * Executive Cockpit: Leakage KPIs
   */
  async getLeakageKPIs(params: {
    startDate: Date;
    endDate: Date;
  }): Promise<{
    premiumLeakage: number;
    claimsLeakage: number;
    operationalLeakage: number;
    totalLeakage: number;
    leakageByCategory: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
    trends: {
      monthly: Array<{
        month: string;
        leakageAmount: number;
      }>;
    };
    period: {
      startDate: string;
      endDate: string;
    };
  }> {
    // Simulate leakage KPI calculations
    const totalPremium = Math.random() * 1000000000 + 500000000;
    const premiumLeakage = totalPremium * (Math.random() * 0.05 + 0.02); // 2-7%
    const claimsLeakage = totalPremium * (Math.random() * 0.03 + 0.01); // 1-4%
    const operationalLeakage = totalPremium * (Math.random() * 0.02 + 0.01); // 1-3%
    
    const totalLeakage = premiumLeakage + claimsLeakage + operationalLeakage;

    const leakageByCategory = [
      { category: 'Premium Leakage', amount: premiumLeakage, percentage: (premiumLeakage / totalLeakage) * 100 },
      { category: 'Claims Leakage', amount: claimsLeakage, percentage: (claimsLeakage / totalLeakage) * 100 },
      { category: 'Operational Leakage', amount: operationalLeakage, percentage: (operationalLeakage / totalLeakage) * 100 },
    ];

    // Generate monthly trends
    const trends = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const startMonth = params.startDate.getMonth();
    
    for (let i = 0; i < 6; i++) {
      const monthIndex = (startMonth + i) % 12;
      trends.push({
        month: months[monthIndex],
        leakageAmount: totalLeakage / 6 * (Math.random() * 0.5 + 0.75),
      });
    }

    return {
      premiumLeakage,
      claimsLeakage,
      operationalLeakage,
      totalLeakage,
      leakageByCategory,
      trends: {
        monthly: trends,
      },
      period: {
        startDate: params.startDate.toISOString(),
        endDate: params.endDate.toISOString(),
      },
    };
  }

  /**
   * Executive Cockpit: Fraud Yield KPIs
   */
  async getFraudYieldKPIs(params: {
    startDate: Date;
    endDate: Date;
  }): Promise<{
    fraudDetectionRate: number;
    fraudPreventedAmount: number;
    fraudInvestigatedCases: number;
    fraudConfirmedCases: number;
    fraudYieldRate: number;
    averageInvestigationTime: number;
    fraudByType: Array<{
      type: string;
      count: number;
      amount: number;
    }>;
    trends: {
      monthly: Array<{
        month: string;
        fraudYield: number;
      }>;
    };
    period: {
      startDate: string;
      endDate: string;
    };
  }> {
    // Simulate fraud yield KPI calculations
    const totalClaims = Math.floor(Math.random() * 10000 + 5000);
    const fraudInvestigatedCases = Math.floor(totalClaims * (Math.random() * 0.05 + 0.02)); // 2-7%
    const fraudConfirmedCases = Math.floor(fraudInvestigatedCases * (Math.random() * 0.4 + 0.3)); // 30-70% of investigated
    const fraudDetectionRate = fraudConfirmedCases / totalClaims;
    const fraudPreventedAmount = fraudConfirmedCases * (Math.random() * 50000000 + 10000000); // 10M-60M IRR per case
    const fraudYieldRate = fraudPreventedAmount / (totalClaims * 1000000); // Yield per million claims
    const averageInvestigationTime = Math.random() * 10 + 5; // 5-15 days

    const fraudByType = [
      { type: 'Exaggerated Claims', count: Math.floor(fraudConfirmedCases * 0.4), amount: fraudPreventedAmount * 0.4 },
      { type: 'Staged Accidents', count: Math.floor(fraudConfirmedCases * 0.2), amount: fraudPreventedAmount * 0.2 },
      { type: 'False Documentation', count: Math.floor(fraudConfirmedCases * 0.25), amount: fraudPreventedAmount * 0.25 },
      { type: 'Other', count: Math.floor(fraudConfirmedCases * 0.15), amount: fraudPreventedAmount * 0.15 },
    ];

    // Generate monthly trends
    const trends = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const startMonth = params.startDate.getMonth();
    
    for (let i = 0; i < 6; i++) {
      const monthIndex = (startMonth + i) % 12;
      trends.push({
        month: months[monthIndex],
        fraudYield: fraudYieldRate * (Math.random() * 0.5 + 0.75),
      });
    }

    return {
      fraudDetectionRate,
      fraudPreventedAmount,
      fraudInvestigatedCases,
      fraudConfirmedCases,
      fraudYieldRate,
      averageInvestigationTime,
      fraudByType,
      trends: {
        monthly: trends,
      },
      period: {
        startDate: params.startDate.toISOString(),
        endDate: params.endDate.toISOString(),
      },
    };
  }

  /**
   * Executive Cockpit: STP (Straight-Through Processing) KPIs
   */
  async getSTPKPIs(params: {
    startDate: Date;
    endDate: Date;
  }): Promise<{
    overallSTPRate: number;
    policyIssuanceSTPRate: number;
    claimsProcessingSTPRate: number;
    paymentProcessingSTPRate: number;
    underwritingSTPRate: number;
    manualInterventionRate: number;
    averageProcessingTime: number;
    stpByProcess: Array<{
      process: string;
      stpRate: number;
      volume: number;
    }>;
    trends: {
      monthly: Array<{
        month: string;
        stpRate: number;
      }>;
    };
    period: {
      startDate: string;
      endDate: string;
    };
  }> {
    // Simulate STP KPI calculations
    const overallSTPRate = Math.random() * 0.25 + 0.65; // 65-90%
    const policyIssuanceSTPRate = Math.random() * 0.2 + 0.75; // 75-95%
    const claimsProcessingSTPRate = Math.random() * 0.3 + 0.5; // 50-80%
    const paymentProcessingSTPRate = Math.random() * 0.15 + 0.8; // 80-95%
    const underwritingSTPRate = Math.random() * 0.25 + 0.6; // 60-85%
    const manualInterventionRate = 1 - overallSTPRate;
    const averageProcessingTime = Math.random() * 30 + 10; // 10-40 minutes

    const stpByProcess = [
      { process: 'Policy Issuance', stpRate: policyIssuanceSTPRate, volume: Math.floor(Math.random() * 50000 + 10000) },
      { process: 'Claims Processing', stpRate: claimsProcessingSTPRate, volume: Math.floor(Math.random() * 10000 + 5000) },
      { process: 'Payment Processing', stpRate: paymentProcessingSTPRate, volume: Math.floor(Math.random() * 50000 + 20000) },
      { process: 'Underwriting', stpRate: underwritingSTPRate, volume: Math.floor(Math.random() * 30000 + 10000) },
    ];

    // Generate monthly trends
    const trends = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const startMonth = params.startDate.getMonth();
    
    for (let i = 0; i < 6; i++) {
      const monthIndex = (startMonth + i) % 12;
      trends.push({
        month: months[monthIndex],
        stpRate: overallSTPRate * (Math.random() * 0.1 + 0.95),
      });
    }

    return {
      overallSTPRate,
      policyIssuanceSTPRate,
      claimsProcessingSTPRate,
      paymentProcessingSTPRate,
      underwritingSTPRate,
      manualInterventionRate,
      averageProcessingTime,
      stpByProcess,
      trends: {
        monthly: trends,
      },
      period: {
        startDate: params.startDate.toISOString(),
        endDate: params.endDate.toISOString(),
      },
    };
  }

  /**
   * Executive Cockpit: Get all KPIs in one call
   */
  async getExecutiveCockpit(params: {
    startDate: Date;
    endDate: Date;
  }): Promise<{
    marketShare: any;
    satisfaction: any;
    combinedRatio: any;
    retention: any;
    leakage: any;
    fraudYield: any;
    stp: any;
    period: {
      startDate: string;
      endDate: string;
    };
  }> {
    const [marketShare, satisfaction, combinedRatio, retention, leakage, fraudYield, stp] = await Promise.all([
      this.getMarketShareKPIs(params),
      this.getSatisfactionKPIs(params),
      this.getCombinedRatioKPIs(params),
      this.getRetentionKPIs(params),
      this.getLeakageKPIs(params),
      this.getFraudYieldKPIs(params),
      this.getSTPKPIs(params),
    ]);

    return {
      marketShare,
      satisfaction,
      combinedRatio,
      retention,
      leakage,
      fraudYield,
      stp,
      period: {
        startDate: params.startDate.toISOString(),
        endDate: params.endDate.toISOString(),
      },
    };
  }
}
