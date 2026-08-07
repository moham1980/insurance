import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CacheService } from '../cache.service';

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

  constructor(private readonly http: HttpService, private readonly cache: CacheService) {}

  // P2 #12: forward X-Correlation-Id from incoming request to downstream;
  // generate a new UUID if not present.
  private authHeaders(authToken: string, correlationId?: string): Record<string, string> {
    return {
      Authorization: authToken,
      'Content-Type': 'application/json',
      'x-correlation-id': correlationId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  // --- Auth (real auth-service integration) ---

  async initiateOtp(phoneNumber: string) {
    // No notification service running; return a reference for the phone number
    // The actual auth happens in verifyOtp via auth-service /login
    return { reference: phoneNumber, sent: true };
  }

  async verifyOtp(reference: string, code: string, tenantId: string, correlationId?: string) {
    // Authenticate against the real auth-service using phone number as username
    // and OTP code as password. This produces a real JWT token.
    const { data } = await firstValueFrom(
      this.http.post(`${this.authUrl}/login`, {
        username: reference,
        password: code,
      }, {
        headers: this.authHeaders('', correlationId),
      }),
    );
    return data;
  }

  // --- Session ---

  async getSession(authToken: string, correlationId?: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.authUrl}/auth/session`, {
        headers: this.authHeaders(authToken, correlationId),
      }),
    );
    return data;
  }

  // --- Policies ---

  async listPolicies(authToken: string, correlationId?: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.policyUrl}/policies`, {
        headers: this.authHeaders(authToken, correlationId),
      }),
    );
    return data;
  }

  async getPolicy(authToken: string, policyId: string, correlationId?: string) {
    // P2 #13: encode path params to prevent errors/injection
    const { data } = await firstValueFrom(
      this.http.get(`${this.policyUrl}/policies/${encodeURIComponent(policyId)}`, {
        headers: this.authHeaders(authToken, correlationId),
      }),
    );
    return data;
  }

  async endorsePolicy(authToken: string, policyId: string, body: any, correlationId?: string) {
    // P2 #13: encode path params to prevent errors/injection
    const { data } = await firstValueFrom(
      this.http.post(`${this.policyUrl}/policies/${encodeURIComponent(policyId)}/endorsement`, body, {
        headers: this.authHeaders(authToken, correlationId),
      }),
    );
    return data;
  }

  async scheduleRenewal(authToken: string, policyId: string, body: any, correlationId?: string) {
    // P2 #13: encode path params to prevent errors/injection
    const { data } = await firstValueFrom(
      this.http.post(`${this.policyUrl}/policies/${encodeURIComponent(policyId)}/renewal`, body, {
        headers: this.authHeaders(authToken, correlationId),
      }),
    );
    return data;
  }

  // --- Claims ---

  async listClaims(authToken: string, correlationId?: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.claimUrl}/claims`, {
        headers: this.authHeaders(authToken, correlationId),
      }),
    );
    return data;
  }

  async getClaim(authToken: string, claimId: string, correlationId?: string) {
    // P2 #13: encode path params to prevent errors/injection
    const { data } = await firstValueFrom(
      this.http.get(`${this.claimUrl}/claims/${encodeURIComponent(claimId)}`, {
        headers: this.authHeaders(authToken, correlationId),
      }),
    );
    return data;
  }

  async submitFnol(authToken: string, body: any, correlationId?: string) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.claimUrl}/claims/fnol`, body, {
        headers: this.authHeaders(authToken, correlationId),
      }),
    );
    return data;
  }

  // --- Payments ---

  async listPayments(authToken: string, correlationId?: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.billingUrl}/payments`, {
        headers: this.authHeaders(authToken, correlationId),
      }),
    );
    return data;
  }

  async getPayment(authToken: string, paymentId: string, correlationId?: string) {
    // P2 #13: encode path params to prevent errors/injection
    const { data } = await firstValueFrom(
      this.http.get(`${this.billingUrl}/payments/${encodeURIComponent(paymentId)}`, {
        headers: this.authHeaders(authToken, correlationId),
      }),
    );
    return data;
  }

  // --- Complaints ---

  async listComplaints(authToken: string, correlationId?: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.complaintsUrl}/complaints`, {
        headers: this.authHeaders(authToken, correlationId),
      }),
    );
    return data;
  }

  async createComplaint(authToken: string, body: any, correlationId?: string) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.complaintsUrl}/complaints`, body, {
        headers: this.authHeaders(authToken, correlationId),
      }),
    );
    return data;
  }

  // --- Brand Config (public, no auth) ---
  // Brand config is relatively static; cache to reduce downstream load.

  async getBrandConfig(brandKey: string, correlationId?: string) {
    const cacheKey = `brand-config:${brandKey}`;
    const cached = this.cache.get<any>(cacheKey);
    if (cached) return cached;
    // P2 #13: encode path params to prevent errors/injection
    const { data } = await firstValueFrom(
      this.http.get(`${this.authUrl}/brand-configs/${encodeURIComponent(brandKey)}`, {
        headers: this.authHeaders('', correlationId),
      }),
    );
    this.cache.set(cacheKey, data);
    return data;
  }

  // --- Product Categories (static lookup) ---

  async getProductCategories(correlationId?: string) {
    const cacheKey = 'product-categories';
    const cached = this.cache.get<any>(cacheKey);
    if (cached) return cached;
    // Delegate to product-service for the canonical category list
    const productUrl = process.env.PRODUCT_SERVICE_URL || 'http://localhost:18018';
    const { data } = await firstValueFrom(
      this.http.get(`${productUrl}/api/v1/product-categories`, {
        headers: this.authHeaders('', correlationId),
      }),
    ).catch(() => ({ data: [] }));
    this.cache.set(cacheKey, data);
    return data;
  }

  // --- FAQ (static lookup) ---

  async getFaq(correlationId?: string) {
    const cacheKey = 'faq';
    const cached = this.cache.get<any>(cacheKey);
    if (cached) return cached;
    // Delegate to knowledge-service for FAQ articles
    const knowledgeUrl = process.env.KNOWLEDGE_SERVICE_URL || 'http://localhost:18012';
    const { data } = await firstValueFrom(
      this.http.get(`${knowledgeUrl}/knowledge/articles`, {
        params: { category: 'faq', status: 'published', limit: 50 },
        headers: this.authHeaders('', correlationId),
      }),
    ).catch(() => ({ data: [] }));
    this.cache.set(cacheKey, data);
    return data;
  }

  // --- Consent (proxied to customer-360-service) ---

  async getCustomerIdFromSession(authToken: string, correlationId?: string): Promise<string | null> {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.authUrl}/auth/session`, {
          headers: this.authHeaders(authToken, correlationId),
        }),
      );
      return data?.data?.customerId || data?.customerId || null;
    } catch {
      return null;
    }
  }

  async listConsents(authToken: string, customerId: string, correlationId?: string) {
    // P2 #13: encode path params to prevent errors/injection
    const { data } = await firstValueFrom(
      this.http.get(`${this.customer360Url}/customer-360/${encodeURIComponent(customerId)}/consents`, {
        headers: this.authHeaders(authToken, correlationId),
      }),
    );
    return data;
  }

  async grantConsent(authToken: string, customerId: string, body: any, correlationId?: string) {
    // P2 #13: encode path params to prevent errors/injection
    const { data } = await firstValueFrom(
      this.http.post(`${this.customer360Url}/customer-360/${encodeURIComponent(customerId)}/consents`, body, {
        headers: this.authHeaders(authToken, correlationId),
      }),
    );
    return data;
  }

  async revokeConsent(authToken: string, customerId: string, consentId: string, reason?: string, correlationId?: string) {
    // P2 #13: encode path params to prevent errors/injection
    const { data } = await firstValueFrom(
      this.http.post(
        `${this.customer360Url}/customer-360/${encodeURIComponent(customerId)}/consents/${encodeURIComponent(consentId)}/revoke`,
        { reason },
        {
          headers: this.authHeaders(authToken, correlationId),
        },
      ),
    );
    return data;
  }
}
