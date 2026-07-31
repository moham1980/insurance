import { describe, it, expect } from 'bun:test';
import { PolicyLedgerReconciliation } from '../src/reconciliation/policy-ledger-reconciliation';
import { PaymentLedgerReconciliation } from '../src/reconciliation/payment-ledger-reconciliation';

describe('PolicyLedgerReconciliation', () => {
  it('reconciles with no discrepancy when amounts match', async () => {
    const ds: any = {
      getRepository: () => ({
        findOne: async () => null,
        create: (o: any) => ({ ...o }),
        save: async (o: any) => o,
      }),
      createQueryBuilder: () => ({
        select: function () { return this; },
        addSelect: function () { return this; },
        from: function () { return this; },
        where: function () { return this; },
        andWhere: function () { return this; },
        getRawOne: async () => ({ totalPolicies: '10', totalPremiumInPolicy: '1000000', totalPremiumInLedger: '1000000' }),
      }),
    };

    const recon = new PolicyLedgerReconciliation(ds);
    const result = await recon.reconcile('t1');
    expect(result.discrepancy).toBe(0);
    expect(result.issuesCreated).toBe(0);
  });

  it('creates issue when discrepancy exists', async () => {
    const ds: any = {
      getRepository: () => ({
        findOne: async () => null,
        create: (o: any) => ({ ...o, issueId: 'dq-1' }),
        save: async (o: any) => o,
      }),
      createQueryBuilder: () => ({
        select: function () { return this; },
        addSelect: function () { return this; },
        from: function () { return this; },
        where: function () { return this; },
        andWhere: function () { return this; },
        getRawOne: async (ctx: any) => {
          if (ctx && ctx.totalPremiumInLedger !== undefined) {
            return { totalPremiumInLedger: '900000' };
          }
          return { totalPolicies: '10', totalPremiumInPolicy: '1000000' };
        },
      }),
    };

    const recon = new PolicyLedgerReconciliation(ds);
    const result = await recon.reconcile('t1');
    expect(result.discrepancy).toBe(100000);
    expect(result.issuesCreated).toBe(1);
  });
});

describe('PaymentLedgerReconciliation', () => {
  it('reconciles claim payments with ledger', async () => {
    const ds: any = {
      getRepository: () => ({
        findOne: async () => null,
        create: (o: any) => ({ ...o, issueId: 'dq-2' }),
        save: async (o: any) => o,
      }),
      createQueryBuilder: () => ({
        select: function () { return this; },
        addSelect: function () { return this; },
        from: function () { return this; },
        where: function () { return this; },
        andWhere: function () { return this; },
        getRawOne: async () => ({
          totalClaimPayments: '5',
          totalPaidInClaims: '500000',
          totalPaidInLedger: '500000',
        }),
      }),
    };

    const recon = new PaymentLedgerReconciliation(ds);
    const result = await recon.reconcile('t1');
    expect(result.discrepancy).toBe(0);
    expect(result.issuesCreated).toBe(0);
  });
});
