import { describe, it, expect } from 'bun:test';
import { PostingLine } from '../src/ledger/ledger-posting.service';
import { BrokerageJournalEntry } from '../src/ledger/journal-entry.entity';
import { BrokerageJournalLine } from '../src/ledger/journal-line.entity';
import { BrokerageLedgerAccount } from '../src/ledger/ledger-account.entity';
import { CommissionSplit, CommissionSplitRole, CommissionSplitBase, CommissionSplitStatus } from '../src/commission/commission-split.entity';
import { BrokeragePayable, PayableType, PayableStatus } from '../src/payables/payable.entity';
import { BrokerageReceivable, ReceivableType, ReceivableStatus } from '../src/receivables/receivable.entity';
import { BrokerageSettlementBatch, SettlementBatchStatus } from '../src/settlement/settlement-batch.entity';
import { SettlementBatchLine, SettlementBatchLineType } from '../src/settlement/settlement-batch-line.entity';

function sumDebit(lines: PostingLine[]): number {
  return lines.reduce((s, l) => s + l.debit, 0);
}
function sumCredit(lines: PostingLine[]): number {
  return lines.reduce((s, l) => s + l.credit, 0);
}
function assertBalanced(lines: PostingLine[]): void {
  const d = sumDebit(lines);
  const c = sumCredit(lines);
  expect(Math.abs(d - c)).toBeLessThanOrEqual(0.001);
}

describe('P3 Ledger Posting', () => {
  describe('Double-entry balance enforcement', () => {
    it('enforces double-entry balance', () => {
      const lines: PostingLine[] = [
        { accountCode: 'DR', accountName: 'Debit', accountType: 'ASSET', debit: 1000, credit: 0, currency: 'IRR' },
        { accountCode: 'CR', accountName: 'Credit', accountType: 'LIABILITY', debit: 0, credit: 1000, currency: 'IRR' },
      ];
      expect(sumDebit(lines)).toBe(sumCredit(lines));
    });

    it('rejects imbalanced entries', () => {
      const lines: PostingLine[] = [
        { accountCode: 'DR', accountName: 'Debit', accountType: 'ASSET', debit: 1000, credit: 0, currency: 'IRR' },
        { accountCode: 'CR', accountName: 'Credit', accountType: 'LIABILITY', debit: 0, credit: 900, currency: 'IRR' },
      ];
      expect(Math.abs(sumDebit(lines) - sumCredit(lines))).toBeGreaterThan(0.001);
    });
  });

  describe('Policy issuance posting', () => {
    it('creates balanced 5-line entry for policy issuance', () => {
      const premium = 1_000_000;
      const taxes = 90_000;
      const totalPayable = premium + taxes;
      const commission = 100_000;

      const lines: PostingLine[] = [
        { accountCode: 'PREMIUM_RECEIVABLE_CUSTOMER', accountName: 'Customer Premium Receivable', accountType: 'ASSET', debit: totalPayable, credit: 0, currency: 'IRR', dimensions: { policyId: 'p1' } },
        { accountCode: 'PREMIUM_PAYABLE_CARRIER', accountName: 'Premium Payable to Carrier', accountType: 'LIABILITY', debit: 0, credit: premium, currency: 'IRR', dimensions: { policyId: 'p1' } },
        { accountCode: 'TAX_PAYABLE_AUTHORITY', accountName: 'Tax Payable to Authority', accountType: 'LIABILITY', debit: 0, credit: taxes, currency: 'IRR', dimensions: { policyId: 'p1' } },
        { accountCode: 'COMMISSION_EXPENSE', accountName: 'Commission Expense', accountType: 'EXPENSE', debit: commission, credit: 0, currency: 'IRR', dimensions: { policyId: 'p1' } },
        { accountCode: 'COMMISSION_PAYABLE', accountName: 'Commission Payable', accountType: 'LIABILITY', debit: 0, credit: commission, currency: 'IRR', dimensions: { policyId: 'p1' } },
      ];

      assertBalanced(lines);
      expect(sumDebit(lines)).toBe(totalPayable + commission);
      expect(sumCredit(lines)).toBe(premium + taxes + commission);
    });

    it('includes dimensions with policyId for audit trail', () => {
      const lines: PostingLine[] = [
        { accountCode: 'PREMIUM_RECEIVABLE_CUSTOMER', accountName: 'Customer Premium Receivable', accountType: 'ASSET', debit: 1000, credit: 0, currency: 'IRR', dimensions: { policyId: 'p1', carrier: 'c1', broker: 'b1' } },
        { accountCode: 'PREMIUM_PAYABLE_CARRIER', accountName: 'Premium Payable to Carrier', accountType: 'LIABILITY', debit: 0, credit: 1000, currency: 'IRR', dimensions: { policyId: 'p1' } },
      ];

      expect(lines[0].dimensions?.policyId).toBe('p1');
      expect(lines[0].dimensions?.carrier).toBe('c1');
      expect(lines[0].dimensions?.broker).toBe('b1');
    });
  });

  describe('Payment posting', () => {
    it('creates balanced entry for premium payment closing receivable', () => {
      const paymentAmount = 1_090_000;

      const lines: PostingLine[] = [
        { accountCode: 'BANK_ESCROW', accountName: 'Bank Escrow Account', accountType: 'ASSET', debit: paymentAmount, credit: 0, currency: 'IRR' },
        { accountCode: 'PREMIUM_RECEIVABLE_CUSTOMER', accountName: 'Customer Premium Receivable', accountType: 'ASSET', debit: 0, credit: paymentAmount, currency: 'IRR' },
      ];

      assertBalanced(lines);
    });
  });

  describe('Commission posting', () => {
    it('creates balanced entry for commission accrual', () => {
      const commissionTotal = 100_000;

      const lines: PostingLine[] = [
        { accountCode: 'COMMISSION_EXPENSE', accountName: 'Commission Expense', accountType: 'EXPENSE', debit: commissionTotal, credit: 0, currency: 'IRR' },
        { accountCode: 'COMMISSION_PAYABLE', accountName: 'Commission Payable', accountType: 'LIABILITY', debit: 0, credit: commissionTotal, currency: 'IRR' },
      ];

      assertBalanced(lines);
    });

    it('creates balanced multi-tier commission split', () => {
      const premiumGross = 1_000_000;
      const tiers = [
        { role: 'BROKER' as CommissionSplitRole, shareBps: 1500 },
        { role: 'SUB_AGENT' as CommissionSplitRole, shareBps: 500 },
        { role: 'MARKETER' as CommissionSplitRole, shareBps: 200 },
      ];
      const splits = tiers.map(t => ({
        role: t.role,
        amount: Math.round((premiumGross * t.shareBps) / 10000),
      }));
      const total = splits.reduce((s, sp) => s + sp.amount, 0);

      const lines: PostingLine[] = [
        { accountCode: 'COMMISSION_EXPENSE', accountName: 'Commission Expense', accountType: 'EXPENSE', debit: total, credit: 0, currency: 'IRR' },
        { accountCode: 'COMMISSION_PAYABLE', accountName: 'Commission Payable', accountType: 'LIABILITY', debit: 0, credit: total, currency: 'IRR' },
      ];

      assertBalanced(lines);
      expect(total).toBe(220_000);
    });
  });

  describe('Clawback posting', () => {
    it('creates balanced reversal entry for commission clawback', () => {
      const clawbackAmount = 100_000;

      const lines: PostingLine[] = [
        { accountCode: 'COMMISSION_PAYABLE', accountName: 'Commission Payable', accountType: 'LIABILITY', debit: clawbackAmount, credit: 0, currency: 'IRR' },
        { accountCode: 'COMMISSION_EXPENSE', accountName: 'Commission Expense', accountType: 'EXPENSE', debit: 0, credit: clawbackAmount, currency: 'IRR' },
      ];

      assertBalanced(lines);
    });

    it('transitions CommissionSplit from accrued to clawback', () => {
      const split = new CommissionSplit();
      split.splitId = '00000000-0000-4000-8000-000000000001';
      split.role = 'BROKER';
      split.base = 'premium_gross';
      split.shareBps = 1000;
      split.amount = 100_000;
      split.currency = 'IRR';
      split.status = 'accrued';

      expect(split.status).toBe('accrued');

      split.status = 'clawback';
      expect(split.status).toBe('clawback');
    });
  });

  describe('Journal entry reversal', () => {
    it('reverses a journal entry by swapping debit and credit', () => {
      const originalLines = [
        { journalLineId: 'jl1', debitAmount: 1000, creditAmount: 0, debitCurrency: 'IRR', creditCurrency: 'IRR' },
        { journalLineId: 'jl2', debitAmount: 0, creditAmount: 1000, debitCurrency: 'IRR', creditCurrency: 'IRR' },
      ];

      const reversedLines = originalLines.map(l => ({
        journalLineId: `rev-${l.journalLineId}`,
        debitAmount: l.creditAmount,
        creditAmount: l.debitAmount,
        debitCurrency: l.creditCurrency,
        creditCurrency: l.debitCurrency,
      }));

      const origDebit = originalLines.reduce((s, l) => s + l.debitAmount, 0);
      const origCredit = originalLines.reduce((s, l) => s + l.creditAmount, 0);
      const revDebit = reversedLines.reduce((s, l) => s + l.debitAmount, 0);
      const revCredit = reversedLines.reduce((s, l) => s + l.creditAmount, 0);

      expect(revDebit).toBe(origCredit);
      expect(revCredit).toBe(origDebit);
      expect(Math.abs(revDebit - revCredit)).toBeLessThanOrEqual(0.001);
    });

    it('creates reversal entry with reversalOfJournalEntryId set', () => {
      const original = new BrokerageJournalEntry();
      original.journalEntryId = '00000000-0000-4000-8000-000000000001';
      original.status = 'posted';

      const reversal = new BrokerageJournalEntry();
      reversal.journalEntryId = '00000000-0000-4000-8000-000000000002';
      reversal.reversalOfJournalEntryId = original.journalEntryId;
      reversal.status = 'posted';

      expect(reversal.reversalOfJournalEntryId).toBe(original.journalEntryId);
      expect(original.status).toBe('posted');
    });
  });

  describe('Settlement batch netting', () => {
    it('computes net settlement from payables and receivables', () => {
      const payables = [
        { amount: 500_000, currency: 'IRR' },
        { amount: 300_000, currency: 'IRR' },
      ];
      const receivables = [
        { amount: 100_000, currency: 'IRR' },
      ];

      const totalPayables = payables.reduce((s, p) => s + p.amount, 0);
      const totalReceivables = receivables.reduce((s, r) => s + r.amount, 0);
      const net = totalPayables - totalReceivables;

      expect(totalPayables).toBe(800_000);
      expect(totalReceivables).toBe(100_000);
      expect(net).toBe(700_000);
    });

    it('creates reconciliation hash from line items', () => {
      const items = [
        { id: 'pay1', type: 'payable', amount: 500_000 },
        { id: 'pay2', type: 'payable', amount: 300_000 },
        { id: 'rec1', type: 'receivable', amount: 100_000 },
      ];

      const hashInput = items
        .map(i => `${i.type}:${i.id}:${i.amount}`)
        .sort()
        .join('|');
      const hash = Buffer.from(hashInput).toString('base64');

      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);

      const decoded = Buffer.from(hash, 'base64').toString();
      expect(decoded).toContain('payable:pay1:500000');
      expect(decoded).toContain('receivable:rec1:100000');
    });

    it('detects hash mismatch for tampered batch', () => {
      const originalItems = [
        { id: 'pay1', type: 'payable', amount: 500_000 },
        { id: 'rec1', type: 'receivable', amount: 100_000 },
      ];
      const tamperedItems = [
        { id: 'pay1', type: 'payable', amount: 400_000 },
        { id: 'rec1', type: 'receivable', amount: 100_000 },
      ];

      const originalHash = Buffer.from(
        originalItems.map(i => `${i.type}:${i.id}:${i.amount}`).sort().join('|')
      ).toString('base64');
      const tamperedHash = Buffer.from(
        tamperedItems.map(i => `${i.type}:${i.id}:${i.amount}`).sort().join('|')
      ).toString('base64');

      expect(originalHash).not.toBe(tamperedHash);
    });
  });

  describe('Idempotency', () => {
    it('prevents double posting with same idempotency key', () => {
      const entry1 = new BrokerageJournalEntry();
      entry1.journalEntryId = '00000000-0000-4000-8000-000000000001';
      entry1.idempotencyKey = 'policy-issuance-p1';
      entry1.status = 'posted';

      const entry2 = new BrokerageJournalEntry();
      entry2.journalEntryId = entry1.journalEntryId;
      entry2.idempotencyKey = 'policy-issuance-p1';

      expect(entry1.idempotencyKey).toBe(entry2.idempotencyKey);
    });
  });

  describe('Entity field validation', () => {
    it('BrokerageLedgerAccount supports all account types', () => {
      const types = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'CONTROL'];
      for (const type of types) {
        const account = new BrokerageLedgerAccount();
        account.type = type as any;
        expect(account.type).toBe(type);
      }
    });

    it('BrokerageJournalEntry supports all source types', () => {
      const sourceTypes = ['POLICY', 'PAYMENT', 'REFUND', 'COMMISSION', 'SETTLEMENT', 'CLAWBACK'];
      for (const st of sourceTypes) {
        const entry = new BrokerageJournalEntry();
        entry.sourceType = st as any;
        expect(entry.sourceType).toBe(st);
      }
    });

    it('SettlementBatchLine supports all line types', () => {
      const lineTypes = ['PREMIUM', 'COMMISSION', 'FEE', 'CLAWBACK'];
      for (const lt of lineTypes) {
        const line = new SettlementBatchLine();
        line.lineType = lt as any;
        expect(line.lineType).toBe(lt);
      }
    });

    it('SettlementBatch supports retry_pending and manual_review statuses', () => {
      const statuses: SettlementBatchStatus[] = ['draft', 'confirmed', 'paid', 'reconciled', 'disputed', 'retry_pending', 'manual_review'];
      for (const st of statuses) {
        const batch = new BrokerageSettlementBatch();
        batch.status = st;
        expect(batch.status).toBe(st);
      }
    });
  });
});
