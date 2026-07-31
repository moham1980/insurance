import { Injectable, Logger } from '@nestjs/common';
import { circuitBreakerRegistry } from '@insurance/shared';

export interface ServiceTokenOptions {
  correlationId: string;
  permissions: string[];
  required?: boolean;
}

@Injectable()
export class ServiceClient {
  private readonly logger = new Logger(ServiceClient.name);
  private readonly tokenCache = new Map<string, { token: string; exp: number }>();
  private readonly httpTimeoutMs: number;

  constructor() {
    this.httpTimeoutMs = Math.max(1000, parseInt(process.env.HTTP_TIMEOUT_MS || '5000', 10) || 5000);
  }

  private getAuthServiceUrl(): string | null {
    const url = process.env.AUTH_SERVICE_URL;
    if (typeof url === 'string' && url.length > 0) return url;
    return null;
  }

  async getServiceToken(opts: ServiceTokenOptions): Promise<string | null> {
    const authUrl = this.getAuthServiceUrl();
    const issuerKey = process.env.SERVICE_TOKEN_ISSUER_KEY;
    const serviceId = process.env.SERVICE_ID;
    if (!authUrl || !issuerKey || !serviceId) {
      if (opts.required) {
        const err: any = new Error('Service token authentication is not configured');
        err.code = 'CONFIGURATION_ERROR';
        throw err;
      }
      return null;
    }

    const permissions = opts.permissions.slice().sort();
    const cacheKey = permissions.join(',');
    const now = Date.now();
    const cached = this.tokenCache.get(cacheKey);
    if (cached && now < cached.exp) return cached.token;

    const ttlSeconds = Math.max(60, parseInt(process.env.SERVICE_TOKEN_TTL_SECONDS || '900', 10) || 900);
    try {
      const resp = await this.fetchWithTimeout(`${authUrl}/service-token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-correlation-id': opts.correlationId,
          'x-service-issuer-key': issuerKey,
        },
        body: JSON.stringify({ serviceId, permissions }),
      });

      const json: any = await resp.json().catch(() => null);
      const token = json?.data?.token;
      if (typeof token !== 'string' || token.length < 10) {
        if (opts.required) {
          const err: any = new Error('Failed to obtain service token');
          err.code = 'AUTHENTICATION_ERROR';
          throw err;
        }
        return null;
      }

      this.tokenCache.set(cacheKey, { token, exp: now + (ttlSeconds - 30) * 1000 });
      return token;
    } catch (e: any) {
      if (opts.required) {
        const err: any = new Error(`Service token request failed: ${e.message}`);
        err.code = 'AUTHENTICATION_ERROR';
        throw err;
      }
      this.logger.warn('Failed to fetch service token', { correlationId: opts.correlationId, error: e.message });
      return null;
    }
  }

  private async fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.httpTimeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async fetchJson(url: string, init?: RequestInit & { correlationId?: string }): Promise<any> {
    const breaker = circuitBreakerRegistry.get(`claims-external-${url.split('/')[2] || 'unknown'}`, {
      failureThreshold: 3,
      successThreshold: 2,
      timeoutMs: 30000,
      resetTimeoutMs: 60000,
    });
    return breaker.execute(async () => {
      const res = await this.fetchWithTimeout(url, init);
      if (!res.ok) {
        const text = await res.text().catch(() => `HTTP ${res.status}`);
        const err: any = new Error(`HTTP ${res.status} from ${url}: ${text}`);
        err.code = 'EXTERNAL_SERVICE_ERROR';
        err.status = res.status;
        throw err;
      }
      return res.json().catch(() => null);
    });
  }

  async fetchWithAuth(url: string, opts: { correlationId: string; permissions: string[]; init?: RequestInit }): Promise<any> {
    const token = await this.getServiceToken({ correlationId: opts.correlationId, permissions: opts.permissions, required: true });
    return this.fetchJson(url, {
      ...(opts.init || {}),
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': opts.correlationId,
        'authorization': `Bearer ${token}`,
        ...(opts.init?.headers || {}),
      },
    });
  }

  private getDocumentServiceUrl(): string | null {
    const url = process.env.DOCUMENT_SERVICE_URL;
    if (typeof url === 'string' && url.length > 0) return url;
    return null;
  }

  async getDocumentMetadata(params: {
    correlationId: string;
    tenantId: string;
    documentId: string;
  }): Promise<{
    documentId: string;
    storageRef: string;
    fileName?: string | null;
    fileSize?: number | null;
    mimeType?: string | null;
    checksum?: string | null;
    virusScanStatus?: string | null;
    piiScanStatus?: string | null;
    classification?: string | null;
    downloadUrl?: string | null;
  } | null> {
    const docUrl = this.getDocumentServiceUrl();
    if (!docUrl) return null;

    const token = await this.getServiceToken({
      correlationId: params.correlationId,
      permissions: ['documents:view'],
      required: true,
    });

    const data = await this.fetchJson(`${docUrl}/documents/${encodeURIComponent(params.documentId)}`, {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': params.correlationId,
        'x-tenant-id': params.tenantId,
        'authorization': `Bearer ${token}`,
      },
    });

    const doc = data?.data;
    if (!doc?.documentId) return null;
    return {
      documentId: doc.documentId,
      storageRef: doc.storageRef,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      checksum: doc.checksum,
      virusScanStatus: doc.virusScanStatus,
      piiScanStatus: doc.piiScanStatus,
      classification: doc.classification,
      downloadUrl: doc.downloadUrl,
    };
  }

  async getDocumentSignedUrl(params: {
    correlationId: string;
    tenantId: string;
    documentId: string;
  }): Promise<{ downloadUrl: string; expiresAt?: string } | null> {
    const docUrl = this.getDocumentServiceUrl();
    if (!docUrl) return null;

    const token = await this.getServiceToken({
      correlationId: params.correlationId,
      permissions: ['documents:view'],
      required: true,
    });

    const data = await this.fetchJson(`${docUrl}/documents/${encodeURIComponent(params.documentId)}/signed-url`, {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': params.correlationId,
        'x-tenant-id': params.tenantId,
        'authorization': `Bearer ${token}`,
      },
    });

    const result = data?.data;
    if (!result?.downloadUrl) return null;
    return { downloadUrl: result.downloadUrl, expiresAt: result.expiresAt };
  }

  async validateOrganizationCapability(params: {
    correlationId: string;
    organizationId: string;
    tenantId: string;
    capability: string;
    authorization?: string;
  }): Promise<boolean> {
    const authUrl = this.getAuthServiceUrl();
    if (!authUrl) return true; // validation cannot be enforced if auth-service is not configured

    const token = params.authorization
      ? params.authorization.replace(/^Bearer /, '')
      : await this.getServiceToken({ correlationId: params.correlationId, permissions: ['org_units:list'] });
    if (!token) return true;

    const url = `${authUrl}/api/v1/admin/organizations/${encodeURIComponent(params.organizationId)}/capabilities?tenantId=${encodeURIComponent(params.tenantId)}`;
    try {
      const data = await this.fetchJson(url, {
        method: 'GET',
        headers: {
          'content-type': 'application/json',
          'x-correlation-id': params.correlationId,
          'authorization': `Bearer ${token}`,
        },
      });
      const caps = data?.data || [];
      const now = new Date();
      return caps.some((c: any) => {
        if (c.status !== 'active') return false;
        if (c.tenantId !== params.tenantId) return false;
        const from = c.effectiveFrom ? new Date(c.effectiveFrom) : now;
        const to = c.effectiveTo ? new Date(c.effectiveTo) : new Date('9999-12-31T23:59:59Z');
        return from <= now && now <= to && String(c.capability || '').toLowerCase() === params.capability.toLowerCase();
      });
    } catch (e: any) {
      this.logger.warn('Failed to validate organization capability', { organizationId: params.organizationId, capability: params.capability, error: e.message });
      return true;
    }
  }

  private getBillingServiceUrl(): string | null {
    const url = process.env.BILLING_SERVICE_URL;
    if (typeof url === 'string' && url.length > 0) return url;
    return null;
  }

  async createClaimPayoutInvoice(params: {
    correlationId: string;
    tenantId: string;
    claimId: string;
    customerPartyId?: string;
    amount: number;
    currency?: string;
    dueDays?: number;
  }): Promise<{ invoiceId: string; amount: number } | null> {
    const billingUrl = this.getBillingServiceUrl();
    if (!billingUrl) return null;

    const token = await this.getServiceToken({
      correlationId: params.correlationId,
      permissions: ['billing:invoices:create'],
      required: true,
    });

    const invoiceNumber = `CLM-PAYOUT-${params.claimId.slice(-8)}-${Date.now()}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (params.dueDays || 1));

    const payload = {
      tenantId: params.tenantId,
      invoiceNumber,
      claimId: params.claimId,
      customerId: params.customerPartyId,
      invoiceType: 'claim_payout',
      amount: params.amount,
      taxAmount: 0,
      dueDate: dueDate.toISOString(),
      lineItems: [{ description: 'Claim payout', quantity: 1, unitPrice: params.amount, amount: params.amount }],
      metadata: { claimId: params.claimId, currency: params.currency || 'IRR' },
    };

    const data = await this.fetchJson(`${billingUrl}/billing/invoices`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': params.correlationId,
        'authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const invoice = data?.data;
    if (!invoice?.id) {
      const err: any = new Error('Failed to create claim payout invoice');
      err.code = 'BILLING_ERROR';
      throw err;
    }
    return { invoiceId: invoice.id, amount: params.amount };
  }

  async initiateClaimPayout(params: {
    correlationId: string;
    tenantId: string;
    invoiceId: string;
    customerPartyId?: string;
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<{ paymentId?: string; redirectUrl?: string; authority?: string }> {
    const billingUrl = this.getBillingServiceUrl();
    if (!billingUrl) return {};

    const token = await this.getServiceToken({
      correlationId: params.correlationId,
      permissions: ['billing:payments:initiate'],
      required: true,
    });

    const data = await this.fetchJson(`${billingUrl}/billing/payments/initiate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': params.correlationId,
        'x-idempotency-key': `claim-payout-${params.invoiceId}`,
        'authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        invoiceId: params.invoiceId,
        description: params.description || 'Claim payout',
        metadata: { ...params.metadata, customerId: params.customerPartyId },
      }),
    });

    const result = data?.data;
    if (!result?.paymentId) {
      const err: any = new Error('Failed to initiate claim payout payment');
      err.code = 'BILLING_ERROR';
      throw err;
    }
    return {
      paymentId: result.paymentId,
      redirectUrl: result.redirectUrl,
      authority: result.authority,
    };
  }

  async postRecoveryJournalEntry(params: {
    correlationId: string;
    tenantId: string;
    recoveryId: string;
    claimId: string;
    amount: number;
    currency?: string;
    recoveryDate?: string;
  }): Promise<string | null> {
    const billingUrl = this.getBillingServiceUrl();
    if (!billingUrl) return null;

    const token = await this.getServiceToken({
      correlationId: params.correlationId,
      permissions: ['billing:accounting:manage'],
      required: true,
    });

    const receivableAccountCode = process.env.RECOVERY_RECEIVABLE_ACCOUNT_CODE || '1310';
    const bankOrPayableAccountCode = process.env.RECOVERY_BANK_ACCOUNT_CODE || '2200';
    const entryNumber = `REC-${params.recoveryId.slice(-8)}-${Date.now()}`;

    const createData = await this.fetchJson(`${billingUrl}/billing/journal-entries`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': params.correlationId,
        'authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        tenantId: params.tenantId,
        entryNumber,
        description: `Recovery for claim ${params.claimId}`,
        entryDate: params.recoveryDate ? params.recoveryDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
        businessKey: params.recoveryId,
        businessType: 'recovery',
        metadata: { claimId: params.claimId, currency: params.currency || 'IRR' },
        lines: [
          {
            accountCode: receivableAccountCode,
            description: 'Recovery receivable',
            debitAmount: params.amount,
            creditAmount: 0,
            reference: params.recoveryId,
          },
          {
            accountCode: bankOrPayableAccountCode,
            description: 'Recovery offset',
            debitAmount: 0,
            creditAmount: params.amount,
            reference: params.recoveryId,
          },
        ],
      }),
    });

    const journalEntryId = createData?.data?.id;
    if (!journalEntryId) {
      const err: any = new Error('Failed to create recovery journal entry');
      err.code = 'BILLING_ERROR';
      throw err;
    }

    const postData = await this.fetchJson(`${billingUrl}/billing/journal-entries/${journalEntryId}/post`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': params.correlationId,
        'authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    const posted = postData?.data;
    if (!posted || posted.status !== 'posted') {
      this.logger.warn('Journal entry created but not posted', { journalEntryId, recoveryId: params.recoveryId, response: posted });
    }

    return journalEntryId;
  }

  async validateActiveDistributionAgreement(params: {
    correlationId: string;
    salesNetworkServiceUrl: string;
    carrierOrganizationId: string;
    distributorOrganizationId: string;
    tenantId: string;
    lineOfBusiness?: string;
    authorization?: string;
  }): Promise<boolean> {
    const token = params.authorization
      ? params.authorization.replace(/^Bearer /, '')
      : await this.getServiceToken({ correlationId: params.correlationId, permissions: ['broker:agreements:view'] });
    if (!token) return true;

    const query = new URLSearchParams();
    query.set('carrierOrganizationId', params.carrierOrganizationId);
    query.set('distributorOrganizationId', params.distributorOrganizationId);
    query.set('status', 'active');
    if (params.lineOfBusiness) query.set('lineOfBusiness', params.lineOfBusiness);

    const url = `${params.salesNetworkServiceUrl}/api/v1/distribution-agreements?${query.toString()}`;
    try {
      const data = await this.fetchJson(url, {
        method: 'GET',
        headers: {
          'content-type': 'application/json',
          'x-correlation-id': params.correlationId,
          'authorization': `Bearer ${token}`,
        },
      });
      const agreements = data?.data || [];
      return agreements.length > 0;
    } catch (e: any) {
      this.logger.warn('Failed to validate distribution agreement', { carrierOrganizationId: params.carrierOrganizationId, distributorOrganizationId: params.distributorOrganizationId, error: e.message });
      return true;
    }
  }
}
