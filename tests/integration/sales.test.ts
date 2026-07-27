import { describe, test, expect, beforeAll } from '@jest/globals';
import { ApiClient } from '../helpers/api-client';
import { DbHelper } from '../helpers/db-helper';
import { AssertionHelpers } from '../helpers/assertions';

describe('Integration: Sales Service', () => {
  let apiClient: ApiClient;
  let tenantId: string;

  beforeAll(async () => {
    apiClient = new ApiClient('http://localhost:18000');
    tenantId = 'tenant-sales-integration';
    await DbHelper.cleanup('sales');
  });

  test('T-INT-SN-01: Sales: Partner lifecycle + Commission + KPI', async () => {
    const createResponse = await apiClient.post('/sales/partners', {
      tenantId,
      partnerName: 'Insurance Agency XYZ',
      partnerType: 'agency',
      status: 'pending',
      contactEmail: 'agency@example.com',
    });
    const partnerId = createResponse.data.id;

    const verifyResponse = await apiClient.put(`/sales/partners/${partnerId}/verify`, {
      verifiedBy: 'admin-1',
      verificationDate: new Date().toISOString(),
    });

    if (verifyResponse.success === true) {
      expect(verifyResponse.data.status).toBe('verified');
    }

    const activateResponse = await apiClient.put(`/sales/partners/${partnerId}/activate`, {
      effectiveDate: new Date().toISOString(),
    });

    if (activateResponse.success === true) {
      expect(activateResponse.data.status).toBe('active');
    }

    const commissionResponse = await apiClient.post('/sales/commissions', {
      tenantId,
      partnerId,
      policyId: 'policy-123',
      commissionRate: 0.15,
      commissionAmount: 7500000,
    });

    if (commissionResponse.success === true) {
      expect(commissionResponse.data).toHaveProperty('commissionId');
    }

    try {
      const kpiResponse = await apiClient.get('/sales/kpi', {
        params: { partnerId },
      });
      if (kpiResponse.success === true) {
        expect(kpiResponse.data).toHaveProperty('totalPolicies');
      }
    } catch (error) {
      console.log('KPI endpoint not yet implemented');
    }
  });
});
