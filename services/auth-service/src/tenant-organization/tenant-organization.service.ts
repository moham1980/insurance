import { Injectable, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Organization, LegalType, OrganizationStatus } from '../entities/Organization';
import { OrganizationCapability, OrganizationCapabilityType, OrganizationCapabilityStatus } from '../entities/OrganizationCapability';
import { OrganizationRelationship, RelationshipType, OrganizationRelationshipStatus } from '../entities/OrganizationRelationship';
import { SalesNetworkMembership, SalesNetworkRoleType, SalesNetworkMembershipStatus } from '../entities/SalesNetworkMembership';
import { Tenant, DeploymentMode, DataIsolation, TenantStatus } from '../entities/Tenant';
import { BrandConfig } from '../entities/BrandConfig';
import { AuditPersistenceService } from '@insurance/shared';

export interface ActorContext {
  userId: string;
  tenantId?: string;
  organizationId?: string;
  roles: string[];
  correlationId: string;
}

@Injectable()
export class TenantOrganizationService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(OrganizationCapability)
    private readonly capabilityRepo: Repository<OrganizationCapability>,
    @InjectRepository(OrganizationRelationship)
    private readonly relationshipRepo: Repository<OrganizationRelationship>,
    @InjectRepository(SalesNetworkMembership)
    private readonly membershipRepo: Repository<SalesNetworkMembership>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(BrandConfig)
    private readonly brandRepo: Repository<BrandConfig>,
    private readonly auditService: AuditPersistenceService,
  ) {}

  private ensureTenantScope(ctx: ActorContext, tenantId?: string) {
    if (!ctx.tenantId) return;
    if (tenantId && tenantId !== ctx.tenantId && !ctx.roles.includes('insurer_admin')) {
      throw new ForbiddenException('Cross-tenant access denied');
    }
  }

  async createOrganization(ctx: ActorContext, dto: any): Promise<Organization> {
    this.ensureTenantScope(ctx, dto.tenantId);
    const org = this.organizationRepo.create({
      organizationId: dto.organizationId || uuidv4(),
      tenantId: dto.tenantId,
      legalType: dto.legalType,
      nationalIdBlindIndex: dto.nationalIdBlindIndex,
      regulatoryCode: dto.regulatoryCode,
      country: dto.country,
      status: dto.status || 'active',
      legalAddress: dto.legalAddress || {},
    });
    const saved = await this.organizationRepo.save(org);
    if (ctx.tenantId) {
      await this.auditService.record({
        tenantId: ctx.tenantId,
        actorUserId: ctx.userId,
        action: 'create',
        resourceType: 'organization',
        resourceId: saved.organizationId,
        correlationId: ctx.correlationId,
        after: { organizationId: saved.organizationId, legalType: saved.legalType, status: saved.status },
      });
    }
    return saved;
  }

  async getOrganization(ctx: ActorContext, organizationId: string): Promise<Organization | null> {
    const org = await this.organizationRepo.findOne({ where: { organizationId } });
    if (!org) return null;
    return org;
  }

  async updateOrganization(ctx: ActorContext, organizationId: string, dto: any): Promise<Organization> {
    const org = await this.organizationRepo.findOne({ where: { organizationId } });
    if (!org) throw new NotFoundException('Organization not found');
    const before = { ...org };
    Object.assign(org, dto, { updatedAt: new Date() });
    const saved = await this.organizationRepo.save(org);
    if (ctx.tenantId) {
      await this.auditService.record({
        tenantId: ctx.tenantId,
        actorUserId: ctx.userId,
        action: 'update',
        resourceType: 'organization',
        resourceId: saved.organizationId,
        correlationId: ctx.correlationId,
        before: { legalType: before.legalType, status: before.status },
        after: { legalType: saved.legalType, status: saved.status },
      });
    }
    return saved;
  }

  async listCapabilities(ctx: ActorContext, organizationId: string, tenantId?: string): Promise<OrganizationCapability[]> {
    const where: any = { organizationId };
    if (tenantId) where.tenantId = tenantId;
    if (ctx.tenantId && !ctx.roles.includes('insurer_admin')) {
      where.tenantId = ctx.tenantId;
    }
    return this.capabilityRepo.find({ where });
  }

  async createCapability(ctx: ActorContext, organizationId: string, dto: any): Promise<OrganizationCapability> {
    this.ensureTenantScope(ctx, dto.tenantId);
    const existing = await this.capabilityRepo.find({
      where: { organizationId, tenantId: dto.tenantId, capability: dto.capability, status: 'active' },
    });
    const now = new Date();
    for (const cap of existing) {
      if (this.overlaps(cap.effectiveFrom, cap.effectiveTo, new Date(dto.effectiveFrom), dto.effectiveTo ? new Date(dto.effectiveTo) : undefined)) {
        throw new BadRequestException('Active capability overlap detected');
      }
    }
    const capability = this.capabilityRepo.create({
      capabilityId: dto.capabilityId || uuidv4(),
      organizationId,
      tenantId: dto.tenantId,
      capability: dto.capability,
      scope: dto.scope || [],
      bindingAuthorityProfileId: dto.bindingAuthorityProfileId,
      effectiveFrom: new Date(dto.effectiveFrom),
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      status: dto.status || 'active',
    });
    return this.capabilityRepo.save(capability);
  }

  async deleteCapability(ctx: ActorContext, organizationId: string, capabilityId: string): Promise<void> {
    const cap = await this.capabilityRepo.findOne({ where: { capabilityId, organizationId } });
    if (!cap) throw new NotFoundException('Capability not found');
    this.ensureTenantScope(ctx, cap.tenantId);
    cap.status = 'suspended';
    cap.effectiveTo = new Date();
    await this.capabilityRepo.save(cap);
  }

  async createRelationship(ctx: ActorContext, organizationId: string, dto: any): Promise<OrganizationRelationship> {
    this.ensureTenantScope(ctx, dto.tenantId);
    const validFrom = new Date(dto.validFrom);
    const validTo = dto.validTo ? new Date(dto.validTo) : null;
    if (validTo && validTo <= validFrom) {
      throw new BadRequestException('validTo must be after validFrom');
    }
    const rel = this.relationshipRepo.create({
      relationshipId: dto.relationshipId || uuidv4(),
      tenantId: dto.tenantId,
      sourceOrganizationId: dto.sourceOrganizationId || organizationId,
      targetOrganizationId: dto.targetOrganizationId,
      relationshipType: dto.relationshipType,
      distributionAgreementId: dto.distributionAgreementId,
      commissionRules: dto.commissionRules || null,
      productScope: dto.productScope || null,
      fieldAcl: dto.fieldAcl || null,
      validFrom,
      validTo,
      status: dto.status || 'draft',
    });
    const saved = await this.relationshipRepo.save(rel);
    if (ctx.tenantId) {
      await this.auditService.record({
        tenantId: ctx.tenantId,
        actorUserId: ctx.userId,
        action: 'create',
        resourceType: 'organization_relationship',
        resourceId: saved.relationshipId,
        correlationId: ctx.correlationId,
        after: { relationshipType: saved.relationshipType, distributionAgreementId: saved.distributionAgreementId, status: saved.status },
      });
    }
    return saved;
  }

  async listRelationships(ctx: ActorContext, organizationId: string): Promise<OrganizationRelationship[]> {
    const where: any = [
      { sourceOrganizationId: organizationId },
      { targetOrganizationId: organizationId },
    ];
    if (ctx.tenantId && !ctx.roles.includes('insurer_admin')) {
      where[0].tenantId = ctx.tenantId;
      where[1].tenantId = ctx.tenantId;
    }
    return this.relationshipRepo.find({ where });
  }

  async createTenant(ctx: ActorContext, dto: any): Promise<Tenant> {
    const tenant = this.tenantRepo.create({
      tenantId: dto.tenantId || uuidv4(),
      organizationId: dto.organizationId,
      deploymentMode: dto.deploymentMode || 'single_org',
      dataIsolation: dto.dataIsolation || 'row',
      primaryRegion: dto.primaryRegion,
      brandKey: dto.brandKey,
      status: dto.status || 'active',
    });
    return this.tenantRepo.save(tenant);
  }

  async listTenants(ctx: ActorContext): Promise<Tenant[]> {
    if (ctx.tenantId && !ctx.roles.includes('insurer_admin')) {
      return this.tenantRepo.find({ where: { tenantId: ctx.tenantId } });
    }
    return this.tenantRepo.find();
  }

  async updateBrand(ctx: ActorContext, tenantId: string, dto: any): Promise<BrandConfig> {
    this.ensureTenantScope(ctx, tenantId);
    let brand = await this.brandRepo.findOne({ where: { tenantId, brandKey: dto.brandKey } });
    if (!brand) {
      brand = this.brandRepo.create({
        brandConfigId: uuidv4(),
        tenantId,
        brandKey: dto.brandKey,
        displayNameFa: dto.displayNameFa,
        displayNameEn: dto.displayNameEn,
        primaryColor: dto.primaryColor,
        logoUrl: dto.logoUrl,
        faviconUrl: dto.faviconUrl,
        rtl: dto.rtl !== false,
        calendarType: dto.calendarType || 'jalali',
        defaultCurrency: dto.defaultCurrency || 'IRR',
        supportedLocales: dto.supportedLocales || ['fa', 'en'],
        defaultLanguage: dto.defaultLanguage || 'fa',
        supportPhone: dto.supportPhone,
        supportEmail: dto.supportEmail,
        smtpCredentialRef: dto.smtpCredentialRef,
        smsCredentialRef: dto.smsCredentialRef,
        domainAllowList: dto.domainAllowList || [],
      });
    } else {
      Object.assign(brand, dto, { updatedAt: new Date() });
    }
    return this.brandRepo.save(brand);
  }

  async getBrandByTenant(ctx: ActorContext, tenantId: string, brandKey?: string): Promise<BrandConfig | null> {
    this.ensureTenantScope(ctx, tenantId);
    if (brandKey) {
      return this.brandRepo.findOne({ where: { tenantId, brandKey } });
    }
    const tenant = await this.tenantRepo.findOne({ where: { tenantId } });
    if (!tenant?.brandKey) return null;
    return this.brandRepo.findOne({ where: { tenantId, brandKey: tenant.brandKey } });
  }

  async getBrandByDomain(domain: string): Promise<BrandConfig | null> {
    const brands = await this.brandRepo.find();
    return brands.find(b => b.domainAllowList.includes(domain)) || null;
  }

  async createSalesNetworkMembership(ctx: ActorContext, dto: any): Promise<SalesNetworkMembership> {
    this.ensureTenantScope(ctx, dto.tenantId);
    const validFrom = new Date(dto.validFrom);
    const validTo = dto.validTo ? new Date(dto.validTo) : null;
    if (validTo && validTo <= validFrom) {
      throw new BadRequestException('validTo must be after validFrom');
    }
    const membership = this.membershipRepo.create({
      membershipId: dto.membershipId || uuidv4(),
      organizationId: dto.organizationId,
      tenantId: dto.tenantId,
      partyId: dto.partyId,
      parentPartyId: dto.parentPartyId,
      roleType: dto.roleType,
      carrierOrganizationId: dto.carrierOrganizationId,
      scope: dto.scope || [],
      commissionRate: dto.commissionRate ?? null,
      commissionSplit: dto.commissionSplit || null,
      validFrom,
      validTo,
      status: dto.status || 'pending',
    });
    const saved = await this.membershipRepo.save(membership);
    if (ctx.tenantId) {
      await this.auditService.record({
        tenantId: ctx.tenantId,
        actorUserId: ctx.userId,
        action: 'create',
        resourceType: 'sales_network_membership',
        resourceId: saved.membershipId,
        correlationId: ctx.correlationId,
        after: { roleType: saved.roleType, partyId: saved.partyId, parentPartyId: saved.parentPartyId, commissionRate: saved.commissionRate, status: saved.status },
      });
    }
    return saved;
  }

  private overlaps(startA: Date, endA: Date | null | undefined, startB: Date, endB: Date | null | undefined): boolean {
    const aEnd = endA || new Date('9999-12-31T23:59:59Z');
    const bEnd = endB || new Date('9999-12-31T23:59:59Z');
    return startA <= bEnd && startB <= aEnd;
  }
}
