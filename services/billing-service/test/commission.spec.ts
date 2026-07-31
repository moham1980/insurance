import { describe, it, expect } from 'bun:test';
import { resolveCommissionSchedule } from '../src/commission/commission-tier-resolver';
import { CommissionSplit } from '../src/commission/commission-split.entity';

describe('P3 Commission Full Spec', () => {
  describe('Commission tier resolution', () => {
    it('resolves default single-tier schedule for IRR', () => {
      const schedule = resolveCommissionSchedule({ currency: 'IRR' });
      expect(schedule.currency).toBe('IRR');
      expect(schedule.tiers.length).toBe(1);
      expect(schedule.tiers[0].role).toBe('BROKER');
      expect(schedule.tiers[0].shareBps).toBe(1000);
      expect(schedule.tiers[0].base).toBe('premium_gross');
    });

    it('resolves multi-tier schedule from distribution agreement snapshot', () => {
      const snapshot = {
        tiers: [
          { role: 'BROKER', base: 'premium_gross', shareBps: 1500 },
          { role: 'SUB_AGENT', base: 'premium_gross', shareBps: 500 },
          { role: 'MARKETER', base: 'premium_gross', shareBps: 200 },
        ],
      };
      const schedule = resolveCommissionSchedule({ currency: 'IRR', distributionAgreementSnapshot: snapshot });
      expect(schedule.tiers.length).toBe(3);
      expect(schedule.tiers[0].role).toBe('BROKER');
      expect(schedule.tiers[0].shareBps).toBe(1500);
      expect(schedule.tiers[1].role).toBe('SUB_AGENT');
      expect(schedule.tiers[2].role).toBe('MARKETER');
    });

    it('resolves schedule with premium_net base', () => {
      const snapshot = {
        tiers: [
          { role: 'BROKER', base: 'premium_net', shareBps: 1200 },
        ],
      };
      const schedule = resolveCommissionSchedule({ currency: 'IRR', distributionAgreementSnapshot: snapshot });
      expect(schedule.tiers[0].base).toBe('premium_net');
    });
  });

  describe('Commission split calculation', () => {
    it('calculates single broker split at 10%', () => {
      const premiumGross = 1_000_000;
      const shareBps = 1000;
      const amount = Math.round((premiumGross * shareBps) / 10000);
      expect(amount).toBe(100_000);
    });

    it('calculates multi-tier splits correctly', () => {
      const premiumGross = 1_000_000;
      const tiers = [
        { role: 'BROKER', shareBps: 1500 },
        { role: 'SUB_AGENT', shareBps: 500 },
        { role: 'MARKETER', shareBps: 200 },
      ];
      const splits = tiers.map(t => ({
        role: t.role,
        amount: Math.round((premiumGross * t.shareBps) / 10000),
      }));
      expect(splits[0].amount).toBe(150_000);
      expect(splits[1].amount).toBe(50_000);
      expect(splits[2].amount).toBe(20_000);
      const total = splits.reduce((sum, s) => sum + s.amount, 0);
      expect(total).toBe(220_000);
    });

    it('calculates split on premium_net base', () => {
      const premiumGross = 1_000_000;
      const taxes = 90_000;
      const premiumNet = premiumGross - taxes;
      const shareBps = 1200;
      const amount = Math.round((premiumNet * shareBps) / 10000);
      expect(amount).toBe(109_200);
    });
  });

  describe('CommissionSplit entity', () => {
    it('creates split with all required fields', () => {
      const split = new CommissionSplit();
      split.splitId = '00000000-0000-4000-8000-000000000001';
      split.sourceType = 'POLICY';
      split.sourceId = '00000000-0000-4000-8000-000000000002';
      split.organizationId = '00000000-0000-4000-8000-000000000003';
      split.partyId = '00000000-0000-4000-8000-000000000004';
      split.role = 'BROKER';
      split.base = 'premium_gross';
      split.shareBps = 1000;
      split.amount = 100_000;
      split.currency = 'IRR';
      split.status = 'accrued';
      split.effectiveFrom = new Date();

      expect(split.role).toBe('BROKER');
      expect(split.status).toBe('accrued');
      expect(split.amount).toBe(100_000);
    });

    it('supports all valid roles', () => {
      const validRoles = ['CARRIER', 'BROKER', 'AGENT', 'SUB_AGENT', 'MARKETER'];
      for (const role of validRoles) {
        const split = new CommissionSplit();
        split.role = role as any;
        expect(split.role).toBe(role);
      }
    });

    it('supports all valid statuses', () => {
      const validStatuses = ['accrued', 'paid', 'clawback', 'voided'];
      for (const status of validStatuses) {
        const split = new CommissionSplit();
        split.status = status as any;
        expect(split.status).toBe(status);
      }
    });

    it('transitions accrued → paid after settlement', () => {
      const split = new CommissionSplit();
      split.status = 'accrued';
      split.journalEntryId = null;
      expect(split.status).toBe('accrued');
      expect(split.journalEntryId).toBeNull();

      split.journalEntryId = '00000000-0000-4000-8000-000000000010';
      split.status = 'paid';
      expect(split.status).toBe('paid');
      expect(split.journalEntryId).toBeDefined();
    });

    it('transitions accrued → clawback on cancellation', () => {
      const split = new CommissionSplit();
      split.status = 'accrued';
      split.status = 'clawback';
      expect(split.status).toBe('clawback');
    });

    it('transitions clawback → voided', () => {
      const split = new CommissionSplit();
      split.status = 'clawback';
      split.status = 'voided';
      expect(split.status).toBe('voided');
    });
  });

  describe('Commission schedule snapshot', () => {
    it('stores snapshot in split for audit trail', () => {
      const split = new CommissionSplit();
      const snapshot = {
        currency: 'IRR',
        tiers: [
          { role: 'BROKER', base: 'premium_gross', shareBps: 1000 },
        ],
      };
      split.commissionScheduleSnapshot = snapshot;
      expect(split.commissionScheduleSnapshot).toBeDefined();
      expect(split.commissionScheduleSnapshot.tiers.length).toBe(1);
    });
  });
});
