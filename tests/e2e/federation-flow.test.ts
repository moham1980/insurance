import axios from 'axios';

const PARTNER_GATEWAY_URL = process.env.PARTNER_GATEWAY_URL || 'http://localhost:18010';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:18001';
const PARTY_KYC_SERVICE_URL = process.env.PARTY_KYC_SERVICE_URL || 'http://localhost:18006';

describe('Federation E2E Tests', () => {
  const testTenantId = 'e2e-broker-tenant';
  const testOrgId = 'e2e-broker-org';
  const partnerTenantId = 'e2e-insurer-tenant';
  const partnerOrgId = 'e2e-insurer-org';
  let partnerId: string;
  let certId: string;
  let consentId: string;

  describe('Partner Gateway', () => {
    it('should register a federation partner', async () => {
      const response = await axios.post(`${PARTNER_GATEWAY_URL}/partner-gateway/partners`, {
        tenantId: testTenantId,
        organizationId: testOrgId,
        partnerTenantId,
        partnerOrganizationId: partnerOrgId,
        relationshipType: 'carrier_broker',
        mTlsCertSubject: 'CN=e2e-insurer.test,O=E2E Insurer,C=IR',
        allowedScopes: ['quotes:write', 'policies:write'],
        allowedApis: ['/api/v1/federation/quotes', '/api/v1/federation/bind'],
        rateLimitRps: 50,
        validFrom: new Date().toISOString(),
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        tokenExchangeEndpoint: 'https://mock-idp.example.com/oauth/token',
        partnerApiGatewayUrl: 'https://mock-gw.example.com',
      }, {
        headers: { 'x-correlation-id': 'e2e-partner-register' },
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data.partnerId).toBeDefined();
      expect(response.data.data.status).toBe('active');
      partnerId = response.data.data.partnerId;
    });

    it('should reject duplicate partner registration', async () => {
      try {
        await axios.post(`${PARTNER_GATEWAY_URL}/partner-gateway/partners`, {
          tenantId: testTenantId,
          organizationId: testOrgId,
          partnerTenantId,
          partnerOrganizationId: partnerOrgId,
          relationshipType: 'carrier_broker',
          mTlsCertSubject: 'CN=e2e-insurer.test,O=E2E Insurer,C=IR',
          allowedScopes: ['quotes:write'],
          allowedApis: ['/api/v1/federation/quotes'],
          validFrom: new Date().toISOString(),
        });
        fail('Should have thrown duplicate error');
      } catch (err: any) {
        expect(err.response.status).toBe(400);
      }
    });

    it('should list partners for a tenant', async () => {
      const response = await axios.get(`${PARTNER_GATEWAY_URL}/partner-gateway/partners`, {
        headers: { 'x-tenant-id': testTenantId, 'x-correlation-id': 'e2e-partner-list' },
      });
      expect(response.status).toBe(200);
      expect(response.data.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should upload a certificate for the partner', async () => {
      const mockCert = `-----BEGIN CERTIFICATE-----\nMIIBmockcertdata==\n-----END CERTIFICATE-----`;
      const response = await axios.post(
        `${PARTNER_GATEWAY_URL}/partner-gateway/partners/${partnerId}/certificates`,
        {
          certSubject: 'CN=e2e-insurer.test,O=E2E Insurer,C=IR',
          certSerial: 'serial-001',
          publicCertPem: mockCert,
          issuer: 'CN=TestCA,O=TestCA',
          validFrom: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        },
        { headers: { 'x-correlation-id': 'e2e-cert-upload' } },
      );
      expect(response.status).toBe(201);
      expect(response.data.data.certId).toBeDefined();
      expect(response.data.data.status).toBe('active');
      certId = response.data.data.certId;
    });

    it('should list certificates for a partner', async () => {
      const response = await axios.get(
        `${PARTNER_GATEWAY_URL}/partner-gateway/partners/${partnerId}/certificates`,
        { headers: { 'x-correlation-id': 'e2e-cert-list' } },
      );
      expect(response.status).toBe(200);
      expect(response.data.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should rotate a certificate', async () => {
      const newCert = `-----BEGIN CERTIFICATE-----\nMIIBnewmockcertdata==\n-----END CERTIFICATE-----`;
      const response = await axios.post(
        `${PARTNER_GATEWAY_URL}/partner-gateway/partners/${partnerId}/certificates/${certId}/rotate`,
        {
          certSubject: 'CN=e2e-insurer.test,O=E2E Insurer,C=IR',
          certSerial: 'serial-002',
          publicCertPem: newCert,
          issuer: 'CN=TestCA,O=TestCA',
          validFrom: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        },
        { headers: { 'x-correlation-id': 'e2e-cert-rotate' } },
      );
      expect(response.status).toBe(200);
      expect(response.data.data.status).toBe('active');
      expect(response.data.data.rotatedFromCertId).toBe(certId);
    });

    it('should get expiring certificates', async () => {
      const response = await axios.get(`${PARTNER_GATEWAY_URL}/partner-gateway/certificates/expiring`, {
        headers: { 'x-days-ahead': '365', 'x-correlation-id': 'e2e-cert-expiring' },
      });
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    it('should validate access for a known partner', async () => {
      const response = await axios.post(`${PARTNER_GATEWAY_URL}/partner-gateway/validate-access`, {
        certSubject: 'CN=e2e-insurer.test,O=E2E Insurer,C=IR',
        requestedApi: '/api/v1/federation/quotes',
        requestedScope: 'quotes:write',
      }, { headers: { 'x-correlation-id': 'e2e-validate-access' } });
      expect(response.status).toBe(200);
      expect(response.data.data.allowed).toBe(true);
    });

    it('should reject access for unknown cert subject', async () => {
      try {
        await axios.post(`${PARTNER_GATEWAY_URL}/partner-gateway/validate-access`, {
          certSubject: 'CN=unknown.example.com',
          requestedApi: '/api/v1/federation/quotes',
          requestedScope: 'quotes:write',
        });
        fail('Should have been forbidden');
      } catch (err: any) {
        expect(err.response.status).toBe(403);
      }
    });

    it('should suspend and activate a partner', async () => {
      const suspendRes = await axios.post(
        `${PARTNER_GATEWAY_URL}/partner-gateway/partners/${partnerId}/suspend`,
        {},
        { headers: { 'x-correlation-id': 'e2e-suspend' } },
      );
      expect(suspendRes.data.data.status).toBe('suspended');

      const activateRes = await axios.post(
        `${PARTNER_GATEWAY_URL}/partner-gateway/partners/${partnerId}/activate`,
        {},
        { headers: { 'x-correlation-id': 'e2e-activate' } },
      );
      expect(activateRes.data.data.status).toBe('active');
    });

    it('should reject token exchange without nonce', async () => {
      try {
        await axios.post(`${PARTNER_GATEWAY_URL}/partner-gateway/token-exchange`, {
          partnerId,
          subjectToken: 'test-token',
          subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
          audience: 'test-audience',
          scope: 'quotes:write',
        });
        fail('Should have required nonce');
      } catch (err: any) {
        expect(err.response.status).toBe(400);
      }
    });
  });

  describe('Federation Consent Management', () => {
    it('should grant federation consent', async () => {
      const response = await axios.post(`${PARTY_KYC_SERVICE_URL}/federation/consents`, {
        globalSubjectId: '00000000-0000-0000-0000-000000000001',
        sourceTenantId: testTenantId,
        targetTenantId: partnerTenantId,
        consentType: 'data_sharing',
        dataCategories: ['policy', 'claim'],
        purpose: 'Cross-tenant policy projection for federation quote',
        grantedBy: 'e2e-test',
      }, { headers: { 'x-correlation-id': 'e2e-consent-grant' } });

      expect(response.status).toBe(201);
      expect(response.data.data.consentId).toBeDefined();
      expect(response.data.data.status).toBe('granted');
      consentId = response.data.data.consentId;
    });

    it('should check consent and return true for valid consent', async () => {
      const response = await axios.get(`${PARTY_KYC_SERVICE_URL}/federation/consents/check`, {
        data: {
          globalSubjectId: '00000000-0000-0000-0000-000000000001',
          targetTenantId: partnerTenantId,
          consentType: 'data_sharing',
          dataCategory: 'policy',
        },
        headers: { 'x-correlation-id': 'e2e-consent-check' },
      });
      expect(response.status).toBe(200);
      expect(response.data.data.hasConsent).toBe(true);
    });

    it('should list consents for a global subject', async () => {
      const response = await axios.get(
        `${PARTY_KYC_SERVICE_URL}/federation/consents/subject/00000000-0000-0000-0000-000000000001`,
        { headers: { 'x-correlation-id': 'e2e-consent-list' } },
      );
      expect(response.status).toBe(200);
      expect(response.data.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should revoke consent', async () => {
      const response = await axios.post(
        `${PARTY_KYC_SERVICE_URL}/federation/consents/${consentId}/revoke`,
        { revokedBy: 'e2e-test', reason: 'Test revocation' },
        { headers: { 'x-correlation-id': 'e2e-consent-revoke' } },
      );
      expect(response.status).toBe(200);
      expect(response.data.data.status).toBe('revoked');
      expect(response.data.data.revokedAt).toBeDefined();
    });

    it('should check consent and return false after revocation', async () => {
      const response = await axios.get(`${PARTY_KYC_SERVICE_URL}/federation/consents/check`, {
        data: {
          globalSubjectId: '00000000-0000-0000-0000-000000000001',
          targetTenantId: partnerTenantId,
          consentType: 'data_sharing',
          dataCategory: 'policy',
        },
        headers: { 'x-correlation-id': 'e2e-consent-check-revoked' },
      });
      expect(response.status).toBe(200);
      expect(response.data.data.hasConsent).toBe(false);
    });
  });
});
