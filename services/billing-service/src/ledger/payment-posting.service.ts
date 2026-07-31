import { Injectable } from '@nestjs/common';
import { LedgerPostingService, PostingLine } from './ledger-posting.service';

@Injectable()
export class PaymentPostingService {
  constructor(private readonly ledgerPosting: LedgerPostingService) {}

  async postPayment(params: {
    tenantId: string;
    organizationId: string;
    policyId: string;
    paymentId: string;
    paymentAmount: string;
    currency: string;
    periodId: string;
    postingDate: Date;
    correlationId: string;
    carrierOrganizationId?: string;
    brokerOrganizationId?: string;
    productId?: string;
  }): Promise<{ journalEntryId: string }> {
    const dimensions = {
      policyId: params.policyId,
      paymentId: params.paymentId,
      carrier: params.carrierOrganizationId || params.organizationId,
      broker: params.brokerOrganizationId || '',
      product: params.productId || '',
      branch: params.brokerOrganizationId || '',
    };

    const lines: PostingLine[] = [
      {
        accountCode: 'CASH_BANK',
        accountName: 'Cash / Bank',
        accountType: 'ASSET',
        debit: params.paymentAmount,
        credit: '0',
        currency: params.currency,
        description: `Payment received for policy ${params.policyId}`,
        dimensions,
      },
      {
        accountCode: 'PREMIUM_RECEIVABLE_CUSTOMER',
        accountName: 'Customer Premium Receivable',
        accountType: 'ASSET',
        debit: '0',
        credit: params.paymentAmount,
        currency: params.currency,
        description: `Payment applied to receivable for policy ${params.policyId}`,
        dimensions,
      },
    ];

    const journalEntry = await this.ledgerPosting.post({
      tenantId: params.tenantId,
      organizationId: params.organizationId,
      sourceType: 'PAYMENT',
      sourceId: params.paymentId,
      periodId: params.periodId,
      idempotencyKey: `payment-${params.paymentId}`,
      postingDate: params.postingDate,
      description: `Payment posting for policy ${params.policyId}, payment ${params.paymentId}`,
      lines,
      correlationId: params.correlationId,
    });

    return { journalEntryId: journalEntry.journalEntryId };
  }

  async reversePayment(params: {
    tenantId: string;
    paymentId: string;
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
