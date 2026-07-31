import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class InsurerBffService {
  private readonly logger = new Logger(InsurerBffService.name);

  private readonly policyUrl = process.env.POLICY_SERVICE_URL || 'http://localhost:18010';
  private readonly claimUrl = process.env.CLAIM_SERVICE_URL || 'http://localhost:18020';
  private readonly billingUrl = process.env.BILLING_SERVICE_URL || 'http://localhost:18030';

  constructor(private readonly http: HttpService) {}

  private authHeaders(authToken: string): Record<string, string> {
    return {
      Authorization: authToken,
      'Content-Type': 'application/json',
      'x-correlation-id': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  // --- Products / versions / rate tables ---

  async listProducts(authToken: string, params?: { limit?: number; offset?: number }) {
    const query: Record<string, string> = {};
    if (params?.limit) query.limit = String(params.limit);
    if (params?.offset) query.offset = String(params.offset);
    const { data } = await firstValueFrom(
      this.http.get(`${this.policyUrl}/api/v1/products`, { headers: this.authHeaders(authToken), params: query }),
    );
    return data;
  }

  async listRateTables(authToken: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.policyUrl}/api/v1/rate-tables`, { headers: this.authHeaders(authToken) }),
    );
    return data;
  }

  // --- Distribution agreements ---

  async listDistributionAgreements(authToken: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.policyUrl}/api/v1/distribution-agreements`, { headers: this.authHeaders(authToken) }),
    );
    return data;
  }

  // --- RFQ ---

  async listRfqs(authToken: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.policyUrl}/api/v1/rfqs`, { headers: this.authHeaders(authToken) }),
    );
    return data;
  }

  async processRfq(authToken: string, rfqId: string, body: any) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.policyUrl}/api/v1/rfqs/${rfqId}/process`, body, { headers: this.authHeaders(authToken) }),
    );
    return data;
  }

  // --- Claims & loss adjusters ---

  async listClaims(authToken: string, params?: { limit?: number; offset?: number }) {
    const query: Record<string, string> = {};
    if (params?.limit) query.limit = String(params.limit);
    if (params?.offset) query.offset = String(params.offset);
    const { data } = await firstValueFrom(
      this.http.get(`${this.claimUrl}/api/v1/claims`, { headers: this.authHeaders(authToken), params: query }),
    );
    return data;
  }

  async assignLossAdjuster(authToken: string, claimId: string, body: { lossAdjusterId: string }) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.claimUrl}/api/v1/claims/${claimId}/assign-loss-adjuster`, body, { headers: this.authHeaders(authToken) }),
    );
    return data;
  }

  // --- Settlements & broker performance ---

  async listSettlements(authToken: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.billingUrl}/api/v1/settlements`, { headers: this.authHeaders(authToken) }),
    );
    return data;
  }

  async listBrokerPerformance(authToken: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.billingUrl}/api/v1/broker-performance`, { headers: this.authHeaders(authToken) }),
    );
    return data;
  }

  // --- Regulatory reports ---

  async listRegulatoryReports(authToken: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.policyUrl}/api/v1/regulatory-reports`, { headers: this.authHeaders(authToken) }),
    );
    return data;
  }
}
