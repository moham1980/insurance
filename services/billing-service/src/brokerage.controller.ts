import { Body, Controller, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { PolicyPostingService } from './ledger/policy-posting.service';
import { CommissionPostingService } from './commission/commission-posting.service';
import { CommissionCalculationService } from './commission/commission-calculation.service';
import { LedgerPostingService } from './ledger/ledger-posting.service';
import { SettlementPaymentService } from './settlement/settlement-payment.service';
import { SettlementReconciliationService } from './settlement/settlement-reconciliation.service';
import { RefundService } from './refunds/refund.service';
import { ClawbackService } from './clawback/clawback.service';
import { EscrowService } from './escrow/escrow.service';
import { EscrowRulesService } from './escrow/escrow-rules.service';
import { CustomerPaymentService } from './payments/customer-payment.service';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BrokerageController {
  constructor(
    private readonly policyPosting: PolicyPostingService,
    private readonly commissionPosting: CommissionPostingService,
    private readonly commissionCalculation: CommissionCalculationService,
    private readonly ledgerPosting: LedgerPostingService,
    private readonly settlementPayment: SettlementPaymentService,
    private readonly settlementReconciliation: SettlementReconciliationService,
    private readonly refundService: RefundService,
    private readonly clawbackService: ClawbackService,
    private readonly escrowService: EscrowService,
    private readonly escrowRulesService: EscrowRulesService,
    private readonly customerPaymentService: CustomerPaymentService,
  ) {}

  private ok<T>(data: T, correlationId: string) {
    return { success: true as const, data, correlationId };
  }

  private fail(code: string, message: string, correlationId: string) {
    return { success: false as const, error: { code, message }, correlationId };
  }

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    return typeof cid === 'string' && cid.length > 0 ? cid : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  @Post('/brokerage/policies/:policyId/post')
  @RequirePermissions('billing:create_entry')
  async postPolicy(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('policyId') policyId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;

    try {
      const result = await this.policyPosting.postPolicyIssuance({
        tenantId: tenantId!,
        organizationId: body.organizationId,
        policyId,
        premiumAmount: body.premiumAmount,
        taxesAmount: body.taxesAmount,
        totalPayable: body.totalPayable,
        currency: body.currency || 'IRR',
        brokerOrganizationId: body.brokerOrganizationId,
        commissionDistributionAgreementId: body.commissionDistributionAgreementId,
        commissionDistributionAgreementSnapshot: body.commissionDistributionAgreementSnapshot,
        periodId: body.periodId,
        effectiveFrom: new Date(body.effectiveFrom),
        correlationId,
      });
      return this.ok(result, correlationId);
    } catch (e: any) {
      return this.fail('POSTING_FAILED', e.message, correlationId);
    }
  }

  @Post('/brokerage/commissions/calculate')
  @RequirePermissions('billing:accounting:manage')
  async calculateCommission(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;

    try {
      const splits = await this.commissionCalculation.calculateAndAccrue({
        tenantId: tenantId!,
        brokerOrganizationId: body.brokerOrganizationId,
        sourceType: body.sourceType || 'POLICY',
        sourceId: body.sourceId,
        premiumGross: body.premiumGross,
        premiumNet: body.premiumNet,
        currency: body.currency || 'IRR',
        distributionAgreementId: body.distributionAgreementId,
        distributionAgreementSnapshot: body.distributionAgreementSnapshot,
        commissionScheduleSnapshot: body.commissionScheduleSnapshot,
        effectiveFrom: new Date(body.effectiveFrom),
        correlationId,
      });
      return this.ok({ splits, total: splits.reduce((s, x) => s + BigInt(String(x.amount)), BigInt(0)).toString() }, correlationId);
    } catch (e: any) {
      return this.fail('CALCULATION_FAILED', e.message, correlationId);
    }
  }

  @Post('/brokerage/commissions/post')
  @RequirePermissions('billing:create_entry')
  async postCommission(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;

    try {
      const journalEntryId = await this.commissionPosting.postCommissionSplits({
        tenantId: tenantId!,
        organizationId: body.organizationId,
        sourceType: body.sourceType,
        sourceId: body.sourceId,
        periodId: body.periodId,
        currency: body.currency || 'IRR',
        postingDate: new Date(body.postingDate),
        correlationId,
      });
      return this.ok({ journalEntryId }, correlationId);
    } catch (e: any) {
      return this.fail('POSTING_FAILED', e.message, correlationId);
    }
  }

  @Post('/brokerage/commissions/adjust')
  @RequirePermissions('billing:accounting:manage')
  async adjustCommission(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;

    try {
      const split = await this.commissionCalculation.adjustCommissionSplit({
        tenantId: tenantId!,
        splitId: body.splitId,
        newAmount: String(body.newAmount),
        reason: body.reason,
        adjustedByPartyId: body.adjustedByPartyId || req?.user?.partyId,
        correlationId,
      });
      return this.ok({ split }, correlationId);
    } catch (e: any) {
      return this.fail('ADJUSTMENT_FAILED', e.message, correlationId);
    }
  }

  @Post('/brokerage/settlements/batches')
  @RequirePermissions('billing:payments:initiate')
  async createSettlementBatch(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;

    try {
      const batch = await this.settlementPayment.createBatch({
        tenantId: tenantId!,
        fromOrganizationId: body.fromOrganizationId,
        toOrganizationId: body.toOrganizationId,
        periodStart: new Date(body.periodStart),
        periodEnd: new Date(body.periodEnd),
        correlationId,
        approvedByPartyId: body.approvedByPartyId,
        calculatedByPartyId: body.calculatedByPartyId || req?.user?.partyId,
      });
      return this.ok(batch, correlationId);
    } catch (e: any) {
      return this.fail('SETTLEMENT_FAILED', e.message, correlationId);
    }
  }

  @Post('/brokerage/settlements/batches/:batchId/approve')
  @RequirePermissions('billing:settlements:manage')
  async approveSettlement(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('batchId') batchId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const approvedByPartyId = body.approvedByPartyId || req?.user?.partyId;

    try {
      const batch = await this.settlementPayment.approveBatch(batchId, tenantId!, approvedByPartyId, correlationId);
      return this.ok(batch, correlationId);
    } catch (e: any) {
      return this.fail('APPROVAL_FAILED', e.message, correlationId);
    }
  }

  @Post('/brokerage/settlements/batches/:batchId/confirm')
  @RequirePermissions('billing:payments:initiate')
  async confirmSettlement(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('batchId') batchId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;

    try {
      const batch = await this.settlementPayment.confirmAndPay({
        batchId,
        tenantId: tenantId!,
        fromAccountId: body.fromAccountId,
        toAccountId: body.toAccountId,
        correlationId,
      });
      return this.ok(batch, correlationId);
    } catch (e: any) {
      return this.fail('SETTLEMENT_PAYMENT_FAILED', e.message, correlationId);
    }
  }

  @Post('/brokerage/settlements/batches/:batchId/verify')
  @RequirePermissions('billing:payments:verify')
  async verifySettlement(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('batchId') batchId: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;

    try {
      const batch = await this.settlementPayment.verifyPayment(batchId, tenantId!);
      return this.ok(batch, correlationId);
    } catch (e: any) {
      return this.fail('VERIFICATION_FAILED', e.message, correlationId);
    }
  }

  @Get('/brokerage/journal-entries/:journalEntryId')
  @RequirePermissions('billing:view_entry')
  async getJournalEntry(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('journalEntryId') journalEntryId: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;

    const entry = await this.ledgerPosting.getEntry(tenantId!, journalEntryId);
    if (!entry) return this.fail('NOT_FOUND', 'Journal entry not found', correlationId);
    return this.ok(entry, correlationId);
  }

  @Post('/brokerage/journal-entries/:journalEntryId/reverse')
  @RequirePermissions('billing:create_entry')
  async reverseJournalEntry(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('journalEntryId') journalEntryId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;

    try {
      const entry = await this.ledgerPosting.reverse({
        tenantId: tenantId!,
        journalEntryId,
        reason: body.reason || 'reversal',
        correlationId,
      });
      return this.ok(entry, correlationId);
    } catch (e: any) {
      return this.fail('REVERSAL_FAILED', e.message, correlationId);
    }
  }

  @Post('/brokerage/settlements/batches/:batchId/reconcile')
  @RequirePermissions('billing:settlements:manage')
  async reconcileSettlement(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('batchId') batchId: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;

    try {
      const result = await this.settlementReconciliation.reconcileBatch(tenantId!, batchId);
      return this.ok(result, correlationId);
    } catch (e: any) {
      return this.fail('RECONCILIATION_FAILED', e.message, correlationId);
    }
  }

  @Post('/brokerage/refunds')
  @RequirePermissions('billing:payments:refund')
  async createRefund(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;

    try {
      const refund = await this.refundService.createRefund({
        tenantId: tenantId!,
        organizationId: body.organizationId,
        sourceType: body.sourceType,
        sourceId: body.sourceId,
        originalPaymentId: body.originalPaymentId,
        requestedAmountMinor: body.amountMinor,
        currency: body.currency,
        reason: body.reason,
        approvedByPartyId: body.approvedByPartyId,
        correlationId,
      });
      return this.ok(refund, correlationId);
    } catch (e: any) {
      return this.fail('REFUND_FAILED', e.message, correlationId);
    }
  }

  @Post('/brokerage/refunds/:refundId/approve')
  @RequirePermissions('billing:payments:refund')
  async approveRefund(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('refundId') refundId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const approvedByPartyId = body.approvedByPartyId || req?.user?.partyId;

    try {
      const refund = await this.refundService.approveRefund(tenantId!, refundId, approvedByPartyId, correlationId);
      return this.ok(refund, correlationId);
    } catch (e: any) {
      return this.fail('APPROVAL_FAILED', e.message, correlationId);
    }
  }

  @Post('/brokerage/refunds/:refundId/send')
  @RequirePermissions('billing:payments:refund')
  async sendRefund(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('refundId') refundId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;

    try {
      const refund = await this.refundService.sendRefund({
        tenantId: tenantId!,
        refundId,
        destinationAccount: body.destinationAccount,
        sourceAccount: body.sourceAccount,
        correlationId,
      });
      return this.ok(refund, correlationId);
    } catch (e: any) {
      return this.fail('SEND_REFUND_FAILED', e.message, correlationId);
    }
  }

  @Post('/brokerage/clawbacks/calculate')
  @RequirePermissions('billing:settlements:manage')
  async calculateClawback(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;

    try {
      const result = await this.clawbackService.calculateClawback(tenantId!, body.policyId);
      return this.ok(result, correlationId);
    } catch (e: any) {
      return this.fail('CLAWBACK_CALCULATION_FAILED', e.message, correlationId);
    }
  }

  @Post('/brokerage/clawbacks/apply')
  @RequirePermissions('billing:settlements:manage')
  async applyClawback(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;

    try {
      const result = await this.clawbackService.applyClawback({
        tenantId: tenantId!,
        organizationId: body.organizationId,
        policyId: body.policyId,
        cancellationSourceId: body.cancellationSourceId,
        totalClawbackAmountMinor: body.amountMinor,
        currency: body.currency,
        reason: body.reason,
        approvedByPartyId: body.approvedByPartyId,
        correlationId,
      });
      return this.ok(result, correlationId);
    } catch (e: any) {
      return this.fail('CLAWBACK_FAILED', e.message, correlationId);
    }
  }

  @Get('/brokerage/escrow/holdings')
  @RequirePermissions('billing:escrow:view')
  async getEscrowHoldings(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query() query: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;

    try {
      const holdings = await this.escrowService.getHoldings(tenantId!, query.escrowAccountRef);
      return this.ok(holdings, correlationId);
    } catch (e: any) {
      return this.fail('ESCROW_QUERY_FAILED', e.message, correlationId);
    }
  }

  @Post('/brokerage/escrow/holdings/:holdingId/release')
  @RequirePermissions('billing:settlements:manage')
  async releaseEscrow(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('holdingId') holdingId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;

    try {
      const release = await this.escrowService.releaseEscrow({
        tenantId: tenantId!,
        holdingId,
        releaseType: body.releaseType,
        amountMinor: body.amountMinor,
        destinationAccountRef: body.destinationAccountRef,
        paymentId: body.paymentId,
        correlationId,
      });
      return this.ok(release, correlationId);
    } catch (e: any) {
      return this.fail('ESCROW_RELEASE_FAILED', e.message, correlationId);
    }
  }

  @Get('/brokerage/escrow/holdings/:holdingId/eligibility')
  @RequirePermissions('billing:settlements:manage')
  async checkEscrowReleaseEligibility(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('holdingId') holdingId: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;

    try {
      const holding = await this.escrowService.getHolding(tenantId!, holdingId);
      if (!holding) return this.fail('NOT_FOUND', 'Escrow holding not found', correlationId);
      const evaluation = await this.escrowRulesService.evaluateReleaseEligibility(holding);
      return this.ok(evaluation, correlationId);
    } catch (e: any) {
      return this.fail('ESCROW_ELIGIBILITY_FAILED', e.message, correlationId);
    }
  }

  @Post('/brokerage/escrow/holdings/:holdingId/carrier-approve')
  @RequirePermissions('billing:settlements:manage')
  async approveCarrierEscrow(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('holdingId') holdingId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;

    try {
      const holding = await this.escrowRulesService.markCarrierApproved(
        tenantId!,
        holdingId,
        body.approvedBy || req?.user?.partyId || 'system',
        correlationId,
      );
      return this.ok(holding, correlationId);
    } catch (e: any) {
      return this.fail('ESCROW_CARRIER_APPROVE_FAILED', e.message, correlationId);
    }
  }

  @Post('/brokerage/escrow/auto-release')
  @RequirePermissions('billing:settlements:manage')
  async autoReleaseEscrow(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;

    try {
      const releases = await this.escrowRulesService.autoReleaseEligibleHoldings(tenantId!, correlationId);
      return this.ok({ count: releases.length, releases }, correlationId);
    } catch (e: any) {
      return this.fail('ESCROW_AUTO_RELEASE_FAILED', e.message, correlationId);
    }
  }

  @Post('/brokerage/invoices/:invoiceId/pay')
  @RequirePermissions('billing:payments:initiate')
  async payInvoice(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('invoiceId') invoiceId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;

    try {
      const result = await this.customerPaymentService.initiate({
        tenantId: tenantId!,
        organizationId: body.organizationId,
        invoiceId,
        sourceAccount: body.sourceAccount,
        destinationAccountRef: body.destinationAccountRef,
        rail: body.rail,
        amountMinor: body.amountMinor,
        correlationId,
        callbackUrl: body.callbackUrl,
        metadata: body.metadata,
      });
      return this.ok(result, correlationId);
    } catch (e: any) {
      return this.fail('PAYMENT_INITIATION_FAILED', e.message, correlationId);
    }
  }

  @Get('/brokerage/payments/:paymentId')
  @RequirePermissions('billing:payments:verify')
  async getPayment(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('paymentId') paymentId: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;

    try {
      const payment = await this.customerPaymentService.getPayment(tenantId!, paymentId);
      if (!payment) return this.fail('NOT_FOUND', 'Payment not found', correlationId);
      return this.ok(payment, correlationId);
    } catch (e: any) {
      return this.fail('PAYMENT_QUERY_FAILED', e.message, correlationId);
    }
  }

  @Post('/brokerage/payments/:paymentId/retry')
  @RequirePermissions('billing:payments:initiate')
  async retryPayment(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('paymentId') paymentId: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;

    try {
      const result = await this.customerPaymentService.retryPayment(tenantId!, paymentId, correlationId);
      return this.ok(result, correlationId);
    } catch (e: any) {
      return this.fail('PAYMENT_RETRY_FAILED', e.message, correlationId);
    }
  }
}
