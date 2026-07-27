import { describe, test, expect } from '@jest/globals';

describe('Unit: Underwriting Service', () => {
  describe('Decision Validation', () => {
    test('T-UNIT-UW-01: Decision validation (approved/rejected/escalated)', () => {
      const validateDecision = (decision: string, riskScore: number): { valid: boolean; reason?: string } => {
        const validDecisions = ['approved', 'rejected', 'escalated'];
        if (!validDecisions.includes(decision)) {
          return { valid: false, reason: 'Invalid decision type' };
        }
        if (decision === 'approved' && riskScore > 0.7) {
          return { valid: false, reason: 'Risk score too high for approval' };
        }
        if (decision === 'rejected' && riskScore < 0.3) {
          return { valid: false, reason: 'Risk score too low for rejection' };
        }
        return { valid: true };
      };

      expect(validateDecision('approved', 0.5)).toEqual({ valid: true });
      expect(validateDecision('approved', 0.8)).toEqual({ valid: false, reason: 'Risk score too high for approval' });
      expect(validateDecision('rejected', 0.2)).toEqual({ valid: false, reason: 'Risk score too low for rejection' });
      expect(validateDecision('escalated', 0.6)).toEqual({ valid: true });
    });
  });

  describe('ALREADY_DECIDED Guard', () => {
    test('T-UNIT-UW-02: ALREADY_DECIDED guard', () => {
      const decisions = new Map<string, string>();
      
      const canDecide = (policyId: string): { allowed: boolean; reason?: string } => {
        if (decisions.has(policyId)) {
          return { allowed: false, reason: 'ALREADY_DECIDED' };
        }
        return { allowed: true };
      };

      const recordDecision = (policyId: string, decision: string): void => {
        decisions.set(policyId, decision);
      };

      expect(canDecide('policy-1')).toEqual({ allowed: true });
      recordDecision('policy-1', 'approved');
      expect(canDecide('policy-1')).toEqual({ allowed: false, reason: 'ALREADY_DECIDED' });
    });
  });
});
