import { Injectable } from '@nestjs/common';
import { LedgerPostingService, PostingLine } from './ledger-posting.service';

@Injectable()
export class EndorsementPostingService {
  constructor(private readonly ledgerPosting: LedgerPostingService) {}

  async postEndorsement(params: {
    tenantId: string;
    organizationId: string;
    policyId: string;
    endorsementId: string;
    premiumDeltaAmount: string;
    taxDeltaAmount: string;
    currency: string;
    periodId: string;
    effectiveDate: Date;
    correlationId: string;
    carrierOrganizationId?: string;
    brokerOrganizationId?: string;
    productId?: string;
  }): Promise<{ journalEntryId: string }> {
    const premiumDeltaBig = BigInt(params.premiumDeltaAmount);
    const taxDeltaBig = BigInt(params.taxDeltaAmount);
    const totalDeltaBig = premiumDeltaBig + taxDeltaBig;
    const isPositive = totalDeltaBig >= BigInt(0);
    const absPremiumDelta = (premiumDeltaBig < BigInt(0) ? -premiumDeltaBig : premiumDeltaBig).toString();
    const absTaxDelta = (taxDeltaBig < BigInt(0) ? -taxDeltaBig : taxDeltaBig).toString();
    const absTotalDelta = (totalDeltaBig < BigInt(0) ? -totalDeltaBig : totalDeltaBig).toString();

    const dimensions = {
      policyId: params.policyId,
      endorsementId: params.endorsementId,
      carrier: params.carrierOrganizationId || params.organizationId,
      broker: params.brokerOrganizationId || '',
      product: params.productId || '',
      branch: params.brokerOrganizationId || '',
    };

    const lines: PostingLine[] = [
      {
        accountCode: 'PREMIUM_RECEIVABLE_CUSTOMER',
        accountName: 'Customer Premium Receivable',
        accountType: 'ASSET',
        debit: isPositive ? absTotalDelta : '0',
        credit: isPositive ? '0' : absTotalDelta,
        currency: params.currency,
        description: `Endorsement receivable adjustment for policy ${params.policyId}, endorsement ${params.endorsementId}`,
        dimensions,
      },
      {
        accountCode: 'PREMIUM_PAYABLE_CARRIER',
        accountName: 'Premium Payable to Carrier',
        accountType: 'LIABILITY',
        debit: isPositive ? '0' : absPremiumDelta,
        credit: isPositive ? absPremiumDelta : '0',
        currency: params.currency,
        description: `Endorsement premium payable adjustment for policy ${params.policyId}`,
        dimensions,
      },
      {
        accountCode: 'TAX_PAYABLE_AUTHORITY',
        accountName: 'Tax Payable to Authority',
        accountType: 'LIABILITY',
        debit: isPositive ? '0' : absTaxDelta,
        credit: isPositive ? absTaxDelta : '0',
        currency: params.currency,
        description: `Endorsement tax payable adjustment for policy ${params.policyId}`,
        dimensions,
      },
    ];

    const journalEntry = await this.ledgerPosting.post({
      tenantId: params.tenantId,
      organizationId: params.organizationId,
      sourceType: 'ENDORSEMENT',
      sourceId: params.endorsementId,
      periodId: params.periodId,
      idempotencyKey: `endorsement-${params.endorsementId}`,
      postingDate: params.effectiveDate,
      description: `Endorsement posting for policy ${params.policyId}, endorsement ${params.endorsementId}`,
      lines,
      correlationId: params.correlationId,
    });

    return { journalEntryId: journalEntry.journalEntryId };
  }

  async reverseEndorsement(params: {
    tenantId: string;
    endorsementId: string;
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
