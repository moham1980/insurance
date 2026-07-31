import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { BrokerLicense, BrokerLicenseStatus } from '../entities/BrokerLicense';
import { RegulatoryClient } from './regulatory-client';

export interface PartyKycContext {
  tenantId: string;
  userId: string;
  roles: string[];
  organizationId?: string;
  correlationId: string;
}

@Injectable()
export class BrokerLicenseService {
  constructor(
    @InjectRepository(BrokerLicense)
    private readonly licenseRepo: Repository<BrokerLicense>,
    private readonly regulatoryClient: RegulatoryClient,
  ) {}

  private assertTenant(ctx: PartyKycContext, tenantId?: string) {
    if (tenantId && ctx.tenantId !== tenantId && !ctx.roles.includes('insurer_admin')) {
      throw new ForbiddenException('Cross-tenant access denied');
    }
  }

  async createLicense(ctx: PartyKycContext, dto: any): Promise<BrokerLicense> {
    const issueDate = new Date(dto.issueDate);
    const expiryDate = new Date(dto.expiryDate);
    if (expiryDate <= issueDate) {
      throw new Error('expiryDate must be after issueDate');
    }
    const validation = await this.regulatoryClient.validateBrokerLicense({
      brokerCentralCode: dto.brokerCentralCode,
      licenseNumber: dto.licenseNumber,
      licenseType: dto.licenseType,
      scope: dto.scope || [],
    });
    const status: BrokerLicenseStatus = validation.valid
      ? (expiryDate < new Date() ? 'expired' : (dto.status || 'active'))
      : (validation.status as BrokerLicenseStatus) || 'suspended';
    const license = this.licenseRepo.create({
      licenseId: uuidv4(),
      tenantId: ctx.tenantId,
      partyId: dto.partyId,
      organizationId: dto.organizationId,
      brokerCentralCode: dto.brokerCentralCode,
      licenseNumber: dto.licenseNumber,
      licenseType: dto.licenseType,
      scope: dto.scope || [],
      issueDate,
      expiryDate,
      status,
      verifiedAt: validation.valid ? new Date() : null,
      verifiedBy: validation.valid ? 'regulatory-gateway' : null,
    });
    return this.licenseRepo.save(license);
  }

  async getLicense(ctx: PartyKycContext, licenseId: string): Promise<BrokerLicense | null> {
    return this.licenseRepo.findOne({ where: { licenseId } });
  }

  async verifyLicense(ctx: PartyKycContext, licenseId: string, dto: any): Promise<BrokerLicense> {
    const license = await this.licenseRepo.findOne({ where: { licenseId } });
    if (!license) throw new NotFoundException('License not found');
    // Re-verify with regulatory gateway
    const validation = await this.regulatoryClient.validateBrokerLicense({
      brokerCentralCode: license.brokerCentralCode,
      licenseNumber: license.licenseNumber,
      licenseType: license.licenseType,
      scope: license.scope || [],
    });

    if (validation.valid) {
      license.verifiedAt = new Date();
      license.verifiedBy = 'regulatory-gateway';
      if (license.expiryDate < new Date()) {
        license.status = 'expired';
      } else {
        license.status = 'active';
      }
    } else {
      license.verifiedAt = new Date();
      license.verifiedBy = 'regulatory-gateway';
      license.status = validation.status as BrokerLicenseStatus;
    }

    license.updatedAt = new Date();
    return this.licenseRepo.save(license);
  }

  async validateLicense(licenseId: string, lineOfBusiness?: string): Promise<{ valid: boolean; status: BrokerLicenseStatus | 'not_found'; reason?: string }> {
    const license = await this.licenseRepo.findOne({ where: { licenseId } });
    if (!license) return { valid: false, status: 'not_found', reason: 'License not found' };
    if (license.expiryDate < new Date()) return { valid: false, status: 'expired', reason: 'License expired' };
    if (license.status !== 'active') return { valid: false, status: license.status, reason: `License status is ${license.status}` };
    if (lineOfBusiness && license.scope && license.scope.length > 0 && !license.scope.includes(lineOfBusiness)) {
      return { valid: false, status: 'suspended', reason: 'License scope does not cover line of business' };
    }
    return { valid: true, status: 'active' };
  }
}
