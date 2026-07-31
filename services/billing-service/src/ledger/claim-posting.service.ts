import { Injectable } from '@nestjs/common';
import { LedgerPostingService, PostingLine } from './ledger-posting.service';

@Injectable()
export class ClaimPostingService {
  constructor(private readonly ledgerPosting: LedgerPostingService) {}

  async postClaimPayment(params: {
    tenantId: string;
    organizationId: string;
    claimId: string;
    paymentId: string;
    paidAmount: string;
    currency: string;
    periodId: string;
    postingDate: Date;
    correlationId: string;
    carrierOrganizationId?: string;
    brokerOrganizationId?: string;
  }): Promise<{ journalEntryId: string }> {
    const dimensions = {
      claimId: params.claimId,
      paymentId: params.paymentId,
      carrier: params.carrierOrganizationId || params.organizationId,
      broker: params.brokerOrganizationId || '',
    };

    const lines: PostingLine[] = [
      {
        accountCode: 'CLAIM_PAYABLE',
        accountName: 'Claim Payable',
        accountType: 'LIABILITY',
        debit: params.paidAmount,
        credit: '0',
        currency: params.currency,
        description: `Claim payout for claim ${params.claimId}`,
        dimensions,
      },
      {
        accountCode: 'CASH_BANK',
        accountName: 'Cash / Bank',
        accountType: 'ASSET',
        debit: '0',
        credit: params.paidAmount,
        currency: params.currency,
        description: `Claim payment disbursed for claim ${params.claimId}`,
        dimensions,
      },
    ];

    const journalEntry = await this.ledgerPosting.post({
      tenantId: params.tenantId,
      organizationId: params.organizationId,
      sourceType: 'CLAIM_PAYMENT',
      sourceId: params.paymentId,
      periodId: params.periodId,
      idempotencyKey: `claim-payment-${params.paymentId}`,
      postingDate: params.postingDate,
      description: `Claim payment posting for claim ${params.claimId}, payment ${params.paymentId}`,
      lines,
      correlationId: params.correlationId,
    });

    return { journalEntryId: journalEntry.journalEntryId };
  }

  async postRecovery(params: {
    tenantId: string;
    organizationId: string;
    recoveryId: string;
    claimId: string;
    recoveredAmount: string;
    currency: string;
    periodId: string;
    postingDate: Date;
    correlationId: string;
    carrierOrganizationId?: string;
    brokerOrganizationId?: string;
  }): Promise<{ journalEntryId: string }> {
    const dimensions = {
      claimId: params.claimId,
      recoveryId: params.recoveryId,
      carrier: params.carrierOrganizationId || params.organizationId,
      broker: params.brokerOrganizationId || '',
    };

    const lines: PostingLine[] = [
      {
        accountCode: 'CASH_BANK',
        accountName: 'Cash / Bank',
        accountType: 'ASSET',
        debit: params.recoveredAmount,
        credit: '0',
        currency: params.currency,
        description: `Recovery received for claim ${params.claimId}`,
        dimensions,
      },
      {
        accountCode: 'CLAIM_RECOVERY',
        accountName: 'Claim Recovery Income',
        accountType: 'REVENUE',
        debit: '0',
        credit: params.recoveredAmount,
        currency: params.currency,
        description: `Subrogation recovery for claim ${params.claimId}`,
        dimensions,
      },
    ];

    const journalEntry = await this.ledgerPosting.post({
      tenantId: params.tenantId,
      organizationId: params.organizationId,
      sourceType: 'RECOVERY',
      sourceId: params.recoveryId,
      periodId: params.periodId,
      idempotencyKey: `recovery-${params.recoveryId}`,
      postingDate: params.postingDate,
      description: `Recovery posting for claim ${params.claimId}, recovery ${params.recoveryId}`,
      lines,
      correlationId: params.correlationId,
    });

    return { journalEntryId: journalEntry.journalEntryId };
  }
}
