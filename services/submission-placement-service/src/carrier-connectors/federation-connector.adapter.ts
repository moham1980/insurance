import { Injectable, Logger } from '@nestjs/common';
import { ICarrierConnector, QuoteRequestPayload, QuoteResponsePayload, BindRequestPayload, BindResponsePayload } from './carrier-connector.interface';

export interface FederationConnectorConfig {
  partnerApiGatewayUrl: string;
  partnerId: string;
  mtlsCertPath?: string;
  mtlsKeyPath?: string;
  tokenExchangeEndpoint?: string;
  clientId?: string;
  clientSecret?: string;
}

@Injectable()
export class FederationConnectorAdapter implements ICarrierConnector {
  readonly connectorType = 'federation';
  private readonly logger = new Logger(FederationConnectorAdapter.name);

  async requestQuote(payload: QuoteRequestPayload, config: Record<string, any>): Promise<QuoteResponsePayload> {
    const fedConfig = config as FederationConnectorConfig;
    if (!fedConfig.partnerApiGatewayUrl) {
      return {
        status: 'error',
        carrierOrganizationId: payload.carrierOrganizationId,
        quoteRequestId: payload.quoteRequestId,
        submissionId: payload.submissionId,
        tenantId: payload.tenantId,
        premiumAmountMinor: '0',
        premiumCurrency: 'IRR',
        errorCode: 'FEDERATION_NOT_CONFIGURED',
        errorMessage: 'Partner API Gateway URL not configured',
      };
    }

    try {
      const token = await this.exchangeToken(fedConfig, payload.tenantId, 'quotes:write');
      const url = `${fedConfig.partnerApiGatewayUrl}/api/v1/federation/quotes`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Correlation-Id': payload.correlationId,
          'X-Tenant-Id': payload.tenantId,
        },
        body: JSON.stringify({
          submissionId: payload.submissionId,
          quoteRequestId: payload.quoteRequestId,
          productId: payload.productId,
          productVersion: payload.productVersion,
          lineOfBusiness: payload.lineOfBusiness,
          exposure: payload.exposure,
          requestedDeductibles: payload.requestedDeductibles,
          effectiveFrom: payload.effectiveFrom,
          effectiveTo: payload.effectiveTo,
          territory: payload.territory,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`Federation quote request failed: ${response.status} ${errText}`);
        return {
          status: 'error',
          carrierOrganizationId: payload.carrierOrganizationId,
          quoteRequestId: payload.quoteRequestId,
          submissionId: payload.submissionId,
          tenantId: payload.tenantId,
          premiumAmountMinor: '0',
          premiumCurrency: 'IRR',
          errorCode: 'FEDERATION_QUOTE_FAILED',
          errorMessage: `Partner returned ${response.status}: ${errText}`,
        };
      }

      const data = await response.json() as any;
      return {
        status: data.status || 'received',
        carrierOrganizationId: payload.carrierOrganizationId,
        quoteRequestId: payload.quoteRequestId,
        submissionId: payload.submissionId,
        tenantId: payload.tenantId,
        premiumAmountMinor: data.premiumAmountMinor || '0',
        premiumCurrency: data.premiumCurrency || 'IRR',
        basePremiumMinor: data.basePremiumMinor,
        taxesMinor: data.taxesMinor,
        feesMinor: data.feesMinor,
        deductibleAmountMinor: data.deductibleAmountMinor,
        coverageSnapshot: data.coverageSnapshot,
        quoteSnapshot: data.quoteSnapshot,
        comparisonFactors: data.comparisonFactors,
        commissionRateBps: data.commissionRateBps,
        commissionAmountMinor: data.commissionAmountMinor,
        markupAmountMinor: data.markupAmountMinor || '0',
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      };
    } catch (err: any) {
      this.logger.error('Federation quote request error', err);
      return {
        status: 'error',
        carrierOrganizationId: payload.carrierOrganizationId,
        quoteRequestId: payload.quoteRequestId,
        submissionId: payload.submissionId,
        tenantId: payload.tenantId,
        premiumAmountMinor: '0',
        premiumCurrency: 'IRR',
        errorCode: 'FEDERATION_CONNECTION_ERROR',
        errorMessage: err.message || 'Connection error',
      };
    }
  }

  async bind(payload: BindRequestPayload, config: Record<string, any>): Promise<BindResponsePayload> {
    const fedConfig = config as FederationConnectorConfig;
    if (!fedConfig.partnerApiGatewayUrl) {
      return {
        status: 'failed',
        errorCode: 'FEDERATION_NOT_CONFIGURED',
        errorMessage: 'Partner API Gateway URL not configured',
      };
    }

    try {
      const token = await this.exchangeToken(fedConfig, payload.tenantId, 'policies:write');
      const url = `${fedConfig.partnerApiGatewayUrl}/api/v1/federation/bind`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Correlation-Id': payload.correlationId,
          'X-Tenant-Id': payload.tenantId,
        },
        body: JSON.stringify({
          placementId: payload.placementId,
          submissionId: payload.submissionId,
          quoteResponseId: payload.quoteResponseId,
          carrierOrganizationId: payload.carrierOrganizationId,
          brokerOrganizationId: payload.brokerOrganizationId,
          premiumAmountMinor: payload.premiumAmountMinor,
          premiumCurrency: payload.premiumCurrency,
          effectiveFrom: payload.effectiveFrom,
          effectiveTo: payload.effectiveTo,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`Federation bind failed: ${response.status} ${errText}`);
        return {
          status: 'failed',
          errorCode: 'FEDERATION_BIND_FAILED',
          errorMessage: `Partner returned ${response.status}: ${errText}`,
        };
      }

      const data = await response.json() as any;
      return {
        status: data.status || 'confirmed',
        policyId: data.policyId,
        policyNumber: data.policyNumber,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage,
      };
    } catch (err: any) {
      this.logger.error('Federation bind error', err);
      return {
        status: 'failed',
        errorCode: 'FEDERATION_CONNECTION_ERROR',
        errorMessage: err.message || 'Connection error',
      };
    }
  }

  private async exchangeToken(config: FederationConnectorConfig, tenantId: string, scope: string): Promise<string> {
    if (!config.tokenExchangeEndpoint) {
      throw new Error('Token exchange endpoint not configured for federation connector');
    }

    const body = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      subject_token: tenantId,
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      audience: config.partnerId,
      scope,
      requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (config.clientId && config.clientSecret) {
      const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    const response = await fetch(config.tokenExchangeEndpoint, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${errText}`);
    }

    const tokens = await response.json() as { access_token: string };
    return tokens.access_token;
  }
}
