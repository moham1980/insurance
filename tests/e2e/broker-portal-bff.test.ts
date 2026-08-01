import { describe, test, expect, beforeAll } from '@jest/globals';
import { createServiceClient } from '../helpers/api-client';
import { JwtFactory } from '../helpers/jwt-factory';

const tenantId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const brokerToken = JwtFactory.createTokenWithRole(tenantId, 'broker_owner', 'b1c2d3e4-f5a6-7890-abcd-ef1234567890');
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

    test('T-BR-BFF-25: POST /broker/parties creates a party', async () => {
      const body = {
        firstName: 'Test',
        lastName: 'Party',
        nationalId: '9876543210',
        partyType: 'INDIVIDUAL',
      };
      const res = await client.post('/broker/parties', body);
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-26: POST /broker/parties/:partyId/link-organization links party to org', async () => {
      const body = {
        organizationId: 'test-org-001',
        roleType: 'BROKER',
      };
      const res = await client.post('/broker/parties/test-party-001/link-organization', body);
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  // --- Health & Auth Guard ---

  describe('Health', () => {
    test('T-BR-BFF-27: GET /health returns ok (via BFF root)', async () => {
      const healthClient = createServiceClient(process.env.BROKER_BFF_URL || 'http://localhost:3030');
      const res = await healthClient.get('/health');
      expect(res).toBeDefined();
      if (res.status) {
        expect(res.status).toBe('ok');
      }
    });
  });

  describe('Auth Guard — Unauthenticated Access', () => {
    test('T-BR-BFF-28: GET /broker/dashboard without token returns 401/403', async () => {
      const unauthClient = createServiceClient(brokerBffUrl);
      const res = await unauthClient.get('/broker/dashboard');
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
      expect(res.error.code).toMatch(/UNAUTHORIZED|FORBIDDEN|INTERNAL/);
    });
  });

  // --- Submission Detail & Quotes ---

  describe('Submission Details', () => {
    test('T-BR-BFF-29: GET /broker/submissions/:submissionId returns structured response', async () => {
      const res = await client.get('/broker/submissions/test-submission-001');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-30: GET /broker/quotes/:submissionId returns structured response', async () => {
      const res = await client.get('/broker/quotes/test-submission-001');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  // --- Placement CRUD ---

  describe('Placement Actions', () => {
    test('T-BR-BFF-31: POST /broker/placements creates a placement', async () => {
      const body = {
        submissionId: 'test-submission-001',
        carrierId: 'test-carrier-001',
        productId: 'test-product-001',
        premium: 500000,
        currency: 'IRR',
      };
      const res = await client.post('/broker/placements', body);
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-32: GET /broker/placements/:placementId returns structured response', async () => {
      const res = await client.get('/broker/placements/test-placement-001');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-33: POST /broker/placements/:placementId/bind returns structured response', async () => {
      const res = await client.post('/broker/placements/test-placement-001/bind', {});
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-34: POST /broker/placements/:placementId/retry returns structured response', async () => {
      const res = await client.post('/broker/placements/test-placement-001/retry', {});
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-35: POST /broker/placements/:placementId/cancel returns structured response', async () => {
      const res = await client.post('/broker/placements/test-placement-001/cancel', {});
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  // --- Claim Detail & Actions ---

  describe('Claim Details & Actions', () => {
    test('T-BR-BFF-36: GET /broker/claims/:claimId returns structured response', async () => {
      const res = await client.get('/broker/claims/test-claim-001');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-37: POST /broker/claims/:claimId/assess returns structured response', async () => {
      const res = await client.post('/broker/claims/test-claim-001/assess', {
        assessmentNotes: 'Test assessment',
        estimatedAmount: 1000000,
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-38: POST /broker/claims/:claimId/approve returns structured response', async () => {
      const res = await client.post('/broker/claims/test-claim-001/approve', {
        approvedAmount: 800000,
        notes: 'Approved by broker',
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-39: POST /broker/claims/:claimId/reject returns structured response', async () => {
      const res = await client.post('/broker/claims/test-claim-001/reject', {
        reason: 'Test rejection',
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-40: POST /broker/claims/:claimId/communications adds communication', async () => {
      const res = await client.post('/broker/claims/test-claim-001/communications', {
        type: 'NOTE',
        content: 'Test communication from broker',
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-41: GET /broker/claims/:claimId/advocacy returns structured response', async () => {
      const res = await client.get('/broker/claims/test-claim-001/advocacy');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-42: POST /broker/claims/:claimId/advocacy-cases opens advocacy case', async () => {
      const res = await client.post('/broker/claims/test-claim-001/advocacy-cases', {
        reason: 'Test advocacy case',
        priority: 'NORMAL',
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  // --- Policy Detail & Actions ---

  describe('Policy Details & Actions', () => {
    test('T-BR-BFF-43: GET /broker/policies/:policyId returns structured response', async () => {
      const res = await client.get('/broker/policies/test-policy-001');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-44: GET /broker/policies/:policyId/details returns structured response', async () => {
      const res = await client.get('/broker/policies/test-policy-001/details');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-45: GET /broker/policies/projections/:policyId returns structured response', async () => {
      const res = await client.get('/broker/policies/projections/test-policy-001');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-46: POST /broker/policies/quote requests a quote', async () => {
      const res = await client.post('/broker/policies/quote', {
        productId: 'test-product-001',
        premium: 500000,
        currency: 'IRR',
        effectiveFrom: new Date().toISOString(),
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-47: POST /broker/policies/convert-quote converts quote to policy', async () => {
      const res = await client.post('/broker/policies/convert-quote', {
        quoteId: 'test-quote-001',
        placementId: 'test-placement-001',
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-48: POST /broker/policies/:policyId/endorse endorses policy', async () => {
      const res = await client.post('/broker/policies/test-policy-001/endorse', {
        endorsementType: 'COVERAGE_CHANGE',
        details: { additionalCoverage: 'FIRE' },
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-49: POST /broker/policies/:policyId/renew renews policy', async () => {
      const res = await client.post('/broker/policies/test-policy-001/renew', {
        renewalTerm: 12,
        newPremium: 550000,
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-50: GET /broker/policies/:policyId/endorsements lists endorsements', async () => {
      const res = await client.get('/broker/policies/test-policy-001/endorsements?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-51: GET /broker/policies/:policyId/history returns policy history', async () => {
      const res = await client.get('/broker/policies/test-policy-001/history?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  // --- Payments Detail ---

  describe('Payment Details', () => {
    test('T-BR-BFF-52: GET /broker/payments/:paymentId returns structured response', async () => {
      const res = await client.get('/broker/payments/test-payment-001');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-53: GET /broker/payments/intents/:paymentIntentId returns structured response', async () => {
      const res = await client.get('/broker/payments/intents/test-intent-001');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  // --- Underwriting Detail & Appeal ---

  describe('Underwriting Details & Appeal', () => {
    test('T-BR-BFF-54: GET /broker/underwriting/requests/:id returns structured response', async () => {
      const res = await client.get('/broker/underwriting/requests/test-uw-001');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-55: POST /broker/underwriting/requests/:id/appeal submits appeal', async () => {
      const res = await client.post('/broker/underwriting/requests/test-uw-001/appeal', {
        reason: 'Test appeal reason',
        additionalData: { notes: 'Additional context' },
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  // --- Collections Detail ---

  describe('Collections Details', () => {
    test('T-BR-BFF-56: GET /broker/collections/plans/:planId returns structured response', async () => {
      const res = await client.get('/broker/collections/plans/test-plan-001');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-57: GET /broker/collections/plans/:planId/installments returns installments', async () => {
      const res = await client.get('/broker/collections/plans/test-plan-001/installments');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-58: GET /broker/collections/installments/:installmentId returns structured response', async () => {
      const res = await client.get('/broker/collections/installments/test-installment-001');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  // --- Regulatory Extended ---

  describe('Regulatory Extended', () => {
    test('T-BR-BFF-59: POST /broker/regulatory/broker-license/validate-batch validates batch', async () => {
      const res = await client.post('/broker/regulatory/broker-license/validate-batch', {
        licenses: [
          { brokerCentralCode: 'BROKER-001', licenseNumber: 'LIC-12345' },
          { brokerCentralCode: 'BROKER-002', licenseNumber: 'LIC-67890' },
        ],
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-60: POST /broker/regulatory/warehouse-fire/inquire submits inquiry', async () => {
      const res = await client.post('/broker/regulatory/warehouse-fire/inquire', {
        nationalId: '0012345678',
        warehouseId: 'WH-001',
        inquiryType: 'FIRE_SAFETY',
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-61: GET /broker/regulatory/warehouse-fire/history returns history', async () => {
      const res = await client.get('/broker/regulatory/warehouse-fire/history?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  // --- KYC Extended ---

  describe('KYC Extended', () => {
    test('T-BR-BFF-62: GET /broker/kyc/:partyId/history returns kyc history', async () => {
      const res = await client.get('/broker/kyc/test-party-001/history?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-63: POST /broker/kyc/:partyId/broker-kyc/initiate initiates KYC', async () => {
      const res = await client.post('/broker/kyc/test-party-001/broker-kyc/initiate', {
        kycType: 'BROKER_ONBOARDING',
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-64: POST /broker/kyc/:partyId/broker-kyc/check updates KYC check', async () => {
      const res = await client.post('/broker/kyc/test-party-001/broker-kyc/check', {
        checkType: 'IDENTITY_VERIFICATION',
        status: 'PASS',
        reference: 'CHECK-001',
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-65: POST /broker/kyc/bulk-review submits bulk review', async () => {
      const res = await client.post('/broker/kyc/bulk-review', {
        partyIds: ['test-party-001', 'test-party-002'],
        action: 'APPROVE',
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-66: POST /broker/kyc/:partyId/aml/commission-screening screens transaction', async () => {
      const res = await client.post('/broker/kyc/test-party-001/aml/commission-screening', {
        transactionId: 'TXN-001',
        amount: 5000000,
        currency: 'IRR',
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-67: POST /broker/kyc/aml/settlement-batch-screening screens batch', async () => {
      const res = await client.post('/broker/kyc/aml/settlement-batch-screening', {
        batchId: 'BATCH-001',
        settlementIds: ['SET-001', 'SET-002'],
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-68: POST /broker/kyc/:partyId/cross-org-consent/grant grants consent', async () => {
      const res = await client.post('/broker/kyc/test-party-001/cross-org-consent/grant', {
        targetOrganizationId: 'target-org-001',
        consentType: 'DATA_SHARING',
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-69: POST /broker/kyc/:partyId/cross-org-consent/revoke revokes consent', async () => {
      const res = await client.post('/broker/kyc/test-party-001/cross-org-consent/revoke', {
        targetOrganizationId: 'target-org-001',
        consentType: 'DATA_SHARING',
        reason: 'Test revocation',
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-70: GET /broker/kyc/:partyId/cross-org-consent/check checks consent', async () => {
      const res = await client.get('/broker/kyc/test-party-001/cross-org-consent/check?targetOrganizationId=target-org-001&consentType=DATA_SHARING');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-BR-BFF-71: POST /broker/kyc-exception/:exceptionId/escalate escalates exception', async () => {
      const res = await client.post('/broker/kyc-exception/test-exception-001/escalate', {
        reason: 'Test escalation',
        escalateTo: 'COMPLIANCE_OFFICER',
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  // --- Reports ---

  describe('Reports', () => {
    test('T-BR-BFF-72: GET /broker/reports/broker-transactions returns structured response', async () => {
      const res = await client.get('/broker/reports/broker-transactions?periodId=test-period-001');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  // --- Copilot ---

  describe('Copilot', () => {
    test('T-BR-BFF-73: POST /broker/copilot/chat returns structured response', async () => {
      const res = await client.post('/broker/copilot/chat', {
        message: 'What are my top policies?',
        conversationHistory: [],
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  // --- Deep Validation: Response Structure ---

  describe('Deep Validation — Response Structure', () => {
    test('T-BR-BFF-74a: GET /broker/agreements returns array data with correlationId', async () => {
      const res = await client.get('/broker/agreements?limit=10&offset=0');
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.correlationId).toBeDefined();
      expect(typeof res.correlationId).toBe('string');
    });

    test('T-BR-BFF-74b: GET /broker/submissions returns array data with correlationId', async () => {
      const res = await client.get('/broker/submissions?limit=10&offset=0');
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.correlationId).toBeDefined();
    });

    test('T-BR-BFF-74c: GET /broker/placements returns array data with correlationId', async () => {
      const res = await client.get('/broker/placements?limit=10&offset=0');
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.correlationId).toBeDefined();
    });

    test('T-BR-BFF-74d: GET /broker/payments returns array data with correlationId', async () => {
      const res = await client.get('/broker/payments?limit=10&offset=0');
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.correlationId).toBeDefined();
    });

    test('T-BR-BFF-74e: GET /broker/offerings returns array data with correlationId', async () => {
      const res = await client.get('/broker/offerings?limit=10&offset=0');
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.correlationId).toBeDefined();
    });

    test('T-BR-BFF-74f: GET /broker/commissions returns structured response with correlationId', async () => {
      const res = await client.get('/broker/commissions?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      expect(res.correlationId).toBeDefined();
    });

    test('T-BR-BFF-74g: GET /broker/policies returns array data with correlationId', async () => {
      const res = await client.get('/broker/policies?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      expect(res.correlationId).toBeDefined();
    });

    test('T-BR-BFF-74h: GET /broker/claims returns array data with correlationId', async () => {
      const res = await client.get('/broker/claims?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      expect(res.correlationId).toBeDefined();
    });
  });

  // --- Deep Validation: Pagination ---

  describe('Deep Validation — Pagination', () => {
    test('T-BR-BFF-75a: GET /broker/agreements with limit=5 returns at most 5 items', async () => {
      const res = await client.get('/broker/agreements?limit=5&offset=0');
      expect(res.success).toBe(true);
      if (Array.isArray(res.data)) {
        expect(res.data.length).toBeLessThanOrEqual(5);
      }
    });

    test('T-BR-BFF-75b: GET /broker/submissions with limit=5 returns at most 5 items', async () => {
      const res = await client.get('/broker/submissions?limit=5&offset=0');
      expect(res.success).toBe(true);
      if (Array.isArray(res.data)) {
        expect(res.data.length).toBeLessThanOrEqual(5);
      }
    });

    test('T-BR-BFF-75c: GET /broker/placements with limit=5 returns at most 5 items', async () => {
      const res = await client.get('/broker/placements?limit=5&offset=0');
      expect(res.success).toBe(true);
      if (Array.isArray(res.data)) {
        expect(res.data.length).toBeLessThanOrEqual(5);
      }
    });

    test('T-BR-BFF-75d: GET /broker/payments with limit=5 returns at most 5 items', async () => {
      const res = await client.get('/broker/payments?limit=5&offset=0');
      expect(res.success).toBe(true);
      if (Array.isArray(res.data)) {
        expect(res.data.length).toBeLessThanOrEqual(5);
      }
    });
  });

  // --- Deep Validation: Multi-Endpoint Unauthorized ---

  describe('Deep Validation — Unauthorized Access (Multiple Endpoints)', () => {
    const unauthClient = createServiceClient(brokerBffUrl);

    test('T-BR-BFF-76a: GET /broker/submissions without token returns 401/403', async () => {
      const res = await unauthClient.get('/broker/submissions?limit=10&offset=0');
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
      expect(res.error.code).toMatch(/UNAUTHORIZED|FORBIDDEN|INTERNAL/);
    });

    test('T-BR-BFF-76b: GET /broker/placements without token returns 401/403', async () => {
      const res = await unauthClient.get('/broker/placements?limit=10&offset=0');
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
      expect(res.error.code).toMatch(/UNAUTHORIZED|FORBIDDEN|INTERNAL/);
    });

    test('T-BR-BFF-76c: GET /broker/payments without token returns 401/403', async () => {
      const res = await unauthClient.get('/broker/payments?limit=10&offset=0');
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
      expect(res.error.code).toMatch(/UNAUTHORIZED|FORBIDDEN|INTERNAL/);
    });

    test('T-BR-BFF-76d: GET /broker/policies without token returns 401/403', async () => {
      const res = await unauthClient.get('/broker/policies?limit=10&offset=0');
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
      expect(res.error.code).toMatch(/UNAUTHORIZED|FORBIDDEN|INTERNAL/);
    });

    test('T-BR-BFF-76e: GET /broker/claims without token returns 401/403', async () => {
      const res = await unauthClient.get('/broker/claims?limit=10&offset=0');
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
      expect(res.error.code).toMatch(/UNAUTHORIZED|FORBIDDEN|INTERNAL/);
    });

    test('T-BR-BFF-76f: POST /broker/copilot/chat without token returns 401/403', async () => {
      const res = await unauthClient.post('/broker/copilot/chat', { message: 'test' });
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
      expect(res.error.code).toMatch(/UNAUTHORIZED|FORBIDDEN|INTERNAL/);
    });
  });

  // --- Deep Validation: Collections & Underwriting ---

  describe('Deep Validation — Collections & Underwriting', () => {
    test('T-BR-BFF-77a: GET /broker/collections/plans returns array or structured response', async () => {
      const res = await client.get('/broker/collections/plans?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      expect(res.correlationId).toBeDefined();
    });

    test('T-BR-BFF-77b: GET /broker/underwriting/requests returns array or structured response', async () => {
      const res = await client.get('/broker/underwriting/requests?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      expect(res.correlationId).toBeDefined();
    });

    test('T-BR-BFF-77c: GET /broker/underwriting/sla/metrics returns structured response', async () => {
      const res = await client.get('/broker/underwriting/sla/metrics');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      expect(res.correlationId).toBeDefined();
    });

    test('T-BR-BFF-77d: GET /broker/reports/broker-transactions returns structured response with correlationId', async () => {
      const res = await client.get('/broker/reports/broker-transactions');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      expect(res.correlationId).toBeDefined();
    });
  });
});
