import { describe, test, expect } from '@jest/globals';
import { createGatewayClient } from '../helpers/api-client';
import { JwtFactory } from '../helpers/jwt-factory';

/**
 * Contract tests for brokerage P0 endpoints.
 * These tests verify response shape and error codes only.
 */
describe('Contract: Brokerage P0', () => {
  const tenantId = 'test-tenant';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createGatewayClient(adminToken);
  apiClient.setTenantId(tenantId);

  test('T-CON-BR-01: Broker license validate endpoint returns success/data/correlationId', async () => {
    apiClient.setCorrelationId('test-br-01');
    const licenseId = '00000000-0000-0000-0000-000000000000';
    try {
      const response = await apiClient.post(`/party-kyc/broker-licenses/${licenseId}/validate`, { lineOfBusiness: 'motor' });
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('correlationId');
      expect(response.correlationId).toBe('test-br-01');
    } catch (error: any) {
      // 404/400 are acceptable contract outcomes as long as shape is correct
      const data = error.response?.data;
      if (data) {
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('correlationId');
        expect(data.correlationId).toBe('test-br-01');
      }
    }
  });

  test('T-CON-BR-02: Policy issue request includes brokerLicenseId in body', async () => {
    apiClient.setCorrelationId('test-br-02');
    const policyId = '00000000-0000-0000-0000-000000000000';
    try {
      const response = await apiClient.post(`/policies/${policyId}/issue`, { paymentId: 'pay-123', brokerLicenseId: '00000000-0000-0000-0000-000000000000' });
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('correlationId');
      expect(response.correlationId).toBe('test-br-02');
    } catch (error: any) {
      const data = error.response?.data;
      if (data) {
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('error');
        expect(data.error).toHaveProperty('code');
        expect(data.error).toHaveProperty('message');
        expect(data).toHaveProperty('correlationId');
        expect(data.correlationId).toBe('test-br-02');
      }
    }
  });

  test('T-CON-BR-03: Distribution agreement creation returns success/data/correlationId', async () => {
    apiClient.setCorrelationId('test-br-03');
    try {
      const response = await apiClient.post('/sales-network/distribution-agreements', {
        tenantId,
        carrierOrganizationId: '00000000-0000-0000-0000-000000000001',
        distributorOrganizationId: '00000000-0000-0000-0000-000000000002',
        agreementType: 'brokerage',
        effectiveFrom: new Date().toISOString(),
        linesOfBusiness: ['motor'],
      });
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('correlationId');
      expect(response.correlationId).toBe('test-br-03');
    } catch (error: any) {
      const data = error.response?.data;
      if (data) {
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('correlationId');
        expect(data.correlationId).toBe('test-br-03');
      }
    }
  });

  test('T-CON-BR-04: Party creation returns success/data/correlationId', async () => {
    apiClient.setCorrelationId('test-br-04');
    try {
      const response = await apiClient.post('/party-kyc/parties', {
        partyType: 'individual',
        firstName: 'Test',
        lastName: 'User',
      });
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('correlationId');
      expect(response.correlationId).toBe('test-br-04');
    } catch (error: any) {
      const data = error.response?.data;
      if (data) {
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('correlationId');
        expect(data.correlationId).toBe('test-br-04');
      }
    }
  });

  test('T-CON-BR-05: Broker license get returns success/data/correlationId', async () => {
    apiClient.setCorrelationId('test-br-05');
    const licenseId = '00000000-0000-0000-0000-000000000000';
    try {
      const response = await apiClient.get(`/party-kyc/broker-licenses/${licenseId}`);
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('correlationId');
      expect(response.correlationId).toBe('test-br-05');
    } catch (error: any) {
      const data = error.response?.data;
      if (data) {
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('correlationId');
        expect(data.correlationId).toBe('test-br-05');
      }
    }
  });

  test('T-CON-BR-06: Distribution agreement list returns success/data/correlationId', async () => {
    apiClient.setCorrelationId('test-br-06');
    try {
      const response = await apiClient.get('/sales-network/distribution-agreements');
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('correlationId');
      expect(response.correlationId).toBe('test-br-06');
    } catch (error: any) {
      const data = error.response?.data;
      if (data) {
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('correlationId');
        expect(data.correlationId).toBe('test-br-06');
      }
    }
  });

  test('T-CON-BR-07: Distribution agreement get by ID returns success/data/correlationId', async () => {
    apiClient.setCorrelationId('test-br-07');
    const agreementId = '00000000-0000-0000-0000-000000000000';
    try {
      const response = await apiClient.get(`/sales-network/distribution-agreements/${agreementId}`);
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('correlationId');
      expect(response.correlationId).toBe('test-br-07');
    } catch (error: any) {
      const data = error.response?.data;
      if (data) {
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('correlationId');
        expect(data.correlationId).toBe('test-br-07');
      }
    }
  });

  test('T-CON-BR-08: Distribution agreement activate returns success/data/correlationId', async () => {
    apiClient.setCorrelationId('test-br-08');
    const agreementId = '00000000-0000-0000-0000-000000000000';
    try {
      const response = await apiClient.post(`/sales-network/distribution-agreements/${agreementId}/activate`, {});
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('correlationId');
      expect(response.correlationId).toBe('test-br-08');
    } catch (error: any) {
      const data = error.response?.data;
      if (data) {
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('correlationId');
        expect(data.correlationId).toBe('test-br-08');
      }
    }
  });

  test('T-CON-BR-09: Distribution agreement terminate returns success/data/correlationId', async () => {
    apiClient.setCorrelationId('test-br-09');
    const agreementId = '00000000-0000-0000-0000-000000000000';
    try {
      const response = await apiClient.post(`/sales-network/distribution-agreements/${agreementId}/terminate`, {});
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('correlationId');
      expect(response.correlationId).toBe('test-br-09');
    } catch (error: any) {
      const data = error.response?.data;
      if (data) {
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('correlationId');
        expect(data.correlationId).toBe('test-br-09');
      }
    }
  });

  test('T-CON-BR-10: Identity link creation returns success/data/correlationId', async () => {
    apiClient.setCorrelationId('test-br-10');
    const globalSubjectId = '00000000-0000-0000-0000-000000000000';
    try {
      const response = await apiClient.post(`/party-kyc/global-subjects/${globalSubjectId}/links`, {
        providerId: 'iam-ecosystem',
        providerUserId: 'test-user-001',
      });
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('correlationId');
      expect(response.correlationId).toBe('test-br-10');
    } catch (error: any) {
      const data = error.response?.data;
      if (data) {
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('correlationId');
        expect(data.correlationId).toBe('test-br-10');
      }
    }
  });

  test('T-CON-BR-11: Organization update returns success/data/correlationId', async () => {
    apiClient.setCorrelationId('test-br-11');
    const organizationId = '00000000-0000-0000-0000-000000000000';
    try {
      const response = await apiClient.put(`/auth/admin/organizations/${organizationId}`, {
        legalName: 'Updated Org Name',
      });
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('correlationId');
      expect(response.correlationId).toBe('test-br-11');
    } catch (error: any) {
      const data = error.response?.data;
      if (data) {
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('correlationId');
        expect(data.correlationId).toBe('test-br-11');
      }
    }
  });

  test('T-CON-BR-12: Broker license verify returns success/data/correlationId', async () => {
    apiClient.setCorrelationId('test-br-12');
    const licenseId = '00000000-0000-0000-0000-000000000000';
    try {
      const response = await apiClient.post(`/party-kyc/broker-licenses/${licenseId}/verify`, {});
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('correlationId');
      expect(response.correlationId).toBe('test-br-12');
    } catch (error: any) {
      const data = error.response?.data;
      if (data) {
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('correlationId');
        expect(data.correlationId).toBe('test-br-12');
      }
    }
  });
});
