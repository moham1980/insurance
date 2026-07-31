import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CommissionCalculationService } from '../commission/commission-calculation.service';
import { LedgerPostingService, PostingLine } from './ledger-posting.service';

@Injectable()
export class PolicyPostingService {
  constructor(
    private readonly ledgerPosting: LedgerPostingService,
    private readonly commissionCalculation: CommissionCalculationService,
    private readonly dataSource: DataSource,
  ) {}

  async postPolicyIssuance(params: {
    tenantId: string;
    organizationId: string;
    policyId: string;
    premiumAmount: string;
    taxesAmount: string;
    totalPayable: string;
    currency: string;
    brokerOrganizationId: string;
    productId?: string;
    commissionDistributionAgreementId?: string;
    commissionDistributionAgreementSnapshot?: Record<string, any>;
    periodId: string;
    effectiveFrom: Date;
    correlationId: string;
  }): Promise<{ journalEntryId: string; commissionSplitIds: string[] }> {
    const premiumBig = BigInt(params.premiumAmount);
    const taxesBig = BigInt(params.taxesAmount);
    const netPremium = (premiumBig - taxesBig).toString();
    const premiumPayable = params.premiumAmount;
    const taxPayable = params.taxesAmount;

    const commissionSplits = await this.commissionCalculation.calculateAndAccrue({
      tenantId: params.tenantId,
      brokerOrganizationId: params.brokerOrganizationId,
      sourceType: 'POLICY',
      sourceId: params.policyId,
      premiumGross: params.premiumAmount,
      premiumNet: netPremium.toString(),
      currency: params.currency,
      distributionAgreementId: params.commissionDistributionAgreementId,
      distributionAgreementSnapshot: params.commissionDistributionAgreementSnapshot,
      effectiveFrom: params.effectiveFrom,
      correlationId: params.correlationId,
    });

    let totalCommissionBig = BigInt(0);
    for (const s of commissionSplits) {
      totalCommissionBig += BigInt(String(s.amount));
    }
    const totalCommission = totalCommissionBig.toString();

    const dimensions = {
      policyId: params.policyId,
      carrier: params.organizationId,
      broker: params.brokerOrganizationId,
      product: params.productId || '',
      branch: params.brokerOrganizationId,
    };

    const lines: PostingLine[] = [
      {
        accountCode: 'PREMIUM_RECEIVABLE_CUSTOMER',
        accountName: 'Customer Premium Receivable',
        accountType: 'ASSET',
        debit: params.totalPayable,
        credit: '0',
        currency: params.currency,
        description: `Customer premium receivable for policy ${params.policyId}`,
        dimensions,
      },
      {
        accountCode: 'PREMIUM_PAYABLE_CARRIER',
        accountName: 'Premium Payable to Carrier',
        accountType: 'LIABILITY',
        debit: '0',
        credit: premiumPayable,
        currency: params.currency,
        description: `Premium payable to carrier for policy ${params.policyId}`,
        dimensions,
      },
      {
        accountCode: 'TAX_PAYABLE_AUTHORITY',
        accountName: 'Tax Payable to Authority',
        accountType: 'LIABILITY',
        debit: '0',
        credit: taxPayable,
        currency: params.currency,
        description: `Tax payable for policy ${params.policyId}`,
        dimensions,
      },
      {
        accountCode: 'COMMISSION_EXPENSE',
        accountName: 'Commission Expense',
        accountType: 'EXPENSE',
        debit: totalCommission,
        credit: '0',
        currency: params.currency,
        description: `Commission expense for policy ${params.policyId}`,
        dimensions,
      },
      {
        accountCode: 'COMMISSION_PAYABLE',
        accountName: 'Commission Payable',
        accountType: 'LIABILITY',
        debit: '0',
        credit: totalCommission,
        currency: params.currency,
        description: `Commission payable for policy ${params.policyId}`,
        dimensions,
      },
    ];

    const journalEntry = await this.ledgerPosting.post({
      tenantId: params.tenantId,
      organizationId: params.organizationId,
      sourceType: 'POLICY',
      sourceId: params.policyId,
      periodId: params.periodId,
      idempotencyKey: `policy-issuance-${params.policyId}`,
      postingDate: params.effectiveFrom,
      description: `Policy issuance posting for ${params.policyId}`,
      lines,
      correlationId: params.correlationId,
    });

    await this.commissionCalculation.linkSplitsToJournalEntry(
      journalEntry.journalEntryId,
      commissionSplits.map((s) => s.splitId),
    );

    return {
      journalEntryId: journalEntry.journalEntryId,
      commissionSplitIds: commissionSplits.map((s) => s.splitId),
    };
  }
}
