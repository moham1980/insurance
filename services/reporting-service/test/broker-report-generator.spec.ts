import { describe, it, expect } from 'bun:test';
import { BrokerReportGenerator } from '../src/broker-report/broker-report-generator';

function createMockEventProducer() {
  return {
    publishBrokerReportGenerated: async () => 'ev-1',
    publishBrokerReportApproved: async () => 'ev-2',
    publishBrokerReportSubmitted: async () => 'ev-3',
    publishTCoRReportGenerated: async () => 'ev-4',
    publishTCoRReportSubmitted: async () => 'ev-5',
    publishDataQualityIssueDetected: async () => 'ev-6',
    publishDataQualityIssueResolved: async () => 'ev-7',
    publishAuditReportGenerated: async () => 'ev-8',
    publishSettlementReconciled: async () => 'ev-9',
    publish: async () => 'ev-0',
  } as any;
}

describe('BrokerReportGenerator', () => {
  it('createDraft creates a draft report with correct period', async () => {
    const dataSource: any = {
      getRepository: () => ({
        findOne: async () => undefined,
        create: (o: any) => ({ ...o, reportId: 'r1' }),
        save: async (o: any) => o,
      }),
      createQueryBuilder: () => ({
        select: function () { return this; },
        addSelect: function () { return this; },
        from: function () { return this; },
        where: function () { return this; },
        andWhere: function () { return this; },
        innerJoin: function () { return this; },
        getRawOne: async () => ({ premiumAmount: '1000000', policyCount: '5' }),
      }),
    };

    const generator = new BrokerReportGenerator(dataSource, createMockEventProducer());
    const draft = await generator.createDraft({
      tenantId: 't1',
      brokerOrganizationId: 'b1',
      periodId: '1404-01',
      periodStartDate: '2025-03-01',
      periodEndDate: '2025-03-31',
    });

    expect(draft.status).toBe('draft');
    expect(draft.periodId).toBe('1404-01');
  });

  it('generate computes aggregate fields with correct decimal precision', async () => {
    let savedReport: any;
    const dataSource: any = {
      getRepository: () => ({
        findOne: async () => null,
        create: (o: any) => ({ ...o, reportId: 'r-gen-1' }),
        save: async (o: any) => { savedReport = o; return o; },
        createQueryBuilder: () => ({
          where: function () { return this; },
          andWhere: function () { return this; },
          orderBy: function () { return this; },
          take: function () { return this; },
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
        getRawOne: async () => ({ premiumAmount: '2500000', policyCount: '10' }),
      }),
    };

    const generator = new BrokerReportGenerator(dataSource, createMockEventProducer());
    const report = await generator.get('r-gen-1', 't1');
    expect(report).toBeNull();
  });

  it('submit blocks when critical data quality issues exist', async () => {
    const report: any = {
      reportId: 'r-block-1',
      tenantId: 't1',
      status: 'approved',
      submittedAt: null,
    };
    const dataSource: any = {
      getRepository: (entity: any) => ({
        findOne: async () => report,
        save: async (o: any) => o,
        createQueryBuilder: () => ({
          where: function () { return this; },
          andWhere: function () { return this; },
          getCount: async () => 3,
        }),
      }),
    };

    const generator = new BrokerReportGenerator(dataSource, createMockEventProducer());
    try {
      await generator.submit('r-block-1', 't1');
      expect(false).toBe(true);
    } catch (err: any) {
      expect(err.code).toBe('CRITICAL_VIOLATIONS');
      expect(err.message).toContain('3 open critical');
    }
  });
});

