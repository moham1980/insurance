import { describe, it, expect } from 'bun:test';
import { TCoRReportCalculator } from '../src/tcor-report/tcor-report.calculator';

function createMockEventProducer() {
  return {
    publishTCoRReportGenerated: async () => 'ev-1',
    publishTCoRReportSubmitted: async () => 'ev-2',
    publish: async () => 'ev-0',
  } as any;
}

function createMockDataSource() {
  const report: any = {
    reportId: 'tcor-1',
    reportType: 'tcor',
    tenantId: 't1',
    periodId: '1404-01',
    periodStartDate: new Date('2025-01-01'),
    periodEndDate: new Date('2025-03-31'),
    status: 'draft',
    generatedAt: null,
    payload: null,
  };

  return {
    getRepository: () => ({
      findOne: async () => report,
      create: (o: any) => ({ ...o, reportId: 'tcor-1' }),
      save: async (o: any) => o,
      createQueryBuilder: () => ({
        where: function () { return this; },
        andWhere: function () { return this; },
        orderBy: function () { return this; },
        take: function () { return this; },
        skip: function () { return this; },
        getManyAndCount: async () => [[report], 1],
        getOne: async () => null,
      }),
    }),
    createQueryBuilder: () => ({
      select: function () { return this; },
      addSelect: function () { return this; },
      from: function () { return this; },
      where: function () { return this; },
      andWhere: function () { return this; },
      innerJoin: function () { return this; },
      groupBy: function () { return this; },
      getRawOne: async () => ({
        totalPremium: '1000000',
        totalClaims: '400000',
        totalExpenses: '100000',
        totalReinsurance: '50000',
      }),
      getRawMany: async () => [],
    }),
  } as any;
}

describe('TCoRReportCalculator', () => {
  it('list returns reports with tenant filter', async () => {
    const ds = createMockDataSource();
    const calc = new TCoRReportCalculator(ds, createMockEventProducer());
    const result = await calc.list('t1', undefined, 10, 0);
    expect(result.total).toBe(1);
  });

  it('createDraft creates a draft TCoR report', async () => {
    const ds = createMockDataSource();
    const calc = new TCoRReportCalculator(ds, createMockEventProducer());
    const draft = await calc.createDraft({
      tenantId: 't1',
      periodId: '1404-01',
      periodStartDate: '2025-01-01',
      periodEndDate: '2025-03-31',
    });
    expect(draft.status).toBe('draft');
    expect(draft.periodId).toBe('1404-01');
  });

  it('generate calculates TCoR metrics and publishes event', async () => {
    const ds = createMockDataSource();
    const calc = new TCoRReportCalculator(ds, createMockEventProducer());
    const result = await calc.generate('tcor-1', 't1');
    expect(result).not.toBeNull();
    expect(result!.status).toBe('generated');
    expect(result!.generatedAt).toBeTruthy();
  });

  it('drilldown by policy returns policy-level detail', async () => {
    const ds = createMockDataSource();
    // Override createQueryBuilder for drilldown
    ds.createQueryBuilder = () => ({
      select: function () { return this; },
      addSelect: function () { return this; },
      from: function () { return this; },
      where: function () { return this; },
      andWhere: function () { return this; },
      getRawMany: async () => [
        { policy_id: 'p1', premium_amount: '500000', claim_amount: '200000' },
        { policy_id: 'p2', premium_amount: '500000', claim_amount: '100000' },
      ],
    });

    const calc = new TCoRReportCalculator(ds, createMockEventProducer());
    const rows = await calc.drilldown('tcor-1', 'policy', 't1');
    expect(rows.length).toBe(2);
    expect(rows[0].policy_id).toBe('p1');
  });

  it('drilldown by lineOfBusiness groups by LOB', async () => {
    const ds = createMockDataSource();
    ds.createQueryBuilder = () => ({
      select: function () { return this; },
      addSelect: function () { return this; },
      from: function () { return this; },
      where: function () { return this; },
      andWhere: function () { return this; },
      groupBy: function () { return this; },
      getRawMany: async () => [
        { line_of_business: 'motor', premium: '600000', claims: '300000' },
        { line_of_business: 'health', premium: '400000', claims: '100000' },
      ],
    });

    const calc = new TCoRReportCalculator(ds, createMockEventProducer());
    const rows = await calc.drilldown('tcor-1', 'lineOfBusiness', 't1');
    expect(rows.length).toBe(2);
    expect(rows[0].line_of_business).toBe('motor');
  });

  it('drilldown by carrier groups by carrier', async () => {
    const ds = createMockDataSource();
    ds.createQueryBuilder = () => ({
      select: function () { return this; },
      addSelect: function () { return this; },
      from: function () { return this; },
      where: function () { return this; },
      andWhere: function () { return this; },
      groupBy: function () { return this; },
      getRawMany: async () => [
        { carrier: 'Iran-Moasser', premium: '700000', claims: '250000' },
      ],
    });

    const calc = new TCoRReportCalculator(ds, createMockEventProducer());
    const rows = await calc.drilldown('tcor-1', 'carrier', 't1');
    expect(rows.length).toBe(1);
    expect(rows[0].carrier).toBe('Iran-Moasser');
  });

  it('drilldown returns empty for invalid by parameter', async () => {
    const ds = createMockDataSource();
    const calc = new TCoRReportCalculator(ds, createMockEventProducer());
    const rows = await calc.drilldown('tcor-1', 'invalid', 't1');
    expect(rows).toEqual([]);
  });

  it('submit transitions to submitted and publishes event', async () => {
    const ds = createMockDataSource();
    const calc = new TCoRReportCalculator(ds, createMockEventProducer());
    const result = await calc.submit('tcor-1', 't1');
    expect(result).not.toBeNull();
    expect(result!.status).toBe('submitted');
    expect(result!.submittedAt).toBeTruthy();
  });
});
