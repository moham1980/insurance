import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { BrokerLicenseStatus, LicenseStatus } from './entities/BrokerLicenseStatus';
import { Organization } from './entities/Organization';

export interface BrokerLicenseValidationResult {
  brokerCentralCode: string;
  licenseNumber: string;
  status: LicenseStatus;
  expiryDate: string | null;
  scope: string[];
  verifiedAt: string;
  source: string;
}

@Injectable()
export class RegulatoryIntegrationService {
  private readonly logger = new Logger(RegulatoryIntegrationService.name);

  constructor(
    @InjectRepository(BrokerLicenseStatus)
    private readonly licenseRepo: Repository<BrokerLicenseStatus>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    private readonly http: HttpService,
  ) {}

  async upsertLicenseStatus(
    organizationId: string,
    tenantId: string,
    data: {
      brokerCentralCode: string;
      licenseNumber: string;
      licenseType: 'life' | 'non_life' | 'both';
      status: LicenseStatus;
      expiryDate?: Date | null;
      scope?: string[];
      verificationSource?: string;
      suspensionReason?: string | null;
      metadata?: Record<string, any> | null;
    },
  ): Promise<BrokerLicenseStatus> {
    let existing = await this.licenseRepo.findOne({ where: { organizationId } });
    if (existing) {
      Object.assign(existing, {
        ...data,
        lastVerifiedAt: new Date(),
        lastVerificationSource: data.verificationSource || 'manual',
      });
      return this.licenseRepo.save(existing);
    }
    const created = this.licenseRepo.create({
      organizationId,
      tenantId,
      brokerCentralCode: data.brokerCentralCode,
      licenseNumber: data.licenseNumber,
      licenseType: data.licenseType,
      status: data.status,
      expiryDate: data.expiryDate || null,
      scope: data.scope || [],
      lastVerifiedAt: new Date(),
      lastVerificationSource: data.verificationSource || 'manual',
      suspensionReason: data.suspensionReason || null,
      metadata: data.metadata || null,
    });
    return this.licenseRepo.save(created);
  }

  async getLicenseStatus(organizationId: string): Promise<BrokerLicenseStatus> {
    const license = await this.licenseRepo.findOne({ where: { organizationId } });
    if (!license) {
      throw new NotFoundException('Broker license status not found for organization');
    }
    return license;
  }

  async validateBrokerLicense(
    organizationId: string,
    tenantId: string,
  ): Promise<BrokerLicenseValidationResult> {
    const regulatoryGatewayUrl = process.env.REGULATORY_GATEWAY_SERVICE_URL || 'http://localhost:18050';
    const license = await this.licenseRepo.findOne({ where: { organizationId } });
    if (!license) {
      throw new NotFoundException('Broker license status not found for organization');
    }

    try {
      const response = await firstValueFrom(
        this.http.post(
          `${regulatoryGatewayUrl}/api/v1/reg/broker-license/validate`,
          {
            brokerCentralCode: license.brokerCentralCode,
            licenseNumber: license.licenseNumber,
          },
          { headers: { 'Content-Type': 'application/json' } },
        ),
      );

      const result = response.data?.data || response.data;
      const validatedStatus: LicenseStatus = result.status || 'active';

      await this.upsertLicenseStatus(organizationId, tenantId, {
        brokerCentralCode: license.brokerCentralCode,
        licenseNumber: license.licenseNumber,
        licenseType: license.licenseType,
        status: validatedStatus,
        expiryDate: result.expiryDate ? new Date(result.expiryDate) : license.expiryDate,
        scope: result.scope || license.scope,
        verificationSource: 'regulatory-gateway',
        suspensionReason: validatedStatus === 'suspended' || validatedStatus === 'revoked'
          ? (result.suspensionReason || 'Suspended by regulatory authority')
          : null,
      });

      if (validatedStatus === 'suspended' || validatedStatus === 'revoked') {
        await this.suspendOrganization(organizationId, tenantId, `License ${validatedStatus} by regulatory authority`);
      }

      return {
        brokerCentralCode: license.brokerCentralCode,
        licenseNumber: license.licenseNumber,
        status: validatedStatus,
        expiryDate: result.expiryDate || license.expiryDate?.toISOString() || null,
        scope: result.scope || license.scope,
        verifiedAt: new Date().toISOString(),
        source: 'regulatory-gateway',
      };
    } catch (error: any) {
      this.logger.error(`Broker license validation failed for org ${organizationId}: ${error.message}`);
      throw error;
    }
  }

  async syncRegulatoryStatus(
    tenantId: string,
    options?: { organizationId?: string },
  ): Promise<{ synced: number; suspended: number; errors: number; details: any[] }> {
    const where: any = { tenantId };
    if (options?.organizationId) {
      where.organizationId = options.organizationId;
    }
    const licenses = await this.licenseRepo.find({ where });
    let synced = 0;
    let suspended = 0;
    let errors = 0;
    const details: any[] = [];

    for (const license of licenses) {
      try {
        const result = await this.validateBrokerLicense(license.organizationId, tenantId);
        synced++;
        if (result.status === 'suspended' || result.status === 'revoked') {
          suspended++;
        }
        details.push({
          organizationId: license.organizationId,
          brokerCentralCode: license.brokerCentralCode,
          status: result.status,
        });
      } catch (error: any) {
        errors++;
        details.push({
          organizationId: license.organizationId,
          brokerCentralCode: license.brokerCentralCode,
          error: error.message,
        });
      }
    }

    return { synced, suspended, errors, details };
  }

  async suspendOrganization(
    organizationId: string,
    tenantId: string,
    reason: string,
  ): Promise<void> {
    const org = await this.orgRepo.findOne({ where: { organizationId } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    org.status = 'suspended';
    await this.orgRepo.save(org);
    this.logger.warn(`Organization ${organizationId} suspended: ${reason}`);
  }

  async handleLicenseStatusChangeNotification(payload: {
    brokerCentralCode: string;
    licenseNumber: string;
    previousStatus: string;
    newStatus: string;
    reason?: string;
    expiryDate?: string | null;
    source?: string;
  }): Promise<{ updated: boolean; organizationSuspended: boolean }> {
    this.logger.warn(
      `License status change notification received: ${payload.brokerCentralCode}/${payload.licenseNumber} ${payload.previousStatus} -> ${payload.newStatus}`,
    );

    const license = await this.licenseRepo.findOne({
      where: { brokerCentralCode: payload.brokerCentralCode, licenseNumber: payload.licenseNumber },
    });

    if (!license) {
      this.logger.warn(
        `No license found for ${payload.brokerCentralCode}/${payload.licenseNumber} — status change notification ignored`,
      );
      return { updated: false, organizationSuspended: false };
    }

    const newStatus = payload.newStatus as LicenseStatus;
    license.status = newStatus;
    license.lastVerifiedAt = new Date();
    license.lastVerificationSource = payload.source || 'regulatory-gateway-push';
    if (payload.reason) {
      license.suspensionReason = payload.reason;
    }
    if (payload.expiryDate) {
      license.expiryDate = new Date(payload.expiryDate);
    }
    await this.licenseRepo.save(license);

    let organizationSuspended = false;
    if (newStatus === 'suspended' || newStatus === 'revoked') {
      try {
        await this.suspendOrganization(
          license.organizationId,
          license.tenantId,
          `License ${newStatus} by regulatory authority: ${payload.reason || 'No reason provided'}`,
        );
        organizationSuspended = true;
      } catch (err: any) {
        this.logger.error(
          `Failed to suspend organization ${license.organizationId} after license ${newStatus}: ${err.message}`,
        );
      }
    }

    return { updated: true, organizationSuspended };
  }
}
