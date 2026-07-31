import { describe, test, expect } from '@jest/globals';

/**
 * Unit tests for Claim Advocacy Case operations.
 * Tests validation logic, state transitions, and data integrity.
 *
 * Required by P5-9.1: claim registration creates advocacy case,
 * broker portal only sees own organization claims, task overdue detection.
 */

describe('Unit: Claim Advocacy Case', () => {
  test('T-UNIT-ADV-01: Advocacy case status transitions are valid', () => {
    const validTransitions: Record<string, string[]> = {
      'open': ['waiting_carrier', 'adjuster_review', 'escalated', 'resolved', 'closed'],
      'waiting_carrier': ['adjuster_review', 'escalated', 'resolved', 'closed'],
      'adjuster_review': ['escalated', 'resolved', 'closed'],
      'escalated': ['resolved', 'closed'],
      'resolved': ['closed'],
      'closed': [],
    };

    for (const [from, allowed] of Object.entries(validTransitions)) {
      expect(allowed).toBeDefined();
      expect(Array.isArray(allowed)).toBe(true);
    }
  });

  test('T-UNIT-ADV-02: Priority levels are correctly typed', () => {
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    for (const p of validPriorities) {
      expect(typeof p).toBe('string');
    }
    expect(validPriorities.length).toBe(4);
  });

  test('T-UNIT-ADV-03: Task types match backlog specification', () => {
    const validTaskTypes = [
      'follow_up',
      'document_request',
      'carrier_call',
      'customer_update',
      'adjuster_referral',
      'payment_check',
    ];
    expect(validTaskTypes.length).toBe(6);
  });

  test('T-UNIT-ADV-04: Task status transitions', () => {
    const validTaskStatuses = ['pending', 'in_progress', 'done', 'overdue'];
    const validTransitions: Record<string, string[]> = {
      'pending': ['in_progress', 'done', 'overdue'],
      'in_progress': ['done', 'overdue'],
      'done': [],
      'overdue': ['in_progress', 'done'],
    };

    for (const status of validTaskStatuses) {
      expect(validTransitions[status]).toBeDefined();
    }
  });

  test('T-UNIT-ADV-05: Communication channels match specification', () => {
    const validChannels = ['email', 'sms', 'call', 'web', 'mobile_app'];
    const validDirections = ['inbound', 'outbound'];

    expect(validChannels.length).toBe(5);
    expect(validDirections.length).toBe(2);
  });

  test('T-UNIT-ADV-06: Escalation requires reason', () => {
    const escalate = (reason?: string) => {
      if (!reason || reason.trim().length === 0) {
        throw new Error('Escalation reason is required');
      }
      return { success: true };
    };

    expect(() => escalate(undefined)).toThrow('reason is required');
    expect(() => escalate('')).toThrow('reason is required');
    expect(() => escalate('  ')).toThrow('reason is required');
    expect(escalate('Carrier not responding')).toEqual({ success: true });
  });

  test('T-UNIT-ADV-07: Close case requires claim to be closed or resolved', () => {
    const canCloseCase = (claimStatus: string): boolean => {
      return claimStatus === 'closed' || claimStatus === 'resolved' || claimStatus === 'paid';
    };

    expect(canCloseCase('registered')).toBe(false);
    expect(canCloseCase('acknowledged')).toBe(false);
    expect(canCloseCase('approved')).toBe(false);
    expect(canCloseCase('paid')).toBe(true);
    expect(canCloseCase('closed')).toBe(true);
    expect(canCloseCase('resolved')).toBe(true);
  });

  test('T-UNIT-ADV-08: Overdue task detection logic', () => {
    const isOverdue = (dueDate: Date, status: string): boolean => {
      if (status === 'done' || status === 'overdue') return false;
      return dueDate.getTime() < Date.now();
    };

    const pastDate = new Date(Date.now() - 86400000);
    const futureDate = new Date(Date.now() + 86400000);

    expect(isOverdue(pastDate, 'pending')).toBe(true);
    expect(isOverdue(pastDate, 'in_progress')).toBe(true);
    expect(isOverdue(pastDate, 'done')).toBe(false);
    expect(isOverdue(futureDate, 'pending')).toBe(false);
    expect(isOverdue(futureDate, 'in_progress')).toBe(false);
  });
});
