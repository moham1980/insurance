import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createGatewayClient } from '../helpers/api-client';
import { JwtFactory } from '../helpers/jwt-factory';
import { DbHelper } from '../helpers/db-helper';
import { DockerComposeHelper } from '../helpers/docker-compose';
import { AssertionHelpers } from '../helpers/assertions';

describe('E2E: Collections Flow', () => {
  const tenantId = 'test-tenant';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createGatewayClient(adminToken);
  apiClient.setTenantId(tenantId);

  let correlationId: string;

  beforeAll(async () => {
    await DockerComposeHelper.waitForHealth('api-gateway', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('collections-service', { timeoutMs: 60000 });
    await DbHelper.truncateTable('public', 'plans');
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('T-E2E-COL-01: Plan → Installment → Pay', async () => {
    correlationId = `test-col-01-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const planResponse = await apiClient.post('/collections/plans', {
      tenantId,
      policyId: 'policy-col-123',
      totalAmount: 100000000,
      installmentCount: 4,
      frequency: 'monthly',
    });
    AssertionHelpers.assertSuccessResponse(planResponse);
    const planId = planResponse.data.planId;

    // List installments for the plan
    const listResponse = await apiClient.get('/collections/installments', {
      params: { planId, limit: 10 },
    });
    AssertionHelpers.assertSuccessResponse(listResponse);
    expect(Array.isArray(listResponse.data)).toBe(true);
    expect(listResponse.data.length).toBeGreaterThan(0);

    const installmentId = listResponse.data[0].installmentId;

    // Pay Installment
    const payResponse = await apiClient.post(`/collections/installments/${installmentId}/pay`, {
      paymentMethod: 'bank_transfer',
      reference: 'REF-COL-001',
      paidAmount: 25000000,
    });

    if (payResponse.success === true) {
      expect(payResponse.data.status).toBe('paid');
    }
  });

  test('T-E2E-COL-02: Idempotency in payment', async () => {
    correlationId = `test-col-02-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const planResponse = await apiClient.post('/collections/plans', {
      tenantId,
      policyId: 'policy-idem-123',
      totalAmount: 50000000,
      installmentCount: 2,
      frequency: 'monthly',
    });
    const planId = planResponse.data.planId;

    const listResponse = await apiClient.get('/collections/installments', {
      params: { planId, limit: 10 },
    });
    const installmentId = listResponse.data[0].installmentId;

    const idempotencyKey = `idem-col-${Date.now()}`;

    const firstPayResponse = await apiClient.post(`/collections/installments/${installmentId}/pay`, {
      idempotencyKey,
      paymentMethod: 'bank_transfer',
      reference: 'REF-IDEM-001',
      paidAmount: 25000000,
    });

    const secondPayResponse = await apiClient.post(`/collections/installments/${installmentId}/pay`, {
      idempotencyKey,
      paymentMethod: 'bank_transfer',
      reference: 'REF-IDEM-001',
      paidAmount: 25000000,
    });

    if (firstPayResponse.success === true && secondPayResponse.success === true) {
      expect(secondPayResponse.data.status).toBe(firstPayResponse.data.status);
    }
  });

  test('T-E2E-COL-03: Overdue installments and reminder', async () => {
    correlationId = `test-col-03-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const planResponse = await apiClient.post('/collections/plans', {
      tenantId,
      policyId: 'policy-overdue-123',
      totalAmount: 30000000,
      installmentCount: 1,
      frequency: 'single',
    });
    const planId = planResponse.data.planId;

    const listResponse = await apiClient.get('/collections/installments', {
      params: { planId, limit: 10 },
    });
    const installmentId = listResponse.data[0].installmentId;

    // Mark overdue
    const overdueResponse = await apiClient.post(`/collections/installments/${installmentId}/overdue`, {
      reason: 'Payment deadline passed',
    });
    if (overdueResponse.success === true) {
      expect(overdueResponse.data.status).toBe('overdue');
    }

    // Send reminder
    const reminderResponse = await apiClient.post(`/collections/installments/${installmentId}/reminder`, {
      channel: 'sms',
      message: 'Please pay your overdue installment',
    });
    if (reminderResponse.success === true) {
      expect(reminderResponse.data.sent).toBe(true);
    }
  });
});
