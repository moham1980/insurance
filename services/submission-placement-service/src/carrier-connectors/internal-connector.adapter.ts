import { ICarrierConnector, QuoteRequestPayload, QuoteResponsePayload, BindRequestPayload, BindResponsePayload } from './carrier-connector.interface';
import { ProductServiceClient } from '../clients/product-service.client';

export class InternalConnectorAdapter implements ICarrierConnector {
  readonly connectorType = 'internal';

  constructor(private readonly productClient: ProductServiceClient) {}

  async requestQuote(payload: QuoteRequestPayload, config: Record<string, any>): Promise<QuoteResponsePayload> {
    let quoteResult: any;
    let data: any;

    try {
      quoteResult = await this.productClient.computeQuote(payload.tenantId, {
        productId: payload.productId,
        version: payload.productVersion,
        currency: config.currency || 'IRR',
        exposure: payload.exposure,
        region: payload.territory,
        effectiveDate: payload.effectiveFrom.toISOString(),
      });

      data = quoteResult?.data || quoteResult;
      if (!data || quoteResult?.success === false) {
        return {
          status: 'error',
          carrierOrganizationId: payload.carrierOrganizationId,
          quoteRequestId: payload.quoteRequestId,
          submissionId: payload.submissionId,
          tenantId: payload.tenantId,
          premiumAmountMinor: '0',
          premiumCurrency: config.currency || 'IRR',
          errorCode: 'QUOTE_FAILED',
          errorMessage: quoteResult?.error?.message || 'Product quote failed',
        };
      }
    } catch (e: any) {
      return {
        status: 'error',
        carrierOrganizationId: payload.carrierOrganizationId,
        quoteRequestId: payload.quoteRequestId,
        submissionId: payload.submissionId,
        tenantId: payload.tenantId,
        premiumAmountMinor: '0',
        premiumCurrency: config.currency || 'IRR',
        errorCode: 'PRODUCT_QUOTE_FAILED',
        errorMessage: e.message || 'Product quote service unavailable',
      };
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + (config.quoteTtlMs || 30 * 60 * 1000));

    return {
      status: 'received',
      carrierOrganizationId: payload.carrierOrganizationId,
      quoteRequestId: payload.quoteRequestId,
      submissionId: payload.submissionId,
      tenantId: payload.tenantId,
      premiumAmountMinor: String(data.totalPremiumMinor || 0),
      premiumCurrency: data.currency || config.currency || 'IRR',
      basePremiumMinor: String(data.basePremiumMinor || 0),
      taxesMinor: '0',
      feesMinor: '0',
      coverageSnapshot: data.coverages,
      quoteSnapshot: { ...data, source: 'product-service' },
      comparisonFactors: {
        basePremium: data.basePremium,
        totalPremium: data.totalPremium,
        adjustmentCount: (data.adjustments || []).length,
      },
      commissionRateBps: 0,
      commissionAmountMinor: '0',
      markupAmountMinor: '0',
      expiresAt,
    };
  }

  async bind(payload: BindRequestPayload, config: Record<string, any>): Promise<BindResponsePayload> {
    // Internal adapter delegates to policy service in the placement orchestrator
    return { status: 'pending' };
  }
}
