import { describe, test, expect } from '@jest/globals';

describe('Unit: AML Service', () => {
  describe('Risk Score Calculation', () => {
    test('T-UNIT-AML-01: Risk score based on transaction amount and frequency', () => {
      const calculateRiskScore = (amount: number, frequency: number): number => {
        let score = 0;
        if (amount > 100000000) score += 0.3;
        if (amount > 500000000) score += 0.2;
        if (frequency > 5) score += 0.3;
        if (frequency > 10) score += 0.2;
        return Math.min(score, 1);
      };

      expect(calculateRiskScore(150000000, 3)).toBe(0.3);
      expect(calculateRiskScore(600000000, 6)).toBe(0.8);
      expect(calculateRiskScore(10000000, 2)).toBe(0);
    });
  });

  describe('Alert Triggering', () => {
    test('T-UNIT-AML-02: Alert trigger condition', () => {
      const shouldTriggerAlert = (riskScore: number, threshold: number): boolean => {
        return riskScore >= threshold;
      };

      expect(shouldTriggerAlert(0.85, 0.7)).toBe(true);
      expect(shouldTriggerAlert(0.6, 0.7)).toBe(false);
    });
  });

  describe('Rule Evaluation', () => {
    test('T-UNIT-AML-03: Rule evaluation logic', () => {
      const evaluateRule = (transaction: any, rule: any): boolean => {
        if (rule.type === 'amount_threshold') {
          return transaction.amount >= rule.threshold;
        }
        if (rule.type === 'frequency_threshold') {
          return transaction.frequency >= rule.threshold;
        }
        return false;
      };

      expect(evaluateRule({ amount: 150000000 }, { type: 'amount_threshold', threshold: 100000000 })).toBe(true);
      expect(evaluateRule({ frequency: 6 }, { type: 'frequency_threshold', threshold: 5 })).toBe(true);
    });
  });
});
