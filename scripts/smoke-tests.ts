import { JwtFactory } from '../tests/helpers/jwt-factory';

const BASE_URL = process.env.BASE_URL || process.env.API_GATEWAY_URL || 'http://localhost:18000';
const TENANT_ID = process.env.SMOKE_TENANT_ID || 'smoke-tenant';

interface SmokeResult {
  name: string;
  ok: boolean;
  status?: number;
  error?: string;
}

async function request(
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body?: any
): Promise<{ status: number; data: any; headers: Headers }> {
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    headers['content-type'] = 'application/json';
  }
  const res = await fetch(`${BASE_URL}${path}`, init);
  const data = await res.json().catch(() => undefined);
  return { status: res.status, data, headers: res.headers };
}

async function runSmokeTests(): Promise<void> {
  const results: SmokeResult[] = [];

  const check = async (name: string, fn: () => Promise<{ ok: boolean; status?: number; error?: string }>) => {
    try {
      results.push({ name, ...(await fn()) });
    } catch (e: any) {
      results.push({ name, ok: false, error: e?.message || String(e) });
    }
  };

  await check('public health', async () => {
    const { status, data } = await request('GET', '/health');
    const ok = status === 200 && data?.status === 'ok' && data?.service === 'api-gateway';
    return { ok, status: ok ? status : undefined, error: ok ? undefined : `status=${status} body=${JSON.stringify(data)}` };
  });

  await check('gateway health', async () => {
    const { status, data } = await request('GET', '/gateway/health');
    const ok = status === 200 && data?.status === 'ok';
    return { ok, status, error: ok ? undefined : `status=${status} body=${JSON.stringify(data)}` };
  });

  await check('upstream health map', async () => {
    const { status, data } = await request('GET', '/gateway/health/upstreams');
    const ok = status === 200 && data?.success === true && data?.data?.upstreams;
    return { ok, status, error: ok ? undefined : `status=${status} body=${JSON.stringify(data)}` };
  });

  await check('rate limit headers', async () => {
    const { status, headers } = await request('GET', '/health');
    const ok = status === 200 && headers.get('x-ratelimit-limit') && headers.get('x-ratelimit-remaining') && headers.get('x-ratelimit-reset');
    return { ok, status, error: ok ? undefined : `missing rate limit headers` };
  });

  await check('admin endpoint rejects anonymous', async () => {
    const { status, data } = await request('GET', '/admin/circuit-breakers');
    const ok = status === 401 && data?.error?.code === 'UNAUTHORIZED';
    return { ok, status, error: ok ? undefined : `expected 401 UNAUTHORIZED, got status=${status} body=${JSON.stringify(data)}` };
  });

  const adminToken = JwtFactory.createGatewayAdminToken(TENANT_ID);
  await check('admin endpoint allows authorized admin', async () => {
    const { status, data } = await request('GET', '/admin/circuit-breakers', {
      authorization: `Bearer ${adminToken}`,
      'x-tenant-id': TENANT_ID,
    });
    const ok = status === 200 && data?.success === true && Array.isArray(data?.data);
    return { ok, status, error: ok ? undefined : `status=${status} body=${JSON.stringify(data)}` };
  });

  await check('tenant mismatch returns 403', async () => {
    const otherTenantToken = JwtFactory.createGatewayAdminToken('other-tenant');
    const { status, data } = await request('GET', '/admin/circuit-breakers', {
      authorization: `Bearer ${otherTenantToken}`,
      'x-tenant-id': TENANT_ID,
    });
    const ok = status === 403 && data?.error?.code === 'TENANT_MISMATCH';
    return { ok, status, error: ok ? undefined : `expected 403 TENANT_MISMATCH, got status=${status} body=${JSON.stringify(data)}` };
  });

  await check('public auth endpoint is reachable without JWT', async () => {
    const { status, data } = await request('POST', '/auth/register', {}, {});
    const ok = status === 400 || status === 503;
    return { ok, status, error: ok ? undefined : `expected 400 or 503, got status=${status} body=${JSON.stringify(data)}` };
  });

  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;

  console.log(`\nSmoke test results: ${passed}/${results.length} passed`);
  for (const r of results) {
    const icon = r.ok ? '✅' : '❌';
    console.log(`${icon} ${r.name}${r.status ? ` (HTTP ${r.status})` : ''}${r.error ? ` - ${r.error}` : ''}`);
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runSmokeTests().catch((err) => {
  console.error('Smoke test runner failed:', err);
  process.exit(1);
});
