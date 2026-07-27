import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createServiceClient } from '../helpers/api-client';
import { DbHelper } from '../helpers/db-helper';
import { JwtFactory } from '../helpers/jwt-factory';
import { v4 as uuidv4 } from 'uuid';

describe('Integration: Fraud Service', () => {
  const serviceUrl = process.env.FRAUD_SERVICE_URL || 'http://localhost:18009';
  const tenantId = 'test-tenant';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createServiceClient(serviceUrl, adminToken);

  let fraudCaseId: string;
  let claimId: string;

  beforeAll(async () => {
    await DbHelper.truncateTable('fraud', 'fraud_cases');
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('Compute fraud score', async () => {
    claimId = uuidv4();
    const response = await apiClient.post('/fraud/compute-score', {
      claimId,
      claimNumber: 'CLM-TEST-001',
      lossType: 'AUTO',
      policyId: uuidv4(),
    });

    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('score');
    expect(response.data).toHaveProperty('signals');
    expect(response.data).toHaveProperty('holdClaim');
    expect(response.data).toHaveProperty('threshold');
  });

  test('Open fraud case', async () => {
    const response = await apiClient.post(`/fraud/cases/${claimId}/open`, {
      claimNumber: 'CLM-TEST-001',
      score: 85,
      signals: ['LOSS_TYPE_AUTO', 'POLICY_LINKED'],
      notes: 'Suspicious claim pattern detected',
    });

    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('fraudCaseId');
    expect(response.data.status).toBe('open');
    expect(response.data.holdClaim).toBe(true);
    fraudCaseId = response.data.fraudCaseId;
  });

  test('List fraud cases', async () => {
    const listResponse = await apiClient.get('/fraud/cases', {
      params: { limit: 10, offset: 0 },
    });

    expect(listResponse.success).toBe(true);
    expect(Array.isArray(listResponse.data)).toBe(true);
    expect(listResponse.pagination).toBeDefined();
  });

  test('List fraud cases filtered by status', async () => {
    const listResponse = await apiClient.get('/fraud/cases', {
      params: { status: 'open', limit: 10, offset: 0 },
    });

    expect(listResponse.success).toBe(true);
    expect(Array.isArray(listResponse.data)).toBe(true);
  });

  test('T-INT-FRD-01: Score computation with threshold', async () => {
    const response = await apiClient.post('/fraud/compute-score', {
      claimId: uuidv4(),
      claimNumber: 'CLM-SCORE-001',
      lossType: 'AUTO',
      policyId: uuidv4(),
    });

    expect(response.success).toBe(true);
    expect(response.data.score).toBeGreaterThan(0);
    expect(typeof response.data.holdClaim).toBe('boolean');
    expect(response.data.threshold).toBeDefined();
  });

  test('T-INT-FRD-02: Audit trail in fraud_score_audit', async () => {
    const result = await DbHelper.executeQuery(
      'fraud',
      'SELECT COUNT(*) as count FROM fraud_score_audit WHERE claim_id = $1',
      [claimId]
    );
    expect(parseInt(result[0].count, 10)).toBeGreaterThan(0);
  });

  test('T-INT-FRD-04: Case lifecycle (open→close with cleared)', async () => {
    const newClaimId = uuidv4();

    await apiClient.post('/fraud/compute-score', {
      claimId: newClaimId,
      claimNumber: 'CLM-LIFE-001',
      lossType: 'PROPERTY',
    });

    const openResponse = await apiClient.post(`/fraud/cases/${newClaimId}/open`, {
      claimNumber: 'CLM-LIFE-001',
      score: 70,
      signals: ['LOSS_TYPE_PROPERTY'],
    });
    expect(openResponse.success).toBe(true);
    expect(openResponse.data.status).toBe('open');

    const closeResponse = await apiClient.post(`/fraud/cases/${openResponse.data.fraudCaseId}/close`, {
      resolution: 'cleared',
      notes: 'No evidence of fraud',
    });

    expect(closeResponse.success).toBe(true);
    expect(closeResponse.data.status).toBe('cleared');
    expect(closeResponse.data.holdClaim).toBe(false);
  });

  test('T-INT-FRD-04b: Case lifecycle (open→close with confirmed)', async () => {
    const newClaimId = uuidv4();

    await apiClient.post('/fraud/compute-score', {
      claimId: newClaimId,
      claimNumber: 'CLM-CONF-001',
      lossType: 'AUTO',
      policyId: uuidv4(),
    });

    const openResponse = await apiClient.post(`/fraud/cases/${newClaimId}/open`, {
      claimNumber: 'CLM-CONF-001',
      score: 90,
      signals: ['LOSS_TYPE_AUTO', 'POLICY_LINKED'],
    });
    expect(openResponse.success).toBe(true);

    const closeResponse = await apiClient.post(`/fraud/cases/${openResponse.data.fraudCaseId}/close`, {
      resolution: 'confirmed',
      notes: 'Fraud confirmed',
    });

    expect(closeResponse.success).toBe(true);
    expect(closeResponse.data.status).toBe('confirmed');
  });

  test('Close case with invalid resolution → error', async () => {
    const newClaimId = uuidv4();

    await apiClient.post('/fraud/compute-score', {
      claimId: newClaimId,
      claimNumber: 'CLM-INV-001',
      lossType: 'MEDICAL',
    });

    const openResponse = await apiClient.post(`/fraud/cases/${newClaimId}/open`, {
      claimNumber: 'CLM-INV-001',
    });

    const closeResponse = await apiClient.post(`/fraud/cases/${openResponse.data.fraudCaseId}/close`, {
      resolution: 'invalid_resolution',
    });

    expect(closeResponse.success).toBe(false);
  });

  test('Close non-existent case → not found', async () => {
    const closeResponse = await apiClient.post(`/fraud/cases/${uuidv4()}/close`, {
      resolution: 'cleared',
    });

    expect(closeResponse.success).toBe(false);
  });
});
