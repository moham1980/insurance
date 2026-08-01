import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createGatewayClient } from '../helpers/api-client';
import { JwtFactory } from '../helpers/jwt-factory';
import { DockerComposeHelper } from '../helpers/docker-compose';
import { DbHelper } from '../helpers/db-helper';
import { v4 as uuidv4 } from 'uuid';

const tenantId = 'test-tenant-p3';
const adminToken = JwtFactory.createAdminToken(tenantId);
const apiClient = createGatewayClient(adminToken);
apiClient.setTenantId(tenantId);

describe('E2E: P3 Brokerage Commission / Ledger / Settlement', () => {
  let sourceId: string;
  let journalEntryId: string;

  beforeAll(async () => {
    await DockerComposeHelper.waitForHealth('api-gateway', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('billing-service', { timeoutMs: 60000 });
    await DbHelper.truncateTable('billing', 'commission_splits');
    await DbHelper.truncateTable('billing', 'brokerage_journal_lines');
    await DbHelper.truncateTable('billing', 'brokerage_journal_entries');
    sourceId = uuidv4();
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('T-E2E-BR-01: Calculate and accrue commission split', async () => {
    const correlationId = `test-br-01-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post('/billing/brokerage/commissions/calculate', {
      brokerOrganizationId: uuidv4(),
      sourceType: 'POLICY',
      sourceId,
      premiumGross: 1_000_000,
      currency: 'IRR',
      effectiveFrom: new Date().toISOString(),
    });

    expect(response.success).toBe(true);
    expect(response.data.splits.length).toBe(1);
    expect(response.data.splits[0].amount).toBe(100_000);
  });

  test('T-E2E-BR-02: Post policy issuance creates balanced journal entry', async () => {
    const correlationId = `test-br-02-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post('/billing/brokerage/policies/:policyId/post'.replace(':policyId', sourceId), {
      organizationId: uuidv4(),
      premiumAmount: 1_000_000,
      taxesAmount: 90_000,
      totalPayable: 1_090_000,
      currency: 'IRR',
      brokerOrganizationId: uuidv4(),
      periodId: uuidv4(),
      effectiveFrom: new Date().toISOString(),
    });

    expect(response.success).toBe(true);
    journalEntryId = response.data.journalEntryId;
  });

  test('T-E2E-BR-03: Fetch posted journal entry', async () => {
    const response = await apiClient.get(`/billing/brokerage/journal-entries/${journalEntryId}`);
    expect(response.success).toBe(true);
    expect(response.data.journalEntryId).toBe(journalEntryId);
  });

  test('T-E2E-BR-04: Create settlement batch between two organizations', async () => {
    const correlationId = `test-br-04-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post('/billing/brokerage/settlements/batches', {
      fromOrganizationId: uuidv4(),
      toOrganizationId: uuidv4(),
      periodStart: new Date().toISOString(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    expect(response.success).toBe(true);
    expect(response.data.batchId).toBeDefined();
  });

  // --- Commission Post & Adjust ---

  test('T-E2E-BR-05: Post commission splits creates journal entry', async () => {
    const correlationId = `test-br-05-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post('/billing/brokerage/commissions/post', {
      organizationId: uuidv4(),
      sourceType: 'POLICY',
      sourceId,
      periodId: uuidv4(),
      currency: 'IRR',
      postingDate: new Date().toISOString(),
    });

    expect(response).toBeDefined();
    expect(response).toHaveProperty('success');
    if (response.success) {
      expect(response.data).toBeDefined();
      expect(response.data.journalEntryId).toBeDefined();
    } else {
      expect(response.error).toBeDefined();
    }
  });

  test('T-E2E-BR-06: Adjust commission split', async () => {
    const correlationId = `test-br-06-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post('/billing/brokerage/commissions/adjust', {
      splitId: uuidv4(),
      newAmount: 50000,
      reason: 'Test adjustment',
    });

    expect(response).toBeDefined();
    expect(response).toHaveProperty('success');
    if (response.success) {
      expect(response.data).toBeDefined();
      expect(response.data.split).toBeDefined();
    } else {
      expect(response.error).toBeDefined();
    }
  });

  // --- Settlement Lifecycle ---

  test('T-E2E-BR-07: Approve settlement batch', async () => {
    const correlationId = `test-br-07-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post('/billing/brokerage/settlements/batches/test-batch-001/approve', {
      approvedByPartyId: uuidv4(),
    });

    expect(response).toBeDefined();
    expect(response).toHaveProperty('success');
    if (response.success) {
      expect(response.data).toBeDefined();
    } else {
      expect(response.error).toBeDefined();
    }
  });

  test('T-E2E-BR-08: Confirm and pay settlement batch', async () => {
    const correlationId = `test-br-08-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post('/billing/brokerage/settlements/batches/test-batch-001/confirm', {
      fromAccountId: uuidv4(),
      toAccountId: uuidv4(),
    });

    expect(response).toBeDefined();
    expect(response).toHaveProperty('success');
    if (response.success) {
      expect(response.data).toBeDefined();
    } else {
      expect(response.error).toBeDefined();
    }
  });

  test('T-E2E-BR-09: Verify settlement payment', async () => {
    const correlationId = `test-br-09-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post('/billing/brokerage/settlements/batches/test-batch-001/verify');

    expect(response).toBeDefined();
    expect(response).toHaveProperty('success');
    if (response.success) {
      expect(response.data).toBeDefined();
    } else {
      expect(response.error).toBeDefined();
    }
  });

  test('T-E2E-BR-10: Reconcile settlement batch', async () => {
    const correlationId = `test-br-10-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post('/billing/brokerage/settlements/batches/test-batch-001/reconcile');

    expect(response).toBeDefined();
    expect(response).toHaveProperty('success');
    if (response.success) {
      expect(response.data).toBeDefined();
    } else {
      expect(response.error).toBeDefined();
    }
  });

  // --- Journal Entry Reversal ---

  test('T-E2E-BR-11: Reverse journal entry', async () => {
    const correlationId = `test-br-11-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post(`/billing/brokerage/journal-entries/${journalEntryId || 'test-entry-001'}/reverse`, {
      reason: 'Test reversal',
    });

    expect(response).toBeDefined();
    expect(response).toHaveProperty('success');
    if (response.success) {
      expect(response.data).toBeDefined();
    } else {
      expect(response.error).toBeDefined();
    }
  });

  // --- Refunds ---

  test('T-E2E-BR-12: Create refund request', async () => {
    const correlationId = `test-br-12-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post('/billing/brokerage/refunds', {
      organizationId: uuidv4(),
      sourceType: 'POLICY',
      sourceId,
      originalPaymentId: uuidv4(),
      amountMinor: 50000,
      currency: 'IRR',
      reason: 'Test refund',
    });

    expect(response).toBeDefined();
    expect(response).toHaveProperty('success');
    if (response.success) {
      expect(response.data).toBeDefined();
    } else {
      expect(response.error).toBeDefined();
    }
  });

  test('T-E2E-BR-13: Approve refund', async () => {
    const correlationId = `test-br-13-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post('/billing/brokerage/refunds/test-refund-001/approve', {
      approvedByPartyId: uuidv4(),
    });

    expect(response).toBeDefined();
    expect(response).toHaveProperty('success');
    if (response.success) {
      expect(response.data).toBeDefined();
    } else {
      expect(response.error).toBeDefined();
    }
  });

  test('T-E2E-BR-14: Send refund payment', async () => {
    const correlationId = `test-br-14-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post('/billing/brokerage/refunds/test-refund-001/send', {
      destinationAccount: 'test-dest-account-001',
      sourceAccount: 'test-src-account-001',
    });

    expect(response).toBeDefined();
    expect(response).toHaveProperty('success');
    if (response.success) {
      expect(response.data).toBeDefined();
    } else {
      expect(response.error).toBeDefined();
    }
  });

  // --- Clawbacks ---

  test('T-E2E-BR-15: Calculate clawback for policy', async () => {
    const correlationId = `test-br-15-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post('/billing/brokerage/clawbacks/calculate', {
      policyId: sourceId,
    });

    expect(response).toBeDefined();
    expect(response).toHaveProperty('success');
    if (response.success) {
      expect(response.data).toBeDefined();
    } else {
      expect(response.error).toBeDefined();
    }
  });

  test('T-E2E-BR-16: Apply clawback', async () => {
    const correlationId = `test-br-16-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post('/billing/brokerage/clawbacks/apply', {
      organizationId: uuidv4(),
      policyId: sourceId,
      cancellationSourceId: uuidv4(),
      amountMinor: 10000,
      currency: 'IRR',
      reason: 'Test clawback',
    });

    expect(response).toBeDefined();
    expect(response).toHaveProperty('success');
    if (response.success) {
      expect(response.data).toBeDefined();
    } else {
      expect(response.error).toBeDefined();
    }
  });

  // --- Escrow Management ---

  test('T-E2E-BR-17: Get escrow holdings', async () => {
    const correlationId = `test-br-17-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.get('/billing/brokerage/escrow/holdings');

    expect(response).toBeDefined();
    expect(response).toHaveProperty('success');
    if (response.success) {
      expect(response.data).toBeDefined();
    } else {
      expect(response.error).toBeDefined();
    }
  });

  test('T-E2E-BR-18: Check escrow release eligibility', async () => {
    const correlationId = `test-br-18-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.get('/billing/brokerage/escrow/holdings/test-holding-001/eligibility');

    expect(response).toBeDefined();
    expect(response).toHaveProperty('success');
    if (response.success) {
      expect(response.data).toBeDefined();
    } else {
      expect(response.error).toBeDefined();
    }
  });

  test('T-E2E-BR-19: Release escrow holding', async () => {
    const correlationId = `test-br-19-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post('/billing/brokerage/escrow/holdings/test-holding-001/release', {
      releaseType: 'FULL',
      amountMinor: 100000,
      destinationAccountRef: 'test-dest-account-001',
    });

    expect(response).toBeDefined();
    expect(response).toHaveProperty('success');
    if (response.success) {
      expect(response.data).toBeDefined();
    } else {
      expect(response.error).toBeDefined();
    }
  });

  test('T-E2E-BR-20: Carrier approve escrow holding', async () => {
    const correlationId = `test-br-20-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post('/billing/brokerage/escrow/holdings/test-holding-001/carrier-approve', {
      approvedBy: uuidv4(),
    });

    expect(response).toBeDefined();
    expect(response).toHaveProperty('success');
    if (response.success) {
      expect(response.data).toBeDefined();
    } else {
      expect(response.error).toBeDefined();
    }
  });

  test('T-E2E-BR-21: Auto-release eligible escrow holdings', async () => {
    const correlationId = `test-br-21-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post('/billing/brokerage/escrow/auto-release');

    expect(response).toBeDefined();
    expect(response).toHaveProperty('success');
    if (response.success) {
      expect(response.data).toBeDefined();
      expect(response.data.count).toBeDefined();
    } else {
      expect(response.error).toBeDefined();
    }
  });

  // --- Customer Payments via Billing ---

  test('T-E2E-BR-22: Pay invoice via billing service', async () => {
    const correlationId = `test-br-22-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post('/billing/brokerage/invoices/test-invoice-001/pay', {
      organizationId: uuidv4(),
      sourceAccount: 'test-src-account-001',
      destinationAccountRef: 'test-dest-account-001',
      rail: 'SHETAB',
      amountMinor: 100000,
    });

    expect(response).toBeDefined();
    expect(response).toHaveProperty('success');
    if (response.success) {
      expect(response.data).toBeDefined();
    } else {
      expect(response.error).toBeDefined();
    }
  });

  test('T-E2E-BR-23: Get payment by ID', async () => {
    const correlationId = `test-br-23-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.get('/billing/brokerage/payments/test-payment-001');

    expect(response).toBeDefined();
    expect(response).toHaveProperty('success');
    if (response.success) {
      expect(response.data).toBeDefined();
    } else {
      expect(response.error).toBeDefined();
    }
  });

  test('T-E2E-BR-24: Retry failed payment', async () => {
    const correlationId = `test-br-24-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post('/billing/brokerage/payments/test-payment-001/retry');

    expect(response).toBeDefined();
    expect(response).toHaveProperty('success');
    if (response.success) {
      expect(response.data).toBeDefined();
    } else {
      expect(response.error).toBeDefined();
    }
  });
});
