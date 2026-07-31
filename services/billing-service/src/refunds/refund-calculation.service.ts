import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PremiumInvoice } from '../invoicing/premium-invoice.entity';
import { PaymentTransaction } from '../entities/PaymentTransaction';

export interface RefundCalculationInput {
  tenantId: string;
  originalPaymentId: string;
  policyId: string;
  sourceType: 'POLICY_CANCELLATION' | 'ENDORSEMENT' | 'OVERPAYMENT';
  sourceId: string;
  requestedAmountMinor: string;
  currency: string;
}

export interface RefundCalculationResult {
  approvedAmountMinor: string;
  currency: string;
  unearnedPremiumMinor: string;
  reason: string;
}

@Injectable()
export class RefundCalculationService {
  private readonly logger = new Logger(RefundCalculationService.name);

  constructor(
    @InjectRepository(PaymentTransaction) private readonly paymentRepo: Repository<PaymentTransaction>,
    @InjectRepository(PremiumInvoice) private readonly invoiceRepo: Repository<PremiumInvoice>,
  ) {}

  async calculate(input: RefundCalculationInput): Promise<RefundCalculationResult> {
    const payment = await this.paymentRepo.findOne({
      where: { id: input.originalPaymentId, tenantId: input.tenantId },
    });
    if (!payment) throw new BadRequestException('Original payment not found');
    if (payment.status !== 'SUCCESS') {
      throw new BadRequestException('Refund can only be calculated against a settled payment');
    }

    const invoice = await this.invoiceRepo.findOne({
      where: { invoiceId: payment.invoiceId, tenantId: input.tenantId },
    });
    if (!invoice) throw new BadRequestException('Invoice not found for payment');

    const paidAmount = BigInt(invoice.totalAmountMinor);
    const requested = BigInt(input.requestedAmountMinor);

    if (requested > paidAmount) {
      throw new BadRequestException('Refund amount cannot exceed original payment');
    }

    const unearned = this.estimateUnearnedPremium(invoice, input.sourceType);

    if (input.sourceType === 'POLICY_CANCELLATION') {
      if (requested > BigInt(unearned.unearnedMinor)) {
        throw new BadRequestException('Refund exceeds unearned premium for cancellation');
      }
    }

    return {
      approvedAmountMinor: requested.toString(),
      currency: input.currency,
      unearnedPremiumMinor: unearned.unearnedMinor,
      reason: unearned.reason,
    };
  }

  private estimateUnearnedPremium(
    invoice: PremiumInvoice,
    sourceType: string,
  ): { unearnedMinor: string; reason: string } {
    const total = BigInt(invoice.totalAmountMinor);
    if (sourceType === 'OVERPAYMENT') {
      return { unearnedMinor: total.toString(), reason: 'Full overpayment refund' };
    }
    const now = new Date();
    const start = new Date((invoice.metadata?.policyStartDate as string) || now.toISOString());
    const end = new Date((invoice.metadata?.policyEndDate as string) || now.toISOString());
    if (now >= end) {
      return { unearnedMinor: '0', reason: 'Policy period ended' };
    }
    const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.max(0, (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.max(0, totalDays - elapsedDays);
    const unearned = (total * BigInt(Math.floor(remainingDays))) / BigInt(Math.floor(totalDays));
    return { unearnedMinor: unearned.toString(), reason: `Pro-rata unearned premium (${remainingDays}/${totalDays} days)` };
  }
}
