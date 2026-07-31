import { PremiumInvoiceService, CreatePremiumInvoiceInput } from '../invoicing/invoice.service';
import { PremiumInvoice } from '../invoicing/premium-invoice.entity';
import { PremiumInvoiceLine, InvoiceLineType } from '../invoicing/invoice-line.entity';
import { PremiumInstallmentPlan } from '../invoicing/installment-plan.entity';
import { OutboxEvent } from '@insurance/shared';
import { IdempotencyService } from '../idempotency.service';

function createMockRepo<T extends object>(opts?: { findOne?: () => any; findBy?: () => any }) {
  const store: any[] = [];
  return {
    create: jest.fn((entity: any) => ({ ...entity })),
    save: jest.fn((entity: any) => {
      const existingIndex = store.findIndex(
        (e) => (entity.invoiceId && e.invoiceId === entity.invoiceId) ||
               (entity.planId && e.planId === entity.planId) ||
               (entity.lineId && e.lineId === entity.lineId) ||
               (entity.id && e.id === entity.id)
      );
      if (existingIndex >= 0) store[existingIndex] = entity;
      else store.push(entity);
      return Promise.resolve(entity);
    }),
    findOne: jest.fn(() => Promise.resolve(opts?.findOne ? opts.findOne() : store[store.length - 1] ?? null)),
    findBy: jest.fn(() => Promise.resolve(opts?.findBy ? opts.findBy() : store)),
    find: jest.fn(() => Promise.resolve(store)),
    store,
  };
}

describe('PremiumInvoiceService (P4-1)', () => {
  let service: PremiumInvoiceService;
  let invoiceRepo: any;
  let lineRepo: any;
  let planRepo: any;
  let outboxRepo: any;

  beforeEach(() => {
    invoiceRepo = createMockRepo<PremiumInvoice>();
    lineRepo = createMockRepo<PremiumInvoiceLine>();
    planRepo = createMockRepo<PremiumInstallmentPlan>();
    outboxRepo = createMockRepo<OutboxEvent>();

    const dataSource = {
      transaction: jest.fn(async (fn: any) => {
        const manager = {
          getRepository: (entity: any) => {
            if (entity === PremiumInvoice) return invoiceRepo;
            if (entity === PremiumInvoiceLine) return lineRepo;
            if (entity === PremiumInstallmentPlan) return planRepo;
            if (entity === OutboxEvent) return outboxRepo;
            return createMockRepo();
          },
        };
        return await fn(manager);
      }),
    };

    const idempotencyService = {
      getExisting: jest.fn(() => Promise.resolve(null)),
      store: jest.fn(() => Promise.resolve()),
    } as any;

    service = new PremiumInvoiceService(
      invoiceRepo as any,
      lineRepo as any,
      planRepo as any,
      dataSource as any,
      idempotencyService,
    );
  });

  it('creates and issues a premium invoice with lines', async () => {
    const input: CreatePremiumInvoiceInput = {
      tenantId: 'tenant-1',
      organizationId: 'org-1',
      policyId: 'policy-1',
      customerPartyId: 'customer-1',
      invoiceNumber: 'INV-P4-001',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      totalPremium: { amountMinor: '1000000', currency: 'IRR' },
      taxes: { amountMinor: '100000', currency: 'IRR' },
      fees: [{ feeType: 'STAMP', description: 'Stamp duty', amount: { amountMinor: '50000', currency: 'IRR' } }],
      totalAmount: { amountMinor: '1150000', currency: 'IRR' },
      currency: 'IRR',
      paymentMethod: 'card',
      lines: [
        { lineType: InvoiceLineType.PREMIUM, description: 'Premium', amount: { amountMinor: '1000000', currency: 'IRR' }, taxAmount: { amountMinor: '100000', currency: 'IRR' } },
        { lineType: InvoiceLineType.FEE, description: 'Stamp', amount: { amountMinor: '50000', currency: 'IRR' } },
      ],
    };

    const invoice = await service.createInvoice(input);

    expect(invoice).toBeDefined();
    expect(invoice.invoiceNumber).toBe('INV-P4-001');
    expect(invoice.totalAmountMinor).toBe('1150000');
    expect(invoice.lines.length).toBe(2);
    expect((outboxRepo.save as any).mock.calls.length).toBeGreaterThan(0);

    const issued = await service.issueInvoice('tenant-1', invoice.invoiceId);
    expect(issued.status).toBe('issued');
  });

  it('creates an installment plan', async () => {
    invoiceRepo.findOne.mockImplementationOnce(() =>
      Promise.resolve({
        invoiceId: 'inv-2',
        tenantId: 'tenant-1',
        totalAmountMinor: '3000000',
        currency: 'IRR',
        installmentPlanId: null,
      })
    );

    const plan = await service.createInstallmentPlan({
      tenantId: 'tenant-1',
      invoiceId: 'inv-2',
      numberOfInstallments: 3,
      firstDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    expect(plan.numberOfInstallments).toBe(3);
    expect(plan.schedule.length).toBe(3);
    expect(BigInt(plan.schedule[0].amountMinor)).toBe(BigInt(1000000));
  });
});
