import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createServiceClient } from '../helpers/api-client';
import { DbHelper } from '../helpers/db-helper';
import { JwtFactory } from '../helpers/jwt-factory';
import { v4 as uuidv4 } from 'uuid';

describe('Integration: Underwriting Service', () => {
  const serviceUrl = process.env.UNDERWRITING_SERVICE_URL || 'http://localhost:18032';
  const tenantId = 'test-tenant';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createServiceClient(serviceUrl, adminToken);

  let requestId: string;

  beforeAll(async () => {
    await DbHelper.truncateTable('underwriting', 'underwriting_requests');
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('Create underwriting request', async () => {
    const response = await apiClient.post('/underwriting/requests', {
      policyId: uuidv4(),
      reasonCode: 'policy_stage3_risk_assess',
      input: { riskScore: 0.3 },
    });

    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('underwritingRequestId');
    expect(response.data.status).toBe('pending');
    requestId = response.data.underwritingRequestId;
  });

  test('Get underwriting request by ID', async () => {
    const getResponse = await apiClient.get(`/underwriting/requests/${requestId}`);
    expect(getResponse.success).toBe(true);
    expect(getResponse.data.underwritingRequestId).toBe(requestId);
  });

  test('List underwriting requests', async () => {
    const listResponse = await apiClient.get('/underwriting/requests', {
      params: { limit: 10, offset: 0 },
    });

    expect(listResponse.success).toBe(true);
    expect(Array.isArray(listResponse.data)).toBe(true);
    expect(listResponse.pagination).toBeDefined();
  });

  test('List underwriting requests filtered by status', async () => {
    const listResponse = await apiClient.get('/underwriting/requests', {
      params: { status: 'pending', limit: 10, offset: 0 },
    });

    expect(listResponse.success).toBe(true);
    expect(Array.isArray(listResponse.data)).toBe(true);
  });

  test('T-INT-UW-01: Create/List/Get cycle', async () => {
    const createResponse = await apiClient.post('/underwriting/requests', {
      policyId: uuidv4(),
      reasonCode: 'manual_review',
      input: { notes: 'Standard risk' },
    });
    expect(createResponse.success).toBe(true);
    const newRequestId = createResponse.data.underwritingRequestId;

    const getResponse = await apiClient.get(`/underwriting/requests/${newRequestId}`);
    expect(getResponse.success).toBe(true);
    expect(getResponse.data.underwritingRequestId).toBe(newRequestId);

    const listResponse = await apiClient.get('/underwriting/requests', {
      params: { limit: 50, offset: 0 },
    });
    expect(listResponse.success).toBe(true);
  });

  test('T-INT-UW-02: ALREADY_DECIDED guard', async () => {
    // Create a request, then try to decide twice
    const createResponse = await apiClient.post('/underwriting/requests', {
      policyId: uuidv4(),
      reasonCode: 'manual_review',
    });
    const newRequestId = createResponse.data.underwritingRequestId;

    // First decide - will fail because policy service is not in uw_pending state
    // but the ALREADY_DECIDED guard checks if decision is already set
    // We need to set decision directly via DB to test the guard
    await DbHelper.executeQuery(
      'underwriting',
      'UPDATE underwriting_requests SET decision = $1, decided_by = $2, decided_at = NOW(), status = $3 WHERE underwriting_request_id = $4',
      ['approved', 'underwriter-1', 'approved', newRequestId]
    );

    // Try to decide again - should get ALREADY_DECIDED
    const decideResponse = await apiClient.post(`/underwriting/requests/${newRequestId}/decide`, {
      decision: 'rejected',
      decidedBy: 'underwriter-2',
      notes: 'Second decision attempt',
    });

    expect(decideResponse.success).toBe(false);
    expect(decideResponse.error?.code).toBe('ALREADY_DECIDED');
  });

  test('SLA metrics endpoint', async () => {
    const response = await apiClient.get('/underwriting/sla/metrics');
    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('totalPending');
    expect(response.data).toHaveProperty('overdueCount');
    expect(response.data).toHaveProperty('escalatedCount');
  });

  test('SLA breaches endpoint', async () => {
    const response = await apiClient.get('/underwriting/sla/breaches', {
      params: { hoursOverdue: 48, limit: 10, offset: 0 },
    });

    expect(response.success).toBe(true);
    expect(Array.isArray(response.data)).toBe(true);
  });

  test('Risk matrix endpoint', async () => {
    const response = await apiClient.get('/underwriting/risk-matrix');
    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('matrix');
    expect(response.data).toHaveProperty('levels');
  });

  test('Assess risk for request', async () => {
    const createResponse = await apiClient.post('/underwriting/requests', {
      policyId: uuidv4(),
      reasonCode: 'risk_assessment',
    });
    const newRequestId = createResponse.data.underwritingRequestId;

    const assessResponse = await apiClient.post(`/underwriting/requests/${newRequestId}/assess-risk`, {
      factors: { age: 30, pastClaimsCount: 0, coverageAmount: 100000, premiumAmount: 5000, itemAge: 5, policyType: 'auto' },
    });

    expect(assessResponse.success).toBe(true);
    expect(assessResponse.data).toHaveProperty('riskScore');
    expect(assessResponse.data).toHaveProperty('riskLevel');
    expect(assessResponse.data).toHaveProperty('factors');
    expect(assessResponse.data).toHaveProperty('recommendations');
  });

  test('Escalate overdue review', async () => {
    const createResponse = await apiClient.post('/underwriting/requests', {
      policyId: uuidv4(),
      reasonCode: 'overdue_review',
    });
    const newRequestId = createResponse.data.underwritingRequestId;

    const escalateResponse = await apiClient.post(`/underwriting/requests/${newRequestId}/escalate`, {
      reason: 'SLA breach - overdue review',
    });

    expect(escalateResponse.success).toBe(true);
    expect(escalateResponse.data.status).toBe('escalated');
  });
});
