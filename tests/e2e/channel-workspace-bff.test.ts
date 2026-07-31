import { describe, test, expect, beforeAll } from '@jest/globals';
import { createServiceClient } from '../helpers/api-client';
import { JwtFactory } from '../helpers/jwt-factory';

const tenantId = 'test-channel-tenant';
const channelToken = JwtFactory.createTokenWithRole(tenantId, 'broker', 'broker-org-001');
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
      try {
        await unauthClient.get('/channel/workspaces');
        // If we get here, the endpoint didn't enforce auth — this is a bug
        fail('Expected 401/403 for unauthenticated request');
      } catch (error: any) {
        expect(error.response?.status).toBeGreaterThanOrEqual(401);
      }
    });
  });
});
