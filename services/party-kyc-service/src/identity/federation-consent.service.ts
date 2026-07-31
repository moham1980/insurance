import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { FederationConsent, ConsentStatus, ConsentType } from '../entities/FederationConsent';

export interface GrantConsentDto {
  globalSubjectId: string;
  sourceTenantId: string;
  targetTenantId: string;
  targetOrganizationId?: string;
  consentType: ConsentType;
  dataCategories: string[];
  purpose: string;
  expiresAt?: Date;
}

@Injectable()
export class FederationConsentService {
  private readonly logger = new Logger(FederationConsentService.name);

  constructor(
    @InjectRepository(FederationConsent)
    private readonly repo: Repository<FederationConsent>,
  ) {}

  async grantConsent(dto: GrantConsentDto, grantedBy: string): Promise<FederationConsent> {
    const existing = await this.repo.findOne({
      where: {
        globalSubjectId: dto.globalSubjectId,
        targetTenantId: dto.targetTenantId,
        consentType: dto.consentType,
        status: 'granted',
      },
    });
    if (existing) {
      return existing;
    }

    const consent = this.repo.create({
      consentId: uuidv4(),
      globalSubjectId: dto.globalSubjectId,
      sourceTenantId: dto.sourceTenantId,
      targetTenantId: dto.targetTenantId,
      targetOrganizationId: dto.targetOrganizationId || null,
      consentType: dto.consentType,
      dataCategories: dto.dataCategories || [],
      purpose: dto.purpose,
      status: 'granted',
      grantedAt: new Date(),
      expiresAt: dto.expiresAt || null,
      auditTrail: [{ action: 'granted', at: new Date().toISOString(), by: grantedBy }],
    });
    return this.repo.save(consent);
  }

  async revokeConsent(consentId: string, revokedBy: string, reason: string): Promise<FederationConsent> {
    const consent = await this.repo.findOne({ where: { consentId } });
    if (!consent) throw new NotFoundException('Consent not found');
    if (consent.status === 'revoked') {
      throw new BadRequestException('Consent already revoked');
    }
    consent.status = 'revoked';
    consent.revokedAt = new Date();
    consent.revokedReason = reason;
    consent.auditTrail = [...(consent.auditTrail || []), { action: 'revoked', at: new Date().toISOString(), by: revokedBy }];
    return this.repo.save(consent);
  }

  async checkConsent(
    globalSubjectId: string,
    targetTenantId: string,
    consentType: ConsentType,
    dataCategory?: string,
  ): Promise<boolean> {
    const consent = await this.repo.findOne({
      where: {
        globalSubjectId,
        targetTenantId,
        consentType,
        status: 'granted',
      },
      order: { grantedAt: 'DESC' },
    });
    if (!consent) return false;
    if (consent.expiresAt && new Date() > consent.expiresAt) {
      consent.status = 'expired';
      await this.repo.save(consent);
      return false;
    }
    if (dataCategory && consent.dataCategories.length > 0 && !consent.dataCategories.includes(dataCategory)) {
      return false;
    }
    return true;
  }

  async listConsents(globalSubjectId: string): Promise<FederationConsent[]> {
    return this.repo.find({
      where: { globalSubjectId },
      order: { grantedAt: 'DESC' },
    });
  }

  async getConsent(consentId: string): Promise<FederationConsent> {
    const consent = await this.repo.findOne({ where: { consentId } });
    if (!consent) throw new NotFoundException('Consent not found');
    return consent;
  }

  async enforceConsentBeforeProjection(
    globalSubjectId: string,
    targetTenantId: string,
    dataCategory: string,
  ): Promise<void> {
    const hasConsent = await this.checkConsent(globalSubjectId, targetTenantId, 'data_sharing', dataCategory);
    if (!hasConsent) {
      throw new ForbiddenException(`No valid consent for projecting ${dataCategory} to tenant ${targetTenantId}`);
    }
  }
}
