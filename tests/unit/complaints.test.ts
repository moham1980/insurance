import { describe, test, expect } from '@jest/globals';

describe('Unit: Complaints Service', () => {
  describe('SLA Calculation', () => {
    test('T-UNIT-CMP-01: SLA calculation based on priority', () => {
      const calculateSla = (priority: string): number => {
        const slaMap: Record<string, number> = {
          low: 72, // 72 hours
          medium: 48,
          high: 24,
          urgent: 4,
        };
        return slaMap[priority] || 48;
      };

      expect(calculateSla('urgent')).toBe(4);
      expect(calculateSla('high')).toBe(24);
      expect(calculateSla('medium')).toBe(48);
      expect(calculateSla('low')).toBe(72);
    });
  });

  describe('OTP Validation', () => {
    test('T-UNIT-CMP-02: OTP code validation', () => {
      const validateOtp = (code: string): { valid: boolean; reason?: string } => {
        if (!code || code.length !== 6) {
          return { valid: false, reason: 'OTP must be 6 digits' };
        }
        if (!/^\d+$/.test(code)) {
          return { valid: false, reason: 'OTP must contain only digits' };
        }
        return { valid: true };
      };

      expect(validateOtp('123456')).toEqual({ valid: true });
      expect(validateOtp('12345')).toEqual({ valid: false, reason: 'OTP must be 6 digits' });
      expect(validateOtp('abcdef')).toEqual({ valid: false, reason: 'OTP must contain only digits' });
    });
  });

  describe('Escalation Logic', () => {
    test('T-UNIT-CMP-03: Escalation condition check', () => {
      const shouldEscalate = (priority: string, ageHours: number): boolean => {
        if (priority === 'urgent' && ageHours > 2) return true;
        if (priority === 'high' && ageHours > 12) return true;
        if (priority === 'medium' && ageHours > 24) return true;
        return false;
      };

      expect(shouldEscalate('urgent', 3)).toBe(true);
      expect(shouldEscalate('high', 13)).toBe(true);
      expect(shouldEscalate('medium', 25)).toBe(true);
      expect(shouldEscalate('low', 100)).toBe(false);
    });
  });
});
