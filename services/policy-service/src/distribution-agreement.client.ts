import { Injectable } from '@nestjs/common';
import { auditLogger } from './audit.logger';

export interface DistributionAgreementValidationResponse {
  valid: boolean;
  agreementId: string;
  status: 'active' | 'suspended' | 'expired' | 'terminated' | 'not_found';
  distributionOrganizationId: string;
  issuerOrganizationId: string;
  allowedLinesOfBusiness: string[];
  commissionRate?: number;
  commissionSplit?: Record<string, any>;
  validFrom?: string;
  validUntil?: string;
  reason?: string;
}

@Injectable()
export class DistributionAgreementClient {
  private get baseUrl(): string {
    return process.env.SALES_NETWORK_URL || process.env.PARTY_KYC_URL || 'http://localhost:18006';
  }

  async validateAgreement(params: {
    distributionOrganizationId: string;
    issuerOrganizationId: string;
    lineOfBusiness: string;
    productId?: string;
  }): Promise<DistributionAgreementValidationResponse> {
    const url = `${this.baseUrl}/api/v1/distribution-agreements/validate`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distributionOrganizationId: params.distributionOrganizationId,
          issuerOrganizationId: params.issuerOrganizationId,
          lineOfBusiness: params.lineOfBusiness,
          productId: params.productId,
        }),
      });

      if (!res.ok) {
        auditLogger.warn('policy.distribution_agreement.http_error', {
          url,
          status: res.status,
          distributionOrganizationId: params.distributionOrganizationId,
          issuerOrganizationId: params.issuerOrganizationId,
        });
        return {
          valid: false,
          agreementId: '',
          status: 'not_found',
          distributionOrganizationId: params.distributionOrganizationId,
          issuerOrganizationId: params.issuerOrganizationId,
          allowedLinesOfBusiness: [],
          reason: `Sales network service returned ${res.status}`,
        };
      }

      const json = await res.json();
      return json.data as DistributionAgreementValidationResponse;
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.warn('policy.distribution_agreement.fetch_failed', {
        url,
        errorMessage: err.message,
        distributionOrganizationId: params.distributionOrganizationId,
        issuerOrganizationId: params.issuerOrganizationId,
      });
      return {
        valid: false,
        agreementId: '',
        status: 'not_found',
        distributionOrganizationId: params.distributionOrganizationId,
        issuerOrganizationId: params.issuerOrganizationId,
        allowedLinesOfBusiness: [],
        reason: 'Distribution agreement service unreachable',
      };
    }
  }
}
