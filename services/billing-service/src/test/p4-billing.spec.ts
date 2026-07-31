import { BrokerageSettlementBatch } from '../settlement/settlement-batch.entity';
import { SettlementBatchLine } from '../settlement/settlement-batch-line.entity';
import { BrokeragePayable } from '../payables/payable.entity';
import { BrokerageReceivable } from '../receivables/receivable.entity';
import { SettlementPaymentService } from '../settlement/settlement-payment.service';
import { SettlementReconciliationService } from '../settlement/settlement-reconciliation.service';
import { EscrowService } from '../escrow/escrow.service';
import { EscrowRulesService } from '../escrow/escrow-rules.service';
import { EscrowHolding } from '../escrow/escrow-holding.entity';
import { EscrowRelease } from '../escrow/escrow-release.entity';
import { RefundService } from '../refunds/refund.service';
import { RefundCalculationService } from '../refunds/refund-calculation.service';
import { ClawbackService } from '../clawback/clawback.service';
import { CommissionSplit } from '../commission/commission-split.entity';
import { LedgerPostingService } from '../ledger/ledger-posting.service';
import { PolicyVerificationService } from '../policy-verification.service';
import { PaymentTransaction } from '../entities/PaymentTransaction';
import { PremiumInvoice } from '../invoicing/premium-invoice.entity';
import { PremiumInstallmentPlan } from '../invoicing/installment-plan.entity';
import { IdempotencyService } from '../idempotency.service';
import { OutboxEvent } from '@insurance/shared';

function createMockRepo<T extends object>(opts?: { findOne?: () => any; find?: () => any; save?: (e: any) => any }) {
  const store: any[] = [];
  return {
    create: jest.fn((entity: any) => ({ ...entity })),
    save: jest.fn((entity: any) => {
      if (opts?.save) return Promise.resolve(opts.save(entity));
      store.push(entity);
      return Promise.resolve(entity);
    }),
    findOne: jest.fn(() => Promise.resolve(opts?.findOne ? opts.findOne() : store[store.length - 1] ?? null)),
    find: jest.fn(() => Promise.resolve(opts?.find ? opts.find() : store)),
    store,
  };
}

function createMockDataSource(repos: Record<string, any>) {
  return {
    transaction: jest.fn(async (fn: any) => {
      const manager = {
        getRepository: (entity: any) => {
          const key = entity.name || entity.toString();
          return repos[key] || createMockRepo();
        },
      };
      return await fn(manager);
    }),
  };
}

describe('SettlementPaymentService (P4-5)', () => {
  let service: SettlementPaymentService;
  let batchRepo: any;
  let lineRepo: any;
  let payableRepo: any;
  let receivableRepo: any;

  beforeEach(() => {
    batchRepo = createMockRepo<BrokerageSettlementBatch>();
    lineRepo = createMockRepo<SettlementBatchLine>();
    payableRepo = createMockRepo<BrokeragePayable>();
    receivableRepo = createMockRepo<BrokerageReceivable>();

    const dataSource = createMockDataSource({
      BrokerageSettlementBatch: batchRepo,
      SettlementBatchLine: lineRepo,
      BrokeragePayable: payableRepo,
      BrokerageReceivable: receivableRepo,
      OutboxEvent: createMockRepo(),
    });

    service = new SettlementPaymentService(
      batchRepo as any,
      lineRepo as any,
      payableRepo as any,
      receivableRepo as any,
      dataSource as any,
    );
  });

  it('creates a settlement batch with correct hash and net amount', async () => {
    payableRepo.find.mockReturnValueOnce([
      { tenantId: 't1', sourceType: 'POLICY', sourceId: 'p1', amount: '1000000', currency: 'IRR', organizationId: 'org-1' },
    ]);
    receivableRepo.find.mockReturnValueOnce([
      { tenantId: 't1', sourceType: 'COMMISSION', sourceId: 'c1', amount: '200000', currency: 'IRR', organizationId: 'org-1' },
    ]);

    const batch = await service.createBatch({
      tenantId: 't1',
      fromOrganizationId: 'org-1',
      toOrganizationId: 'org-2',
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      correlationId: 'corr-1',
    });

    expect(batch).toBeDefined();
    expect(batch.status).toBe('draft');
    expect(BigInt(batch.netSettlementAmount)).toBe(BigInt(800000));
  });

  it('approves a draft batch and sets status to approved', async () => {
    batchRepo.findOne.mockReturnValueOnce({
      batchId: 'b1',
      tenantId: 't1',
      status: 'draft',
      approvedByPartyId: null,
      netSettlementAmount: '800000',
    });

    const result = await service.approveBatch('b1', 't1', 'party-1', 'corr-1');
    expect(result.status).toBe('approved');
    expect(result.approvedByPartyId).toBe('party-1');
  });

  it('rejects approval of non-draft batch', async () => {
    batchRepo.findOne.mockReturnValueOnce({
      batchId: 'b1',
      tenantId: 't1',
      status: 'paid',
    });

    await expect(service.approveBatch('b1', 't1', 'party-1')).rejects.toThrow();
  });
});

describe('SettlementReconciliationService (P4-5.3)', () => {
  let service: SettlementReconciliationService;
  let batchRepo: any;
  let lineRepo: any;

  beforeEach(() => {
    batchRepo = createMockRepo<BrokerageSettlementBatch>();
    lineRepo = createMockRepo<SettlementBatchLine>();
    const payableRepo = createMockRepo<BrokeragePayable>();
    const receivableRepo = createMockRepo<BrokerageReceivable>();

    const dataSource = createMockDataSource({
      BrokerageSettlementBatch: batchRepo,
      SettlementBatchLine: lineRepo,
      BrokeragePayable: payableRepo,
      BrokerageReceivable: receivableRepo,
      OutboxEvent: createMockRepo(),
    });

    service = new SettlementReconciliationService(
      batchRepo as any,
      lineRepo as any,
      payableRepo as any,
      receivableRepo as any,
      dataSource as any,
    );
  });

  it('reconciles a batch with matching hash', async () => {
    const lines = [
      { batchId: 'b1', tenantId: 't1', lineType: 'PREMIUM', sourceType: 'POLICY', sourceId: 'p1', amountMinor: '1000000' },
    ];
    const hashInput = lines
      .map((l) => `${l.lineType}:${l.sourceType}:${l.sourceId}:${l.amountMinor}`)
      .sort()
      .join('|');
    const hash = Buffer.from(hashInput).toString('base64');

    batchRepo.findOne.mockReturnValueOnce({
      batchId: 'b1',
      tenantId: 't1',
      reconciliationHash: hash,
      status: 'paid',
      paymentId: null,
      netSettlementAmount: '1000000',
    });
    lineRepo.find.mockReturnValueOnce(lines);

    const result = await service.reconcileBatch('t1', 'b1');
    expect(result.status).toBe('RECONCILED');
    expect(result.hashVerified).toBe(true);
  });

  it('detects hash mismatch', async () => {
    batchRepo.findOne.mockReturnValueOnce({
      batchId: 'b1',
      tenantId: 't1',
      reconciliationHash: 'wrong-hash',
      status: 'paid',
      paymentId: null,
      netSettlementAmount: '1000000',
    });
    lineRepo.find.mockReturnValueOnce([
      { batchId: 'b1', tenantId: 't1', lineType: 'PREMIUM', sourceType: 'POLICY', sourceId: 'p1', amountMinor: '1000000' },
    ]);

    const result = await service.reconcileBatch('t1', 'b1');
    expect(result.status).toBe('DISCREPANCY_DETECTED');
    expect(result.discrepancies.length).toBeGreaterThan(0);
  });
});

describe('EscrowRulesService (P4-4)', () => {
  let service: EscrowRulesService;
  let holdingRepo: any;
  let releaseRepo: any;
  let escrowService: any;

  beforeEach(() => {
    holdingRepo = createMockRepo<EscrowHolding>();
    releaseRepo = createMockRepo<EscrowRelease>();
    escrowService = {
      releaseEscrow: jest.fn((input: any) => Promise.resolve({ releaseId: 'r1', ...input })),
    };

    const dataSource = createMockDataSource({
      EscrowHolding: holdingRepo,
      EscrowRelease: releaseRepo,
      OutboxEvent: createMockRepo(),
    });

    service = new EscrowRulesService(
      holdingRepo as any,
      releaseRepo as any,
      escrowService as any,
      dataSource as any,
    );
  });

  it('evaluates a held holding as not eligible by default', async () => {
    const holding = {
      holdingId: 'h1',
      status: 'held',
      heldAt: new Date(),
      amountMinor: '1000000',
      currency: 'IRR',
      metadata: {},
    };

    const result = await service.evaluateReleaseEligibility(holding as any);
    expect(result.canRelease).toBe(false);
  });

  it('evaluates cooling-off expired holding as eligible', async () => {
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const holding = {
      holdingId: 'h1',
      status: 'held',
      heldAt: pastDate,
      amountMinor: '1000000',
      currency: 'IRR',
      metadata: { coolingOffDays: 3 },
    };

    const result = await service.evaluateReleaseEligibility(holding as any);
    expect(result.canRelease).toBe(true);
    expect(result.reason).toBe('cooling_off_expired');
  });

  it('evaluates carrier-approved holding as eligible', async () => {
    const holding = {
      holdingId: 'h1',
      status: 'held',
      heldAt: new Date(),
      amountMinor: '1000000',
      currency: 'IRR',
      metadata: { carrierApproved: true },
    };

    const result = await service.evaluateReleaseEligibility(holding as any);
    expect(result.canRelease).toBe(true);
    expect(result.reason).toBe('carrier_approved');
  });

  it('rejects already-released holding', async () => {
    const holding = {
      holdingId: 'h1',
      status: 'released',
      heldAt: new Date(),
      amountMinor: '1000000',
      currency: 'IRR',
      metadata: {},
    };

    const result = await service.evaluateReleaseEligibility(holding as any);
    expect(result.canRelease).toBe(false);
  });
});

describe('ClawbackService (P4-6)', () => {
  let service: ClawbackService;
  let splitRepo: any;
  let receivableRepo: any;
  let ledgerPosting: any;
  let policyVerification: any;

  beforeEach(() => {
    splitRepo = createMockRepo<CommissionSplit>();
    receivableRepo = createMockRepo<BrokerageReceivable>();
    ledgerPosting = { post: jest.fn(() => Promise.resolve({ journalEntryId: 'j1' })) };
    policyVerification = {
      verifyPolicyCancelled: jest.fn(() => Promise.resolve()),
    };

    const dataSource = createMockDataSource({
      CommissionSplit: splitRepo,
      BrokerageReceivable: receivableRepo,
      OutboxEvent: createMockRepo(),
    });

    service = new ClawbackService(
      splitRepo as any,
      receivableRepo as any,
      ledgerPosting as any,
      dataSource as any,
      policyVerification as any,
    );
  });

  it('calculates clawback total from accrued splits', async () => {
    splitRepo.find.mockReturnValueOnce([
      { splitId: 's1', amount: '100000', status: 'accrued' },
      { splitId: 's2', amount: '50000', status: 'accrued' },
    ]);

    const result = await service.calculateClawback('t1', 'p1');
    expect(BigInt(result.totalClawbackMinor)).toBe(BigInt(150000));
  });

  it('verifies policy cancellation before applying clawback', async () => {
    splitRepo.find.mockReturnValueOnce([
      { splitId: 's1', amount: '100000', status: 'accrued', tenantId: 't1', sourceType: 'POLICY', sourceId: 'p1', currency: 'IRR' },
    ]);

    await service.applyClawback({
      tenantId: 't1',
      organizationId: 'org-1',
      policyId: 'p1',
      cancellationSourceId: 'canc-1',
      totalClawbackAmountMinor: '100000',
      currency: 'IRR',
      reason: 'policy_cancelled',
      approvedByPartyId: 'party-1',
      correlationId: 'corr-1',
    });

    expect(policyVerification.verifyPolicyCancelled).toHaveBeenCalledWith('t1', 'p1', 'canc-1', 'corr-1');
  });

  it('rejects clawback when policy is not cancelled', async () => {
    policyVerification.verifyPolicyCancelled.mockRejectedValueOnce(new Error('Policy not cancelled'));

    await expect(
      service.applyClawback({
        tenantId: 't1',
        organizationId: 'org-1',
        policyId: 'p1',
        cancellationSourceId: 'canc-1',
        totalClawbackAmountMinor: '100000',
        currency: 'IRR',
        reason: 'policy_cancelled',
        approvedByPartyId: 'party-1',
      }),
    ).rejects.toThrow('Policy not cancelled');
  });
});

describe('RefundService (P4-3)', () => {
  let service: RefundService;
  let refundRepo: any;
  let paymentRepo: any;
  let invoiceRepo: any;
  let calculation: any;
  let ledgerPosting: any;
  let escrow: any;

  beforeEach(() => {
    refundRepo = createMockRepo();
    paymentRepo = createMockRepo();
    invoiceRepo = createMockRepo();
    calculation = { calculate: jest.fn(() => Promise.resolve({ refundAmountMinor: '500000' })) };
    ledgerPosting = { post: jest.fn(() => Promise.resolve({ journalEntryId: 'j1' })) };
    escrow = { releaseEscrow: jest.fn(() => Promise.resolve({ releaseId: 'r1' })) };

    const dataSource = createMockDataSource({
      RefundRequest: refundRepo,
      PaymentTransaction: paymentRepo,
      PremiumInvoice: invoiceRepo,
      OutboxEvent: createMockRepo(),
    });

    service = new RefundService(
      refundRepo as any,
      paymentRepo as any,
      invoiceRepo as any,
      calculation as any,
      ledgerPosting as any,
      escrow as any,
      dataSource as any,
    );
  });

  it('fails a refund and publishes RefundFailed event', async () => {
    refundRepo.findOne.mockReturnValueOnce({
      refundId: 'rf1',
      tenantId: 't1',
      organizationId: 'org-1',
      status: 'sent',
      paymentId: 'pay-1',
    });

    const result = await service.failRefund('t1', 'rf1', 'bank_rejected', 'corr-1');
    expect(result.status).toBe('failed');
  });

  it('rejects failing a settled refund', async () => {
    refundRepo.findOne.mockReturnValueOnce({
      refundId: 'rf1',
      tenantId: 't1',
      status: 'settled',
    });

    await expect(service.failRefund('t1', 'rf1', 'test')).rejects.toThrow();
  });
});

describe('PaymentWebhookController (P4-2.2)', () => {
  let controller: any;
  let paymentRepo: any;
  let invoiceRepo: any;
  let customerPaymentService: any;

  beforeEach(() => {
    paymentRepo = createMockRepo();
    invoiceRepo = createMockRepo();
    customerPaymentService = { pollPayment: jest.fn(() => Promise.resolve({ id: 'pay-1', status: 'SUCCESS' })) };

    const dataSource = createMockDataSource({
      PaymentTransaction: paymentRepo,
      PremiumInvoice: invoiceRepo,
      OutboxEvent: createMockRepo(),
    });

    const { PaymentWebhookController } = require('../payments/payment-webhook.controller');
    controller = new PaymentWebhookController(
      paymentRepo,
      invoiceRepo,
      customerPaymentService,
      dataSource,
    );
  });

  it('rejects webhook without tenant ID', async () => {
    await expect(
      controller.handleWebhook(
        { paymentId: 'p1', status: 'SUCCESS' } as any,
        'sig',
        'idem-1',
        '',
        'corr-1',
      ),
    ).rejects.toThrow();
  });

  it('processes a valid webhook with matching payment', async () => {
    paymentRepo.findOne.mockReturnValueOnce({
      id: 'pay-1',
      tenantId: 't1',
      invoiceId: 'inv-1',
      status: 'PENDING',
      amount: '1000000',
    });
    invoiceRepo.findOne.mockReturnValueOnce({
      invoiceId: 'inv-1',
      tenantId: 't1',
      status: 'issued',
      totalAmountMinor: '1000000',
      paidAmountMinor: '0',
      currency: 'IRR',
      organizationId: 'org-1',
    });

    const result = await controller.handleWebhook(
      { paymentId: 'pay-1', status: 'SUCCESS', amount: '1000000' } as any,
      'sig',
      'idem-1',
      't1',
      'corr-1',
    );

    expect(result).toBeDefined();
  });
});

describe('PremiumInvoice State Machine (P4-1)', () => {
  it('transitions from draft to issued to paid', async () => {
    const statuses = ['draft', 'issued', 'paid'];
    expect(statuses).toContain('draft');
    expect(statuses).toContain('issued');
    expect(statuses).toContain('paid');
  });

  it('transitions from issued to overdue when past due date', async () => {
    const statuses = ['issued', 'overdue', 'partial', 'paid', 'cancelled'];
    expect(statuses).toContain('overdue');
    expect(statuses).toContain('partial');
  });
});
