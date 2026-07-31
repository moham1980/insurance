import { Injectable } from '@nestjs/common';
import { LedgerPostingService, PostingLine } from './ledger-posting.service';

@Injectable()
export class CancellationPostingService {
  constructor(private readonly ledgerPosting: LedgerPostingService) {}

  async postCancellation(params: {
    tenantId: string;
    organizationId: string;
    policyId: string;
    cancellationId: string;
    refundAmount: string;
    commissionClawbackAmount: string;
    currency: string;
    periodId: string;
    cancellationDate: Date;
    correlationId: string;
    carrierOrganizationId?: string;
    brokerOrganizationId?: string;
    productId?: string;
  }): Promise<{ journalEntryId: string }> {
    const dimensions = {
      policyId: params.policyId,
      cancellationId: params.cancellationId,
      carrier: params.carrierOrganizationId || params.organizationId,
      broker: params.brokerOrganizationId || '',
      product: params.productId || '',
      branch: params.brokerOrganizationId || '',
    };

    const lines: PostingLine[] = [
      {
        accountCode: 'PREMIUM_PAYABLE_CARRIER',
        accountName: 'Premium Payable to Carrier',
        accountType: 'LIABILITY',
        debit: params.refundAmount,
        credit: '0',
        currency: params.currency,
        description: `Cancellation refund payable to carrier for policy ${params.policyId}`,
        dimensions,
      },
      {
        accountCode: 'PREMIUM_RECEIVABLE_CUSTOMER',
        accountName: 'Customer Premium Receivable',
        accountType: 'ASSET',
        debit: '0',
        credit: params.refundAmount,
        currency: params.currency,
        description: `Cancellation refund to customer for policy ${params.policyId}`,
        dimensions,
      },
    ];

    if (BigInt(params.commissionClawbackAmount) > BigInt(0)) {
      lines.push({
        accountCode: 'COMMISSION_PAYABLE',
        accountName: 'Commission Payable',
        accountType: 'LIABILITY',
        debit: params.commissionClawbackAmount,
        credit: '0',
        currency: params.currency,
        description: `Commission clawback for cancelled policy ${params.policyId}`,
        dimensions,
      });
      lines.push({
        accountCode: 'COMMISSION_EXPENSE',
        accountName: 'Commission Expense',
        accountType: 'EXPENSE',
        debit: '0',
        credit: params.commissionClawbackAmount,
        currency: params.currency,
        description: `Commission expense reversal for cancelled policy ${params.policyId}`,
        dimensions,
      });
    }

    const journalEntry = await this.ledgerPosting.post({
      tenantId: params.tenantId,
      organizationId: params.organizationId,
      sourceType: 'CANCELLATION',
      sourceId: params.cancellationId,
      periodId: params.periodId,
      idempotencyKey: `cancellation-${params.cancellationId}`,
      postingDate: params.cancellationDate,
      description: `Cancellation posting for policy ${params.policyId}`,
      lines,
      correlationId: params.correlationId,
    });

    return { journalEntryId: journalEntry.journalEntryId };
  }

  async reverseCancellation(params: {
    tenantId: string;
    cancellationId: string;
    journalEntryId: string;
    reason: string;
    correlationId: string;
  }): Promise<{ reversalJournalEntryId: string }> {
    const reversal = await this.ledgerPosting.reverse({
      tenantId: params.tenantId,
      journalEntryId: params.journalEntryId,
      reason: params.reason,
      correlationId: params.correlationId,
    });

    return { reversalJournalEntryId: reversal.journalEntryId };
  }
}
