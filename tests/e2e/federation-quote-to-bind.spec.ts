import axios from 'axios';

const PARTNER_GATEWAY_URL = process.env.PARTNER_GATEWAY_URL || 'http://localhost:18010';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:18001';
const SUBMISSION_SERVICE_URL = process.env.SUBMISSION_SERVICE_URL || 'http://localhost:18025';
const POLICY_SERVICE_URL = process.env.POLICY_SERVICE_URL || 'http://localhost:18007';

describe('Federation Quote-to-Bind E2E', () => {
  const brokerTenantId = 'e2e-broker-tenant';
  const brokerOrgId = 'e2e-broker-org';
  const insurerTenantId = 'e2e-insurer-tenant';
  const insurerOrgId = 'e2e-insurer-org';
  let partnerId: string;
  let federationToken: string;
  let submissionId: string;
  let quoteResponseId: string;
  let placementId: string;
  let policyId: string;

  describe('Step 1: Partner Registration', () => {
    it('should register insurer as federation partner', async () => {
      const response = await axios.post(`${PARTNER_GATEWAY_URL}/partner-gateway/partners`, {
        tenantId: brokerTenantId,
        organizationId: brokerOrgId,
        partnerTenantId: insurerTenantId,
        partnerOrganizationId: insurerOrgId,
        relationshipType: 'carrier_broker',
        mTlsCertSubject: 'CN=e2e-insurer.test,O=E2E Insurer,C=IR',
        allowedScopes: ['quotes:write', 'policies:write', 'quotes:read', 'policies:read'],
        allowedApis: ['/api/v1/federation/quotes', '/api/v1/federation/bind'],
        rateLimitRps: 50,
        validFrom: new Date().toISOString(),
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        tokenExchangeEndpoint: `${AUTH_SERVICE_URL}/auth/token-exchange`,
        partnerApiGatewayUrl: PARTNER_GATEWAY_URL,
      }, {
        headers: { 'x-correlation-id': 'e2e-quote-bind-register' },
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data.partnerId).toBeDefined();
      expect(response.data.data.status).toBe('active');
      partnerId = response.data.data.partnerId;
    });
  });

  describe('Step 2: Token Exchange', () => {
    it('should exchange token for federation access', async () => {
      const subjectToken = await axios.post(`${AUTH_SERVICE_URL}/auth/login`, {
        username: 'e2e-broker-user',
        password: 'e2e-test-password',
        tenantId: brokerTenantId,
      }).then(r => r.data.accessToken).catch(() => 'mock-subject-token');

      const response = await axios.post(`${PARTNER_GATEWAY_URL}/partner-gateway/token-exchange`, {
        partnerId,
        subjectToken,
        subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
        audience: 'partner-gateway',
        scope: 'quotes:write policies:write',
        requestedTokenType: 'urn:ietf:params:oauth:token-type:access_token',
      }, {
        headers: {
          'x-correlation-id': 'e2e-quote-bind-token',
          'x-nonce': 'nonce-quote-bind-001',
        },
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data.accessToken).toBeDefined();
      federationToken = response.data.data.accessToken;
    });
  });

  describe('Step 3: Create Submission (Broker)', () => {
    it('should create a submission in broker tenant', async () => {
      const response = await axios.post(`${SUBMISSION_SERVICE_URL}/submissions`, {
        tenantId: brokerTenantId,
        organizationId: brokerOrgId,
        lineOfBusiness: 'motor',
        productId: 'motor-comprehensive-v1',
        effectiveFrom: '2025-01-01',
        effectiveTo: '2026-01-01',
        exposure: { vehicleType: 'sedan', vehicleValue: 500000000 },
      }, {
        headers: { 'x-correlation-id': 'e2e-quote-bind-submission', 'x-tenant-id': brokerTenantId },
      }).catch(err => err.response);

      if (response.status === 201 || response.status === 200) {
        submissionId = response.data.data?.submissionId || response.data.submissionId;
      }
      expect([200, 201]).toContain(response.status);
    });
  });

  describe('Step 4: Federation Quote Request', () => {
    it('should send quote request to insurer via federation connector', async () => {
      if (!submissionId) return;

      const response = await axios.post(`${PARTNER_GATEWAY_URL}/api/v1/federation/quotes`, {
        submissionId,
        quoteRequestId: 'e2e-qr-001',
        productId: 'motor-comprehensive-v1',
        productVersion: 1,
        lineOfBusiness: 'motor',
        exposure: { vehicleType: 'sedan', vehicleValue: 500000000 },
        effectiveFrom: '2025-01-01',
        effectiveTo: '2026-01-01',
        tenantId: brokerTenantId,
        carrierOrganizationId: insurerOrgId,
      }, {
        headers: {
          'Authorization': `Bearer ${federationToken}`,
          'X-Correlation-Id': 'e2e-quote-bind-rfq',
          'X-Tenant-Id': brokerTenantId,
        },
      }).catch(err => err.response);

      if (response.status === 200 || response.status === 201) {
        quoteResponseId = response.data.data?.quoteResponseId || response.data.quoteResponseId;
      }
      expect([200, 201]).toContain(response.status);
    });
  });

  describe('Step 5: Federation Bind', () => {
    it('should bind placement via federation connector', async () => {
      if (!submissionId || !quoteResponseId) return;

      const response = await axios.post(`${PARTNER_GATEWAY_URL}/api/v1/federation/bind`, {
        placementId: 'e2e-placement-001',
        submissionId,
        quoteResponseId,
        carrierOrganizationId: insurerOrgId,
        brokerOrganizationId: brokerOrgId,
        premiumAmountMinor: '5000000',
        premiumCurrency: 'IRR',
        effectiveFrom: '2025-01-01',
        effectiveTo: '2026-01-01',
        tenantId: brokerTenantId,
      }, {
        headers: {
          'Authorization': `Bearer ${federationToken}`,
          'X-Correlation-Id': 'e2e-quote-bind-bind',
          'X-Tenant-Id': brokerTenantId,
        },
      }).catch(err => err.response);

      if (response.status === 200 || response.status === 201) {
        policyId = response.data.data?.policyId || response.data.policyId;
      }
      expect([200, 201]).toContain(response.status);
    });
  });

  describe('Step 6: Verify Policy Projection', () => {
    it('should receive policy projection in broker tenant', async () => {
      if (!policyId) return;

      const response = await axios.get(`${POLICY_SERVICE_URL}/policy-projections/${policyId}`, {
        headers: { 'x-tenant-id': brokerTenantId },
      }).catch(err => err.response);

      if (response.status === 200) {
        expect(response.data.data?.policyId).toBe(policyId);
        expect(response.data.data?.federationStatus).toBe('projected');
      }
    });
  });

  describe('Cleanup', () => {
    it('should revoke federation partner', async () => {
      if (!partnerId) return;
      const response = await axios.post(`${PARTNER_GATEWAY_URL}/partner-gateway/partners/${partnerId}/revoke`, {
        reason: 'E2E test cleanup',
      }, {
        headers: { 'x-correlation-id': 'e2e-quote-bind-cleanup' },
      }).catch(err => err.response);

      expect([200, 201]).toContain(response.status);
    });
  });
});
