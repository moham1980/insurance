import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { RefundRequest, RefundStatus } from './refund-request.entity';
import { RefundCalculationService } from './refund-calculation.service';
import { PaymentTransaction } from '../entities/PaymentTransaction';
import { PremiumInvoice } from '../invoicing/premium-invoice.entity';
import { LedgerPostingService } from '../ledger/ledger-posting.service';
import { EscrowService } from '../escrow/escrow.service';
import { OutboxPublisher } from '@insurance/shared';

export interface CreateRefundInput {
  tenantId: string;
  organizationId: string;
  sourceType: 'POLICY_CANCELLATION' | 'ENDORSEMENT' | 'OVERPAYMENT';
  sourceId: string;
  originalPaymentId: string;
  requestedAmountMinor: string;
  currency: string;
  reason: string;
  approvedByPartyId?: string;
  correlationId?: string;
}

export interface SendRefundInput {
  tenantId: string;
  refundId: string;
  destinationAccount: string;
  sourceAccount?: string;
  correlationId?: string;
}

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    @InjectRepository(RefundRequest) private readonly refundRepo: Repository<RefundRequest>,
    @InjectRepository(PaymentTransaction) private readonly paymentRepo: Repository<PaymentTransaction>,
    @InjectRepository(PremiumInvoice) private readonly invoiceRepo: Repository<PremiumInvoice>,
    private readonly calculation: RefundCalculationService,
    private readonly ledgerPosting: LedgerPostingService,
    private readonly escrow: EscrowService,
    private readonly dataSource: DataSource,
  ) {}

  private getPaymentServiceUrl(): string {
    return process.env.PAYMENT_SERVICE_URL || 'http://localhost:8085';
  }

  private resolveAuthHeaders(correlationId?: string): Record<string, string> {
    const token = process.env.PAYMENT_SERVICE_TOKEN || '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (correlationId) {
      headers['X-Correlation-Id'] = correlationId;
    }
    return headers;
  }

  async createRefund(input: CreateRefundInput): Promise<RefundRequest> {
    const calculation = await this.calculation.calculate({
      tenantId: input.tenantId,
      originalPaymentId: input.originalPaymentId,
      policyId: input.sourceId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      requestedAmountMinor: input.requestedAmountMinor,
      currency: input.currency,
    });

    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const refundRepo = manager.getRepository(RefundRequest);

      const refund = refundRepo.create({
        refundId: uuidv4(),
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        originalPaymentId: input.originalPaymentId,
        amountMinor: calculation.approvedAmountMinor,
        currency: calculation.currency,
        reason: input.reason,
        status: 'pending',
        approvedByPartyId: input.approvedByPartyId || null,
        paymentId: null,
        metadata: { unearnedPremiumMinor: calculation.unearnedPremiumMinor, calculationReason: calculation.reason },
      });
      const saved = await refundRepo.save(refund);

      await outbox.publish({
        topic: 'insurance.billing.refund.initiated',
        eventType: 'RefundInitiated',
        eventVersion: 1,
        correlationId: input.correlationId || uuidv4(),
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        subject: { refundId: saved.refundId, sourceId: input.sourceId },
        payload: {
          refundId: saved.refundId,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          amountMinor: saved.amountMinor,
          currency: saved.currency,
        },
      });

      return saved;
    });
  }

  async approveRefund(tenantId: string, refundId: string, approvedByPartyId: string, correlationId?: string): Promise<RefundRequest> {
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const refundRepo = manager.getRepository(RefundRequest);
      const refund = await refundRepo.findOne({ where: { refundId, tenantId } });
      if (!refund) throw new NotFoundException('Refund not found');
      if (refund.status !== 'pending') throw new BadRequestException('Refund is not pending');
      refund.status = 'approved';
      refund.approvedByPartyId = approvedByPartyId;
      const saved = await refundRepo.save(refund);

      await outbox.publish({
        topic: 'insurance.billing.refund.approved',
        eventType: 'RefundApproved',
        eventVersion: 1,
        correlationId: correlationId || uuidv4(),
        tenantId,
        organizationId: refund.organizationId,
        subject: { refundId: saved.refundId },
        payload: { refundId: saved.refundId, approvedByPartyId },
      });

      return saved;
    });
  }

  async sendRefund(input: SendRefundInput): Promise<RefundRequest> {
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const refundRepo = manager.getRepository(RefundRequest);
      const paymentRepo = manager.getRepository(PaymentTransaction);
      const invoiceRepo = manager.getRepository(PremiumInvoice);

      const refund = await refundRepo.findOne({ where: { refundId: input.refundId, tenantId: input.tenantId } });
      if (!refund) throw new NotFoundException('Refund not found');
      if (refund.status !== 'approved') throw new BadRequestException('Refund must be approved before sending');

      const originalPayment = await paymentRepo.findOne({ where: { id: refund.originalPaymentId, tenantId: input.tenantId } });
      if (!originalPayment) throw new BadRequestException('Original payment not found');

      const invoice = await invoiceRepo.findOne({ where: { invoiceId: originalPayment.invoiceId, tenantId: input.tenantId } });
      const sourceAccount = input.sourceAccount || process.env.INSURANCE_ESCROW_ACCOUNT_NUMBER;
      if (!sourceAccount) {
        throw new BadRequestException('INSURANCE_ESCROW_ACCOUNT_NUMBER is not configured');
      }

      const paymentServiceUrl = this.getPaymentServiceUrl();
      const idempotencyKey = `refund-${refund.refundId}`;

      const response = await fetch(`${paymentServiceUrl}/api/v1/ecosystem/payments/initiate`, {
        method: 'POST',
        headers: {
          ...this.resolveAuthHeaders(input.correlationId),
          'X-Idempotency-Key': idempotencyKey,
          'X-Tenant-Id': input.tenantId,
        },
        body: JSON.stringify({
          fromAccountId: sourceAccount,
          toAccountId: input.destinationAccount,
          amount: refund.amountMinor,
          currency: refund.currency,
          paymentType: 'TRANSFER',
          rail: 'PAYA',
          reference: `refund-${refund.refundId}`,
          description: `Refund for ${refund.sourceType} ${refund.sourceId}`,
        }),
      });

      if (!response.ok && response.status !== 202) {
        const errBody = await response.text();
        refund.status = 'failed';
        await refundRepo.save(refund);
        throw new BadRequestException(`Refund payment failed: ${response.status} ${errBody}`);
      }

      const result: any = await response.json();
      refund.paymentId = result.paymentId || null;
      refund.status = 'sent';
      const saved = await refundRepo.save(refund);

      // ledger reversal
      if (invoice) {
        await this.ledgerPosting.post({
          tenantId: input.tenantId,
          organizationId: invoice.organizationId,
          sourceType: 'REFUND',
          sourceId: refund.refundId,
          periodId: 'default',
          idempotencyKey: `ledger-refund-${refund.refundId}`,
          postingDate: new Date(),
          description: `Refund for invoice ${invoice.invoiceNumber}`,
          correlationId: input.correlationId || uuidv4(),
          lines: [
            {
              accountCode: 'PREMIUM_RECEIVABLE',
              accountName: 'Premium Receivable',
              accountType: 'ASSET',
              debit: refund.amountMinor,
              credit: '0',
              currency: refund.currency,
              description: 'Reinstate receivable due to refund',
            },
            {
              accountCode: 'CASH_ESCROW',
              accountName: 'Customer Premium Escrow',
              accountType: 'ASSET',
              debit: '0',
              credit: refund.amountMinor,
              currency: refund.currency,
              description: 'Reduce escrow for refund payout',
            },
          ],
        });
      }

      await outbox.publish({
        topic: 'insurance.billing.refund.sent',
        eventType: 'RefundSent',
        eventVersion: 1,
        correlationId: input.correlationId || uuidv4(),
        tenantId: input.tenantId,
        organizationId: refund.organizationId,
        subject: { refundId: saved.refundId, paymentId: saved.paymentId || undefined },
        payload: {
          refundId: saved.refundId,
          paymentId: saved.paymentId,
          amountMinor: saved.amountMinor,
          currency: saved.currency,
        },
      });

      if (invoice?.customerPartyId) {
        await outbox.publish({
          topic: 'insurance.billing.refund.customer-notification',
          eventType: 'CustomerRefundNotification',
          eventVersion: 1,
          correlationId: input.correlationId || uuidv4(),
          tenantId: input.tenantId,
          organizationId: refund.organizationId,
          subject: { refundId: saved.refundId, customerPartyId: invoice.customerPartyId },
          payload: {
            refundId: saved.refundId,
            customerPartyId: invoice.customerPartyId,
            notificationType: 'refund_sent',
            amountMinor: saved.amountMinor,
            currency: saved.currency,
            reason: refund.reason,
            paymentId: saved.paymentId,
            message: `Your refund of ${saved.amountMinor} ${saved.currency} has been sent.`,
          },
        });
      }

      return saved;
    });
  }

  async settleRefund(tenantId: string, refundId: string, correlationId?: string): Promise<RefundRequest> {
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const refundRepo = manager.getRepository(RefundRequest);
      const refund = await refundRepo.findOne({ where: { refundId, tenantId } });
      if (!refund) throw new NotFoundException('Refund not found');
      if (refund.status !== 'sent') throw new BadRequestException('Refund is not sent');

      refund.status = 'settled';
      const saved = await refundRepo.save(refund);

      await outbox.publish({
        topic: 'insurance.billing.refund.settled',
        eventType: 'RefundSettled',
        eventVersion: 1,
        correlationId: correlationId || uuidv4(),
        tenantId,
        organizationId: refund.organizationId,
        subject: { refundId: saved.refundId },
        payload: { refundId: saved.refundId, paymentId: saved.paymentId },
      });

      return saved;
    });
  }

  async getRefund(tenantId: string, refundId: string): Promise<RefundRequest | null> {
    return this.refundRepo.findOne({ where: { refundId, tenantId } });
  }

  async failRefund(tenantId: string, refundId: string, reason: string, correlationId?: string): Promise<RefundRequest> {
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const refundRepo = manager.getRepository(RefundRequest);
      const refund = await refundRepo.findOne({ where: { refundId, tenantId } });
      if (!refund) throw new NotFoundException('Refund not found');
      if (refund.status === 'settled') throw new BadRequestException('Cannot fail a settled refund');

      refund.status = 'failed';
      const saved = await refundRepo.save(refund);

      await outbox.publish({
        topic: 'insurance.billing.refund.failed',
        eventType: 'RefundFailed',
        eventVersion: 1,
        correlationId: correlationId || uuidv4(),
        tenantId,
        organizationId: refund.organizationId,
        subject: { refundId: saved.refundId },
        payload: { refundId: saved.refundId, paymentId: saved.paymentId, reason },
      });

      const originalPayment = await this.paymentRepo.findOne({ where: { id: refund.originalPaymentId, tenantId } });
      if (originalPayment) {
        const inv = await this.invoiceRepo.findOne({ where: { invoiceId: originalPayment.invoiceId, tenantId } });
        if (inv?.customerPartyId) {
          await outbox.publish({
            topic: 'insurance.billing.refund.customer-notification',
            eventType: 'CustomerRefundNotification',
            eventVersion: 1,
            correlationId: correlationId || uuidv4(),
            tenantId,
            organizationId: refund.organizationId,
            subject: { refundId: saved.refundId, customerPartyId: inv.customerPartyId },
            payload: {
              refundId: saved.refundId,
              customerPartyId: inv.customerPartyId,
              notificationType: 'refund_failed',
              amountMinor: refund.amountMinor,
              currency: refund.currency,
              reason,
              message: `Your refund of ${refund.amountMinor} ${refund.currency} has failed. Reason: ${reason}`,
            },
          });
        }
      }

      return saved;
    });
  }
}
