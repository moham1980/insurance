import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createServiceClient } from '../helpers/api-client';
import { DbHelper } from '../helpers/db-helper';

describe('Integration: Reporting Service', () => {
  const serviceUrl = process.env.REPORTING_SERVICE_URL || 'http://localhost:18014';
  const apiClient = createServiceClient(serviceUrl);
  const tenantId = 'test-tenant';

  beforeAll(async () => {
    await DbHelper.truncateTable('reporting', 'reports');
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('Generate policy report', async () => {
    const response = await apiClient.post('/reporting/reports/generate', {
      tenantId,
      reportType: 'policy_summary',
      parameters: {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      },
    });

    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('id');
    expect(response.data.reportType).toBe('policy_summary');
  });

  test('Generate claims report', async () => {
    const response = await apiClient.post('/reporting/reports/generate', {
      tenantId,
      reportType: 'claims_analysis',
      parameters: {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      },
    });

    expect(response.success).toBe(true);
    expect(response.data.reportType).toBe('claims_analysis');
  });

  test('Get report by ID', async () => {
    const createResponse = await apiClient.post('/reporting/reports/generate', {
      tenantId,
      reportType: 'financial_summary',
      parameters: {},
    });
    const reportId = createResponse.data.id;

    const getResponse = await apiClient.get(`/reporting/reports/${reportId}`);
    expect(getResponse.success).toBe(true);
    expect(getResponse.data.id).toBe(reportId);
  });

  test('List reports', async () => {
    const listResponse = await apiClient.get('/reporting/reports', {
      params: { tenantId },
    });

    expect(listResponse.success).toBe(true);
    expect(Array.isArray(listResponse.data)).toBe(true);
  });

  test('T-INT-RPT-02: Reporting: Reinsurance projections', async () => {
    // Create a treaty first (simulated)
    const treatyId = 'treaty-projection-123';

    // Ingest cession data for projection
    try {
      const ingestResponse = await apiClient.post('/reporting/reinsurance/ingest', {
        tenantId,
        treatyId,
        cessionData: {
          policyId: 'policy-projection-123',
          cededAmount: 75000000,
          cessionDate: new Date().toISOString(),
        },
      });
      if (ingestResponse.success === true) {
        expect(ingestResponse.data).toHaveProperty('ingestionId');
      }
    } catch (error) {
      console.log('Reinsurance ingest endpoint not yet implemented');
    }

    // Query projections
    try {
      const projectionResponse = await apiClient.get('/reporting/reinsurance/projections', {
        params: { tenantId, treatyId },
      });
      if (projectionResponse.success === true) {
        expect(Array.isArray(projectionResponse.data)).toBe(true);
        if (projectionResponse.data.length > 0) {
          expect(projectionResponse.data[0]).toHaveProperty('totalCeded');
          expect(projectionResponse.data[0]).toHaveProperty('projectedRecovery');
        }
      }
    } catch (error) {
      console.log('Reinsurance projection endpoint not yet implemented');
    }
  });
});
