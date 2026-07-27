import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createServiceClient } from '../helpers/api-client';
import { DbHelper } from '../helpers/db-helper';
import { JwtFactory } from '../helpers/jwt-factory';
import { paymentFixtures } from '../fixtures/party.fixture';

describe('Integration: Payments Service', () => {
  const serviceUrl = process.env.PAYMENTS_SERVICE_URL || 'http://localhost:18004';
  const tenantId = 'test-tenant';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createServiceClient(serviceUrl, adminToken);
  apiClient.setTenantId(tenantId);

  let paymentIntentId: string;

  beforeAll(async () => {
    await DbHelper.truncateTable('payments', 'payment_intents');
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('Prepare payment intent', async () => {
    const response = await apiClient.post('/payments/prepare', {
      ...paymentFixtures.claim,
      idempotencyKey: `prepare-${Date.now()}`,
      claimId: 'claim-123',
      tenantId,
    });

    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('paymentIntentId');
    expect(response.data.status).toBe('prepared');
    paymentIntentId = response.data.paymentIntentId;
  });

  test('Approve payment intent', async () => {
    const response = await apiClient.post(`/payments/${paymentIntentId}/approve`, {
      idempotencyKey: `approve-${Date.now()}`,
    });

    expect(response.success).toBe(true);
    expect(response.data.status).toBe('finance_approved');
  });

  test('Execute payment', async () => {
    const response = await apiClient.post(`/payments/${paymentIntentId}/execute`, {
      provider: 'bank_transfer',
      providerRef: `REF-${Date.now()}`,
    });

    expect(response.success).toBe(true);
    expect(response.data.intent.status).toBe('executed');
  });

  test('Get payment intent by ID', async () => {
    const getResponse = await apiClient.get(`/payments/${paymentIntentId}`);
    expect(getResponse.success).toBe(true);
    expect(getResponse.data.paymentIntentId).toBe(paymentIntentId);
  });

  test('List payment intents', async () => {
    const listResponse = await apiClient.get('/payments', {
      params: { tenantId },
    });

    expect(listResponse.success).toBe(true);
    expect(Array.isArray(listResponse.data)).toBe(true);
  });

  test('Prepare premium payment', async () => {
    const response = await apiClient.post('/payments/prepare', {
      ...paymentFixtures.premium,
      idempotencyKey: `premium-${Date.now()}`,
      claimId: 'claim-premium-123',
      tenantId,
    });

    expect(response.success).toBe(true);
    expect(response.data.status).toBe('prepared');
  });

  test('T-INT-PAY-01: State machine (prepare→approve→execute→notify)', async () => {
    const prepareResponse = await apiClient.post('/payments/prepare', {
      ...paymentFixtures.claim,
      idempotencyKey: `int-prepare-${Date.now()}`,
      claimId: 'claim-int-123',
      tenantId,
    });
    const intentId = prepareResponse.data.paymentIntentId;
    expect(prepareResponse.data.status).toBe('prepared');

    await apiClient.post(`/payments/${intentId}/approve`, {
      decisionNotes: 'Approved for integration test',
    });

    const approvedIntent = await apiClient.get(`/payments/${intentId}`);
    expect(approvedIntent.data.status).toBe('finance_approved');

    await apiClient.post(`/payments/${intentId}/execute`, {
      provider: 'bank_transfer',
      providerRef: `INT-${Date.now()}`,
    });

    const executedIntent = await apiClient.get(`/payments/${intentId}`);
    expect(executedIntent.data.status).toBe('executed');
  });

  test('T-INT-PAY-02: Idempotency with idempotencyKey', async () => {
    const idempotencyKey = `idem-prepare-${Date.now()}`;
    const prepareResponse = await apiClient.post('/payments/prepare', {
      ...paymentFixtures.claim,
      idempotencyKey,
      claimId: 'claim-idem-123',
      tenantId,
    });
    const intentId = prepareResponse.data.paymentIntentId;

    // Prepare again with same idempotencyKey should return same intent
    const secondPrepare = await apiClient.post('/payments/prepare', {
      ...paymentFixtures.claim,
      idempotencyKey,
      claimId: 'claim-idem-123',
      tenantId,
    });

    expect(secondPrepare.success).toBe(true);
    expect(secondPrepare.data.paymentIntentId).toBe(intentId);
  });

  test('T-INT-PAY-03: Invalid transition → error', async () => {
    const prepareResponse = await apiClient.post('/payments/prepare', {
      ...paymentFixtures.claim,
      idempotencyKey: `invalid-${Date.now()}`,
      claimId: 'claim-invalid-123',
      tenantId,
    });
    const intentId = prepareResponse.data.paymentIntentId;

    // Try to execute without approving — should return error
    const execResponse = await apiClient.post(`/payments/${intentId}/execute`, {
      provider: 'bank_transfer',
      providerRef: 'INVALID',
    });
    expect(execResponse.success).toBe(false);
  });

  test('T-INT-PAY-04: Outbox event for each transition', async () => {
    const prepareResponse = await apiClient.post('/payments/prepare', {
      ...paymentFixtures.claim,
      idempotencyKey: `outbox-${Date.now()}`,
      claimId: 'claim-outbox-123',
      tenantId,
    });
    const intentId = prepareResponse.data.paymentIntentId;

    await apiClient.post(`/payments/${intentId}/approve`, {
      decisionNotes: 'Approved for outbox test',
    });

    // Check outbox events via DB
    const events = await DbHelper.executeQuery('payments',
      `SELECT * FROM outbox_events WHERE subject_json->>'paymentIntentId' = $1 ORDER BY occurred_at`, [intentId]);
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events[0].event_type).toBe('PaymentPrepared');
    expect(events[1].event_type).toBe('PaymentFinanceApproved');
  });

  test('T-INT-PAY-05: Fail path and event insurance.payment.failed', async () => {
    const prepareResponse = await apiClient.post('/payments/prepare', {
      ...paymentFixtures.claim,
      idempotencyKey: `fail-${Date.now()}`,
      claimId: 'claim-fail-123',
      tenantId,
    });
    const intentId = prepareResponse.data.paymentIntentId;

    await apiClient.post(`/payments/${intentId}/approve`, {
      decisionNotes: 'Approved for fail test',
    });

    // Use the fail endpoint to simulate failure
    const failResponse = await apiClient.post(`/payments/${intentId}/fail`, {
      reasonCode: 'TEST_FAILURE',
      reasonMessage: 'Simulated failure for testing',
    });
    expect(failResponse.success).toBe(true);
    expect(failResponse.data.intent.status).toBe('failed');

    // Check outbox for failed event
    const events = await DbHelper.executeQuery('payments',
      `SELECT * FROM outbox_events WHERE subject_json->>'paymentIntentId' = $1 AND event_type = 'PaymentFailed'`, [intentId]);
    expect(events.length).toBeGreaterThanOrEqual(1);
  });
});
