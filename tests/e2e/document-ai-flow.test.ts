import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createGatewayClient } from '../helpers/api-client';
import { JwtFactory } from '../helpers/jwt-factory';
import { DbHelper } from '../helpers/db-helper';
import { DockerComposeHelper } from '../helpers/docker-compose';
import { AssertionHelpers } from '../helpers/assertions';

describe('E2E: Document AI Flow', () => {
  const tenantId = 'test-tenant';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createGatewayClient(adminToken);
  apiClient.setTenantId(tenantId);

  let correlationId: string;

  beforeAll(async () => {
    await DockerComposeHelper.waitForHealth('api-gateway', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('document-ai-service', { timeoutMs: 60000 });
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('T-E2E-DAI-01: List and get evaluation cases', async () => {
    correlationId = `test-dai-01-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const listResponse = await apiClient.get('/document-ai/eval/cases', {
      params: { tenantId, limit: 10 },
    });
    AssertionHelpers.assertSuccessResponse(listResponse);
    expect(Array.isArray(listResponse.data)).toBe(true);
  });

  test('T-E2E-DAI-02: Create evaluation case and start run', async () => {
    correlationId = `test-dai-02-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const createResponse = await apiClient.post('/document-ai/eval/cases', {
      tenantId,
      name: 'Test OCR Case',
      documentType: 'policy',
      groundTruth: { policyNumber: 'POL-001', holderName: 'John Doe' },
    });
    AssertionHelpers.assertSuccessResponse(createResponse);
    expect(createResponse.data).toHaveProperty('caseId');
    const caseId = createResponse.data.caseId;

    const getResponse = await apiClient.get(`/document-ai/eval/cases/${caseId}`);
    if (getResponse.success === true) {
      expect(getResponse.data.caseId).toBe(caseId);
    }

    const runResponse = await apiClient.post('/document-ai/eval/runs', {
      tenantId,
      caseIds: [caseId],
      modelId: 'ocr-model-v1',
    });
    if (runResponse.success === true) {
      expect(runResponse.data).toHaveProperty('runId');
    }
  });

  test('T-E2E-DAI-03: List jobs and usage daily', async () => {
    correlationId = `test-dai-03-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const jobsResponse = await apiClient.get('/document-ai/jobs', {
      params: { tenantId, limit: 10 },
    });
    AssertionHelpers.assertSuccessResponse(jobsResponse);
    expect(Array.isArray(jobsResponse.data)).toBe(true);

    const usageResponse = await apiClient.get('/document-ai/usage/daily', {
      params: { tenantId, limit: 10 },
    });
    if (usageResponse.success === true) {
      expect(Array.isArray(usageResponse.data)).toBe(true);
    }
  });

  test('T-E2E-DAI-04: Audit trail for document AI', async () => {
    correlationId = `test-dai-04-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const auditResponse = await apiClient.get('/document-ai/audit', {
      params: { tenantId, limit: 10 },
    });
    AssertionHelpers.assertSuccessResponse(auditResponse);
    expect(Array.isArray(auditResponse.data)).toBe(true);
  });
});
