import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createServiceClient } from '../helpers/api-client';
import { DbHelper } from '../helpers/db-helper';
import { JwtFactory } from '../helpers/jwt-factory';

/**
 * Integration tests for P5 Claims Advocacy workflows.
 * Tests the full lifecycle: claim registration → advocacy case → tasks →
 * adjuster referral → projection → document → recovery.
 */
describe('Integration: P5 Claims Advocacy', () => {
  const serviceUrl = process.env.CLAIMS_SERVICE_URL || 'http://localhost:18002';
  const tenantId = 'test-tenant';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createServiceClient(serviceUrl, adminToken);
  apiClient.setTenantId(tenantId);

  let claimId: string;
  let caseId: string;
  let taskId: string;
  let referralId: string;
  let projectionId: string;
  let documentId: string;
  let recoveryId: string;
  let correlationId: string;

  const testPolicyId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const testPartyId = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  const brokerOrgId = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
  const carrierOrgId = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
  const adjusterOrgId = 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';

  beforeAll(async () => {
    await DbHelper.truncateTable('claims', 'claims');
    await DbHelper.truncateTable('claims', 'claim_advocacy_cases');
    await DbHelper.truncateTable('claims', 'advocacy_tasks');
    await DbHelper.truncateTable('claims', 'advocacy_communications');
    await DbHelper.truncateTable('claims', 'adjuster_referrals');
    await DbHelper.truncateTable('claims', 'claim_projections');
    await DbHelper.truncateTable('claims', 'claim_documents');
    await DbHelper.truncateTable('claims', 'recovery_cases');
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('T-INT-P5-01: Register claim with federation fields', async () => {
    const response = await apiClient.post('/claims', {
      policyId: testPolicyId,
      claimantPartyId: testPartyId,
      lossDate: new Date().toISOString(),
      lossType: 'accident',
      description: 'P5 integration test claim',
      brokerOrganizationId: brokerOrgId,
      carrierOrganizationId: carrierOrgId,
    });

    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('claimId');
    expect(response.data.status).toBe('registered');
    expect(response.data.brokerOrganizationId).toBe(brokerOrgId);
    expect(response.data.carrierOrganizationId).toBe(carrierOrgId);
    claimId = response.data.claimId;
  });

  test('T-INT-P5-02: Acknowledge claim', async () => {
    const response = await apiClient.post(`/claims/${claimId}/acknowledge`);
    expect(response.success).toBe(true);
    expect(response.data.status).toBe('acknowledged');
  });

  test('T-INT-P5-03: Submit claim to carrier', async () => {
    const response = await apiClient.post(`/claims/${claimId}/submit-to-carrier`, {
      externalClaimId: 'EXT-CLM-P5-001',
    });
    expect(response.success).toBe(true);
  });

  test('T-INT-P5-04: Open advocacy case', async () => {
    const response = await apiClient.post(`/claims/${claimId}/advocacy-cases`, {
      brokerOrganizationId: brokerOrgId,
      customerPartyId: testPartyId,
      carrierOrganizationId: carrierOrgId,
      priority: 'high',
    });

    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('caseId');
    expect(response.data.status).toBe('open');
    expect(response.data.priority).toBe('high');
    caseId = response.data.caseId;
  });

  test('T-INT-P5-05: List advocacy cases', async () => {
    const response = await apiClient.get('/advocacy-cases', {
      params: { limit: 10, offset: 0 },
    });

    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('rows');
    expect(response.data.rows.length).toBeGreaterThan(0);
  });

  test('T-INT-P5-06: Get advocacy case by ID', async () => {
    const response = await apiClient.get(`/advocacy-cases/${caseId}`);
    expect(response.success).toBe(true);
    expect(response.data.caseId).toBe(caseId);
  });

  test('T-INT-P5-07: Create advocacy task', async () => {
    const response = await apiClient.post(`/advocacy-cases/${caseId}/tasks`, {
      taskType: 'follow_up',
      assignedToPartyId: testPartyId,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    });

    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('taskId');
    expect(response.data.status).toBe('pending');
    taskId = response.data.taskId;
  });

  test('T-INT-P5-08: Update advocacy task', async () => {
    const response = await apiClient.patch(`/advocacy-cases/${caseId}/tasks/${taskId}`, {
      status: 'completed',
      outcome: 'Follow-up completed successfully',
    });

    expect(response.success).toBe(true);
    expect(response.data.status).toBe('completed');
  });

  test('T-INT-P5-09: Add advocacy communication', async () => {
    const response = await apiClient.post(`/advocacy-cases/${caseId}/communications`, {
      channel: 'email',
      direction: 'outbound',
      contentRef: 's3://communications/test-msg-001',
      partyId: testPartyId,
      subject: 'Claim follow-up',
      summary: 'Sent documents to carrier',
      isPii: false,
    });

    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('communicationId');
  });

  test('T-INT-P5-10: Escalate advocacy case', async () => {
    const response = await apiClient.post(`/advocacy-cases/${caseId}/escalate`, {
      reason: 'Carrier not responding within SLA',
    });

    expect(response.success).toBe(true);
  });

  test('T-INT-P5-11: Create adjuster referral', async () => {
    const response = await apiClient.post(`/claims/${claimId}/adjuster-referrals`, {
      caseId,
      adjusterOrganizationId: adjusterOrgId,
      adjusterPartyId: testPartyId,
      estimatedFeeAmount: 5000000,
      estimatedFeeCurrency: 'IRR',
    });

    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('referralId');
    expect(response.data.status).toBe('pending');
    referralId = response.data.referralId;
  });

  test('T-INT-P5-12: List adjuster referrals', async () => {
    const response = await apiClient.get(`/claims/${claimId}/adjuster-referrals`, {
      params: { limit: 10, offset: 0 },
    });

    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('rows');
    expect(response.data.rows.length).toBeGreaterThan(0);
    expect(response.data.rows[0].referralId).toBe(referralId);
  });

  test('T-INT-P5-13: Accept adjuster referral', async () => {
    const response = await apiClient.post(`/adjuster-referrals/${referralId}/accept`);
    expect(response.success).toBe(true);
    expect(response.data.status).toBe('accepted');
  });

  test('T-INT-P5-14: Submit adjuster report', async () => {
    const response = await apiClient.post(`/adjuster-referrals/${referralId}/submit-report`, {
      reportRef: 's3://reports/adjuster-report-001.pdf',
      reportChecksum: 'sha256:abcdef1234567890',
      reportMetadata: { pages: 12, summary: 'Damage assessed at 40M IRR' },
    });

    expect(response.success).toBe(true);
    expect(response.data.status).toBe('report_received');
  });

  test('T-INT-P5-15: Add claim projection', async () => {
    const response = await apiClient.post(`/claims/${claimId}/projections`, {
      brokerOrganizationId: brokerOrgId,
      carrierOrganizationId: carrierOrgId,
      externalClaimId: 'EXT-CLM-P5-001',
      sourceSystemId: 'carrier-portal-a',
      sourceVersion: 1,
      payload: { status: 'acknowledged', assessedAmount: 40000000 },
    });

    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('projectionId');
    expect(response.data.status).toBe('active');
    projectionId = response.data.projectionId;
  });

  test('T-INT-P5-16: List claim projections', async () => {
    const response = await apiClient.get(`/claims/${claimId}/projections`, {
      params: { limit: 10, offset: 0 },
    });

    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('rows');
    expect(response.data.rows.length).toBeGreaterThan(0);
  });

  test('T-INT-P5-17: Add newer projection supersedes old', async () => {
    const response = await apiClient.post(`/claims/${claimId}/projections`, {
      brokerOrganizationId: brokerOrgId,
      carrierOrganizationId: carrierOrgId,
      externalClaimId: 'EXT-CLM-P5-001',
      sourceSystemId: 'carrier-portal-a',
      sourceVersion: 2,
      payload: { status: 'approved', approvedAmount: 35000000 },
    });

    expect(response.success).toBe(true);
    expect(response.data.status).toBe('active');

    const listResponse = await apiClient.get(`/claims/${claimId}/projections`, {
      params: { limit: 10 },
    });

    const activeProjections = listResponse.data.rows.filter((p: any) => p.status === 'active');
    expect(activeProjections.length).toBe(1);
    expect(activeProjections[0].sourceVersion).toBe(2);
  });

  test('T-INT-P5-18: Attach claim document', async () => {
    const response = await apiClient.post(`/claims/${claimId}/documents`, {
      documentId: 'doc-p5-001',
      documentType: 'police_report',
      uploadedByPartyId: testPartyId,
      storageRef: 's3://claims/doc-p5-001.pdf',
      checksum: 'sha256:doc1234567890',
      fileName: 'police_report.pdf',
      fileSize: 102400,
      mimeType: 'application/pdf',
      classification: 'INTERNAL',
    });

    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('documentId');
    documentId = response.data.documentId;
  });

  test('T-INT-P5-19: List claim documents', async () => {
    const response = await apiClient.get(`/claims/${claimId}/documents`);
    expect(response.success).toBe(true);
    expect(response.data.rows.length).toBeGreaterThan(0);
  });

  test('T-INT-P5-20: Create recovery case', async () => {
    const response = await apiClient.post(`/claims/${claimId}/recovery`, {
      responsiblePartyId: testPartyId,
      expectedRecoveryAmount: 10000000,
      expectedRecoveryCurrency: 'IRR',
    });

    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('recoveryId');
    expect(response.data.status).toBe('open');
    recoveryId = response.data.recoveryId;
  });

  test('T-INT-P5-21: Close advocacy case', async () => {
    const response = await apiClient.post(`/advocacy-cases/${caseId}/close`, {
      closureNote: 'Case resolved after carrier approved claim',
    });

    expect(response.success).toBe(true);
  });

  test('T-INT-P5-22: Outbox events for advocacy operations', async () => {
    const events = await DbHelper.executeQuery(
      'claims',
      'SELECT * FROM outbox_events WHERE topic LIKE $1 ORDER BY occurred_at DESC LIMIT 10',
      ['insurance.claim.advocacy%'],
    );
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
  });

  test('T-INT-P5-23: Claim status updated event published', async () => {
    const events = await DbHelper.executeQuery(
      'claims',
      'SELECT * FROM outbox_events WHERE topic = $1 ORDER BY occurred_at DESC LIMIT 5',
      ['insurance.claim.status_updated'],
    );
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
  });

  test('T-INT-P5-24: Assess and approve claim for payment', async () => {
    correlationId = `test-p5-int-24-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const assessResponse = await apiClient.post(`/claims/${claimId}/assess`, {
      assessedAmount: 35000000,
      assessedCurrency: 'IRR',
    });
    expect(assessResponse.success).toBe(true);

    const approveResponse = await apiClient.post(`/claims/${claimId}/approve`, {
      approvedAmount: 35000000,
      approvedCurrency: 'IRR',
    });
    expect(approveResponse.success).toBe(true);
    expect(approveResponse.data.status).toBe('approved');
  });

  test('T-INT-P5-25: Pay claim through payment-service', async () => {
    correlationId = `test-p5-int-25-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const payResponse = await apiClient.post(`/claims/${claimId}/pay`, {
      paidAmount: 35000000,
    });
    expect(payResponse.success).toBe(true);
    expect(payResponse.data.status).toBe('paid');
    expect(payResponse.data.paidAmount).toBe(35000000);
  });

  test('T-INT-P5-26: Claim paid event published to outbox', async () => {
    const events = await DbHelper.executeQuery(
      'claims',
      'SELECT * FROM outbox_events WHERE topic = $1 ORDER BY occurred_at DESC LIMIT 5',
      ['insurance.claim.paid'],
    );
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
  });

  test('T-INT-P5-27: Broker visibility — only sees own organization claims', async () => {
    const brokerToken = JwtFactory.createTokenWithRole(tenantId, 'broker', brokerOrgId);
    const brokerClient = createServiceClient(serviceUrl, brokerToken);
    brokerClient.setTenantId(tenantId);

    const response = await brokerClient.get('/claims', {
      params: { limit: 50, offset: 0 },
    });
    expect(response.success).toBe(true);
    for (const claim of response.data) {
      const belongsToOrg =
        claim.brokerOrganizationId === brokerOrgId ||
        claim.carrierOrganizationId === brokerOrgId ||
        claim.recordOwnerOrganizationId === brokerOrgId;
      expect(belongsToOrg).toBe(true);
    }
  });

  test('T-INT-P5-28: Carrier visibility — only sees own organization claims', async () => {
    const carrierToken = JwtFactory.createTokenWithRole(tenantId, 'carrier_agent', carrierOrgId);
    const carrierClient = createServiceClient(serviceUrl, carrierToken);
    carrierClient.setTenantId(tenantId);

    const response = await carrierClient.get('/claims', {
      params: { limit: 50, offset: 0 },
    });
    expect(response.success).toBe(true);
    for (const claim of response.data) {
      const belongsToOrg =
        claim.brokerOrganizationId === carrierOrgId ||
        claim.carrierOrganizationId === carrierOrgId ||
        claim.recordOwnerOrganizationId === carrierOrgId;
      expect(belongsToOrg).toBe(true);
    }
  });
});
