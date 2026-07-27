import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { ApiClient } from '../helpers/api-client';
import { DbHelper } from '../helpers/db-helper';
import { JwtFactory } from '../helpers/jwt-factory';

describe('Integration: Copilot Service', () => {
  let apiClient: ApiClient;
  let adminToken: string;
  let userToken: string;
  let tenantId: string;
  let claimId: string;
  let documentId: string;
  let policyId: string;

  beforeAll(async () => {
    apiClient = new ApiClient('http://localhost:18000');
    adminToken = JwtFactory.createAdminToken(tenantId);
    userToken = JwtFactory.createCustomerToken('user-1', tenantId);
    tenantId = 'tenant-copilot-integration';
    await DbHelper.cleanup('copilot');
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('T-INT-COP-01: Copilot Claim/Document summary + AI policy + PII redaction + Audit', () => {
    test('should create test data for Copilot tests', async () => {
      // Create test claim
      const claimResponse = await apiClient.post('/claims', {
        tenantId,
        policyNumber: 'POL-TEST-001',
        claimType: 'theft',
        lossDate: '2024-03-15',
        estimatedAmount: 5000000,
        description: 'سرقت خودرو از پارکینگ',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(claimResponse.status).toBe(201);
      claimId = claimResponse.data.data.id;

      // Create test document
      const documentResponse = await apiClient.post('/documents', {
        tenantId,
        documentType: 'claim_report',
        fileUrl: 'https://example.com/test-report.pdf',
        referenceId: claimId,
        referenceType: 'claim',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(documentResponse.status).toBe(201);
      documentId = documentResponse.data.data.id;

      // Create test policy
      const policyResponse = await apiClient.post('/policies', {
        tenantId,
        productId: 'prod-001',
        holderPartyId: 'party-001',
        sumInsured: 100000000,
        premiumAmount: 5000000,
        effectiveFrom: '2024-01-01',
        effectiveTo: '2025-01-01',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(policyResponse.status).toBe(201);
      policyId = policyResponse.data.data.id;
    });

    test('should generate claim summary', async () => {
      const response = await apiClient.post(`/copilot/claims/${claimId}/summary`, {
        context: {
          includeTimeline: true,
          includeDocuments: true,
        },
      }, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'x-tenant-id': tenantId,
          'x-ai-enabled': 'true',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('summary');
      expect(response.data.data.summary).toHaveProperty('text');
      expect(response.data.data.summary).toHaveProperty('keyPoints');
      expect(response.data.data.summary).toHaveProperty('confidence');
    });

    test('should generate document summary', async () => {
      const response = await apiClient.post(`/copilot/documents/${documentId}/summary`, {
        context: {
          includeKeyInformation: true,
        },
      }, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'x-tenant-id': tenantId,
          'x-ai-enabled': 'true',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('summary');
      expect(response.data.data.summary).toHaveProperty('text');
    });

    test('should enforce AI policy (require x-ai-enabled header)', async () => {
      const response = await apiClient.post(`/copilot/claims/${claimId}/summary`, {
        context: {
          includeTimeline: true,
        },
      }, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'x-tenant-id': tenantId,
          // Missing x-ai-enabled header
        },
      });

      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('AI_DISABLED');
    });

    test('should redact PII in summaries', async () => {
      // Create a claim with PII
      const piiClaimResponse = await apiClient.post('/claims', {
        tenantId,
        policyNumber: 'POL-TEST-002',
        claimType: 'theft',
        lossDate: '2024-03-16',
        estimatedAmount: 3000000,
        description: 'مالک: علی احمدی، کد ملی: 0123456789، تلفن: 09121234567',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const piiClaimId = piiClaimResponse.data.data.id;

      const response = await apiClient.post(`/copilot/claims/${piiClaimId}/summary`, {
        context: {
          includeTimeline: true,
        },
      }, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'x-tenant-id': tenantId,
          'x-ai-enabled': 'true',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.data.summary).toHaveProperty('piiRedacted');
      expect(response.data.data.summary.piiRedacted).toBe(true);
      expect(response.data.data.summary).toHaveProperty('redactedFields');
      expect(Array.isArray(response.data.data.summary.redactedFields)).toBe(true);
    });

    test('should maintain audit trail for AI operations', async () => {
      const auditResponse = await apiClient.get('/copilot/audit', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
        params: {
          entityType: 'claim',
          entityId: claimId,
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
        expect(auditItem).toHaveProperty('aiModel');
      }
    });
  });

  describe('Additional Copilot Features', () => {
    test('should answer Q&A based on context', async () => {
      const response = await apiClient.post('/copilot/qa', {
        question: 'مبلغ خسارت چقدر است؟',
        context: {
          type: 'claim',
          id: claimId,
        },
      }, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'x-tenant-id': tenantId,
          'x-ai-enabled': 'true',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('answer');
      expect(response.data.data).toHaveProperty('confidence');
    });

    test('should suggest next best action', async () => {
      const response = await apiClient.post('/copilot/next-best-action', {
        context: {
          type: 'claim',
          id: claimId,
        },
      }, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'x-tenant-id': tenantId,
          'x-ai-enabled': 'true',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('actions');
      expect(Array.isArray(response.data.data.actions)).toBe(true);
    });

    test('should provide underwriting assistance', async () => {
      const response = await apiClient.post('/copilot/underwriting/assist', {
        policyId,
        context: {
          riskFactors: ['young_driver', 'sports_car'],
        },
      }, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'x-tenant-id': tenantId,
          'x-ai-enabled': 'true',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('recommendation');
      expect(response.data.data).toHaveProperty('riskAssessment');
    });

    test('should triage complaints', async () => {
      const complaintResponse = await apiClient.post('/complaints', {
        tenantId,
        complaintType: 'service_quality',
        description: 'کیفیت خدمات نامناسب بود',
        policyNumber: 'POL-TEST-001',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const complaintId = complaintResponse.data.data.id;

      const triageResponse = await apiClient.post('/copilot/complaints/triage', {
        complaintId,
      }, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'x-tenant-id': tenantId,
          'x-ai-enabled': 'true',
        },
      });

      expect(triageResponse.status).toBe(200);
      expect(triageResponse.data.success).toBe(true);
      expect(triageResponse.data.data).toHaveProperty('category');
      expect(triageResponse.data.data).toHaveProperty('priority');
      expect(triageResponse.data.data).toHaveProperty('suggestedActions');
    });

    test('should discover recovery opportunities', async () => {
      const response = await apiClient.post('/copilot/recovery/discover', {
        claimId,
      }, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'x-tenant-id': tenantId,
          'x-ai-enabled': 'true',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('opportunities');
      expect(Array.isArray(response.data.data.opportunities)).toBe(true);
    });

    test('should support pricing assistance', async () => {
      const response = await apiClient.post('/copilot/pricing/assist', {
        productId: 'prod-001',
        context: {
          vehicleType: 'sedan',
          vehicleAge: 3,
          driverAge: 35,
        },
      }, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'x-tenant-id': tenantId,
          'x-ai-enabled': 'true',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('suggestedPremium');
      expect(response.data.data).toHaveProperty('factors');
    });

    test('should provide self-service assistance', async () => {
      const response = await apiClient.post('/copilot/selfservice/assist', {
        query: 'چگونه خسارت خود را ثبت کنم؟',
        customerId: 'customer-1',
      }, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'x-tenant-id': tenantId,
          'x-ai-enabled': 'true',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('answer');
      expect(response.data.data).toHaveProperty('steps');
      expect(Array.isArray(response.data.data.steps)).toBe(true);
    });
  });

  describe('Model Management', () => {
    test('should register a model in inventory', async () => {
      const response = await apiClient.post('/copilot/models/register', {
        tenantId,
        modelType: 'summary',
        modelKey: 'gpt-4',
        provider: 'openai',
        version: '1.0',
        status: 'active',
        riskLevel: 'low',
        parameters: {
          temperature: 0.7,
          maxTokens: 1000,
        },
        performanceMetrics: {
          accuracy: 0.95,
          latencyMs: 500,
        },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('id');
    });

    test('should list models from inventory', async () => {
      const response = await apiClient.get('/copilot/models', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('items');
      expect(Array.isArray(response.data.data.items)).toBe(true);
    });

    test('should update model status', async () => {
      const listResponse = await apiClient.get('/copilot/models', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      if (listResponse.data.data.items.length > 0) {
        const modelId = listResponse.data.data.items[0].id;

        const updateResponse = await apiClient.put(`/copilot/models/${modelId}/status`, {
          status: 'inactive',
        }, {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'x-tenant-id': tenantId,
          },
        });

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.data.success).toBe(true);
      }
    });
  });
});
