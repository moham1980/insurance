import { DockerComposeHelper } from '../helpers/docker-compose';
import { JwtFactory } from '../helpers/jwt-factory';
import { createGatewayClient, ApiClient } from '../helpers/api-client';

const GATEWAY_TIMEOUT = 120000;
const BASE_URL = process.env.API_GATEWAY_URL || 'http://localhost:18000';

describe('Resilience: API Gateway', () => {
  const tenantId = 'gateway-resilience-tenant';
  let anonClient: ApiClient;
  let adminClient: ApiClient;

  beforeAll(async () => {
    await DockerComposeHelper.waitForHealth('api-gateway', { timeoutMs: GATEWAY_TIMEOUT });
    anonClient = createGatewayClient();
    adminClient = createGatewayClient(JwtFactory.createGatewayAdminToken(tenantId));
    adminClient.setTenantId(tenantId);
  }, GATEWAY_TIMEOUT + 10000);

  test('rate limit is enforced per tenant/endpoint', async () => {
    const first = await fetch(`${BASE_URL}/health`);
    expect(first.status).toBe(200);
    const remainingHeader = first.headers.get('x-ratelimit-remaining');
    const limitHeader = first.headers.get('x-ratelimit-limit');
    expect(remainingHeader).toBeDefined();
    expect(limitHeader).toBeDefined();

    const remaining = parseInt(remainingHeader as string, 10);
    expect(Number.isFinite(remaining)).toBe(true);
    expect(remaining).toBeGreaterThanOrEqual(0);

    let hit429 = false;
    // Send enough requests to exhaust the quota; the final one should be 429.
    for (let i = 0; i < remaining + 1; i++) {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.status === 429) {
        hit429 = true;
        expect(res.headers.get('x-ratelimit-remaining')).toBe('0');
        break;
      }
    }
    expect(hit429).toBe(true);
  }, 120000);

  test('admin circuit breaker endpoints can reset and report state', async () => {
    const state = (await adminClient.get('/admin/circuit-breakers')) as any;
    expect(state.success).toBe(true);
    expect(Array.isArray(state.data)).toBe(true);

    if (state.data.length > 0) {
      const serviceName = state.data[0].serviceName as string;
      const reset = (await adminClient.post(`/admin/circuit-breakers/${serviceName}/reset`)) as any;
      expect(reset.success).toBe(true);
      expect(reset.message).toContain(serviceName);
    }
  });
});
