export interface IGatewayProvider {
  initiatePayment(params: {
    amount: number;
    currency: string;
    reference: string;
    description: string;
    returnUrl: string;
    cancelUrl: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; paymentUrl?: string; transactionId?: string; error?: string }>;

  verifyPayment(params: {
    transactionId: string;
    reference: string;
  }): Promise<{ success: boolean; verified: boolean; providerRef?: string; error?: string }>;
}
