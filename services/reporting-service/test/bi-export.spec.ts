import { describe, it, expect } from 'bun:test';
import { BiAggregateController } from '../src/bi-aggregate/bi-aggregate.controller';

function createMockBiService() {
  return {
    getExecutiveDashboard: async (tenantId?: string) => ({
      policyMetrics: { totalPolicies: 100, issuedPolicies: 80, cancelledPolicies: 5 },
      claimMetrics: { totalClaims: 30, paidClaims: 20, totalClaimAmount: '5000000' },
      fraudMetrics: { totalFlags: 5, confirmedFraud: 2 },
      underwritingMetrics: { approved: 70, rejected: 10 },
      salesNetworkMetrics: { totalBrokers: 15, activeBrokers: 12 },
      kpiSummary: { lossRatio: '0.65', combinedRatio: '0.92' },
    }),
    getCockpit: async (tenantId?: string) => ({
      todayPolicies: 5,
      todayClaims: 2,
      todayPremium: '1000000',
      pendingApprovals: 3,
    }),
  } as any;
}

describe('BiAggregateController Export', () => {
  it('export CSV format returns text/csv content type', async () => {
    const service = createMockBiService();
    const controller = new BiAggregateController(service);
    const req: any = { user: { tenantId: 't1', userId: 'u1' } };
    const headers: any = { 'x-correlation-id': 'corr-1' };

    const result = await controller.export(req, headers, 'csv', 'executive');
    expect(result.success).toBe(true);
    expect(result.format).toBe('csv');
    expect(result.contentType).toContain('text/csv');
    expect(result.data).toBeTruthy();
    expect(typeof result.data).toBe('string');
    expect(result.data).toContain('totalPolicies');
  });

  it('export Excel format returns TSV content', async () => {
    const service = createMockBiService();
    const controller = new BiAggregateController(service);
    const req: any = { user: { tenantId: 't1', userId: 'u1' } };
    const headers: any = { 'x-correlation-id': 'corr-2' };

    const result = await controller.export(req, headers, 'excel', 'executive');
    expect(result.success).toBe(true);
    expect(result.format).toBe('excel');
    expect(result.contentType).toContain('text/tab-separated-values');
  });

  it('export PDF format returns text/html content', async () => {
    const service = createMockBiService();
    const controller = new BiAggregateController(service);
    const req: any = { user: { tenantId: 't1', userId: 'u1' } };
    const headers: any = { 'x-correlation-id': 'corr-3' };

    const result = await controller.export(req, headers, 'pdf', 'executive');
    expect(result.success).toBe(true);
    expect(result.format).toBe('pdf');
    expect(result.contentType).toContain('text/html');
    expect(result.data).toContain('<html>');
  });

  it('export cockpit dashboard data', async () => {
    const service = createMockBiService();
    const controller = new BiAggregateController(service);
    const req: any = { user: { tenantId: 't1', userId: 'u1' } };
    const headers: any = { 'x-correlation-id': 'corr-4' };

    const result = await controller.export(req, headers, 'csv', 'cockpit');
    expect(result.success).toBe(true);
    expect(result.data).toContain('todayPolicies');
  });

  it('export with invalid format returns error', async () => {
    const service = createMockBiService();
    const controller = new BiAggregateController(service);
    const req: any = { user: { tenantId: 't1', userId: 'u1' } };
    const headers: any = { 'x-correlation-id': 'corr-5' };

    const result = await controller.export(req, headers, 'xml', 'executive');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
