export interface PaymentAdapterRequest {
  tenantId: string;
  amount: string;
  currency: string;
  sourceAccount?: string;
  destinationAccount?: string;
  rail?: 'SATNA' | 'PAYA' | 'SHETAB';
  reference: string;
  description: string;
  idempotencyKey: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

export interface PaymentAdapterResponse {
  success: boolean;
  paymentId?: string;
  redirectUrl?: string;
  message?: string;
  errorCode?: string;
}

export interface PaymentVerificationAdapterResponse {
  success: boolean;
  status?: string;
  refId?: string;
  cardPan?: string;
  message?: string;
  errorCode?: string;
}

export interface PaymentAdapter {
  initiate(request: PaymentAdapterRequest): Promise<PaymentAdapterResponse>;
  verify(paymentId: string, tenantId: string): Promise<PaymentVerificationAdapterResponse>;
  name: string;
}
