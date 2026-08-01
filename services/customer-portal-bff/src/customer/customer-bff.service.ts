import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CustomerBffService {
  private readonly logger = new Logger(CustomerBffService.name);

  private readonly authUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:18001';
  private readonly policyUrl = process.env.POLICY_SERVICE_URL || 'http://localhost:18007';
  private readonly claimUrl = process.env.CLAIM_SERVICE_URL || 'http://localhost:18002';
  private readonly billingUrl = process.env.BILLING_SERVICE_URL || 'http://localhost:18004';
  private readonly notificationUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:18040';
  private readonly complaintsUrl = process.env.COMPLAINTS_SERVICE_URL || 'http://localhost:18013';
  private readonly customer360Url = process.env.CUSTOMER_360_SERVICE_URL || 'http://localhost:18050';

  constructor(private readonly http: HttpService) {}

  private authHeaders(authToken: string): Record<string, string> {
    return {
      Authorization: authToken,
      'Content-Type': 'application/json',
      'x-correlation-id': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  // --- Auth (real auth-service integration) ---

  async initiateOtp(phoneNumber: string) {
    // No notification service running; return a reference for the phone number
    // The actual auth happens in verifyOtp via auth-service /login
    return { reference: phoneNumber, sent: true };
  }

  async verifyOtp(reference: string, code: string, tenantId: string) {
    // Authenticate against the real auth-service using phone number as username
    // and OTP code as password. This produces a real JWT token.
    const { data } = await firstValueFrom(
      this.http.post(`${this.authUrl}/login`, {
        username: reference,
        password: code,
      }),
    );
    return data;
  }

  // --- Session ---

  async getSession(authToken: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.authUrl}/auth/session`, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  // --- Policies ---

  async listPolicies(authToken: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.policyUrl}/policies`, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async getPolicy(authToken: string, policyId: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.policyUrl}/policies/${policyId}`, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async endorsePolicy(authToken: string, policyId: string, body: any) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.policyUrl}/policies/${policyId}/endorsement`, body, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async scheduleRenewal(authToken: string, policyId: string, body: any) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.policyUrl}/policies/${policyId}/renewal`, body, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  // --- Claims ---

  async listClaims(authToken: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.claimUrl}/claims`, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async getClaim(authToken: string, claimId: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.claimUrl}/claims/${claimId}`, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async submitFnol(authToken: string, body: any) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.claimUrl}/claims/fnol`, body, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  // --- Payments ---

  async listPayments(authToken: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.billingUrl}/payments`, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async getPayment(authToken: string, paymentId: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.billingUrl}/payments/${paymentId}`, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  // --- Complaints ---

  async listComplaints(authToken: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.complaintsUrl}/complaints`, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async createComplaint(authToken: string, body: any) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.complaintsUrl}/complaints`, body, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  // --- Brand Config (public, no auth) ---

  async getBrandConfig(brandKey: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.authUrl}/brand-configs/${brandKey}`),
    );
    return data;
  }

  // --- Consent (proxied to customer-360-service) ---

  async getCustomerIdFromSession(authToken: string): Promise<string | null> {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.authUrl}/auth/session`, {
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
      this.http.get(`${this.customer360Url}/customer-360/${customerId}/consents`, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async grantConsent(authToken: string, customerId: string, body: any) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.customer360Url}/customer-360/${customerId}/consents`, body, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async revokeConsent(authToken: string, customerId: string, consentId: string, reason?: string) {
    const { data } = await firstValueFrom(
      this.http.post(
        `${this.customer360Url}/customer-360/${customerId}/consents/${consentId}/revoke`,
        { reason },
        {
          headers: this.authHeaders(authToken),
        },
      ),
    );
    return data;
  }
}
