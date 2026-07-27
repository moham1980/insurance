import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { Invoice, InvoiceStatus, InvoiceType } from './entities/Invoice';
import { JournalEntry, EntryStatus } from './entities/JournalEntry';
import { Account, AccountType, AccountCategory } from './entities/Account';
import { FinancialPeriod, PeriodStatus } from './entities/FinancialPeriod';
import { CostCenter } from './entities/CostCenter';
import { ReconciliationResult, ReconciliationStatus } from './entities/ReconciliationResult';
import { PaymentTransaction } from './entities/PaymentTransaction';
import { IdempotencyKey } from './entities/IdempotencyKey';
import { AutoDepositConfig } from './entities/AutoDepositConfig';
import { BankTransaction } from './entities/BankTransaction';
import { IdempotencyService } from './idempotency.service';
import { auditLogger } from './audit.logger';
import { OutboxPublisher } from '@insurance/shared';
import { v4 as uuidv4 } from 'uuid';

export type InvoiceFilter = {
  tenantId: string;
  customerId?: string;
  policyId?: string;
  status?: InvoiceStatus;
  invoiceType?: InvoiceType;
  limit?: number;
  offset?: number;
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Invoice)
    private invoiceRepo: Repository<Invoice>,
    @InjectRepository(JournalEntry)
    private journalEntryRepo: Repository<JournalEntry>,
    @InjectRepository(Account)
    private accountRepo: Repository<Account>,
    @InjectRepository(FinancialPeriod)
    private periodRepo: Repository<FinancialPeriod>,
    @InjectRepository(CostCenter)
    private costCenterRepo: Repository<CostCenter>,
    @InjectRepository(ReconciliationResult)
    private reconciliationRepo: Repository<ReconciliationResult>,
    @InjectRepository(PaymentTransaction)
    private paymentTransactionRepo: Repository<PaymentTransaction>,
    @InjectRepository(IdempotencyKey)
    private idempotencyKeyRepo: Repository<IdempotencyKey>,
    @InjectRepository(AutoDepositConfig)
    private autoDepositConfigRepo: Repository<AutoDepositConfig>,
    @InjectRepository(BankTransaction)
    private bankTransactionRepo: Repository<BankTransaction>,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async createInvoice(params: {
    tenantId: string;
    invoiceNumber: string;
    policyId?: string;
    claimId?: string;
    customerId?: string;
    invoiceType: InvoiceType;
    amount: number;
    taxAmount?: number;
    dueDate: Date;
    lineItems?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }>;
    metadata?: Record<string, any>;
    correlationId?: string;
    idempotencyKey?: string;
  }): Promise<Invoice> {
    const scope = 'createInvoice';
    if (params.idempotencyKey) {
      const cached = await this.idempotencyService.getExisting(params.tenantId, scope, params.idempotencyKey);
      if (cached?.invoice) return cached.invoice as Invoice;
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const invoice = manager.create(Invoice, {
        tenantId: params.tenantId,
        invoiceNumber: params.invoiceNumber,
        policyId: params.policyId || null,
        claimId: params.claimId || null,
        customerId: params.customerId || null,
        invoiceType: params.invoiceType,
        status: InvoiceStatus.DRAFT,
        amount: params.amount,
        paidAmount: 0,
        taxAmount: params.taxAmount || 0,
        dueDate: params.dueDate,
        paidAt: null,
        lineItems: params.lineItems || null,
        metadata: params.metadata || null,
      });
      const saved = await manager.save(invoice);

      await outbox.publish({
        topic: 'insurance.billing.invoice.created',
        eventType: 'InvoiceCreated',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { invoiceId: saved.id },
        payload: {
          invoiceId: saved.id,
          invoiceNumber: saved.invoiceNumber,
          invoiceType: saved.invoiceType,
          amount: saved.amount,
          taxAmount: saved.taxAmount,
          policyId: saved.policyId,
          claimId: saved.claimId,
          customerId: saved.customerId,
          status: saved.status,
          dueDate: saved.dueDate?.toISOString?.() ?? new Date().toISOString(),
        },
      });

      return saved;
    });

    if (params.idempotencyKey) {
      await this.idempotencyService.store(params.tenantId, scope, params.idempotencyKey, { invoice: result });
    }
    return result;
  }

  async issueInvoice(id: string, tenantId: string, correlationId?: string): Promise<Invoice> {
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const invoice = await manager.findOne(Invoice, { where: { id, tenantId } });
      if (!invoice) throw new Error('Invoice not found');
      invoice.status = InvoiceStatus.PENDING;
      const saved = await manager.save(invoice);

      await outbox.publish({
        topic: 'insurance.billing.invoice.issued',
        eventType: 'InvoiceIssued',
        eventVersion: 1,
        correlationId: correlationId || uuidv4(),
        subject: { invoiceId: saved.id },
        payload: {
          invoiceId: saved.id,
          invoiceNumber: saved.invoiceNumber,
          invoiceType: saved.invoiceType,
          amount: saved.amount,
          status: saved.status,
          dueDate: saved.dueDate?.toISOString?.() ?? new Date().toISOString(),
        },
      });

      return saved;
    });
  }

  async findInvoicesByClaimId(claimId: string, tenantId: string): Promise<Invoice[]> {
    return this.invoiceRepo.find({ where: { claimId, tenantId } });
  }

  async recordPayment(params: {
    invoiceId: string;
    tenantId: string;
    amount: number;
    paymentDate: Date;
    reference?: string;
    correlationId?: string;
  }): Promise<Invoice> {
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const invoice = await manager.findOne(Invoice, { where: { id: params.invoiceId, tenantId: params.tenantId } });
      if (!invoice) throw new Error('Invoice not found');
      if (invoice.status !== InvoiceStatus.PENDING && invoice.status !== InvoiceStatus.OVERDUE) {
        throw new Error('Invoice must be pending or overdue to accept payment');
      }

      invoice.paidAmount += params.amount;
      invoice.paidAt = params.paymentDate;

      if (invoice.paidAmount >= invoice.amount) {
        invoice.status = InvoiceStatus.PAID;
      }

      const saved = await manager.save(invoice);

      await outbox.publish({
        topic: 'insurance.billing.payment.recorded',
        eventType: 'PaymentRecorded',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { invoiceId: saved.id },
        payload: {
          invoiceId: saved.id,
          invoiceNumber: saved.invoiceNumber,
          amount: params.amount,
          paidAmount: saved.paidAmount,
          totalAmount: saved.amount,
          status: saved.status,
          paymentDate: params.paymentDate?.toISOString?.() ?? new Date().toISOString(),
          reference: params.reference || null,
        },
      });

      return saved;
    });
  }

  async markOverdue(tenantId: string): Promise<number> {
    const now = new Date();
    const result = await this.invoiceRepo
      .createQueryBuilder('i')
      .update(Invoice)
      .set({ status: InvoiceStatus.OVERDUE })
      .where('i.status = :status', { status: InvoiceStatus.PENDING })
      .andWhere('i.due_date < :now', { now })
      .andWhere('i.tenant_id = :tenantId', { tenantId })
      .execute();
    return result.affected || 0;
  }

  async cancelInvoice(id: string, tenantId: string, correlationId?: string): Promise<Invoice> {
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const invoice = await manager.findOne(Invoice, { where: { id, tenantId } });
      if (!invoice) throw new Error('Invoice not found');
      if (invoice.status === InvoiceStatus.PAID) {
        throw new Error('Cannot cancel a paid invoice');
      }
      invoice.status = InvoiceStatus.CANCELLED;
      const saved = await manager.save(invoice);

      await outbox.publish({
        topic: 'insurance.billing.invoice.cancelled',
        eventType: 'InvoiceCancelled',
        eventVersion: 1,
        correlationId: correlationId || uuidv4(),
        subject: { invoiceId: saved.id },
        payload: {
          invoiceId: saved.id,
          invoiceNumber: saved.invoiceNumber,
          status: saved.status,
          cancelledAt: new Date().toISOString(),
        },
      });

      return saved;
    });
  }

  async getInvoice(id: string, tenantId: string): Promise<Invoice | null> {
    return this.invoiceRepo.findOne({ where: { id, tenantId } });
  }

  async listInvoices(params: InvoiceFilter): Promise<{ items: Invoice[]; total: number }> {
    const qb = this.invoiceRepo.createQueryBuilder('i')
      .where('i.tenantId = :tenantId', { tenantId: params.tenantId });

    if (params.customerId) {
      qb.andWhere('i.customerId = :customerId', { customerId: params.customerId });
    }
    if (params.policyId) {
      qb.andWhere('i.policyId = :policyId', { policyId: params.policyId });
    }
    if (params.status) {
      qb.andWhere('i.status = :status', { status: params.status });
    }
    if (params.invoiceType) {
      qb.andWhere('i.invoiceType = :invoiceType', { invoiceType: params.invoiceType });
    }

    const limit = Math.min(params.limit || 50, 200);
    const offset = params.offset || 0;

    qb.orderBy('i.createdAt', 'DESC').take(limit).skip(offset);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getOutstandingBalance(params: {
    tenantId: string;
    customerId?: string;
  }): Promise<number> {
    const qb = this.invoiceRepo.createQueryBuilder('i')
      .select('COALESCE(SUM(i.amount - i.paidAmount), 0)', 'balance')
      .where('i.tenantId = :tenantId', { tenantId: params.tenantId })
      .andWhere('i.status IN (:...statuses)', { statuses: [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE] });

    if (params.customerId) {
      qb.andWhere('i.customerId = :customerId', { customerId: params.customerId });
    }

    const result = await qb.getRawOne();
    return parseFloat(result?.balance || '0');
  }

  // Accounting Methods

  async createJournalEntry(params: {
    tenantId: string;
    entryNumber: string;
    description: string;
    entryDate: Date;
    businessKey?: string;
    businessType?: string;
    lines: Array<{
      accountCode: string;
      description: string;
      debitAmount: number;
      creditAmount: number;
      reference?: string;
    }>;
    metadata?: Record<string, any>;
    correlationId?: string;
    idempotencyKey?: string;
  }): Promise<JournalEntry> {
    const scope = 'createJournalEntry';
    if (params.idempotencyKey) {
      const cached = await this.idempotencyService.getExisting(params.tenantId, scope, params.idempotencyKey);
      if (cached?.entry) return cached.entry as JournalEntry;
    }

    const totalDebit = params.lines.reduce((sum, line) => sum + line.debitAmount, 0);
    const totalCredit = params.lines.reduce((sum, line) => sum + line.creditAmount, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error('Journal entry must balance: debit and credit amounts must be equal');
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const entry = manager.create(JournalEntry, {
        tenantId: params.tenantId,
        entryNumber: params.entryNumber,
        description: params.description,
        businessKey: params.businessKey || null,
        businessType: params.businessType || null,
        entryDate: params.entryDate,
        status: EntryStatus.DRAFT,
        lines: params.lines,
        totalDebit,
        totalCredit,
        metadata: params.metadata || null,
      });
      const saved = await manager.save(entry);

      await outbox.publish({
        topic: 'insurance.billing.journal.created',
        eventType: 'JournalCreated',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { entryId: saved.id },
        payload: {
          entryId: saved.id,
          entryNumber: saved.entryNumber,
          tenantId: saved.tenantId,
          totalDebit: saved.totalDebit,
          totalCredit: saved.totalCredit,
          createdAt: saved.createdAt?.toISOString?.() ?? new Date().toISOString(),
        },
      });

      return saved;
    });

    if (params.idempotencyKey) {
      await this.idempotencyService.store(params.tenantId, scope, params.idempotencyKey, { entry: result });
    }
    return result;
  }

  async postJournalEntry(entryId: string, tenantId: string, userId: string): Promise<JournalEntry> {
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const entry = await manager.findOne(JournalEntry, { where: { id: entryId, tenantId } });
      if (!entry) throw new Error('Journal entry not found');
      if (entry.status !== EntryStatus.DRAFT) {
        throw new Error('Only draft entries can be posted');
      }

      if (entry.lines) {
        for (const line of entry.lines) {
          const account = await manager.findOne(Account, {
            where: { tenantId, accountCode: line.accountCode },
          });
          if (!account) {
            throw new Error(`Account not found: ${line.accountCode}`);
          }
          if (!account.isActive) {
            throw new Error(`Account is inactive: ${line.accountCode}`);
          }
        }
      }

      entry.status = EntryStatus.POSTED;
      entry.postedAt = new Date();
      entry.postedBy = userId;

      const saved = await manager.save(entry);

      await outbox.publish({
        topic: 'insurance.billing.journal.posted',
        eventType: 'JournalPosted',
        eventVersion: 1,
        correlationId: uuidv4(),
        subject: { entryId: saved.id },
        payload: {
          entryId: saved.id,
          entryNumber: saved.entryNumber,
          tenantId: saved.tenantId,
          postedBy: userId,
          postedAt: saved.postedAt?.toISOString?.() ?? new Date().toISOString(),
        },
      });

      return saved;
    });
  }

  async reverseJournalEntry(
    entryId: string,
    tenantId: string,
    reversalEntryNumber: string,
    reason: string,
    userId: string,
  ): Promise<JournalEntry> {
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const originalEntry = await manager.findOne(JournalEntry, { where: { id: entryId, tenantId } });
      if (!originalEntry) throw new Error('Journal entry not found');
      if (originalEntry.status !== EntryStatus.POSTED) {
        throw new Error('Only posted entries can be reversed');
      }

      const reversalLines = originalEntry.lines?.map(line => ({
        accountCode: line.accountCode,
        description: `Reversal: ${line.description}`,
        debitAmount: line.creditAmount,
        creditAmount: line.debitAmount,
        reference: originalEntry.entryNumber,
      })) || [];

      const totalDebit = reversalLines.reduce((sum, line) => sum + line.debitAmount, 0);
      const totalCredit = reversalLines.reduce((sum, line) => sum + line.creditAmount, 0);

      const reversalEntry = manager.create(JournalEntry, {
        tenantId,
        entryNumber: reversalEntryNumber,
        description: `Reversal of ${originalEntry.entryNumber}: ${reason}`,
        businessKey: originalEntry.businessKey || null,
        businessType: originalEntry.businessType || null,
        entryDate: new Date(),
        status: EntryStatus.POSTED,
        lines: reversalLines,
        totalDebit,
        totalCredit,
        metadata: { originalEntryId: originalEntry.id, reversalReason: reason },
        postedAt: new Date(),
        postedBy: userId,
      });
      await manager.save(reversalEntry);

      originalEntry.reversalEntryNumber = reversalEntryNumber;
      originalEntry.status = EntryStatus.REVERSED;
      await manager.save(originalEntry);

      await outbox.publish({
        topic: 'insurance.billing.journal.reversed',
        eventType: 'JournalReversed',
        eventVersion: 1,
        correlationId: uuidv4(),
        subject: { entryId: originalEntry.id },
        payload: {
          originalEntryId: originalEntry.id,
          originalEntryNumber: originalEntry.entryNumber,
          reversalEntryId: reversalEntry.id,
          reversalEntryNumber: reversalEntryNumber,
          reason,
          reversedAt: new Date().toISOString(),
        },
      });

      return reversalEntry;
    });
  }

  async createAccount(params: {
    tenantId: string;
    accountCode: string;
    accountName: string;
    description?: string;
    accountType: AccountType;
    category: AccountCategory;
    parentAccountCode?: string;
    openingBalance?: number;
    openingBalanceDate?: Date;
    isSystemAccount?: boolean;
    metadata?: Record<string, any>;
  }): Promise<Account> {
    const account = this.accountRepo.create();
    account.tenantId = params.tenantId;
    account.accountCode = params.accountCode;
    account.accountName = params.accountName;
    account.description = params.description || null;
    account.accountType = params.accountType;
    account.category = params.category;
    account.parentAccountCode = params.parentAccountCode || null;
    account.openingBalance = params.openingBalance || 0;
    account.openingBalanceDate = params.openingBalanceDate || null;
    account.isSystemAccount = params.isSystemAccount || false;
    account.metadata = params.metadata || null;
    return this.accountRepo.save(account);
  }

  async getAccount(accountCode: string, tenantId: string): Promise<Account | null> {
    return this.accountRepo.findOne({ where: { accountCode, tenantId } });
  }

  async listAccounts(params: {
    tenantId: string;
    accountType?: AccountType;
    category?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ items: Account[]; total: number }> {
    const qb = this.accountRepo.createQueryBuilder('a')
      .where('a.tenantId = :tenantId', { tenantId: params.tenantId });

    if (params.accountType) {
      qb.andWhere('a.accountType = :accountType', { accountType: params.accountType });
    }
    if (params.category) {
      qb.andWhere('a.category = :category', { category: params.category });
    }
    if (params.isActive !== undefined) {
      qb.andWhere('a.isActive = :isActive', { isActive: params.isActive });
    }

    const limit = Math.min(params.limit || 50, 200);
    const offset = params.offset || 0;

    qb.orderBy('a.accountCode', 'ASC').take(limit).skip(offset);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async createFinancialPeriod(params: {
    tenantId: string;
    periodName: string;
    startDate: Date;
    endDate: Date;
    fiscalYear?: string;
    periodNumber?: number;
    metadata?: Record<string, any>;
  }): Promise<FinancialPeriod> {
    const period = this.periodRepo.create({
      tenantId: params.tenantId,
      periodName: params.periodName,
      startDate: params.startDate,
      endDate: params.endDate,
      status: PeriodStatus.OPEN,
      fiscalYear: params.fiscalYear || null,
      periodNumber: params.periodNumber || null,
      metadata: params.metadata || null,
    });
    return this.periodRepo.save(period);
  }

  async closeFinancialPeriod(periodId: string, tenantId: string, userId: string): Promise<FinancialPeriod> {
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const period = await manager.findOne(FinancialPeriod, { where: { id: periodId, tenantId } });
      if (!period) throw new Error('Financial period not found');
      if (period.status !== PeriodStatus.OPEN) {
        throw new Error('Only open periods can be closed');
      }

      period.status = PeriodStatus.CLOSED;
      period.closedAt = new Date();
      period.closedBy = userId;

      const saved = await manager.save(period);

      await outbox.publish({
        topic: 'insurance.billing.period.closed',
        eventType: 'PeriodClosed',
        eventVersion: 1,
        correlationId: uuidv4(),
        subject: { periodId: saved.id },
        payload: {
          periodId: saved.id,
          periodName: saved.periodName,
          tenantId: saved.tenantId,
          closedBy: userId,
          closedAt: saved.closedAt?.toISOString?.() ?? new Date().toISOString(),
        },
      });

      return saved;
    });
  }

  async getTrialBalance(params: {
    tenantId: string;
    asOfDate?: Date;
  }): Promise<Array<{
    accountCode: string;
    accountName: string;
    accountType: AccountType;
    debitBalance: number;
    creditBalance: number;
  }>> {
    const asOfDate = params.asOfDate || new Date();
    const rows: any[] = await this.journalEntryRepo.query(
      `
      SELECT
        a.account_code AS "accountCode",
        a.account_name AS "accountName",
        a.account_type AS "accountType",
        COALESCE(a.opening_balance, 0) AS "openingBalance",
        COALESCE(SUM((line.value ->> 'debitAmount')::numeric), 0) AS "debitBalance",
        COALESCE(SUM((line.value ->> 'creditAmount')::numeric), 0) AS "creditBalance"
      FROM accounts a
      LEFT JOIN journal_entries je
        ON je.tenant_id = a.tenant_id
        AND je.status = 'posted'
        AND je.entry_date <= $1
      LEFT JOIN LATERAL jsonb_array_elements(je.lines) AS line(value)
        ON line.value ->> 'accountCode' = a.account_code
      WHERE a.tenant_id = $2
        AND a.is_active = true
      GROUP BY a.id, a.account_code, a.account_name, a.account_type, a.opening_balance
      ORDER BY a.account_code
      `,
      [asOfDate, params.tenantId],
    );

    return rows.map((r: any) => {
      const accountType = r.accountType as AccountType;
      const opening = parseFloat(r.openingBalance || 0);
      const debits = parseFloat(r.debitBalance || 0) + opening;
      const credits = parseFloat(r.creditBalance || 0);
      const netDebit = Math.max(0, debits - credits);
      const netCredit = Math.max(0, credits - debits);
      return {
        accountCode: r.accountCode,
        accountName: r.accountName,
        accountType,
        debitBalance: accountType === AccountType.ASSET || accountType === AccountType.EXPENSE ? netDebit : netCredit,
        creditBalance: accountType === AccountType.ASSET || accountType === AccountType.EXPENSE ? netCredit : netDebit,
      };
    });
  }

  async getAccountBalance(params: {
    tenantId: string;
    accountCode: string;
    asOfDate?: Date;
  }): Promise<{ debitBalance: number; creditBalance: number }> {
    const asOfDate = params.asOfDate || new Date();
    const account = await this.getAccount(params.accountCode, params.tenantId);
    if (!account) throw new Error('Account not found');

    const rows: any[] = await this.journalEntryRepo.query(
      `
      SELECT
        COALESCE(SUM((line.value ->> 'debitAmount')::numeric), 0) AS "debitBalance",
        COALESCE(SUM((line.value ->> 'creditAmount')::numeric), 0) AS "creditBalance"
      FROM journal_entries je
      LEFT JOIN LATERAL jsonb_array_elements(je.lines) AS line(value)
        ON line.value ->> 'accountCode' = $1
      WHERE je.tenant_id = $2
        AND je.status = 'posted'
        AND je.entry_date <= $3
      `,
      [params.accountCode, params.tenantId, asOfDate],
    );

    const opening = parseFloat(String(account.openingBalance || 0));
    const debitTotal = opening + parseFloat(rows[0]?.debitBalance || 0);
    const creditTotal = parseFloat(rows[0]?.creditBalance || 0);
    return { debitBalance: debitTotal, creditBalance: creditTotal };
  }

  // ── CostCenter CRUD ────────────────────────────────────────────────

  async createCostCenter(params: {
    tenantId: string;
    code: string;
    name: string;
    description?: string;
    type: string;
    parentId?: string;
    metadata?: Record<string, any>;
    createdBy?: string;
  }): Promise<CostCenter> {
    const cc = this.costCenterRepo.create({
      tenantId: params.tenantId,
      code: params.code,
      name: params.name,
      description: params.description || null,
      type: params.type,
      parentId: params.parentId || null,
      metadata: params.metadata || null,
      isActive: true,
      createdBy: params.createdBy || null,
    });
    const saved = await this.costCenterRepo.save(cc);
    auditLogger.info('CostCenter created', { tenantId: params.tenantId, code: params.code });
    return saved;
  }

  async getCostCenter(id: string, tenantId: string): Promise<CostCenter | null> {
    return this.costCenterRepo.findOne({ where: { id, tenantId } });
  }

  async listCostCenters(params: {
    tenantId: string;
    type?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ items: CostCenter[]; total: number }> {
    const qb = this.costCenterRepo.createQueryBuilder('cc')
      .where('cc.tenantId = :tenantId', { tenantId: params.tenantId });
    if (params.type) qb.andWhere('cc.type = :type', { type: params.type });
    if (params.isActive !== undefined) qb.andWhere('cc.isActive = :isActive', { isActive: params.isActive });
    const limit = Math.min(params.limit || 50, 200);
    const offset = params.offset || 0;
    qb.orderBy('cc.code', 'ASC').take(limit).skip(offset);
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async updateCostCenter(id: string, tenantId: string, params: Partial<{
    code: string;
    name: string;
    description: string;
    type: string;
    parentId: string;
    metadata: Record<string, any>;
    isActive: boolean;
    updatedBy: string;
  }>): Promise<CostCenter> {
    const cc = await this.costCenterRepo.findOne({ where: { id, tenantId } });
    if (!cc) throw new Error('CostCenter not found');
    Object.assign(cc, params, { updatedAt: new Date() });
    const saved = await this.costCenterRepo.save(cc);
    auditLogger.info('CostCenter updated', { tenantId, id });
    return saved;
  }

  async deleteCostCenter(id: string, tenantId: string): Promise<void> {
    const result = await this.costCenterRepo.delete({ id, tenantId });
    if (result.affected === 0) throw new Error('CostCenter not found');
    auditLogger.info('CostCenter deleted', { tenantId, id });
  }

  // ── Reconciliation ─────────────────────────────────────────────────

  async reconcile(params: {
    tenantId: string;
    sourceType: string;
    sourceId: string;
    journalEntryId: string;
    expectedAmount: number;
    actualAmount: number;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<ReconciliationResult> {
    const variance = Math.abs(params.expectedAmount - params.actualAmount);
    const status = variance === 0
      ? ReconciliationStatus.MATCHED
      : variance <= Math.max(params.expectedAmount * 0.01, 100)
        ? ReconciliationStatus.MANUAL_REVIEW
        : ReconciliationStatus.UNMATCHED;

    const result = this.reconciliationRepo.create({
      tenantId: params.tenantId,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      journalEntryId: params.journalEntryId,
      expectedAmount: params.expectedAmount,
      actualAmount: params.actualAmount,
      variance,
      status,
      details: {
        differences: { expected: params.expectedAmount, actual: params.actualAmount, variance },
      },
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
    });
    const saved = await this.reconciliationRepo.save(result);
    auditLogger.info('Reconciliation performed', { tenantId: params.tenantId, sourceType: params.sourceType, sourceId: params.sourceId, status });
    return saved;
  }

  async listReconciliationResults(params: {
    tenantId: string;
    sourceType?: string;
    status?: ReconciliationStatus;
    periodStart?: Date;
    periodEnd?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ items: ReconciliationResult[]; total: number }> {
    const qb = this.reconciliationRepo.createQueryBuilder('rr')
      .where('rr.tenantId = :tenantId', { tenantId: params.tenantId });
    if (params.sourceType) qb.andWhere('rr.sourceType = :sourceType', { sourceType: params.sourceType });
    if (params.status) qb.andWhere('rr.status = :status', { status: params.status });
    if (params.periodStart) qb.andWhere('rr.periodStart >= :start', { start: params.periodStart });
    if (params.periodEnd) qb.andWhere('rr.periodEnd <= :end', { end: params.periodEnd });
    const limit = Math.min(params.limit || 50, 200);
    const offset = params.offset || 0;
    qb.orderBy('rr.createdAt', 'DESC').take(limit).skip(offset);
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async approveReconciliation(id: string, tenantId: string, userId: string): Promise<ReconciliationResult> {
    const rr = await this.reconciliationRepo.findOne({ where: { id, tenantId } });
    if (!rr) throw new Error('ReconciliationResult not found');
    if (rr.status !== ReconciliationStatus.MANUAL_REVIEW) {
      throw new Error('Only manual_review items can be approved');
    }
    rr.status = ReconciliationStatus.MATCHED;
    rr.reconciledBy = userId;
    rr.reconciledAt = new Date();
    const saved = await this.reconciliationRepo.save(rr);
    auditLogger.info('Reconciliation approved', { tenantId, id, userId });
    return saved;
  }

  // ── PnL & Balance Sheet ──────────────────────────────────────────────

  async getPnLReport(params: {
    tenantId: string;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<{
    revenue: Array<{ accountCode: string; accountName: string; amount: number }>;
    expenses: Array<{ accountCode: string; accountName: string; amount: number }>;
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
  }> {
    const rows: any[] = await this.journalEntryRepo.query(
      `
      SELECT
        a.account_code AS "accountCode",
        a.account_name AS "accountName",
        a.category AS "category",
        COALESCE(SUM((line.value ->> 'creditAmount')::numeric), 0) -
        COALESCE(SUM((line.value ->> 'debitAmount')::numeric), 0) AS "netBalance"
      FROM accounts a
      LEFT JOIN journal_entries je
        ON je.tenant_id = a.tenant_id
        AND je.status = 'posted'
        AND je.entry_date >= $1
        AND je.entry_date <= $2
      LEFT JOIN LATERAL jsonb_array_elements(je.lines) AS line(value)
        ON line.value ->> 'accountCode' = a.account_code
      WHERE a.tenant_id = $3
        AND a.is_active = true
        AND a.category IN ('operating_revenue', 'non_operating_revenue', 'operating_expense', 'non_operating_expense')
      GROUP BY a.id, a.account_code, a.account_name, a.category
      ORDER BY a.account_code
      `,
      [params.periodStart, params.periodEnd, params.tenantId],
    );

    const revenue: Array<{ accountCode: string; accountName: string; amount: number }> = [];
    const expenses: Array<{ accountCode: string; accountName: string; amount: number }> = [];

    for (const r of rows) {
      const net = parseFloat(r.netBalance || 0);
      const item = { accountCode: r.accountCode, accountName: r.accountName, amount: Math.abs(net) };
      if (r.category === 'operating_revenue' || r.category === 'non_operating_revenue') {
        if (net > 0) revenue.push(item);
      } else if (r.category === 'operating_expense' || r.category === 'non_operating_expense') {
        if (net < 0) expenses.push(item);
      }
    }

    const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

    return { revenue, expenses, totalRevenue, totalExpenses, netIncome: totalRevenue - totalExpenses };
  }

  async getBalanceSheet(params: {
    tenantId: string;
    asOfDate: Date;
  }): Promise<{
    assets: Array<{ accountCode: string; accountName: string; amount: number }>;
    liabilities: Array<{ accountCode: string; accountName: string; amount: number }>;
    equity: Array<{ accountCode: string; accountName: string; amount: number }>;
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
  }> {
    const rows: any[] = await this.journalEntryRepo.query(
      `
      SELECT
        a.account_code AS "accountCode",
        a.account_name AS "accountName",
        a.account_type AS "accountType",
        COALESCE(a.opening_balance, 0) AS "openingBalance",
        COALESCE(SUM((line.value ->> 'debitAmount')::numeric), 0) AS "debitTotal",
        COALESCE(SUM((line.value ->> 'creditAmount')::numeric), 0) AS "creditTotal"
      FROM accounts a
      LEFT JOIN journal_entries je
        ON je.tenant_id = a.tenant_id
        AND je.status = 'posted'
        AND je.entry_date <= $1
      LEFT JOIN LATERAL jsonb_array_elements(je.lines) AS line(value)
        ON line.value ->> 'accountCode' = a.account_code
      WHERE a.tenant_id = $2
        AND a.is_active = true
        AND a.account_type IN ('asset', 'liability', 'equity')
      GROUP BY a.id, a.account_code, a.account_name, a.account_type, a.opening_balance
      ORDER BY a.account_code
      `,
      [params.asOfDate, params.tenantId],
    );

    const assets: Array<{ accountCode: string; accountName: string; amount: number }> = [];
    const liabilities: Array<{ accountCode: string; accountName: string; amount: number }> = [];
    const equity: Array<{ accountCode: string; accountName: string; amount: number }> = [];

    for (const r of rows) {
      const opening = parseFloat(r.openingBalance || 0);
      const debits = parseFloat(r.debitTotal || 0);
      const credits = parseFloat(r.creditTotal || 0);
      const type = r.accountType as AccountType;
      let balance = 0;
      if (type === AccountType.ASSET || type === AccountType.EXPENSE) {
        balance = opening + debits - credits;
      } else {
        balance = credits - debits + (type === AccountType.EQUITY ? opening : 0);
      }
      const item = { accountCode: r.accountCode, accountName: r.accountName, amount: Math.max(0, balance) };
      if (type === AccountType.ASSET && item.amount > 0) assets.push(item);
      if (type === AccountType.LIABILITY && item.amount > 0) liabilities.push(item);
      if (type === AccountType.EQUITY && item.amount > 0) equity.push(item);
    }

    return {
      assets, liabilities, equity,
      totalAssets: assets.reduce((s, a) => s + a.amount, 0),
      totalLiabilities: liabilities.reduce((s, l) => s + l.amount, 0),
      totalEquity: equity.reduce((s, e) => s + e.amount, 0),
    };
  }
}
