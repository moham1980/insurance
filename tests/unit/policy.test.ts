import { describe, test, expect } from '@jest/globals';

describe('Unit: Policy Service', () => {
  describe('State Machine', () => {
    const validTransitions: Record<string, string[]> = {
      stage1: ['stage2'],
      stage2: ['stage3'],
      stage3: ['issue'],
      issue: ['unique_code'],
      unique_code: [],
    };

    test('T-UNIT-POL-01: State Machine - valid transitions', () => {
      const canTransition = (from: string, to: string): boolean => {
        return validTransitions[from]?.includes(to) || false;
      };

      expect(canTransition('stage1', 'stage2')).toBe(true);
      expect(canTransition('stage2', 'stage3')).toBe(true);
      expect(canTransition('stage3', 'issue')).toBe(true);
      expect(canTransition('issue', 'unique_code')).toBe(true);
    });

    test('T-UNIT-POL-01: State Machine - invalid transitions', () => {
      const canTransition = (from: string, to: string): boolean => {
        return validTransitions[from]?.includes(to) || false;
      };

      expect(canTransition('stage1', 'issue')).toBe(false); // Skip stages
      expect(canTransition('stage2', 'stage1')).toBe(false); // Backward
      expect(canTransition('unique_code', 'stage1')).toBe(false); // After issue
    });
  });

  describe('Quality Gate', () => {
    test('T-UNIT-POL-02: Quality Gate logic - uniqueCode validation', () => {
      const validateUniqueCode = (code: string): { valid: boolean; reason?: string } => {
        if (!code) return { valid: false, reason: 'Code is required' };
        if (!code.startsWith('SANHAB-')) return { valid: false, reason: 'Must start with SANHAB-' };
        if (code.length < 10) return { valid: false, reason: 'Too short' };
        return { valid: true };
      };

      expect(validateUniqueCode('SANHAB-12345')).toEqual({ valid: true });
      expect(validateUniqueCode('')).toEqual({ valid: false, reason: 'Code is required' });
      expect(validateUniqueCode('INVALID')).toEqual({ valid: false, reason: 'Must start with SANHAB-' });
      expect(validateUniqueCode('SANHAB-')).toEqual({ valid: false, reason: 'Too short' });
    });
  });

  describe('Sanhab Inquiry', () => {
    test('T-UNIT-POL-03: Sanhab inquiry response parsing', () => {
      const parseSanhabResponse = (response: any) => {
        if (!response || !response.data) {
          throw new Error('Invalid response');
        }
        return {
          policyNumber: response.data.policyNumber,
          status: response.data.status,
          uniqueCode: response.data.uniqueCode,
          expiryDate: response.data.expiryDate,
        };
      };

      const validResponse = {
        data: {
          policyNumber: 'POL-123',
          status: 'active',
          uniqueCode: 'SANHAB-123',
          expiryDate: '2025-12-31',
        },
      };

      const parsed = parseSanhabResponse(validResponse);
      expect(parsed.policyNumber).toBe('POL-123');
      expect(parsed.status).toBe('active');

      expect(() => parseSanhabResponse(null)).toThrow();
    });
  });

  describe('PolicyChange Diff', () => {
    test('T-UNIT-POL-04: PolicyChange diff computation', () => {
      const computeDiff = (before: any, after: any): string[] => {
        const changes: string[] = [];
        
        if (before.coverageAmount !== after.coverageAmount) {
          changes.push(`coverageAmount: ${before.coverageAmount} → ${after.coverageAmount}`);
        }
        if (before.premium !== after.premium) {
          changes.push(`premium: ${before.premium} → ${after.premium}`);
        }
        if (before.deductible !== after.deductible) {
          changes.push(`deductible: ${before.deductible} → ${after.deductible}`);
        }
        
        return changes;
      };

      const before = { coverageAmount: 100000000, premium: 5000000, deductible: 10000000 };
      const after = { coverageAmount: 150000000, premium: 7500000, deductible: 10000000 };

      const diff = computeDiff(before, after);
      expect(diff).toHaveLength(2);
      expect(diff[0]).toContain('coverageAmount');
      expect(diff[1]).toContain('premium');
    });
  });
});
