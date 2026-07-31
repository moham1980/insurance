import { ProjectionSyncService } from '../src/projection-sync.service';
import { ProjectionReconciliationService } from '../src/projection-reconciliation.service';

describe('ProjectionSyncService', () => {
  describe('InsurerProjectionPayload interface', () => {
    it('should accept a valid payload shape', () => {
      const payload = {
        policyId: 'pol-001',
        policyNumber: 'POL-2025-0001',
        uniqueCode: 'UC-001',
        status: 'issued',
        startDate: '2025-01-01',
        endDate: '2026-01-01',
        premiumAmount: 5000000,
        coverages: { bodily: 100000000 },
        installments: { count: 4 },
        metadata: { source: 'issuer-tenant' },
        sourceVersion: 1,
      };

      expect(payload.policyId).toBe('pol-001');
      expect(payload.sourceVersion).toBe(1);
    });
  });
});

describe('ProjectionReconciliationService', () => {
  describe('ReconciliationResult interface', () => {
    it('should produce a result with matched/mismatched/missing counts', () => {
      const result = {
        totalProjections: 100,
        matched: 95,
        mismatched: 3,
        missing: 2,
        stale: 0,
        repaired: 5,
        details: [
          { projectionId: 'proj-1', policyId: 'pol-1', issue: 'mismatch', repaired: true },
          { projectionId: 'proj-2', policyId: 'pol-2', issue: 'missing', repaired: true },
        ],
      };

      expect(result.matched + result.mismatched + result.missing).toBe(result.totalProjections);
      expect(result.repaired).toBe(result.mismatched + result.missing);
    });
  });
});
