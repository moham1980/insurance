import * as jwt from 'jsonwebtoken';
import { IPspProvider } from './psp.interface';

/**
 * Bank Payment Provider
 * Integrates with the ecosystem bank's payment-service via EcosystemPaymentController.
 *
 * Endpoints (default base URL: http://localhost:8085/api/v1/ecosystem/payments):
 * - POST /initiate
 * - GET  /{paymentId}
 *
 * Environment variables:
 * - BANK_PAYMENT_SERVICE_URL: base URL of EcosystemPaymentController
 * - BANK_PAYMENT_API_KEY: optional API key
 * - BANK_PAYMENT_SERVICE_JWT: pre-signed service JWT (optional)
 * - JWT_SECRET: used to sign a service-to-service JWT when BANK_PAYMENT_SERVICE_JWT is not set
 * - BANK_PAYMENT_TIMEOUT_MS: request timeout (default: 30000)
 * - INSURANCE_PAYMENT_SOURCE_ACCOUNT_ID: default source (debit) account for claim payouts
 */
export class BankPaymentProvider implements IPspProvider {
  readonly name = 'bank';
  private baseUrl: string;
  private apiKey: string;
  private serviceJwt: string;
  private timeoutMs: number;
  private sourceAccountId: string;

  constructor() {
    this.baseUrl = (process.env.BANK_PAYMENT_SERVICE_URL || 'http://localhost:8085/api/v1/ecosystem/payments').replace(/\/$/, '');
    this.apiKey = process.env.BANK_PAYMENT_API_KEY || '';
    this.serviceJwt = process.env.BANK_PAYMENT_SERVICE_JWT || '';
    this.timeoutMs = parseInt(process.env.BANK_PAYMENT_TIMEOUT_MS || '30000', 10);
    this.sourceAccountId = process.env.INSURANCE_PAYMENT_SOURCE_ACCOUNT_ID || '1000000003';

    if (!this.baseUrl) {
      throw new Error('BANK_PAYMENT_SERVICE_URL must be configured for bank payment integration');
    }
  }

  private getHeaders(extra: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extra,
    };

    const token = this.serviceJwt || this.buildServiceToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (this.apiKey) {
      headers['X-Api-Key'] = this.apiKey;
    }

    return headers;
  }

  private buildServiceToken(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) return '';
    const issuer = process.env.IAM_ISSUER || 'http://localhost:8080';
    const audience = process.env.JWT_AUDIENCES || 'insurance-platform';
    return jwt.sign(
      {
        sub: 'payments-service',
        iss: issuer,
        aud: audience,
        scope: 'payments:write',
      },
      secret,
      { algorithm: 'HS256', expiresIn: '5m' }
    );
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await promise;
    } finally {
      clearTimeout(timeout);
    }
  }

  async initiatePayment(params: {
    gatewayPaymentId: string;
    amount: number;
    currency: string;
    description?: string;
    returnUrl?: string;
    cancelUrl?: string;
    fromAccountId?: string;
    toAccountId?: string;
    paymentType?: string;
    preferredRail?: string;
    reference?: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; paymentUrl?: string; providerRef?: string; railReference?: string; error?: string }> {
    try {
      const response = await this.withTimeout(
        fetch(`${this.baseUrl}/initiate`, {
          method: 'POST',
          headers: this.getHeaders({ 'X-Idempotency-Key': params.gatewayPaymentId }),
          body: JSON.stringify({
            fromAccountId: params.fromAccountId || this.sourceAccountId,
            toAccountId: params.toAccountId || null,
            amount: String(params.amount),
            currency: params.currency,
            paymentType: params.paymentType || 'TRANSFER',
            preferredRail: params.preferredRail,
            reference: params.reference || params.gatewayPaymentId,
            description: params.description || 'Insurance payment',
          }),
        })
      );

      if (!response.ok) {
        const errorBody = await response.text();
        return { success: false, error: `Bank payment initiation failed: ${response.status} ${errorBody}` };
      }

      const result = (await response.json()) as any;
      return {
        success: true,
        providerRef: result.paymentId || result.id || params.gatewayPaymentId,
        railReference: result.railReference || result.railReference || null,
        paymentUrl: result.paymentUrl || undefined,
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { success: false, error: 'Bank payment service timeout' };
      }
      return { success: false, error: `Bank payment initiation error: ${error.message}` };
    }
  }

  async executePayment(params: {
    gatewayPaymentId: string;
    amount: number;
    currency: string;
    description?: string;
    fromAccountId?: string;
    toAccountId?: string;
    paymentType?: string;
    preferredRail?: string;
    reference?: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; paymentUrl?: string; providerRef?: string; railReference?: string; error?: string }> {
    return this.initiatePayment(params);
  }

  async verifyCallback(params: {
    gatewayPaymentId: string;
    providerRef: string;
    status: string;
    signature?: string;
    rawResponse?: Record<string, any>;
  }): Promise<{ verified: boolean; amount?: number; currency?: string; error?: string }> {
    const paymentId = params.providerRef || params.gatewayPaymentId;
    try {
      const response = await this.withTimeout(
        fetch(`${this.baseUrl}/${encodeURIComponent(paymentId)}`, {
          method: 'GET',
          headers: this.getHeaders(),
        })
      );

      if (!response.ok) {
        return { verified: false, error: `Bank status check failed: ${response.status}` };
      }

      const result = (await response.json()) as any;
      const verified = result.status === 'SETTLED' || result.status === 'success';
      return {
        verified,
        amount: result.amount ? Number(result.amount) : undefined,
        currency: result.currency,
      };
    } catch (error: any) {
      return { verified: false, error: `Bank status check error: ${error.message}` };
    }
  }

  async reconcile(params: { dateFrom: string; dateTo: string }): Promise<{ success: boolean; transactions?: any[]; error?: string }> {
    return { success: false, error: 'Bank reconciliation endpoint not configured' };
  }

  async refund(params: { originalProviderRef: string; amount: number; reason?: string }): Promise<{ success: boolean; refundRef?: string; error?: string }> {
    return { success: false, error: 'Bank refund endpoint not configured' };
  }
}
