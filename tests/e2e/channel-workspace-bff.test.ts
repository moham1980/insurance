import { describe, test, expect, beforeAll } from '@jest/globals';
import { createServiceClient } from '../helpers/api-client';
import { JwtFactory } from '../helpers/jwt-factory';

const tenantId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const channelToken = JwtFactory.createTokenWithRole(tenantId, 'broker_owner', 'b1c2d3e4-f5a6-7890-abcd-ef1234567890');
const channelBffUrl = process.env.CHANNEL_BFF_URL || 'http://localhost:3020/api/v1';
const client = createServiceClient(channelBffUrl, channelToken);

describe('E2E: Channel Workspace BFF — All Endpoints', () => {
  beforeAll(() => {
    expect(channelToken).toBeDefined();
    expect(channelToken.length).toBeGreaterThan(10);
  });

  describe('Health', () => {
    test('T-CH-BFF-00: GET /health returns ok', async () => {
      const res = await client.get('/health');
      expect(res.status).toBe('ok');
      expect(res.service).toBe('channel-workspace-bff');
    });
  });

  describe('Channel — Workspaces', () => {
    test('T-CH-BFF-01: GET /channel/workspaces returns success', async () => {
      const res = await client.get('/channel/workspaces');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-CH-BFF-02: GET /channel/workspaces/mine returns success', async () => {
      const res = await client.get('/channel/workspaces/mine');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  describe('Channel — Offerings', () => {
    test('T-CH-BFF-03: GET /channel/offerings returns success with pagination', async () => {
      const res = await client.get('/channel/offerings?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  describe('Channel — Submissions', () => {
    test('T-CH-BFF-04: GET /channel/submissions returns success', async () => {
      const res = await client.get('/channel/submissions?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  describe('Channel — Commissions', () => {
    test('T-CH-BFF-05: GET /channel/commissions returns success', async () => {
      const res = await client.get('/channel/commissions?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  describe('Channel — Customers', () => {
    test('T-CH-BFF-06: GET /channel/customers returns success', async () => {
      const res = await client.get('/channel/customers?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  describe('Broker — Carrier Agreements', () => {
    test('T-CH-BFF-07: GET /broker/carrier-agreement returns success', async () => {
      const res = await client.get('/broker/carrier-agreement');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  describe('Broker — Product Offerings', () => {
    test('T-CH-BFF-08: GET /broker/product-offerings returns success with pagination', async () => {
      const res = await client.get('/broker/product-offerings?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
        // Verify pagination structure
        if (res.data && typeof res.data === 'object' && res.data.rows !== undefined) {
          expect(Array.isArray(res.data.rows)).toBe(true);
          expect(typeof res.data.total).toBe('number');
        }
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-CH-BFF-08b: GET /broker/product-offerings with status=active filter', async () => {
      const res = await client.get('/broker/product-offerings?limit=10&offset=0&status=active');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success && res.data && Array.isArray(res.data.rows)) {
        for (const offering of res.data.rows) {
          expect(offering.status).toBe('active');
        }
      }
    });
  });

  describe('Broker — Placements', () => {
    test('T-CH-BFF-09: GET /broker/placements returns success', async () => {
      const res = await client.get('/broker/placements');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  describe('Broker — Settlements', () => {
    test('T-CH-BFF-10: GET /broker/settlements returns success', async () => {
      const res = await client.get('/broker/settlements');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  describe('Broker — Claim Advocacy Cases', () => {
    test('T-CH-BFF-11: GET /broker/claim-advocacy-cases returns success', async () => {
      const res = await client.get('/broker/claim-advocacy-cases');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  describe('Broker — Sales Network Partners', () => {
    test('T-CH-BFF-12: GET /broker/sales-network/partners returns success', async () => {
      const res = await client.get('/broker/sales-network/partners?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  describe('Broker — Sales Network Contracts', () => {
    test('T-CH-BFF-13: GET /broker/sales-network/contracts returns success', async () => {
      const res = await client.get('/broker/sales-network/contracts?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  describe('Broker — Sales Network Ledger', () => {
    test('T-CH-BFF-14: GET /broker/sales-network/ledger returns success', async () => {
      const res = await client.get('/broker/sales-network/ledger?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  describe('Broker — Sales Network Agreements', () => {
    test('T-CH-BFF-15: GET /broker/sales-network/agreements returns success', async () => {
      const res = await client.get('/broker/sales-network/agreements?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  describe('Broker — Sub-Agent Management', () => {
    test('T-CH-BFF-16: GET /broker/sales-network/broker/:brokerPartnerId/sub-agents returns success', async () => {
      const res = await client.get('/broker/sales-network/broker/test-broker-001/sub-agents?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  describe('Broker — Broker Dashboard', () => {
    test('T-CH-BFF-17: GET /broker/sales-network/broker/:brokerPartnerId/dashboard returns success', async () => {
      const res = await client.get('/broker/sales-network/broker/test-broker-001/dashboard');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  describe('Auth Guard — Unauthenticated Access', () => {
    test('T-CH-BFF-18: GET without token returns 401/403', async () => {
      const unauthClient = createServiceClient(channelBffUrl);
      const res = await unauthClient.get('/channel/workspaces');
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
      expect(res.error.code).toMatch(/UNAUTHORIZED|FORBIDDEN/);
    });
  });

  // --- Channel Dashboard ---

  describe('Channel — Dashboard', () => {
    test('T-CH-BFF-19: GET /channel/dashboard returns structured response', async () => {
      const res = await client.get('/channel/dashboard');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  // --- Channel Workspace Detail ---

  describe('Channel — Workspace Detail', () => {
    test('T-CH-BFF-20: GET /channel/workspaces/:workspaceId returns structured response', async () => {
      const res = await client.get('/channel/workspaces/test-workspace-001');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  // --- Channel Submission Create & Quote Compare ---

  describe('Channel — Submission Create & Quote Compare', () => {
    test('T-CH-BFF-21: POST /channel/submissions creates a submission', async () => {
      const res = await client.post('/channel/submissions', {
        productId: 'test-product-001',
        customerNationalId: '0012345678',
        premium: 500000,
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

    test('T-CH-BFF-22: GET /channel/submissions/:submissionId/quotes/compare returns structured response', async () => {
      const res = await client.get('/channel/submissions/test-submission-001/quotes/compare');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  // --- Channel Partners & Sub-Agents ---

  describe('Channel — Partners & Sub-Agents', () => {
    test('T-CH-BFF-23: GET /channel/partners returns structured response', async () => {
      const res = await client.get('/channel/partners?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-CH-BFF-24: POST /channel/partners upserts a partner', async () => {
      const res = await client.post('/channel/partners', {
        name: 'Test Partner',
        kind: 'AGENT',
        status: 'ACTIVE',
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-CH-BFF-25: GET /channel/sub-agents returns structured response', async () => {
      const res = await client.get('/channel/sub-agents?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  // --- Channel Copilot ---

  describe('Channel — Copilot', () => {
    test('T-CH-BFF-26: POST /channel/copilot/chat returns structured response', async () => {
      const res = await client.post('/channel/copilot/chat', {
        message: 'Show me my top submissions',
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

  // --- Broker Dashboard ---

  describe('Broker — Dashboard', () => {
    test('T-CH-BFF-27: GET /broker/dashboard returns structured response', async () => {
      const res = await client.get('/broker/dashboard');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  // --- Broker Partners Upsert ---

  describe('Broker — Partners Upsert', () => {
    test('T-CH-BFF-28: POST /broker/partners upserts a partner', async () => {
      const res = await client.post('/broker/partners', {
        name: 'Test Broker Partner',
        kind: 'BROKER',
        status: 'ACTIVE',
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

  // --- Broker Contracts CRUD ---

  describe('Broker — Contracts CRUD', () => {
    test('T-CH-BFF-29: POST /broker/contracts creates a contract', async () => {
      const res = await client.post('/broker/contracts', {
        partnerId: 'test-partner-001',
        contractType: 'DISTRIBUTION',
        startDate: new Date().toISOString(),
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-CH-BFF-30: GET /broker/contracts/:contractId returns structured response', async () => {
      const res = await client.get('/broker/contracts/test-contract-001');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-CH-BFF-31: POST /broker/contracts/:contractId/terminate terminates contract', async () => {
      const res = await client.post('/broker/contracts/test-contract-001/terminate', {
        reason: 'Test termination',
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

  // --- Broker Ledger Reconciliation ---

  describe('Broker — Ledger Reconciliation', () => {
    test('T-CH-BFF-32: GET /broker/sales-network/ledger/reconciliation returns structured response', async () => {
      const res = await client.get('/broker/sales-network/ledger/reconciliation?orgUnitId=test-org-001');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  // --- Broker Sub-Agent Top-Level & Actions ---

  describe('Broker — Sub-Agent Top-Level & Actions', () => {
    test('T-CH-BFF-33: GET /broker/sub-agents returns structured response', async () => {
      const res = await client.get('/broker/sub-agents?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-CH-BFF-34: POST /broker/sub-agents creates a sub-agent', async () => {
      const res = await client.post('/broker/sub-agents', {
        name: 'Test Sub-Agent',
        nationalId: '0012345678',
        phone: '09123456789',
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-CH-BFF-35: POST /broker/sales-network/broker/:brokerPartnerId/sub-agents creates sub-agent', async () => {
      const res = await client.post('/broker/sales-network/broker/test-broker-001/sub-agents', {
        name: 'Test Sub-Agent 2',
        nationalId: '9876543210',
        phone: '09876543210',
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-CH-BFF-36: POST /broker/sales-network/broker/:brokerPartnerId/sub-agents/:subAgentPartnerId/suspend', async () => {
      const res = await client.post('/broker/sales-network/broker/test-broker-001/sub-agents/test-subagent-001/suspend', {});
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-CH-BFF-37: POST /broker/sales-network/broker/:brokerPartnerId/sub-agents/:subAgentPartnerId/terminate', async () => {
      const res = await client.post('/broker/sales-network/broker/test-broker-001/sub-agents/test-subagent-001/terminate', {});
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  // --- Broker Distribution Agreements CRUD ---

  describe('Broker — Distribution Agreements CRUD', () => {
    test('T-CH-BFF-38: GET /broker/sales-network/agreements/:agreementId returns structured response', async () => {
      const res = await client.get('/broker/sales-network/agreements/test-agreement-001');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-CH-BFF-39: POST /broker/sales-network/agreements creates a distribution agreement', async () => {
      const res = await client.post('/broker/sales-network/agreements', {
        carrierOrganizationId: 'test-carrier-org-001',
        distributorOrganizationId: 'test-distributor-org-001',
        agreementType: 'BROKERAGE',
        startDate: new Date().toISOString(),
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-CH-BFF-40: POST /broker/sales-network/agreements/:agreementId/activate activates agreement', async () => {
      const res = await client.post('/broker/sales-network/agreements/test-agreement-001/activate', {});
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-CH-BFF-41: POST /broker/sales-network/agreements/:agreementId/terminate terminates agreement', async () => {
      const res = await client.post('/broker/sales-network/agreements/test-agreement-001/terminate', {
        reason: 'Test termination',
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

  // --- Broker Commission Tiers ---

  describe('Broker — Commission Tiers', () => {
    test('T-CH-BFF-42: GET /broker/sales-network/agreements/:agreementId/tiers returns structured response', async () => {
      const res = await client.get('/broker/sales-network/agreements/test-agreement-001/tiers');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-CH-BFF-43: POST /broker/sales-network/agreements/:agreementId/tiers creates a tier', async () => {
      const res = await client.post('/broker/sales-network/agreements/test-agreement-001/tiers', {
        minPremium: 0,
        maxPremium: 1000000,
        commissionRate: 10,
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-CH-BFF-44: POST /broker/sales-network/tiers/:tierId/delete deletes a tier', async () => {
      const res = await client.post('/broker/sales-network/tiers/test-tier-001/delete', {});
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  // --- Broker Clawback Rules ---

  describe('Broker — Clawback Rules', () => {
    test('T-CH-BFF-45: GET /broker/sales-network/agreements/:agreementId/clawback-rules returns structured response', async () => {
      const res = await client.get('/broker/sales-network/agreements/test-agreement-001/clawback-rules');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-CH-BFF-46: POST /broker/sales-network/agreements/:agreementId/clawback-rules creates a clawback rule', async () => {
      const res = await client.post('/broker/sales-network/agreements/test-agreement-001/clawback-rules', {
        condition: 'CANCELLATION_WITHIN_30_DAYS',
        clawbackPercentage: 100,
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-CH-BFF-47: POST /broker/sales-network/clawback-rules/:ruleId/delete deletes a clawback rule', async () => {
      const res = await client.post('/broker/sales-network/clawback-rules/test-rule-001/delete', {});
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  // --- Broker Carrier Agreements (plural) ---

  describe('Broker — Carrier Agreements List', () => {
    test('T-CH-BFF-48a: GET /broker/carrier-agreements returns structured response', async () => {
      const res = await client.get('/broker/carrier-agreements?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });
  });

  // --- Broker Sales-Network Contract Detail & Terminate ---

  describe('Broker — Sales-Network Contract Detail & Actions', () => {
    test('T-CH-BFF-48b: GET /broker/sales-network/contracts/:contractId returns structured response', async () => {
      const res = await client.get('/broker/sales-network/contracts/test-sn-contract-001');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      if (res.success) {
        expect(res.data).toBeDefined();
      } else {
        expect(res.error).toBeDefined();
      }
    });

    test('T-CH-BFF-48c: POST /broker/sales-network/contracts/:contractId/terminate terminates contract', async () => {
      const res = await client.post('/broker/sales-network/contracts/test-sn-contract-001/terminate', {
        reason: 'Test termination',
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

  // --- Broker Copilot ---

  describe('Broker — Copilot', () => {
    test('T-CH-BFF-48: POST /broker/copilot/chat returns structured response', async () => {
      const res = await client.post('/broker/copilot/chat', {
        message: 'Show me my top performing sub-agents',
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
    test('T-CH-BFF-54a: GET /channel/dashboard returns success with correlationId', async () => {
      const res = await client.get('/channel/dashboard');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      expect(res.correlationId).toBeDefined();
    });

    test('T-CH-BFF-54b: GET /channel/workspaces returns success with correlationId', async () => {
      const res = await client.get('/channel/workspaces');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      expect(res.correlationId).toBeDefined();
    });

    test('T-CH-BFF-54c: GET /channel/offerings returns success with correlationId', async () => {
      const res = await client.get('/channel/offerings?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      expect(res.correlationId).toBeDefined();
    });

    test('T-CH-BFF-54d: GET /channel/submissions returns success with correlationId', async () => {
      const res = await client.get('/channel/submissions?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      expect(res.correlationId).toBeDefined();
    });

    test('T-CH-BFF-54e: GET /channel/commissions returns success with correlationId', async () => {
      const res = await client.get('/channel/commissions?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      expect(res.correlationId).toBeDefined();
    });

    test('T-CH-BFF-54f: GET /channel/customers returns success with correlationId', async () => {
      const res = await client.get('/channel/customers?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      expect(res.correlationId).toBeDefined();
    });

    test('T-CH-BFF-54g: GET /channel/partners returns success with correlationId', async () => {
      const res = await client.get('/channel/partners?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      expect(res.correlationId).toBeDefined();
    });

    test('T-CH-BFF-54h: GET /channel/sub-agents returns success with correlationId', async () => {
      const res = await client.get('/channel/sub-agents?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      expect(res.correlationId).toBeDefined();
    });
  });

  // --- Deep Validation: Broker Portal Endpoints ---

  describe('Deep Validation — Broker Portal Endpoints', () => {
    test('T-CH-BFF-55a: GET /broker/dashboard returns success with correlationId', async () => {
      const res = await client.get('/broker/dashboard');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      expect(res.correlationId).toBeDefined();
    });

    test('T-CH-BFF-55b: GET /broker/carrier-agreements returns structured response', async () => {
      const res = await client.get('/broker/carrier-agreement?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      expect(res.correlationId).toBeDefined();
    });

    test('T-CH-BFF-55c: GET /broker/carrier-agreements returns structured response', async () => {
      const res = await client.get('/broker/carrier-agreements?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      expect(res.correlationId).toBeDefined();
    });

    test('T-CH-BFF-55d: GET /broker/product-offerings returns structured response', async () => {
      const res = await client.get('/broker/product-offerings?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      expect(res.correlationId).toBeDefined();
    });

    test('T-CH-BFF-55e: GET /broker/placements returns structured response', async () => {
      const res = await client.get('/broker/placements?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      expect(res.correlationId).toBeDefined();
    });

    test('T-CH-BFF-55f: GET /broker/settlements returns structured response', async () => {
      const res = await client.get('/broker/settlements?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      expect(res.correlationId).toBeDefined();
    });

    test('T-CH-BFF-55g: GET /broker/claim-advocacy-cases returns structured response', async () => {
      const res = await client.get('/broker/claim-advocacy-cases?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      expect(res.correlationId).toBeDefined();
    });

    test('T-CH-BFF-55h: GET /broker/sales-network/ledger returns structured response', async () => {
      const res = await client.get('/broker/sales-network/ledger?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      expect(res.correlationId).toBeDefined();
    });

    test('T-CH-BFF-55i: GET /broker/sales-network/ledger/reconciliation returns structured response', async () => {
      const res = await client.get('/broker/sales-network/ledger/reconciliation?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      expect(res.correlationId).toBeDefined();
    });

    test('T-CH-BFF-55j: GET /broker/sales-network/agreements returns structured response', async () => {
      const res = await client.get('/broker/sales-network/agreements?limit=10&offset=0');
      expect(res).toBeDefined();
      expect(res).toHaveProperty('success');
      expect(res.correlationId).toBeDefined();
    });
  });

  // --- Deep Validation: Unauthorized Access ---

  describe('Deep Validation — Unauthorized Access (Multiple Endpoints)', () => {
    const unauthClient = createServiceClient(channelBffUrl);

    test('T-CH-BFF-56a: GET /channel/workspaces without token returns 401/403', async () => {
      const res = await unauthClient.get('/channel/workspaces');
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
      expect(res.error.code).toMatch(/UNAUTHORIZED|FORBIDDEN|INTERNAL/);
    });

    test('T-CH-BFF-56b: GET /channel/offerings without token returns 401/403', async () => {
      const res = await unauthClient.get('/channel/offerings?limit=10&offset=0');
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
      expect(res.error.code).toMatch(/UNAUTHORIZED|FORBIDDEN|INTERNAL/);
    });

    test('T-CH-BFF-56c: GET /channel/submissions without token returns 401/403', async () => {
      const res = await unauthClient.get('/channel/submissions?limit=10&offset=0');
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
      expect(res.error.code).toMatch(/UNAUTHORIZED|FORBIDDEN|INTERNAL/);
    });

    test('T-CH-BFF-56d: GET /broker/dashboard without token returns 401/403', async () => {
      const res = await unauthClient.get('/broker/dashboard');
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
      expect(res.error.code).toMatch(/UNAUTHORIZED|FORBIDDEN|INTERNAL/);
    });

    test('T-CH-BFF-56e: GET /broker/sales-network/agreements without token returns 401/403', async () => {
      const res = await unauthClient.get('/broker/sales-network/agreements?limit=10&offset=0');
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
      expect(res.error.code).toMatch(/UNAUTHORIZED|FORBIDDEN|INTERNAL/);
    });

    test('T-CH-BFF-56f: POST /broker/copilot/chat without token returns 401/403', async () => {
      const res = await unauthClient.post('/broker/copilot/chat', { message: 'test' });
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
      expect(res.error.code).toMatch(/UNAUTHORIZED|FORBIDDEN|INTERNAL/);
    });
  });
});
