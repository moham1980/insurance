import { Injectable } from '@nestjs/common';
import { CommissionSplit } from './commission-split.entity';
import { LedgerPostingService, PostingLine } from '../ledger/ledger-posting.service';
import { CommissionCalculationService } from './commission-calculation.service';

@Injectable()
export class CommissionPostingService {
  constructor(
    private readonly ledgerPosting: LedgerPostingService,
    private readonly commissionCalculation: CommissionCalculationService,
  ) {}

  async postCommissionSplits(params: {
    tenantId: string;
    organizationId: string;
    sourceType: string;
    sourceId: string;
    periodId: string;
    currency: string;
    postingDate: Date;
    correlationId: string;
  }): Promise<string> {
    const splits = await this.commissionCalculation.getSplitsForSource(
      params.tenantId,
      params.sourceType,
      params.sourceId,
    );

    if (splits.length === 0) {
      throw new Error('No commission splits found for source');
    }

    let totalBig = BigInt(0);
    for (const s of splits) {
      totalBig += BigInt(String(s.amount));
    }
    const total = totalBig.toString();

    const lines: PostingLine[] = [
      {
        accountCode: 'COMMISSION_EXPENSE',
        accountName: 'Commission Expense',
        accountType: 'EXPENSE',
        debit: total,
        credit: '0',
        currency: params.currency,
        description: `Commission expense for ${params.sourceType} ${params.sourceId}`,
        dimensions: { sourceId: params.sourceId },
      },
      {
        accountCode: 'COMMISSION_PAYABLE',
        accountName: 'Commission Payable',
        accountType: 'LIABILITY',
        debit: '0',
        credit: total,
        currency: params.currency,
        description: `Commission payable for ${params.sourceType} ${params.sourceId}`,
        dimensions: { sourceId: params.sourceId },
      },
    ];

    const entry = await this.ledgerPosting.post({
      tenantId: params.tenantId,
      organizationId: params.organizationId,
      sourceType: 'COMMISSION',
      sourceId: params.sourceId,
      periodId: params.periodId,
      idempotencyKey: `commission-${params.sourceType}-${params.sourceId}`,
      postingDate: params.postingDate,
      description: `Commission posting for ${params.sourceType} ${params.sourceId}`,
      lines,
      correlationId: params.correlationId,
    });

    await this.commissionCalculation.linkSplitsToJournalEntry(
      entry.journalEntryId,
      splits.map((s) => s.splitId),
    );

    return entry.journalEntryId;
  }

  async postClawback(splitId: string, params: {
    tenantId: string;
    organizationId: string;
    periodId: string;
    currency: string;
    postingDate: Date;
    correlationId: string;
  }): Promise<string> {
    const [split] = await this.commissionCalculation.getSplitsForSource(params.tenantId, 'POLICY', splitId);
    if (!split) throw new Error('Commission split not found');

    const lines: PostingLine[] = [
      {
        accountCode: 'COMMISSION_PAYABLE',
        accountName: 'Commission Payable',
        accountType: 'LIABILITY',
        debit: String(split.amount),
        credit: '0',
        currency: params.currency,
        description: `Commission clawback for split ${split.splitId}`,
      },
      {
        accountCode: 'COMMISSION_EXPENSE',
        accountName: 'Commission Expense',
        accountType: 'EXPENSE',
        debit: '0',
        credit: String(split.amount),
        currency: params.currency,
        description: `Commission expense reversal for split ${split.splitId}`,
      },
    ];

    const entry = await this.ledgerPosting.post({
      tenantId: params.tenantId,
      organizationId: params.organizationId,
      sourceType: 'CLAWBACK',
      sourceId: splitId,
      periodId: params.periodId,
      idempotencyKey: `clawback-${splitId}`,
      postingDate: params.postingDate,
      description: `Commission clawback for split ${splitId}`,
      lines,
      correlationId: params.correlationId,
    });

    return entry.journalEntryId;
  }
}
