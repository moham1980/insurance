import 'reflect-metadata';
import { IdempotencyService } from './idempotency.service';

describe('IdempotencyService', () => {
  let service: IdempotencyService;

  beforeEach(() => {
    delete process.env.REDIS_URL;
    service = new IdempotencyService();
  });

  it('builds a composite key from scope, tenant, user, idempotency key and path', () => {
    const key = service.buildKey('POST:/api', 'tenant-1', 'user-1', 'abc-123', '/api');
    expect(key).toContain('POST:/api');
    expect(key).toContain('tenant-1');
    expect(key).toContain('user-1');
    expect(key).toContain('abc-123');
  });

  it('returns null when no cached value exists', async () => {
    const cached = await service.get('missing-key');
    expect(cached).toBeNull();
  });

  it('stores and retrieves a successful response', async () => {
    const key = 'test-key';
    await service.set(key, 200, { success: true, data: { id: 1 } });
    const cached = await service.get(key);
    expect(cached).toMatchObject({ statusCode: 200, body: { success: true, data: { id: 1 } } });
  });

  it('expires entries after the TTL', async () => {
    jest.useFakeTimers();
    process.env.IDEMPOTENCY_TTL_SECONDS = '1';
    const shortService = new IdempotencyService();
    const key = 'expiring-key';
    await shortService.set(key, 200, { ok: true });
    jest.advanceTimersByTime(1100);
    const cached = await shortService.get(key);
    expect(cached).toBeNull();
    jest.useRealTimers();
  });
});
