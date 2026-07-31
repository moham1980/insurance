import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OutboxPublisher, createLogger } from '@insurance/shared';
import { ISanhabClient, SanhabSubmissionRequest, SanhabSubmissionResponse } from '../sanhab-clients/sanhab-client.interface';
import { MockSanhabClient } from '../sanhab-clients/mock-sanhab.client';
import { RealSanhabClient } from '../sanhab-clients/real-sanhab.client';
import { RegulatoryFailureLog } from '../entities/RegulatoryFailureLog';

export interface SanhabSubmitParams {
  policyId: string;
  tenantId?: string;
  organizationId?: string;
  actorUserId?: string;
  authorization?: string;
  correlationId?: string;
  nationalId?: string;
  vin?: string;
  skipPending?: boolean;
}

export interface SanhabSubmitResult {
  success: boolean;
  policyId: string;
  submissionId?: string;
  uniqueCode?: string;
  resultCode?: string;
  message?: string;
  sanhabStatus: 'pending' | 'confirmed' | 'rejected';
  correlationId: string;
}

@Injectable()
export class SanhabIssuanceService implements OnModuleInit {
  private readonly logger = createLogger({
    serviceName: 'sanhab-issuance-service',
    prettyPrint: process.env.NODE_ENV !== 'production',
  });

  private sanhabClient!: ISanhabClient;
  private readonly policyServiceUrl: string;
  private readonly timeoutMs: number;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.policyServiceUrl = process.env.POLICY_SERVICE_URL || 'http://localhost:18003';
    this.timeoutMs = parseInt(process.env.POLICY_SERVICE_TIMEOUT_MS || '10000', 10);
  }

  onModuleInit(): void {
    const useRealSanhab = process.env.SANHAB_USE_REAL === 'true';
    if (useRealSanhab) {
      this.sanhabClient = new RealSanhabClient();
      this.logger.info('SanhabIssuanceService using RealSanhabClient');
    } else {
      this.sanhabClient = new MockSanhabClient();
      this.logger.info('SanhabIssuanceService using MockSanhabClient (development mode)');
    }
  }

  async submit(params: SanhabSubmitParams): Promise<SanhabSubmitResult> {
    const correlationId = params.correlationId || `san-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const submissionId = uuidv4();

    const policy = await this.fetchPolicy(params.policyId, params.tenantId, params.authorization, correlationId);
    if (!policy) {
      return { success: false, policyId: params.policyId, correlationId, sanhabStatus: 'rejected', message: 'Policy not found' };
    }

    if (params.organizationId && policy.issuerOrganizationId && params.organizationId !== policy.issuerOrganizationId) {
      return { success: false, policyId: params.policyId, correlationId, sanhabStatus: 'rejected', message: 'Issuer organization mismatch' };
    }

    if (policy.status !== 'issued') {
      return { success: false, policyId: params.policyId, correlationId, sanhabStatus: 'rejected', message: `Invalid policy state: ${policy.status}` };
    }

    if (!params.skipPending) {
      const pendingResult = await this.recordPolicySanhabResult(
        params.policyId,
        {
          sanhabStatus: 'pending',
          sanhabSubmissionId: submissionId,
          sanhabResponse: { initiatedAt: new Date().toISOString() },
        },
        params.tenantId,
        params.authorization,
        correlationId,
      );
      if (!pendingResult.ok) {
        return { success: false, policyId: params.policyId, correlationId, sanhabStatus: 'rejected', message: pendingResult.error };
      }
    }

    await this.publishEvent({
      topic: 'insurance.regulatory.sanhab.submission_sent',
      eventType: 'SanhabSubmissionSent',
      correlationId,
      tenantId: params.tenantId,
      subject: { policyId: params.policyId },
      payload: { policyId: params.policyId, submissionId, policyNumber: policy.policyNumber },
    });

    const sanhabRequest: SanhabSubmissionRequest = {
      policyNumber: policy.policyNumber,
      nationalId: params.nationalId,
      vin: params.vin,
      policyData: this.scrubPiiForSanhab(policy),
    };

    let sanhabResponse: SanhabSubmissionResponse;
    try {
      sanhabResponse = await this.sanhabClient.submitPolicy(sanhabRequest);
    } catch (error: any) {
      sanhabResponse = {
        resultCode: 'UPSTREAM_ERROR',
        errorMessage: `Sanhab submission exception: ${error?.message || String(error)}`,
      };
    }

    const isOk = sanhabResponse.resultCode === 'OK' && sanhabResponse.uniqueCode;

    if (isOk) {
      const recordResult = await this.recordPolicySanhabResult(
        params.policyId,
        {
          sanhabStatus: 'confirmed',
          sanhabSubmissionId: submissionId,
          uniqueCode: sanhabResponse.uniqueCode,
          sanhabResponse: { ...sanhabResponse, receivedAt: new Date().toISOString() },
        },
        params.tenantId,
        params.authorization,
        correlationId,
      );
      if (!recordResult.ok) {
        await this.logFailure(params, submissionId, correlationId, 'policy_update_failed', recordResult.error);
        return { success: false, policyId: params.policyId, submissionId, correlationId, sanhabStatus: 'rejected', message: recordResult.error };
      }

      await this.publishEvent({
        topic: 'insurance.regulatory.sanhab.confirmation_received',
        eventType: 'SanhabConfirmationReceived',
        correlationId,
        tenantId: params.tenantId,
        subject: { policyId: params.policyId },
        payload: { policyId: params.policyId, submissionId, uniqueCode: sanhabResponse.uniqueCode, policyNumber: policy.policyNumber },
      });

      return {
        success: true,
        policyId: params.policyId,
        submissionId,
        uniqueCode: sanhabResponse.uniqueCode,
        resultCode: sanhabResponse.resultCode,
        correlationId,
        sanhabStatus: 'confirmed',
        message: 'Unique code assigned',
      };
    }

    const rejectionMessage = sanhabResponse.errorMessage || `Sanhab result ${sanhabResponse.resultCode}`;
    const recordResult = await this.recordPolicySanhabResult(
      params.policyId,
      {
        sanhabStatus: 'rejected',
        sanhabSubmissionId: submissionId,
        sanhabResponse: { ...sanhabResponse, receivedAt: new Date().toISOString() },
      },
      params.tenantId,
      params.authorization,
      correlationId,
    );
    if (!recordResult.ok) {
      this.logger.warn('Failed to record Sanhab rejection', { policyId: params.policyId, submissionId, error: recordResult.error });
    }

    await this.logFailure(params, submissionId, correlationId, sanhabResponse.resultCode, rejectionMessage, sanhabResponse);

    return {
      success: false,
      policyId: params.policyId,
      submissionId,
      resultCode: sanhabResponse.resultCode,
      correlationId,
      sanhabStatus: 'rejected',
      message: rejectionMessage,
    };
  }

  async getStatus(policyId: string, tenantId?: string, authorization?: string, correlationId?: string): Promise<any> {
    const cid = correlationId || `san-status-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const policy = await this.fetchPolicy(policyId, tenantId, authorization, cid);
    if (!policy) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Policy not found' }, correlationId: cid };
    }
    return {
      success: true,
      data: {
        policyId,
        status: policy.status,
        sanhabStatus: policy.sanhabStatus || 'not_submitted',
        sanhabSubmissionId: policy.sanhabSubmissionId || null,
        uniqueCode: policy.uniqueCode || null,
      },
      correlationId: cid,
    };
  }

  async retry(params: SanhabSubmitParams): Promise<SanhabSubmitResult> {
    const status = await this.getStatus(params.policyId, params.tenantId, params.authorization, params.correlationId);
    if (!status.success) {
      return { success: false, policyId: params.policyId, correlationId: status.correlationId, sanhabStatus: 'rejected', message: status.error.message };
    }
    if (status.data.sanhabStatus === 'confirmed') {
      return { success: true, policyId: params.policyId, correlationId: status.correlationId, sanhabStatus: 'confirmed', message: 'Already confirmed' };
    }
    return this.submit({ ...params, skipPending: true });
  }

  getConfig(): Record<string, any> {
    const useRealSanhab = process.env.SANHAB_USE_REAL === 'true';
    return {
      mode: useRealSanhab ? 'real' : 'mock',
      realConfigured: useRealSanhab && !!process.env.SANHAB_WSDL_URL && !!process.env.SANHAB_API_KEY,
      mockConfigured: !useRealSanhab,
      wsdlConfigured: !!process.env.SANHAB_WSDL_URL,
      certConfigured: !!process.env.SANHAB_CERT_PATH,
      submitMethod: process.env.SANHAB_SUBMIT_POLICY_METHOD || 'SubmitPolicy',
      timeoutMs: parseInt(process.env.SANHAB_TIMEOUT_MS || '30000', 10),
      policyServiceUrl: this.policyServiceUrl,
    };
  }

  private async fetchPolicy(policyId: string, tenantId?: string, authorization?: string, correlationId?: string): Promise<any | null> {
    const url = `${this.policyServiceUrl}/policies/${encodeURIComponent(policyId)}/details`;
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-correlation-id': correlationId || `san-${Date.now()}`,
    };
    if (tenantId) headers['x-tenant-id'] = tenantId;
    if (authorization) headers['authorization'] = authorization;

    const res = await this.fetchWithRetry(url, { method: 'GET', headers }, { timeoutMs: this.timeoutMs, retries: 2, baseDelayMs: 500 });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as any;
    return json?.data?.policy ?? json?.data ?? null;
  }

  private async recordPolicySanhabResult(
    policyId: string,
    body: {
      sanhabStatus: 'pending' | 'confirmed' | 'rejected';
      sanhabSubmissionId: string;
      uniqueCode?: string;
      sanhabResponse?: Record<string, any>;
    },
    tenantId?: string,
    authorization?: string,
    correlationId?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const url = `${this.policyServiceUrl}/policies/${encodeURIComponent(policyId)}/sanhab-result`;
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-correlation-id': correlationId || `san-result-${Date.now()}`,
    };
    if (tenantId) headers['x-tenant-id'] = tenantId;
    if (authorization) headers['authorization'] = authorization;

    const res = await this.fetchWithRetry(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }, { timeoutMs: this.timeoutMs, retries: 2, baseDelayMs: 500 });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, error: `policy service returned ${res.status}: ${text}` };
    }
    return { ok: true };
  }

  private async logFailure(
    params: SanhabSubmitParams,
    submissionId: string,
    correlationId: string,
    errorCode: string,
    message: string,
    response?: any,
  ): Promise<void> {
    try {
      const failure = this.dataSource.getRepository(RegulatoryFailureLog).create({
        failureId: uuidv4(),
        source: 'sanhab',
        operation: 'submit_policy',
        externalReferenceId: submissionId,
        correlationId,
        tenantId: params.tenantId || null,
        errorCode,
        errorMessage: message,
        payload: { policyId: params.policyId, response },
        createdAt: new Date(),
      });
      await this.dataSource.getRepository(RegulatoryFailureLog).save(failure);
    } catch (logError: any) {
      this.logger.error('Failed to log Sanhab failure', { error: logError?.message, correlationId });
    }
  }

  private async publishEvent(options: {
    topic: string;
    eventType: string;
    correlationId: string;
    tenantId?: string;
    subject: Record<string, any>;
    payload: Record<string, any>;
  }): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const outbox = new OutboxPublisher(manager);
        await outbox.publish({
          ...options,
          eventVersion: 1,
          dataClassification: 'INTERNAL',
        });
      });
    } catch (error: any) {
      this.logger.error('Failed to publish Sanhab outbox event', { error: error?.message, eventType: options.eventType });
    }
  }

  private scrubPiiForSanhab(policy: any): Record<string, any> {
    const payload: Record<string, any> = {
      policyNumber: policy.policyNumber,
      lineOfBusiness: policy.lineOfBusiness,
      premiumAmount: policy.premiumAmount,
      premiumCurrency: policy.premiumCurrency,
      effectiveFrom: policy.effectiveFrom,
      effectiveTo: policy.effectiveTo,
      insurerCode: policy.insurerCode,
      brokerCentralCode: policy.brokerCentralCode,
    };
    return payload;
  }

  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    opts: { timeoutMs: number; retries: number; baseDelayMs: number },
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs);
    let lastError: any;

    for (let attempt = 0; attempt < opts.retries; attempt++) {
      try {
        const res = await fetch(url, { ...init, signal: controller.signal } as any);
        clearTimeout(timeout);
        return res;
      } catch (error) {
        lastError = error;
        if (attempt < opts.retries - 1) {
          await new Promise((r) => setTimeout(r, opts.baseDelayMs * Math.pow(2, attempt)));
        }
      }
    }
    clearTimeout(timeout);
    throw lastError;
  }
}
