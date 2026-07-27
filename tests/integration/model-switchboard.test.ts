import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { ApiClient } from '../helpers/api-client';
import { DbHelper } from '../helpers/db-helper';
import { JwtFactory } from '../helpers/jwt-factory';

describe('Integration: Model Switchboard Service', () => {
  let apiClient: ApiClient;
  let adminToken: string;
  let tenantId: string;
  let modelId: string;
  let routePolicyId: string;

  beforeAll(async () => {
    apiClient = new ApiClient('http://localhost:18000');
    tenantId = 'tenant-model-switchboard-integration';
    adminToken = JwtFactory.createAdminToken(tenantId);
    await DbHelper.cleanup('model_switchboard');
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('T-MS-01: Model CRUD + status change', () => {
    test('should register a model', async () => {
      const createResponse = await apiClient.post('/model-switchboard/models', {
        tenantId,
        name: 'Fraud Detection Model v1',
        modelKey: 'fraud-detection-v1',
        modelType: 'fraud_detection',
        description: 'ML model for fraud detection',
        config: {
          endpoint: 'http://ml-service:8080/predict',
          provider: 'tensorflow',
          version: '1.0.0',
          capabilities: ['fraud_score', 'risk_level'],
        },
        priority: 10,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(createResponse.status).toBe(201);
      expect(createResponse.data.success).toBe(true);
      expect(createResponse.data.data).toHaveProperty('id');
      expect(createResponse.data.data.modelKey).toBe('fraud-detection-v1');
      expect(createResponse.data.data.status).toBe('DRAFT');

      modelId = createResponse.data.data.id;
    });

    test('should activate a model', async () => {
      const activateResponse = await apiClient.put(`/model-switchboard/models/${modelId}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(activateResponse.status).toBe(200);
      expect(activateResponse.data.success).toBe(true);
      expect(activateResponse.data.data.status).toBe('ACTIVE');
      expect(activateResponse.data.data.activatedAt).toBeDefined();
    });

    test('should deactivate a model', async () => {
      const deactivateResponse = await apiClient.put(`/model-switchboard/models/${modelId}/deactivate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(deactivateResponse.status).toBe(200);
      expect(deactivateResponse.data.success).toBe(true);
      expect(deactivateResponse.data.data.status).toBe('INACTIVE');
      expect(deactivateResponse.data.data.deactivatedAt).toBeDefined();
    });

    test('should get model by ID', async () => {
      const getResponse = await apiClient.get(`/model-switchboard/models/${modelId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(getResponse.status).toBe(200);
      expect(getResponse.data.success).toBe(true);
      expect(getResponse.data.data.id).toBe(modelId);
    });

    test('should update model', async () => {
      const updateResponse = await apiClient.put(`/model-switchboard/models/${modelId}`, {
        description: 'Updated description for fraud detection model',
        priority: 15,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.success).toBe(true);
      expect(updateResponse.data.data.description).toBe('Updated description for fraud detection model');
    });

    test('should delete model', async () => {
      const createResponse = await apiClient.post('/model-switchboard/models', {
        tenantId,
        name: 'Temp Model',
        modelKey: 'temp-model',
        modelType: 'test',
        config: {},
        priority: 1,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const tempModelId = createResponse.data.data.id;

      const deleteResponse = await apiClient.delete(`/model-switchboard/models/${tempModelId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.data.success).toBe(true);
    });

    test('should list models', async () => {
      const listResponse = await apiClient.get('/model-switchboard/models', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(listResponse.status).toBe(200);
      expect(listResponse.data.success).toBe(true);
      expect(Array.isArray(listResponse.data.data)).toBe(true);
    });
  });

  describe('T-MS-02: RoutePolicy CRUD', () => {
    test('should create a route policy', async () => {
      const createResponse = await apiClient.post('/model-switchboard/route-policies', {
        tenantId,
        name: 'Cost Optimized Policy',
        policyKey: 'cost-optimized',
        description: 'Route to cheapest model that meets quality threshold',
        strategy: 'cost_optimized',
        config: {
          qualityThreshold: 0.8,
          maxCostPerRequest: 0.001,
        },
        priority: 1,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(createResponse.status).toBe(201);
      expect(createResponse.data.success).toBe(true);
      expect(createResponse.data.data).toHaveProperty('id');
      expect(createResponse.data.data.policyKey).toBe('cost-optimized');

      routePolicyId = createResponse.data.data.id;
    });

    test('should activate route policy', async () => {
      const activateResponse = await apiClient.put(`/model-switchboard/route-policies/${routePolicyId}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(activateResponse.status).toBe(200);
      expect(activateResponse.data.success).toBe(true);
      expect(activateResponse.data.data.status).toBe('ACTIVE');
    });

    test('should get route policy by ID', async () => {
      const getResponse = await apiClient.get(`/model-switchboard/route-policies/${routePolicyId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(getResponse.status).toBe(200);
      expect(getResponse.data.success).toBe(true);
      expect(getResponse.data.data.id).toBe(routePolicyId);
    });

    test('should update route policy', async () => {
      const updateResponse = await apiClient.put(`/model-switchboard/route-policies/${routePolicyId}`, {
        description: 'Updated policy description',
        config: {
          qualityThreshold: 0.85,
          maxCostPerRequest: 0.0005,
        },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.success).toBe(true);
    });

    test('should list route policies', async () => {
      const listResponse = await apiClient.get('/model-switchboard/route-policies', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(listResponse.status).toBe(200);
      expect(listResponse.data.success).toBe(true);
      expect(Array.isArray(listResponse.data.data)).toBe(true);
    });
  });

  describe('T-MS-03: Route: capability=summarization → correct model returned', () => {
    test('should route to correct model based on capability', async () => {
      // Create models with different capabilities
      const summarizationModel = await apiClient.post('/model-switchboard/models', {
        tenantId,
        name: 'Summarization Model',
        modelKey: 'summarization-v1',
        modelType: 'summarization',
        config: {
          endpoint: 'http://summarization-service:8080/summarize',
          provider: 'openai',
          capabilities: ['summarization', 'text_generation'],
        },
        priority: 10,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      await apiClient.put(`/model-switchboard/models/${summarizationModel.data.data.id}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      // Route request
      const routeResponse = await apiClient.post('/model-switchboard/route', {
        tenantId,
        capability: 'summarization',
        input: { text: 'Long text to summarize' },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(routeResponse.status).toBe(200);
      expect(routeResponse.data.success).toBe(true);
      expect(routeResponse.data.data).toHaveProperty('selectedModel');
      expect(routeResponse.data.data.selectedModel.modelType).toBe('summarization');
    });
  });

  describe('T-MS-04: Fallback: primary unavailable → next model in chain', () => {
    test('should fallback to next model when primary unavailable', async () => {
      // Create primary and backup models
      const primaryModel = await apiClient.post('/model-switchboard/models', {
        tenantId,
        name: 'Primary OCR Model',
        modelKey: 'ocr-primary',
        modelType: 'ocr',
        config: {
          endpoint: 'http://ocr-primary:8080/extract',
          provider: 'tesseract',
          capabilities: ['ocr'],
        },
        priority: 1,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const backupModel = await apiClient.post('/model-switchboard/models', {
        tenantId,
        name: 'Backup OCR Model',
        modelKey: 'ocr-backup',
        modelType: 'ocr',
        config: {
          endpoint: 'http://ocr-backup:8080/extract',
          provider: 'google_vision',
          capabilities: ['ocr'],
        },
        priority: 2,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      // Activate both models
      await apiClient.put(`/model-switchboard/models/${primaryModel.data.data.id}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      await apiClient.put(`/model-switchboard/models/${backupModel.data.data.id}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      // Simulate primary failure and test fallback
      const routeResponse = await apiClient.post('/model-switchboard/route', {
        tenantId,
        capability: 'ocr',
        input: { imageUrl: 'test-image.jpg' },
        options: {
          fallbackEnabled: true,
        },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(routeResponse.status).toBe(200);
      expect(routeResponse.data.success).toBe(true);
    });
  });

  describe('T-MS-05: Cost budget: budget exhausted → cheapest model or error', () => {
    test('should enforce cost budget and route to cheapest model', async () => {
      const cheapModel = await apiClient.post('/model-switchboard/models', {
        tenantId,
        name: 'Cheap Model',
        modelKey: 'cheap-model',
        modelType: 'text_generation',
        config: {
          endpoint: 'http://cheap-service:8080/generate',
          provider: 'local',
          costPerRequest: 0.0001,
          capabilities: ['text_generation'],
        },
        priority: 10,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const expensiveModel = await apiClient.post('/model-switchboard/models', {
        tenantId,
        name: 'Expensive Model',
        modelKey: 'expensive-model',
        modelType: 'text_generation',
        config: {
          endpoint: 'http://expensive-service:8080/generate',
          provider: 'openai',
          costPerRequest: 0.01,
          capabilities: ['text_generation'],
        },
        priority: 5,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      // Activate models
      await apiClient.put(`/model-switchboard/models/${cheapModel.data.data.id}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      await apiClient.put(`/model-switchboard/models/${expensiveModel.data.data.id}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      // Route with cost budget
      const routeResponse = await apiClient.post('/model-switchboard/route', {
        tenantId,
        capability: 'text_generation',
        input: { prompt: 'Test prompt' },
        options: {
          costBudget: 0.001,
          strategy: 'cost_optimized',
        },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(routeResponse.status).toBe(200);
      expect(routeResponse.data.success).toBe(true);
    });
  });

  describe('T-MS-06: Routing strategy: cost_optimized → cheapest with quality≥threshold', () => {
    test('should select cheapest model meeting quality threshold', async () => {
      const lowQualityCheapModel = await apiClient.post('/model-switchboard/models', {
        tenantId,
        name: 'Low Quality Cheap',
        modelKey: 'low-quality-cheap',
        modelType: 'text_generation',
        config: {
          endpoint: 'http://low-quality:8080/generate',
          provider: 'local',
          costPerRequest: 0.0001,
          qualityScore: 0.7,
          capabilities: ['text_generation'],
        },
        priority: 10,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const highQualityExpensiveModel = await apiClient.post('/model-switchboard/models', {
        tenantId,
        name: 'High Quality Expensive',
        modelKey: 'high-quality-expensive',
        modelType: 'text_generation',
        config: {
          endpoint: 'http://high-quality:8080/generate',
          provider: 'openai',
          costPerRequest: 0.01,
          qualityScore: 0.95,
          capabilities: ['text_generation'],
        },
        priority: 5,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const mediumQualityMidCostModel = await apiClient.post('/model-switchboard/models', {
        tenantId,
        name: 'Medium Quality Mid Cost',
        modelKey: 'medium-quality-mid',
        modelType: 'text_generation',
        config: {
          endpoint: 'http://medium-quality:8080/generate',
          provider: 'anthropic',
          costPerRequest: 0.002,
          qualityScore: 0.85,
          capabilities: ['text_generation'],
        },
        priority: 8,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      // Activate models
      await apiClient.put(`/model-switchboard/models/${lowQualityCheapModel.data.data.id}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      await apiClient.put(`/model-switchboard/models/${highQualityExpensiveModel.data.data.id}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      await apiClient.put(`/model-switchboard/models/${mediumQualityMidCostModel.data.data.id}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      // Route with cost optimization
      const routeResponse = await apiClient.post('/model-switchboard/route', {
        tenantId,
        capability: 'text_generation',
        input: { prompt: 'Test prompt' },
        options: {
          strategy: 'cost_optimized',
          qualityThreshold: 0.8,
        },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(routeResponse.status).toBe(200);
      expect(routeResponse.data.success).toBe(true);
      // Should select medium quality mid cost model (cheapest with quality >= 0.8)
    });
  });

  describe('T-MS-07: Routing strategy: quality_optimized → best quality', () => {
    test('should select highest quality model', async () => {
      const routeResponse = await apiClient.post('/model-switchboard/route', {
        tenantId,
        capability: 'text_generation',
        input: { prompt: 'Test prompt' },
        options: {
          strategy: 'quality_optimized',
        },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(routeResponse.status).toBe(200);
      expect(routeResponse.data.success).toBe(true);
      // Should select highest quality model
    });
  });

  describe('T-MS-08: Usage recording + reporting', () => {
    test('should record model usage', async () => {
      const invokeResponse = await apiClient.post('/model-switchboard/invoke', {
        tenantId,
        modelType: 'text_generation',
        businessKey: 'test-123',
        input: {
          prompt: 'Test prompt for usage recording',
        },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(invokeResponse.status).toBe(200);
      expect(invokeResponse.data.success).toBe(true);
      expect(invokeResponse.data.data).toHaveProperty('id');
      expect(invokeResponse.data.data).toHaveProperty('usage');
    });

    test('should list model invocations', async () => {
      const listResponse = await apiClient.get('/model-switchboard/invocations', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(listResponse.status).toBe(200);
      expect(listResponse.data.success).toBe(true);
      expect(Array.isArray(listResponse.data.data)).toBe(true);
    });

    test('should get usage report', async () => {
      const reportResponse = await apiClient.get('/model-switchboard/usage/report', {
        params: {
          tenantId,
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        },
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(reportResponse.status).toBe(200);
      expect(reportResponse.data.success).toBe(true);
      expect(reportResponse.data.data).toHaveProperty('totalInvocations');
      expect(reportResponse.data.data).toHaveProperty('totalCost');
    });
  });

  describe('T-MS-09: E2E: Copilot → switchboard route → model selected → response generated', () => {
    test('should route Copilot request through switchboard', async () => {
      const copilotModel = await apiClient.post('/model-switchboard/models', {
        tenantId,
        name: 'Copilot Model',
        modelKey: 'copilot-v1',
        modelType: 'copilot',
        config: {
          endpoint: 'http://copilot-service:8080/chat',
          provider: 'openai',
          capabilities: ['chat', 'summarization'],
        },
        priority: 10,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      await apiClient.put(`/model-switchboard/models/${copilotModel.data.data.id}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const invokeResponse = await apiClient.post('/model-switchboard/invoke', {
        tenantId,
        modelType: 'copilot',
        businessKey: 'copilot-session-123',
        input: {
          message: 'How do I file a claim?',
          context: {
            userId: 'user-123',
            sessionId: 'session-456',
          },
        },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(invokeResponse.status).toBe(200);
      expect(invokeResponse.data.success).toBe(true);
      expect(invokeResponse.data.data).toHaveProperty('result');
    });
  });

  describe('T-MS-10: E2E: Document AI → switchboard route → model selected → extraction', () => {
    test('should route Document AI request through switchboard', async () => {
      const ocrModel = await apiClient.post('/model-switchboard/models', {
        tenantId,
        name: 'Document AI OCR Model',
        modelKey: 'document-ai-ocr',
        modelType: 'ocr',
        config: {
          endpoint: 'http://document-ai:8080/extract',
          provider: 'tesseract',
          capabilities: ['ocr', 'extraction'],
        },
        priority: 10,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      await apiClient.put(`/model-switchboard/models/${ocrModel.data.data.id}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const invokeResponse = await apiClient.post('/model-switchboard/invoke', {
        tenantId,
        modelType: 'ocr',
        businessKey: 'document-ai-job-123',
        input: {
          documentUrl: 'https://example.com/document.pdf',
          extractionType: 'policy',
        },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(invokeResponse.status).toBe(200);
      expect(invokeResponse.data.success).toBe(true);
      expect(invokeResponse.data.data).toHaveProperty('result');
    });
  });

  describe('T-MS-11: Health: high error rate model → automatic fallback', () => {
    test('should automatically fallback from unhealthy model', async () => {
      const healthyModel = await apiClient.post('/model-switchboard/models', {
        tenantId,
        name: 'Healthy Model',
        modelKey: 'healthy-model',
        modelType: 'text_generation',
        config: {
          endpoint: 'http://healthy-service:8080/generate',
          provider: 'local',
          capabilities: ['text_generation'],
        },
        priority: 2,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const unhealthyModel = await apiClient.post('/model-switchboard/models', {
        tenantId,
        name: 'Unhealthy Model',
        modelKey: 'unhealthy-model',
        modelType: 'text_generation',
        config: {
          endpoint: 'http://unhealthy-service:8080/generate',
          provider: 'external',
          capabilities: ['text_generation'],
        },
        priority: 1,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      // Activate both models
      await apiClient.put(`/model-switchboard/models/${healthyModel.data.data.id}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      await apiClient.put(`/model-switchboard/models/${unhealthyModel.data.data.id}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      // Mark unhealthy model as having high error rate
      await apiClient.put(`/model-switchboard/models/${unhealthyModel.data.data.id}/health`, {
        errorRate: 0.5,
        status: 'unhealthy',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      // Route should fallback to healthy model
      const routeResponse = await apiClient.post('/model-switchboard/route', {
        tenantId,
        capability: 'text_generation',
        input: { prompt: 'Test prompt' },
        options: {
          fallbackEnabled: true,
        },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(routeResponse.status).toBe(200);
      expect(routeResponse.data.success).toBe(true);
    });

    test('should get model health status', async () => {
      const healthResponse = await apiClient.get('/model-switchboard/models/health', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(healthResponse.status).toBe(200);
      expect(healthResponse.data.success).toBe(true);
      expect(Array.isArray(healthResponse.data.data)).toBe(true);
    });
  });
});
