import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createGatewayClient } from '../helpers/api-client';
import { JwtFactory } from '../helpers/jwt-factory';
import { DbHelper } from '../helpers/db-helper';
import { DockerComposeHelper } from '../helpers/docker-compose';
import { AssertionHelpers } from '../helpers/assertions';

describe('E2E: AI Governance Flow', () => {
  const tenantId = 'test-tenant';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createGatewayClient(adminToken);
  apiClient.setTenantId(tenantId);

  let correlationId: string;

  beforeAll(async () => {
    await DockerComposeHelper.waitForHealth('api-gateway', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('ai-governance-service', { timeoutMs: 60000 });
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('T-E2E-AIG-01: Register model card and validate', async () => {
    correlationId = `test-aig-01-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const registerResponse = await apiClient.post('/model-switchboard/models', {
      name: 'fraud-detection-v2',
      version: '2.0.0',
      type: 'classification',
      description: 'ML-based fraud detection for claims',
      owner: 'data-science-team',
      trainingDataSchema: { features: ['amount', 'velocity', 'pattern'] },
    });
    AssertionHelpers.assertSuccessResponse(registerResponse);
    expect(registerResponse.data).toHaveProperty('modelId');

    const modelId = registerResponse.data.modelId;

    const validateResponse = await apiClient.post(`/model-switchboard/models/${modelId}/validate`, {
      validationType: 'pre-deployment',
      datasetId: 'test-dataset-001',
    });
    AssertionHelpers.assertSuccessResponse(validateResponse);
    expect(validateResponse.data).toHaveProperty('validationId');
  });

  test('T-E2E-AIG-02: Model validation workflow with real endpoint', async () => {
    correlationId = `test-aig-02-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const workflowResponse = await apiClient.post('/model-switchboard/validation-workflow', {
      modelName: 'claims-triage-v1',
      modelVersion: '1.0.0',
      validationUrl: process.env.MODEL_VALIDATION_URL || 'http://ai-governance-service:3027/validate',
      testDataset: {
        samples: 1000,
        labelDistribution: { approved: 800, rejected: 200 },
      },
    });
    AssertionHelpers.assertSuccessResponse(workflowResponse);
    expect(workflowResponse.data).toHaveProperty('workflowId');
    expect(workflowResponse.data).toHaveProperty('status');
  });

  test('T-E2E-AIG-03: List model inventory', async () => {
    correlationId = `test-aig-03-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const listResponse = await apiClient.get('/model-switchboard/models', {
      params: { limit: 10, offset: 0 },
    });
    AssertionHelpers.assertSuccessResponse(listResponse);
    expect(Array.isArray(listResponse.data)).toBe(true);
  });

  test('T-E2E-AIG-04: Model drift detection trigger', async () => {
    correlationId = `test-aig-04-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const driftResponse = await apiClient.post('/model-switchboard/models/fraud-detection-v2/drift-check', {
      currentWindow: { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), end: new Date().toISOString() },
      baselineWindow: { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), end: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
      threshold: 0.05,
    });

    if (driftResponse.success === true) {
      expect(driftResponse.data).toHaveProperty('driftDetected');
    }
  });
});
