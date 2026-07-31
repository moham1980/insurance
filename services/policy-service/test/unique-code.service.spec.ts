import { describe, it, expect } from 'bun:test';
import { UniqueCodeService } from '../src/unique-code/unique-code.service';
import { Policy } from '../src/entities/Policy';

describe('UniqueCodeService', () => {
  it('generates a valid Sanhab submission UUID', () => {
    const service = new UniqueCodeService({} as any, {} as any);
    const id = service.generateSanhabSubmissionId();
    expect(typeof id).toBe('string');
    expect(id.length).toBe(36);
    expect(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)).toBe(true);
  });

  it('assigns unique code when no duplicate exists', async () => {
    const policy: any = { policyId: 'p1', tenantId: 't1', uniqueCode: null };
    const saved: any = { ...policy };
    const fakeRepo = {
      createQueryBuilder: () => ({
        where: () => ({ andWhere: () => ({ andWhere: () => ({ getOne: () => null }) }) }),
      }),
      preload: async () => ({ ...policy }),
      save: async (p: any) => { Object.assign(saved, p); return saved; },
    };
    const fakeManager = { getRepository: () => fakeRepo };
    const fakeDataSource = { transaction: async (fn: any) => fn(fakeManager) } as any;

    const service = new UniqueCodeService({} as any, fakeDataSource);
    const result = await service.assignUniqueCode({
      policyId: 'p1',
      uniqueCode: 'UC-123',
      source: 'sanhab',
      tenantId: 't1',
    });

    expect(result.isDuplicate).toBe(false);
    expect(result.policy.uniqueCode).toBe('UC-123');
    expect(result.previousUniqueCode).toBeNull();
  });

  it('detects duplicate unique code and returns existing policy', async () => {
    const policy: any = { policyId: 'p1', tenantId: 't1', uniqueCode: null };
    const duplicate: any = { policyId: 'p2', tenantId: 't1', uniqueCode: 'UC-123' };
    const fakeRepo = {
      createQueryBuilder: () => ({
        where: () => ({
          andWhere: () => ({
            andWhere: () => ({
              getOne: () => duplicate,
            }),
          }),
        }),
      }),
      preload: async () => ({ ...policy }),
      save: async (p: any) => p,
    };
    const fakeManager = { getRepository: () => fakeRepo };
    const fakeDataSource = { transaction: async (fn: any) => fn(fakeManager) } as any;

    const service = new UniqueCodeService({} as any, fakeDataSource);
    const result = await service.assignUniqueCode({
      policyId: 'p1',
      uniqueCode: 'UC-123',
      source: 'sanhab',
      tenantId: 't1',
    });

    expect(result.isDuplicate).toBe(true);
    expect(result.policy.policyId).toBe('p1');
  });

  it('throws TENANT_MISMATCH when tenant does not match', async () => {
    const policy: any = { policyId: 'p1', tenantId: 't1', uniqueCode: null };
    const fakeRepo = {
      findOne: async () => policy,
    };
    const fakeManager = { getRepository: () => fakeRepo };
    const fakeDataSource = { transaction: async (fn: any) => fn(fakeManager) } as any;

    const service = new UniqueCodeService({} as any, fakeDataSource);

    try {
      await service.assignUniqueCode({
        policyId: 'p1',
        uniqueCode: 'UC-123',
        source: 'sanhab',
        tenantId: 't2',
      });
      expect(false).toBe(true);
    } catch (err: any) {
      expect(err.code).toBe('TENANT_MISMATCH');
    }
  });
});
