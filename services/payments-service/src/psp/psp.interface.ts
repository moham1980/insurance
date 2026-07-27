export interface IPspProvider {
  name: string;
  initiatePayment(params: {
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
  }): Promise<{
    success: boolean;
    paymentUrl?: string;
    providerRef?: string;
    railReference?: string;
    error?: string;
  }>;

  executePayment(params: {
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
  }): Promise<{
    success: boolean;
    paymentUrl?: string;
    providerRef?: string;
    railReference?: string;
    error?: string;
  }>;

  verifyCallback(params: {
    gatewayPaymentId: string;
    providerRef: string;
    status: string;
    signature?: string;
    rawResponse?: Record<string, any>;
  }): Promise<{
    verified: boolean;
    amount?: number;
    currency?: string;
    error?: string;
  }>;

  reconcile(params: {
    dateFrom: string;
    dateTo: string;
  }): Promise<{
    success: boolean;
    transactions?: Array<{
      providerRef: string;
      amount: number;
      currency: string;
      status: 'success' | 'failed' | 'pending';
      settledAt: string;
    }>;
    error?: string;
  }>;

  refund(params: {
    originalProviderRef: string;
    amount: number;
    reason?: string;
  }): Promise<{
    success: boolean;
    refundRef?: string;
    error?: string;
  }>;
}
