import { ICarrierConnector, QuoteRequestPayload, QuoteResponsePayload, BindRequestPayload, BindResponsePayload } from './carrier-connector.interface';
import axios, { AxiosError } from 'axios';

function toXml(obj: Record<string, any>): string {
  let xml = '';
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) {
      xml += `<${key}/>`;
    } else if (typeof value === 'object' && !(value instanceof Date)) {
      xml += `<${key}>${toXml(value)}</${key}>`;
    } else if (value instanceof Date) {
      xml += `<${key}>${value.toISOString()}</${key}>`;
    } else {
      xml += `<${key}>${String(value).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' } as any)[c])}</${key}>`;
    }
  }
  return xml;
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`);
  const m = xml.match(regex);
  return m ? m[1] : null;
}

export class SoapConnectorAdapter implements ICarrierConnector {
  readonly connectorType = 'soap';

  private buildEnvelope(operation: string, payload: Record<string, any>, config: Record<string, any>): string {
    const body = `<${operation}${config.namespace ? ` xmlns="${config.namespace}"` : ''}>${toXml(payload)}</${operation}>`;
    return `<?xml version="1.0" encoding="UTF-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>${body}</soap:Body></soap:Envelope>`;
  }

  async requestQuote(payload: QuoteRequestPayload, config: Record<string, any>): Promise<QuoteResponsePayload> {
    const url = config.soapUrl;
    const operation = config.quoteOperation || 'GetQuote';
    try {
      const res = await axios.post(url, this.buildEnvelope(operation, payload, config), {
        timeout: config.timeoutMs || 30000,
        headers: { 'Content-Type': 'text/xml; charset=utf-8', ...(config.headers || {}) },
      });
      const data = { source: 'soap-connector' } as Record<string, any>;
      const xml = String(res.data);
      data.premiumAmountMinor = extractTag(xml, 'premiumAmountMinor') || extractTag(xml, 'totalPremiumMinor') || '0';
      data.premiumCurrency = extractTag(xml, 'premiumCurrency') || extractTag(xml, 'currency') || config.currency || 'IRR';
      data.basePremiumMinor = extractTag(xml, 'basePremiumMinor') || undefined;
      data.taxesMinor = extractTag(xml, 'taxesMinor') || undefined;
      data.feesMinor = extractTag(xml, 'feesMinor') || undefined;
      data.deductibleAmountMinor = extractTag(xml, 'deductibleAmountMinor') || undefined;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (config.quoteTtlMs || 30 * 60 * 1000));
      return {
        status: 'received',
        carrierOrganizationId: payload.carrierOrganizationId,
        quoteRequestId: payload.quoteRequestId,
        submissionId: payload.submissionId,
        tenantId: payload.tenantId,
        premiumAmountMinor: String(data.premiumAmountMinor),
        premiumCurrency: data.premiumCurrency,
        basePremiumMinor: data.basePremiumMinor ? String(data.basePremiumMinor) : undefined,
        taxesMinor: data.taxesMinor ? String(data.taxesMinor) : undefined,
        feesMinor: data.feesMinor ? String(data.feesMinor) : undefined,
        deductibleAmountMinor: data.deductibleAmountMinor ? String(data.deductibleAmountMinor) : undefined,
        quoteSnapshot: data,
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
        premiumCurrency: 'IRR',
        errorCode: 'SOAP_QUOTE_FAILED',
        errorMessage: err.message || 'SOAP quote request failed',
      };
    }
  }

  async bind(payload: BindRequestPayload, config: Record<string, any>): Promise<BindResponsePayload> {
    const url = config.soapUrl;
    const operation = config.bindOperation || 'BindPolicy';
    try {
      const res = await axios.post(url, this.buildEnvelope(operation, payload, config), {
        timeout: config.timeoutMs || 30000,
        headers: { 'Content-Type': 'text/xml; charset=utf-8', ...(config.headers || {}) },
      });
      const xml = String(res.data);
      return {
        status: 'confirmed',
        policyId: extractTag(xml, 'policyId') || undefined,
        policyNumber: extractTag(xml, 'policyNumber') || undefined,
      };
    } catch (e) {
      const err = e as AxiosError<any>;
      return {
        status: 'failed',
        errorCode: 'SOAP_BIND_FAILED',
        errorMessage: err.message || 'SOAP bind request failed',
      };
    }
  }
}
