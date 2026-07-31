import { ICarrierConnector, QuoteRequestPayload, QuoteResponsePayload, BindRequestPayload, BindResponsePayload } from './carrier-connector.interface';
import axios, { AxiosError } from 'axios';

export class RestConnectorAdapter implements ICarrierConnector {
  readonly connectorType = 'rest';

  async requestQuote(payload: QuoteRequestPayload, config: Record<string, any>): Promise<QuoteResponsePayload> {
    const url = `${config.baseUrl}${config.quotePath || '/api/v1/quotes'}`;
    try {
      const res = await axios.post(url, payload, { timeout: config.timeoutMs || 30000, headers: config.headers || {} });
      const data = res.data?.data ?? res.data;
      const now = new Date();
      const expiresAt = data.expiresAt ? new Date(data.expiresAt) : new Date(now.getTime() + (config.quoteTtlMs || 30 * 60 * 1000));
      return {
        status: 'received',
        carrierOrganizationId: payload.carrierOrganizationId,
        quoteRequestId: payload.quoteRequestId,
        submissionId: payload.submissionId,
        tenantId: payload.tenantId,
        premiumAmountMinor: String(data.premiumAmountMinor || data.totalPremiumMinor || 0),
        premiumCurrency: data.premiumCurrency || data.currency || 'IRR',
        basePremiumMinor: data.basePremiumMinor ? String(data.basePremiumMinor) : undefined,
        taxesMinor: data.taxesMinor ? String(data.taxesMinor) : undefined,
        feesMinor: data.feesMinor ? String(data.feesMinor) : undefined,
        deductibleAmountMinor: data.deductibleAmountMinor ? String(data.deductibleAmountMinor) : undefined,
        coverageSnapshot: data.coverages || data.coverageSnapshot,
        quoteSnapshot: { ...data, source: 'rest-connector' },
        comparisonFactors: data.comparisonFactors,
        commissionRateBps: data.commissionRateBps,
        commissionAmountMinor: data.commissionAmountMinor ? String(data.commissionAmountMinor) : undefined,
        markupAmountMinor: String(data.markupAmountMinor || 0),
        expiresAt,
      };
    } catch (e) {
      const err = e as AxiosError<any>;
      return {
        status: 'error',
        carrierOrganizationId: payload.carrierOrganizationId,
        quoteRequestId: payload.quoteRequestId,
        submissionId: payload.submissionId,
        tenantId: payload.tenantId,
        premiumAmountMinor: '0',
        premiumCurrency: config.currency || 'IRR',
        errorCode: err.response?.data?.error?.code || 'REST_QUOTE_FAILED',
        errorMessage: err.response?.data?.error?.message || err.message || 'REST quote request failed',
      };
    }
  }

  async bind(payload: BindRequestPayload, config: Record<string, any>): Promise<BindResponsePayload> {
    const url = `${config.baseUrl}${config.bindPath || '/api/v1/bind'}`;
    try {
      const res = await axios.post(url, payload, { timeout: config.timeoutMs || 30000, headers: config.headers || {} });
      const data = res.data?.data ?? res.data;
      return {
        status: 'confirmed',
        policyId: data.policyId,
        policyNumber: data.policyNumber,
      };
    } catch (e) {
      const err = e as AxiosError<any>;
      return {
        status: 'failed',
        errorCode: err.response?.data?.error?.code || 'REST_BIND_FAILED',
        errorMessage: err.response?.data?.error?.message || err.message || 'REST bind request failed',
      };
    }
  }
}
