export interface QuoteRequestPayload {
  submissionId: string;
  quoteRequestId: string;
  tenantId: string;
  carrierOrganizationId: string;
  productId: string;
  productVersion: number;
  lineOfBusiness: string;
  exposure: Record<string, any>;
  requestedDeductibles?: Record<string, any>[];
  effectiveFrom: Date;
  effectiveTo: Date;
  territory?: string | null;
  correlationId: string;
}

export interface QuoteResponsePayload {
  status: 'received' | 'expired' | 'error' | 'pending';
  carrierOrganizationId: string;
  quoteRequestId: string;
  submissionId: string;
  tenantId: string;
  premiumAmountMinor: string;
  premiumCurrency: string;
  basePremiumMinor?: string;
  taxesMinor?: string;
  feesMinor?: string;
  deductibleAmountMinor?: string;
  coverageSnapshot?: Record<string, any>[];
  quoteSnapshot?: Record<string, any>;
  comparisonFactors?: Record<string, any>;
  commissionRateBps?: number;
  commissionAmountMinor?: string;
  markupAmountMinor?: string;
  expiresAt?: Date;
  errorCode?: string;
  errorMessage?: string;
  errorDetail?: Record<string, any>;
  manualWorkItemId?: string;
}

export interface BindRequestPayload {
  placementId: string;
  submissionId: string;
  quoteResponseId: string;
  tenantId: string;
  carrierOrganizationId: string;
  brokerOrganizationId: string;
  premiumAmountMinor: string;
  premiumCurrency: string;
  effectiveFrom: Date;
  effectiveTo: Date;
  correlationId: string;
}

export interface BindResponsePayload {
  status: 'confirmed' | 'failed' | 'pending';
  policyId?: string;
  policyNumber?: string;
  errorCode?: string;
  errorMessage?: string;
  errorDetail?: Record<string, any>;
  manualWorkItemId?: string;
}

export interface ICarrierConnector {
  readonly connectorType: string;
  requestQuote(payload: QuoteRequestPayload, config: Record<string, any>): Promise<QuoteResponsePayload>;
  bind(payload: BindRequestPayload, config: Record<string, any>): Promise<BindResponsePayload>;
}
