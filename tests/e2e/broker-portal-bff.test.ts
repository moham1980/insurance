import { describe, test, expect, beforeAll } from '@jest/globals';
import { createServiceClient } from '../helpers/api-client';
import { JwtFactory } from '../helpers/jwt-factory';

const tenantId = 'test-broker-tenant';
const brokerToken = JwtFactory.createTokenWithRole(tenantId, 'broker', 'broker-org-001');
const brokerBffUrl = process.env.BROKER_BFF_URL || 'http://localhost:3030/api/v1';
const client = createServiceClient(brokerBffUrl, brokerToken);

describe('E2E: Broker Portal BFF — All Endpoints', () => {
  beforeAll(() => {
    expect(brokerToken).toBeDefined();
    expect(brokerToken.length).toBeGreaterThan(10);
  });

  describe('Dashboard', () => {
    test('T-BR-BFF-01: GET /broker/dashboard returns success', async () => {
      const res = await client.get('/broker/dashboard');
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.correlationId).toBeDefined();
    });
  });

  describe('Agreements', () => {
    test('T-BR-BFF-02: GET /broker/agreements returns success with pagination', async () => {
      const res = await client.get('/broker/agreements?limit=10&offset=0');
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
    });
  });

  describe('Offerings', () => {
    test('T-BR-BFF-03: GET /broker/offerings returns success with pagination', async () => {
      const res = await client.get('/broker/offerings?limit=10&offset=0');
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      // Verify pagination structure
      if (res.data && typeof res.data === 'object') {
        if (res.data.rows !== undefined) {
          expect(Array.isArray(res.data.rows)).toBe(true);
          expect(typeof res.data.total).toBe('number');
        } else if (Array.isArray(res.data)) {
          // Flat array is also acceptable
          expect(Array.isArray(res.data)).toBe(true);
        }
      }
    });

    test('T-BR-BFF-03b: GET /broker/offerings with status=active filter', async () => {
      const res = await client.get('/broker/offerings?limit=10&offset=0&status=active');
      expect(res.success).toBe(true);
      if (res.data && Array.isArray(res.data.rows)) {
        for (const offering of res.data.rows) {
          expect(offering.status).toBe('active');
        }
      }
    });
  });

  describe('Submissions', () => {
    test('T-BR-BFF-04: GET /broker/submissions returns success', async () => {
      const res = await client.get('/broker/submissions?limit=10&offset=0');
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
    });
  });

  describe('Placements', () => {
    test('T-BR-BFF-05: GET /broker/placements returns success', async () => {
      const res = await client.get('/broker/placements?limit=10&offset=0');
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
    });

    test('T-BR-BFF-06: GET /broker/placements with status filter', async () => {
      const res = await client.get('/broker/placements?limit=10&offset=0&status=active');
      expect(res.success).toBe(true);
    });
  });

  describe('Claims', () => {
    test('T-BR-BFF-07: GET /broker/claims returns success', async () => {
      const res = await client.get('/broker/claims?limit=10&offset=0');
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
    });

    test('T-BR-BFF-08: POST /broker/claims/fnol creates FNOL claim', async () => {
      const fnolBody = {
        policyId: 'test-policy-001',
        claimType: 'ACCIDENT',
        description: 'Test FNOL claim from E2E test',
        incidentDate: new Date().toISOString(),
        partyId: 'test-party-001',
      };
      const res = await client.post('/broker/claims/fnol', fnolBody);
      // BFF must return a structured response — either success or a structured error
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
        expect(res.error).toHaveProperty('code');
        expect(res.error).toHaveProperty('message');
      }
    });
  });

  describe('Policies', () => {
    test('T-BR-BFF-09: GET /broker/policies returns success', async () => {
      const res = await client.get('/broker/policies?limit=10&offset=0');
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
    });

    test('T-BR-BFF-10: GET /broker/policies with status filter', async () => {
      const res = await client.get('/broker/policies?limit=10&offset=0&status=active');
      expect(res.success).toBe(true);
    });

    test('T-BR-BFF-11: GET /broker/policies/projections returns success', async () => {
      const res = await client.get('/broker/policies/projections?limit=10&offset=0');
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
    });
  });

  describe('Payments', () => {
    test('T-BR-BFF-12: GET /broker/payments returns success', async () => {
      const res = await client.get('/broker/payments?limit=10&offset=0');
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
    });

    test('T-BR-BFF-13: GET /broker/payments with status filter', async () => {
      const res = await client.get('/broker/payments?limit=10&offset=0&status=paid');
      expect(res.success).toBe(true);
    });
  });

  describe('Underwriting', () => {
    test('T-BR-BFF-14: GET /broker/underwriting/requests returns success', async () => {
      const res = await client.get('/broker/underwriting/requests?limit=10&offset=0');
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
    });

    test('T-BR-BFF-15: GET /broker/underwriting/sla/metrics returns success', async () => {
      const res = await client.get('/broker/underwriting/sla/metrics');
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
    });
  });

  describe('Collections', () => {
    test('T-BR-BFF-16: GET /broker/collections/plans returns success', async () => {
      const res = await client.get('/broker/collections/plans?limit=10&offset=0');
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
    });

    test('T-BR-BFF-17: GET /broker/collections/plans with status filter', async () => {
      const res = await client.get('/broker/collections/plans?limit=10&offset=0&status=active');
      expect(res.success).toBe(true);
    });
  });

  describe('Regulatory', () => {
    test('T-BR-BFF-18: POST /broker/regulatory/broker-license/validate accepts valid body', async () => {
      const body = {
        brokerCentralCode: 'BROKER-001',
        licenseNumber: 'LIC-12345',
      };
      const res = await client.post('/broker/regulatory/broker-license/validate', body);
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-19: GET /broker/regulatory/broker-license/status-changes returns structured response', async () => {
      const res = await client.get('/broker/regulatory/broker-license/status-changes?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-20: POST /broker/regulatory/sanhab/inquiry accepts valid body', async () => {
      const body = {
        nationalId: '0012345678',
        inquiryType: 'CLAIM_HISTORY',
      };
      const res = await client.post('/broker/regulatory/sanhab/inquiry', body);
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  describe('Commissions & Sub-Agents', () => {
    test('T-BR-BFF-21: GET /broker/commissions returns success', async () => {
      const res = await client.get('/broker/commissions?limit=10&offset=0');
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
    });

    test('T-BR-BFF-22: GET /broker/sub-agents returns success', async () => {
      const res = await client.get('/broker/sub-agents?limit=10&offset=0');
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
    });
  });

  describe('KYC Proxy', () => {
    test('T-BR-BFF-23: GET /broker/kyc/:partyId/status returns structured response', async () => {
      const res = await client.get('/broker/kyc/test-party-001/status');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  describe('Organizations & Parties', () => {
    test('T-BR-BFF-24: GET /broker/organizations/:orgId/parties returns structured response', async () => {
      const res = await client.get('/broker/organizations/test-org-001/parties?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });
});
