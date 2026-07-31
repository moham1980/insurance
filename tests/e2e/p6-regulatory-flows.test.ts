import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createGatewayClient } from '../helpers/api-client';
import { JwtFactory } from '../helpers/jwt-factory';
import { DbHelper } from '../helpers/db-helper';
import { DockerComposeHelper } from '../helpers/docker-compose';
import { AssertionHelpers } from '../helpers/assertions';

describe('E2E: P6 Regulatory & Reporting Flows', () => {
  const tenantId = 'test-tenant-p6';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createGatewayClient(adminToken);
  apiClient.setTenantId(tenantId);

  let brokerReportId: string;
  let tcorReportId: string;
  let auditReportId: string;
  let correlationId: string;

  beforeAll(async () => {
    await DockerComposeHelper.waitForHealth('api-gateway', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('reporting-service', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('policy-service', { timeoutMs: 60000 });
  });

  afterAll(async () => {
    await DbHelper.truncateAllTables('reporting', ['broker_transaction_reports', 'tcor_reports', 'audit_reports']);
    await DbHelper.cleanup('reporting');
  });

  describe('Unique Code Reports', () => {
    test('GET /api/v1/reports/policies-without-unique-code returns list', async () => {
      const res = await apiClient.get('/api/v1/reports/policies-without-unique-code?limit=10&offset=0');
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data).toHaveProperty('data');
      expect(Array.isArray(res.data.data)).toBe(true);
      expect(res.data).toHaveProperty('pagination');
      expect(res.data.pagination).toHaveProperty('total');
      correlationId = res.data.correlationId;
      expect(correlationId).toBeTruthy();
    });

    test('GET /api/v1/reports/duplicate-unique-codes returns list', async () => {
      const res = await apiClient.get('/api/v1/reports/duplicate-unique-codes');
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(Array.isArray(res.data.data)).toBe(true);
      expect(res.data).toHaveProperty('count');
    });
  });

  describe('Broker Report Lifecycle', () => {
    test('POST /reporting/broker-reports creates draft', async () => {
      const res = await apiClient.post('/reporting/broker-reports', {
        periodId: '1404-01',
        periodStartDate: '2025-03-21',
        periodEndDate: '2025-06-21',
        reportType: 'broker_transaction',
      });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      brokerReportId = res.data.data.reportId;
      expect(brokerReportId).toBeTruthy();
      expect(res.data.data.status).toBe('draft');
    });

    test('POST /reporting/broker-reports/:id/generate generates report', async () => {
      const res = await apiClient.post(`/reporting/broker-reports/${brokerReportId}/generate`);
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data.status).toBe('generated');
      expect(res.data.data.generatedAt).toBeTruthy();
    });

    test('POST /reporting/broker-reports/:id/approve approves report', async () => {
      const res = await apiClient.post(`/reporting/broker-reports/${brokerReportId}/approve`);
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data.status).toBe('approved');
    });

    test('POST /reporting/broker-reports/:id/submit blocks on critical violations', async () => {
      const res = await apiClient.post(`/reporting/broker-reports/${brokerReportId}/submit`);
      // If critical issues exist, should get 400 with CRITICAL_VIOLATIONS
      // If no critical issues, should succeed
      if (res.status === 400) {
        expect(res.data.error?.code).toBe('CRITICAL_VIOLATIONS');
      } else {
        expect(res.status).toBe(200);
        expect(res.data.success).toBe(true);
        expect(res.data.data.status).toBe('submitted');
      }
    });
  });

  describe('TCoR Report Lifecycle', () => {
    test('POST /reporting/tcor-reports creates draft', async () => {
      const res = await apiClient.post('/reporting/tcor-reports', {
        periodId: '1404-Q1',
        periodStartDate: '2025-03-21',
        periodEndDate: '2025-06-21',
      });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      tcorReportId = res.data.data.reportId;
      expect(tcorReportId).toBeTruthy();
    });

    test('POST /reporting/tcor-reports/:id/generate generates report', async () => {
      const res = await apiClient.post(`/reporting/tcor-reports/${tcorReportId}/generate`);
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data.status).toBe('generated');
    });

    test('GET /reporting/tcor-reports/:id/drilldown?by=policy returns detail', async () => {
      const res = await apiClient.get(`/reporting/tcor-reports/${tcorReportId}/drilldown?by=policy`);
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(Array.isArray(res.data.data)).toBe(true);
    });

    test('GET /reporting/tcor-reports/:id/drilldown?by=lineOfBusiness returns detail', async () => {
      const res = await apiClient.get(`/reporting/tcor-reports/${tcorReportId}/drilldown?by=lineOfBusiness`);
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });

    test('GET /reporting/tcor-reports/:id/drilldown?by=carrier returns detail', async () => {
      const res = await apiClient.get(`/reporting/tcor-reports/${tcorReportId}/drilldown?by=carrier`);
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });

    test('GET /reporting/tcor-reports/:id/drilldown with invalid by returns empty', async () => {
      const res = await apiClient.get(`/reporting/tcor-reports/${tcorReportId}/drilldown?by=invalid`);
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data).toEqual([]);
    });
  });

  describe('BI Export', () => {
    test('GET /reporting/bi/export?format=csv&dashboard=executive returns CSV', async () => {
      const res = await apiClient.get('/reporting/bi/export?format=csv&dashboard=executive');
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.format).toBe('csv');
      expect(res.data.contentType).toContain('text/csv');
    });

    test('GET /reporting/bi/export?format=excel&dashboard=executive returns Excel', async () => {
      const res = await apiClient.get('/reporting/bi/export?format=excel&dashboard=executive');
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.format).toBe('excel');
    });

    test('GET /reporting/bi/export?format=pdf&dashboard=executive returns PDF', async () => {
      const res = await apiClient.get('/reporting/bi/export?format=pdf&dashboard=executive');
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.format).toBe('pdf');
    });
  });

  describe('Audit Reports', () => {
    test('POST /reporting/audit-reports creates with valid type', async () => {
      const res = await apiClient.post('/reporting/audit-reports', {
        reportType: 'policy_issuance',
        periodStartDate: '2025-01-01',
        periodEndDate: '2025-06-30',
      });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      auditReportId = res.data.data.reportId;
      expect(auditReportId).toBeTruthy();
    });

    test('POST /reporting/audit-reports rejects invalid type', async () => {
      const res = await apiClient.post('/reporting/audit-reports', {
        reportType: 'invalid_type',
      });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(false);
      expect(res.data.error.code).toBe('VALIDATION_ERROR');
    });

    test('POST /reporting/audit-reports/:id/generate produces tamper-evident signature', async () => {
      const res = await apiClient.post(`/reporting/audit-reports/${auditReportId}/generate`);
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data.status).toBe('generated');
      expect(res.data.data.signature).toBeTruthy();
      expect(res.data.data.signature.length).toBe(64);
    });

    test('GET /reporting/audit-reports/:id/verify validates signature', async () => {
      const res = await apiClient.get(`/reporting/audit-reports/${auditReportId}/verify`);
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data.valid).toBe(true);
    });

    test('GET /reporting/audit-reports/:id/export returns content', async () => {
      const res = await apiClient.get(`/reporting/audit-reports/${auditReportId}/export`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.data).toContain('Audit Report');
      expect(res.data).toContain('Signature:');
    });
  });

  describe('Reconciliation', () => {
    test('GET /reporting/reconciliation/policy-ledger runs reconciliation', async () => {
      const res = await apiClient.get('/reporting/reconciliation/policy-ledger');
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data).toHaveProperty('totalPolicies');
      expect(res.data.data).toHaveProperty('discrepancy');
    });

    test('GET /reporting/reconciliation/payment-ledger runs reconciliation', async () => {
      const res = await apiClient.get('/reporting/reconciliation/payment-ledger');
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data).toHaveProperty('totalClaimPayments');
      expect(res.data.data).toHaveProperty('discrepancy');
    });

    test('GET /reporting/reconciliation/run-all runs all reconciliations', async () => {
      const res = await apiClient.get('/reporting/reconciliation/run-all');
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data).toHaveProperty('policyLedger');
      expect(res.data.data).toHaveProperty('paymentLedger');
      expect(res.data.data).toHaveProperty('dataQuality');
    });
  });

  describe('Data Quality', () => {
    test('GET /reporting/data-quality/issues returns list', async () => {
      const res = await apiClient.get('/reporting/data-quality/issues?limit=10');
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('rows');
      expect(res.data).toHaveProperty('total');
    });

    test('POST /reporting/data-quality/run-reconciliation runs rules', async () => {
      const res = await apiClient.post('/reporting/data-quality/run-reconciliation');
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('rulesRun');
      expect(res.data.rulesRun).toBeGreaterThan(0);
    });
  });
});
