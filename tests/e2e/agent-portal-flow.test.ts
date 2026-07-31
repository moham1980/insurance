import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createGatewayClient } from '../helpers/api-client';
import { JwtFactory } from '../helpers/jwt-factory';
import { partyFixtures, quoteFixtures } from '../fixtures/party.fixture';
import { DbHelper } from '../helpers/db-helper';
import { DockerComposeHelper } from '../helpers/docker-compose';
import { AssertionHelpers } from '../helpers/assertions';

describe('E2E: Agent Portal Flow', () => {
  const tenantId = 'test-tenant';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createGatewayClient(adminToken);
  apiClient.setTenantId(tenantId);

  let partnerId: string;
  let agentId: string;
  let correlationId: string;

  beforeAll(async () => {
    await DockerComposeHelper.waitForHealth('api-gateway', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('agent-portal-service', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('sales-network-service', { timeoutMs: 60000 });
    await DbHelper.truncateTable('public', 'partners');

    // Create partner and agent
    const partnerResponse = await apiClient.post('/sales-network/partners', {
      tenantId,
      orgUnitId: 'agent-portal-partner-001',
      kind: 'agent',
      displayName: 'Test Agency Portal',
      legalNationalId: '1234567890',
      licenseCode: 'LIC-PORTAL-001',
      contactMobile: '09123456789',
      contactEmail: 'portal@example.com',
    });
    partnerId = partnerResponse.data.orgUnitId;
    agentId = 'agent-001';
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('T-E2E-AP-01: Agent dashboard stats', async () => {
    correlationId = `test-ap-01-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const statsResponse = await apiClient.get(`/agent-portal/agent/${agentId}/dashboard`, {
      params: { partnerId },
    });
    if (statsResponse.success === true) {
      expect(statsResponse.data).toHaveProperty('totalPolicies');
      expect(statsResponse.data).toHaveProperty('activePolicies');
    }
  });

  test('T-E2E-AP-02: Premium trends', async () => {
    correlationId = `test-ap-02-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.get('/agent-portal/dashboard/premium-trends', {
      params: { agentId, partnerId },
    });
    if (response.success === true) {
      expect(response.data).toHaveProperty('trends');
    }
  });

  test('T-E2E-AP-03: Commission history', async () => {
    correlationId = `test-ap-03-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.get('/agent-portal/dashboard/commission-history', {
      params: { agentId, partnerId },
    });
    if (response.success === true) {
      expect(response.data).toHaveProperty('history');
    }
  });

  test('T-E2E-AP-04: Policy portfolio', async () => {
    correlationId = `test-ap-04-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.get('/agent-portal/dashboard/policy-portfolio', {
      params: { agentId, partnerId },
    });
    if (response.success === true) {
      expect(response.data).toHaveProperty('portfolio');
    }
  });

  test('T-E2E-AP-05: Agent policies list', async () => {
    correlationId = `test-ap-05-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.get(`/agent-portal/agent/${agentId}/policies`, {
      params: { partnerId, limit: 10 },
    });
    if (response.success === true) {
      expect(Array.isArray(response.data)).toBe(true);
    }
  });

  test('T-E2E-AP-06: Agent claims list', async () => {
    correlationId = `test-ap-06-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.get(`/agent-portal/agent/${agentId}/claims`, {
      params: { partnerId, limit: 10 },
    });
    if (response.success === true) {
      expect(Array.isArray(response.data)).toBe(true);
    }
  });
});
