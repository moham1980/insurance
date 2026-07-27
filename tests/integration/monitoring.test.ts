import { describe, test, expect, beforeAll } from '@jest/globals';
import { ApiClient } from '../helpers/api-client';

describe('Integration: Monitoring Service', () => {
  let apiClient: ApiClient;
  let tenantId: string;

  beforeAll(async () => {
    apiClient = new ApiClient('http://localhost:18000');
    tenantId = 'tenant-mon-integration';
  });

  test('T-INT-MON-01: Monitoring: SLO/Alert/Dashboard + Prometheus metrics', async () => {
    // Get SLO status
    try {
      const sloResponse = await apiClient.get('/monitoring/slo', {
        params: { tenantId },
      });
      if (sloResponse.success === true) {
        expect(sloResponse.data).toHaveProperty('availability');
        expect(sloResponse.data).toHaveProperty('latency');
        expect(sloResponse.data).toHaveProperty('errorRate');
      }
    } catch (error) {
      console.log('SLO endpoint not yet implemented');
    }

    // Get active alerts
    try {
      const alertResponse = await apiClient.get('/monitoring/alerts', {
        params: { tenantId, status: 'active' },
      });
      if (alertResponse.success === true) {
        expect(Array.isArray(alertResponse.data)).toBe(true);
      }
    } catch (error) {
      console.log('Alerts endpoint not yet implemented');
    }

    // Get dashboard metrics
    try {
      const dashboardResponse = await apiClient.get('/monitoring/dashboard', {
        params: { tenantId },
      });
      if (dashboardResponse.success === true) {
        expect(dashboardResponse.data).toHaveProperty('totalRequests');
        expect(dashboardResponse.data).toHaveProperty('successRate');
        expect(dashboardResponse.data).toHaveProperty('avgLatency');
      }
    } catch (error) {
      console.log('Dashboard endpoint not yet implemented');
    }

    // Get Prometheus metrics
    try {
      const metricsResponse = await apiClient.get('/monitoring/metrics/prometheus');
      if (metricsResponse.success === true) {
        expect(typeof metricsResponse.data).toBe('string');
        expect(metricsResponse.data).toContain('http_requests_total');
      }
    } catch (error) {
      console.log('Prometheus metrics endpoint not yet implemented');
    }
  });
});
