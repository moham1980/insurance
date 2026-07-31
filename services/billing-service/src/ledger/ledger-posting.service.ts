import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { BrokerageLedgerAccount } from './ledger-account.entity';
import { BrokerageJournalEntry } from './journal-entry.entity';
import { BrokerageJournalLine } from './journal-line.entity';
import { OutboxPublisher } from '@insurance/shared';

export interface PostingLine {
  accountCode: string;
  accountName: string;
  accountType: BrokerageLedgerAccount['type'];
  debit: string;
  credit: string;
  currency: string;
  description?: string;
  dimensions?: Record<string, string>;
}

export interface PostingRequest {
  tenantId: string;
  organizationId: string;
  sourceType: BrokerageJournalEntry['sourceType'];
  sourceId: string;
  periodId: string;
  idempotencyKey: string;
  postingDate: Date;
  description: string;
  lines: PostingLine[];
  correlationId: string;
}

@Injectable()
export class LedgerPostingService {
  constructor(
    @InjectRepository(BrokerageLedgerAccount) private readonly accountRepo: Repository<BrokerageLedgerAccount>,
    @InjectRepository(BrokerageJournalEntry) private readonly entryRepo: Repository<BrokerageJournalEntry>,
    @InjectRepository(BrokerageJournalLine) private readonly lineRepo: Repository<BrokerageJournalLine>,
    private readonly dataSource: DataSource,
  ) {}

  async post(params: PostingRequest): Promise<BrokerageJournalEntry> {
    let totalDebit = BigInt(0);
    let totalCredit = BigInt(0);
    for (const l of params.lines) {
      totalDebit += BigInt(l.debit);
      totalCredit += BigInt(l.credit);
    }
    if (totalDebit !== totalCredit) {
      throw new Error(`Double-entry imbalance: debit=${totalDebit.toString()} credit=${totalCredit.toString()}`);
    }

    return await this.dataSource.transaction(async (manager) => {
      const accountRepo = manager.getRepository(BrokerageLedgerAccount);
      const entryRepo = manager.getRepository(BrokerageJournalEntry);
      const lineRepo = manager.getRepository(BrokerageJournalLine);

      const existing = await entryRepo.findOne({ where: { idempotencyKey: params.idempotencyKey } });
      if (existing) {
        return existing;
      }

      const outbox = new OutboxPublisher(manager);

      const entry = new BrokerageJournalEntry();
      entry.journalEntryId = uuidv4();
      entry.tenantId = params.tenantId;
      entry.organizationId = params.organizationId;
      entry.sourceType = params.sourceType;
      entry.sourceId = params.sourceId;
      entry.idempotencyKey = params.idempotencyKey;
      entry.postingDate = params.postingDate;
      entry.periodId = params.periodId;
      entry.status = 'posted';
      entry.description = params.description;
      entry.lines = [];

      for (const line of params.lines) {
        let account = await accountRepo.findOne({
          where: {
            tenantId: params.tenantId,
            organizationId: params.organizationId,
            code: line.accountCode,
          },
        });

        if (!account) {
          account = accountRepo.create({
            accountId: uuidv4(),
            tenantId: params.tenantId,
            organizationId: params.organizationId,
            code: line.accountCode,
            name: line.accountName,
            type: line.accountType,
            currency: line.currency,
            status: 'active',
          });
          await accountRepo.save(account);
        }

        const journalLine = new BrokerageJournalLine();
        journalLine.journalLineId = uuidv4();
        journalLine.tenantId = params.tenantId;
        journalLine.journalEntryId = entry.journalEntryId;
        journalLine.accountId = account.accountId;
        journalLine.debitAmount = String(line.debit);
        journalLine.debitCurrency = line.currency;
        journalLine.creditAmount = String(line.credit);
        journalLine.creditCurrency = line.currency;
        journalLine.dimensions = line.dimensions || null;
        journalLine.description = line.description || null;

        await lineRepo.save(journalLine);
        entry.lines.push(journalLine);
      }

      await entryRepo.save(entry);

      await outbox.publish({
        topic: 'insurance.billing.journal.posted',
        eventType: 'BrokerageJournalPosted',
        eventVersion: 1,
        correlationId: params.correlationId,
        tenantId: params.tenantId,
        subject: { journalEntryId: entry.journalEntryId, sourceId: params.sourceId },
        payload: {
          journalEntryId: entry.journalEntryId,
          sourceType: params.sourceType,
          sourceId: params.sourceId,
          totalDebit: totalDebit.toString(),
          totalCredit: totalCredit.toString(),
          currency: params.lines[0]?.currency || 'IRR',
        },
      });

      return entry;
    });
  }

  async getEntry(tenantId: string, journalEntryId: string): Promise<BrokerageJournalEntry | null> {
    return this.entryRepo.findOne({ where: { tenantId, journalEntryId }, relations: ['lines'] });
  }

  async reverse(params: { tenantId: string; journalEntryId: string; reason: string; correlationId: string }): Promise<BrokerageJournalEntry> {
    const original = await this.entryRepo.findOne({ where: { tenantId: params.tenantId, journalEntryId: params.journalEntryId }, relations: ['lines'] });
    if (!original) {
      throw new Error('Journal entry not found');
    }
    if (original.status === 'reversed') {
      throw new Error('Journal entry already reversed');
    }

    return await this.dataSource.transaction(async (manager) => {
      const entryRepo = manager.getRepository(BrokerageJournalEntry);
      const lineRepo = manager.getRepository(BrokerageJournalLine);
      const outbox = new OutboxPublisher(manager);

      const reversal = new BrokerageJournalEntry();
      reversal.journalEntryId = uuidv4();
      reversal.tenantId = original.tenantId;
      reversal.organizationId = original.organizationId;
      reversal.sourceType = original.sourceType;
      reversal.sourceId = original.sourceId;
      reversal.idempotencyKey = `reverse-${original.idempotencyKey}`;
      reversal.postingDate = new Date();
      reversal.periodId = original.periodId;
      reversal.status = 'posted';
      reversal.description = `Reversal: ${params.reason}`;
      reversal.reversalOfJournalEntryId = original.journalEntryId;
      reversal.lines = [];

      for (const line of original.lines) {
        const reversedLine = new BrokerageJournalLine();
        reversedLine.journalLineId = uuidv4();
        reversedLine.tenantId = line.tenantId;
        reversedLine.journalEntryId = reversal.journalEntryId;
        reversedLine.accountId = line.accountId;
        reversedLine.debitAmount = String(line.creditAmount);
        reversedLine.debitCurrency = line.creditCurrency;
        reversedLine.creditAmount = String(line.debitAmount);
        reversedLine.creditCurrency = line.debitCurrency;
        reversedLine.dimensions = line.dimensions;
        reversedLine.description = `Reversal: ${line.description}`;
        await lineRepo.save(reversedLine);
        reversal.lines.push(reversedLine);
      }

      await entryRepo.save(reversal);

      original.status = 'reversed';
      await entryRepo.save(original);

      await outbox.publish({
        topic: 'insurance.billing.journal.reversed',
        eventType: 'BrokerageJournalReversed',
        eventVersion: 1,
        correlationId: params.correlationId,
        tenantId: original.tenantId,
        subject: { journalEntryId: reversal.journalEntryId, reversedFrom: original.journalEntryId },
        payload: {
          journalEntryId: reversal.journalEntryId,
          reversedFrom: original.journalEntryId,
          reason: params.reason,
        },
      });

      return reversal;
    });
  }
}
