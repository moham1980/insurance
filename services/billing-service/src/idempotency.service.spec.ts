import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { IdempotencyService } from './idempotency.service';
import { IdempotencyKey } from './entities/IdempotencyKey';

function createMockRepo(overrides?: Record<string, any>) {
  return {
    findOne: mock(() => Promise.resolve(null)),
    save: mock((entity: any) => Promise.resolve(entity)),
    delete: mock(() => Promise.resolve({ affected: 1 })),
    ...overrides,
  } as any;
}

describe('IdempotencyService', () => {
  it('should return null for unknown key', async () => {
    const repo = createMockRepo();
    const service = new IdempotencyService(repo);
    const result = await service.getExisting('tenant-a', 'createInvoice', 'key-1');
    expect(result).toBeNull();
    expect(repo.findOne).toHaveBeenCalledWith({ where: { tenantId: 'tenant-a', scope: 'createInvoice', key: 'key-1' } });
  });

  it('should return cached response for existing key', async () => {
    const cached: IdempotencyKey = {
      id: 'id-1',
      tenantId: 'tenant-a',
      scope: 'createInvoice',
      key: 'key-1',
      requestHash: null,
      responseJson: { invoice: { id: 'inv-1' } },
      expiresAt: new Date(Date.now() + 10000),
      createdAt: new Date(),
    };
    const repo = createMockRepo({ findOne: mock(() => Promise.resolve(cached)) });
    const service = new IdempotencyService(repo);
    const result = await service.getExisting('tenant-a', 'createInvoice', 'key-1');
    expect(result).toEqual({ invoice: { id: 'inv-1' } });
  });

  it('should expire stale keys', async () => {
    const stale: IdempotencyKey = {
      id: 'id-1',
      tenantId: 'tenant-a',
      scope: 'createInvoice',
      key: 'key-1',
      requestHash: null,
      responseJson: { invoice: { id: 'inv-1' } },
      expiresAt: new Date(Date.now() - 1000),
      createdAt: new Date(),
    };
    const repo = createMockRepo({ findOne: mock(() => Promise.resolve(stale)) });
    const service = new IdempotencyService(repo);
    const result = await service.getExisting('tenant-a', 'createInvoice', 'key-1');
    expect(result).toBeNull();
    expect(repo.delete).toHaveBeenCalledWith({ id: 'id-1' });
  });

  it('should store result', async () => {
    const repo = createMockRepo();
    const service = new IdempotencyService(repo);
    await service.store('tenant-a', 'createInvoice', 'key-2', { ok: true }, 200);
    expect(repo.save).toHaveBeenCalled();
    const saved = repo.save.mock.calls[0][0] as Partial<IdempotencyKey>;
    expect(saved.tenantId).toBe('tenant-a');
    expect(saved.key).toBe('key-2');
    expect(saved.responseJson).toEqual({ ok: true });
  });
});
