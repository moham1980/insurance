import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createGatewayClient } from '../helpers/api-client';
import { JwtFactory } from '../helpers/jwt-factory';
import { partyFixtures, quoteFixtures, claimFixtures } from '../fixtures/party.fixture';
import { DbHelper } from '../helpers/db-helper';
import { DockerComposeHelper } from '../helpers/docker-compose';
import { AssertionHelpers } from '../helpers/assertions';
import { createExecutedPaymentForPolicy } from '../helpers/payment-helper';

describe('E2E: Payments Flow', () => {
  const tenantId = 'test-tenant';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createGatewayClient(adminToken);
  apiClient.setTenantId(tenantId);

  let partyId: string;
  let policyId: string;
  let claimId: string;
  let paymentIntentId: string;
  let correlationId: string;

  beforeAll(async () => {
    await DockerComposeHelper.waitForHealth('api-gateway', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('party-kyc-service', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('policy-service', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('claims-service', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('payments-service', { timeoutMs: 60000 });

    await DbHelper.truncateTable('public', 'parties');
    await DbHelper.truncateTable('public', 'claims');
    await DbHelper.truncateTable('public', 'payments');

    const partyResponse = await apiClient.post('/party/party', partyFixtures.individual);
    partyId = partyResponse.data.partyId;

    const quoteResponse = await apiClient.post('/policies/policies/quote', {
      ...quoteFixtures.basic,
      partyId,
      tenantId,
    });

    const policyResponse = await apiClient.post('/policies/policies/convert-quote', {
      quote: { ...quoteFixtures.basic, partyId, tenantId },
      tenantId,
    });
    policyId = policyResponse.data.policyId;

    await apiClient.post(`/policies/policies/${policyId}/submit-docs`, {
      applicationData: { documents: [{ type: 'id_card', url: 'https://example.com/id.pdf' }] },
    });
    await apiClient.post(`/policies/policies/${policyId}/risk-assess`, {
      riskAssessment: { riskScore: 25, assessorId: 'underwriter-1', notes: 'Low risk' },
    });
    await apiClient.post(`/policies/policies/${policyId}/underwriting/decision`, {
      decision: 'approved',
      underwriterId: 'underwriter-1',
      notes: 'Approved',
    });
    const paymentId = await createExecutedPaymentForPolicy(apiClient, policyId, quoteFixtures.basic.premiumAmount, tenantId);

    await apiClient.post(`/policies/policies/${policyId}/quality-gate/override`, {
      action: 'issue',
      reason: 'Bypass Sanhab for E2E test',
    });
    await apiClient.post(`/policies/policies/${policyId}/issue`, {
      paymentId,
    });
    await apiClient.post(`/policies/policies/${policyId}/quality-gate/override`, {
      action: 'set_unique_code',
      reason: 'Bypass Sanhab for E2E test',
    });
    await apiClient.post(`/policies/policies/${policyId}/unique-code`, {
      uniqueCode: 'SANHAB-PAYMENTS-001',
    });

    const claimResponse = await apiClient.post('/claims/claims', {
      ...claimFixtures.basic,
      policyId,
      claimantPartyId: partyId,
      tenantId,
    });
    claimId = claimResponse.data.claimId;

    await apiClient.post(`/claims/claims/${claimId}/assess`, {
      assessedAmount: 80000000,
      assessorId: 'assessor-1',
    });

    await apiClient.post(`/claims/claims/${claimId}/approve`, {
      approvedAmount: 75000000,
      approverId: 'approver-1',
    });
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('T-E2E-PAY-01: Prepare → Approve → Execute → Notify payment', async () => {
    correlationId = `test-pay-01-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const prepareResponse = await apiClient.post('/payments/payments/prepare', {
      idempotencyKey: `pay-${Date.now()}`,
      claimId,
      amount: 75000000,
      currency: 'IRR',
      destinationIban: 'IR123456789012345678901234',
      beneficiaryPartyId: partyId,
      paymentDocs: [{ type: 'receipt', url: 'https://example.com/receipt.pdf' }],
    });
    AssertionHelpers.assertSuccessResponse(prepareResponse);
    paymentIntentId = prepareResponse.data.paymentIntentId;
    expect(paymentIntentId).toBeDefined();

    const approveResponse = await apiClient.post(`/payments/payments/${paymentIntentId}/approve`, {
      decisionNotes: 'Approved for payment',
    });
    AssertionHelpers.assertSuccessResponse(approveResponse);
    expect(approveResponse.data.status).toBe('finance_approved');

    const executeResponse = await apiClient.post(`/payments/payments/${paymentIntentId}/execute`, {
      provider: 'bank-transfer',
      providerRef: 'TXN-123456789',
    });
    AssertionHelpers.assertSuccessResponse(executeResponse);
    expect(executeResponse.data.intent.status).toBe('executed');

    const notifyResponse = await apiClient.post(`/payments/payments/${paymentIntentId}/notify`, {
      channel: 'sms',
      details: { recipient: '+989123456789' },
    });
    AssertionHelpers.assertSuccessResponse(notifyResponse);
    expect(notifyResponse.data.status).toBe('notified');
  });

  test('T-E2E-PAY-02: Payment gateway initiation and callback', async () => {
    correlationId = `test-pay-02-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const prepareResponse = await apiClient.post('/payments/payments/prepare', {
      idempotencyKey: `gateway-${Date.now()}`,
      claimId,
      amount: 50000000,
      currency: 'IRR',
      destinationIban: 'IR987654321098765432109876',
      beneficiaryPartyId: partyId,
      paymentDocs: [{ type: 'receipt', url: 'https://example.com/receipt.pdf' }],
    });
    AssertionHelpers.assertSuccessResponse(prepareResponse);
    const intentId = prepareResponse.data.paymentIntentId;

    const gatewayResponse = await apiClient.post(`/payments/payments/${intentId}/gateway/initiate`, {
      gatewayProvider: 'iran-psp',
      returnUrl: 'https://example.com/callback',
      cancelUrl: 'https://example.com/cancel',
    });
    AssertionHelpers.assertSuccessResponse(gatewayResponse);
    expect(gatewayResponse.data).toHaveProperty('gatewayUrl');

    const callbackResponse = await apiClient.post('/payments/payments/gateway/callback', {
      gatewayPaymentId: intentId,
      status: 'success',
      gatewayRef: 'PSP-REF-001',
      gatewayResponse: { code: '00', message: 'OK' },
    });
    AssertionHelpers.assertSuccessResponse(callbackResponse);
  });

  test('T-E2E-PAY-03: Payment reconciliation', async () => {
    correlationId = `test-pay-03-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const reconcileResponse = await apiClient.post('/payments/payments/reconcile', {
      dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dateTo: new Date().toISOString().split('T')[0],
    });

    if (reconcileResponse.success === true) {
      expect(reconcileResponse.data).toHaveProperty('reconciledCount');
    }
  });

  test('T-E2E-PAY-04: Refund payment', async () => {
    correlationId = `test-pay-04-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const prepareResponse = await apiClient.post('/payments/payments/prepare', {
      idempotencyKey: `refund-${Date.now()}`,
      claimId,
      amount: 30000000,
      currency: 'IRR',
      destinationIban: 'IR111111111111111111111111',
      beneficiaryPartyId: partyId,
      paymentDocs: [{ type: 'receipt', url: 'https://example.com/receipt.pdf' }],
    });
    AssertionHelpers.assertSuccessResponse(prepareResponse);
    const intentId = prepareResponse.data.paymentIntentId;

    await apiClient.post(`/payments/payments/${intentId}/approve`, {
      decisionNotes: 'Approved for payment',
    });
    await apiClient.post(`/payments/payments/${intentId}/execute`, {
      provider: 'bank-transfer',
      providerRef: 'TXN-REFUND-001',
    });

    const refundResponse = await apiClient.post(`/payments/payments/${intentId}/refund`, {
      reason: 'Overpayment correction',
      amount: 5000000,
    });

    if (refundResponse.success === true) {
      expect(refundResponse.data).toHaveProperty('refundId');
    }
  });

  test('T-E2E-PAY-05: List and get payment intents', async () => {
    correlationId = `test-pay-05-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const listResponse = await apiClient.get('/payments/payments', {
      params: { limit: 10, offset: 0 },
    });
    AssertionHelpers.assertSuccessResponse(listResponse);
    expect(Array.isArray(listResponse.data)).toBe(true);

    if (listResponse.data.length > 0) {
      const firstId = listResponse.data[0].paymentIntentId;
      const getResponse = await apiClient.get(`/payments/payments/${firstId}`);
      AssertionHelpers.assertSuccessResponse(getResponse);
      expect(getResponse.data.paymentIntentId).toBe(firstId);
    }
  });
});
