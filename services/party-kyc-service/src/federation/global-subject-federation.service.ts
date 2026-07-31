import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdentityLink } from '../entities/IdentityLink';
import { FederationConsentService, GrantConsentDto } from '../identity/federation-consent.service';

export interface GlobalSubjectProjection {
  globalSubjectId: string;
  targetTenantId: string;
  targetOrganizationId: string;
  blindIndex: string;
  verificationLevel: string;
  consentId: string;
}

@Injectable()
export class GlobalSubjectFederationService {
  private readonly logger = new Logger(GlobalSubjectFederationService.name);

  constructor(
    @InjectRepository(IdentityLink)
    private readonly identityLinkRepo: Repository<IdentityLink>,
    private readonly consentService: FederationConsentService,
  ) {}

  async createFederatedProjection(
    globalSubjectId: string,
    sourceTenantId: string,
    targetTenantId: string,
    targetOrganizationId: string,
    consentType: 'data_sharing' | 'cross_tenant_access' | 'pii_projection',
    dataCategories: string[],
    purpose: string,
    grantedBy: string,
  ): Promise<{ consentId: string; projection: GlobalSubjectProjection }> {
    const dto: GrantConsentDto = {
      globalSubjectId,
      sourceTenantId,
      targetTenantId,
      consentType,
      dataCategories,
      purpose,
    };
    const consent = await this.consentService.grantConsent(dto, grantedBy);

    const identityLinks = await this.identityLinkRepo.find({
      where: { globalSubjectId, tenantId: sourceTenantId, revokedAt: null as any },
    });

    if (identityLinks.length === 0) {
      this.logger.warn(`No active identity links found for global subject ${globalSubjectId}`);
    }

    const blindIndex = this.computeBlindIndex(globalSubjectId, targetTenantId);

    const projection: GlobalSubjectProjection = {
      globalSubjectId,
      targetTenantId,
      targetOrganizationId,
      blindIndex,
      verificationLevel: identityLinks[0]?.verificationLevel || 'none',
      consentId: consent.consentId,
    };

    this.logger.log(
      `Created federated projection for subject ${globalSubjectId} to tenant ${targetTenantId} with consent ${consent.consentId}`,
    );

    return { consentId: consent.consentId, projection };
  }

  async revokeFederatedProjection(
    consentId: string,
    revokedBy: string,
    reason: string,
  ): Promise<void> {
    await this.consentService.revokeConsent(consentId, revokedBy, reason);
    this.logger.log(`Revoked federated projection for consent ${consentId}`);
  }

  async checkFederationAccess(
    globalSubjectId: string,
    targetTenantId: string,
    dataCategory: string,
  ): Promise<{ allowed: boolean }> {
    const hasConsent = await this.consentService.checkConsent(
      globalSubjectId,
      targetTenantId,
      'data_sharing',
      dataCategory,
    );

    return { allowed: hasConsent };
  }

  private computeBlindIndex(globalSubjectId: string, tenantId: string): string {
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(`${globalSubjectId}:${tenantId}`)
      .digest('hex')
      .substring(0, 32);
  }
}
