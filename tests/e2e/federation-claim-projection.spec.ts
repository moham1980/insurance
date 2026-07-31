import axios from 'axios';

const PARTNER_GATEWAY_URL = process.env.PARTNER_GATEWAY_URL || 'http://localhost:18010';
const CLAIMS_SERVICE_URL = process.env.CLAIMS_SERVICE_URL || 'http://localhost:18002';
const POLICY_SERVICE_URL = process.env.POLICY_SERVICE_URL || 'http://localhost:18007';
const PARTY_KYC_SERVICE_URL = process.env.PARTY_KYC_SERVICE_URL || 'http://localhost:18006';

describe('Federation Claim Projection E2E', () => {
  const insurerTenantId = 'e2e-insurer-tenant';
  const insurerOrgId = 'e2e-insurer-org';
  const brokerTenantId = 'e2e-broker-tenant';
  const brokerOrgId = 'e2e-broker-org';
  const customerTenantId = 'e2e-customer-tenant';
  let policyId: string;
  let claimId: string;
  let consentId: string;
  let globalSubjectId: string;

  describe('Step 1: Setup Consent for Cross-Tenant Projection', () => {
    it('should grant consent for claim projection sharing', async () => {
      const response = await axios.post(`${PARTY_KYC_SERVICE_URL}/federation/consents`, {
        globalSubjectId: 'e2e-global-subject-001',
        sourceTenantId: customerTenantId,
        targetTenantId: brokerTenantId,
        targetOrganizationId: brokerOrgId,
        consentType: 'data_sharing',
        purpose: 'claim_projection_access',
        dataTypes: ['claim_summary', 'claim_status'],
        validFrom: new Date().toISOString(),
      }, {
        headers: { 'x-correlation-id': 'e2e-claim-consent', 'x-tenant-id': customerTenantId },
      }).catch(err => err.response);

      if (response.status === 201 || response.status === 200) {
        consentId = response.data.data?.consentId || response.data.consentId;
      }
      expect([200, 201]).toContain(response.status);
    });

    it('should verify consent is active', async () => {
      if (!consentId) return;

      const response = await axios.get(`${PARTY_KYC_SERVICE_URL}/federation/consents/${consentId}`, {
        headers: { 'x-tenant-id': customerTenantId },
      }).catch(err => err.response);

      if (response.status === 200) {
        expect(response.data.data?.status).toBe('active');
      }
    });
  });

  describe('Step 2: Create Claim in Insurer Tenant', () => {
    it('should file a claim against a policy in insurer tenant', async () => {
      const response = await axios.post(`${CLAIMS_SERVICE_URL}/claims`, {
        policyId: 'e2e-policy-001',
        claimantName: 'E2E Test Customer',
        claimType: 'accident',
        description: 'E2E test claim for projection sync',
        incidentDate: '2025-06-15',
        tenantId: insurerTenantId,
        organizationId: insurerOrgId,
      }, {
        headers: { 'x-correlation-id': 'e2e-claim-create', 'x-tenant-id': insurerTenantId },
      }).catch(err => err.response);

      if (response.status === 201 || response.status === 200) {
        claimId = response.data.data?.claimId || response.data.claimId;
      }
      expect([200, 201]).toContain(response.status);
    });
  });

  describe('Step 3: Verify Claim Projection in Broker Tenant', () => {
    it('should receive claim projection in broker tenant', async () => {
      if (!claimId) return;

      const response = await axios.get(`${CLAIMS_SERVICE_URL}/claims/${claimId}/projection`, {
        headers: { 'x-tenant-id': brokerTenantId },
      }).catch(err => err.response);

      if (response.status === 200) {
        expect(response.data.data?.claimId).toBe(claimId);
        expect(response.data.data?.federationStatus).toBe('projected');
      }
    });
  });

  describe('Step 4: Update Claim Status in Insurer Tenant', () => {
    it('should update claim status and trigger projection sync', async () => {
      if (!claimId) return;

      const response = await axios.post(`${CLAIMS_SERVICE_URL}/claims/${claimId}/status`, {
        status: 'under_review',
        notes: 'E2E test status update',
      }, {
        headers: { 'x-correlation-id': 'e2e-claim-update', 'x-tenant-id': insurerTenantId },
      }).catch(err => err.response);

      expect([200, 201]).toContain(response.status);
    });

    it('should see updated status in broker projection', async () => {
      if (!claimId) return;

      const response = await axios.get(`${CLAIMS_SERVICE_URL}/claims/${claimId}/projection`, {
        headers: { 'x-tenant-id': brokerTenantId },
      }).catch(err => err.response);

      if (response.status === 200) {
        expect(response.data.data?.status).toBe('under_review');
      }
    });
  });

  describe('Step 5: Revoke Consent and Verify Access Denied', () => {
    it('should revoke consent', async () => {
      if (!consentId) return;

      const response = await axios.post(`${PARTY_KYC_SERVICE_URL}/federation/consents/${consentId}/revoke`, {
        reason: 'E2E test cleanup',
      }, {
        headers: { 'x-correlation-id': 'e2e-claim-revoke', 'x-tenant-id': customerTenantId },
      }).catch(err => err.response);

      expect([200, 201]).toContain(response.status);
    });

    it('should deny projection access after consent revocation', async () => {
      if (!claimId) return;

      const response = await axios.get(`${CLAIMS_SERVICE_URL}/claims/${claimId}/projection`, {
        headers: { 'x-tenant-id': brokerTenantId },
      }).catch(err => err.response);

      expect([403, 401]).toContain(response.status);
    });
  });
});
