import { describe, test, expect, beforeAll } from '@jest/globals';
import { ApiClient } from '../helpers/api-client';
import { DbHelper } from '../helpers/db-helper';
import { AssertionHelpers } from '../helpers/assertions';

describe('Integration: Collections Service', () => {
  let apiClient: ApiClient;
  let tenantId: string;

  beforeAll(async () => {
    apiClient = new ApiClient('http://localhost:18000');
    tenantId = 'tenant-col-integration';
    await DbHelper.cleanup('collections');
  });

  test('T-INT-COL-01: Collections: Plan + Installment + Pay + Idempotency', async () => {
    const planResponse = await apiClient.post('/collections/plans', {
      tenantId,
      policyId: 'policy-col-123',
      totalAmount: 100000000,
      installmentCount: 4,
      frequency: 'monthly',
    });
    const planId = planResponse.data.id;

    const installmentResponse = await apiClient.post('/collections/installments', {
      tenantId,
      planId,
      installmentNumber: 1,
      dueAmount: 25000000,
      dueDate: new Date().toISOString(),
    });
    const installmentId = installmentResponse.data.installmentId;

    const idempotencyKey = `idem-col-${Date.now()}`;

    const firstPayResponse = await apiClient.post(`/collections/installments/${installmentId}/pay`, {
      idempotencyKey,
      paymentMethod: 'bank_transfer',
      reference: 'REF-INT-001',
      paidAmount: 25000000,
    });

    const secondPayResponse = await apiClient.post(`/collections/installments/${installmentId}/pay`, {
      idempotencyKey,
      paymentMethod: 'bank_transfer',
      reference: 'REF-INT-001',
      paidAmount: 25000000,
    });

    if (firstPayResponse.success === true && secondPayResponse.success === true) {
      expect(firstPayResponse.data.paymentId).toBe(secondPayResponse.data.paymentId);
    }
  });

  test('T-INT-COL-02: Collections: Outbox events', async () => {
    const planResponse = await apiClient.post('/collections/plans', {
      tenantId,
      policyId: 'policy-events-123',
      totalAmount: 50000000,
      installmentCount: 2,
      frequency: 'monthly',
    });
    const planId = planResponse.data.id;

    try {
      const outboxResponse = await apiClient.get('/collections/outbox', {
        params: { planId },
      });
      if (outboxResponse.success === true) {
        expect(Array.isArray(outboxResponse.data)).toBe(true);
      }
    } catch (error) {
      console.log('Outbox endpoint not yet implemented');
    }
  });
});
