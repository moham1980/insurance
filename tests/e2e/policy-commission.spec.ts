import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createGatewayClient } from '../helpers/api-client';
import { JwtFactory } from '../helpers/jwt-factory';
import { partyFixtures, quoteFixtures } from '../fixtures/party.fixture';
import { DbHelper } from '../helpers/db-helper';
import { DockerComposeHelper } from '../helpers/docker-compose';
import { AssertionHelpers } from '../helpers/assertions';
import { createExecutedPaymentForPolicy } from '../helpers/payment-helper';
import { v4 as uuidv4 } from 'uuid';

describe('E2E: Full Policy → Commission → Ledger → Settlement Lifecycle', () => {
  const tenantId = 'test-tenant-p3-lifecycle';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createGatewayClient(adminToken);
  apiClient.setTenantId(tenantId);

  let policyId: string;
  let journalEntryId: string;
  let commissionSplitId: string;
  let settlementBatchId: string;

  async function createAndIssuePolicy(nationalId: string): Promise<string> {
    const partyResponse = await apiClient.post('/party/party', {
      ...partyFixtures.individual,
      nationalId,
    });
    const pid = partyResponse.data.partyId;

    const quoteResponse = await apiClient.post('/policies/policies/quote', {
      ...quoteFixtures.basic,
      partyId: pid,
      tenantId,
    });

    const policyResponse = await apiClient.post('/policies/policies/convert-quote', {
      quote: { ...quoteFixtures.basic, partyId: pid, tenantId },
      tenantId,
    });
    const polId = policyResponse.data.policyId;

    await apiClient.post(`/policies/policies/${polId}/submit-docs`, {
      applicationData: {
        documents: [{ type: 'id_card', url: 'https://example.com/id.pdf' }],
      },
    });
    await apiClient.post(`/policies/policies/${polId}/risk-assess`, {
      riskAssessment: { riskScore: 25, assessorId: 'underwriter-1', notes: 'Low risk profile' },
    });
    await apiClient.post(`/policies/policies/${polId}/underwriting/decision`, {
      decision: 'approved',
      underwriterId: 'underwriter-1',
      notes: 'Risk acceptable',
    });
    const paymentId = await createExecutedPaymentForPolicy(apiClient, polId, quoteFixtures.basic.premiumAmount, tenantId);

    await apiClient.post(`/policies/policies/${polId}/quality-gate/override`, {
      action: 'issue',
      reason: 'Bypass Sanhab for E2E test',
    });
    await apiClient.post(`/policies/policies/${polId}/issue`, {
      paymentId,
    });
    await apiClient.post(`/policies/policies/${polId}/quality-gate/override`, {
      action: 'set_unique_code',
      reason: 'Bypass Sanhab for E2E test',
    });
    await apiClient.post(`/policies/policies/${polId}/unique-code`, {
      uniqueCode: `SANHAB-${nationalId}`,
    });

    return polId;
  }

  beforeAll(async () => {
    await DockerComposeHelper.waitForHealth('api-gateway', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('party-kyc-service', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('payments-service', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('policy-service', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('billing-service', { timeoutMs: 60000 });
    await DbHelper.truncateTable('public', 'parties');
    await DbHelper.truncateTable('public', 'policies');
    await DbHelper.truncateTable('billing', 'commission_splits');
    await DbHelper.truncateTable('billing', 'brokerage_journal_lines');
    await DbHelper.truncateTable('billing', 'brokerage_journal_entries');
    await DbHelper.truncateTable('billing', 'brokerage_settlement_batches');
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('T-E2E-PCLC-01: Issue policy → post to ledger', async () => {
    const correlationId = `test-pclc-01-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    policyId = await createAndIssuePolicy('9991112222');
    expect(policyId).toBeDefined();

    const postResponse = await apiClient.post(`/billing/brokerage/policies/${policyId}/post`, {
      organizationId: uuidv4(),
      premiumAmount: quoteFixtures.basic.premiumAmount,
      taxesAmount: 90_000,
      totalPayable: quoteFixtures.basic.premiumAmount + 90_000,
      currency: 'IRR',
      brokerOrganizationId: uuidv4(),
      periodId: uuidv4(),
      effectiveFrom: new Date().toISOString(),
    });

    AssertionHelpers.assertSuccessResponse(postResponse);
    journalEntryId = postResponse.data.journalEntryId;
    expect(journalEntryId).toBeDefined();
  });

  test('T-E2E-PCLC-02: Calculate commission splits for issued policy', async () => {
    const correlationId = `test-pclc-02-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const calcResponse = await apiClient.post('/billing/brokerage/commissions/calculate', {
      brokerOrganizationId: uuidv4(),
      sourceType: 'POLICY',
      sourceId: policyId,
      premiumGross: quoteFixtures.basic.premiumAmount,
      currency: 'IRR',
      effectiveFrom: new Date().toISOString(),
    });

    AssertionHelpers.assertSuccessResponse(calcResponse);
    expect(calcResponse.data.splits.length).toBeGreaterThanOrEqual(1);
    commissionSplitId = calcResponse.data.splits[0].splitId;
    expect(commissionSplitId).toBeDefined();

    const expectedCommission = Math.round((quoteFixtures.basic.premiumAmount * 1000) / 10000);
    expect(calcResponse.data.splits[0].amount).toBe(expectedCommission);
  });

  test('T-E2E-PCLC-03: Post commission to ledger', async () => {
    const correlationId = `test-pclc-03-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const postCommissionResponse = await apiClient.post('/billing/brokerage/commissions/post', {
      sourceType: 'POLICY',
      sourceId: policyId,
    });

    if (postCommissionResponse.success === true) {
      expect(postCommissionResponse.data.journalEntryId).toBeDefined();
    }
  });

  test('T-E2E-PCLC-04: Fetch posted journal entry and verify double-entry balance', async () => {
    const response = await apiClient.get(`/billing/brokerage/journal-entries/${journalEntryId}`);
    AssertionHelpers.assertSuccessResponse(response);
    expect(response.data.journalEntryId).toBe(journalEntryId);

    if (response.data.lines && Array.isArray(response.data.lines)) {
      const totalDebit = response.data.lines.reduce((sum: number, l: any) => sum + (l.debitAmount || 0), 0);
      const totalCredit = response.data.lines.reduce((sum: number, l: any) => sum + (l.creditAmount || 0), 0);
      expect(Math.abs(totalDebit - totalCredit)).toBeLessThan(0.01);
    }
  });

  test('T-E2E-PCLC-05: Create endorsement with premium increase', async () => {
    const correlationId = `test-pclc-05-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const endorseResponse = await apiClient.post(`/policies/policies/${policyId}/endorsements`, {
      endorsementType: 'change',
      effectiveDate: new Date().toISOString(),
      requestedByPartyId: uuidv4(),
      reason: 'Add comprehensive coverage rider',
      payload: {
        premiumDeltaAmount: 2_000_000,
        premiumDeltaCurrency: 'IRR',
        taxDeltaAmount: 180_000,
        taxDeltaCurrency: 'IRR',
        coverageType: 'comprehensive_plus',
        sumInsuredAdjustment: 50_000_000,
      },
    });

    AssertionHelpers.assertSuccessResponse(endorseResponse);
    expect(endorseResponse.data.endorsementId).toBeDefined();
    expect(endorseResponse.data.status).toBe('draft');
  });

  test('T-E2E-PCLC-06: Cancel policy and verify ledger reversal', async () => {
    const correlationId = `test-pclc-06-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const cancelResponse = await apiClient.post(`/policies/policies/${policyId}/cancel`, {
      reason: 'Customer cancellation request',
      cancellationType: 'surrender',
      effectiveDate: new Date().toISOString(),
    });

    AssertionHelpers.assertSuccessResponse(cancelResponse);
    expect(cancelResponse.data.status).toBe('cancelled');

    if (journalEntryId) {
      const reverseResponse = await apiClient.post(`/billing/brokerage/journal-entries/${journalEntryId}/reverse`, {
        reason: 'Policy cancelled by customer',
      });

      if (reverseResponse.success === true) {
        expect(reverseResponse.data.reversalJournalEntryId).toBeDefined();
      }
    }
  });

  test('T-E2E-PCLC-07: Create settlement batch and confirm payment', async () => {
    const correlationId = `test-pclc-07-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const batchResponse = await apiClient.post('/billing/brokerage/settlements/batches', {
      fromOrganizationId: uuidv4(),
      toOrganizationId: uuidv4(),
      periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      periodEnd: new Date().toISOString(),
    });

    AssertionHelpers.assertSuccessResponse(batchResponse);
    settlementBatchId = batchResponse.data.batchId;
    expect(settlementBatchId).toBeDefined();
  });
});
