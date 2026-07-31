import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BrokerLicenseStatusChange } from './entities/BrokerLicenseStatusChange';

export interface BrokerLicenseValidationRequest {
  brokerCentralCode: string;
  licenseNumber: string;
  licenseType?: 'life' | 'non_life' | 'both';
  scope?: string[];
}

export interface BrokerLicenseValidationResult {
  valid: boolean;
  status: 'active' | 'suspended' | 'revoked' | 'expired' | 'not_found';
  brokerCentralCode: string;
  licenseNumber: string;
  expiresAt?: string;
  allowedLinesOfBusiness?: string[];
  reason?: string;
}

export interface BatchValidationResult {
  total: number;
  valid: number;
  invalid: number;
  results: BrokerLicenseValidationResult[];
}

export interface LicenseStatusChangePayload {
  brokerCentralCode: string;
  licenseNumber: string;
  previousStatus: string;
  newStatus: 'active' | 'suspended' | 'revoked' | 'expired';
  reason?: string;
  source?: string;
  expiryDate?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class LicenseValidationService {
  private readonly logger = new Logger(LicenseValidationService.name);

  constructor(
    @InjectRepository(BrokerLicenseStatusChange)
    private readonly statusChangeRepo: Repository<BrokerLicenseStatusChange>,
  ) {}

  async validate(input: BrokerLicenseValidationRequest): Promise<BrokerLicenseValidationResult> {
    const regulatoryApiUrl = process.env.REGULATORY_BROKER_API_URL;
    if (!regulatoryApiUrl) {
      return this.localValidation(input);
    }
    const res = await fetch(`${regulatoryApiUrl}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      return { valid: false, status: 'not_found', brokerCentralCode: input.brokerCentralCode, licenseNumber: input.licenseNumber, reason: `Regulatory API returned ${res.status}` };
    }
    return (await res.json()) as BrokerLicenseValidationResult;
  }

  async validateBatch(inputs: BrokerLicenseValidationRequest[]): Promise<BatchValidationResult> {
    const results: BrokerLicenseValidationResult[] = [];
    for (const input of inputs) {
      try {
        const result = await this.validate(input);
        results.push(result);
      } catch (error: any) {
        results.push({
          valid: false,
          status: 'not_found',
          brokerCentralCode: input.brokerCentralCode,
          licenseNumber: input.licenseNumber,
          reason: error.message || 'Validation failed',
        });
      }
    }
    const valid = results.filter((r) => r.valid).length;
    return {
      total: inputs.length,
      valid,
      invalid: results.length - valid,
      results,
    };
  }

  async handleStatusChangeWebhook(payload: LicenseStatusChangePayload): Promise<BrokerLicenseStatusChange> {
    const change = this.statusChangeRepo.create({
      brokerCentralCode: payload.brokerCentralCode,
      licenseNumber: payload.licenseNumber,
      previousStatus: payload.previousStatus,
      newStatus: payload.newStatus,
      reason: payload.reason || null,
      source: payload.source || 'sanhab-webhook',
      expiryDate: payload.expiryDate ? new Date(payload.expiryDate) : null,
      metadata: payload.metadata || null,
      authServiceNotified: false,
    });
    const saved = await this.statusChangeRepo.save(change);

    this.logger.warn(
      `License status change recorded: ${payload.brokerCentralCode}/${payload.licenseNumber} ${payload.previousStatus} -> ${payload.newStatus}`,
    );

    await this.syncWithAuthService(saved);
    return saved;
  }

  private async syncWithAuthService(change: BrokerLicenseStatusChange): Promise<void> {
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:8082';
    try {
      const res = await fetch(`${authServiceUrl}/api/v1/regulatory/license-status-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brokerCentralCode: change.brokerCentralCode,
          licenseNumber: change.licenseNumber,
          previousStatus: change.previousStatus,
          newStatus: change.newStatus,
          reason: change.reason,
          expiryDate: change.expiryDate?.toISOString() || null,
          source: change.source,
        }),
      });

      if (res.ok) {
        change.authServiceNotified = true;
        change.authServiceNotifiedAt = new Date();
        await this.statusChangeRepo.save(change);
        this.logger.log(`Auth-service notified of license status change for ${change.brokerCentralCode}`);
      } else {
        this.logger.error(`Auth-service sync failed: ${res.status}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to sync license status change with auth-service: ${error.message}`);
    }
  }

  async getStatusChangeHistory(brokerCentralCode?: string, limit: number = 50, offset: number = 0): Promise<{ rows: BrokerLicenseStatusChange[]; total: number }> {
    const qb = this.statusChangeRepo.createQueryBuilder('c');
    if (brokerCentralCode) {
      qb.andWhere('c.brokerCentralCode = :code', { code: brokerCentralCode });
    }
    qb.orderBy('c.createdAt', 'DESC').take(Math.min(limit, 200)).skip(offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  private localValidation(input: BrokerLicenseValidationRequest): BrokerLicenseValidationResult {
    const revokedList = (process.env.SIMULATED_REVOKED_LICENSES || '').split(',').map((s) => s.trim()).filter(Boolean);
    const key = `${input.brokerCentralCode}:${input.licenseNumber}`;
    if (revokedList.includes(key)) {
      return { valid: false, status: 'revoked', brokerCentralCode: input.brokerCentralCode, licenseNumber: input.licenseNumber, reason: 'License revoked in simulated registry' };
    }
    return {
      valid: true,
      status: 'active',
      brokerCentralCode: input.brokerCentralCode,
      licenseNumber: input.licenseNumber,
      allowedLinesOfBusiness: input.scope || [],
    };
  }
}
