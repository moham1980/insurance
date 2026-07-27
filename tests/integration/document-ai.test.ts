import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { ApiClient } from '../helpers/api-client';
import { DbHelper } from '../helpers/db-helper';
import { JwtFactory } from '../helpers/jwt-factory';

describe('Integration: Document AI Service', () => {
  let apiClient: ApiClient;
  let adminToken: string;
  let tenantId: string;
  let jobId: string;

  beforeAll(async () => {
    apiClient = new ApiClient('http://localhost:18000');
    adminToken = JwtFactory.createAdminToken(tenantId);
    tenantId = 'tenant-doc-ai-integration';
    await DbHelper.cleanup('document_ai');
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('T-INT-DAI-01: Document AI Job lifecycle + Retry + DLQ + Cost guardrail', () => {
    test('should submit job and track lifecycle', async () => {
      const submitResponse = await apiClient.post('/document-ai/jobs', {
        tenantId,
        documentType: 'policy',
        fileUrl: 'https://example.com/test-policy.pdf',
        metadata: {
          policyNumber: 'POL-TEST-001',
        },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(submitResponse.status).toBe(201);
      expect(submitResponse.data.success).toBe(true);
      expect(submitResponse.data.data).toHaveProperty('id');
      expect(submitResponse.data.data).toHaveProperty('status');
      expect(submitResponse.data.data.status).toBe('pending');

      jobId = submitResponse.data.data.id;

      // Get job details
      const getResponse = await apiClient.get(`/document-ai/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(getResponse.status).toBe(200);
      expect(getResponse.data.data.id).toBe(jobId);
    });

    test('should handle retry logic for failed jobs', async () => {
      // Submit a job that will fail
      const failingJobResponse = await apiClient.post('/document-ai/jobs', {
        tenantId,
        documentType: 'policy',
        fileUrl: 'https://invalid-url-that-will-fail.com/test.pdf',
        metadata: {},
        options: {
          maxRetries: 3,
        },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(failingJobResponse.status).toBe(201);
      const failingJobId = failingJobResponse.data.data.id;

      // Check that retry count is tracked
      const getResponse = await apiClient.get(`/document-ai/jobs/${failingJobId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(getResponse.data.data).toHaveProperty('retryCount');
      expect(getResponse.data.data).toHaveProperty('maxRetries');
      expect(getResponse.data.data.maxRetries).toBe(3);
    });

    test('should move failed jobs to DLQ after max retries', async () => {
      // Submit a job that will fail
      const dlqJobResponse = await apiClient.post('/document-ai/jobs', {
        tenantId,
        documentType: 'policy',
        fileUrl: 'https://another-invalid-url.com/test.pdf',
        metadata: {},
        options: {
          maxRetries: 2,
        },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const dlqJobId = dlqJobResponse.data.data.id;

      // Manually fail the job (in real scenario, this would happen automatically)
      await apiClient.put(`/document-ai/jobs/${dlqJobId}/fail`, {
        errorMessage: 'Simulated failure',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      // Check DLQ
      const dlqResponse = await apiClient.get('/document-ai/dlq', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(dlqResponse.status).toBe(200);
      expect(dlqResponse.data.data).toHaveProperty('items');
      expect(Array.isArray(dlqResponse.data.data.items)).toBe(true);
    });

    test('should enforce cost guardrail', async () => {
      // Set a low cost limit
      await apiClient.put('/document-ai/cost-limits', {
        tenantId,
        dailyLimit: 1000,
        currency: 'IRR',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      // Try to submit a job that would exceed the limit
      const costGuardResponse = await apiClient.post('/document-ai/jobs', {
        tenantId,
        documentType: 'policy',
        fileUrl: 'https://example.com/large-doc.pdf',
        metadata: {},
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      // Should be rejected due to cost guardrail
      expect(costGuardResponse.status).toBe(400);
      expect(costGuardResponse.data.success).toBe(false);
      expect(costGuardResponse.data.error.code).toBe('COST_GUARDRAIL_EXCEEDED');

      // Reset cost limit
      await apiClient.put('/document-ai/cost-limits', {
        tenantId,
        dailyLimit: 10000000,
        currency: 'IRR',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });
    });
  });

  describe('T-INT-DAI-02: Document AI Confidence threshold + Audit + Eval Suite', () => {
    test('should apply confidence threshold routing', async () => {
      const lowConfJobResponse = await apiClient.post('/document-ai/jobs', {
        tenantId,
        documentType: 'claim',
        fileUrl: 'https://example.com/low-quality.jpg',
        metadata: {
          claimNumber: 'CLM-TEST-001',
        },
        options: {
          confidenceThreshold: 0.8,
        },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(lowConfJobResponse.status).toBe(201);
      const lowConfJobId = lowConfJobResponse.data.data.id;

      // Get job details
      const getResponse = await apiClient.get(`/document-ai/jobs/${lowConfJobId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(getResponse.data.data).toHaveProperty('confidenceThreshold');
      expect(getResponse.data.data.confidenceThreshold).toBe(0.8);
    });

    test('should maintain audit trail for all operations', async () => {
      const auditResponse = await apiClient.get('/document-ai/audit', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
        params: {
          jobId,
        },
      });

      expect(auditResponse.status).toBe(200);
      expect(auditResponse.data.data).toHaveProperty('items');
      expect(Array.isArray(auditResponse.data.data.items)).toBe(true);

      if (auditResponse.data.data.items.length > 0) {
        const auditItem = auditResponse.data.data.items[0];
        expect(auditItem).toHaveProperty('action');
        expect(auditItem).toHaveProperty('timestamp');
        expect(auditItem).toHaveProperty('userId');
      }
    });

    test('should support eval suite operations', async () => {
      // Create an eval case
      const evalCaseResponse = await apiClient.post('/document-ai/eval/cases', {
        tenantId,
        name: 'Test Case 1',
        documentUrl: 'https://example.com/test-doc.pdf',
        expectedData: {
          policyNumber: 'POL-123',
          holderName: 'Test User',
        },
        metadata: {},
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(evalCaseResponse.status).toBe(201);
      expect(evalCaseResponse.data.success).toBe(true);
      const evalCaseId = evalCaseResponse.data.data.id;

      // Create an eval run
      const evalRunResponse = await apiClient.post('/document-ai/eval/runs', {
        tenantId,
        caseIds: [evalCaseId],
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(evalRunResponse.status).toBe(201);
      expect(evalRunResponse.data.success).toBe(true);

      // Get eval results
      const evalResultsResponse = await apiClient.get(`/document-ai/eval/runs/${evalRunResponse.data.data.id}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(evalResultsResponse.status).toBe(200);
      expect(evalResultsResponse.data.data).toHaveProperty('results');
    });

    test('should provide eval suite metrics', async () => {
      const metricsResponse = await apiClient.get('/document-ai/eval/metrics', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(metricsResponse.status).toBe(200);
      expect(metricsResponse.data.data).toHaveProperty('totalCases');
      expect(metricsResponse.data.data).toHaveProperty('totalRuns');
      expect(metricsResponse.data.data).toHaveProperty('averageAccuracy');
      expect(metricsResponse.data.data).toHaveProperty('averageConfidence');
    });
  });

  describe('Additional Document AI Integration Tests', () => {
    test('should list jobs with filters', async () => {
      const listResponse = await apiClient.get('/document-ai/jobs', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
        params: {
          status: 'pending',
          limit: 10,
        },
      });

      expect(listResponse.status).toBe(200);
      expect(listResponse.data.data).toHaveProperty('items');
      expect(listResponse.data.data).toHaveProperty('total');
      expect(Array.isArray(listResponse.data.data.items)).toBe(true);
    });

    test('should cancel a pending job', async () => {
      const cancelJobResponse = await apiClient.post('/document-ai/jobs', {
        tenantId,
        documentType: 'policy',
        fileUrl: 'https://example.com/cancel-test.pdf',
        metadata: {},
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const cancelJobId = cancelJobResponse.data.data.id;

      const cancelResponse = await apiClient.put(`/document-ai/jobs/${cancelJobId}/cancel`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(cancelResponse.status).toBe(200);
      expect(cancelResponse.data.success).toBe(true);

      // Verify job status
      const getResponse = await apiClient.get(`/document-ai/jobs/${cancelJobId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(getResponse.data.data.status).toBe('cancelled');
    });

    test('should get usage statistics', async () => {
      const usageResponse = await apiClient.get('/document-ai/usage', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
        params: {
          period: 'daily',
        },
      });

      expect(usageResponse.status).toBe(200);
      expect(usageResponse.data.data).toHaveProperty('totalJobs');
      expect(usageResponse.data.data).toHaveProperty('totalCost');
      expect(usageResponse.data.data).toHaveProperty('averageConfidence');
      expect(usageResponse.data.data).toHaveProperty('successRate');
    });
  });
});
