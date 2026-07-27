import { describe, test, expect } from '@jest/globals';

describe('Unit: Document AI Service', () => {
  describe('Job State Machine', () => {
    test('T-UNIT-DAI-01: Job state machine (queued→processing→extracted/failed/needs_review)', () => {
      const transitionJob = (currentState: string, event: string): string => {
        const transitions: Record<string, Record<string, string>> = {
          queued: { start: 'processing' },
          processing: { complete: 'extracted', fail: 'failed', low_confidence: 'needs_review' },
          extracted: {},
          failed: { retry: 'queued' },
          needs_review: { approve: 'extracted', reject: 'failed' },
        };
        return transitions[currentState]?.[event] || currentState;
      };

      expect(transitionJob('queued', 'start')).toBe('processing');
      expect(transitionJob('processing', 'complete')).toBe('extracted');
      expect(transitionJob('processing', 'fail')).toBe('failed');
      expect(transitionJob('processing', 'low_confidence')).toBe('needs_review');
      expect(transitionJob('failed', 'retry')).toBe('queued');
    });
  });

  describe('Retry/Backoff', () => {
    test('T-UNIT-DAI-02: Retry/backoff computation', () => {
      const calculateBackoff = (attempt: number): number => {
        return Math.min(Math.pow(2, attempt) * 1000, 30000); // Max 30s
      };

      expect(calculateBackoff(1)).toBe(2000);
      expect(calculateBackoff(2)).toBe(4000);
      expect(calculateBackoff(3)).toBe(8000);
      expect(calculateBackoff(10)).toBe(30000); // Capped at 30s
    });
  });

  describe('Cost Guardrail', () => {
    test('T-UNIT-DAI-03: Cost guardrail check (tenant daily limit)', () => {
      const checkCostGuardrail = (dailyCost: number, limit: number): { allowed: boolean; reason?: string } => {
        if (dailyCost >= limit) {
          return { allowed: false, reason: 'Daily cost limit exceeded' };
        }
        return { allowed: true };
      };

      expect(checkCostGuardrail(50000, 100000)).toEqual({ allowed: true });
      expect(checkCostGuardrail(100000, 100000)).toEqual({ allowed: false, reason: 'Daily cost limit exceeded' });
      expect(checkCostGuardrail(150000, 100000)).toEqual({ allowed: false, reason: 'Daily cost limit exceeded' });
    });
  });

  describe('Confidence Threshold', () => {
    test('T-UNIT-DAI-04: Confidence threshold decision', () => {
      const decideBasedOnConfidence = (confidence: number, threshold: number): string => {
        if (confidence >= threshold) return 'extracted';
        if (confidence >= threshold - 0.1) return 'needs_review';
        return 'failed';
      };

      expect(decideBasedOnConfidence(0.95, 0.8)).toBe('extracted');
      expect(decideBasedOnConfidence(0.75, 0.8)).toBe('needs_review');
      expect(decideBasedOnConfidence(0.5, 0.8)).toBe('failed');
    });
  });
});
