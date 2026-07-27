import { IPspProvider } from './psp.interface';

/**
 * Generic Iran PSP Provider Skeleton
 * Adapt for specific providers: Mellat, Asan Pardakht, Saderat, Parsian, etc.
 *
 * Required env vars:
 * - PSP_BASE_URL
 * - PSP_MERCHANT_ID
 * - PSP_API_KEY
 * - PSP_TERMINAL_ID
 * - PSP_VERIFY_URL
 * - PSP_CALLBACK_SECRET (for HMAC verification)
 */
export class IranPspProvider implements IPspProvider {
  readonly name = 'iran-psp';
  private baseUrl: string;
  private merchantId: string;
  private apiKey: string;
  private terminalId: string;
  private verifyUrl: string;
  private callbackSecret: string;

  constructor() {
    this.baseUrl = process.env.PSP_BASE_URL || '';
    this.merchantId = process.env.PSP_MERCHANT_ID || '';
    this.apiKey = process.env.PSP_API_KEY || '';
    this.terminalId = process.env.PSP_TERMINAL_ID || '';
    this.verifyUrl = process.env.PSP_VERIFY_URL || '';
    this.callbackSecret = process.env.PSP_CALLBACK_SECRET || '';

    if (!this.baseUrl || !this.merchantId || !this.apiKey) {
      throw new Error('PSP_BASE_URL, PSP_MERCHANT_ID, and PSP_API_KEY must be configured for Iran PSP integration');
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Merchant-Id': this.merchantId,
      'X-Api-Key': this.apiKey,
    };
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
      const response = await fetch(`${this.baseUrl}/payment/initiate`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          orderId: params.gatewayPaymentId,
          amount: params.amount,
          currency: params.currency,
          description: params.description || 'Insurance payment',
          returnUrl: params.returnUrl,
          cancelUrl: params.cancelUrl,
          terminalId: this.terminalId,
          reference: params.reference,
          metadata: params.metadata,
        }),
      });

      const data = (await response.json()) as any;
      if (!response.ok || !data.success) {
        return { success: false, error: data.error || `PSP initiate failed: ${response.status}` };
      }

      return {
        success: true,
        paymentUrl: data.paymentUrl,
        providerRef: data.providerRef || data.transactionId,
      };
    } catch (error: any) {
      return { success: false, error: `PSP initiate error: ${error.message}` };
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
    const initiateResult = await this.initiatePayment(params);
    if (!initiateResult.success) return initiateResult;

    const verifyResult = await this.verifyCallback({
      gatewayPaymentId: params.gatewayPaymentId,
      providerRef: initiateResult.providerRef || '',
      status: 'success',
      rawResponse: {},
    });

    if (!verifyResult.verified) {
      return { success: false, error: verifyResult.error || 'PSP execute verification failed' };
    }

    return initiateResult;
  }

  async verifyCallback(params: {
    gatewayPaymentId: string;
    providerRef: string;
    status: string;
    signature?: string;
    rawResponse?: Record<string, any>;
  }): Promise<{ verified: boolean; amount?: number; currency?: string; error?: string }> {
    // HMAC signature verification if callbackSecret is configured
    if (this.callbackSecret && params.signature) {
      const crypto = await import('crypto');
      const expected = crypto
        .createHmac('sha256', this.callbackSecret)
        .update(`${params.gatewayPaymentId}:${params.providerRef}:${params.status}`)
        .digest('hex');
      if (expected !== params.signature) {
        return { verified: false, error: 'Callback signature mismatch' };
      }
    }

    // Server-side verification with PSP
    try {
      const response = await fetch(`${this.verifyUrl || this.baseUrl + '/payment/verify'}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          orderId: params.gatewayPaymentId,
          providerRef: params.providerRef,
        }),
      });

      const data = (await response.json()) as any;
      if (!response.ok || !data.verified) {
        return { verified: false, error: data.error || `PSP verify failed: ${response.status}` };
      }

      return {
        verified: true,
        amount: data.amount,
        currency: data.currency,
      };
    } catch (error: any) {
      return { verified: false, error: `PSP verify error: ${error.message}` };
    }
  }

  async reconcile(params: { dateFrom: string; dateTo: string }): Promise<{ success: boolean; transactions?: any[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/reconciliation/report`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          merchantId: this.merchantId,
          terminalId: this.terminalId,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        }),
      });

      const data = (await response.json()) as any;
      if (!response.ok) {
        return { success: false, error: data.error || `PSP reconcile failed: ${response.status}` };
      }

      return { success: true, transactions: data.transactions || [] };
    } catch (error: any) {
      return { success: false, error: `PSP reconcile error: ${error.message}` };
    }
  }

  async refund(params: { originalProviderRef: string; amount: number; reason?: string }): Promise<{ success: boolean; refundRef?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/payment/refund`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          originalRef: params.originalProviderRef,
          amount: params.amount,
          reason: params.reason,
          merchantId: this.merchantId,
          terminalId: this.terminalId,
        }),
      });

      const data = (await response.json()) as any;
      if (!response.ok || !data.success) {
        return { success: false, error: data.error || `PSP refund failed: ${response.status}` };
      }

      return { success: true, refundRef: data.refundRef };
    } catch (error: any) {
      return { success: false, error: `PSP refund error: ${error.message}` };
    }
  }
}
