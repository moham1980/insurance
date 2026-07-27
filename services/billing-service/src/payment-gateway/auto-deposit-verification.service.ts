import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Invoice, InvoiceStatus } from '../entities/Invoice';
import { AutoDepositConfig as AutoDepositConfigEntity } from '../entities/AutoDepositConfig';
import { BankTransaction as BankTransactionEntity } from '../entities/BankTransaction';
import { OutboxPublisher } from '@insurance/shared';

export interface BankTransaction {
  id?: string;
  accountNumber: string;
  amount: number;
  transactionDate: Date;
  reference?: string | null;
  description?: string | null;
  senderName?: string | null;
  senderAccount?: string | null;
}

export interface DepositMatchResult {
  matched: boolean;
  invoiceId?: string;
  transactionId: string;
  amount: number;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
}

export interface AutoDepositConfig {
  enabled: boolean;
  checkIntervalMinutes: number;
  toleranceAmount: number;
  requireExactMatch: boolean;
  autoApproveHighConfidence: boolean;
  bankProviders: string[];
}

@Injectable()
export class AutoDepositVerificationService {
  private readonly logger = new Logger(AutoDepositVerificationService.name);

  constructor(
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(AutoDepositConfigEntity) private readonly configRepo: Repository<AutoDepositConfigEntity>,
    @InjectRepository(BankTransactionEntity) private readonly bankTransactionRepo: Repository<BankTransactionEntity>,
    private readonly dataSource: DataSource,
  ) {}

  private toConfigInterface(entity: AutoDepositConfigEntity | null): AutoDepositConfig {
    if (!entity) {
      return {
        enabled: process.env.AUTO_DEPOSIT_ENABLED === 'true',
        checkIntervalMinutes: parseInt(process.env.AUTO_DEPOSIT_CHECK_INTERVAL_MINUTES || '30', 10),
        toleranceAmount: parseFloat(process.env.AUTO_DEPOSIT_TOLERANCE_AMOUNT || '1000'),
        requireExactMatch: process.env.AUTO_DEPOSIT_REQUIRE_EXACT_MATCH === 'true',
        autoApproveHighConfidence: process.env.AUTO_DEPOSIT_AUTO_APPROVE === 'true',
        bankProviders: (process.env.AUTO_DEPOSIT_BANK_PROVIDERS || '').split(',').filter(Boolean),
      };
    }
    return {
      enabled: entity.enabled,
      checkIntervalMinutes: entity.checkIntervalMinutes,
      toleranceAmount: Number(entity.toleranceAmount),
      requireExactMatch: entity.requireExactMatch,
      autoApproveHighConfidence: entity.autoApproveHighConfidence,
      bankProviders: entity.bankProviders || [],
    };
  }

  async getConfig(tenantId: string): Promise<AutoDepositConfig> {
    const entity = await this.configRepo.findOne({ where: { tenantId } });
    return this.toConfigInterface(entity);
  }

  async updateConfig(tenantId: string, updates: Partial<AutoDepositConfig>): Promise<AutoDepositConfig> {
    let entity = await this.configRepo.findOne({ where: { tenantId } });
    if (!entity) {
      entity = this.configRepo.create({
        tenantId,
        enabled: false,
        checkIntervalMinutes: 30,
        toleranceAmount: 1000,
        requireExactMatch: false,
        autoApproveHighConfidence: false,
        bankProviders: [],
      });
    }
    Object.assign(entity, {
      ...updates,
      bankProviders: updates.bankProviders ?? entity.bankProviders,
    });
    await this.configRepo.save(entity);
    this.logger.log('Auto-deposit config updated', { tenantId });
    return this.toConfigInterface(entity);
  }

  async ingestBankTransaction(tenantId: string, transaction: BankTransaction): Promise<DepositMatchResult> {
    this.logger.log(`Ingesting bank transaction: ${transaction.id || 'new'}, amount: ${transaction.amount}, tenant: ${tenantId}`);

    const config = await this.getConfig(tenantId);
    if (!config.enabled) {
      this.logger.warn('Auto-deposit verification is disabled');
      return {
        matched: false,
        transactionId: transaction.id || 'unknown',
        amount: transaction.amount,
        confidence: 'low',
        reason: 'Auto-deposit verification disabled',
      };
    }

    const entity = this.bankTransactionRepo.create({
      tenantId,
      accountNumber: transaction.accountNumber,
      amount: transaction.amount,
      transactionDate: transaction.transactionDate,
      reference: transaction.reference || null,
      description: transaction.description || null,
      senderName: transaction.senderName || null,
      senderAccount: transaction.senderAccount || null,
      status: 'pending',
      matchedInvoiceId: null,
    });
    const saved = await this.bankTransactionRepo.save(entity);

    const matchResult = await this.matchTransactionToInvoice(tenantId, saved, config);

    if (matchResult.matched && matchResult.invoiceId && config.autoApproveHighConfidence && matchResult.confidence === 'high') {
      await this.autoApprovePayment(tenantId, matchResult.invoiceId, saved, config, `auto-approved: ${matchResult.reason}`);
    }

    return matchResult;
  }

  private async matchTransactionToInvoice(
    tenantId: string,
    transaction: BankTransactionEntity,
    config: AutoDepositConfig
  ): Promise<DepositMatchResult> {
    const invoices = await this.invoiceRepo.find({
      where: [
        { tenantId, status: InvoiceStatus.PENDING },
        { tenantId, status: InvoiceStatus.OVERDUE },
      ],
    });

    for (const invoice of invoices) {
      const match = this.checkMatch(transaction, invoice, config);
      if (match.matched) {
        return {
          matched: true,
          invoiceId: invoice.id,
          transactionId: transaction.id,
          amount: transaction.amount,
          confidence: match.confidence,
          reason: match.reason,
        };
      }
    }

    return {
      matched: false,
      transactionId: transaction.id,
      amount: transaction.amount,
      confidence: 'low',
      reason: 'No matching invoice found',
    };
  }

  private checkMatch(
    transaction: BankTransaction,
    invoice: Invoice,
    config: AutoDepositConfig
  ): { matched: boolean; confidence: 'high' | 'medium' | 'low'; reason?: string } {
    const amountDiff = Math.abs(transaction.amount - Number(invoice.amount));

    if (config.requireExactMatch) {
      if (amountDiff > 0) {
        return { matched: false, confidence: 'low', reason: 'Amount does not match exactly' };
      }
    } else {
      if (amountDiff > config.toleranceAmount) {
        return { matched: false, confidence: 'low', reason: 'Amount difference exceeds tolerance' };
      }
    }

    if (transaction.reference) {
      if (invoice.invoiceNumber && transaction.reference.includes(invoice.invoiceNumber)) {
        return { matched: true, confidence: 'high', reason: 'Reference number matches invoice number' };
      }
    }

    if (transaction.description) {
      if (invoice.invoiceNumber && transaction.description.includes(invoice.invoiceNumber)) {
        return { matched: true, confidence: 'high', reason: 'Description contains invoice number' };
      }
      if (invoice.policyId && transaction.description.includes(invoice.policyId)) {
        return { matched: true, confidence: 'high', reason: 'Description contains policy ID' };
      }
      if (invoice.claimId && transaction.description.includes(invoice.claimId)) {
        return { matched: true, confidence: 'high', reason: 'Description contains claim ID' };
      }
    }

    if (amountDiff === 0) {
      return { matched: true, confidence: 'medium', reason: 'Amount matches exactly' };
    }

    return { matched: true, confidence: 'low', reason: 'Amount within tolerance' };
  }

  async autoApprovePayment(tenantId: string, invoiceId: string, transaction: BankTransactionEntity, config: AutoDepositConfig, note?: string): Promise<void> {
    this.logger.log(`Auto-approving payment for invoice: ${invoiceId} from transaction: ${transaction.id}`);

    return this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const invoice = await manager.findOne(Invoice, { where: { id: invoiceId, tenantId } });
      if (!invoice) throw new Error('Invoice not found');

      invoice.paidAmount = Number(invoice.paidAmount) + Number(transaction.amount);
      invoice.paidAt = transaction.transactionDate;
      if (invoice.paidAmount >= invoice.amount) {
        invoice.status = InvoiceStatus.PAID;
      }
      await manager.save(invoice);

      transaction.matchedInvoiceId = invoiceId;
      transaction.status = 'approved';
      await manager.save(transaction);

      await outbox.publish({
        topic: 'insurance.billing.auto-deposit.approved',
        eventType: 'AutoDepositApproved',
        eventVersion: 1,
        correlationId: transaction.id,
        subject: { invoiceId: invoice.id },
        payload: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: transaction.amount,
          bankTransactionId: transaction.id,
          note,
          approvedAt: new Date().toISOString(),
        },
      });

      this.logger.log(`Payment auto-approved successfully for invoice: ${invoiceId}`);
    });
  }

  async manualApprovePayment(tenantId: string, invoiceId: string, transactionId: string): Promise<void> {
    this.logger.log(`Manually approving payment for invoice: ${invoiceId} from transaction: ${transactionId}`);

    const transaction = await this.bankTransactionRepo.findOne({ where: { id: transactionId, tenantId, status: 'pending' } });
    if (!transaction) {
      throw new Error('Transaction not found or already processed');
    }

    const config = await this.getConfig(tenantId);
    await this.autoApprovePayment(tenantId, invoiceId, transaction, config, 'manually-approved');
  }

  async rejectTransaction(tenantId: string, transactionId: string, reason: string): Promise<void> {
    this.logger.log(`Rejecting transaction: ${transactionId}, reason: ${reason}`);
    const transaction = await this.bankTransactionRepo.findOne({ where: { id: transactionId, tenantId } });
    if (!transaction) throw new Error('Transaction not found');
    transaction.status = 'rejected';
    await this.bankTransactionRepo.save(transaction);
  }

  async getPendingTransactions(tenantId: string): Promise<BankTransactionEntity[]> {
    return this.bankTransactionRepo.find({
      where: { tenantId, status: 'pending' },
      order: { createdAt: 'DESC' },
    });
  }

  async getPendingMatches(tenantId: string): Promise<Array<{
    transaction: BankTransactionEntity;
    potentialInvoices: Invoice[];
  }>> {
    const config = await this.getConfig(tenantId);
    const transactions = await this.bankTransactionRepo.find({ where: { tenantId, status: 'pending' } });
    const matches: Array<{ transaction: BankTransactionEntity; potentialInvoices: Invoice[] }> = [];

    for (const transaction of transactions) {
      const invoices = await this.invoiceRepo.find({
        where: [
          { tenantId, status: InvoiceStatus.PENDING },
          { tenantId, status: InvoiceStatus.OVERDUE },
        ],
      });

      const potentialMatches = invoices.filter((invoice) => {
        const match = this.checkMatch(transaction, invoice, config);
        return match.matched;
      });

      if (potentialMatches.length > 0) {
        matches.push({ transaction, potentialInvoices: potentialMatches });
      }
    }

    return matches;
  }

  async reconcileTransactions(tenantId: string): Promise<{
    processed: number;
    matched: number;
    unmatched: number;
  }> {
    this.logger.log('Starting transaction reconciliation');

    const config = await this.getConfig(tenantId);
    const transactions = await this.bankTransactionRepo.find({ where: { tenantId, status: 'pending' } });
    let processed = 0;
    let matched = 0;
    let unmatched = 0;

    for (const transaction of transactions) {
      processed++;
      const matchResult = await this.matchTransactionToInvoice(tenantId, transaction, config);

      if (matchResult.matched && matchResult.invoiceId) {
        if (config.autoApproveHighConfidence && matchResult.confidence === 'high') {
          await this.autoApprovePayment(tenantId, matchResult.invoiceId, transaction, config, `auto-approved: ${matchResult.reason}`);
          matched++;
        }
      } else {
        unmatched++;
      }
    }

    this.logger.log(`Reconciliation completed: ${processed} processed, ${matched} matched, ${unmatched} unmatched`);

    return { processed, matched, unmatched };
  }

  async healthCheck(tenantId: string): Promise<{
    healthy: boolean;
    enabled: boolean;
    pendingTransactions: number;
    message: string;
  }> {
    const config = await this.getConfig(tenantId);
    const pending = await this.bankTransactionRepo.count({ where: { tenantId, status: 'pending' } });

    return {
      healthy: true,
      enabled: config.enabled,
      pendingTransactions: pending,
      message: config.enabled ? 'Auto-deposit verification is active' : 'Auto-deposit verification is disabled',
    };
  }
}
