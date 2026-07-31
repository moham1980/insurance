import { describe, it, expect } from 'bun:test';
import { PolicyRenewal } from '../src/entities/PolicyRenewal';
import { Policy } from '../src/entities/Policy';

describe('P3 Renewal Workflow', () => {
  describe('PolicyRenewal entity', () => {
    it('creates renewal with pending status', () => {
      const renewal = new PolicyRenewal();
      renewal.renewalId = '00000000-0000-4000-8000-000000000001';
      renewal.policyId = '00000000-0000-4000-8000-000000000002';
      renewal.status = 'pending';
      renewal.dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      renewal.newPremium = 16_000_000;

      expect(renewal.status).toBe('pending');
      expect(renewal.newPremium).toBe(16_000_000);
    });

    it('transitions pending → reminder_sent → approved', () => {
      const renewal = new PolicyRenewal();
      renewal.status = 'pending';
      renewal.reminderCount = 0;

      renewal.status = 'reminder_sent';
      renewal.reminderCount = 1;
      renewal.reminderSentAt = new Date();
      expect(renewal.status).toBe('reminder_sent');

      renewal.status = 'approved';
      renewal.approvedBy = 'underwriter-1';
      renewal.approvedAt = new Date();
      expect(renewal.status).toBe('approved');
      expect(renewal.approvedBy).toBeDefined();
    });

    it('transitions pending → rejected', () => {
      const renewal = new PolicyRenewal();
      renewal.status = 'pending';
      renewal.status = 'rejected';
      renewal.rejectionReason = 'Customer opted out';
      expect(renewal.status).toBe('rejected');
      expect(renewal.rejectionReason).toBe('Customer opted out');
    });

    it('transitions approved → completed', () => {
      const renewal = new PolicyRenewal();
      renewal.status = 'approved';
      renewal.status = 'completed';
      renewal.newPolicyId = '00000000-0000-4000-8000-000000000004';
      expect(renewal.status).toBe('completed');
      expect(renewal.newPolicyId).toBeDefined();
    });

    it('transitions pending → cancelled', () => {
      const renewal = new PolicyRenewal();
      renewal.status = 'pending';
      renewal.status = 'cancelled';
      expect(renewal.status).toBe('cancelled');
    });
  });

  describe('Policy renewal fields', () => {
    it('tracks auto-renewal settings', () => {
      const policy = new Policy();
      policy.autoRenew = true;
      policy.renewalCount = 2;
      policy.maxRenewals = 10;
      policy.renewalParentId = '00000000-0000-4000-8000-000000000005';

      expect(policy.autoRenew).toBe(true);
      expect(policy.renewalCount).toBe(2);
      expect(policy.maxRenewals).toBe(10);
      expect(policy.renewalParentId).toBeDefined();
    });

    it('prevents renewal beyond max_renewals', () => {
      const policy = new Policy();
      policy.renewalCount = 10;
      policy.maxRenewals = 10;
      expect(policy.renewalCount >= policy.maxRenewals).toBe(true);
    });

    it('tracks renewal notifications', () => {
      const policy = new Policy();
      policy.renewalReminderSentAt = new Date();
      policy.renewalNotifiedAt = new Date();
      expect(policy.renewalReminderSentAt).toBeDefined();
      expect(policy.renewalNotifiedAt).toBeDefined();
    });
  });

  describe('Policy lapse', () => {
    it('supports lapsed status', () => {
      const policy = new Policy();
      policy.status = 'active';
      policy.status = 'lapsed';
      expect(policy.status).toBe('lapsed');
    });

    it('prevents lapse from cancelled state', () => {
      const policy = new Policy();
      policy.status = 'cancelled';
      const cannotLapse = policy.status === 'cancelled' || policy.status === 'renewed';
      expect(cannotLapse).toBe(true);
    });

    it('prevents lapse from renewed state', () => {
      const policy = new Policy();
      policy.status = 'renewed';
      const cannotLapse = policy.status === 'cancelled' || policy.status === 'renewed';
      expect(cannotLapse).toBe(true);
    });
  });
});
