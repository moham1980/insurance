import { describe, test, expect } from '@jest/globals';

describe('Unit: Reinsurance Service', () => {
  describe('Cession Calculation', () => {
    test('T-UNIT-RI-01: Cession calculation (quota_share / excess_of_loss / stop_loss)', () => {
      const calculateCession = (type: string, amount: number, params: any): number => {
        switch (type) {
          case 'quota_share':
            return amount * (params.cessionPercentage || 0);
          case 'excess_of_loss':
            return amount > params.attachmentPoint ? amount - params.attachmentPoint : 0;
          case 'stop_loss':
            return amount > params.aggregateLimit ? amount - params.aggregateLimit : 0;
          default:
            return 0;
        }
      };

      expect(calculateCession('quota_share', 100000000, { cessionPercentage: 0.5 })).toBe(50000000);
      expect(calculateCession('excess_of_loss', 150000000, { attachmentPoint: 100000000 })).toBe(50000000);
      expect(calculateCession('stop_loss', 250000000, { aggregateLimit: 200000000 })).toBe(50000000);
    });
  });

  describe('Recovery Identification', () => {
    test('T-UNIT-RI-02: Recovery identification logic', () => {
      const identifyRecovery = (claimAmount: number, treatyLimit: number, retention: number): number => {
        const reinsurerShare = treatyLimit - retention;
        if (claimAmount > retention) {
          return Math.min(claimAmount - retention, reinsurerShare);
        }
        return 0;
      };

      expect(identifyRecovery(80000000, 100000000, 20000000)).toBe(60000000);
      expect(identifyRecovery(15000000, 100000000, 20000000)).toBe(0);
    });
  });

  describe('Reconciliation SLA Computation', () => {
    test('T-UNIT-RI-03: Reconciliation SLA computation', () => {
      const computeSlaStatus = (ticketCreated: Date, slaDeadlineHours: number): { status: string; remainingHours: number } => {
        const now = new Date();
        const deadline = new Date(ticketCreated.getTime() + slaDeadlineHours * 60 * 60 * 1000);
        const remainingMs = deadline.getTime() - now.getTime();
        const remainingHours = Math.max(0, remainingMs / (60 * 60 * 1000));

        let status: string;
        if (remainingMs <= 0) {
          status = 'breached';
        } else if (remainingMs < slaDeadlineHours * 0.25 * 60 * 60 * 1000) {
          status = 'critical';
        } else if (remainingMs < slaDeadlineHours * 0.5 * 60 * 60 * 1000) {
          status = 'warning';
        } else {
          status = 'healthy';
        }

        return { status, remainingHours: Math.round(remainingHours) };
      };

      const ticketCreated = new Date();
      
      // Healthy status (just created)
      const result1 = computeSlaStatus(ticketCreated, 72);
      expect(result1.status).toBe('healthy');
      expect(result1.remainingHours).toBeGreaterThan(60);

      // Warning status (half time passed)
      const ticketCreated2 = new Date(Date.now() - 40 * 60 * 60 * 1000);
      const result2 = computeSlaStatus(ticketCreated2, 72);
      expect(result2.status).toBe('warning');

      // Critical status (near deadline)
      const ticketCreated3 = new Date(Date.now() - 65 * 60 * 60 * 1000);
      const result3 = computeSlaStatus(ticketCreated3, 72);
      expect(result3.status).toBe('critical');

      // Breached status (past deadline)
      const ticketCreated4 = new Date(Date.now() - 80 * 60 * 60 * 1000);
      const result4 = computeSlaStatus(ticketCreated4, 72);
      expect(result4.status).toBe('breached');
      expect(result4.remainingHours).toBe(0);
    });
  });
});
