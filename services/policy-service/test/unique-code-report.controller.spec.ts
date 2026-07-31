import { describe, it, expect } from 'bun:test';
import { UniqueCodeReportController } from '../src/unique-code/unique-code-report.controller';

function createMockUniqueCodeService() {
  return {
    findPoliciesWithoutUniqueCode: async (tenantId?: string, limit?: number, offset?: number) => ({
      rows: [
        { policyId: 'p1', policyNumber: 'PN-001', status: 'issued', uniqueCode: null },
        { policyId: 'p2', policyNumber: 'PN-002', status: 'issued', uniqueCode: null },
      ],
      total: 2,
    }),
    findDuplicateUniqueCodes: async (tenantId?: string) => [
      { uniqueCode: 'UC-001', tenantId: 't1', policyIds: ['p1', 'p2', 'p3'], count: 3 },
      { uniqueCode: 'UC-002', tenantId: 't1', policyIds: ['p4', 'p5'], count: 2 },
    ],
  } as any;
}

describe('UniqueCodeReportController', () => {
  it('returns policies without unique code with pagination', async () => {
    const service = createMockUniqueCodeService();
    const controller = new UniqueCodeReportController(service);
    const req: any = { user: { tenantId: 't1', userId: 'u1' } };
    const headers: any = { 'x-correlation-id': 'corr-1' };

    const result = await controller.policiesWithoutUniqueCode(req, headers, '50', '0');
    expect(result.success).toBe(true);
    expect(result.data.length).toBe(2);
    expect(result.pagination.total).toBe(2);
    expect(result.correlationId).toBe('corr-1');
  });

  it('returns duplicate unique codes', async () => {
    const service = createMockUniqueCodeService();
    const controller = new UniqueCodeReportController(service);
    const req: any = { user: { tenantId: 't1', userId: 'u1' } };
    const headers: any = { 'x-correlation-id': 'corr-2' };

    const result = await controller.duplicateUniqueCodes(req, headers);
    expect(result.success).toBe(true);
    expect(result.data.length).toBe(2);
    expect(result.data[0].count).toBe(3);
    expect(result.count).toBe(2);
    expect(result.correlationId).toBe('corr-2');
  });

  it('generates correlationId when not provided', async () => {
    const service = createMockUniqueCodeService();
    const controller = new UniqueCodeReportController(service);
    const req: any = { user: { tenantId: 't1', userId: 'u1' } };
    const headers: any = {};

    const result = await controller.policiesWithoutUniqueCode(req, headers, '50', '0');
    expect(result.success).toBe(true);
    expect(result.correlationId).toBeTruthy();
    expect(typeof result.correlationId).toBe('string');
  });

  it('uses default limit/offset when invalid values provided', async () => {
    const service = createMockUniqueCodeService();
    const controller = new UniqueCodeReportController(service);
    const req: any = { user: { tenantId: 't1', userId: 'u1' } };
    const headers: any = { 'x-correlation-id': 'corr-3' };

    const result = await controller.policiesWithoutUniqueCode(req, headers, 'abc', 'xyz');
    expect(result.success).toBe(true);
    expect(result.pagination.limit).toBe(50);
    expect(result.pagination.offset).toBe(0);
  });
});
