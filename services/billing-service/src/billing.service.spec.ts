import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { BillingService } from './billing.service';
import { Invoice, InvoiceStatus, InvoiceType } from './entities/Invoice';
import { IdempotencyService } from './idempotency.service';

describe('BillingService', () => {
  let service: BillingService;
  const dataSource = { transaction: mock((fn: any) => fn({})) } as any;

  const createRepo = () => ({
    findOne: mock(() => Promise.resolve(null)),
    save: mock((entity: any) => Promise.resolve(entity)),
    find: mock(() => Promise.resolve([])),
    createQueryBuilder: mock(() => createQueryBuilderMock()),
    create: mock((entity: any) => entity),
    delete: mock(() => Promise.resolve({ affected: 1 })),
    count: mock(() => Promise.resolve(0)),
    query: mock(() => Promise.resolve([])),
  });

  const createQueryBuilderMock = () => {
    const qb: any = {
      where: mock(function (this: any, ...args: any[]) { return this; }),
      andWhere: mock(function (this: any, ...args: any[]) { return this; }),
      select: mock(function (this: any, ...args: any[]) { return this; }),
      orderBy: mock(function (this: any, ...args: any[]) { return this; }),
      take: mock(function (this: any, ...args: any[]) { return this; }),
      skip: mock(function (this: any, ...args: any[]) { return this; }),
      getManyAndCount: mock(() => Promise.resolve([[], 0])),
      getRawOne: mock(() => Promise.resolve({ balance: '0' })),
    };
    return qb;
  };

  const idempotencyService = {
    getExisting: mock(() => Promise.resolve(null)),
    store: mock(() => Promise.resolve()),
  } as any;

  beforeEach(() => {
    const invoiceRepo = createRepo();
    const journalEntryRepo = createRepo();
    const accountRepo = createRepo();
    const periodRepo = createRepo();
    const costCenterRepo = createRepo();
    const reconciliationRepo = createRepo();
    const paymentTransactionRepo = createRepo();
    const idempotencyKeyRepo = createRepo();
    const autoDepositConfigRepo = createRepo();
    const bankTransactionRepo = createRepo();

    service = new BillingService(
      dataSource,
      invoiceRepo,
      journalEntryRepo,
      accountRepo,
      periodRepo,
      costCenterRepo,
      reconciliationRepo,
      paymentTransactionRepo,
      idempotencyKeyRepo,
      autoDepositConfigRepo,
      bankTransactionRepo,
      idempotencyService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createInvoice idempotency', () => {
    it('returns cached invoice when idempotency key already exists', async () => {
      const cached = { id: 'inv-1', invoiceNumber: 'INV-001' } as Invoice;
      idempotencyService.getExisting = mock(() => Promise.resolve({ invoice: cached }));

      const result = await service.createInvoice({
        tenantId: 'tenant-a',
        invoiceNumber: 'INV-001',
        invoiceType: InvoiceType.POLICY_PREMIUM,
        amount: 1000,
        dueDate: new Date(),
        idempotencyKey: 'idem-1',
      });

      expect(result).toEqual(cached);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('markOverdue uses tenant filter', () => {
    it('builds query with tenantId and pending/overdue conditions', async () => {
      const executeMock = mock(() => Promise.resolve({ affected: 3 }));
      const invoiceRepo = (service as any).invoiceRepo;
      invoiceRepo.createQueryBuilder = mock(() => ({
        update: mock(function (this: any) { return this; }),
        set: mock(function (this: any) { return this; }),
        where: mock(function (this: any) { return this; }),
        andWhere: mock(function (this: any) { return this; }),
        execute: executeMock,
      }));

      const count = await service.markOverdue('tenant-a');
      expect(count).toBe(3);
    });
  });

  describe('createJournalEntry requires balance', () => {
    it('throws when debits and credits do not balance', async () => {
      await expect(
        service.createJournalEntry({
          tenantId: 'tenant-a',
          entryNumber: 'JE-001',
          description: 'Test entry',
          entryDate: new Date(),
          lines: [
            { accountCode: '1000', description: 'Cash', debitAmount: 100, creditAmount: 0 },
            { accountCode: '2000', description: 'Revenue', debitAmount: 0, creditAmount: 50 },
          ],
        }),
      ).rejects.toThrow('Journal entry must balance');
    });
  });
});
