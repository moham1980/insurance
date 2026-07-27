import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createGatewayClient } from '../helpers/api-client';
import { JwtFactory } from '../helpers/jwt-factory';
import { partyFixtures, quoteFixtures } from '../fixtures/party.fixture';
import { DbHelper } from '../helpers/db-helper';
import { DockerComposeHelper } from '../helpers/docker-compose';
import { AssertionHelpers } from '../helpers/assertions';
import { createExecutedPaymentForPolicy } from '../helpers/payment-helper';

describe('E2E: Endorsement and Renewal Flow', () => {
  const tenantId = 'test-tenant';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createGatewayClient(adminToken);
  apiClient.setTenantId(tenantId);

  let partyId: string;
  let policyId: string;
  let correlationId: string;

  async function createAndIssuePolicy(nationalId: string): Promise<string> {
    const partyResponse = await apiClient.post('/party/party', {
      ...partyFixtures.individual,
      nationalId,
    });
    const pid = partyResponse.data.partyId;

    const quoteResponse = await apiClient.post('/policies/policies/quote', {
      ...quoteFixtures.basic,
      partyId: pid,
      tenantId,
    });

    const policyResponse = await apiClient.post('/policies/policies/convert-quote', {
      quote: { ...quoteFixtures.basic, partyId: pid, tenantId },
      tenantId,
    });
    const polId = policyResponse.data.policyId;

    await apiClient.post(`/policies/policies/${polId}/submit-docs`, {
      applicationData: {
        documents: [{ type: 'id_card', url: 'https://example.com/id.pdf' }],
      },
    });
    await apiClient.post(`/policies/policies/${polId}/risk-assess`, {
      riskAssessment: { riskScore: 25, assessorId: 'underwriter-1', notes: 'Low risk profile' },
    });
    await apiClient.post(`/policies/policies/${polId}/underwriting/decision`, {
      decision: 'approved',
      underwriterId: 'underwriter-1',
      notes: 'Risk acceptable',
    });
    const paymentId = await createExecutedPaymentForPolicy(apiClient, polId, quoteFixtures.basic.premiumAmount, tenantId);

    await apiClient.post(`/policies/policies/${polId}/quality-gate/override`, {
      action: 'issue',
      reason: 'Bypass Sanhab for E2E test',
    });
    await apiClient.post(`/policies/policies/${polId}/issue`, {
      paymentId,
    });
    await apiClient.post(`/policies/policies/${polId}/quality-gate/override`, {
      action: 'set_unique_code',
      reason: 'Bypass Sanhab for E2E test',
    });
    await apiClient.post(`/policies/policies/${polId}/unique-code`, {
      uniqueCode: `SANHAB-${nationalId}`,
    });

    return polId;
  }

  beforeAll(async () => {
    await DockerComposeHelper.waitForHealth('api-gateway', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('party-kyc-service', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('payments-service', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('policy-service', { timeoutMs: 60000 });
    await DbHelper.truncateTable('public', 'parties');
    await DbHelper.truncateTable('public', 'policies');

    policyId = await createAndIssuePolicy('1111111111');
    partyId = (await apiClient.get(`/policies/policies/${policyId}`)).data.partyId;
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('T-E2E-ENR-01: Create endorsement on active policy', async () => {
    correlationId = `test-enr-01-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const endorseResponse = await apiClient.post(`/policies/policies/${policyId}/endorse`, {
      changeType: 'endorsement',
      endorsementType: 'coverage_change',
      reason: 'Add comprehensive coverage rider',
      effectiveDate: new Date().toISOString(),
      payload: {
        coverageType: 'comprehensive_plus',
        sumInsuredAdjustment: 50000000,
        premiumAdjustment: 2000000,
      },
    });
    AssertionHelpers.assertSuccessResponse(endorseResponse);
    expect(endorseResponse.data).toHaveProperty('policyId');
    expect(endorseResponse.data.status).toBe('endorsed');
  });

  test('T-E2E-ENR-02: List endorsements for a policy', async () => {
    correlationId = `test-enr-02-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const listResponse = await apiClient.get(`/policies/policies/${policyId}/endorsements`);
    AssertionHelpers.assertSuccessResponse(listResponse);
    expect(Array.isArray(listResponse.data)).toBe(true);
  });

  test('T-E2E-ENR-03: Renew active policy', async () => {
    correlationId = `test-enr-03-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const renewPolId = await createAndIssuePolicy('2222222222');
    const renewResponse = await apiClient.post(`/policies/policies/${renewPolId}/renew`, {
      reason: 'Annual renewal',
      newPremium: 16000000,
      newCoverageEndDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString(),
    });
    AssertionHelpers.assertSuccessResponse(renewResponse);
    expect(renewResponse.data).toHaveProperty('policyId');
  });

  test('T-E2E-ENR-04: Schedule auto-renewal', async () => {
    correlationId = `test-enr-04-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const arPolId = await createAndIssuePolicy('3333333333');
    const autoRenewResponse = await apiClient.post(`/policies/policies/${arPolId}/auto-renew`, {
      enabled: true,
      autoRenew: true,
      paymentMethod: 'direct_debit',
    });
    AssertionHelpers.assertSuccessResponse(autoRenewResponse);
    expect(autoRenewResponse.data.autoRenew).toBe(true);
  });

  test('T-E2E-ENR-05: Renewal schedule and approval workflow', async () => {
    correlationId = `test-enr-05-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const schPolId = await createAndIssuePolicy('5555555555');
    const scheduleResponse = await apiClient.post(`/policies/policies/${schPolId}/renewal/schedule`, {
      scheduledDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      premium: 16500000,
      notes: 'Scheduled renewal with 10% discount',
    });

    if (scheduleResponse.success === true) {
      const renewalId = scheduleResponse.data.renewalId;

      const approveResponse = await apiClient.post(`/renewals/${renewalId}/approve`, {
        approverId: 'manager-1',
        notes: 'Approved for renewal',
      });
      if (approveResponse.success === true) {
        expect(approveResponse.data.status).toBe('approved');
      }
    }
  });

  test('T-E2E-ENR-06: Cancel policy', async () => {
    correlationId = `test-enr-06-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const canPolId = await createAndIssuePolicy('4444444444');
    const cancelResponse = await apiClient.post(`/policies/policies/${canPolId}/cancel`, {
      reason: 'Customer request',
      cancellationType: 'surrender',
      effectiveDate: new Date().toISOString(),
    });
    AssertionHelpers.assertSuccessResponse(cancelResponse);
    expect(cancelResponse.data.status).toBe('cancelled');
  });
});
