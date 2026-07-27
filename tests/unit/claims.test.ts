import { describe, test, expect } from '@jest/globals';

describe('Unit: Claims Service', () => {
  describe('State Machine', () => {
    const validTransitions: Record<string, string[]> = {
      registered: ['assessed', 'rejected'],
      assessed: ['approved', 'rejected'],
      approved: ['paid', 'closed'],
      paid: ['closed'],
      rejected: ['closed'],
      closed: [],
    };

    test('T-UNIT-CLM-01: State Machine - valid transitions', () => {
      const canTransition = (from: string, to: string): boolean => {
        return validTransitions[from]?.includes(to) || false;
      };

      expect(canTransition('registered', 'assessed')).toBe(true);
      expect(canTransition('registered', 'rejected')).toBe(true);
      expect(canTransition('assessed', 'approved')).toBe(true);
      expect(canTransition('approved', 'paid')).toBe(true);
      expect(canTransition('paid', 'closed')).toBe(true);
    });

    test('T-UNIT-CLM-01: State Machine - invalid transitions', () => {
      const canTransition = (from: string, to: string): boolean => {
        return validTransitions[from]?.includes(to) || false;
      };

      expect(canTransition('registered', 'paid')).toBe(false); // Skip assessed
      expect(canTransition('assessed', 'registered')).toBe(false); // Backward
      expect(canTransition('closed', 'registered')).toBe(false); // Reopen not allowed
    });
  });

  describe('Fraud Scoring', () => {
    test('T-UNIT-CLM-02: Fraud scoring trigger logic', () => {
      const shouldTriggerFraudCheck = (claim: any): boolean => {
        if (claim.incidentAmount > 100000000) return true; // High amount
        if (claim.incidentType === 'theft' && claim.incidentAmount > 50000000) return true;
        if (claim.frequency > 3) return true; // Frequent claims
        return false;
      };

      expect(shouldTriggerFraudCheck({ incidentAmount: 150000000 })).toBe(true);
      expect(shouldTriggerFraudCheck({ incidentType: 'theft', incidentAmount: 60000000 })).toBe(true);
      expect(shouldTriggerFraudCheck({ frequency: 5 })).toBe(true);
      expect(shouldTriggerFraudCheck({ incidentAmount: 10000000 })).toBe(false);
    });
  });

  describe('Amount Validation', () => {
    test('T-UNIT-CLM-03: Amount validation (assessed ≥ approved ≥ paid)', () => {
      const validateAmounts = (assessed: number, approved: number, paid: number): { valid: boolean; reason?: string } => {
        if (approved > assessed) {
          return { valid: false, reason: 'Approved amount cannot exceed assessed amount' };
        }
        if (paid > approved) {
          return { valid: false, reason: 'Paid amount cannot exceed approved amount' };
        }
        return { valid: true };
      };

      expect(validateAmounts(50000000, 45000000, 45000000)).toEqual({ valid: true });
      expect(validateAmounts(50000000, 55000000, 45000000)).toEqual({ valid: false, reason: 'Approved amount cannot exceed assessed amount' });
      expect(validateAmounts(50000000, 45000000, 50000000)).toEqual({ valid: false, reason: 'Paid amount cannot exceed approved amount' });
    });
  });
});
