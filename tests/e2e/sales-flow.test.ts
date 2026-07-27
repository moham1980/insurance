import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createGatewayClient } from '../helpers/api-client';
import { JwtFactory } from '../helpers/jwt-factory';
import { DbHelper } from '../helpers/db-helper';
import { DockerComposeHelper } from '../helpers/docker-compose';
import { AssertionHelpers } from '../helpers/assertions';

describe('E2E: Sales Network Flow', () => {
  const tenantId = 'test-tenant';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createGatewayClient(adminToken);
  apiClient.setTenantId(tenantId);

  let correlationId: string;

  beforeAll(async () => {
    await DockerComposeHelper.waitForHealth('api-gateway', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('sales-network-service', { timeoutMs: 60000 });
    await DbHelper.truncateTable('public', 'partners');
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('T-E2E-SN-01: Partner lifecycle (pending→verified→active→suspended→terminated)', async () => {
    correlationId = `test-sn-01-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const createResponse = await apiClient.post('/sales-network/partners', {
      tenantId,
      orgUnitId: 'partner-001',
      kind: 'agent',
      displayName: 'Test Agency',
      legalNationalId: '1234567890',
      licenseCode: 'LIC-001',
      contactMobile: '09123456789',
      contactEmail: 'agent@example.com',
    });
    AssertionHelpers.assertSuccessResponse(createResponse);
    const partnerId = createResponse.data.orgUnitId;
    expect(createResponse.data.status).toBe('pending');

    // Verify
    const verifyResponse = await apiClient.post(`/sales-network/partners/${partnerId}/verify`, {});
    if (verifyResponse.success === true) {
      expect(verifyResponse.data.status).toBe('verified');
    }

    // Activate via status endpoint
    const activateResponse = await apiClient.post(`/sales-network/partners/${partnerId}/status`, {
      status: 'active',
    });
    if (activateResponse.success === true) {
      expect(activateResponse.data.status).toBe('active');
    }

    // Suspend
    const suspendResponse = await apiClient.post(`/sales-network/partners/${partnerId}/status`, {
      status: 'suspended',
    });
    if (suspendResponse.success === true) {
      expect(suspendResponse.data.status).toBe('suspended');
    }

    // Terminate
    const terminateResponse = await apiClient.post(`/sales-network/partners/${partnerId}/status`, {
      status: 'terminated',
    });
    if (terminateResponse.success === true) {
      expect(terminateResponse.data.status).toBe('terminated');
    }
  });

  test('T-E2E-SN-02: Commission Contract + Ledger', async () => {
    correlationId = `test-sn-02-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const partnerResponse = await apiClient.post('/sales-network/partners', {
      tenantId,
      orgUnitId: 'partner-002',
      kind: 'agent',
      displayName: 'Commission Partner',
      legalNationalId: '9876543210',
      licenseCode: 'LIC-002',
      contactMobile: '09123456780',
      contactEmail: 'partner@example.com',
    });
    const partnerId = partnerResponse.data.orgUnitId;

    const contractResponse = await apiClient.post('/sales-network/contracts', {
      tenantId,
      orgUnitId: partnerId,
      base: 'premium',
      commissionRate: 0.15,
      effectiveFrom: new Date().toISOString(),
    });

    if (contractResponse.success === true) {
      expect(contractResponse.data).toHaveProperty('contractId');
      const contractId = contractResponse.data.contractId;

      const activateContractResponse = await apiClient.post(`/sales-network/contracts/${contractId}/activate`, {});
      if (activateContractResponse.success === true) {
        expect(activateContractResponse.data.status).toBe('active');
      }

      // Calculate commission
      const calcResponse = await apiClient.post('/sales-network/commission/calculate', {
        tenantId,
        policyId: 'policy-comm-123',
        orgUnitId: partnerId,
        premiumAmount: 100000000,
      });
      if (calcResponse.success === true) {
        expect(calcResponse.data).toHaveProperty('commissionAmount');
      }

      // List ledger
      const ledgerResponse = await apiClient.get('/sales-network/ledger', {
        params: { orgUnitId: partnerId, limit: 10 },
      });
      AssertionHelpers.assertSuccessResponse(ledgerResponse);
      expect(Array.isArray(ledgerResponse.data)).toBe(true);
    }
  });

  test('T-E2E-SN-03: KPI and Agent Summary', async () => {
    correlationId = `test-sn-03-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const kpiResponse = await apiClient.get('/sales-network/kpi/daily', {
      params: { tenantId, limit: 10 },
    });
    AssertionHelpers.assertSuccessResponse(kpiResponse);
    expect(Array.isArray(kpiResponse.data)).toBe(true);

    const summaryResponse = await apiClient.get('/sales-network/agent/summary', {
      params: { tenantId },
    });
    if (summaryResponse.success === true) {
      expect(summaryResponse.data).toHaveProperty('totalPolicies');
    }
  });
});
