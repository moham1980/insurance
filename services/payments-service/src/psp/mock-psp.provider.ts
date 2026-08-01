import { IPspProvider } from './psp.interface';

/**
 * MockPspProvider — Simulates payment gateway responses for demo environments.
 * No real external connections are made. All operations succeed instantly
 * with simulated provider references and settlement.
 *
 * Active when PSP_PROVIDER=mock (or when no other provider is configured).
 */
export class MockPspProvider implements IPspProvider {
  readonly name = 'mock';

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
    const providerRef = `MOCK-${params.gatewayPaymentId}-${Date.now()}`;
    return {
      success: true,
      providerRef,
      paymentUrl: `${params.returnUrl || ''}?mockRef=${encodeURIComponent(providerRef)}&status=success`,
    };
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
    const providerRef = `MOCK-EXEC-${params.gatewayPaymentId}-${Date.now()}`;
    return {
      success: true,
      providerRef,
      railReference: `RL-${Math.floor(Math.random() * 1000000)}`,
    };
  }

  async verifyCallback(params: {
    gatewayPaymentId: string;
    providerRef: string;
    status: string;
    signature?: string;
    rawResponse?: Record<string, any>;
  }): Promise<{ verified: boolean; amount?: number; currency?: string; error?: string }> {
    return {
      verified: true,
      amount: params.rawResponse?.amount,
      currency: params.rawResponse?.currency || 'IRR',
    };
  }

  async reconcile(params: { dateFrom: string; dateTo: string }): Promise<{ success: boolean; transactions?: any[]; error?: string }> {
    return { success: true, transactions: [] };
  }

  async refund(params: { originalProviderRef: string; amount: number; reason?: string }): Promise<{ success: boolean; refundRef?: string; error?: string }> {
    return {
      success: true,
      refundRef: `MOCK-REFUND-${Date.now()}`,
    };
  }
}
