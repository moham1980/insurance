import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Party } from './entities/Party';
import { PiiReference } from './entities/PiiReference';
import { KycReview, type KycRiskLevel, type KycWorkflowStage, type KycScreeningStatus } from './entities/KycReview';
import { DocumentTrustChainEntry } from './entities/DocumentTrustChainEntry';
import { IdentityProofingRecord } from './entities/IdentityProofingRecord';
import { ExternalVerificationRequestEntity } from './entities/ExternalVerificationRequestEntity';
import { KycExceptionEntity } from './entities/KycExceptionEntity';
import { ConsentRecord } from './entities/ConsentRecord';
import { PartyRoleAssignment, PartyRoleType } from './entities/PartyRoleAssignment';
import { TransactionAmlScreening } from './entities/TransactionAmlScreening';
import { OutboxPublisher, AuditPersistenceService } from '@insurance/shared';
import { encryptAead, decryptAead, blindIndex } from './pii-crypto';
import { resilientFetch } from './resilient-client';
import { addBusinessDays, businessDaysBetween } from './sla-calendar';

export interface ActorContext {
  tenantId: string;
  userId?: string;
  roles?: string[];
  correlationId?: string;
}

interface DocumentTrustChain {
  documentId: string;
  documentType: string;
  uploadedAt: Date;
  uploadedBy: string;
  verified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
  verificationMethod: string;
  trustLevel: 'low' | 'medium' | 'high';
  hash: string;
  previousHash?: string;
  chainPosition: number;
}

interface IdentityProofingResult {
  proofingId: string;
  partyId: string;
  faceMatchScore: number;
  faceMatchThreshold: number;
  dedupMatchFound: boolean;
  dedupMatchIds: string[];
  livenessCheck: boolean;
  documentAuthenticity: boolean;
  confidenceScore: number;
  status: 'passed' | 'failed' | 'manual_review';
  completedAt: Date;
}

interface ExternalVerificationRequest {
  requestId: string;
  partyId: string;
  serviceType: 'sanctions' | 'pep' | 'adverse_media' | 'identity';
  requestPayload: Record<string, any>;
  requestedAt: Date;
  status: 'pending' | 'completed' | 'failed' | 'awaiting_provider';
  responsePayload?: Record<string, any>;
  completedAt?: Date;
  errorMessage?: string;
  providerName?: string | null;
  providerRequestId?: string | null;
}

interface KycException {
  exceptionId: string;
  partyId: string;
  kycReviewId: string;
  exceptionType: 'document_issue' | 'screening_failure' | 'consent_issue' | 'verification_timeout' | 'external_service_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  raisedAt: Date;
  raisedBy: string;
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'escalated';
  resolutionNotes?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
}

function calcRisk(s: Record<string, any>): { score: number; level: KycRiskLevel; factors: string[] } {
  let score = 0; const f: string[] = [];
  if (s.pep === true) { score += 30; f.push('pep'); }
  if (s.sanctions === true) { score += 40; f.push('sanctions'); }
  if (s.adverseMedia === true) { score += 15; f.push('adverse_media'); }
  if ((s.documentQuality ?? 100) < 50) { score += 5; f.push('doc_quality'); }
  if (s.nationalIdRisk === 'high') { score += 10; f.push('id_risk'); }
  let level: KycRiskLevel = 'low';
  if (score >= 70) level = 'critical'; else if (score >= 50) level = 'high'; else if (score >= 25) level = 'medium';
  return { score, level, factors: f };
}

const ALLOWED_TRANSITIONS: Record<KycWorkflowStage, KycWorkflowStage[]> = {
  data_collection: ['document_verification'],
  document_verification: ['aml_screening', 'manual_review'],
  aml_screening: ['risk_assessment', 'manual_review', 'escalated'],
  risk_assessment: ['manual_review', 'escalated', 'approved', 'rejected'],
  manual_review: ['escalated', 'approved', 'rejected'],
  approved: [],
  rejected: [],
  escalated: ['manual_review', 'approved', 'rejected'],
};

function validateTransition(from: KycWorkflowStage, to: KycWorkflowStage): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

@Injectable()
export class PartyService implements OnModuleInit {
  private readonly logger = new Logger(PartyService.name);

  constructor(
    @InjectRepository(Party) private readonly partyRepo: Repository<Party>,
    @InjectRepository(KycReview) private readonly kycRepo: Repository<KycReview>,
    @InjectRepository(DocumentTrustChainEntry) private readonly documentTrustChainRepo: Repository<DocumentTrustChainEntry>,
    @InjectRepository(IdentityProofingRecord) private readonly identityProofingRepo: Repository<IdentityProofingRecord>,
    @InjectRepository(ExternalVerificationRequestEntity) private readonly externalVerificationRepo: Repository<ExternalVerificationRequestEntity>,
    @InjectRepository(KycExceptionEntity) private readonly kycExceptionRepo: Repository<KycExceptionEntity>,
    @InjectRepository(ConsentRecord) private readonly consentRepo: Repository<ConsentRecord>,
    @InjectRepository(PartyRoleAssignment) private readonly roleAssignmentRepo: Repository<PartyRoleAssignment>,
    @InjectRepository(TransactionAmlScreening) private readonly transactionAmlRepo: Repository<TransactionAmlScreening>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditPersistenceService,
  ) {
    this.outboxPublisher = new OutboxPublisher(dataSource);
  }
  private readonly outboxPublisher: OutboxPublisher;

  onModuleInit() {
    // Fail-fast: ensure encryption and blind-index keys are configured on startup
    try {
      encryptAead('startup-check');
      blindIndex('startup-check');
    } catch (err: any) {
      this.logger.error(`PII crypto initialization failed: ${err.message}`);
      throw err;
    }
  }

  private encryptPii(value: string): string {
    return encryptAead(value);
  }

  private decryptPii(value: string): string {
    return decryptAead(value);
  }

  private async createPiiReference(
    manager: EntityManager,
    piiType: PiiReference['piiType'],
    plaintext: string,
    tenantId: string,
  ): Promise<PiiReference> {
    const piiRepo = manager.getRepository(PiiReference);
    const ciphertext = this.encryptPii(plaintext);
    const ref = piiRepo.create({
      piiReferenceId: uuidv4(),
      piiType,
      ciphertext,
      keyVersion: 'v1',
      blindIndex: blindIndex(plaintext),
      tenantId,
      kmsProvider: process.env.PII_STORE_PROVIDER || 'local',
      vaultPath: process.env.VAULT_ADDR || null,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return piiRepo.save(ref);
  }

  private maskPii(value: string | null | undefined): string | null {
    if (!value || typeof value !== 'string') return null;
    if (value.length <= 4) return '****';
    return value.substring(0, 2) + '*'.repeat(Math.max(4, value.length - 4)) + value.substring(value.length - 2);
  }

  public maskPartyPii(party: Party): void {
    if (party.nationalId) party.nationalId = this.maskPii(party.nationalId) as string;
    if (party.mobile) party.mobile = this.maskPii(party.mobile);
  }

  private getIdentityVerificationUrl(): string | null {
    const url = process.env.IDENTITY_VERIFICATION_URL || process.env.MODEL_SWITCHBOARD_URL;
    if (typeof url === 'string' && url.length > 0) return url;
    return null;
  }

  private getExternalScreeningUrl(): string | null {
    const url = process.env.EXTERNAL_SCREENING_URL;
    if (typeof url === 'string' && url.length > 0) return url;
    return null;
  }

  private assertTenant(ctx: ActorContext) {
    if (!ctx?.tenantId) throw new Error('Tenant context is required');
  }

  async createParty(ctx: ActorContext, params: {
    type: Party['type'];
    fullName: string;
    nationalId: string;
    mobile?: string | null;
    organizationId?: string | null;
    roles?: Array<{ roleType: PartyRoleType; organizationId?: string; scope?: string[] }>;
  }): Promise<Party> {
    this.assertTenant(ctx);
    const created = await this.dataSource.transaction(async (manager) => {
      const partyRepo = manager.getRepository(Party);
      const kycRepo = manager.getRepository(KycReview);
      const roleRepo = manager.getRepository(PartyRoleAssignment);
      const outboxPublisher = new OutboxPublisher(manager);

      // Check duplicate national ID within tenant using blind index
      const existing = await partyRepo.findOne({
        where: { tenantId: ctx.tenantId, nationalIdBlindIndex: blindIndex(params.nationalId) },
      });
      if (existing) {
        throw new Error('Duplicate national ID within tenant');
      }

      const nationalIdRef = await this.createPiiReference(manager, 'NATIONAL_ID', params.nationalId, ctx.tenantId);
      const mobileRef = params.mobile ? await this.createPiiReference(manager, 'MOBILE', params.mobile, ctx.tenantId) : null;

      const party = partyRepo.create({
        partyId: uuidv4(),
        tenantId: ctx.tenantId,
        type: params.type,
        fullName: params.fullName,
        nationalId: this.encryptPii(params.nationalId),
        nationalIdBlindIndex: blindIndex(params.nationalId),
        nationalIdPiiReferenceId: nationalIdRef.piiReferenceId,
        mobile: params.mobile ? this.encryptPii(params.mobile) : null,
        mobileBlindIndex: params.mobile ? blindIndex(params.mobile) : null,
        mobilePiiReferenceId: mobileRef ? mobileRef.piiReferenceId : null,
        organizationId: params.organizationId || null,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await partyRepo.save(party);

      // Create role assignments if provided
      if (params.roles && params.roles.length > 0) {
        for (const role of params.roles) {
          const roleAssignment = roleRepo.create({
            assignmentId: uuidv4(),
            partyId: party.partyId,
            organizationId: role.organizationId || params.organizationId || '',
            tenantId: ctx.tenantId,
            roleType: role.roleType,
            scope: role.scope || [],
            validFrom: new Date(),
            validTo: null,
            status: 'active',
          });
          await roleRepo.save(roleAssignment);
        }
      }

      // Determine KYC type based on roles
      const hasBrokerRole = params.roles?.some(r =>
        r.roleType === 'BROKER' || r.roleType === 'AGENT' || r.roleType === 'SUB_AGENT' || r.roleType === 'MARKETER'
      );
      const kycType = hasBrokerRole ? 'broker' : 'standard';

      const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 7);
      const initial = kycRepo.create({
        kycReviewId: uuidv4(),
        tenantId: ctx.tenantId,
        partyId: party.partyId,
        status: 'pending',
        workflowStage: 'data_collection',
        reviewerUserId: null,
        notes: null,
        decidedAt: null,
        riskLevel: null,
        riskScore: null,
        riskFactors: null,
        amlScreeningStatus: 'not_started',
        pepScreeningStatus: null,
        sanctionsScreeningStatus: null,
        adverseMediaStatus: null,
        screeningResults: null,
        screenedAt: null,
        documentStatus: 'not_submitted',
        documentTypes: null,
        documentVerifiedAt: null,
        escalationReason: null,
        escalatedAt: null,
        escalatedTo: null,
        dueDate,
        kycType,
        licenseCheckStatus: 'not_started',
        licenseVerifiedAt: null,
        licenseId: null,
        backgroundCheckStatus: 'not_started',
        backgroundCheckedAt: null,
        financialCheckStatus: 'not_started',
        financialCheckedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await kycRepo.save(initial);

      await outboxPublisher.publish({
        topic: 'insurance.party.created',
        eventType: 'PartyCreated',
        eventVersion: 1,
        correlationId: ctx.correlationId || party.partyId,
        subject: { partyId: party.partyId },
        payload: { partyId: party.partyId, tenantId: ctx.tenantId, type: party.type, fullName: party.fullName, organizationId: party.organizationId, roles: params.roles?.map(r => r.roleType) || [] },
        producer: 'party-kyc-service',
      });

      return party;
    });

    if (created) {
      await this.auditService.record({
        tenantId: ctx.tenantId,
        actorUserId: ctx.userId,
        action: 'create',
        resourceType: 'party',
        resourceId: created.partyId,
        correlationId: ctx.correlationId,
        after: { partyId: created.partyId, type: created.type, fullName: created.fullName, status: created.status },
      });
    }

    return created;
  }

  async getParty(ctx: ActorContext, partyId: string): Promise<Party | null> {
    this.assertTenant(ctx);
    const party = await this.partyRepo.findOne({ where: { tenantId: ctx.tenantId, partyId } });
    if (party) {
      if (party.nationalId) party.nationalId = this.decryptPii(party.nationalId);
      if (party.mobile) party.mobile = this.decryptPii(party.mobile);
    }
    return party;
  }

  async getPartyByGlobalUserId(ctx: ActorContext, globalUserId: string): Promise<Party | null> {
    this.assertTenant(ctx);
    const party = await this.partyRepo.findOne({ where: { tenantId: ctx.tenantId, globalUserId } });
    if (party) {
      if (party.nationalId) party.nationalId = this.decryptPii(party.nationalId);
      if (party.mobile) party.mobile = this.decryptPii(party.mobile);
    }
    return party;
  }

  async linkGlobalUserId(ctx: ActorContext, partyId: string, globalUserId: string): Promise<Party | null> {
    this.assertTenant(ctx);
    const party = await this.partyRepo.findOne({ where: { tenantId: ctx.tenantId, partyId } });
    if (!party) return null;
    party.globalUserId = globalUserId;
    return this.partyRepo.save(party);
  }

  async updateParty(ctx: ActorContext, partyId: string, dto: { fullName?: string; mobile?: string | null; status?: string }): Promise<Party> {
    this.assertTenant(ctx);
    const party = await this.partyRepo.findOne({ where: { tenantId: ctx.tenantId, partyId } });
    if (!party) throw new Error('Party not found');

    const before = { ...party };

    if (dto.fullName !== undefined) party.fullName = dto.fullName;
    if (dto.status !== undefined) party.status = dto.status as Party['status'];
    if (dto.mobile !== undefined) {
      if (dto.mobile) {
        party.mobile = this.encryptPii(dto.mobile);
        party.mobileBlindIndex = blindIndex(dto.mobile);
      } else {
        party.mobile = null;
        party.mobileBlindIndex = null;
      }
    }

    party.updatedAt = new Date();
    const saved = await this.partyRepo.save(party);

    await this.auditService.record({
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      action: 'update',
      resourceType: 'party',
      resourceId: partyId,
      correlationId: ctx.correlationId,
      before: { fullName: before.fullName, status: before.status },
      after: { fullName: saved.fullName, status: saved.status },
    });

    if (saved.nationalId) saved.nationalId = this.decryptPii(saved.nationalId);
    if (saved.mobile) saved.mobile = this.decryptPii(saved.mobile);
    return saved;
  }

  async listParties(ctx: ActorContext, params: { limit: number; offset: number; nationalId?: string }): Promise<{ rows: Party[]; total: number }> {
    this.assertTenant(ctx);
    const qb = this.partyRepo.createQueryBuilder('p');
    qb.andWhere('p.tenant_id = :tenantId', { tenantId: ctx.tenantId });

    if (params.nationalId) {
      qb.andWhere('p.national_id_blind_index = :nationalIdBlindIndex', { nationalIdBlindIndex: blindIndex(params.nationalId) });
    }

    qb.orderBy('p.created_at', 'DESC').limit(params.limit).offset(params.offset);

    const [rows, total] = await qb.getManyAndCount();
    for (const row of rows) {
      if (row.nationalId) row.nationalId = this.decryptPii(row.nationalId);
      if (row.mobile) row.mobile = this.decryptPii(row.mobile);
    }
    return { rows, total };
  }

  async reviewKyc(ctx: ActorContext, params: {
    partyId: string;
    decision: 'approved' | 'rejected';
    reviewerUserId?: string | null;
    notes?: string | null;
  }): Promise<KycReview> {
    this.assertTenant(ctx);
    return await this.dataSource.transaction(async (manager) => {
      const kycRepo = manager.getRepository(KycReview);
      const outboxPublisher = new OutboxPublisher(manager);
      const r = await this.latestKycInternal(manager, ctx.tenantId, params.partyId);
      if (!r) throw new Error('No KYC review found for party');

      const targetStage: KycWorkflowStage = params.decision === 'approved' ? 'approved' : 'rejected';
      if (!validateTransition(r.workflowStage, targetStage)) {
        throw new Error(`Invalid transition from ${r.workflowStage} to ${targetStage}`);
      }

      r.status = params.decision;
      r.workflowStage = targetStage;
      r.reviewerUserId = params.reviewerUserId ?? null;
      r.notes = params.notes ?? null;
      r.decidedAt = new Date();
      r.updatedAt = new Date();

      await kycRepo.save(r);

      await outboxPublisher.publish({
        topic: params.decision === 'approved' ? 'insurance.kyc.approved' : 'insurance.kyc.rejected',
        eventType: params.decision === 'approved' ? 'KycApproved' : 'KycRejected',
        eventVersion: 1,
        correlationId: ctx.correlationId || params.partyId,
        subject: { partyId: params.partyId, tenantId: ctx.tenantId },
        payload: { partyId: params.partyId, tenantId: ctx.tenantId, decision: params.decision, reviewerUserId: params.reviewerUserId },
        producer: 'party-kyc-service',
      });

      // Issue 4.3: Publish KYC status change event for sales-network-service sync
      const partyRepo = manager.getRepository(Party);
      const roleRepo = manager.getRepository(PartyRoleAssignment);
      const party = await partyRepo.findOne({ where: { tenantId: ctx.tenantId, partyId: params.partyId } });
      const roles = party ? await roleRepo.find({ where: { tenantId: ctx.tenantId, partyId: params.partyId, status: 'active' } }) : [];

      await outboxPublisher.publish({
        topic: 'insurance.party.kyc_status_changed',
        eventType: 'KycStatusChanged',
        eventVersion: 1,
        correlationId: ctx.correlationId || params.partyId,
        subject: { partyId: params.partyId, tenantId: ctx.tenantId },
        payload: {
          partyId: params.partyId,
          tenantId: ctx.tenantId,
          kycStatus: params.decision,
          previousStatus: r.status,
          organizationId: party?.organizationId || null,
          roles: roles.map(r => r.roleType),
          actionRequired: params.decision === 'rejected' ? 'suspend_agent' : 'activate_agent',
        },
        producer: 'party-kyc-service',
      });

      return r;
    });
  }

  async latestKyc(ctx: ActorContext, partyId: string): Promise<KycReview | null> {
    this.assertTenant(ctx);
    return this.latestKycInternal(this.dataSource.manager, ctx.tenantId, partyId);
  }

  private async latestKycInternal(manager: EntityManager, tenantId: string, partyId: string): Promise<KycReview | null> {
    const repo = manager.getRepository(KycReview);
    return await repo.findOne({ where: { tenantId, partyId }, order: { createdAt: 'DESC' } });
  }

  async submitDocuments(ctx: ActorContext, p: { partyId: string; documentTypes: string[] }): Promise<KycReview> {
    this.assertTenant(ctx);
    const r = await this.latestKyc(ctx, p.partyId);
    if (!r) throw new Error('No KYC review found');
    if (!validateTransition(r.workflowStage, 'document_verification')) {
      throw new Error(`Invalid transition from ${r.workflowStage} to document_verification`);
    }
    r.documentStatus = 'submitted';
    r.documentTypes = p.documentTypes;
    r.workflowStage = 'document_verification';
    r.updatedAt = new Date();
    await this.kycRepo.save(r);
    return r;
  }

  async verifyDocuments(ctx: ActorContext, p: { partyId: string; decision: 'verified' | 'rejected'; reviewerUserId?: string; notes?: string }): Promise<KycReview> {
    this.assertTenant(ctx);
    const r = await this.latestKyc(ctx, p.partyId);
    if (!r) throw new Error('No KYC review found');
    const targetStage: KycWorkflowStage = p.decision === 'verified' ? 'aml_screening' : 'manual_review';
    if (!validateTransition(r.workflowStage, targetStage)) {
      throw new Error(`Invalid transition from ${r.workflowStage} to ${targetStage}`);
    }
    r.documentStatus = p.decision;
    r.documentVerifiedAt = new Date();
    if (p.reviewerUserId) r.reviewerUserId = p.reviewerUserId;
    if (p.notes) r.notes = p.notes;
    r.workflowStage = targetStage;
    r.updatedAt = new Date();
    await this.kycRepo.save(r);
    return r;
  }

  async runAmlScreening(ctx: ActorContext, p: { partyId: string; providerRequestId?: string; idempotencyKey?: string }): Promise<KycReview> {
    this.assertTenant(ctx);
    const r = await this.latestKyc(ctx, p.partyId);
    if (!r) throw new Error('No KYC review found');
    if (!validateTransition(r.workflowStage, 'aml_screening')) {
      throw new Error(`Invalid transition from ${r.workflowStage} to aml_screening`);
    }

    // Do not accept screening results from caller; fetch from provider or fail
    const screeningUrl = this.getExternalScreeningUrl();
    if (!screeningUrl) {
      throw new Error('External screening provider not configured');
    }

    const party = await this.getParty(ctx, p.partyId);
    if (!party) throw new Error('Party not found');

    const payload = {
      serviceType: 'aml',
      nationalId: party.nationalIdBlindIndex,
      partyId: p.partyId,
      tenantId: ctx.tenantId,
      providerRequestId: p.providerRequestId,
      idempotencyKey: p.idempotencyKey,
    };

    let responsePayload: Record<string, any> | undefined;
    try {
      const res = await fetch(`${screeningUrl}/screen`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Screening service returned ${res.status}`);
      responsePayload = await res.json().catch(() => ({}));
    } catch (error: any) {
      this.logger.error(`AML screening provider error: ${error.message}`);
      throw new Error(`AML screening provider error: ${error.message}`);
    }

    const screeningResults = responsePayload ?? {};
    const risk = calcRisk(screeningResults);
    r.pepScreeningStatus = screeningResults.pep ? 'failed' : 'passed';
    r.sanctionsScreeningStatus = screeningResults.sanctions ? 'failed' : 'passed';
    r.adverseMediaStatus = screeningResults.adverseMedia ? 'failed' : 'passed';
    r.amlScreeningStatus = r.sanctionsScreeningStatus === 'failed'
      ? 'failed'
      : (r.pepScreeningStatus === 'failed' || r.adverseMediaStatus === 'failed')
        ? 'manual_review'
        : 'passed';
    r.screeningResults = {
      ...screeningResults,
      providerName: 'external-screening-provider',
      providerRequestId: p.providerRequestId,
      idempotencyKey: p.idempotencyKey,
    };
    r.screenedAt = new Date();
    r.riskScore = risk.score;
    r.riskLevel = risk.level;
    r.riskFactors = risk.factors;
    r.workflowStage = risk.level === 'high' || risk.level === 'critical' ? 'risk_assessment' : 'manual_review';
    r.updatedAt = new Date();
    await this.kycRepo.save(r);
    return r;
  }

  async escalateReview(ctx: ActorContext, p: { partyId: string; reason: string; escalatedTo: string; escalatedBy?: string }): Promise<KycReview> {
    this.assertTenant(ctx);
    const r = await this.latestKyc(ctx, p.partyId);
    if (!r) throw new Error('No KYC review found');
    if (!validateTransition(r.workflowStage, 'escalated')) {
      throw new Error(`Invalid transition from ${r.workflowStage} to escalated`);
    }
    r.workflowStage = 'escalated';
    r.escalationReason = p.reason;
    r.escalatedTo = p.escalatedTo;
    r.escalatedAt = new Date();
    if (p.escalatedBy) r.reviewerUserId = p.escalatedBy;
    r.updatedAt = new Date();
    await this.kycRepo.save(r);
    return r;
  }

  async listKycReviews(ctx: ActorContext, params: { partyId?: string; status?: string; workflowStage?: string; limit: number; offset: number }): Promise<{ rows: KycReview[]; total: number }> {
    this.assertTenant(ctx);
    const qb = this.kycRepo.createQueryBuilder('r');
    qb.andWhere('r.tenant_id = :tenantId', { tenantId: ctx.tenantId });
    if (params.partyId) qb.andWhere('r.party_id = :pid', { pid: params.partyId });
    if (params.status) qb.andWhere('r.status = :st', { st: params.status });
    if (params.workflowStage) qb.andWhere('r.workflow_stage = :ws', { ws: params.workflowStage });
    qb.orderBy('r.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  // AML Consent Management
  async grantAmlConsent(ctx: ActorContext, p: { partyId: string; consentType: string; validTo?: Date; grantedBy?: string; purpose?: string; legalBasis?: string; channel?: string; evidence?: Record<string, any> }): Promise<Party> {
    this.assertTenant(ctx);
    return await this.dataSource.transaction(async (manager) => {
      const partyRepo = manager.getRepository(Party);
      const consentRepo = manager.getRepository(ConsentRecord);
      const outboxPublisher = new OutboxPublisher(manager);
      const party = await partyRepo.findOne({ where: { tenantId: ctx.tenantId, partyId: p.partyId } });
      if (!party) throw new Error('Party not found');

      const previousRecord = await consentRepo.findOne({
        where: { tenantId: ctx.tenantId, partyId: p.partyId, consentType: p.consentType },
        order: { createdAt: 'DESC' },
      });

      party.amlConsentStatus = 'granted';
      party.amlConsentType = p.consentType;
      party.amlConsentGrantedAt = new Date();
      party.amlConsentRevokedAt = null;
      party.amlConsentValidTo = p.validTo || null;
      party.updatedAt = new Date();

      await partyRepo.save(party);

      const consentRecord = consentRepo.create({
        consentRecordId: uuidv4(),
        tenantId: ctx.tenantId,
        partyId: p.partyId,
        consentType: p.consentType,
        purpose: p.purpose || 'aml',
        legalBasis: p.legalBasis || 'legitimate_interest',
        status: 'granted',
        action: 'grant',
        actorId: p.grantedBy || ctx.userId || 'system',
        actorRole: ctx.roles?.[0] || 'unknown',
        channel: p.channel || 'api',
        evidence: p.evidence || null,
        revokeReason: null,
        validTo: p.validTo || null,
        version: (previousRecord?.version || 0) + 1,
        previousRecordId: previousRecord?.consentRecordId || null,
      });
      await consentRepo.save(consentRecord);

      await outboxPublisher.publish({
        topic: 'insurance.party.consent_granted',
        eventType: 'AmlConsentGranted',
        eventVersion: 1,
        correlationId: ctx.correlationId || p.partyId,
        subject: { partyId: p.partyId, tenantId: ctx.tenantId },
        payload: {
          partyId: p.partyId,
          tenantId: ctx.tenantId,
          consentType: p.consentType,
          grantedBy: p.grantedBy,
          purpose: p.purpose,
          validTo: p.validTo ? p.validTo.toISOString() : null,
          consentRecordId: consentRecord.consentRecordId,
        },
        producer: 'party-kyc-service',
      });

      return party;
    });
  }

  async revokeAmlConsent(ctx: ActorContext, p: { partyId: string; revokedBy?: string; reason?: string }): Promise<Party> {
    this.assertTenant(ctx);
    return await this.dataSource.transaction(async (manager) => {
      const partyRepo = manager.getRepository(Party);
      const consentRepo = manager.getRepository(ConsentRecord);
      const outboxPublisher = new OutboxPublisher(manager);
      const party = await partyRepo.findOne({ where: { tenantId: ctx.tenantId, partyId: p.partyId } });
      if (!party) throw new Error('Party not found');

      const previousRecord = await consentRepo.findOne({
        where: { tenantId: ctx.tenantId, partyId: p.partyId },
        order: { createdAt: 'DESC' },
      });
      const consentType = party.amlConsentType || 'aml';

      party.amlConsentStatus = 'revoked';
      party.amlConsentRevokedAt = new Date();
      party.updatedAt = new Date();

      await partyRepo.save(party);

      const consentRecord = consentRepo.create({
        consentRecordId: uuidv4(),
        tenantId: ctx.tenantId,
        partyId: p.partyId,
        consentType,
        purpose: previousRecord?.purpose || 'aml',
        legalBasis: previousRecord?.legalBasis || 'legitimate_interest',
        status: 'revoked',
        action: 'revoke',
        actorId: p.revokedBy || ctx.userId || 'system',
        actorRole: ctx.roles?.[0] || 'unknown',
        channel: previousRecord?.channel || 'api',
        evidence: previousRecord?.evidence || null,
        revokeReason: p.reason || null,
        validTo: previousRecord?.validTo || null,
        version: (previousRecord?.version || 0) + 1,
        previousRecordId: previousRecord?.consentRecordId || null,
      });
      await consentRepo.save(consentRecord);

      await outboxPublisher.publish({
        topic: 'insurance.party.consent_revoked',
        eventType: 'AmlConsentRevoked',
        eventVersion: 1,
        correlationId: ctx.correlationId || p.partyId,
        subject: { partyId: p.partyId, tenantId: ctx.tenantId },
        payload: {
          partyId: p.partyId,
          tenantId: ctx.tenantId,
          revokedBy: p.revokedBy,
          reason: p.reason,
          consentRecordId: consentRecord.consentRecordId,
        },
        producer: 'party-kyc-service',
      });

      return party;
    });
  }

  async checkAmlConsent(ctx: ActorContext, partyId: string): Promise<{ valid: boolean; status: string; expiresAt?: Date | null }> {
    this.assertTenant(ctx);
    const party = await this.partyRepo.findOne({ where: { tenantId: ctx.tenantId, partyId } });
    if (!party) return { valid: false, status: 'not_found' };

    if (party.amlConsentStatus === 'not_required') return { valid: true, status: 'not_required' };
    if (party.amlConsentStatus !== 'granted') return { valid: false, status: party.amlConsentStatus };

    if (party.amlConsentValidTo && new Date() > party.amlConsentValidTo) {
      return { valid: false, status: 'expired', expiresAt: party.amlConsentValidTo };
    }

    return { valid: true, status: 'granted', expiresAt: party.amlConsentValidTo };
  }

  async listConsentHistory(ctx: ActorContext, partyId: string, consentType?: string): Promise<ConsentRecord[]> {
    this.assertTenant(ctx);
    const qb = this.consentRepo.createQueryBuilder('c')
      .andWhere('c.tenant_id = :tenantId', { tenantId: ctx.tenantId })
      .andWhere('c.party_id = :partyId', { partyId })
      .orderBy('c.created_at', 'DESC');
    if (consentType) {
      qb.andWhere('c.consent_type = :consentType', { consentType });
    }
    return qb.getMany();
  }

  // Document Trust Chain
  async addToDocumentTrustChain(ctx: ActorContext, params: {
    partyId: string;
    documentId: string;
    documentType: string;
    uploadedBy: string;
    verificationMethod: string;
    hash: string;
  }): Promise<DocumentTrustChainEntry> {
    this.assertTenant(ctx);
    return await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(DocumentTrustChainEntry);
      const existingChain = await repo.find({
        where: { tenantId: ctx.tenantId, partyId: params.partyId },
        order: { chainPosition: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });
      const previousHash = existingChain.length > 0 ? existingChain[existingChain.length - 1].hash : undefined;
      const chainPosition = existingChain.length + 1;

      const entry = repo.create({
        entryId: uuidv4(),
        tenantId: ctx.tenantId,
        partyId: params.partyId,
        documentId: params.documentId,
        documentType: params.documentType,
        uploadedBy: params.uploadedBy,
        verified: false,
        verificationMethod: params.verificationMethod,
        trustLevel: 'low',
        hash: params.hash,
        previousHash: previousHash || null,
        chainPosition,
      });
      await repo.save(entry);
      return entry;
    });
  }

  async verifyDocumentInTrustChain(ctx: ActorContext, params: {
    partyId: string;
    documentId: string;
    verifiedBy: string;
    trustLevel: 'low' | 'medium' | 'high';
    reason?: string;
  }): Promise<DocumentTrustChainEntry> {
    this.assertTenant(ctx);
    const entry = await this.documentTrustChainRepo.findOne({
      where: { tenantId: ctx.tenantId, partyId: params.partyId, documentId: params.documentId },
    });
    if (!entry) throw new Error('Document not found in trust chain');

    entry.verified = true;
    entry.verifiedAt = new Date();
    entry.verifiedBy = params.verifiedBy;
    entry.trustLevel = params.trustLevel;
    await this.documentTrustChainRepo.save(entry);
    return entry;
  }

  async getDocumentTrustChain(ctx: ActorContext, partyId: string): Promise<DocumentTrustChainEntry[]> {
    this.assertTenant(ctx);
    return this.documentTrustChainRepo.find({
      where: { tenantId: ctx.tenantId, partyId },
      order: { chainPosition: 'ASC' },
    });
  }

  // Identity Proofing
  async performIdentityProofing(ctx: ActorContext, params: {
    partyId: string;
    nationalId: string;
    faceImage: string;
    documentImage: string;
    proofingMethod: string;
    authToken?: string | null;
  }): Promise<IdentityProofingRecord> {
    this.assertTenant(ctx);
    const proofingId = uuidv4();
    const identityUrl = this.getIdentityVerificationUrl();

    let faceMatchScore = 0;
    let faceMatch = false;
    let livenessCheck = false;
    let documentAuthenticity = false;

    if (identityUrl) {
      try {
        const fetchHeaders: Record<string, string> = { 'content-type': 'application/json' };
        if (params.authToken) fetchHeaders['authorization'] = `Bearer ${params.authToken}`;
        const res = await resilientFetch({
          url: `${identityUrl}/verify`,
          init: {
            method: 'POST',
            headers: fetchHeaders,
            body: JSON.stringify({
              faceImage: params.faceImage,
              documentImage: params.documentImage,
              nationalId: blindIndex(params.nationalId),
            }),
          },
          idempotencyKey: uuidv4(),
          retries: 2,
          timeoutMs: 15000,
          logger: this.logger,
        });
        if (res.ok) {
          const result: any = await res.json().catch(() => ({}));
          faceMatchScore = result.faceMatchScore ?? 0;
          faceMatch = result.faceMatch ?? false;
          livenessCheck = result.livenessCheck ?? false;
          documentAuthenticity = result.documentAuthenticity ?? false;
        } else {
          throw new Error(`Identity provider returned ${res.status}`);
        }
      } catch (error: any) {
        this.logger.error(`Identity verification service error: ${error.message}`);
        throw new Error(`Identity verification failed: ${error.message}`);
      }
    } else {
      throw new Error('Identity verification provider not configured');
    }

    const faceMatchThreshold = 85;
    faceMatch = faceMatch && faceMatchScore >= faceMatchThreshold;

    // Check for duplicates using blind index within tenant
    const dedupMatches = await this.partyRepo.find({
      where: { tenantId: ctx.tenantId, nationalIdBlindIndex: blindIndex(params.nationalId) },
    });
    const dedupMatchIds = dedupMatches.map(p => p.partyId).filter(id => id !== params.partyId);
    const dedupMatchFound = dedupMatchIds.length > 0;

    // Calculate confidence score
    const confidenceScore = (faceMatchScore * 0.4) + (livenessCheck ? 30 : 0) + (documentAuthenticity ? 30 : 0);

    // Determine status
    let status: 'passed' | 'failed' | 'manual_review' = 'passed';
    if (!faceMatch || !livenessCheck || !documentAuthenticity) {
      status = 'failed';
    } else if (dedupMatchFound) {
      status = 'manual_review';
    } else if (confidenceScore < 70) {
      status = 'manual_review';
    }

    const record = this.identityProofingRepo.create({
      proofingId,
      tenantId: ctx.tenantId,
      partyId: params.partyId,
      faceMatchScore,
      faceMatchThreshold,
      dedupMatchFound,
      dedupMatchIds,
      livenessCheck,
      documentAuthenticity,
      confidenceScore,
      status,
    });
    await this.identityProofingRepo.save(record);

    return record;
  }

  async getIdentityProofingResult(ctx: ActorContext, proofingId: string): Promise<IdentityProofingRecord | null> {
    this.assertTenant(ctx);
    return this.identityProofingRepo.findOne({ where: { tenantId: ctx.tenantId, proofingId } });
  }

  // External Verification Services
  async requestExternalVerification(ctx: ActorContext, params: {
    partyId: string;
    serviceType: 'sanctions' | 'pep' | 'adverse_media' | 'identity';
    requestPayload: Record<string, any>;
    authToken?: string | null;
    idempotencyKey?: string;
  }): Promise<ExternalVerificationRequestEntity> {
    this.assertTenant(ctx);
    const requestId = uuidv4();

    const screeningUrl = this.getExternalScreeningUrl();
    const status: ExternalVerificationRequestEntity['status'] = screeningUrl ? 'awaiting_provider' : 'failed';

    const request = this.externalVerificationRepo.create({
      requestId,
      tenantId: ctx.tenantId,
      partyId: params.partyId,
      serviceType: params.serviceType,
      requestPayload: params.requestPayload,
      status,
      providerName: screeningUrl ? 'external-screening-provider' : null,
    });
    await this.externalVerificationRepo.save(request);

    if (screeningUrl) {
      try {
        const fetchHeaders: Record<string, string> = { 'content-type': 'application/json' };
        if (params.authToken) fetchHeaders['authorization'] = `Bearer ${params.authToken}`;
        if (params.idempotencyKey) fetchHeaders['x-idempotency-key'] = params.idempotencyKey;
        const idempotencyKey = params.idempotencyKey || uuidv4();
        const res = await resilientFetch({
          url: `${screeningUrl}/screen`,
          init: {
            method: 'POST',
            headers: fetchHeaders,
            body: JSON.stringify({
              serviceType: params.serviceType,
              payload: params.requestPayload,
              idempotencyKey,
            }),
          },
          idempotencyKey,
          retries: 2,
          timeoutMs: 15000,
          logger: this.logger,
        });

        if (res.ok) {
          const responsePayload: any = await res.json().catch(() => ({}));
          request.status = 'completed';
          request.responsePayload = responsePayload;
          request.providerRequestId = responsePayload?.requestId || null;
          request.completedAt = new Date();
        } else {
          request.status = 'failed';
          request.errorMessage = `Screening service returned ${res.status}`;
          request.completedAt = new Date();
        }
      } catch (error: any) {
        request.status = 'failed';
        request.errorMessage = error.message || 'Unknown error';
        request.completedAt = new Date();
      }
    } else {
      request.errorMessage = 'No external screening URL configured';
      request.completedAt = new Date();
    }

    await this.externalVerificationRepo.save(request);
    return request;
  }

  async getExternalVerificationRequest(ctx: ActorContext, requestId: string): Promise<ExternalVerificationRequestEntity | null> {
    this.assertTenant(ctx);
    return this.externalVerificationRepo.findOne({ where: { tenantId: ctx.tenantId, requestId } });
  }

  // Exception Queue
  async raiseKycException(ctx: ActorContext, params: {
    partyId: string;
    kycReviewId: string;
    exceptionType: 'document_issue' | 'screening_failure' | 'consent_issue' | 'verification_timeout' | 'external_service_failure';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    raisedBy: string;
  }): Promise<KycExceptionEntity> {
    this.assertTenant(ctx);
    const exceptionId = uuidv4();

    const exception = this.kycExceptionRepo.create({
      exceptionId,
      tenantId: ctx.tenantId,
      partyId: params.partyId,
      kycReviewId: params.kycReviewId,
      exceptionType: params.exceptionType,
      severity: params.severity,
      description: params.description,
      raisedBy: params.raisedBy,
      status: 'pending',
    });
    await this.kycExceptionRepo.save(exception);
    return exception;
  }

  async assignKycException(ctx: ActorContext, params: {
    exceptionId: string;
    assignedTo: string;
  }): Promise<KycExceptionEntity> {
    this.assertTenant(ctx);
    const exception = await this.kycExceptionRepo.findOne({ where: { tenantId: ctx.tenantId, exceptionId: params.exceptionId } });
    if (!exception) throw new Error('Exception not found');

    exception.assignedTo = params.assignedTo;
    exception.status = 'in_progress';
    await this.kycExceptionRepo.save(exception);
    return exception;
  }

  async resolveKycException(ctx: ActorContext, params: {
    exceptionId: string;
    resolutionNotes: string;
    resolvedBy: string;
  }): Promise<KycExceptionEntity> {
    this.assertTenant(ctx);
    const exception = await this.kycExceptionRepo.findOne({ where: { tenantId: ctx.tenantId, exceptionId: params.exceptionId } });
    if (!exception) throw new Error('Exception not found');

    exception.resolutionNotes = params.resolutionNotes;
    exception.resolvedAt = new Date();
    exception.resolvedBy = params.resolvedBy;
    exception.status = 'resolved';
    await this.kycExceptionRepo.save(exception);
    return exception;
  }

  async escalateKycException(ctx: ActorContext, params: {
    exceptionId: string;
  }): Promise<KycExceptionEntity> {
    this.assertTenant(ctx);
    const exception = await this.kycExceptionRepo.findOne({ where: { tenantId: ctx.tenantId, exceptionId: params.exceptionId } });
    if (!exception) throw new Error('Exception not found');

    exception.status = 'escalated';
    await this.kycExceptionRepo.save(exception);
    return exception;
  }

  async listKycExceptions(ctx: ActorContext, params: {
    partyId?: string;
    status?: string;
    severity?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: KycExceptionEntity[]; total: number }> {
    this.assertTenant(ctx);
    const qb = this.kycExceptionRepo.createQueryBuilder('e');
    qb.andWhere('e.tenant_id = :tenantId', { tenantId: ctx.tenantId });

    if (params.partyId) {
      qb.andWhere('e.party_id = :partyId', { partyId: params.partyId });
    }
    if (params.status) {
      qb.andWhere('e.status = :status', { status: params.status });
    }
    if (params.severity) {
      qb.andWhere('e.severity = :severity', { severity: params.severity });
    }

    qb.orderBy('e.raised_at', 'DESC');
    qb.skip(params.offset).take(Math.min(params.limit, 200));

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  // SLA Enforcement (7 business days)
  async checkSlaCompliance(ctx: ActorContext, partyId: string): Promise<{ compliant: boolean; daysRemaining: number; dueDate: Date }> {
    this.assertTenant(ctx);
    const review = await this.latestKyc(ctx, partyId);
    if (!review) throw new Error('KYC review not found');

    const now = new Date();
    const dueDate = review.dueDate || addBusinessDays(review.createdAt, 7);
    const daysRemaining = now.getTime() > dueDate.getTime()
      ? -businessDaysBetween(dueDate, now)
      : businessDaysBetween(now, dueDate);

    const compliant = daysRemaining > 0;

    return { compliant, daysRemaining, dueDate };
  }

  async getOverdueReviews(ctx: ActorContext): Promise<KycReview[]> {
    this.assertTenant(ctx);
    const now = new Date();
    const pendingReviews = await this.kycRepo
      .createQueryBuilder('r')
      .where('r.tenant_id = :tenantId', { tenantId: ctx.tenantId })
      .andWhere('r.status = :status', { status: 'pending' })
      .getMany();

    return pendingReviews.filter((review) => {
      const dueDate = review.dueDate || addBusinessDays(review.createdAt, 7);
      return now.getTime() > dueDate.getTime() || businessDaysBetween(dueDate, now) > 0;
    });
  }

  // Issue 1.2: Link Party to Organization
  async linkPartyToOrganization(ctx: ActorContext, partyId: string, organizationId: string): Promise<Party> {
    this.assertTenant(ctx);
    const party = await this.partyRepo.findOne({ where: { tenantId: ctx.tenantId, partyId } });
    if (!party) throw new Error('Party not found');

    party.organizationId = organizationId;
    party.updatedAt = new Date();
    const saved = await this.partyRepo.save(party);

    await this.outboxPublisher.publish({
      topic: 'insurance.party.organization_linked',
      eventType: 'PartyOrganizationLinked',
      eventVersion: 1,
      correlationId: ctx.correlationId || partyId,
      subject: { partyId, tenantId: ctx.tenantId },
      payload: { partyId, tenantId: ctx.tenantId, organizationId },
      producer: 'party-kyc-service',
    }).catch(err => this.logger.error(`Failed to publish organization link event: ${err.message}`));

    return saved;
  }

  // Issue 2.1: Initiate broker-specific KYC workflow
  async initiateBrokerKyc(ctx: ActorContext, params: {
    partyId: string;
    licenseId?: string;
  }): Promise<KycReview> {
    this.assertTenant(ctx);
    const party = await this.partyRepo.findOne({ where: { tenantId: ctx.tenantId, partyId: params.partyId } });
    if (!party) throw new Error('Party not found');

    // Verify party has a broker role
    const roles = await this.roleAssignmentRepo.find({
      where: { tenantId: ctx.tenantId, partyId: params.partyId, status: 'active' },
    });
    const hasBrokerRole = roles.some(r =>
      r.roleType === 'BROKER' || r.roleType === 'AGENT' || r.roleType === 'SUB_AGENT' || r.roleType === 'MARKETER'
    );
    if (!hasBrokerRole) throw new Error('Party does not have a broker/agent role');

    // Get or create KYC review with broker type
    let review = await this.latestKyc(ctx, params.partyId);
    if (!review) {
      const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 7);
      review = this.kycRepo.create({
        kycReviewId: uuidv4(),
        tenantId: ctx.tenantId,
        partyId: params.partyId,
        status: 'pending',
        workflowStage: 'data_collection',
        dueDate,
        kycType: 'broker',
        licenseCheckStatus: 'not_started',
        backgroundCheckStatus: 'not_started',
        financialCheckStatus: 'not_started',
        amlScreeningStatus: 'not_started',
        documentStatus: 'not_submitted',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      review.kycType = 'broker';
      review.licenseId = params.licenseId || null;
      review.licenseCheckStatus = params.licenseId ? 'in_progress' : 'not_started';
      review.backgroundCheckStatus = 'not_started';
      review.financialCheckStatus = 'not_started';
      review.updatedAt = new Date();
    }

    if (params.licenseId) {
      review.licenseId = params.licenseId;
    }

    return await this.kycRepo.save(review);
  }

  // Issue 2.1: Update broker KYC check status
  async updateBrokerKycCheck(ctx: ActorContext, params: {
    partyId: string;
    checkType: 'license' | 'background' | 'financial';
    status: 'not_started' | 'in_progress' | 'passed' | 'failed' | 'manual_review';
    notes?: string;
  }): Promise<KycReview> {
    this.assertTenant(ctx);
    const review = await this.latestKyc(ctx, params.partyId);
    if (!review) throw new Error('No KYC review found for party');
    if (review.kycType !== 'broker') throw new Error('KYC review is not a broker-type review');

    const now = new Date();
    switch (params.checkType) {
      case 'license':
        review.licenseCheckStatus = params.status;
        if (params.status === 'passed' || params.status === 'failed') review.licenseVerifiedAt = now;
        break;
      case 'background':
        review.backgroundCheckStatus = params.status;
        if (params.status === 'passed' || params.status === 'failed') review.backgroundCheckedAt = now;
        break;
      case 'financial':
        review.financialCheckStatus = params.status;
        if (params.status === 'passed' || params.status === 'failed') review.financialCheckedAt = now;
        break;
    }

    // Auto-advance workflow if all broker checks pass
    if (review.licenseCheckStatus === 'passed' && review.backgroundCheckStatus === 'passed' && review.financialCheckStatus === 'passed') {
      if (review.amlScreeningStatus === 'passed') {
        review.workflowStage = 'risk_assessment';
      }
    }

    review.updatedAt = now;
    if (params.notes) {
      review.notes = review.notes ? `${review.notes}\n${params.checkType} check: ${params.notes}` : `${params.checkType} check: ${params.notes}`;
    }

    return await this.kycRepo.save(review);
  }

  // Issue 2.2: AML screening for commission transactions
  async screenCommissionTransaction(ctx: ActorContext, params: {
    partyId: string;
    transactionId: string;
    amount: number;
    currency?: string;
    authToken?: string | null;
  }): Promise<TransactionAmlScreening> {
    this.assertTenant(ctx);
    return await this.dataSource.transaction(async (manager) => {
      const screeningRepo = manager.getRepository(TransactionAmlScreening);
      const outboxPublisher = new OutboxPublisher(manager);

      const screening = screeningRepo.create({
        screeningId: uuidv4(),
        tenantId: ctx.tenantId,
        partyId: params.partyId,
        transactionType: 'commission',
        transactionId: params.transactionId,
        batchId: null,
        amount: params.amount,
        currency: params.currency || 'IRR',
        status: 'in_progress',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await screeningRepo.save(screening);

      // Perform AML screening
      const screeningUrl = this.getExternalScreeningUrl();
      if (screeningUrl) {
        try {
          const fetchHeaders: Record<string, string> = { 'content-type': 'application/json' };
          if (params.authToken) fetchHeaders['authorization'] = `Bearer ${params.authToken}`;
          const res = await resilientFetch({
            url: `${screeningUrl}/screen`,
            init: {
              method: 'POST',
              headers: fetchHeaders,
              body: JSON.stringify({
                serviceType: 'sanctions',
                payload: { partyId: params.partyId, transactionId: params.transactionId, amount: params.amount, currency: params.currency || 'IRR' },
                idempotencyKey: uuidv4(),
              }),
            },
            idempotencyKey: uuidv4(),
            retries: 2,
            timeoutMs: 15000,
            logger: this.logger,
          });

          if (res.ok) {
            const results: any = await res.json().catch(() => ({}));
            screening.screeningResults = results;
            screening.status = results.flagged ? 'failed' : 'passed';
            screening.riskLevel = results.riskLevel || 'low';
            screening.riskFactors = results.riskFactors || [];
          } else {
            screening.status = 'manual_review';
            screening.reviewNotes = `Screening service returned ${res.status}`;
          }
        } catch (error: any) {
          screening.status = 'manual_review';
          screening.reviewNotes = error.message;
        }
      } else {
        screening.status = 'manual_review';
        screening.reviewNotes = 'No external screening URL configured';
      }

      screening.screenedAt = new Date();
      await screeningRepo.save(screening);

      await outboxPublisher.publish({
        topic: 'insurance.aml.commission_screened',
        eventType: 'CommissionAmlScreened',
        eventVersion: 1,
        correlationId: ctx.correlationId || screening.screeningId,
        subject: { partyId: params.partyId, tenantId: ctx.tenantId },
        payload: {
          screeningId: screening.screeningId,
          partyId: params.partyId,
          transactionId: params.transactionId,
          status: screening.status,
          riskLevel: screening.riskLevel,
        },
        producer: 'party-kyc-service',
      });

      return screening;
    });
  }

  // Issue 2.3: AML screening for settlement batches
  async screenSettlementBatch(ctx: ActorContext, params: {
    batchId: string;
    items: Array<{ partyId: string; transactionId: string; amount: number; currency?: string }>;
    authToken?: string | null;
  }): Promise<{ batchId: string; results: TransactionAmlScreening[]; summary: { total: number; passed: number; failed: number; manualReview: number } }> {
    this.assertTenant(ctx);
    const results: TransactionAmlScreening[] = [];

    for (const item of params.items) {
      const screening = await this.screenCommissionTransaction(ctx, {
        partyId: item.partyId,
        transactionId: item.transactionId,
        amount: item.amount,
        currency: item.currency,
        authToken: params.authToken,
      });
      screening.batchId = params.batchId;
      await this.transactionAmlRepo.save(screening);
      results.push(screening);
    }

    const summary = {
      total: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      manualReview: results.filter(r => r.status === 'manual_review').length,
    };

    await this.outboxPublisher.publish({
      topic: 'insurance.aml.settlement_batch_screened',
      eventType: 'SettlementBatchAmlScreened',
      eventVersion: 1,
      correlationId: ctx.correlationId || params.batchId,
      subject: { batchId: params.batchId, tenantId: ctx.tenantId },
      payload: { batchId: params.batchId, ...summary },
      producer: 'party-kyc-service',
    }).catch(err => this.logger.error(`Failed to publish batch screening event: ${err.message}`));

    return { batchId: params.batchId, results, summary };
  }

  // Issue 3.1: Cross-organization consent management
  async grantCrossOrgConsent(ctx: ActorContext, params: {
    partyId: string;
    sourceOrganizationId: string;
    targetOrganizationId: string;
    consentType: string;
    purpose: string;
    legalBasis?: string;
    validTo?: Date;
    grantedBy?: string;
    channel?: string;
    evidence?: Record<string, any>;
  }): Promise<ConsentRecord> {
    this.assertTenant(ctx);
    return await this.dataSource.transaction(async (manager) => {
      const consentRepo = manager.getRepository(ConsentRecord);
      const outboxPublisher = new OutboxPublisher(manager);

      const previousRecord = await consentRepo.findOne({
        where: {
          tenantId: ctx.tenantId,
          partyId: params.partyId,
          consentType: params.consentType,
          targetOrganizationId: params.targetOrganizationId,
        },
        order: { createdAt: 'DESC' },
      });

      const record = consentRepo.create({
        consentRecordId: uuidv4(),
        tenantId: ctx.tenantId,
        partyId: params.partyId,
        consentType: params.consentType,
        purpose: params.purpose,
        legalBasis: params.legalBasis || 'consent',
        status: 'granted',
        action: 'grant',
        actorId: params.grantedBy || ctx.userId || 'system',
        actorRole: ctx.roles?.[0] || 'unknown',
        channel: params.channel || 'api',
        evidence: params.evidence || null,
        validTo: params.validTo || null,
        targetOrganizationId: params.targetOrganizationId,
        sourceOrganizationId: params.sourceOrganizationId,
        version: (previousRecord?.version || 0) + 1,
        previousRecordId: previousRecord?.consentRecordId || null,
      });
      await consentRepo.save(record);

      await outboxPublisher.publish({
        topic: 'insurance.party.cross_org_consent_granted',
        eventType: 'CrossOrgConsentGranted',
        eventVersion: 1,
        correlationId: ctx.correlationId || params.partyId,
        subject: { partyId: params.partyId, tenantId: ctx.tenantId },
        payload: {
          partyId: params.partyId,
          tenantId: ctx.tenantId,
          sourceOrganizationId: params.sourceOrganizationId,
          targetOrganizationId: params.targetOrganizationId,
          consentType: params.consentType,
          purpose: params.purpose,
          validTo: params.validTo?.toISOString() || null,
          consentRecordId: record.consentRecordId,
        },
        producer: 'party-kyc-service',
      });

      return record;
    });
  }

  async revokeCrossOrgConsent(ctx: ActorContext, params: {
    partyId: string;
    targetOrganizationId: string;
    consentType?: string;
    revokedBy?: string;
    reason?: string;
  }): Promise<ConsentRecord> {
    this.assertTenant(ctx);
    return await this.dataSource.transaction(async (manager) => {
      const consentRepo = manager.getRepository(ConsentRecord);
      const outboxPublisher = new OutboxPublisher(manager);

      const qb = consentRepo.createQueryBuilder('c')
        .andWhere('c.tenant_id = :tenantId', { tenantId: ctx.tenantId })
        .andWhere('c.party_id = :partyId', { partyId: params.partyId })
        .andWhere('c.target_organization_id = :targetOrgId', { targetOrgId: params.targetOrganizationId })
        .andWhere('c.status = :status', { status: 'granted' })
        .orderBy('c.created_at', 'DESC');

      if (params.consentType) {
        qb.andWhere('c.consent_type = :consentType', { consentType: params.consentType });
      }

      const latestGranted = await qb.getOne();
      if (!latestGranted) throw new Error('No active cross-org consent found');

      const record = consentRepo.create({
        consentRecordId: uuidv4(),
        tenantId: ctx.tenantId,
        partyId: params.partyId,
        consentType: latestGranted.consentType,
        purpose: latestGranted.purpose,
        legalBasis: latestGranted.legalBasis,
        status: 'revoked',
        action: 'revoke',
        actorId: params.revokedBy || ctx.userId || 'system',
        actorRole: ctx.roles?.[0] || 'unknown',
        channel: latestGranted.channel || 'api',
        evidence: latestGranted.evidence || null,
        revokeReason: params.reason || null,
        validTo: latestGranted.validTo || null,
        targetOrganizationId: params.targetOrganizationId,
        sourceOrganizationId: latestGranted.sourceOrganizationId,
        version: (latestGranted.version || 0) + 1,
        previousRecordId: latestGranted.consentRecordId,
      });
      await consentRepo.save(record);

      await outboxPublisher.publish({
        topic: 'insurance.party.cross_org_consent_revoked',
        eventType: 'CrossOrgConsentRevoked',
        eventVersion: 1,
        correlationId: ctx.correlationId || params.partyId,
        subject: { partyId: params.partyId, tenantId: ctx.tenantId },
        payload: {
          partyId: params.partyId,
          tenantId: ctx.tenantId,
          targetOrganizationId: params.targetOrganizationId,
          consentType: latestGranted.consentType,
          reason: params.reason,
          consentRecordId: record.consentRecordId,
        },
        producer: 'party-kyc-service',
      });

      return record;
    });
  }

  async checkCrossOrgConsent(ctx: ActorContext, params: {
    partyId: string;
    targetOrganizationId: string;
    consentType?: string;
  }): Promise<{ valid: boolean; status: string; consentRecord?: ConsentRecord | null }> {
    this.assertTenant(ctx);
    const qb = this.consentRepo.createQueryBuilder('c')
      .andWhere('c.tenant_id = :tenantId', { tenantId: ctx.tenantId })
      .andWhere('c.party_id = :partyId', { partyId: params.partyId })
      .andWhere('c.target_organization_id = :targetOrgId', { targetOrgId: params.targetOrganizationId })
      .orderBy('c.created_at', 'DESC');

    if (params.consentType) {
      qb.andWhere('c.consent_type = :consentType', { consentType: params.consentType });
    }

    const latest = await qb.getOne();
    if (!latest) return { valid: false, status: 'not_found' };
    if (latest.status === 'revoked') return { valid: false, status: 'revoked', consentRecord: latest };
    if (latest.validTo && new Date() > latest.validTo) return { valid: false, status: 'expired', consentRecord: latest };

    return { valid: true, status: 'granted', consentRecord: latest };
  }

  // Issue 5.1: Bulk KYC review
  async bulkReviewKyc(ctx: ActorContext, params: {
    reviews: Array<{ partyId: string; decision: 'approved' | 'rejected'; notes?: string }>;
    reviewerUserId?: string | null;
  }): Promise<{ results: Array<{ partyId: string; success: boolean; error?: string; review?: KycReview }> }> {
    this.assertTenant(ctx);
    const results: Array<{ partyId: string; success: boolean; error?: string; review?: KycReview }> = [];

    for (const item of params.reviews) {
      try {
        const review = await this.reviewKyc(ctx, {
          partyId: item.partyId,
          decision: item.decision,
          reviewerUserId: params.reviewerUserId,
          notes: item.notes,
        });
        results.push({ partyId: item.partyId, success: true, review });
      } catch (error: any) {
        results.push({ partyId: item.partyId, success: false, error: error.message });
      }
    }

    return { results };
  }

  // Issue 5.2: Dedicated KYC history endpoint
  async getKycHistory(ctx: ActorContext, partyId: string, params?: {
    limit?: number;
    offset?: number;
  }): Promise<{ rows: KycReview[]; total: number }> {
    this.assertTenant(ctx);
    const limit = Math.min(params?.limit || 50, 200);
    const offset = params?.offset || 0;

    const qb = this.kycRepo.createQueryBuilder('r')
      .andWhere('r.tenant_id = :tenantId', { tenantId: ctx.tenantId })
      .andWhere('r.party_id = :partyId', { partyId })
      .orderBy('r.created_at', 'DESC')
      .skip(offset)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  // Issue 5.3: Escalate KYC exception to organization level
  async escalateKycExceptionToOrganization(ctx: ActorContext, params: {
    exceptionId: string;
    organizationId: string;
  }): Promise<KycExceptionEntity> {
    this.assertTenant(ctx);
    return await this.dataSource.transaction(async (manager) => {
      const exceptionRepo = manager.getRepository(KycExceptionEntity);
      const outboxPublisher = new OutboxPublisher(manager);

      const exception = await exceptionRepo.findOne({
        where: { tenantId: ctx.tenantId, exceptionId: params.exceptionId },
      });
      if (!exception) throw new Error('Exception not found');

      exception.status = 'escalated';
      exception.escalatedToOrganizationId = params.organizationId;
      if (!exception.organizationId) {
        exception.organizationId = params.organizationId;
      }
      await exceptionRepo.save(exception);

      await outboxPublisher.publish({
        topic: 'insurance.kyc.exception_escalated_to_org',
        eventType: 'KycExceptionEscalatedToOrg',
        eventVersion: 1,
        correlationId: ctx.correlationId || params.exceptionId,
        subject: { exceptionId: params.exceptionId, tenantId: ctx.tenantId },
        payload: {
          exceptionId: params.exceptionId,
          partyId: exception.partyId,
          organizationId: params.organizationId,
          exceptionType: exception.exceptionType,
          severity: exception.severity,
          description: exception.description,
        },
        producer: 'party-kyc-service',
      });

      return exception;
    });
  }

  // Issue 4.3: Get parties by organization for sales-network sync
  async getPartiesByOrganization(ctx: ActorContext, organizationId: string, params?: {
    roleType?: PartyRoleType;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ rows: Party[]; total: number }> {
    this.assertTenant(ctx);
    const limit = Math.min(params?.limit || 50, 200);
    const offset = params?.offset || 0;

    const qb = this.partyRepo.createQueryBuilder('p')
      .andWhere('p.tenant_id = :tenantId', { tenantId: ctx.tenantId })
      .andWhere('p.organization_id = :organizationId', { organizationId });

    if (params?.status) {
      qb.andWhere('p.status = :status', { status: params.status });
    }

    if (params?.roleType) {
      const roleSubQuery = this.roleAssignmentRepo.createQueryBuilder('r')
        .select('r.party_id')
        .where('r.tenant_id = :tenantId', { tenantId: ctx.tenantId })
        .andWhere('r.role_type = :roleType', { roleType: params.roleType })
        .andWhere('r.status = :roleStatus', { roleStatus: 'active' });
      qb.andWhere(`p.party_id IN (${roleSubQuery.getQuery()})`);
      qb.setParameters({ roleType: params.roleType });
    }

    qb.orderBy('p.created_at', 'DESC').skip(offset).take(limit);

    const [rows, total] = await qb.getManyAndCount();
    for (const row of rows) {
      if (row.nationalId) row.nationalId = this.decryptPii(row.nationalId);
      if (row.mobile) row.mobile = this.decryptPii(row.mobile);
    }
    return { rows, total };
  }
}
