import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createGatewayClient } from '../helpers/api-client';
import { JwtFactory } from '../helpers/jwt-factory';
import { partyFixtures, quoteFixtures, claimFixtures } from '../fixtures/party.fixture';
import { DbHelper } from '../helpers/db-helper';
import { DockerComposeHelper } from '../helpers/docker-compose';
import { AssertionHelpers } from '../helpers/assertions';
import { createExecutedPaymentForPolicy } from '../helpers/payment-helper';

/**
 * E2E tests for P5 Claims Advocacy workflows.
 *
 * Scenario 1: Customer registers claim → broker opens advocacy case →
 *   submit to carrier → adjuster referral → adjuster report →
 *   carrier approves → payment to customer.
 *
 * Scenario 2: Claim rejected → appeal → escalation.
 */
describe('E2E: P5 Claims Advocacy Flow', () => {
  const tenantId = 'test-tenant';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createGatewayClient(adminToken);
  apiClient.setTenantId(tenantId);

  let partyId: string;
  let policyId: string;
  let claimId: string;
  let caseId: string;
  let referralId: string;
  let correlationId: string;

  const brokerOrgId = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
  const carrierOrgId = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
  const adjusterOrgId = 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';

  beforeAll(async () => {
    await DockerComposeHelper.waitForHealth('api-gateway', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('party-kyc-service', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('policy-service', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('claims-service', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('payments-service', { timeoutMs: 60000 });

    await DbHelper.truncateTable('public', 'parties');
    await DbHelper.truncateTable('public', 'claims');
    await DbHelper.truncateTable('public', 'claim_advocacy_cases');
    await DbHelper.truncateTable('public', 'advocacy_tasks');
    await DbHelper.truncateTable('public', 'adjuster_referrals');
    await DbHelper.truncateTable('public', 'claim_projections');
    await DbHelper.truncateTable('public', 'claim_documents');
    await DbHelper.truncateTable('public', 'recovery_cases');

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
      uniqueCode: 'SANHAB-P5-ADV-001',
    });
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('T-E2E-P5-01: Register claim with federation fields', async () => {
    correlationId = `test-p5-e2e-01-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const claimResponse = await apiClient.post('/claims/claims', {
      ...claimFixtures.basic,
      policyId,
      claimantPartyId: partyId,
      tenantId,
      brokerOrganizationId: brokerOrgId,
      carrierOrganizationId: carrierOrgId,
    });
    AssertionHelpers.assertSuccessResponse(claimResponse);
    claimId = claimResponse.data.claimId;
    expect(claimResponse.data.status).toBe('registered');
  });

  test('T-E2E-P5-02: Acknowledge and submit to carrier', async () => {
    correlationId = `test-p5-e2e-02-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const ackResponse = await apiClient.post(`/claims/claims/${claimId}/acknowledge`);
    AssertionHelpers.assertSuccessResponse(ackResponse);

    const submitResponse = await apiClient.post(`/claims/claims/${claimId}/submit-to-carrier`, {
      externalClaimId: 'EXT-E2E-P5-001',
    });
    AssertionHelpers.assertSuccessResponse(submitResponse);
  });

  test('T-E2E-P5-03: Open advocacy case for claim', async () => {
    correlationId = `test-p5-e2e-03-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post(`/claims/claims/${claimId}/advocacy-cases`, {
      brokerOrganizationId: brokerOrgId,
      customerPartyId: partyId,
      carrierOrganizationId: carrierOrgId,
      priority: 'high',
    });
    AssertionHelpers.assertSuccessResponse(response);
    expect(response.data.status).toBe('open');
    caseId = response.data.caseId;
  });

  test('T-E2E-P5-04: Create advocacy task and add communication', async () => {
    correlationId = `test-p5-e2e-04-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const taskResponse = await apiClient.post(`/claims/advocacy-cases/${caseId}/tasks`, {
      taskType: 'follow_up',
      assignedToPartyId: partyId,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    AssertionHelpers.assertSuccessResponse(taskResponse);

    const commResponse = await apiClient.post(`/claims/advocacy-cases/${caseId}/communications`, {
      channel: 'email',
      direction: 'outbound',
      contentRef: 's3://communications/e2e-msg-001',
      partyId: partyId,
      subject: 'Claim submitted to carrier',
      summary: 'Claim has been submitted to carrier for review',
      isPii: false,
    });
    AssertionHelpers.assertSuccessResponse(commResponse);
  });

  test('T-E2E-P5-05: Refer to loss adjuster', async () => {
    correlationId = `test-p5-e2e-05-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const referResponse = await apiClient.post(`/claims/claims/${claimId}/adjuster-referrals`, {
      caseId,
      adjusterOrganizationId: adjusterOrgId,
      adjusterPartyId: partyId,
      estimatedFeeAmount: 5000000,
      estimatedFeeCurrency: 'IRR',
    });
    AssertionHelpers.assertSuccessResponse(referResponse);
    expect(referResponse.data.status).toBe('pending');
    referralId = referResponse.data.referralId;
  });

  test('T-E2E-P5-06: Adjuster accepts and submits report', async () => {
    correlationId = `test-p5-e2e-06-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const acceptResponse = await apiClient.post(`/claims/adjuster-referrals/${referralId}/accept`);
    AssertionHelpers.assertSuccessResponse(acceptResponse);
    expect(acceptResponse.data.status).toBe('accepted');

    const reportResponse = await apiClient.post(`/claims/adjuster-referrals/${referralId}/submit-report`, {
      reportRef: 's3://reports/e2e-adjuster-001.pdf',
      reportChecksum: 'sha256:e2eabcdef123456',
      reportMetadata: { pages: 8, summary: 'Damage assessed at 75M IRR' },
    });
    AssertionHelpers.assertSuccessResponse(reportResponse);
  });

  test('T-E2E-P5-07: Assess and approve claim', async () => {
    correlationId = `test-p5-e2e-07-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const assessResponse = await apiClient.post(`/claims/claims/${claimId}/assess`, {
      assessedAmount: 80000000,
      assessorId: 'assessor-1',
      notes: 'Based on adjuster report',
    });
    AssertionHelpers.assertSuccessResponse(assessResponse);

    const approveResponse = await apiClient.post(`/claims/claims/${claimId}/approve`, {
      approvedAmount: 75000000,
      approverId: 'approver-1',
    });
    AssertionHelpers.assertSuccessResponse(approveResponse);
    expect(approveResponse.data.status).toBe('approved');
  });

  test('T-E2E-P5-08: Pay claim and close', async () => {
    correlationId = `test-p5-e2e-08-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const payResponse = await apiClient.post(`/claims/claims/${claimId}/pay`, {
      paidAmount: 75000000,
      paymentMethod: 'bank_transfer',
    });
    AssertionHelpers.assertSuccessResponse(payResponse);
    expect(payResponse.data.status).toBe('paid');

    const closeResponse = await apiClient.post(`/claims/claims/${claimId}/close`, {
      reason: 'Payment completed, case resolved',
    });
    AssertionHelpers.assertSuccessResponse(closeResponse);
    expect(closeResponse.data.status).toBe('closed');
  });

  test('T-E2E-P5-09: Close advocacy case', async () => {
    correlationId = `test-p5-e2e-09-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post(`/claims/advocacy-cases/${caseId}/close`, {
      closureNote: 'Claim approved and paid. Case closed.',
    });
    AssertionHelpers.assertSuccessResponse(response);
  });

  test('T-E2E-P5-10: Claim rejected → appeal → escalation', async () => {
    correlationId = `test-p5-e2e-10-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const claimResponse = await apiClient.post('/claims/claims', {
      ...claimFixtures.basic,
      policyId,
      claimantPartyId: partyId,
      tenantId,
      brokerOrganizationId: brokerOrgId,
      carrierOrganizationId: carrierOrgId,
    });
    const rejectedClaimId = claimResponse.data.claimId;

    await apiClient.post(`/claims/claims/${rejectedClaimId}/assess`, {
      assessedAmount: 60000000,
      assessorId: 'assessor-2',
    });

    const rejectResponse = await apiClient.post(`/claims/claims/${rejectedClaimId}/reject`, {
      reason: 'Policy does not cover this type of damage',
      rejectorId: 'approver-2',
    });
    AssertionHelpers.assertSuccessResponse(rejectResponse);
    expect(rejectResponse.data.status).toBe('rejected');

    const appealResponse = await apiClient.post(`/claims/claims/${rejectedClaimId}/appeal`, {
      reason: 'Additional evidence: expert witness statement attached',
    });
    AssertionHelpers.assertSuccessResponse(appealResponse);

    const caseResponse = await apiClient.post(`/claims/claims/${rejectedClaimId}/advocacy-cases`, {
      brokerOrganizationId: brokerOrgId,
      customerPartyId: partyId,
      carrierOrganizationId: carrierOrgId,
      priority: 'urgent',
    });
    const appealCaseId = caseResponse.data.caseId;

    const escalateResponse = await apiClient.post(`/claims/advocacy-cases/${appealCaseId}/escalate`, {
      reason: 'Customer appealing rejection — requires senior review',
    });
    AssertionHelpers.assertSuccessResponse(escalateResponse);
  });

  test('T-E2E-P5-11: Claim projection received from carrier', async () => {
    correlationId = `test-p5-e2e-11-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const projectionResponse = await apiClient.post(`/claims/claims/${claimId}/projections`, {
      brokerOrganizationId: brokerOrgId,
      carrierOrganizationId: carrierOrgId,
      externalClaimId: 'EXT-E2E-P5-001',
      sourceSystemId: 'carrier-system-a',
      sourceVersion: 1,
      payload: {
        status: 'closed',
        paidAmount: 75000000,
        closedAt: new Date().toISOString(),
      },
    });
    AssertionHelpers.assertSuccessResponse(projectionResponse);

    const listResponse = await apiClient.get(`/claims/claims/${claimId}/projections`);
    AssertionHelpers.assertSuccessResponse(listResponse);
    expect(listResponse.data.rows.length).toBeGreaterThan(0);
  });

  test('T-E2E-P5-12: Document upload and retrieval', async () => {
    correlationId = `test-p5-e2e-12-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const uploadResponse = await apiClient.post(`/claims/claims/${claimId}/documents`, {
      documentId: 'doc-e2e-p5-001',
      documentType: 'police_report',
      uploadedByPartyId: partyId,
      storageRef: 's3://claims-e2e/doc-001.pdf',
      checksum: 'sha256:e2edoc123456',
      fileName: 'police_report.pdf',
      fileSize: 204800,
      mimeType: 'application/pdf',
      classification: 'INTERNAL',
    });
    AssertionHelpers.assertSuccessResponse(uploadResponse);

    const listResponse = await apiClient.get(`/claims/claims/${claimId}/documents`);
    AssertionHelpers.assertSuccessResponse(listResponse);
    expect(listResponse.data.rows.length).toBeGreaterThan(0);
  });

  test('T-E2E-P5-13: Recovery case for subrogation', async () => {
    correlationId = `test-p5-e2e-13-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const recoveryResponse = await apiClient.post(`/claims/claims/${claimId}/recovery`, {
      responsiblePartyId: partyId,
      expectedRecoveryAmount: 15000000,
      expectedRecoveryCurrency: 'IRR',
    });
    AssertionHelpers.assertSuccessResponse(recoveryResponse);
    expect(recoveryResponse.data.status).toBe('open');
  });
});
