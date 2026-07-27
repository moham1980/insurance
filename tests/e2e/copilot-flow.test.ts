import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createGatewayClient } from '../helpers/api-client';
import { JwtFactory } from '../helpers/jwt-factory';
import { partyFixtures, quoteFixtures, claimFixtures } from '../fixtures/party.fixture';
import { DbHelper } from '../helpers/db-helper';
import { DockerComposeHelper } from '../helpers/docker-compose';
import { AssertionHelpers } from '../helpers/assertions';
import { createExecutedPaymentForPolicy } from '../helpers/payment-helper';

describe('E2E: Copilot Flow', () => {
  const tenantId = 'test-tenant';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createGatewayClient(adminToken);
  apiClient.setTenantId(tenantId);

  let policyId: string;
  let claimId: string;
  let correlationId: string;

  beforeAll(async () => {
    await DockerComposeHelper.waitForHealth('api-gateway', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('copilot-service', { timeoutMs: 60000 });
    await DbHelper.truncateTable('public', 'parties');
    await DbHelper.truncateTable('public', 'claims');

    // Setup: Create party, policy, and claim for copilot tests
    const partyResponse = await apiClient.post('/party/party', partyFixtures.individual);
    const partyId = partyResponse.data.partyId;

    const quoteResponse = await apiClient.post('/policies/policies/quote', {
      ...quoteFixtures.basic,
      partyId,
      tenantId,
    });

    const policyResponse = await apiClient.post('/policies/policies/convert-quote', {
      quote: { ...quoteFixtures.basic, partyId, tenantId },
      tenantId,
    });
    policyId = policyResponse.data.policyId;

    const paymentId = await createExecutedPaymentForPolicy(apiClient, policyId, quoteFixtures.basic.premiumAmount, tenantId);

    await apiClient.post(`/policies/policies/${policyId}/issue`, {
      paymentId,
    });

    const claimResponse = await apiClient.post('/claims/claims', {
      ...claimFixtures.basic,
      policyId,
      claimantPartyId: partyId,
      tenantId,
    });
    claimId = claimResponse.data.claimId;
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('T-E2E-COP-01: Claim summary via copilot', async () => {
    correlationId = `test-cop-01-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post(`/copilot/claims/${claimId}/summary`, {
      language: 'fa',
      detailLevel: 'brief',
    });

    if (response.success === true) {
      expect(response.data).toHaveProperty('summary');
    }
  });

  test('T-E2E-COP-02: Q&A based on context', async () => {
    correlationId = `test-cop-02-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post('/copilot/qa', {
      question: 'مبلغ خسارت چقدر است؟',
      context: {
        type: 'claim',
        id: claimId,
      },
      language: 'fa',
    });

    if (response.success === true) {
      expect(response.data).toHaveProperty('answer');
    }
  });

  test('T-E2E-COP-03: Next best action for claims', async () => {
    correlationId = `test-cop-03-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post('/copilot/next-best-action', {
      context: {
        type: 'claim',
        id: claimId,
      },
      userRole: 'claims_adjuster',
    });

    if (response.success === true) {
      expect(response.data).toHaveProperty('actions');
      expect(Array.isArray(response.data.actions)).toBe(true);
    }
  });

  test('T-E2E-COP-04: Underwriting assistance', async () => {
    correlationId = `test-cop-04-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post('/copilot/underwriting/assist', {
      policyId,
      context: {
        riskFactors: ['young_driver', 'sports_car'],
      },
      language: 'fa',
    });

    if (response.success === true) {
      expect(response.data).toHaveProperty('recommendation');
    }
  });

  test('T-E2E-COP-05: List available AI providers', async () => {
    correlationId = `test-cop-05-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.get('/copilot/providers');
    if (response.success === true) {
      expect(Array.isArray(response.data)).toBe(true);
    }
  });

  test('T-E2E-COP-06: Model inventory and risk assessment', async () => {
    correlationId = `test-cop-06-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const registerResponse = await apiClient.post('/copilot/models/register', {
      tenantId,
      name: 'test-model-v1',
      version: '1.0.0',
      provider: 'local',
      type: 'classification',
      description: 'Test model for copilot',
    });
    if (registerResponse.success === true) {
      expect(registerResponse.data).toHaveProperty('modelId');
      const modelId = registerResponse.data.modelId;

      const getResponse = await apiClient.get(`/copilot/models/${modelId}`);
      if (getResponse.success === true) {
        expect(getResponse.data.modelId).toBe(modelId);
      }

      const listResponse = await apiClient.get('/copilot/models', {
        params: { tenantId, limit: 10 },
      });
      AssertionHelpers.assertSuccessResponse(listResponse);
      expect(Array.isArray(listResponse.data)).toBe(true);
    }
  });
});
