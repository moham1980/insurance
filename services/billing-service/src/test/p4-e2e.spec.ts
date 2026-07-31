import { PremiumInvoiceService, CreatePremiumInvoiceInput } from '../invoicing/invoice.service';
import { PremiumInvoice } from '../invoicing/premium-invoice.entity';
import { PremiumInvoiceLine, InvoiceLineType } from '../invoicing/invoice-line.entity';
import { PremiumInstallmentPlan } from '../invoicing/installment-plan.entity';
import { CustomerPaymentService } from '../payments/customer-payment.service';
import { PaymentTransaction } from '../entities/PaymentTransaction';
import { EscrowService } from '../escrow/escrow.service';
import { EscrowRulesService } from '../escrow/escrow-rules.service';
import { EscrowHolding } from '../escrow/escrow-holding.entity';
import { EscrowRelease } from '../escrow/escrow-release.entity';
import { SettlementPaymentService } from '../settlement/settlement-payment.service';
import { SettlementReconciliationService } from '../settlement/settlement-reconciliation.service';
import { BrokerageSettlementBatch } from '../settlement/settlement-batch.entity';
import { SettlementBatchLine } from '../settlement/settlement-batch-line.entity';
import { BrokeragePayable } from '../payables/payable.entity';
import { BrokerageReceivable } from '../receivables/receivable.entity';
import { ClawbackService } from '../clawback/clawback.service';
import { CommissionSplit } from '../commission/commission-split.entity';
import { LedgerPostingService } from '../ledger/ledger-posting.service';
import { PolicyVerificationService } from '../policy-verification.service';
import { RefundService } from '../refunds/refund.service';
import { RefundCalculationService } from '../refunds/refund-calculation.service';
import { IdempotencyService } from '../idempotency.service';
import { OutboxEvent } from '@insurance/shared';

function createMockRepo<T extends object>(opts?: { findOne?: () => any; find?: () => any }) {
  const store: any[] = [];
  return {
    create: jest.fn((entity: any) => ({ ...entity })),
    save: jest.fn((entity: any) => {
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

describe('P4 E2E: Invoice → Payment → Escrow → Settlement', () => {
  let invoiceService: PremiumInvoiceService;
  let customerPaymentService: CustomerPaymentService;
  let escrowService: EscrowService;
  let escrowRulesService: EscrowRulesService;
  let settlementService: SettlementPaymentService;
  let reconciliationService: SettlementReconciliationService;

  let invoiceRepo: any;
  let lineRepo: any;
  let planRepo: any;
  let paymentRepo: any;
  let holdingRepo: any;
  let releaseRepo: any;
  let batchRepo: any;
  let batchLineRepo: any;
  let payableRepo: any;
  let receivableRepo: any;

  beforeEach(() => {
    invoiceRepo = createMockRepo<PremiumInvoice>();
    lineRepo = createMockRepo<PremiumInvoiceLine>();
    planRepo = createMockRepo<PremiumInstallmentPlan>();
    paymentRepo = createMockRepo<PaymentTransaction>();
    holdingRepo = createMockRepo<EscrowHolding>();
    releaseRepo = createMockRepo<EscrowRelease>();
    batchRepo = createMockRepo<BrokerageSettlementBatch>();
    batchLineRepo = createMockRepo<SettlementBatchLine>();
    payableRepo = createMockRepo<BrokeragePayable>();
    receivableRepo = createMockRepo<BrokerageReceivable>();

    const dataSource = createMockDataSource({
      PremiumInvoice: invoiceRepo,
      PremiumInvoiceLine: lineRepo,
      PremiumInstallmentPlan: planRepo,
      PaymentTransaction: paymentRepo,
      EscrowHolding: holdingRepo,
      EscrowRelease: releaseRepo,
      BrokerageSettlementBatch: batchRepo,
      SettlementBatchLine: batchLineRepo,
      BrokeragePayable: payableRepo,
      BrokerageReceivable: receivableRepo,
      OutboxEvent: createMockRepo(),
    });

    const idempotencyService = {
      getExisting: jest.fn(() => Promise.resolve(null)),
      store: jest.fn(() => Promise.resolve()),
    } as any;

    const ledgerPosting = { post: jest.fn(() => Promise.resolve({ journalEntryId: 'j1' })) } as any;

    const policyVerification = {
      verifyPolicyForInvoice: jest.fn(() => Promise.resolve()),
      verifyPolicyCancelled: jest.fn(() => Promise.resolve()),
    } as any;

    invoiceService = new PremiumInvoiceService(
      invoiceRepo as any,
      lineRepo as any,
      planRepo as any,
      dataSource as any,
      idempotencyService,
      policyVerification,
    );

    escrowService = new EscrowService(holdingRepo as any, releaseRepo as any);

    customerPaymentService = new CustomerPaymentService(
      invoiceRepo as any,
      planRepo as any,
      paymentRepo as any,
      dataSource as any,
      idempotencyService,
      ledgerPosting,
      escrowService as any,
    );

    escrowRulesService = new EscrowRulesService(
      holdingRepo as any,
      releaseRepo as any,
      escrowService as any,
      dataSource as any,
    );

    settlementService = new SettlementPaymentService(
      batchRepo as any,
      batchLineRepo as any,
      payableRepo as any,
      receivableRepo as any,
      dataSource as any,
    );

    reconciliationService = new SettlementReconciliationService(
      batchRepo as any,
      batchLineRepo as any,
      payableRepo as any,
      receivableRepo as any,
      dataSource as any,
    );
  });

  it('creates invoice, issues it, and verifies state', async () => {
    const input: CreatePremiumInvoiceInput = {
      tenantId: 't1',
      organizationId: 'org-1',
      policyId: 'p1',
      customerPartyId: 'c1',
      invoiceNumber: 'INV-E2E-001',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      totalPremium: { amountMinor: '1000000', currency: 'IRR' },
      taxes: { amountMinor: '100000', currency: 'IRR' },
      fees: [],
      totalAmount: { amountMinor: '1100000', currency: 'IRR' },
      currency: 'IRR',
      paymentMethod: 'card',
      lines: [
        { lineType: InvoiceLineType.PREMIUM, description: 'Premium', amount: { amountMinor: '1000000', currency: 'IRR' }, taxAmount: { amountMinor: '100000', currency: 'IRR' } },
      ],
    };

    const invoice = await invoiceService.createInvoice(input);
    expect(invoice.status).toBe('draft');
    expect(invoice.totalAmountMinor).toBe('1100000');

    const issued = await invoiceService.issueInvoice('t1', invoice.invoiceId);
    expect(issued.status).toBe('issued');
  });

  it('creates settlement batch and reconciles it', async () => {
    payableRepo.find.mockReturnValueOnce([
      { tenantId: 't1', sourceType: 'POLICY', sourceId: 'p1', amount: '1000000', currency: 'IRR', organizationId: 'org-1' },
    ]);
    receivableRepo.find.mockReturnValueOnce([
      { tenantId: 't1', sourceType: 'COMMISSION', sourceId: 'c1', amount: '200000', currency: 'IRR', organizationId: 'org-1' },
    ]);

    const batch = await settlementService.createBatch({
      tenantId: 't1',
      fromOrganizationId: 'org-1',
      toOrganizationId: 'org-2',
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      correlationId: 'corr-e2e-1',
    });

    expect(BigInt(batch.netSettlementAmount)).toBe(BigInt(800000));

    const approved = await settlementService.approveBatch(batch.batchId, 't1', 'party-1', 'corr-1');
    expect(approved.status).toBe('approved');

    const lines = [
      { batchId: batch.batchId, tenantId: 't1', lineType: 'PREMIUM', sourceType: 'POLICY', sourceId: 'p1', amountMinor: '1000000' },
      { batchId: batch.batchId, tenantId: 't1', lineType: 'COMMISSION', sourceType: 'COMMISSION', sourceId: 'c1', amountMinor: '200000' },
    ];
    const hashInput = lines
      .map((l) => `${l.lineType}:${l.sourceType}:${l.sourceId}:${l.amountMinor}`)
      .sort()
      .join('|');
    const hash = Buffer.from(hashInput).toString('base64');

    batchRepo.findOne.mockReturnValueOnce({
      batchId: batch.batchId,
      tenantId: 't1',
      reconciliationHash: hash,
      status: 'paid',
      paymentId: null,
      netSettlementAmount: '800000',
    });
    batchLineRepo.find.mockReturnValueOnce(lines);
    payableRepo.findOne.mockReturnValueOnce({ amount: '1000000' });
    receivableRepo.findOne.mockReturnValueOnce({ amount: '200000' });

    const reconResult = await reconciliationService.reconcileBatch('t1', batch.batchId);
    expect(reconResult.status).toBe('RECONCILED');
  });

  it('evaluates escrow release after cooling-off period', async () => {
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const holding = {
      holdingId: 'h1',
      status: 'held',
      heldAt: pastDate,
      amountMinor: '500000',
      currency: 'IRR',
      metadata: { coolingOffDays: 3 },
    };

    const evaluation = await escrowRulesService.evaluateReleaseEligibility(holding as any);
    expect(evaluation.canRelease).toBe(true);
    expect(evaluation.reason).toBe('cooling_off_expired');
  });
});

describe('P4 E2E: Cancellation → Refund → Clawback', () => {
  let clawbackService: ClawbackService;
  let refundService: RefundService;
  let splitRepo: any;
  let refundRepo: any;
  let policyVerification: any;

  beforeEach(() => {
    splitRepo = createMockRepo<CommissionSplit>();
    refundRepo = createMockRepo();
    const receivableRepo = createMockRepo<BrokerageReceivable>();
    const paymentRepo = createMockRepo();
    const invoiceRepo = createMockRepo();

    policyVerification = {
      verifyPolicyCancelled: jest.fn(() => Promise.resolve()),
    };

    const ledgerPosting = { post: jest.fn(() => Promise.resolve({ journalEntryId: 'j1' })) } as any;
    const calculation = { calculate: jest.fn(() => Promise.resolve({ refundAmountMinor: '500000' })) } as any;
    const escrow = { releaseEscrow: jest.fn(() => Promise.resolve({ releaseId: 'r1' })) } as any;

    const dataSource = createMockDataSource({
      CommissionSplit: splitRepo,
      BrokerageReceivable: receivableRepo,
      RefundRequest: refundRepo,
      PaymentTransaction: paymentRepo,
      PremiumInvoice: invoiceRepo,
      OutboxEvent: createMockRepo(),
    });

    clawbackService = new ClawbackService(
      splitRepo as any,
      receivableRepo as any,
      ledgerPosting,
      dataSource as any,
      policyVerification as any,
    );

    refundService = new RefundService(
      refundRepo as any,
      paymentRepo as any,
      invoiceRepo as any,
      calculation,
      ledgerPosting,
      escrow,
      dataSource as any,
    );
  });

  it('verifies policy cancellation then applies clawback', async () => {
    splitRepo.find.mockReturnValueOnce([
      { splitId: 's1', amount: '100000', status: 'accrued', tenantId: 't1', sourceType: 'POLICY', sourceId: 'p1', currency: 'IRR' },
      { splitId: 's2', amount: '50000', status: 'accrued', tenantId: 't1', sourceType: 'POLICY', sourceId: 'p1', currency: 'IRR' },
    ]);

    const result = await clawbackService.applyClawback({
      tenantId: 't1',
      organizationId: 'org-1',
      policyId: 'p1',
      cancellationSourceId: 'canc-1',
      totalClawbackAmountMinor: '150000',
      currency: 'IRR',
      reason: 'policy_cancelled',
      approvedByPartyId: 'party-1',
      correlationId: 'corr-e2e-clawback',
    });

    expect(policyVerification.verifyPolicyCancelled).toHaveBeenCalledWith('t1', 'p1', 'canc-1', 'corr-e2e-clawback');
    expect(result.clawbackId).toBeDefined();
  });

  it('fails refund when policy cancellation is not verified', async () => {
    policyVerification.verifyPolicyCancelled.mockRejectedValueOnce(new Error('Policy not cancelled'));

    await expect(
      clawbackService.applyClawback({
        tenantId: 't1',
        organizationId: 'org-1',
        policyId: 'p1',
        cancellationSourceId: 'canc-1',
        totalClawbackAmountMinor: '150000',
        currency: 'IRR',
        reason: 'policy_cancelled',
        approvedByPartyId: 'party-1',
      }),
    ).rejects.toThrow('Policy not cancelled');
  });

  it('processes refund failure and marks refund as failed', async () => {
    refundRepo.findOne.mockReturnValueOnce({
      refundId: 'rf1',
      tenantId: 't1',
      organizationId: 'org-1',
      status: 'sent',
      paymentId: 'pay-1',
    });

    const result = await refundService.failRefund('t1', 'rf1', 'bank_rejected', 'corr-1');
    expect(result.status).toBe('failed');
  });
});
