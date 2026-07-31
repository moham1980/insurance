import { describe, it, expect } from 'bun:test';
import { AuditReportService } from '../src/audit-report/audit-report.service';

function createMockEventProducer() {
  return {
    publishAuditReportGenerated: async () => 'ev-1',
    publish: async () => 'ev-0',
  } as any;
}

describe('AuditReportService', () => {
  it('create rejects invalid report type', async () => {
    const repo = { create: (o: any) => ({ ...o }), save: async (o: any) => o };
    const dataSource: any = { getRepository: () => repo };
    const service = new AuditReportService(dataSource, createMockEventProducer());

    try {
      await service.create({ reportType: 'invalid_type', tenantId: 't1' });
      expect(false).toBe(true);
    } catch (err: any) {
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.message).toContain('Invalid reportType');
    }
  });

  it('create accepts valid report types', async () => {
    const repo = { create: (o: any) => ({ ...o, reportId: 'ar-1' }), save: async (o: any) => o };
    const dataSource: any = { getRepository: () => repo };
    const service = new AuditReportService(dataSource, createMockEventProducer());

    const report = await service.create({ reportType: 'policy_issuance', tenantId: 't1' });
    expect(report.reportType).toBe('policy_issuance');
    expect(report.status).toBe('draft');
  });

  it('generate produces tamper-evident signature', async () => {
    const report: any = {
      reportId: 'ar-gen-1',
      reportType: 'claim_payments',
      tenantId: 't1',
      periodStartDate: new Date('2025-01-01'),
      periodEndDate: new Date('2025-03-31'),
      status: 'draft',
      generatedAt: null,
      generatedBy: null,
      payload: null,
      signature: null,
      previousSignature: null,
    };

    let savedReport: any;
    const repo = {
      findOne: async () => report,
      create: (o: any) => ({ ...o }),
      save: async (o: any) => { savedReport = o; return o; },
      createQueryBuilder: () => ({
        where: function () { return this; },
        andWhere: function () { return this; },
        orderBy: function () { return this; },
        take: function () { return this; },
        getOne: async () => null,
      }),
    };
    const dataSource: any = {
      getRepository: () => repo,
      createQueryBuilder: () => ({
        select: function () { return this; },
        addSelect: function () { return this; },
        from: function () { return this; },
        where: function () { return this; },
        andWhere: function () { return this; },
        groupBy: function () { return this; },
        getRawOne: async () => ({ count: '5', totalApproved: '500000' }),
        getRawMany: async () => [],
      }),
    };

    const service = new AuditReportService(dataSource, createMockEventProducer());
    const result = await service.generate('ar-gen-1', 't1', 'user-1');

    expect(result).not.toBeNull();
    expect(result!.status).toBe('generated');
    expect(result!.signature).toBeTruthy();
    expect(result!.signature!.length).toBe(64);
    expect(result!.previousSignature).toBeNull();
    expect(result!.generatedBy).toBe('user-1');
  });

  it('verifySignature returns true for unmodified report', async () => {
    const report: any = {
      reportId: 'ar-verify-1',
      reportType: 'policy_issuance',
      generatedAt: new Date('2025-06-01T10:00:00Z'),
      payload: { byStatus: [{ status: 'issued', total: '10' }] },
      previousSignature: null,
      signature: null,
    };

    const repo = {
      findOne: async () => report,
      create: (o: any) => ({ ...o }),
      save: async (o: any) => o,
      createQueryBuilder: () => ({
        where: function () { return this; },
        andWhere: function () { return this; },
        orderBy: function () { return this; },
        take: function () { return this; },
        getOne: async () => null,
      }),
    };
    const dataSource: any = {
      getRepository: () => repo,
      createQueryBuilder: () => ({
        select: function () { return this; },
        addSelect: function () { return this; },
        from: function () { return this; },
        where: function () { return this; },
        andWhere: function () { return this; },
        groupBy: function () { return this; },
        getRawMany: async () => [{ status: 'issued', total: '10' }],
        getRawOne: async () => ({}),
      }),
    };

    const service = new AuditReportService(dataSource, createMockEventProducer());
    const generated = await service.generate('ar-verify-1', 't1', 'user-1');
    expect(generated).not.toBeNull();
    expect(generated!.signature).toBeTruthy();

    const valid = service.verifySignature(generated!);
    expect(valid).toBe(true);
  });

  it('verifySignature returns false for tampered report', async () => {
    const report: any = {
      reportId: 'ar-tamper-1',
      reportType: 'policy_issuance',
      generatedAt: new Date('2025-06-01T10:00:00Z'),
      payload: { byStatus: [{ status: 'issued', total: '10' }] },
      previousSignature: null,
      signature: 'fake-signature-123',
    };

    const dataSource: any = { getRepository: () => ({}) };
    const service = new AuditReportService(dataSource, createMockEventProducer());
    const valid = service.verifySignature(report);
    expect(valid).toBe(false);
  });

  it('PII masking masks national_id and phone fields', async () => {
    const repo = {
      findOne: async () => null,
      create: (o: any) => ({ ...o }),
      save: async (o: any) => o,
      createQueryBuilder: () => ({
        where: function () { return this; },
        andWhere: function () { return this; },
        orderBy: function () { return this; },
        take: function () { return this; },
        getOne: async () => null,
      }),
    };
    const dataSource: any = {
      getRepository: () => repo,
      createQueryBuilder: () => ({
        select: function () { return this; },
        addSelect: function () { return this; },
        from: function () { return this; },
        where: function () { return this; },
        andWhere: function () { return this; },
        groupBy: function () { return this; },
        getRawMany: async () => [],
        getRawOne: async () => ({}),
      }),
    };

    const service = new AuditReportService(dataSource, createMockEventProducer());
    // Test PII masking by generating a report with PII in payload
    const report: any = {
      reportId: 'ar-pii-1',
      reportType: 'policy_issuance',
      tenantId: 't1',
      periodStartDate: null,
      periodEndDate: null,
      status: 'draft',
      generatedAt: null,
      generatedBy: null,
      payload: null,
      signature: null,
      previousSignature: null,
    };

    // Mock the findOne to return our report
    repo.findOne = async () => report;
    // Mock query to return data with PII fields
    dataSource.createQueryBuilder = () => ({
      select: function () { return this; },
      addSelect: function () { return this; },
      from: function () { return this; },
      where: function () { return this; },
      andWhere: function () { return this; },
      groupBy: function () { return this; },
      getRawMany: async () => ({
        map: (fn: any) => [{
          status: 'issued',
          total: '5',
          national_id: '1234567890',
          phone_number: '09123456789',
          email: 'test@example.com',
        }].map(fn),
      }) as any,
      getRawOne: async () => ({}),
    });

    const generated = await service.generate('ar-pii-1', 't1', 'user-1');
    expect(generated).not.toBeNull();
    // The payload should have been masked
    const payloadStr = JSON.stringify(generated!.payload);
    expect(payloadStr).not.toContain('1234567890');
    expect(payloadStr).not.toContain('09123456789');
    expect(payloadStr).not.toContain('test@example.com');
  });
});
