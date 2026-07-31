import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { DistributionAgreement, DistributionAgreementStatus } from '../entities/DistributionAgreement';
import { CommissionTier } from '../entities/CommissionTier';
import { ReferralRule } from '../entities/ReferralRule';
import { ClawbackRule } from '../entities/ClawbackRule';
import { BonusTier } from '../entities/BonusTier';
import { MarkupRule } from '../entities/MarkupRule';
import { BindingAuthorityProfile, BindingAuthorityProfileStatus } from '../entities/BindingAuthorityProfile';
import { AgreementApproval, AgreementApprovalDecision } from '../entities/AgreementApproval';
import { AuthServiceClient } from './auth-service.client';
import { AuditPersistenceService, OutboxPublisher } from '@insurance/shared';
import { AuditRecord } from '@insurance/shared';
import type { AuditAction } from '@insurance/shared';

export interface SalesContext {
  tenantId: string;
  userId: string;
  roles: string[];
  organizationId?: string;
  correlationId: string;
}

@Injectable()
export class DistributionAgreementService {
  constructor(
    @InjectRepository(DistributionAgreement)
    private readonly agreementRepo: Repository<DistributionAgreement>,
    @InjectRepository(CommissionTier)
    private readonly tierRepo: Repository<CommissionTier>,
    @InjectRepository(ReferralRule)
    private readonly referralRepo: Repository<ReferralRule>,
    @InjectRepository(ClawbackRule)
    private readonly clawbackRepo: Repository<ClawbackRule>,
    @InjectRepository(BonusTier)
    private readonly bonusRepo: Repository<BonusTier>,
    @InjectRepository(MarkupRule)
    private readonly markupRepo: Repository<MarkupRule>,
    @InjectRepository(BindingAuthorityProfile)
    private readonly bindingProfileRepo: Repository<BindingAuthorityProfile>,
    @InjectRepository(AgreementApproval)
    private readonly approvalRepo: Repository<AgreementApproval>,
    private readonly authClient: AuthServiceClient,
    private readonly auditService: AuditPersistenceService,
  ) {}

  private assertTenant(ctx: SalesContext, tenantId: string) {
    if (ctx.tenantId !== tenantId && !ctx.roles.includes('insurer_admin')) {
      throw new ForbiddenException('Cross-tenant access denied');
    }
  }

  private async assertOrganizationCapability(organizationId: string, tenantId: string, capabilityType: string, authorization?: string) {
    const caps = await this.authClient.listCapabilities(organizationId, tenantId, authorization);
    const now = new Date();
    const hasCapability = caps.some((c) => {
      if (c.status !== 'active') return false;
      if (c.tenantId !== tenantId) return false;
      const from = c.effectiveFrom ? new Date(c.effectiveFrom) : now;
      const to = c.effectiveTo ? new Date(c.effectiveTo) : new Date('9999-12-31T23:59:59Z');
      return from <= now && now <= to && c.capability.toLowerCase() === capabilityType.toLowerCase();
    });
    if (!hasCapability) {
      throw new BadRequestException(`Organization ${organizationId} does not have ${capabilityType} capability`);
    }
  }

  async createAgreement(ctx: SalesContext, dto: any): Promise<DistributionAgreement> {
    this.assertTenant(ctx, dto.tenantId);
    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    if (effectiveTo && effectiveTo <= effectiveFrom) {
      throw new BadRequestException('effectiveTo must be after effectiveFrom');
    }

    const expectedCarrier = dto.agreementType === 'mga' ? 'MGA' : 'CARRIER';
    const expectedDistributor = ['brokerage', 'agency', 'mga'].includes(dto.agreementType) ? 'BROKER' : 'AGENCY';
    await this.assertOrganizationCapability(dto.carrierOrganizationId, dto.tenantId, expectedCarrier);
    await this.assertOrganizationCapability(dto.distributorOrganizationId, dto.tenantId, expectedDistributor);

    const activeOverlaps = await this.agreementRepo.find({
      where: {
        carrierOrganizationId: dto.carrierOrganizationId,
        distributorOrganizationId: dto.distributorOrganizationId,
        status: 'active',
      },
    });
    for (const a of activeOverlaps) {
      if (this.overlaps(a.effectiveFrom, a.effectiveTo, effectiveFrom, effectiveTo)) {
        const lob = dto.linesOfBusiness || [];
        if (lob.some((l: string) => a.linesOfBusiness.includes(l))) {
          throw new BadRequestException('Active agreement overlap for lineOfBusiness');
        }
      }
    }

    const agreementId = uuidv4();
    const agreement = this.agreementRepo.create({
      agreementId,
      tenantId: dto.tenantId,
      carrierOrganizationId: dto.carrierOrganizationId,
      distributorOrganizationId: dto.distributorOrganizationId,
      agreementType: dto.agreementType,
      version: dto.version || 1,
      effectiveFrom,
      effectiveTo,
      status: dto.status || 'draft',
      bindingAuthorityProfileId: dto.bindingAuthorityProfileId || null,
      versionChainId: agreementId,
      previousAgreementId: null,
      linesOfBusiness: dto.linesOfBusiness || [],
      productScope: dto.productScope || [],
      territories: dto.territories || [],
      bindingAuthorityAmountMinor: dto.bindingAuthority?.amountMinor || '0',
      bindingAuthorityCurrency: dto.bindingAuthority?.currency || 'IRR',
      settlementTerms: dto.settlementTerms || {},
      documentRefs: dto.documentRefs || [],
      approvalWorkflowId: dto.approvalWorkflowId || null,
    });
    const saved = await this.agreementRepo.save(agreement);
    await this.auditService.record({
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      action: 'create',
      resourceType: 'distribution_agreement',
      resourceId: saved.agreementId,
      correlationId: ctx.correlationId,
      after: { agreementId: saved.agreementId, carrierOrganizationId: saved.carrierOrganizationId, distributorOrganizationId: saved.distributorOrganizationId, status: saved.status, version: saved.version },
    });
    return saved;
  }

  async listAgreements(ctx: SalesContext, filters?: any): Promise<DistributionAgreement[]> {
    const where: any = { tenantId: ctx.tenantId };
    if (filters?.status) where.status = filters.status;
    if (filters?.carrierOrganizationId) where.carrierOrganizationId = filters.carrierOrganizationId;
    if (filters?.distributorOrganizationId) where.distributorOrganizationId = filters.distributorOrganizationId;
    return this.agreementRepo.find({ where });
  }

  async getAgreement(ctx: SalesContext, agreementId: string): Promise<DistributionAgreement | null> {
    return this.agreementRepo.findOne({ where: { agreementId } });
  }

  async activateAgreement(ctx: SalesContext, agreementId: string): Promise<DistributionAgreement> {
    const agreement = await this.agreementRepo.findOne({ where: { agreementId } });
    if (!agreement) throw new NotFoundException('Agreement not found');
    this.assertTenant(ctx, agreement.tenantId);
    if (agreement.status !== 'draft') throw new BadRequestException('Only draft agreements can be activated');
    if (!agreement.approvalWorkflowId) {
      throw new BadRequestException('Agreement must be approved before activation');
    }
    const now = new Date();
    if (agreement.effectiveFrom > now) {
      throw new BadRequestException('Agreement effectiveFrom is in the future');
    }
    if (agreement.effectiveTo && agreement.effectiveTo < now) {
      throw new BadRequestException('Agreement has already expired');
    }
    agreement.status = 'active';
    agreement.updatedAt = new Date();
    const saved = await this.agreementRepo.save(agreement);
    await this.auditService.record({
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      action: 'activate',
      resourceType: 'distribution_agreement',
      resourceId: saved.agreementId,
      correlationId: ctx.correlationId,
      before: { status: 'draft' },
      after: { status: 'active' },
    });
    return saved;
  }

  async createVersion(ctx: SalesContext, agreementId: string, dto: any): Promise<DistributionAgreement> {
    const agreement = await this.agreementRepo.findOne({ where: { agreementId } });
    if (!agreement) throw new NotFoundException('Agreement not found');
    this.assertTenant(ctx, agreement.tenantId);
    const newVersion = this.agreementRepo.create({
      agreementId: uuidv4(),
      tenantId: agreement.tenantId,
      carrierOrganizationId: agreement.carrierOrganizationId,
      distributorOrganizationId: agreement.distributorOrganizationId,
      agreementType: agreement.agreementType,
      version: agreement.version + 1,
      effectiveFrom: new Date(dto.effectiveFrom || new Date()),
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      status: 'draft',
      versionChainId: agreement.versionChainId || agreement.agreementId,
      previousAgreementId: agreement.agreementId,
      linesOfBusiness: dto.linesOfBusiness || agreement.linesOfBusiness,
      productScope: dto.productScope || agreement.productScope,
      territories: dto.territories || agreement.territories,
      bindingAuthorityAmountMinor: dto.bindingAuthority?.amountMinor || agreement.bindingAuthorityAmountMinor,
      bindingAuthorityCurrency: dto.bindingAuthority?.currency || agreement.bindingAuthorityCurrency,
      settlementTerms: dto.settlementTerms || agreement.settlementTerms,
      documentRefs: dto.documentRefs || agreement.documentRefs,
      approvalWorkflowId: dto.approvalWorkflowId || null,
    });
    return this.agreementRepo.save(newVersion);
  }

  async terminateAgreement(ctx: SalesContext, agreementId: string): Promise<DistributionAgreement> {
    const agreement = await this.agreementRepo.findOne({ where: { agreementId } });
    if (!agreement) throw new NotFoundException('Agreement not found');
    this.assertTenant(ctx, agreement.tenantId);
    agreement.status = 'terminated';
    agreement.effectiveTo = new Date();
    agreement.updatedAt = new Date();
    const saved = await this.agreementRepo.save(agreement);

    const outbox = new OutboxPublisher(this.agreementRepo.manager);
    await outbox.publish({
      topic: 'insurance.sales_network.events',
      eventType: 'DistributionAgreementTerminated',
      eventVersion: 1,
      correlationId: ctx.correlationId,
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
      dataClassification: 'INTERNAL',
      subject: { type: 'DistributionAgreement', id: agreementId },
      payload: {
        tenantId: agreement.tenantId,
        agreementId,
        carrierOrganizationId: agreement.carrierOrganizationId,
        distributorOrganizationId: agreement.distributorOrganizationId,
        terminatedBy: ctx.userId,
        terminatedAt: new Date().toISOString(),
      },
    });

    await this.auditService.record({
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      action: 'terminate',
      resourceType: 'distribution_agreement',
      resourceId: saved.agreementId,
      correlationId: ctx.correlationId,
      before: { status: 'active' },
      after: { status: 'terminated', effectiveTo: agreement.effectiveTo },
    });
    return saved;
  }

  async checkEligibility(ctx: SalesContext, agreementId: string, lineOfBusiness?: string, riskAmountMinor?: string): Promise<{ eligible: boolean; referral: boolean; agreement?: DistributionAgreement }> {
    const agreement = await this.agreementRepo.findOne({ where: { agreementId } });
    if (!agreement) return { eligible: false, referral: false };
    this.assertTenant(ctx, agreement.tenantId);
    const now = new Date();
    const baseEligible =
      agreement.status === 'active' &&
      agreement.effectiveFrom <= now &&
      (!agreement.effectiveTo || agreement.effectiveTo >= now) &&
      (!lineOfBusiness || agreement.linesOfBusiness.includes(lineOfBusiness) || agreement.linesOfBusiness.length === 0);

    if (!baseEligible) return { eligible: false, referral: false };

    // Check binding authority limits if profile is attached
    if (agreement.bindingAuthorityProfileId && lineOfBusiness) {
      const profile = await this.bindingProfileRepo.findOne({ where: { profileId: agreement.bindingAuthorityProfileId } });
      if (profile && profile.lineOfBusiness === lineOfBusiness && profile.status === 'active') {
        if (riskAmountMinor) {
          const risk = BigInt(riskAmountMinor);
          const maxPerRisk = BigInt(profile.perRiskAmountMinor);
          const maxAggregate = BigInt(profile.aggregateAmountMinor);
          if (risk > maxAggregate) {
            return { eligible: false, referral: false, agreement };
          }
          if (risk > maxPerRisk) {
            // Check referral threshold — if risk is within referral threshold, return referral
            if (profile.referralThresholdAmountMinor) {
              const referralThreshold = BigInt(profile.referralThresholdAmountMinor);
              if (risk <= referralThreshold) {
                return { eligible: false, referral: true, agreement };
              }
            }
            return { eligible: false, referral: !profile.autoBind, agreement };
          }
        }
      }
    }

    return { eligible: true, referral: false, agreement };
  }

  private overlaps(startA: Date, endA: Date | null, startB: Date, endB: Date | null): boolean {
    const aEnd = endA || new Date('9999-12-31T23:59:59Z');
    const bEnd = endB || new Date('9999-12-31T23:59:59Z');
    return startA <= bEnd && startB <= aEnd;
  }

  // --------------------------------------------------------------------------
  // P1-4 Binding Authority Profiles
  // --------------------------------------------------------------------------

  async createBindingAuthorityProfile(ctx: SalesContext, dto: any): Promise<BindingAuthorityProfile> {
    this.assertTenant(ctx, dto.tenantId);
    await this.assertOrganizationCapability(dto.carrierOrganizationId, dto.tenantId, 'CARRIER');

    const profile = this.bindingProfileRepo.create({
      profileId: uuidv4(),
      tenantId: dto.tenantId,
      carrierOrganizationId: dto.carrierOrganizationId,
      lineOfBusiness: dto.lineOfBusiness,
      perRiskAmountMinor: String(dto.perRiskAmountMinor || 0),
      perOccurrenceAmountMinor: String(dto.perOccurrenceAmountMinor || 0),
      aggregateAmountMinor: String(dto.aggregateAmountMinor || 0),
      currency: String(dto.currency || 'IRR'),
      autoBind: dto.autoBind === true,
      referralThresholdAmountMinor: dto.referralThresholdAmountMinor ? String(dto.referralThresholdAmountMinor) : null,
      referralThresholdCurrency: dto.referralThresholdCurrency || null,
      effectiveFrom: new Date(dto.effectiveFrom),
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      status: dto.status || 'draft',
      createdBy: ctx.userId,
    });
    const saved = await this.bindingProfileRepo.save(profile);
    await this.auditService.record({
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      action: 'create',
      resourceType: 'binding_authority_profile',
      resourceId: saved.profileId,
      correlationId: ctx.correlationId,
      after: { profileId: saved.profileId, carrierOrganizationId: saved.carrierOrganizationId, lineOfBusiness: saved.lineOfBusiness },
    });
    return saved;
  }

  async listBindingAuthorityProfiles(ctx: SalesContext, filters?: any): Promise<BindingAuthorityProfile[]> {
    const where: any = { tenantId: ctx.tenantId };
    if (filters?.carrierOrganizationId) where.carrierOrganizationId = filters.carrierOrganizationId;
    if (filters?.status) where.status = filters.status;
    if (filters?.lineOfBusiness) where.lineOfBusiness = filters.lineOfBusiness;
    return this.bindingProfileRepo.find({ where });
  }

  async getBindingAuthorityProfile(ctx: SalesContext, profileId: string): Promise<BindingAuthorityProfile | null> {
    const profile = await this.bindingProfileRepo.findOne({ where: { profileId } });
    if (profile) this.assertTenant(ctx, profile.tenantId);
    return profile;
  }

  async activateBindingAuthorityProfile(ctx: SalesContext, profileId: string): Promise<BindingAuthorityProfile> {
    const profile = await this.bindingProfileRepo.findOne({ where: { profileId } });
    if (!profile) throw new NotFoundException('Profile not found');
    this.assertTenant(ctx, profile.tenantId);
    if (profile.status !== 'draft') throw new BadRequestException('Only draft profiles can be activated');
    profile.status = 'active';
    profile.updatedAt = new Date();
    return this.bindingProfileRepo.save(profile);
  }

  // --------------------------------------------------------------------------
  // P1-4 Agreement Approvals
  // --------------------------------------------------------------------------

  async submitForApproval(ctx: SalesContext, agreementId: string, dto: any): Promise<DistributionAgreement> {
    return await this.agreementRepo.manager.transaction(async (manager) => {
      const agreement = await manager.findOne(DistributionAgreement, { where: { agreementId } });
      if (!agreement) throw new NotFoundException('Agreement not found');
      this.assertTenant(ctx, agreement.tenantId);
      if (agreement.status !== 'draft') throw new BadRequestException('Only draft agreements can be submitted for approval');

      // Validate binding authority profile if attached
      if (agreement.bindingAuthorityProfileId) {
        const profile = await manager.findOne(BindingAuthorityProfile, { where: { profileId: agreement.bindingAuthorityProfileId } });
        if (!profile) throw new BadRequestException('Binding authority profile not found');
        if (profile.status !== 'active') throw new BadRequestException('Binding authority profile must be active');
        if (!agreement.linesOfBusiness.includes(profile.lineOfBusiness)) {
          throw new BadRequestException('Binding authority profile line of business not covered by agreement');
        }
      }

      agreement.status = 'pending_approval';
      agreement.updatedAt = new Date();
      const saved = await manager.save(agreement);

      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.sales_network.events',
        eventType: 'DistributionAgreementSubmittedForApproval',
        eventVersion: 1,
        correlationId: ctx.correlationId,
        tenantId: ctx.tenantId,
        organizationId: ctx.organizationId,
        dataClassification: 'INTERNAL',
        subject: { type: 'DistributionAgreement', id: agreementId },
        payload: {
          tenantId: agreement.tenantId,
          agreementId,
          carrierOrganizationId: agreement.carrierOrganizationId,
          distributorOrganizationId: agreement.distributorOrganizationId,
          submittedBy: ctx.userId,
          submittedAt: new Date().toISOString(),
        },
      });

      await this.auditService.record({
        tenantId: ctx.tenantId,
        actorUserId: ctx.userId,
        action: 'update',
        resourceType: 'distribution_agreement',
        resourceId: saved.agreementId,
        correlationId: ctx.correlationId,
        before: { status: 'draft' },
        after: { status: 'pending_approval' },
      });

      return saved;
    });
  }

  async decideApproval(ctx: SalesContext, agreementId: string, decision: AgreementApprovalDecision, dto: any): Promise<DistributionAgreement> {
    return await this.agreementRepo.manager.transaction(async (manager) => {
      const agreement = await manager.findOne(DistributionAgreement, { where: { agreementId } });
      if (!agreement) throw new NotFoundException('Agreement not found');
      this.assertTenant(ctx, agreement.tenantId);
      if (agreement.status !== 'pending_approval') throw new BadRequestException('Agreement is not pending approval');

      // SoD: approver cannot be the same person who created the agreement
      const createAudit = await manager.findOne(AuditRecord, {
        where: { resourceType: 'distribution_agreement', resourceId: agreementId, action: 'create' },
        order: { createdAt: 'ASC' },
      });
      if (createAudit && createAudit.actorUserId === ctx.userId) {
        throw new ForbiddenException('Separation of Duties: the approver cannot be the same person who created the agreement');
      }

      const authorityProfileId = agreement.bindingAuthorityProfileId;
      let authorityProfileSnapshot: Record<string, any> | null = null;
      if (authorityProfileId) {
        const profile = await manager.findOne(BindingAuthorityProfile, { where: { profileId: authorityProfileId } });
        if (profile) {
          authorityProfileSnapshot = {
            profileId: profile.profileId,
            perRiskAmountMinor: profile.perRiskAmountMinor,
            perOccurrenceAmountMinor: profile.perOccurrenceAmountMinor,
            aggregateAmountMinor: profile.aggregateAmountMinor,
            currency: profile.currency,
            lineOfBusiness: profile.lineOfBusiness,
          };
        }
      }

      const approval = manager.create(AgreementApproval, {
        approvalId: uuidv4(),
        agreementId,
        tenantId: agreement.tenantId,
        approverOrganizationId: ctx.organizationId || null,
        approverUserId: ctx.userId,
        decision,
        reason: dto.reason || null,
        conditions: dto.conditions || null,
        authorityProfileSnapshot,
      });
      await manager.save(approval);

      if (decision === 'approved') {
        agreement.status = 'active';
        agreement.updatedAt = new Date();
      } else if (decision === 'rejected') {
        agreement.status = 'draft';
        agreement.updatedAt = new Date();
      } else if (decision === 'returned') {
        agreement.status = 'draft';
        agreement.updatedAt = new Date();
      }

      const saved = await manager.save(agreement);

      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.sales_network.events',
        eventType: decision === 'approved' ? 'DistributionAgreementApproved' : decision === 'rejected' ? 'DistributionAgreementRejected' : 'DistributionAgreementReturned',
        eventVersion: 1,
        correlationId: ctx.correlationId,
        tenantId: ctx.tenantId,
        organizationId: ctx.organizationId,
        dataClassification: 'INTERNAL',
        subject: { type: 'DistributionAgreement', id: agreementId },
        payload: {
          tenantId: agreement.tenantId,
          agreementId,
          decision,
          approverOrganizationId: ctx.organizationId,
          approverUserId: ctx.userId,
          reason: dto.reason,
          conditions: dto.conditions,
          approvedAt: approval.approvedAt.toISOString(),
        },
      });

      const auditAction: AuditAction = decision === 'approved' ? 'approve' : decision === 'rejected' ? 'reject' : 'update';
      await this.auditService.record({
        tenantId: ctx.tenantId,
        actorUserId: ctx.userId,
        action: auditAction,
        resourceType: 'distribution_agreement',
        resourceId: saved.agreementId,
        correlationId: ctx.correlationId,
        before: { status: 'pending_approval' },
        after: { status: saved.status },
      });

      return saved;
    });
  }

  async getAgreementApprovals(ctx: SalesContext, agreementId: string): Promise<AgreementApproval[]> {
    const agreement = await this.agreementRepo.findOne({ where: { agreementId } });
    if (!agreement) throw new NotFoundException('Agreement not found');
    this.assertTenant(ctx, agreement.tenantId);
    return this.approvalRepo.find({ where: { agreementId }, order: { approvedAt: 'DESC' } });
  }

  async getAgreementVersionHistory(ctx: SalesContext, agreementId: string): Promise<DistributionAgreement[]> {
    const agreement = await this.agreementRepo.findOne({ where: { agreementId } });
    if (!agreement) throw new NotFoundException('Agreement not found');
    this.assertTenant(ctx, agreement.tenantId);
    const chainId = agreement.versionChainId || agreement.agreementId;
    return this.agreementRepo.find({
      where: { versionChainId: chainId },
      order: { version: 'DESC' },
    });
  }

  async getBindingAuthorityForAgreement(ctx: SalesContext, agreementId: string): Promise<{ profile?: BindingAuthorityProfile | null; totalUsedMinor: string }> {
    const agreement = await this.agreementRepo.findOne({ where: { agreementId } });
    if (!agreement) throw new NotFoundException('Agreement not found');
    this.assertTenant(ctx, agreement.tenantId);
    const profile = agreement.bindingAuthorityProfileId
      ? await this.bindingProfileRepo.findOne({ where: { profileId: agreement.bindingAuthorityProfileId } })
      : null;
    // Total used is a simplified placeholder; a real implementation would aggregate bound premiums
    const totalUsedMinor = '0';
    return { profile, totalUsedMinor };
  }
}
