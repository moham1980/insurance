import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { ApiClient } from '../helpers/api-client';
import { JwtFactory } from '../helpers/jwt-factory';
import { DbHelper } from '../helpers/db-helper';

describe('Integration: P7 AI & Experience Features', () => {
  let apiClient: ApiClient;
  let adminToken: string;
  const tenantId = 'tenant-p7-integration';

  beforeAll(async () => {
    apiClient = new ApiClient('http://localhost:18000');
    adminToken = JwtFactory.createAdminToken(tenantId);
    apiClient.setToken(adminToken);
    apiClient.setTenantId(tenantId);
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  describe('T-INT-P7-01: Customer 360 consent and portfolio', () => {
    const customerId = 'customer-p7-001';

    test('should record a consent', async () => {
      const response = await apiClient.post(`/customer-360/${customerId}/consents`, {
        purpose: 'analytics',
        status: 'granted',
      });
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data.purpose).toBe('analytics');
      expect(response.data.data.status).toBe('granted');
    });

    test('should list consents', async () => {
      const response = await apiClient.get(`/customer-360/${customerId}/consents`);
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    test('should check consent for a purpose', async () => {
      const response = await apiClient.get(`/customer-360/${customerId}/consents/check?purpose=analytics`);
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.granted).toBe(true);
    });

    test('should get portfolio summary', async () => {
      const response = await apiClient.get(`/customer-360/${customerId}/portfolio`);
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('totalPolicies');
      expect(response.data.data).toHaveProperty('netPosition');
    });
  });

  describe('T-INT-P7-02: Notification credential vault', () => {
    test('should store and list a credential', async () => {
      const setResponse = await apiClient.post('/notifications/credentials', {
        provider: 'kavenegar',
        credentialType: 'api_key',
        value: 'super-secret-key-12345678',
      });
      expect(setResponse.status).toBe(201);
      expect(setResponse.data.success).toBe(true);
      expect(setResponse.data.data.maskedValue).toBe('su...7878');

      const listResponse = await apiClient.get('/notifications/credentials');
      expect(listResponse.status).toBe(200);
      expect(listResponse.data.success).toBe(true);
      expect(listResponse.data.data.some((c: any) => c.provider === 'kavenegar')).toBe(true);
    });
  });

  describe('T-INT-P7-03: Model switchboard governance', () => {
    let modelId: string;

    test('should register and activate a model', async () => {
      const createResponse = await apiClient.post('/model-switchboard/models', {
        tenantId,
        name: 'Test P7 Model',
        modelKey: 'test-p7-model',
        modelType: 'summarization',
        config: {
          endpoint: 'http://localhost:8080/predict',
          provider: 'openai',
          version: '1.0.0',
        },
        priority: 5,
      });
      expect(createResponse.status).toBe(201);
      modelId = createResponse.data.data.id;

      const activateResponse = await apiClient.put(`/model-switchboard/models/${modelId}/activate`, {});
      expect(activateResponse.status).toBe(200);
      expect(activateResponse.data.data.status).toBe('ACTIVE');
    });

    test('should reject invocation before model card approval', async () => {
      const invokeResponse = await apiClient.post('/model-switchboard/invoke', {
        tenantId,
        modelType: 'summarization',
        modelKey: 'test-p7-model',
        input: { text: 'hello' },
      });
      // Governance rejection is expected since model card is missing/not approved
      expect(invokeResponse.status).toBe(200);
      expect(invokeResponse.data.success).toBe(true);
      expect(invokeResponse.data.data.status).toBe('FAILED');
      expect(invokeResponse.data.data.error?.code).toBe('GOVERNANCE_REJECTED');
    });

    test('should approve model card and validate governance', async () => {
      const cardResponse = await apiClient.post('/model-switchboard/model-cards', {
        modelId: 'test-p7-model',
        modelName: 'Test P7 Model',
        purpose: 'summarization',
        biasRiskLevel: 'low',
        version: '1.0.0',
      });
      expect(cardResponse.status).toBe(201);

      const cardId = cardResponse.data.data.id;
      const approveResponse = await apiClient.post(`/model-switchboard/model-cards/${cardId}/approve`, {});
      expect(approveResponse.status).toBe(200);
      expect(approveResponse.data.data.status).toBe('approved');

      const validateResponse = await apiClient.post('/model-switchboard/governance/validate', {
        modelKey: 'test-p7-model',
        tenantId,
      });
      expect(validateResponse.status).toBe(200);
      expect(validateResponse.data.data.allowed).toBe(true);
    });
  });
});
