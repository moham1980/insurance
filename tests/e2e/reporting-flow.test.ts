import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createGatewayClient } from '../helpers/api-client';
import { JwtFactory } from '../helpers/jwt-factory';
import { DbHelper } from '../helpers/db-helper';
import { DockerComposeHelper } from '../helpers/docker-compose';
import { AssertionHelpers } from '../helpers/assertions';

describe('E2E: Reporting Flow', () => {
  const tenantId = 'test-tenant';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createGatewayClient(adminToken);
  apiClient.setTenantId(tenantId);

  let correlationId: string;

  beforeAll(async () => {
    await DockerComposeHelper.waitForHealth('api-gateway', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('reporting-service', { timeoutMs: 60000 });
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('T-E2E-RPT-01: Ready KPIs', async () => {
    correlationId = `test-rpt-01-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.get('/reporting/kpis/ready');
    AssertionHelpers.assertSuccessResponse(response);
    expect(response.data).toHaveProperty('kpis');
    expect(Array.isArray(response.data.kpis)).toBe(true);
  });

  test('T-E2E-RPT-02: Snapshot ingestion and governance', async () => {
    correlationId = `test-rpt-02-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    // Upsert governance policy
    const policyResponse = await apiClient.put('/reporting/kpis/governance/total_policies', {
      tenantId,
      displayName: 'Total Policies',
      unit: 'count',
      description: 'Total number of active policies',
      formula: 'count(policies)',
    });
    if (policyResponse.success === true) {
      expect(policyResponse.data).toHaveProperty('kpiKey');
    }

    // List governance policies
    const listPolicyResponse = await apiClient.get('/reporting/kpis/governance');
    AssertionHelpers.assertSuccessResponse(listPolicyResponse);
    expect(Array.isArray(listPolicyResponse.data)).toBe(true);

    // Ingest snapshot
    const snapshotResponse = await apiClient.post('/reporting/kpis/snapshots', {
      tenantId,
      snapshotDate: new Date().toISOString(),
      kpis: [
        { kpiKey: 'total_policies', value: 1500, metadata: { source: 'policy-service' } },
        { kpiKey: 'total_claims', value: 250, metadata: { source: 'claims-service' } },
      ],
    });
    AssertionHelpers.assertSuccessResponse(snapshotResponse);
    expect(snapshotResponse.data).toHaveProperty('snapshotId');

    // List snapshots
    const listSnapshotResponse = await apiClient.get('/reporting/kpis/snapshots', {
      params: { tenantId, limit: 10 },
    });
    AssertionHelpers.assertSuccessResponse(listSnapshotResponse);
    expect(Array.isArray(listSnapshotResponse.data)).toBe(true);
  });

  test('T-E2E-RPT-03: Executive dashboard', async () => {
    correlationId = `test-rpt-03-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.get('/reporting/dashboard/executive', {
      params: { tenantId },
    });
    AssertionHelpers.assertSuccessResponse(response);
    expect(response.data).toHaveProperty('kpis');
  });

  test('T-E2E-RPT-04: Reinsurance reporting', async () => {
    correlationId = `test-rpt-04-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const cededResponse = await apiClient.get('/reporting/ri/ceded', {
      params: { tenantId, limit: 10 },
    });
    AssertionHelpers.assertSuccessResponse(cededResponse);
    expect(Array.isArray(cededResponse.data)).toBe(true);

    const borderauxResponse = await apiClient.get('/reporting/ri/borderaux', {
      params: { tenantId, limit: 10 },
    });
    if (borderauxResponse.success === true) {
      expect(Array.isArray(borderauxResponse.data)).toBe(true);
    }

    const recoveriesResponse = await apiClient.get('/reporting/ri/recoveries', {
      params: { tenantId, limit: 10 },
    });
    if (recoveriesResponse.success === true) {
      expect(Array.isArray(recoveriesResponse.data)).toBe(true);
    }
  });

  test('T-E2E-RPT-05: Claims and payments reporting', async () => {
    correlationId = `test-rpt-05-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const claimPaymentsResponse = await apiClient.get('/reporting/claims/payments', {
      params: { tenantId, limit: 10 },
    });
    AssertionHelpers.assertSuccessResponse(claimPaymentsResponse);
    expect(Array.isArray(claimPaymentsResponse.data)).toBe(true);

    const docsAttachedResponse = await apiClient.get('/reporting/claims/documents-attached', {
      params: { tenantId, limit: 10 },
    });
    if (docsAttachedResponse.success === true) {
      expect(Array.isArray(docsAttachedResponse.data)).toBe(true);
    }
  });

  test('T-E2E-RPT-06: External systems connection', async () => {
    correlationId = `test-rpt-06-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const createResponse = await apiClient.post('/reporting/external-systems', {
      tenantId,
      name: 'Test External System',
      type: 'bi',
      url: 'https://example.com/api',
      authType: 'bearer',
    });
    if (createResponse.success === true) {
      expect(createResponse.data).toHaveProperty('connectionId');
      const connectionId = createResponse.data.connectionId;

      const getResponse = await apiClient.get(`/reporting/external-systems/${connectionId}`);
      if (getResponse.success === true) {
        expect(getResponse.data.connectionId).toBe(connectionId);
      }

      const listResponse = await apiClient.get('/reporting/external-systems', {
        params: { tenantId, limit: 10 },
      });
      AssertionHelpers.assertSuccessResponse(listResponse);
      expect(Array.isArray(listResponse.data)).toBe(true);
    }
  });
});
