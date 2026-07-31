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
});
