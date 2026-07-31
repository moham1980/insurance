import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PartnerRegistration, PartnerStatus, RelationshipType } from './entities/PartnerRegistration';

export interface CreatePartnerDto {
  tenantId: string;
  organizationId: string;
  partnerTenantId: string;
  partnerOrganizationId: string;
  relationshipType: RelationshipType;
  mTlsCertSubject: string;
  allowedScopes: string[];
  allowedApis: string[];
  rateLimitRps?: number;
  validFrom: Date;
  validTo?: Date;
  distributionAgreementId?: string;
  tokenExchangeEndpoint?: string;
  partnerApiGatewayUrl?: string;
}

@Injectable()
export class PartnerGatewayService {
  private readonly logger = new Logger(PartnerGatewayService.name);

  constructor(
    @InjectRepository(PartnerRegistration)
    private readonly repo: Repository<PartnerRegistration>,
  ) {}

  async registerPartner(dto: CreatePartnerDto): Promise<PartnerRegistration> {
    const existing = await this.repo.findOne({
      where: { tenantId: dto.tenantId, partnerTenantId: dto.partnerTenantId },
    });
    if (existing) {
      throw new BadRequestException('Partner registration already exists for this tenant pair');
    }

    const partner = this.repo.create({
      partnerId: uuidv4(),
      tenantId: dto.tenantId,
      organizationId: dto.organizationId,
      partnerTenantId: dto.partnerTenantId,
      partnerOrganizationId: dto.partnerOrganizationId,
      relationshipType: dto.relationshipType,
      mTlsCertSubject: dto.mTlsCertSubject,
      allowedScopes: dto.allowedScopes || [],
      allowedApis: dto.allowedApis || [],
      rateLimitRps: dto.rateLimitRps || 100,
      status: 'active',
      validFrom: dto.validFrom,
      validTo: dto.validTo || null,
      distributionAgreementId: dto.distributionAgreementId || null,
      tokenExchangeEndpoint: dto.tokenExchangeEndpoint || null,
      partnerApiGatewayUrl: dto.partnerApiGatewayUrl || null,
    });
    return this.repo.save(partner);
  }

  async getPartner(partnerId: string): Promise<PartnerRegistration> {
    const partner = await this.repo.findOne({ where: { partnerId } });
    if (!partner) throw new NotFoundException('Partner not found');
    return partner;
  }

  async getPartnerByCertSubject(certSubject: string): Promise<PartnerRegistration | null> {
    return this.repo.findOne({ where: { mTlsCertSubject: certSubject, status: 'active' } });
  }

  async listPartners(tenantId: string): Promise<PartnerRegistration[]> {
    return this.repo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async updatePartner(partnerId: string, dto: Partial<CreatePartnerDto>): Promise<PartnerRegistration> {
    const partner = await this.getPartner(partnerId);
    if (dto.allowedScopes !== undefined) partner.allowedScopes = dto.allowedScopes;
    if (dto.allowedApis !== undefined) partner.allowedApis = dto.allowedApis;
    if (dto.rateLimitRps !== undefined) partner.rateLimitRps = dto.rateLimitRps;
    if (dto.validTo !== undefined) partner.validTo = dto.validTo;
    if (dto.tokenExchangeEndpoint !== undefined) partner.tokenExchangeEndpoint = dto.tokenExchangeEndpoint;
    if (dto.partnerApiGatewayUrl !== undefined) partner.partnerApiGatewayUrl = dto.partnerApiGatewayUrl;
    partner.updatedAt = new Date();
    return this.repo.save(partner);
  }

  async revokePartner(partnerId: string, reason: string): Promise<PartnerRegistration> {
    const partner = await this.getPartner(partnerId);
    partner.status = 'revoked';
    partner.revokedAt = new Date();
    partner.revokedReason = reason;
    return this.repo.save(partner);
  }

  async suspendPartner(partnerId: string): Promise<PartnerRegistration> {
    const partner = await this.getPartner(partnerId);
    partner.status = 'suspended';
    return this.repo.save(partner);
  }

  async activatePartner(partnerId: string): Promise<PartnerRegistration> {
    const partner = await this.getPartner(partnerId);
    partner.status = 'active';
    partner.revokedAt = null;
    partner.revokedReason = null;
    return this.repo.save(partner);
  }

  async validateAccess(
    certSubject: string,
    requestedApi: string,
    requestedScope: string,
  ): Promise<PartnerRegistration> {
    const partner = await this.getPartnerByCertSubject(certSubject);
    if (!partner) {
      throw new ForbiddenException('No active partner found for certificate subject');
    }
    if (partner.status !== 'active') {
      throw new ForbiddenException(`Partner status is ${partner.status}`);
    }
    const now = new Date();
    if (now < partner.validFrom) {
      throw new ForbiddenException('Partner registration not yet valid');
    }
    if (partner.validTo && now > partner.validTo) {
      throw new ForbiddenException('Partner registration expired');
    }
    if (partner.allowedApis.length > 0 && !partner.allowedApis.includes(requestedApi)) {
      throw new ForbiddenException(`API ${requestedApi} not allowed for this partner`);
    }
    if (partner.allowedScopes.length > 0 && !partner.allowedScopes.includes(requestedScope)) {
      throw new ForbiddenException(`Scope ${requestedScope} not allowed for this partner`);
    }
    return partner;
  }
}
