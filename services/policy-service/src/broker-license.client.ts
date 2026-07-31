import { Injectable } from '@nestjs/common';

export interface BrokerLicenseValidationResponse {
  valid: boolean;
  status: 'active' | 'suspended' | 'revoked' | 'expired' | 'not_found';
  brokerCentralCode: string;
  licenseNumber: string;
  allowedLinesOfBusiness?: string[];
  reason?: string;
}

@Injectable()
export class BrokerLicenseClient {
  private get baseUrl(): string {
    return process.env.PARTY_KYC_URL || 'http://localhost:18006';
  }

  async validateLicense(licenseId: string, lineOfBusiness: string): Promise<BrokerLicenseValidationResponse> {
    const url = `${this.baseUrl}/api/v1/broker-licenses/${encodeURIComponent(licenseId)}/validate`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineOfBusiness }),
    });
    if (!res.ok) {
      return { valid: false, status: 'not_found', brokerCentralCode: '', licenseNumber: licenseId, reason: `Party/KYC returned ${res.status}` };
    }
    const json = await res.json();
    return json.data as BrokerLicenseValidationResponse;
  }
}
