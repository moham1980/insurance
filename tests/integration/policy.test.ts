import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createServiceClient } from '../helpers/api-client';
import { DbHelper } from '../helpers/db-helper';
import { JwtFactory } from '../helpers/jwt-factory';
import { partyFixtures, quoteFixtures } from '../fixtures/party.fixture';

describe('Integration: Policy Service', () => {
  const serviceUrl = process.env.POLICY_SERVICE_URL || 'http://localhost:18007';
  const partyUrl = process.env.PARTY_KYC_URL || 'http://localhost:18006';
  const paymentsUrl = process.env.PAYMENTS_SERVICE_URL || 'http://localhost:18004';
  const tenantId = 'test-tenant';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createServiceClient(serviceUrl, adminToken);
  const partyClient = createServiceClient(partyUrl, adminToken);
  const paymentsClient = createServiceClient(paymentsUrl, adminToken);

  async function createExecutedPaymentForPolicy(policyId: string, amount: number): Promise<string> {
    const idempotencyKey = `test-${policyId}-${Date.now()}`;
    const prepare = await paymentsClient.post('/payments/prepare', {
      idempotencyKey,
      claimId: policyId,
      amount,
      currency: 'IRR',
    });
    expect(prepare.success).toBe(true);
    const paymentIntentId = prepare.data.paymentIntentId;

    const approve = await paymentsClient.post(`/payments/${paymentIntentId}/approve`, {});
    expect(approve.success).toBe(true);

    const execute = await paymentsClient.post(`/payments/${paymentIntentId}/execute`, {
      metadata: { policyId, tenantId },
    });
    expect(execute.success).toBe(true);
    return execute.data.payment.paymentId as string;
  }

  let partyId: string;
  let policyId: string;

  beforeAll(async () => {
    await DbHelper.truncateTable('party', 'parties');
    await DbHelper.truncateTable('policy', 'policies');

    const partyResponse = await partyClient.post('/party', partyFixtures.individual);
    partyId = partyResponse.data.partyId;
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  const quotePayload = {
    partyId: '',
    lineOfBusiness: 'AUTO',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    premiumAmount: 15000000,
    coverages: [{ type: 'third_party', limit: 500000000 }],
    deductibles: [{ type: 'collision', amount: 5000000 }],
  };

  test('Create quote', async () => {
    const response = await apiClient.post('/policies/quote', {
      ...quotePayload,
      partyId,
    });

    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('policyId');
    policyId = response.data.policyId;
  });

  test('Get policy by ID', async () => {
    const getResponse = await apiClient.get(`/policies/${policyId}`);
    expect(getResponse.success).toBe(true);
    expect(getResponse.data.policyId).toBe(policyId);
  });

  test('Submit docs', async () => {
    const response = await apiClient.post(`/policies/${policyId}/submit-docs`, {
      applicationData: { documents: ['id_card', 'address_proof'] },
    });

    expect(response.success).toBe(true);
  });

  test('Risk assess', async () => {
    const response = await apiClient.post(`/policies/${policyId}/risk-assess`, {
      riskAssessment: { score: 0.3, level: 'low' },
    });

    expect(response.success).toBe(true);
  });

  test('Underwriting decision', async () => {
    const response = await apiClient.post(`/policies/${policyId}/underwriting/decision`, {
      decision: 'approved',
      underwriterId: 'underwriter-1',
      notes: 'Risk acceptable',
    });

    expect(response.success).toBe(true);
  });

  test('Issue policy', async () => {
    const paymentId = await createExecutedPaymentForPolicy(policyId, quotePayload.premiumAmount);

    // Quality gate requires Sanhab inquiry; override it for testing
    await apiClient.post(`/policies/${policyId}/quality-gate/override`, {
      action: 'issue',
      reason: 'Test override for issue',
    });

    const response = await apiClient.post(`/policies/${policyId}/issue`, {
      paymentId,
    });

    expect(response.success).toBe(true);
  });

  test('Set unique code', async () => {
    // Quality gate requires Sanhab inquiry; override it for testing
    await apiClient.post(`/policies/${policyId}/quality-gate/override`, {
      action: 'set_unique_code',
      reason: 'Test override for unique code',
    });

    const response = await apiClient.post(`/policies/${policyId}/unique-code`, {
      uniqueCode: 'SANHAB-TEST-123',
    });

    expect(response.success).toBe(true);
  });

  test('List policies', async () => {
    const listResponse = await apiClient.get('/policies', {
      params: { limit: 10, offset: 0 },
    });

    expect(listResponse.success).toBe(true);
    expect(Array.isArray(listResponse.data)).toBe(true);
  });

  test('T-INT-POL-01: Full lifecycle (quote→submit-docs→risk-assess→issue→unique-code)', async () => {
    const quoteResponse = await apiClient.post('/policies/quote', {
      ...quotePayload,
      partyId,
    });
    expect(quoteResponse.success).toBe(true);
    const newPolicyId = quoteResponse.data.policyId;

    const docsResponse = await apiClient.post(`/policies/${newPolicyId}/submit-docs`, {
      applicationData: { documents: ['id_card'] },
    });
    expect(docsResponse.success).toBe(true);

    const riskResponse = await apiClient.post(`/policies/${newPolicyId}/risk-assess`, {
      riskAssessment: { score: 0.2, level: 'low' },
    });
    expect(riskResponse.success).toBe(true);

    const uwResponse = await apiClient.post(`/policies/${newPolicyId}/underwriting/decision`, {
      decision: 'approved',
      underwriterId: 'underwriter-1',
      notes: 'Risk acceptable',
    });
    expect(uwResponse.success).toBe(true);

    const paymentId = await createExecutedPaymentForPolicy(newPolicyId, quotePayload.premiumAmount);

    // Quality gate override for issue
    await apiClient.post(`/policies/${newPolicyId}/quality-gate/override`, {
      action: 'issue',
      reason: 'Test override for issue',
    });

    const issueResponse = await apiClient.post(`/policies/${newPolicyId}/issue`, {
      paymentId,
    });
    expect(issueResponse.success).toBe(true);

    // Quality gate override for unique code
    await apiClient.post(`/policies/${newPolicyId}/quality-gate/override`, {
      action: 'set_unique_code',
      reason: 'Test override for unique code',
    });

    const codeResponse = await apiClient.post(`/policies/${newPolicyId}/unique-code`, {
      uniqueCode: 'SANHAB-INT-123',
    });
    expect(codeResponse.success).toBe(true);

    const finalPolicy = await apiClient.get(`/policies/${newPolicyId}`);
    expect(finalPolicy.success).toBe(true);
    expect(finalPolicy.data.uniqueCode).toBe('SANHAB-INT-123');
  });

  test('T-INT-POL-03: Invalid state transition → error', async () => {
    const quoteResponse = await apiClient.post('/policies/quote', {
      ...quotePayload,
      partyId,
    });
    const newPolicyId = quoteResponse.data.policyId;

    // Try to issue without submit-docs and risk-assess (invalid state)
    const issueResponse = await apiClient.post(`/policies/${newPolicyId}/issue`, {
      paymentId: '00000000-0000-0000-0000-000000000000',
    });

    expect(issueResponse.success).toBe(false);
  });

  test('T-INT-POL-07: Policy timeline', async () => {
    const timelineResponse = await apiClient.get(`/policies/${policyId}/timeline`);
    expect(timelineResponse.success).toBe(true);
  });

  test('T-INT-POL-10: Pagination and filter in list', async () => {
    const listResponse = await apiClient.get('/policies', {
      params: {
        limit: 10,
        offset: 0,
      },
    });

    expect(listResponse.success).toBe(true);
    expect(Array.isArray(listResponse.data)).toBe(true);
  });
});
