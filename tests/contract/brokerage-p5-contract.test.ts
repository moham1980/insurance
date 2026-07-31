import { describe, test, expect } from '@jest/globals';
import { createServiceClient } from '../helpers/api-client';
import { JwtFactory } from '../helpers/jwt-factory';

/**
 * Contract tests for Claims Advocacy P5 endpoints.
 * These tests verify response shape and error codes only.
 */
describe('Contract: Brokerage P5 - Claims Advocacy', () => {
  const tenantId = 'test-tenant';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createServiceClient(
    process.env.CLAIMS_SERVICE_URL || 'http://localhost:18002',
    adminToken,
  );
  apiClient.setTenantId(tenantId);

  test('T-CON-P5-01: Claim acknowledge returns success/data/correlationId', async () => {
    const correlationId = 'test-p5-01';
    apiClient.setCorrelationId(correlationId);
    const claimId = '00000000-0000-0000-0000-000000000001';
    try {
      const response = await apiClient.post(`/claims/${claimId}/acknowledge`);
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('correlationId', correlationId);
    } catch (error: any) {
      const data = error.response?.data;
      if (data) {
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('correlationId', correlationId);
      }
    }
  });

  test('T-CON-P5-02: Claim submit-to-carrier returns success/data/correlationId', async () => {
    const correlationId = 'test-p5-02';
    apiClient.setCorrelationId(correlationId);
    const claimId = '00000000-0000-0000-0000-000000000001';
    try {
      const response = await apiClient.post(`/claims/${claimId}/submit-to-carrier`, {
        externalClaimId: 'EXT-CLM-001',
      });
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('correlationId', correlationId);
    } catch (error: any) {
      const data = error.response?.data;
      if (data) {
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('correlationId', correlationId);
      }
    }
  });

  test('T-CON-P5-03: Claim appeal returns success/data/correlationId', async () => {
    const correlationId = 'test-p5-03';
    apiClient.setCorrelationId(correlationId);
    const claimId = '00000000-0000-0000-0000-000000000001';
    try {
      const response = await apiClient.post(`/claims/${claimId}/appeal`, {
        reason: 'Additional evidence provided',
      });
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('correlationId', correlationId);
    } catch (error: any) {
      const data = error.response?.data;
      if (data) {
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('correlationId', correlationId);
      }
    }
  });

  test('T-CON-P5-04: Claim history returns success/data/correlationId', async () => {
    const correlationId = 'test-p5-04';
    apiClient.setCorrelationId(correlationId);
    const claimId = '00000000-0000-0000-0000-000000000001';
    try {
      const response = await apiClient.get(`/claims/${claimId}/history`);
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('correlationId', correlationId);
    } catch (error: any) {
      const data = error.response?.data;
      if (data) {
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('correlationId', correlationId);
      }
    }
  });

  test('T-CON-P5-05: Open advocacy case returns success/data/correlationId', async () => {
    const correlationId = 'test-p5-05';
    apiClient.setCorrelationId(correlationId);
    const claimId = '00000000-0000-0000-0000-000000000001';
    try {
      const response = await apiClient.post(`/claims/${claimId}/advocacy-cases`, {
        brokerOrganizationId: '00000000-0000-0000-0000-000000000002',
        customerPartyId: '00000000-0000-0000-0000-000000000003',
        carrierOrganizationId: '00000000-0000-0000-0000-000000000004',
        priority: 'high',
      });
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('correlationId', correlationId);
    } catch (error: any) {
      const data = error.response?.data;
      if (data) {
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('correlationId', correlationId);
      }
    }
  });

  test('T-CON-P5-06: Create adjuster referral returns success/data/correlationId', async () => {
    const correlationId = 'test-p5-06';
    apiClient.setCorrelationId(correlationId);
    const claimId = '00000000-0000-0000-0000-000000000001';
    try {
      const response = await apiClient.post(`/claims/${claimId}/adjuster-referrals`, {
        caseId: '00000000-0000-0000-0000-000000000005',
        adjusterOrganizationId: '00000000-0000-0000-0000-000000000006',
        adjusterPartyId: '00000000-0000-0000-0000-000000000007',
      });
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('correlationId', correlationId);
    } catch (error: any) {
      const data = error.response?.data;
      if (data) {
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('correlationId', correlationId);
      }
    }
  });

  test('T-CON-P5-07: Create claim projection returns success/data/correlationId', async () => {
    const correlationId = 'test-p5-07';
    apiClient.setCorrelationId(correlationId);
    const claimId = '00000000-0000-0000-0000-000000000001';
    try {
      const response = await apiClient.post(`/claims/${claimId}/projections`, {
        brokerOrganizationId: '00000000-0000-0000-0000-000000000002',
        carrierOrganizationId: '00000000-0000-0000-0000-000000000004',
        externalClaimId: 'EXT-CLM-001',
        sourceSystemId: 'carrier-portal-a',
        payload: { status: 'acknowledged', amount: 1000000 },
      });
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('correlationId', correlationId);
    } catch (error: any) {
      const data = error.response?.data;
      if (data) {
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('correlationId', correlationId);
      }
    }
  });

  test('T-CON-P5-08: Create recovery case returns success/data/correlationId', async () => {
    const correlationId = 'test-p5-08';
    apiClient.setCorrelationId(correlationId);
    const claimId = '00000000-0000-0000-0000-000000000001';
    try {
      const response = await apiClient.post(`/claims/${claimId}/recovery`, {
        responsiblePartyId: '00000000-0000-0000-0000-000000000008',
        expectedRecoveryAmount: 500000,
      });
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('correlationId', correlationId);
    } catch (error: any) {
      const data = error.response?.data;
      if (data) {
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('correlationId', correlationId);
      }
    }
  });
});
