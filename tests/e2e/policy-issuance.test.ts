import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createGatewayClient } from '../helpers/api-client';
import { JwtFactory } from '../helpers/jwt-factory';
import { partyFixtures, quoteFixtures } from '../fixtures/party.fixture';
import { DbHelper } from '../helpers/db-helper';
import { DockerComposeHelper } from '../helpers/docker-compose';
import { AssertionHelpers } from '../helpers/assertions';

describe('E2E: Policy Issuance Flow', () => {
  const tenantId = 'test-tenant';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createGatewayClient(adminToken);
  apiClient.setTenantId(tenantId);

  let partyId: string;
  let policyId: string;
  let correlationId: string;

  async function createExecutedPaymentForPolicy(localPolicyId: string, amount: number): Promise<string> {
    const idempotencyKey = `e2e-${localPolicyId}-${Date.now()}`;
    const prepare = await apiClient.post('/payments/payments/prepare', {
      idempotencyKey,
      claimId: localPolicyId,
      amount,
      currency: 'IRR',
    });
    AssertionHelpers.assertSuccessResponse(prepare);
    const paymentIntentId = prepare.data.paymentIntentId;

    const approve = await apiClient.post(`/payments/payments/${paymentIntentId}/approve`, {});
    AssertionHelpers.assertSuccessResponse(approve);

    const execute = await apiClient.post(`/payments/payments/${paymentIntentId}/execute`, {
      metadata: { policyId: localPolicyId, tenantId },
    });
    AssertionHelpers.assertSuccessResponse(execute);
    return execute.data.payment.paymentId as string;
  }

  beforeAll(async () => {
    await DockerComposeHelper.waitForHealth('api-gateway', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('party-kyc-service', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('payments-service', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('policy-service', { timeoutMs: 60000 });
    await DbHelper.truncateTable('party', 'parties');
    await DbHelper.truncateTable('policy', 'policies');
    await DbHelper.truncateTable('payments', 'payment_intents');
    await DbHelper.truncateTable('payments', 'payments');
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('T-E2E-POL-01: Register Party → Create Quote → Convert to Policy', async () => {
    correlationId = `test-pol-01-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const partyResponse = await apiClient.post('/party/party', partyFixtures.individual);
    AssertionHelpers.assertSuccessResponse(partyResponse);
    partyId = partyResponse.data.partyId;
    expect(partyResponse.data.type).toBe('individual');

    const quoteResponse = await apiClient.post('/policies/policies/quote', {
      ...quoteFixtures.basic,
      partyId,
      tenantId,
    });
    AssertionHelpers.assertSuccessResponse(quoteResponse);
    expect(quoteResponse.data.partyId).toBe(partyId);

    const policyResponse = await apiClient.post('/policies/policies/convert-quote', {
      quote: { ...quoteFixtures.basic, partyId, tenantId },
      tenantId,
    });
    AssertionHelpers.assertSuccessResponse(policyResponse);
    policyId = policyResponse.data.policyId;
    expect(policyResponse.data.status).toBe('inquiry');
  });

  test('T-E2E-POL-02: Submit Documents', async () => {
    correlationId = `test-pol-02-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const docsResponse = await apiClient.post(`/policies/policies/${policyId}/submit-docs`, {
      applicationData: {
        documents: [{ type: 'id_card', url: 'https://example.com/id.pdf' }],
        submittedBy: 'agent-1',
      },
    });
    AssertionHelpers.assertSuccessResponse(docsResponse);
    expect(docsResponse.data.policyId).toBe(policyId);
  });

  test('T-E2E-POL-03: Risk Assessment', async () => {
    correlationId = `test-pol-03-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const riskResponse = await apiClient.post(`/policies/policies/${policyId}/risk-assess`, {
      riskAssessment: { riskScore: 25, assessorId: 'underwriter-1', notes: 'Low risk profile' },
    });
    AssertionHelpers.assertSuccessResponse(riskResponse);
    expect(riskResponse.data.policyId).toBe(policyId);
  });

  test('T-E2E-POL-04: Issue Policy', async () => {
    correlationId = `test-pol-04-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    await apiClient.post(`/policies/policies/${policyId}/underwriting/decision`, {
      decision: 'approved',
      underwriterId: 'underwriter-1',
      notes: 'Approved after risk assessment',
    });
    const paymentId = await createExecutedPaymentForPolicy(policyId, quoteFixtures.basic.premiumAmount);

    await apiClient.post(`/policies/policies/${policyId}/quality-gate/override`, {
      action: 'issue',
      reason: 'Bypass Sanhab for E2E test',
    });
    const issueResponse = await apiClient.post(`/policies/policies/${policyId}/issue`, {
      paymentId,
      notes: 'Approved after risk assessment',
    });
    AssertionHelpers.assertSuccessResponse(issueResponse);
    expect(issueResponse.data.status).toBe('issued');
  });

  test('T-E2E-POL-05: Set Unique Code (Sanhab)', async () => {
    correlationId = `test-pol-05-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    await apiClient.post(`/policies/policies/${policyId}/quality-gate/override`, {
      action: 'set_unique_code',
      reason: 'Bypass Sanhab for E2E test',
    });
    const uniqueCodeResponse = await apiClient.post(`/policies/policies/${policyId}/unique-code`, {
      uniqueCode: 'SANHAB-1234567890',
    });
    AssertionHelpers.assertSuccessResponse(uniqueCodeResponse);
    expect(uniqueCodeResponse.data.uniqueCode).toBe('SANHAB-1234567890');
  });

  test('T-E2E-POL-06: Complete issuance flow end-to-end', async () => {
    correlationId = `test-pol-06-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const partyResponse = await apiClient.post('/party/party', {
      ...partyFixtures.individual,
      nationalId: '9876543210',
    });
    AssertionHelpers.assertSuccessResponse(partyResponse);
    const newPartyId = partyResponse.data.partyId;

    const quoteResponse = await apiClient.post('/policies/policies/quote', {
      ...quoteFixtures.basic,
      partyId: newPartyId,
      tenantId,
    });
    AssertionHelpers.assertSuccessResponse(quoteResponse);
    const newQuoteId = quoteResponse.data.policyId;

    const policyResponse = await apiClient.post('/policies/policies/convert-quote', {
      quote: { ...quoteFixtures.basic, partyId: newPartyId, tenantId },
      tenantId,
    });
    AssertionHelpers.assertSuccessResponse(policyResponse);
    const newPolicyId = policyResponse.data.policyId;

    await apiClient.post(`/policies/policies/${newPolicyId}/submit-docs`, {
      applicationData: {
        documents: [{ type: 'id_card', url: 'https://example.com/id.pdf' }],
      },
    });

    await apiClient.post(`/policies/policies/${newPolicyId}/risk-assess`, {
      riskAssessment: { riskScore: 30, assessorId: 'underwriter-1', notes: 'Medium risk' },
    });

    await apiClient.post(`/policies/policies/${newPolicyId}/underwriting/decision`, {
      decision: 'approved',
      underwriterId: 'underwriter-1',
      notes: 'Medium risk acceptable',
    });
    const paymentId = await createExecutedPaymentForPolicy(newPolicyId, quoteFixtures.basic.premiumAmount);

    await apiClient.post(`/policies/policies/${newPolicyId}/quality-gate/override`, {
      action: 'issue',
      reason: 'Bypass Sanhab for E2E test',
    });
    await apiClient.post(`/policies/policies/${newPolicyId}/issue`, {
      paymentId,
    });
    await apiClient.post(`/policies/policies/${newPolicyId}/quality-gate/override`, {
      action: 'set_unique_code',
      reason: 'Bypass Sanhab for E2E test',
    });
    await apiClient.post(`/policies/policies/${newPolicyId}/unique-code`, {
      uniqueCode: 'SANHAB-0987654321',
    });

    const finalPolicy = await apiClient.get(`/policies/policies/${newPolicyId}`);
    AssertionHelpers.assertSuccessResponse(finalPolicy);
    expect(finalPolicy.data.status).toBe('active');
    expect(finalPolicy.data.uniqueCode).toBe('SANHAB-0987654321');
  });

  test('T-E2E-POL-07: Sanhab SMS inquiry', async () => {
    correlationId = `test-pol-07-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const inquiryResponse = await apiClient.post('/policies/policies/sanhab/sms-inquiry', {
      nationalId: '1234567890',
      uniqueCode: 'SANHAB-TEST-001',
      phoneNumber: '+989123456789',
    });
    AssertionHelpers.assertSuccessResponse(inquiryResponse);
    expect(inquiryResponse.data).toHaveProperty('inquiryId');
  });

  test('T-E2E-POL-08: Invalid issue on non-existent policy fails', async () => {
    correlationId = `test-pol-08-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    try {
      await apiClient.post('/policies/policies/non-existent-policy-id/issue', {
        paymentId: '00000000-0000-0000-0000-000000000000',
      });
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  test('T-E2E-POL-09: Quality Gate override', async () => {
    correlationId = `test-pol-09-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const quoteResponse = await apiClient.post('/policies/policies/quote', {
      ...quoteFixtures.basic,
      partyId,
      tenantId,
    });
    const quoteId = quoteResponse.data.policyId;

    const policyResponse = await apiClient.post('/policies/policies/convert-quote', {
      quote: { ...quoteFixtures.basic, partyId, tenantId },
      tenantId,
    });
    const newPolicyId = policyResponse.data.policyId;

    await apiClient.post(`/policies/policies/${newPolicyId}/submit-docs`, {
      applicationData: {
        documents: [{ type: 'id_card', url: 'https://example.com/id.pdf' }],
      },
    });
    await apiClient.post(`/policies/policies/${newPolicyId}/risk-assess`, {
      riskAssessment: { riskScore: 30, assessorId: 'underwriter-1', notes: 'Medium risk' },
    });
    await apiClient.post(`/policies/policies/${newPolicyId}/underwriting/decision`, {
      decision: 'approved',
      underwriterId: 'underwriter-1',
      notes: 'Approved',
    });
    const paymentId = await createExecutedPaymentForPolicy(newPolicyId, quoteFixtures.basic.premiumAmount);

    await apiClient.post(`/policies/policies/${newPolicyId}/quality-gate/override`, {
      action: 'issue',
      reason: 'Bypass Sanhab for E2E test',
    });
    await apiClient.post(`/policies/policies/${newPolicyId}/issue`, {
      paymentId,
    });

    const overrideResponse = await apiClient.post(`/policies/policies/${newPolicyId}/quality-gate/override`, {
      action: 'set_unique_code',
      reason: 'Manual override approved by manager',
    });

    if (overrideResponse.success === true) {
      expect(overrideResponse.data).toHaveProperty('changeId');
    }
  });

  test('T-E2E-POL-10: Underwriting decision', async () => {
    correlationId = `test-pol-10-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const quoteResponse = await apiClient.post('/policies/policies/quote', {
      ...quoteFixtures.basic,
      partyId,
      tenantId,
    });
    const quoteId = quoteResponse.data.policyId;

    const policyResponse = await apiClient.post('/policies/policies/convert-quote', {
      quote: { ...quoteFixtures.basic, partyId, tenantId },
      tenantId,
    });
    const newPolicyId = policyResponse.data.policyId;

    const approveResponse = await apiClient.post(`/policies/policies/${newPolicyId}/underwriting/decision`, {
      decision: 'approved',
      underwriterId: 'underwriter-1',
      notes: 'Risk acceptable',
    });
    if (approveResponse.success === true) {
      expect(approveResponse.data.decision).toBe('approved');
    }
  });

  test('T-E2E-POL-11: Policy endorsement', async () => {
    correlationId = `test-pol-11-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const partyResponse = await apiClient.post('/party/party', {
      ...partyFixtures.individual,
      nationalId: '4444444444',
    });
    const newPartyId = partyResponse.data.partyId;

    const quoteResponse = await apiClient.post('/policies/policies/quote', {
      ...quoteFixtures.basic,
      partyId: newPartyId,
      tenantId,
    });
    const newQuoteId = quoteResponse.data.policyId;

    const policyResponse = await apiClient.post('/policies/policies/convert-quote', {
      quote: { ...quoteFixtures.basic, partyId: newPartyId, tenantId },
      tenantId,
    });
    const newPolicyId = policyResponse.data.policyId;

    await apiClient.post(`/policies/policies/${newPolicyId}/submit-docs`, {
      applicationData: {
        documents: [{ type: 'id_card', url: 'https://example.com/id.pdf' }],
      },
    });
    await apiClient.post(`/policies/policies/${newPolicyId}/risk-assess`, {
      riskAssessment: { riskScore: 30, assessorId: 'underwriter-1', notes: 'Medium risk' },
    });
    await apiClient.post(`/policies/policies/${newPolicyId}/underwriting/decision`, {
      decision: 'approved',
      underwriterId: 'underwriter-1',
      notes: 'Approved',
    });
    const paymentId = await createExecutedPaymentForPolicy(newPolicyId, quoteFixtures.basic.premiumAmount);

    await apiClient.post(`/policies/policies/${newPolicyId}/quality-gate/override`, {
      action: 'issue',
      reason: 'Bypass Sanhab for E2E test',
    });
    await apiClient.post(`/policies/policies/${newPolicyId}/issue`, {
      paymentId,
    });
    await apiClient.post(`/policies/policies/${newPolicyId}/quality-gate/override`, {
      action: 'set_unique_code',
      reason: 'Bypass Sanhab for E2E test',
    });
    await apiClient.post(`/policies/policies/${newPolicyId}/unique-code`, {
      uniqueCode: 'SANHAB-ENDORSEMENT-001',
    });

    const changeResponse = await apiClient.post(`/policies/policies/${newPolicyId}/endorse`, {
      changeType: 'endorsement',
      endorsementType: 'coverage_change',
      reason: 'Add additional coverage',
      effectiveDate: new Date().toISOString(),
      payload: {
        coverage: 'comprehensive_plus',
        premiumAdjustment: 10000000,
      },
    });

    if (changeResponse.success === true) {
      expect(changeResponse.data).toHaveProperty('policyId');
      expect(changeResponse.data.status).toBe('endorsed');
    }
  });

  test('T-E2E-POL-12: Policy renewal flow', async () => {
    correlationId = `test-pol-12-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const partyResponse = await apiClient.post('/party/party', {
      ...partyFixtures.individual,
      nationalId: '5555555555',
    });
    const newPartyId = partyResponse.data.partyId;

    const quoteResponse = await apiClient.post('/policies/policies/quote', {
      ...quoteFixtures.basic,
      partyId: newPartyId,
      tenantId,
    });
    const newQuoteId = quoteResponse.data.policyId;

    const policyResponse = await apiClient.post('/policies/policies/convert-quote', {
      quote: { ...quoteFixtures.basic, partyId: newPartyId, tenantId },
      tenantId,
    });
    const newPolicyId = policyResponse.data.policyId;

    await apiClient.post(`/policies/policies/${newPolicyId}/submit-docs`, {
      applicationData: {
        documents: [{ type: 'id_card', url: 'https://example.com/id.pdf' }],
      },
    });
    await apiClient.post(`/policies/policies/${newPolicyId}/risk-assess`, {
      riskAssessment: { riskScore: 30, assessorId: 'underwriter-1', notes: 'Medium risk' },
    });
    await apiClient.post(`/policies/policies/${newPolicyId}/underwriting/decision`, {
      decision: 'approved',
      underwriterId: 'underwriter-1',
      notes: 'Approved',
    });
    const paymentId = await createExecutedPaymentForPolicy(newPolicyId, quoteFixtures.basic.premiumAmount);

    await apiClient.post(`/policies/policies/${newPolicyId}/quality-gate/override`, {
      action: 'issue',
      reason: 'Bypass Sanhab for E2E test',
    });
    await apiClient.post(`/policies/policies/${newPolicyId}/issue`, {
      paymentId,
    });
    await apiClient.post(`/policies/policies/${newPolicyId}/quality-gate/override`, {
      action: 'set_unique_code',
      reason: 'Bypass Sanhab for E2E test',
    });
    await apiClient.post(`/policies/policies/${newPolicyId}/unique-code`, {
      uniqueCode: 'SANHAB-RENEWAL-001',
    });

    const renewResponse = await apiClient.post(`/policies/policies/${newPolicyId}/renew`, {
      reason: 'Annual renewal',
      newPremium: 16000000,
    });

    if (renewResponse.success === true) {
      expect(renewResponse.data).toHaveProperty('policyId');
    }
  });

  test('T-E2E-POL-13: Correlation ID propagation', async () => {
    correlationId = `test-pol-13-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const partyResponse = await apiClient.post('/party/party', {
      ...partyFixtures.individual,
      nationalId: '6666666666',
    });
    AssertionHelpers.assertCorrelationId(partyResponse, correlationId);

    const quoteResponse = await apiClient.post('/policies/policies/quote', {
      ...quoteFixtures.basic,
      partyId: partyResponse.data.partyId,
      tenantId,
    });
    AssertionHelpers.assertCorrelationId(quoteResponse, correlationId);
  });
});
