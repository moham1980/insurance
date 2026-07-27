import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { ApiClient } from '../helpers/api-client';
import { DbHelper } from '../helpers/db-helper';
import { JwtFactory } from '../helpers/jwt-factory';

describe('Integration: Reporting Service', () => {
  let apiClient: ApiClient;
  let adminToken: string;
  let tenantId: string;
  let snapshotId: string;
  let policyId: string;

  beforeAll(async () => {
    apiClient = new ApiClient('http://localhost:18000');
    adminToken = JwtFactory.createAdminToken(tenantId);
    tenantId = 'tenant-reporting-integration';
    await DbHelper.cleanup('reporting');
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('T-INT-RPT-01: Reporting Ready KPIs + Snapshot ingestion + Governance', () => {
    test('should return Ready KPIs', async () => {
      const response = await apiClient.get('/reporting/kpis/ready', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('kpis');
      expect(Array.isArray(response.data.data.kpis)).toBe(true);
    });

    test('should ingest snapshot with governance validation', async () => {
      // Create governance policy
      const policyResponse = await apiClient.post('/reporting/governance/policies', {
        tenantId,
        policyName: 'test-governance-policy',
        kpiKeys: ['total_policies', 'total_claims'],
        validationRules: {
          minValue: 0,
          maxValue: 1000000,
        },
        allowedSources: ['policy-service', 'claims-service'],
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(policyResponse.status).toBe(201);
      policyId = policyResponse.data.data.id;

      // Ingest snapshot
      const snapshotResponse = await apiClient.post('/reporting/snapshots', {
        tenantId,
        snapshotDate: new Date().toISOString(),
        kpis: [
          {
            kpiKey: 'total_policies',
            value: 1500,
            metadata: { source: 'policy-service' },
          },
          {
            kpiKey: 'total_claims',
            value: 250,
            metadata: { source: 'claims-service' },
          },
        ],
        governancePolicyId: policyId,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(snapshotResponse.status).toBe(201);
      expect(snapshotResponse.data.success).toBe(true);
      snapshotId = snapshotResponse.data.data.id;
      expect(['validated', 'pending', 'rejected']).toContain(snapshotResponse.data.data.status);
    });

    test('should enforce governance policy', async () => {
      // Try to ingest violating snapshot
      const violatingResponse = await apiClient.post('/reporting/snapshots', {
        tenantId,
        snapshotDate: new Date().toISOString(),
        kpis: [
          {
            kpiKey: 'total_policies',
            value: 9999999, // Exceeds max
            metadata: { source: 'policy-service' },
          },
        ],
        governancePolicyId: policyId,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(violatingResponse.status).toBe(201);
      const violatingSnapshotId = violatingResponse.data.data.id;

      // Check status
      const statusResponse = await apiClient.get(`/reporting/snapshots/${violatingSnapshotId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(statusResponse.data.data.status).toBe('rejected');
      expect(statusResponse.data.data).toHaveProperty('validationErrors');
    });

    test('should manage governance policies', async () => {
      // List policies
      const listResponse = await apiClient.get('/reporting/governance/policies', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(listResponse.status).toBe(200);
      expect(listResponse.data.data).toHaveProperty('items');
      expect(Array.isArray(listResponse.data.data.items)).toBe(true);

      // Update policy
      if (listResponse.data.data.items.length > 0) {
        const updateResponse = await apiClient.put(`/reporting/governance/policies/${policyId}`, {
          validationRules: {
            minValue: 0,
            maxValue: 2000000, // Updated max
          },
        }, {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'x-tenant-id': tenantId,
          },
        });

        expect(updateResponse.status).toBe(200);
      }
    });
  });

  describe('T-INT-RPT-02: Reinsurance Projections', () => {
    test('should return reinsurance projections', async () => {
      const response = await apiClient.get('/reporting/projections/reinsurance', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
        params: {
          period: 'monthly',
          year: 2024,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('projections');
      expect(Array.isArray(response.data.data.projections)).toBe(true);
    });

    test('should return ceded premium projections', async () => {
      const response = await apiClient.get('/reporting/projections/ceded-premium', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
        params: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('totalCeded');
      expect(response.data.data).toHaveProperty('byTreaty');
    });

    test('should return recovery projections', async () => {
      const response = await apiClient.get('/reporting/projections/recoveries', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
        params: {
          period: 'quarterly',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('totalRecoveries');
      expect(response.data.data).toHaveProperty('byReinsurer');
    });
  });

  describe('Additional Reporting Features', () => {
    test('should return executive BI dashboard', async () => {
      const response = await apiClient.get('/reporting/dashboard/executive', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
        params: {
          period: '30d',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('policyMetrics');
      expect(response.data.data).toHaveProperty('claimMetrics');
      expect(response.data.data).toHaveProperty('fraudMetrics');
      expect(response.data.data).toHaveProperty('reinsuranceMetrics');
      expect(response.data.data).toHaveProperty('complaintMetrics');
    });

    test('should return financial KPIs', async () => {
      const response = await apiClient.get('/reporting/kpis/financial', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('totalPremium');
      expect(response.data.data).toHaveProperty('totalClaimsPaid');
      expect(response.data.data).toHaveProperty('netProfit');
      expect(response.data.data).toHaveProperty('lossRatio');
    });

    test('should return market share KPIs', async () => {
      const response = await apiClient.get('/reporting/kpis/market-share', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('marketSharePercentage');
      expect(response.data.data).toHaveProperty('totalPolicies');
      expect(response.data.data).toHaveProperty('ranking');
    });

    test('should return satisfaction KPIs', async () => {
      const response = await apiClient.get('/reporting/kpis/satisfaction', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('customerSatisfactionScore');
      expect(response.data.data).toHaveProperty('complaintResolutionRate');
      expect(response.data.data).toHaveProperty('averageResponseTime');
    });

    test('should manage snapshots', async () => {
      // List snapshots
      const listResponse = await apiClient.get('/reporting/snapshots', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(listResponse.status).toBe(200);
      expect(listResponse.data.data).toHaveProperty('items');
      expect(Array.isArray(listResponse.data.data.items)).toBe(true);

      // Get specific snapshot
      if (snapshotId) {
        const getResponse = await apiClient.get(`/reporting/snapshots/${snapshotId}`, {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'x-tenant-id': tenantId,
          },
        });

        expect(getResponse.status).toBe(200);
        expect(getResponse.data.data.id).toBe(snapshotId);
      }
    });

    test('should manage governance config', async () => {
      // Get config
      const getResponse = await apiClient.get('/reporting/governance/config', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(getResponse.status).toBe(200);
      expect(getResponse.data.data).toHaveProperty('requirePolicyForKpis');
      expect(getResponse.data.data).toHaveProperty('allowIngestionWithoutPolicy');

      // Update config
      const updateResponse = await apiClient.put('/reporting/governance/config', {
        tenantId,
        requirePolicyForKpis: ['financial_kpi'],
        allowIngestionWithoutPolicy: true,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.success).toBe(true);
    });

    test('should connect to external systems', async () => {
      // Create external system connection
      const createResponse = await apiClient.post('/reporting/external-systems', {
        tenantId,
        systemType: 'data_warehouse',
        systemName: 'Test Data Warehouse',
        connectionConfig: {
          host: 'localhost',
          port: 5432,
          database: 'test_dw',
        },
        syncFrequencyMinutes: 60,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(createResponse.status).toBe(201);
      const connectionId = createResponse.data.data.id;

      // Sync to external system
      const syncResponse = await apiClient.post(`/reporting/external-systems/${connectionId}/sync`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(syncResponse.status).toBe(200);
      expect(syncResponse.data.success).toBe(true);
    });
  });
});
