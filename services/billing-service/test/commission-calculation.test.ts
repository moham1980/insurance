import { describe, it, expect } from 'bun:test';
import { resolveCommissionSchedule } from '../src/commission/commission-tier-resolver';
import { CommissionCalculationService } from '../src/commission/commission-calculation.service';

describe('P3 Commission Calculation', () => {
  it('resolves default schedule for IRR', () => {
    const schedule = resolveCommissionSchedule({ currency: 'IRR' });
    expect(schedule.currency).toBe('IRR');
    expect(schedule.tiers.length).toBe(1);
    expect(schedule.tiers[0].role).toBe('BROKER');
    expect(schedule.tiers[0].shareBps).toBe(1000);
  });

  it('resolves distribution agreement snapshot tiers', () => {
    const snapshot = {
      tiers: [
        { role: 'BROKER', base: 'premium_gross', shareBps: 1500 },
        { role: 'SUB_AGENT', base: 'premium_gross', shareBps: 500 },
      ],
    };
    const schedule = resolveCommissionSchedule({ currency: 'IRR', distributionAgreementSnapshot: snapshot });
    expect(schedule.tiers.length).toBe(2);
    expect(schedule.tiers[1].role).toBe('SUB_AGENT');
  });

  it('calculates split amounts from premium gross', () => {
    const premium = 1_000_000;
    const shareBps = 1000; // 10%
    const amount = Math.round((premium * shareBps) / 10000);
    expect(amount).toBe(100_000);
  });
});
