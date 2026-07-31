import { Injectable } from '@nestjs/common';
import { ICarrierConnector, QuoteRequestPayload, QuoteResponsePayload, BindRequestPayload, BindResponsePayload } from './carrier-connector.interface';
import { WorkflowEngineClient } from '../clients/workflow-engine.client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ManualConnectorAdapter implements ICarrierConnector {
  readonly connectorType = 'manual';

  constructor(private readonly workflowClient: WorkflowEngineClient) {}

  async requestQuote(payload: QuoteRequestPayload, config: Record<string, any>): Promise<QuoteResponsePayload> {
    const workItemId = uuidv4();
    try {
      await this.workflowClient.startManualQuoteProcess(payload.tenantId, {
        workItemId,
        kind: 'manual_quote',
        submissionId: payload.submissionId,
        quoteRequestId: payload.quoteRequestId,
        carrierOrganizationId: payload.carrierOrganizationId,
        payload,
      });
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (config.quoteTtlMs || 24 * 60 * 60 * 1000));
      return {
        status: 'pending',
        carrierOrganizationId: payload.carrierOrganizationId,
        quoteRequestId: payload.quoteRequestId,
        submissionId: payload.submissionId,
        tenantId: payload.tenantId,
        premiumAmountMinor: '0',
        premiumCurrency: config.currency || 'IRR',
        quoteSnapshot: { source: 'manual-connector', status: 'awaiting_manual_quote', workItemId },
        manualWorkItemId: workItemId,
        expiresAt,
      };
    } catch (e: any) {
      return {
        status: 'error',
        carrierOrganizationId: payload.carrierOrganizationId,
        quoteRequestId: payload.quoteRequestId,
        submissionId: payload.submissionId,
        tenantId: payload.tenantId,
        premiumAmountMinor: '0',
        premiumCurrency: config.currency || 'IRR',
        errorCode: 'MANUAL_QUOTE_FAILED',
        errorMessage: e.message || 'Manual quote workflow start failed',
      };
    }
  }

  async bind(payload: BindRequestPayload, config: Record<string, any>): Promise<BindResponsePayload> {
    const workItemId = uuidv4();
    try {
      await this.workflowClient.startManualQuoteProcess(payload.tenantId, {
        workItemId,
        kind: 'manual_bind',
        placementId: payload.placementId,
        submissionId: payload.submissionId,
        quoteResponseId: payload.quoteResponseId,
        carrierOrganizationId: payload.carrierOrganizationId,
        payload,
      });
      return { status: 'pending', manualWorkItemId: workItemId };
    } catch (e: any) {
      return { status: 'failed', errorCode: 'MANUAL_BIND_FAILED', errorMessage: e.message || 'Manual bind workflow start failed' };
    }
  }
}
