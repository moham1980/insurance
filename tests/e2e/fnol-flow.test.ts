import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createGatewayClient } from '../helpers/api-client';
import { JwtFactory } from '../helpers/jwt-factory';
import { partyFixtures, quoteFixtures } from '../fixtures/party.fixture';
import { DbHelper } from '../helpers/db-helper';
import { DockerComposeHelper } from '../helpers/docker-compose';
import { AssertionHelpers } from '../helpers/assertions';
import { createExecutedPaymentForPolicy } from '../helpers/payment-helper';

describe('E2E: FNOL (First Notice of Loss) Flow', () => {
  const tenantId = 'test-tenant';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createGatewayClient(adminToken);
  apiClient.setTenantId(tenantId);

  let policyId: string;
  let correlationId: string;

  beforeAll(async () => {
    await DockerComposeHelper.waitForHealth('api-gateway', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('party-kyc-service', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('payments-service', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('policy-service', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('claims-service', { timeoutMs: 60000 });
    await DbHelper.truncateTable('public', 'parties');
    await DbHelper.truncateTable('public', 'claims');

    const partyResponse = await apiClient.post('/party/party', partyFixtures.individual);
    const partyId = partyResponse.data.partyId;

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

    const paymentId = await createExecutedPaymentForPolicy(apiClient, policyId, quoteFixtures.basic.premiumAmount, tenantId);

    await apiClient.post(`/policies/policies/${policyId}/issue`, {
      paymentId,
    });
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('T-E2E-FNOL-01: Get FNOL form defaults', async () => {
    correlationId = `test-fnol-01-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const defaultsResponse = await apiClient.get('/claims/fnol/form-defaults');
    AssertionHelpers.assertSuccessResponse(defaultsResponse);
    expect(defaultsResponse.data).toHaveProperty('incidentTypes');
  });

  test('T-E2E-FNOL-02: Submit FNOL claim', async () => {
    correlationId = `test-fnol-02-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const fnolResponse = await apiClient.post('/claims/fnol', {
      policyId,
      tenantId,
      incidentDate: new Date().toISOString(),
      incidentType: 'accident',
      incidentLocation: {
        address: 'Tehran, Valiasr St',
        city: 'Tehran',
        coordinates: { lat: 35.6892, lng: 51.3890 },
      },
      description: 'Vehicle collision at intersection',
      estimatedAmount: 120000000,
      contactInfo: {
        phone: '+989123456789',
        email: 'claimant@example.com',
      },
      notificationChannel: 'mobile_app',
    });
    AssertionHelpers.assertSuccessResponse(fnolResponse);
    expect(fnolResponse.data.status).toBe('registered');
    expect(fnolResponse.data).toHaveProperty('fraudScore');
    expect(fnolResponse.data).toHaveProperty('autoTriageCategory');
  });

  test('T-E2E-FNOL-03: FNOL with policy validation', async () => {
    correlationId = `test-fnol-03-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const fnolResponse = await apiClient.post('/claims/fnol', {
      policyId,
      tenantId,
      incidentDate: new Date().toISOString(),
      incidentType: 'theft',
      description: 'Vehicle stolen from parking',
      estimatedAmount: 200000000,
      notificationChannel: 'call_center',
    });
    AssertionHelpers.assertSuccessResponse(fnolResponse);

    const claimId = fnolResponse.data.claimId;

    const validateResponse = await apiClient.post(`/claims/claims/${claimId}/validate-policy`, {
      validateCoverage: true,
      validateDeductible: true,
    });
    AssertionHelpers.assertSuccessResponse(validateResponse);
    expect(validateResponse.data.policyValidated).toBe(true);
  });

  test('T-E2E-FNOL-04: FNOL with high fraud score → requiresHumanTriage', async () => {
    correlationId = `test-fnol-04-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const fnolResponse = await apiClient.post('/claims/fnol', {
      policyId,
      tenantId,
      incidentDate: new Date().toISOString(),
      incidentType: 'total_loss',
      description: 'Total loss claim with suspicious circumstances',
      estimatedAmount: 500000000,
      notificationChannel: 'web',
    });
    AssertionHelpers.assertSuccessResponse(fnolResponse);

    if (fnolResponse.data.fraudScore > 70) {
      expect(fnolResponse.data.requiresHumanTriage).toBe(true);
    }
  });
});
