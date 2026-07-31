import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CustomerBffService {
  private readonly logger = new Logger(CustomerBffService.name);

  private readonly authUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:18000';
  private readonly policyUrl = process.env.POLICY_SERVICE_URL || 'http://localhost:18010';
  private readonly claimUrl = process.env.CLAIM_SERVICE_URL || 'http://localhost:18020';
  private readonly billingUrl = process.env.BILLING_SERVICE_URL || 'http://localhost:18030';
  private readonly notificationUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:18040';
  private readonly customer360Url = process.env.CUSTOMER_360_SERVICE_URL || 'http://localhost:18050';

  constructor(private readonly http: HttpService) {}

  private authHeaders(authToken: string): Record<string, string> {
    return {
      Authorization: authToken,
      'Content-Type': 'application/json',
      'x-correlation-id': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  // --- OTP ---

  async initiateOtp(phoneNumber: string) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.notificationUrl}/api/v1/notifications/otp`, {
        recipient: phoneNumber,
        channel: 'SMS',
      }),
    );
    return data;
  }

  async verifyOtp(reference: string, code: string, tenantId: string) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.notificationUrl}/api/v1/notifications/otp/verify`, {
        reference,
        code,
        tenantId,
      }),
    );
    return data;
  }

  // --- Session ---

  async getSession(authToken: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.authUrl}/api/v1/auth/session`, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  // --- Policies ---

  async listPolicies(authToken: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.policyUrl}/api/v1/policies`, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async getPolicy(authToken: string, policyId: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.policyUrl}/api/v1/policies/${policyId}`, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async endorsePolicy(authToken: string, policyId: string, body: any) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.policyUrl}/api/v1/policies/${policyId}/endorsement`, body, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async scheduleRenewal(authToken: string, policyId: string, body: any) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.policyUrl}/api/v1/policies/${policyId}/renewal`, body, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  // --- Claims ---

  async listClaims(authToken: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.claimUrl}/api/v1/claims`, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async getClaim(authToken: string, claimId: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.claimUrl}/api/v1/claims/${claimId}`, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async submitFnol(authToken: string, body: any) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.claimUrl}/api/v1/claims/fnol`, body, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  // --- Payments ---

  async listPayments(authToken: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.billingUrl}/api/v1/payments`, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async getPayment(authToken: string, paymentId: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.billingUrl}/api/v1/payments/${paymentId}`, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  // --- Complaints ---

  async listComplaints(authToken: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.claimUrl}/api/v1/complaints`, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async createComplaint(authToken: string, body: any) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.claimUrl}/api/v1/complaints`, body, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  // --- Brand Config (public, no auth) ---

  async getBrandConfig(brandKey: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.authUrl}/api/v1/brand-configs/${brandKey}`),
    );
    return data;
  }

  // --- Consent (proxied to customer-360-service) ---

  async getCustomerIdFromSession(authToken: string): Promise<string | null> {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.authUrl}/api/v1/auth/session`, {
          headers: this.authHeaders(authToken),
        }),
      );
      return data?.data?.customerId || data?.customerId || null;
    } catch {
      return null;
    }
  }

  async listConsents(authToken: string, customerId: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.customer360Url}/api/v1/customer-360/${customerId}/consents`, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async grantConsent(authToken: string, customerId: string, body: any) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.customer360Url}/api/v1/customer-360/${customerId}/consents`, body, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async revokeConsent(authToken: string, customerId: string, consentId: string, reason?: string) {
    const { data } = await firstValueFrom(
      this.http.post(
        `${this.customer360Url}/api/v1/customer-360/${customerId}/consents/${consentId}/revoke`,
        { reason },
        {
          headers: this.authHeaders(authToken),
        },
      ),
    );
    return data;
  }
}
