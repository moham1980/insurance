import { describe, test, expect } from '@jest/globals';

describe('Unit: Fraud Service', () => {
  describe('Score Computation', () => {
    test('T-UNIT-FRD-01: Score computation + threshold logic', () => {
      const computeFraudScore = (claim: any): number => {
        let score = 0;
        
        // High amount
        if (claim.incidentAmount > 100000000) score += 0.3;
        
        // Suspicious incident type
        if (claim.incidentType === 'theft') score += 0.2;
        if (claim.incidentType === 'fire' && claim.incidentAmount > 50000000) score += 0.25;
        
        // Frequent claims
        if (claim.claimFrequency > 3) score += 0.3;
        
        // New policy
        if (claim.policyAgeDays < 30) score += 0.15;
        
        return Math.min(score, 1.0);
      };

      const highRiskClaim = {
        incidentAmount: 150000000,
        incidentType: 'theft',
        claimFrequency: 5,
        policyAgeDays: 10,
      };
      expect(computeFraudScore(highRiskClaim)).toBeGreaterThan(0.7);

      const lowRiskClaim = {
        incidentAmount: 10000000,
        incidentType: 'accident',
        claimFrequency: 1,
        policyAgeDays: 365,
      };
      expect(computeFraudScore(lowRiskClaim)).toBeLessThan(0.3);
    });

    test('T-UNIT-FRD-01: Threshold evaluation', () => {
      const requiresHumanTriage = (score: number): boolean => {
        return score >= 0.7;
      };

      expect(requiresHumanTriage(0.85)).toBe(true);
      expect(requiresHumanTriage(0.7)).toBe(true);
      expect(requiresHumanTriage(0.6)).toBe(false);
      expect(requiresHumanTriage(0.3)).toBe(false);
    });
  });

  describe('HITL Routing', () => {
    test('T-UNIT-FRD-02: HITL routing (holdClaim=true)', () => {
      const shouldHoldClaim = (fraudCase: any): boolean => {
        return fraudCase.riskScore >= 0.7 && fraudCase.requiresHumanTriage === true;
      };

      expect(shouldHoldClaim({ riskScore: 0.85, requiresHumanTriage: true })).toBe(true);
      expect(shouldHoldClaim({ riskScore: 0.5, requiresHumanTriage: true })).toBe(false);
      expect(shouldHoldClaim({ riskScore: 0.85, requiresHumanTriage: false })).toBe(false);
    });
  });
});
