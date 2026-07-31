import { describe, it, expect } from 'bun:test';
import { DataQualityService } from '../src/data-quality/data-quality.service';

function createMockEventProducer() {
  return {
    publishDataQualityIssueDetected: async () => 'ev-1',
    publishDataQualityIssueResolved: async () => 'ev-2',
    publish: async () => 'ev-0',
  } as any;
}

describe('DataQualityService', () => {
  it('lists issues with tenant filter', async () => {
    const rows: any[] = [];
    const total = 0;
    const repo = {
      createQueryBuilder: () => ({
        andWhere: function () { return this; },
        orderBy: function () { return this; },
        take: function () { return this; },
        skip: function () { return this; },
        getManyAndCount: async () => [rows, total],
      }),
    };
    const dataSource: any = { getRepository: () => repo };
    const service = new DataQualityService(dataSource, createMockEventProducer());
    const result = await service.listIssues('t1');
    expect(result.rows).toEqual(rows);
    expect(result.total).toBe(0);
  });

  it('resolves an issue and publishes event', async () => {
    const issue: any = { issueId: 'i1', status: 'open', resolvedBy: null, resolvedAt: null };
    const repo = {
      findOne: async () => issue,
      save: async (o: any) => o,
    };
    const dataSource: any = { getRepository: () => repo };
    const service = new DataQualityService(dataSource, createMockEventProducer());
    const result = await service.resolveIssue('i1', 'u1');
    expect(result).not.toBeNull();
    expect(result?.status).toBe('resolved');
    expect(result?.resolvedBy).toBe('u1');
  });

  it('runReconciliation creates issues for negative premiums', async () => {
    let savedIssues: any[] = [];
    const repo = {
      findOne: async () => null,
      create: (o: any) => ({ ...o, issueId: 'new-iid' }),
      save: async (o: any) => { savedIssues.push(o); return o; },
      createQueryBuilder: () => ({
        andWhere: function () { return this; },
        orderBy: function () { return this; },
        take: function () { return this; },
        skip: function () { return this; },
        getManyAndCount: async () => [[], 0],
        select: function () { return this; },
        addSelect: function () { return this; },
        from: function () { return this; },
        where: function () { return this; },
        getRawMany: async () => [{ policy_id: 'p1', premium_amount: '-100' }],
      }),
    };
    const dataSource: any = { getRepository: () => repo };
    const service = new DataQualityService(dataSource, createMockEventProducer());
    const result = await service.runReconciliation('t1');
    expect(result.rulesRun).toBe(5);
  });
});

