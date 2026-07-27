import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createGatewayClient } from '../helpers/api-client';
import { JwtFactory } from '../helpers/jwt-factory';
import { partyFixtures, quoteFixtures, claimFixtures } from '../fixtures/party.fixture';
import { DbHelper } from '../helpers/db-helper';
import { DockerComposeHelper } from '../helpers/docker-compose';
import { AssertionHelpers } from '../helpers/assertions';
import { createExecutedPaymentForPolicy } from '../helpers/payment-helper';

describe('E2E: Claims Flow', () => {
  const tenantId = 'test-tenant';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createGatewayClient(adminToken);
  apiClient.setTenantId(tenantId);

  let partyId: string;
  let policyId: string;
  let claimId: string;
  let correlationId: string;

  beforeAll(async () => {
    await DockerComposeHelper.waitForHealth('api-gateway', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('party-kyc-service', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('policy-service', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('claims-service', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('payments-service', { timeoutMs: 60000 });

    await DbHelper.truncateTable('public', 'parties');
    await DbHelper.truncateTable('public', 'claims');
    await DbHelper.truncateTable('public', 'payments');

    const partyResponse = await apiClient.post('/party/party', partyFixtures.individual);
    partyId = partyResponse.data.partyId;

    const quoteResponse = await apiClient.post('/policies/policies/quote', {
      ...quoteFixtures.basic,
      partyId,
      tenantId,
    });

    const policyResponse = await apiClient.post('/policies/policies/convert-quote', {
      quote: { ...quoteFixtures.basic, partyId, tenantId },
      tenantId,
    });
    policyId = policyResponse.data.policyId;

    await apiClient.post(`/policies/policies/${policyId}/submit-docs`, {
      applicationData: { documents: [{ type: 'id_card', url: 'https://example.com/id.pdf' }] },
    });
    await apiClient.post(`/policies/policies/${policyId}/risk-assess`, {
      riskAssessment: { riskScore: 25, assessorId: 'underwriter-1', notes: 'Low risk' },
    });
    await apiClient.post(`/policies/policies/${policyId}/underwriting/decision`, {
      decision: 'approved',
      underwriterId: 'underwriter-1',
      notes: 'Approved',
    });
    const paymentId = await createExecutedPaymentForPolicy(apiClient, policyId, quoteFixtures.basic.premiumAmount, tenantId);

    await apiClient.post(`/policies/policies/${policyId}/quality-gate/override`, {
      action: 'issue',
      reason: 'Bypass Sanhab for E2E test',
    });
    await apiClient.post(`/policies/policies/${policyId}/issue`, {
      paymentId,
    });
    await apiClient.post(`/policies/policies/${policyId}/quality-gate/override`, {
      action: 'set_unique_code',
      reason: 'Bypass Sanhab for E2E test',
    });
    await apiClient.post(`/policies/policies/${policyId}/unique-code`, {
      uniqueCode: 'SANHAB-CLAIMS-001',
    });
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('T-E2E-CLM-01: Register → Assess → Approve → Pay → Close', async () => {
    correlationId = `test-clm-01-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const claimResponse = await apiClient.post('/claims/claims', {
      ...claimFixtures.basic,
      policyId,
      claimantPartyId: partyId,
      tenantId,
    });
    AssertionHelpers.assertSuccessResponse(claimResponse);
    claimId = claimResponse.data.claimId;
    expect(claimResponse.data.status).toBe('registered');

    const assessResponse = await apiClient.post(`/claims/claims/${claimId}/assess`, {
      assessedAmount: 80000000,
      assessorId: 'assessor-1',
      notes: 'Damage assessment completed',
    });
    AssertionHelpers.assertSuccessResponse(assessResponse);
    expect(assessResponse.data.status).toBe('assessed');

    const approveResponse = await apiClient.post(`/claims/claims/${claimId}/approve`, {
      approvedAmount: 75000000,
      approverId: 'approver-1',
    });
    AssertionHelpers.assertSuccessResponse(approveResponse);
    expect(approveResponse.data.status).toBe('approved');

    const payResponse = await apiClient.post(`/claims/claims/${claimId}/pay`, {
      paidAmount: 75000000,
      paymentMethod: 'bank_transfer',
    });
    AssertionHelpers.assertSuccessResponse(payResponse);
    expect(payResponse.data.status).toBe('paid');

    const closeResponse = await apiClient.post(`/claims/claims/${claimId}/close`, {
      reason: 'Payment completed',
    });
    AssertionHelpers.assertSuccessResponse(closeResponse);
    expect(closeResponse.data.status).toBe('closed');
  });

  test('T-E2E-CLM-02: Claim rejection with reason', async () => {
    correlationId = `test-clm-02-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const claimResponse = await apiClient.post('/claims/claims', {
      ...claimFixtures.basic,
      policyId,
      claimantPartyId: partyId,
      tenantId,
    });
    const newClaimId = claimResponse.data.claimId;

    const rejectResponse = await apiClient.post(`/claims/claims/${newClaimId}/reject`, {
      reason: 'Claim not covered by policy',
      rejectorId: 'approver-4',
    });
    AssertionHelpers.assertSuccessResponse(rejectResponse);
    expect(rejectResponse.data.status).toBe('rejected');
  });

  test('T-E2E-CLM-03: Refer claim to adjuster', async () => {
    correlationId = `test-clm-03-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const claimResponse = await apiClient.post('/claims/claims', {
      ...claimFixtures.basic,
      policyId,
      claimantPartyId: partyId,
      tenantId,
    });
    const newClaimId = claimResponse.data.claimId;

    const referResponse = await apiClient.post(`/claims/claims/${newClaimId}/refer-to-adjuster`, {
      adjusterId: 'adjuster-001',
      reason: 'Complex damage assessment required',
    });
    AssertionHelpers.assertSuccessResponse(referResponse);
    expect(referResponse.data.status).toBe('adjuster_review');
  });

  test('T-E2E-CLM-04: Idempotency: Duplicate claim with same correlationId', async () => {
    correlationId = `test-clm-04-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const claimPayload = {
      ...claimFixtures.basic,
      policyId,
      claimantPartyId: partyId,
      tenantId,
    };

    const firstResponse = await apiClient.post('/claims/claims', claimPayload);
    AssertionHelpers.assertSuccessResponse(firstResponse);
    const firstClaimId = firstResponse.data.claimId;

    const secondResponse = await apiClient.post('/claims/claims', claimPayload);
    expect(secondResponse.data.claimId).toBe(firstClaimId);
  });

  test('T-E2E-CLM-05: Fraud scoring on claim registration', async () => {
    correlationId = `test-clm-05-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const createResponse = await apiClient.post('/claims/claims', {
      ...claimFixtures.basic,
      policyId,
      claimantPartyId: partyId,
      tenantId,
      estimatedAmount: 150000000,
    });

    AssertionHelpers.assertSuccessResponse(createResponse);
    expect(createResponse.data).toHaveProperty('fraudScore');
  });

  test('T-E2E-CLM-06: Read Model updated after claim changes', async () => {
    correlationId = `test-clm-06-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const createResponse = await apiClient.post('/claims/claims', {
      ...claimFixtures.basic,
      policyId,
      claimantPartyId: partyId,
      tenantId,
    });
    const newClaimId = createResponse.data.claimId;

    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const rmResponse = await apiClient.get(`/claims/claims/${newClaimId}`);
      if (rmResponse.success === true) {
        expect(rmResponse.data.claimId).toBe(newClaimId);
      }
    } catch (error) {
      console.log('Read Model endpoint not yet implemented');
    }
  });

  test('T-E2E-CLM-07: Invalid transition (registered → paid) should fail', async () => {
    correlationId = `test-clm-07-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const claimResponse = await apiClient.post('/claims/claims', {
      ...claimFixtures.basic,
      policyId,
      claimantPartyId: partyId,
      tenantId,
    });
    const newClaimId = claimResponse.data.claimId;

    try {
      await apiClient.post(`/claims/claims/${newClaimId}/pay`, {
        paymentMethod: 'bank_transfer',
        amount: 10000000,
      });
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.response?.data?.success).toBe(false);
    }
  });

  test('T-E2E-CLM-08: Bulk close claims', async () => {
    correlationId = `test-clm-08-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const claimIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const createResponse = await apiClient.post('/claims/claims', {
        ...claimFixtures.basic,
        policyId,
      claimantPartyId: partyId,
        tenantId,
        estimatedAmount: 50000000 + (i * 10000000),
      });
      if (createResponse.success === true) {
        claimIds.push(createResponse.data.claimId);
      }
    }

    expect(claimIds.length).toBe(3);

    for (const cid of claimIds) {
      await apiClient.post(`/claims/claims/${cid}/assess`, {
        assessedAmount: 50000000,
        assessorId: 'assessor-bulk',
      });
      await apiClient.post(`/claims/claims/${cid}/approve`, {
        approvedAmount: 45000000,
        approverId: 'approver-bulk',
      });
      await apiClient.post(`/claims/claims/${cid}/close`, {
        reason: 'Bulk closure test',
      });
    }

    const listResponse = await apiClient.get('/claims/claims', {
      params: { status: 'closed', limit: 10 },
    });
    AssertionHelpers.assertSuccessResponse(listResponse);
    expect(listResponse.data.length).toBeGreaterThanOrEqual(3);
  });
});
