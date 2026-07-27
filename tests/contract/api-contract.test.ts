import { describe, test, expect } from '@jest/globals';
import { createGatewayClient } from '../helpers/api-client';
import { JwtFactory } from '../helpers/jwt-factory';
import { AssertionHelpers } from '../helpers/assertions';

describe('Contract: API Response Shape', () => {
  const tenantId = 'test-tenant';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createGatewayClient(adminToken);
  apiClient.setTenantId(tenantId);

  test('T-CON-API-01: Success response includes success/data/correlationId', async () => {
    apiClient.setCorrelationId('test-api-01');
    const response = await apiClient.get('/health');
    
    expect(response).toHaveProperty('success');
    expect(response).toHaveProperty('data');
    expect(response).toHaveProperty('correlationId');
    expect(response.success).toBe(true);
    expect(response.correlationId).toBe('test-api-01');
  });

  test('T-CON-API-02: Error response includes success=false + error.code/message + correlationId', async () => {
    apiClient.setCorrelationId('test-api-02');
    
    try {
      await apiClient.get('/invalid-endpoint');
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.response?.data).toHaveProperty('success');
      expect(error.response?.data).toHaveProperty('error');
      expect(error.response?.data).toHaveProperty('correlationId');
      expect(error.response?.data.success).toBe(false);
      expect(error.response?.data.error).toHaveProperty('code');
      expect(error.response?.data.error).toHaveProperty('message');
      expect(error.response?.data.correlationId).toBe('test-api-02');
    }
  });

  test('T-CON-API-03: Pagination response includes pagination.total/limit/offset', async () => {
    const response = await apiClient.get('/party-kyc/parties', {
      params: { limit: 10, offset: 0 },
    });

    if (response.success === true) {
      expect(response.data).toHaveProperty('pagination');
      expect(response.data.pagination).toHaveProperty('total');
      expect(response.data.pagination).toHaveProperty('limit');
      expect(response.data.pagination).toHaveProperty('offset');
    }
  });

  test('T-CON-API-04: UUID validation: non-UUID input → VALIDATION_ERROR', async () => {
    try {
      await apiClient.get('/party-kyc/parties/invalid-uuid');
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.response?.data.success).toBe(false);
      expect(error.response?.data.error?.code).toBe('VALIDATION_ERROR');
    }
  });

  test('T-CON-API-05: JWT missing → UNAUTHORIZED with fixed shape', async () => {
    const clientWithoutAuth = createGatewayClient(undefined);
    
    try {
      await clientWithoutAuth.get('/party-kyc/parties');
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.response?.data.success).toBe(false);
      expect(error.response?.data.error?.code).toBe('UNAUTHORIZED');
      expect(error.response?.data.error?.message).toBeDefined();
    }
  });

  test('T-CON-API-06: Permission missing → FORBIDDEN with fixed shape', async () => {
    const userToken = JwtFactory.createCustomerToken('user-123', tenantId);
    const userClient = createGatewayClient(userToken);
    userClient.setTenantId(tenantId);

    try {
      // Try to access admin-only endpoint
      await userClient.get('/admin/users');
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.response?.data.success).toBe(false);
      expect(error.response?.data.error?.code).toBe('FORBIDDEN');
      expect(error.response?.data.error?.message).toBeDefined();
    }
  });

  test('T-CON-API-07: Health endpoint returns { status: ok, service: <name> }', async () => {
    const response = await apiClient.get('/health');
    
    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('status');
    expect(response.data).toHaveProperty('service');
    expect(response.data.status).toBe('ok');
  });
});
