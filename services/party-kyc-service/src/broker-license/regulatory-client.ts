import { Injectable } from '@nestjs/common';

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

@Injectable()
export class RegulatoryClient {
  private get baseUrl(): string {
    return process.env.REGULATORY_GATEWAY_URL || 'http://localhost:18024';
  }

  async validateBrokerLicense(input: BrokerLicenseValidationRequest): Promise<BrokerLicenseValidationResult> {
    const url = `${this.baseUrl}/reg/broker-license/validate`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      return { valid: false, status: 'not_found', brokerCentralCode: input.brokerCentralCode, licenseNumber: input.licenseNumber, reason: `Regulatory gateway returned ${res.status}` };
    }
    const json = await res.json();
    return json.data as BrokerLicenseValidationResult;
  }
}
