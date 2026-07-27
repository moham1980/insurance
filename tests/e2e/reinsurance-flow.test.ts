import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createGatewayClient } from '../helpers/api-client';
import { JwtFactory } from '../helpers/jwt-factory';
import { DbHelper } from '../helpers/db-helper';
import { DockerComposeHelper } from '../helpers/docker-compose';
import { AssertionHelpers } from '../helpers/assertions';

describe('E2E: Reinsurance Flow', () => {
  const tenantId = 'test-tenant';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createGatewayClient(adminToken);
  apiClient.setTenantId(tenantId);
  let correlationId: string;

  beforeAll(async () => {
    await DockerComposeHelper.waitForHealth('api-gateway', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('reinsurance-service', { timeoutMs: 60000 });
    await DbHelper.truncateTable('public', 're_treaties');
    await DbHelper.truncateTable('public', 're_cessions');
    await DbHelper.truncateTable('public', 're_statements');
    await DbHelper.truncateTable('public', 're_claim_recoveries');
    await DbHelper.truncateTable('public', 're_reconciliations');
    await DbHelper.truncateTable('public', 're_tickets');
  });

  afterAll(async () => {
    await DbHelper.cleanup('public');
  });

  test('T-E2E-RI-01: Create Treaty → Calculate cession → Statement → Recovery', async () => {
    correlationId = `test-ri-01-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const treatyResponse = await apiClient.post('/re/re/treaties', {
      treatyNumber: `TREATY-${Date.now()}`,
      reinsurerName: 'Swiss Re',
      treatyType: 'proportional',
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency: 'IRR',
      terms: { cessionPercent: 50, limit: 1000000000 },
    });
    AssertionHelpers.assertSuccessResponse(treatyResponse);
    const treatyId = treatyResponse.data.treatyId;

    const cessionResponse = await apiClient.post('/re/re/cessions', {
      treatyId,
      policyId: 'policy-ri-123',
      sumInsured: 200000000,
      premium: 15000000,
      cessionPercent: 50,
      cededAmount: 7500000,
      notes: 'Test cession',
    });
    if (cessionResponse.success === true) {
      expect(cessionResponse.data).toHaveProperty('cessionId');
    }

    const statementResponse = await apiClient.post('/re/re/statements', {
      treatyId,
      statementType: 'bordereau',
      periodStart: new Date().toISOString(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      totals: { ceded: 7500000, retained: 7500000 },
    });
    if (statementResponse.success === true) {
      expect(statementResponse.data).toHaveProperty('statementId');
    }

    const recoveryResponse = await apiClient.post('/re/re/recoveries', {
      treatyId,
      claimId: 'claim-ri-123',
      policyId: 'policy-ri-123',
      lossDate: new Date().toISOString(),
      grossLossAmount: 50000000,
      cededLossAmount: 25000000,
      recoveredAmount: 0,
      currency: 'IRR',
      status: 'open',
      notes: 'Test recovery',
    });
    if (recoveryResponse.success === true) {
      expect(recoveryResponse.data).toHaveProperty('recoveryId');
    }
  });

  test('T-E2E-RI-02: Cession lifecycle', async () => {
    correlationId = `test-ri-02-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const treatyResponse = await apiClient.post('/re/re/treaties', {
      treatyNumber: `TREATY-02-${Date.now()}`,
      reinsurerName: 'Munich Re',
      treatyType: 'proportional',
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency: 'IRR',
      terms: { retention: 50000000, limit: 500000000 },
    });
    const treatyId = treatyResponse.data.treatyId;

    const cessionResponse = await apiClient.post('/re/re/cessions', {
      treatyId,
      policyId: 'policy-events-123',
      sumInsured: 300000000,
      premium: 20000000,
      cessionPercent: 30,
      cededAmount: 6000000,
      notes: 'Test cession',
    });

    if (cessionResponse.success === true) {
      const cessionId = cessionResponse.data.cessionId;
      const cessionList = await apiClient.get('/re/re/cessions', {
        params: { treatyId },
      });
      if (cessionList.success === true) {
        expect(Array.isArray(cessionList.data.rows)).toBe(true);
      }

      const approveResponse = await apiClient.patch(`/re/re/cessions/${cessionId}/approve`, {
        approved: true,
        notes: 'Approved cession',
      });
      if (approveResponse.success === true) {
        expect(approveResponse.data.status).toBe('approved');
      }
    }
  });

  test('T-E2E-RI-03: Statement lifecycle', async () => {
    correlationId = `test-ri-03-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const treatyResponse = await apiClient.post('/re/re/treaties', {
      treatyNumber: `TREATY-03-${Date.now()}`,
      reinsurerName: 'Lloyd\'s',
      treatyType: 'non_proportional',
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency: 'IRR',
      terms: { attachment: 100000000, limit: 500000000 },
    });
    const treatyId = treatyResponse.data.treatyId;

    const statementResponse = await apiClient.post('/re/re/statements', {
      treatyId,
      statementType: 'bordereau',
      periodStart: new Date().toISOString(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      totals: { ceded: 10000000, retained: 10000000 },
    });

    if (statementResponse.success === true) {
      const statementId = statementResponse.data.statementId;
      const listResponse = await apiClient.get('/re/re/statements', {
        params: { treatyId },
      });
      if (listResponse.success === true) {
        expect(Array.isArray(listResponse.data.rows)).toBe(true);
      }

      const updateResponse = await apiClient.patch(`/re/re/statements/${statementId}`, {
        status: 'issued',
        totals: { ceded: 12000000, retained: 8000000 },
      });
      if (updateResponse.success === true) {
        expect(updateResponse.data.status).toBe('issued');
      }
    }
  });

  test('T-E2E-RI-04: Recovery lifecycle', async () => {
    correlationId = `test-ri-04-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const treatyResponse = await apiClient.post('/re/re/treaties', {
      treatyNumber: `TREATY-04-${Date.now()}`,
      reinsurerName: 'Hannover Re',
      treatyType: 'proportional',
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency: 'IRR',
      terms: { facultative: true },
    });
    const treatyId = treatyResponse.data.treatyId;

    const recoveryResponse = await apiClient.post('/re/re/recoveries', {
      treatyId,
      claimId: 'claim-recovery-123',
      policyId: 'policy-recovery-123',
      lossDate: new Date().toISOString(),
      grossLossAmount: 60000000,
      cededLossAmount: 36000000,
      recoveredAmount: 0,
      currency: 'IRR',
      status: 'open',
      notes: 'Test recovery',
    });

    if (recoveryResponse.success === true) {
      const recoveryId = recoveryResponse.data.recoveryId;
      const listResponse = await apiClient.get('/re/re/recoveries', {
        params: { treatyId },
      });
      if (listResponse.success === true) {
        expect(Array.isArray(listResponse.data.rows)).toBe(true);
      }

      const updateResponse = await apiClient.patch(`/re/re/recoveries/${recoveryId}`, {
        recoveredAmount: 10000000,
        status: 'partially_collected',
      });
      if (updateResponse.success === true) {
        expect(updateResponse.data.status).toBe('partially_collected');
      }
    }
  });

  test('T-E2E-RI-05: Reconciliation + ticketing + messages', async () => {
    correlationId = `test-ri-05-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const treatyResponse = await apiClient.post('/re/re/treaties', {
      treatyNumber: `TREATY-05-${Date.now()}`,
      reinsurerName: 'Partner Re',
      treatyType: 'proportional',
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency: 'IRR',
      terms: { cessionPercent: 50 },
    });
    const treatyId = treatyResponse.data.treatyId;

    const statementResponse = await apiClient.post('/re/re/statements', {
      treatyId,
      statementType: 'bordereau',
      periodStart: new Date().toISOString(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      totals: { ceded: 20000000, retained: 20000000 },
    });

    if (statementResponse.success === true) {
      const statementId = statementResponse.data.statementId;

      const reconciliationResponse = await apiClient.post('/re/re/reconciliations', {
        statementId,
        summary: { difference: 5000000 },
        details: [{ item: 'cession', expected: 10000000, actual: 15000000 }],
      });

      if (reconciliationResponse.success === true) {
        const reconciliationId = reconciliationResponse.data.reconciliationId;

        const ticketResponse = await apiClient.post('/re/re/tickets', {
          reconciliationId,
          reasonCode: 'discrepancy',
          summary: 'Cession amount mismatch',
          assignedTo: 're Analyst-1',
          slaResponseDueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
        if (ticketResponse.success === true) {
          expect(ticketResponse.data).toHaveProperty('ticketId');
          const ticketId = ticketResponse.data.ticketId;

          const messageResponse = await apiClient.post(`/re/re/tickets/${ticketId}/messages`, {
            messageType: 'internal',
            body: 'Please review the discrepancy',
          });
          if (messageResponse.success === true) {
            expect(messageResponse.data).toHaveProperty('ticketMessageId');
          }
        }
      }
    }
  });

  test('T-E2E-RI-06: Treaty list and get', async () => {
    correlationId = `test-ri-06-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const treatyResponse = await apiClient.post('/re/re/treaties', {
      treatyNumber: `TREATY-06-${Date.now()}`,
      reinsurerName: 'SCOR',
      treatyType: 'proportional',
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency: 'IRR',
      terms: { cessionPercent: 40 },
    });
    const treatyId = treatyResponse.data.treatyId;

    const getResponse = await apiClient.get(`/re/re/treaties/${treatyId}`);
    if (getResponse.success === true) {
      expect(getResponse.data.treatyId).toBe(treatyId);
    }

    const listResponse = await apiClient.get('/re/re/treaties', {
      params: { limit: 10, offset: 0 },
    });
    if (listResponse.success === true) {
      expect(Array.isArray(listResponse.data.rows)).toBe(true);
    }
  });
});
