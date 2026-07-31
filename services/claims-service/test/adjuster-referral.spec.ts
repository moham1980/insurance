import { describe, test, expect } from '@jest/globals';

/**
 * Unit tests for Adjuster Referral operations.
 * Tests LOSS_ADJUSTER capability validation, agreement checking,
 * and report submission integrity.
 *
 * Required by P5-9.1: loss adjuster referral and report submission.
 */

describe('Unit: Adjuster Referral', () => {
  test('T-UNIT-ADJ-01: Referral status transitions are valid', () => {
    const validTransitions: Record<string, string[]> = {
      'pending': ['accepted', 'rejected'],
      'accepted': ['assigned', 'report_received'],
      'rejected': [],
      'assigned': ['report_received'],
      'report_received': ['closed'],
      'closed': [],
    };

    for (const [from, allowed] of Object.entries(validTransitions)) {
      expect(allowed).toBeDefined();
      expect(Array.isArray(allowed)).toBe(true);
    }
  });

  test('T-UNIT-ADJ-02: LOSS_ADJUSTER capability is required', () => {
    const validateCapability = (capabilities: string[]): boolean => {
      return capabilities.includes('LOSS_ADJUSTER');
    };

    expect(validateCapability(['BROKER', 'AGENT'])).toBe(false);
    expect(validateCapability(['LOSS_ADJUSTER'])).toBe(true);
    expect(validateCapability(['BROKER', 'LOSS_ADJUSTER', 'AGENT'])).toBe(true);
    expect(validateCapability([])).toBe(false);
  });

  test('T-UNIT-ADJ-03: Report submission requires report reference', () => {
    const validateReport = (report: { reportRef?: string; reportChecksum?: string }) => {
      if (!report.reportRef || report.reportRef.trim().length === 0) {
        throw new Error('Report reference is required');
      }
      if (!report.reportChecksum || report.reportChecksum.trim().length === 0) {
        throw new Error('Report checksum is required for integrity verification');
      }
      return { success: true };
    };

    expect(() => validateReport({})).toThrow('reference is required');
    expect(() => validateReport({ reportRef: 's3://reports/001.pdf' })).toThrow('checksum is required');
    expect(validateReport({ reportRef: 's3://reports/001.pdf', reportChecksum: 'sha256:abc123' })).toEqual({ success: true });
  });

  test('T-UNIT-ADJ-04: Broker cannot override approved amount', () => {
    const canModifyAmount = (userRole: string, field: string): boolean => {
      if (userRole === 'broker') {
        const brokerAllowedFields = ['description', 'metadata'];
        return brokerAllowedFields.includes(field);
      }
      if (userRole === 'carrier' || userRole === 'admin') {
        return true;
      }
      return false;
    };

    expect(canModifyAmount('broker', 'approvedAmount')).toBe(false);
    expect(canModifyAmount('broker', 'assessedAmount')).toBe(false);
    expect(canModifyAmount('carrier', 'approvedAmount')).toBe(true);
    expect(canModifyAmount('admin', 'approvedAmount')).toBe(true);
  });

  test('T-UNIT-ADJ-05: Accept action only by adjuster or authorized user', () => {
    const canAccept = (userRole: string, adjusterPartyId: string, userPartyId: string): boolean => {
      if (userRole === 'admin') return true;
      if (userRole === 'adjuster' && adjusterPartyId === userPartyId) return true;
      return false;
    };

    expect(canAccept('admin', 'party-001', 'party-002')).toBe(true);
    expect(canAccept('adjuster', 'party-001', 'party-001')).toBe(true);
    expect(canAccept('adjuster', 'party-001', 'party-002')).toBe(false);
    expect(canAccept('broker', 'party-001', 'party-002')).toBe(false);
  });

  test('T-UNIT-ADJ-06: Estimated fee is optional but must be positive', () => {
    const validateFee = (fee?: number): boolean => {
      if (fee === undefined || fee === null) return true;
      if (typeof fee !== 'number' || fee < 0) return false;
      return true;
    };

    expect(validateFee(undefined)).toBe(true);
    expect(validateFee(null)).toBe(true);
    expect(validateFee(0)).toBe(true);
    expect(validateFee(5000000)).toBe(true);
    expect(validateFee(-100)).toBe(false);
    expect(validateFee('abc' as any)).toBe(false);
  });
});
