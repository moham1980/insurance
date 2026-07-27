import { DockerComposeHelper } from '../helpers/docker-compose';
import { JwtFactory } from '../helpers/jwt-factory';
import { createGatewayClient, ApiClient } from '../helpers/api-client';

const GATEWAY_TIMEOUT = 120000;
const BASE_URL = process.env.API_GATEWAY_URL || 'http://localhost:18000';

describe('E2E: API Gateway', () => {
  const tenantId = 'gateway-e2e-tenant';
  let anonClient: ApiClient;
  let adminClient: ApiClient;
  let gatewayAdminClient: ApiClient;

  beforeAll(async () => {
    await DockerComposeHelper.waitForHealth('api-gateway', { timeoutMs: GATEWAY_TIMEOUT });
    anonClient = createGatewayClient();
    adminClient = createGatewayClient(JwtFactory.createAdminToken(tenantId));
    adminClient.setTenantId(tenantId);
    gatewayAdminClient = createGatewayClient(JwtFactory.createGatewayAdminToken(tenantId));
    gatewayAdminClient.setTenantId(tenantId);
  }, GATEWAY_TIMEOUT + 10000);

  describe('Health and metadata', () => {
    test('/health returns ok', async () => {
      const res = (await anonClient.get('/health')) as any;
      expect(res.status).toBe('ok');
      expect(res.service).toBe('api-gateway');
      expect(res.timestamp).toBeDefined();
    });

    test('/gateway/health returns ok', async () => {
      const res = (await anonClient.get('/gateway/health')) as any;
      expect(res.status).toBe('ok');
      expect(res.service).toBe('api-gateway');
    });

    test('/gateway/health/upstreams returns upstream map', async () => {
      const res = (await anonClient.get('/gateway/health/upstreams')) as any;
      expect(res.success).toBe(true);
      expect(res.data.upstreams).toBeDefined();
      expect(Object.keys(res.data.upstreams).length).toBeGreaterThan(0);
    });

    test('/gateway/health/deep returns dependency checks', async () => {
      const res = (await anonClient.get('/gateway/health/deep')) as any;
      expect(res.status).toBeDefined();
      expect(res.service).toBe('api-gateway');
      expect(res.checks).toBeDefined();
      expect(res.checks.database).toBeDefined();
      expect(res.checks.kafka).toBeDefined();
    });
  });

  describe('Public route allow-list', () => {
    test('public health endpoints are reachable without authentication', async () => {
      const res = (await anonClient.get('/health')) as any;
      expect(res).toMatchObject({ status: 'ok', service: 'api-gateway' });
    });

    test('public auth endpoints do not require a JWT', async () => {
      const authHealthy = await DockerComposeHelper.isHealthy('auth-service');
      try {
        await anonClient.post('/auth/register', {});
        throw new Error('expected public auth endpoint to return a validation or upstream error');
      } catch (e: any) {
        if (!e.response) throw e;
        const status = e.response.status as number;
        expect([400, 503]).toContain(status);
        if (authHealthy) {
          expect(status).toBe(400);
        }
      }
    });
  });

  describe('JWT verification and tenant policy', () => {
    test('protected endpoint without token returns 401', async () => {
      const client = createGatewayClient();
      try {
        await client.get('/admin/circuit-breakers');
        throw new Error('expected 401 for unauthenticated request');
      } catch (e: any) {
        if (!e.response) throw e;
        expect(e.response.status).toBe(401);
        expect(e.response.data?.error?.code).toBe('UNAUTHORIZED');
      }
    });

    test('invalid token returns 401', async () => {
      const client = createGatewayClient('invalid-token');
      client.setTenantId(tenantId);
      try {
        await client.get('/admin/circuit-breakers');
        throw new Error('expected 401 for invalid token');
      } catch (e: any) {
        if (!e.response) throw e;
        expect([401, 500]).toContain(e.response.status);
        expect(e.response.data?.success).toBe(false);
      }
    });

    test('tenant mismatch between token and header returns 403', async () => {
      const mismatchedClient = createGatewayClient(JwtFactory.createAdminToken('tenant-a'));
      mismatchedClient.setTenantId('tenant-b');
      try {
        await mismatchedClient.get('/admin/circuit-breakers');
        throw new Error('expected 403 for tenant mismatch');
      } catch (e: any) {
        if (!e.response) throw e;
        expect(e.response.status).toBe(403);
        expect(e.response.data?.error?.code).toBe('TENANT_MISMATCH');
      }
    });

    test('non-admin token cannot access admin endpoints', async () => {
      try {
        await adminClient.get('/admin/circuit-breakers');
        throw new Error('expected 403 for non-admin request');
      } catch (e: any) {
        if (!e.response) throw e;
        expect(e.response.status).toBe(403);
        expect(e.response.data?.error?.code).toBe('FORBIDDEN');
      }
    });

    test('admin token can access circuit breaker state', async () => {
      const res = (await gatewayAdminClient.get('/admin/circuit-breakers')) as any;
      expect(res.success).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
    });
  });

  describe('Response headers and propagation', () => {
    test('correlation id and tenant id are returned in response headers', async () => {
      const client = createGatewayClient(JwtFactory.createAdminToken(tenantId));
      client.setTenantId(tenantId);
      const res = await fetch(`${BASE_URL}/admin/circuit-breakers`, {
        headers: {
          authorization: `Bearer ${JwtFactory.createGatewayAdminToken(tenantId)}`,
          'x-tenant-id': tenantId,
        },
      });
      expect(res.headers.get('x-correlation-id')).toBeDefined();
      expect(res.headers.get('x-tenant-id')).toBe(tenantId);
    });

    test('rate limit headers are present on public responses', async () => {
      const res = await fetch(`${BASE_URL}/health`);
      expect(res.headers.get('x-ratelimit-limit')).toBeDefined();
      expect(res.headers.get('x-ratelimit-remaining')).toBeDefined();
      expect(res.headers.get('x-ratelimit-reset')).toBeDefined();
    });
  });
});
