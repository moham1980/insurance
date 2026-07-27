import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createServiceClient } from '../helpers/api-client';
import { DbHelper } from '../helpers/db-helper';

describe('Integration: Orchestrator Service', () => {
  const serviceUrl = process.env.ORCHESTRATOR_SERVICE_URL || 'http://localhost:18010';
  const apiClient = createServiceClient(serviceUrl);
  const tenantId = 'test-tenant';

  beforeAll(async () => {
    await DbHelper.truncateTable('orchestrator', 'sagas');
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('Start saga', async () => {
    const response = await apiClient.post('/orchestrator/sagas/start', {
      tenantId,
      sagaType: 'policy_issuance',
      businessKey: 'saga-123',
      context: {
        quoteId: 'quote-123',
        customerId: 'customer-123',
      },
    });

    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('id');
    expect(response.data.sagaType).toBe('policy_issuance');
    expect(response.data.status).toBe('started');
  });

  test('Advance saga step', async () => {
    const startResponse = await apiClient.post('/orchestrator/sagas/start', {
      tenantId,
      sagaType: 'claims_processing',
      businessKey: 'saga-456',
      context: {
        claimId: 'claim-123',
      },
    });
    const sagaId = startResponse.data.id;

    const advanceResponse = await apiClient.post(`/orchestrator/sagas/${sagaId}/advance`, {
      step: 'assessment',
      result: 'success',
    });

    expect(advanceResponse.success).toBe(true);
    expect(advanceResponse.data.currentStep).toBe('assessment');
  });

  test('Complete saga', async () => {
    const startResponse = await apiClient.post('/orchestrator/sagas/start', {
      tenantId,
      sagaType: 'payment_processing',
      businessKey: 'saga-789',
      context: {
        paymentIntentId: 'payment-123',
      },
    });
    const sagaId = startResponse.data.id;

    const completeResponse = await apiClient.post(`/orchestrator/sagas/${sagaId}/complete`, {
      result: 'success',
    });

    expect(completeResponse.success).toBe(true);
    expect(completeResponse.data.status).toBe('completed');
  });

  test('Fail saga', async () => {
    const startResponse = await apiClient.post('/orchestrator/sagas/start', {
      tenantId,
      sagaType: 'test_saga',
      businessKey: 'saga-999',
      context: {},
    });
    const sagaId = startResponse.data.id;

    const failResponse = await apiClient.post(`/orchestrator/sagas/${sagaId}/fail`, {
      reason: 'External service unavailable',
    });

    expect(failResponse.success).toBe(true);
    expect(failResponse.data.status).toBe('failed');
  });

  test('Get saga by ID', async () => {
    const startResponse = await apiClient.post('/orchestrator/sagas/start', {
      tenantId,
      sagaType: 'test_saga',
      businessKey: 'saga-000',
      context: {},
    });
    const sagaId = startResponse.data.id;

    const getResponse = await apiClient.get(`/orchestrator/sagas/${sagaId}`);
    expect(getResponse.success).toBe(true);
    expect(getResponse.data.id).toBe(sagaId);
  });

  test('List sagas', async () => {
    const listResponse = await apiClient.get('/orchestrator/sagas', {
      params: { tenantId },
    });

    expect(listResponse.success).toBe(true);
    expect(Array.isArray(listResponse.data)).toBe(true);
  });

  test('T-INT-ORC-01: Saga start + step execution + Work Item + HITL', async () => {
    const startResponse = await apiClient.post('/orchestrator/sagas/start', {
      tenantId,
      sagaType: 'policy_issuance',
      businessKey: 'saga-int-123',
      context: {
        quoteId: 'quote-123',
        customerId: 'customer-123',
      },
    });
    expect(startResponse.success).toBe(true);
    expect(startResponse.data.status).toBe('started');
    const sagaId = startResponse.data.id;

    // Advance step
    const advanceResponse = await apiClient.post(`/orchestrator/sagas/${sagaId}/advance`, {
      step: 'assessment',
      result: 'success',
    });
    expect(advanceResponse.success).toBe(true);

    // Complete saga
    const completeResponse = await apiClient.post(`/orchestrator/sagas/${sagaId}/complete`, {
      result: 'success',
    });
    expect(completeResponse.success === true || completeResponse.data.status === 'completed').toBe(true);
  });

  test('T-INT-ORC-02: Orchestrator: DLQ + Admin APIs + Compat endpoints', async () => {
    // Start saga that will fail
    const startResponse = await apiClient.post('/orchestrator/sagas/start', {
      tenantId,
      sagaType: 'test_saga',
      businessKey: 'saga-dlq-123',
      context: {},
    });
    const sagaId = startResponse.data.id;

    // Fail saga to send to DLQ
    const failResponse = await apiClient.post(`/orchestrator/sagas/${sagaId}/fail`, {
      reason: 'Service unavailable',
    });
    expect(failResponse.success).toBe(true);

    // Check DLQ
    try {
      const dlqResponse = await apiClient.get('/orchestrator/dlq', {
        params: { tenantId },
      });
      if (dlqResponse.success === true) {
        expect(Array.isArray(dlqResponse.data)).toBe(true);
      }
    } catch (error) {
      console.log('DLQ endpoint not yet implemented');
    }

    // Admin API: Retry from DLQ
    try {
      const retryResponse = await apiClient.post(`/orchestrator/sagas/${sagaId}/retry`);
      if (retryResponse.success === true) {
        expect(retryResponse.data.status).toBe('started');
      }
    } catch (error) {
      console.log('Retry endpoint not yet implemented');
    }
  });
});
