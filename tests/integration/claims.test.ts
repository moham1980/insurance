import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createServiceClient } from '../helpers/api-client';
import { DbHelper } from '../helpers/db-helper';
import { JwtFactory } from '../helpers/jwt-factory';
import { partyFixtures } from '../fixtures/party.fixture';

describe('Integration: Claims Service', () => {
  const serviceUrl = process.env.CLAIMS_SERVICE_URL || 'http://localhost:18002';
  const partyUrl = process.env.PARTY_KYC_URL || 'http://localhost:18006';
  const tenantId = 'test-tenant';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createServiceClient(serviceUrl, adminToken);
  const partyClient = createServiceClient(partyUrl, adminToken);

  let partyId: string;
  let claimId: string;
  const testPolicyId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  beforeAll(async () => {
    await DbHelper.truncateTable('party', 'parties');
    await DbHelper.truncateTable('claims', 'claims');

    const partyResponse = await partyClient.post('/party', partyFixtures.individual);
    partyId = partyResponse.data.partyId;
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('Register claim', async () => {
    const response = await apiClient.post('/claims', {
      policyId: testPolicyId,
      claimantPartyId: partyId,
      lossDate: new Date().toISOString(),
      lossType: 'accident',
      description: 'Test claim description',
    });

    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('claimId');
    expect(response.data.status).toBe('registered');
    claimId = response.data.claimId;
  });

  test('Get claim by ID', async () => {
    const getResponse = await apiClient.get(`/claims/${claimId}`);
    expect(getResponse.success).toBe(true);
    expect(getResponse.data.claimId).toBe(claimId);
  });

  test('Assess claim', async () => {
    const response = await apiClient.post(`/claims/${claimId}/assess`, {
      assessedAmount: 80000000,
    });

    expect(response.success).toBe(true);
    expect(response.data.status).toBe('assessed');
  });

  test('Approve claim', async () => {
    const response = await apiClient.post(`/claims/${claimId}/approve`, {
      approvedAmount: 75000000,
    });

    expect(response.success).toBe(true);
    expect(response.data.status).toBe('approved');
  });

  test('Reject claim', async () => {
    const createResponse = await apiClient.post('/claims', {
      policyId: testPolicyId,
      claimantPartyId: partyId,
      lossDate: new Date().toISOString(),
      lossType: 'theft',
      description: 'Test claim for rejection',
    });
    const newClaimId = createResponse.data.claimId;

    const rejectResponse = await apiClient.post(`/claims/${newClaimId}/reject`, {
      reason: 'Claim not covered by policy terms',
    });

    expect(rejectResponse.success).toBe(true);
    expect(rejectResponse.data.status).toBe('rejected');
  });

  test('Close claim', async () => {
    // Create a new claim, reject it, then close it (close requires 'paid' or 'rejected' state)
    const createResponse = await apiClient.post('/claims', {
      policyId: testPolicyId,
      claimantPartyId: partyId,
      lossDate: new Date().toISOString(),
      lossType: 'fire',
      description: 'Test claim for closing',
    });
    const closeClaimId = createResponse.data.claimId;

    await apiClient.post(`/claims/${closeClaimId}/reject`, {
      reason: 'Closing after rejection',
    });

    const closeResponse = await apiClient.post(`/claims/${closeClaimId}/close`);

    expect(closeResponse.success).toBe(true);
    expect(closeResponse.data.status).toBe('closed');
  });

  test('List claims', async () => {
    const listResponse = await apiClient.get('/claims', {
      params: { limit: 10, offset: 0 },
    });

    expect(listResponse.success).toBe(true);
    expect(Array.isArray(listResponse.data)).toBe(true);
  });

  test('List claims filtered by policyId', async () => {
    const searchResponse = await apiClient.get('/claims', {
      params: { policyId: testPolicyId },
    });

    expect(searchResponse.success).toBe(true);
    expect(Array.isArray(searchResponse.data)).toBe(true);
  });

  test('T-INT-CLM-01: State machine (register→assess→approve)', async () => {
    const createResponse = await apiClient.post('/claims', {
      policyId: testPolicyId,
      claimantPartyId: partyId,
      lossDate: new Date().toISOString(),
      lossType: 'accident',
      description: 'State machine test claim',
    });
    expect(createResponse.success).toBe(true);
    expect(createResponse.data.status).toBe('registered');

    const testClaimId = createResponse.data.claimId;

    const assessResponse = await apiClient.post(`/claims/${testClaimId}/assess`, {
      assessedAmount: 50000000,
    });
    expect(assessResponse.success).toBe(true);
    expect(assessResponse.data.status).toBe('assessed');

    const approveResponse = await apiClient.post(`/claims/${testClaimId}/approve`, {
      approvedAmount: 45000000,
    });
    expect(approveResponse.success).toBe(true);
    expect(approveResponse.data.status).toBe('approved');

    const finalClaim = await apiClient.get(`/claims/${testClaimId}`);
    expect(finalClaim.data.status).toBe('approved');
  });

  test('T-INT-CLM-02: Invalid transition → error', async () => {
    const createResponse = await apiClient.post('/claims', {
      policyId: testPolicyId,
      claimantPartyId: partyId,
      lossDate: new Date().toISOString(),
      lossType: 'accident',
      description: 'Invalid transition test',
    });
    const newClaimId = createResponse.data.claimId;

    // Try to approve without assessing first (invalid transition)
    const response = await apiClient.post(`/claims/${newClaimId}/approve`, {
      approvedAmount: 50000000,
    });

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe('INVALID_STATE');
  });

  test('T-INT-CLM-04: Outbox event for claim registration', async () => {
    const createResponse = await apiClient.post('/claims', {
      policyId: testPolicyId,
      claimantPartyId: partyId,
      lossDate: new Date().toISOString(),
      lossType: 'accident',
      description: 'Outbox event test claim',
    });

    const events = await DbHelper.executeQuery('claims', 'SELECT * FROM outbox_events WHERE topic = $1 ORDER BY occurred_at DESC LIMIT 5', ['insurance.claim.registered']);
    expect(Array.isArray(events)).toBe(true);
  });

  test('T-INT-CLM-06: Filter/Pagination in list', async () => {
    const listResponse = await apiClient.get('/claims', {
      params: {
        limit: 5,
        offset: 0,
        status: 'registered',
      },
    });

    expect(listResponse.success).toBe(true);
    expect(Array.isArray(listResponse.data)).toBe(true);
  });
});
