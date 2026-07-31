import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PremiumInvoice } from '../invoicing/premium-invoice.entity';
import { PremiumInstallmentPlan, InstallmentScheduleItem } from '../invoicing/installment-plan.entity';
import { PaymentTransaction } from '../entities/PaymentTransaction';
import { OutboxPublisher } from '@insurance/shared';
import { IdempotencyService } from '../idempotency.service';
import { LedgerPostingService } from '../ledger/ledger-posting.service';
import { PaymentStateMachine, PaymentStatus } from './payment-state-machine';
import { EscrowService } from '../escrow/escrow.service';

export interface CustomerPaymentInitiateInput {
  tenantId: string;
  organizationId: string;
  invoiceId: string;
  sourceAccount: string;
  destinationAccountRef?: string;
  rail?: 'SATNA' | 'PAYA' | 'SHETAB';
  correlationId?: string;
  idempotencyKey?: string;
  callbackUrl?: string;
  amountMinor?: string;
  planId?: string;
  itemId?: string;
  metadata?: Record<string, any>;
}

export interface CustomerPaymentResult {
  paymentId: string;
  status: PaymentStatus;
  paymentServiceId?: string;
  amount: string;
  currency: string;
}

export interface CustomerPayment {
  paymentId: string;
  invoiceId: string;
  status: PaymentStatus;
  amount: string;
  currency: string;
  provider: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CustomerPaymentService {
  private readonly logger = new Logger(CustomerPaymentService.name);

  constructor(
    @InjectRepository(PremiumInvoice) private readonly invoiceRepo: Repository<PremiumInvoice>,
    @InjectRepository(PremiumInstallmentPlan) private readonly planRepo: Repository<PremiumInstallmentPlan>,
    @InjectRepository(PaymentTransaction) private readonly paymentRepo: Repository<PaymentTransaction>,
    private readonly dataSource: DataSource,
    private readonly idempotencyService: IdempotencyService,
    private readonly ledgerPosting: LedgerPostingService,
    private readonly escrow: EscrowService,
  ) {}

  private getPaymentServiceUrl(): string {
    return process.env.PAYMENT_SERVICE_URL || 'http://localhost:8085';
  }

  private resolveEscrowAccountRef(inputRef?: string): string {
    const ref = inputRef || process.env.INSURANCE_ESCROW_ACCOUNT_REF || 'insurance-premium-clearing';
    return ref;
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

  private async resolveAccountNumberFromRef(accountRef: string): Promise<string> {
    const explicit = process.env[`ACCOUNT_REF_${accountRef}`] || process.env[accountRef];
    if (explicit) return explicit;
    const vault = process.env.INSURANCE_ESCROW_ACCOUNT_NUMBER;
    if (!vault) {
      throw new BadRequestException(`Escrow account number for ref ${accountRef} is not configured`);
    }
    return vault;
  }

  async initiate(input: CustomerPaymentInitiateInput): Promise<CustomerPaymentResult> {
    const scope = 'customerPaymentInitiate';
    if (input.idempotencyKey) {
      const cached = await this.idempotencyService.getExisting(input.tenantId, scope, input.idempotencyKey);
      if (cached?.payment) return cached.payment as CustomerPaymentResult;
    }

    return await this.dataSource.transaction(async (manager) => {
      const invoiceRepo = manager.getRepository(PremiumInvoice);
      const paymentRepo = manager.getRepository(PaymentTransaction);
      const outbox = new OutboxPublisher(manager);

      const invoice = await invoiceRepo.findOne({
        where: { invoiceId: input.invoiceId, tenantId: input.tenantId },
      });
      if (!invoice) throw new NotFoundException('Invoice not found');
      if (invoice.status === 'paid' || invoice.status === 'cancelled') {
        throw new BadRequestException(`Invoice is already ${invoice.status}`);
      }

      const amountMinor = input.amountMinor || invoice.totalAmountMinor;
      const paymentId = uuidv4();
      const authority = uuidv4();
      const idempotencyKey = input.idempotencyKey || (input.itemId ? `inst-${input.itemId}-${paymentId}` : `inv-${input.invoiceId}-${paymentId}`);
      const paymentServiceUrl = this.getPaymentServiceUrl();
      const escrowRef = this.resolveEscrowAccountRef(input.destinationAccountRef);
      const escrowAccountNumber = await this.resolveAccountNumberFromRef(escrowRef);

      const payment = paymentRepo.create({
        id: paymentId,
        tenantId: input.tenantId,
        invoiceId: input.invoiceId,
        amount: amountMinor,
        provider: 'ECOSYSTEM',
        authority,
        status: 'PENDING',
        paymentState: 'INITIATED',
        callbackUrl: input.callbackUrl || '',
        idempotencyKey,
        metadata: {
          ...input.metadata,
          organizationId: input.organizationId,
          customerPartyId: invoice.customerPartyId,
          policyId: invoice.policyId,
          invoiceId: input.invoiceId,
          amountMinor,
          currency: invoice.currency,
          escrowAccountRef: escrowRef,
          escrowAccountNumber: '[REDACTED]',
          rail: input.rail || 'PAYA',
          sourceAccount: input.sourceAccount || null,
          planId: input.planId || null,
          itemId: input.itemId || null,
        },
      });
      const savedPayment = await paymentRepo.save(payment);

      const requestHeaders = {
        ...this.resolveAuthHeaders(input.correlationId),
        'X-Idempotency-Key': idempotencyKey,
        'X-Tenant-Id': input.tenantId,
      };
      const response = await fetch(`${paymentServiceUrl}/api/v1/ecosystem/payments/initiate`, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({
          fromAccountId: input.sourceAccount,
          toAccountId: escrowAccountNumber,
          amount: amountMinor,
          currency: invoice.currency,
          paymentType: 'TRANSFER',
          rail: input.rail || 'PAYA',
          reference: input.itemId ? `installment-${input.itemId}` : `invoice-${input.invoiceId}`,
          description: input.itemId
            ? `Installment payment for invoice ${invoice.invoiceNumber}`
            : `Insurance premium invoice ${invoice.invoiceNumber}`,
          metadata: {
            invoiceId: input.invoiceId,
            policyId: invoice.policyId,
            tenantId: input.tenantId,
            organizationId: input.organizationId,
            planId: input.planId || undefined,
            itemId: input.itemId || undefined,
          },
        }),
      });

      if (!response.ok && response.status !== 202) {
        const errBody = await response.text();
        savedPayment.status = 'FAILED';
        await paymentRepo.save(savedPayment);
        throw new BadRequestException(`Ecosystem payment initiation failed: ${response.status} ${errBody}`);
      }

      const result: any = await response.json();
      savedPayment.authority = result.paymentId || authority;
      await paymentRepo.save(savedPayment);

      await this.escrow.holdEscrow(
        manager,
        {
          tenantId: input.tenantId,
          escrowAccountRef: escrowRef,
          sourceType: 'PREMIUM',
          sourceId: savedPayment.id,
          amountMinor,
          currency: invoice.currency,
          expectedReleaseAt: this.addDays(new Date(), 3),
          correlationId: input.correlationId || uuidv4(),
        },
        invoice,
      );

      await outbox.publish({
        topic: 'insurance.billing.payment.initiated',
        eventType: 'PaymentInitiated',
        eventVersion: 1,
        correlationId: input.correlationId || uuidv4(),
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        subject: { invoiceId: input.invoiceId, paymentId: savedPayment.id },
        payload: {
          invoiceId: input.invoiceId,
          paymentId: savedPayment.id,
          amountMinor,
          currency: invoice.currency,
          rail: input.rail || 'PAYA',
        },
      });

      const final: CustomerPaymentResult = {
        paymentId: savedPayment.id,
        status: PaymentStateMachine.fromTransactionStatus(savedPayment.status),
        paymentServiceId: savedPayment.authority,
        amount: amountMinor,
        currency: invoice.currency,
      };

      if (input.idempotencyKey) {
        await this.idempotencyService.store(input.tenantId, scope, input.idempotencyKey, { payment: final });
      }

      return final;
    });
  }

  async getPayment(tenantId: string, paymentId: string): Promise<CustomerPayment | null> {
    const entity = await this.paymentRepo.findOne({ where: { id: paymentId, tenantId } });
    if (!entity) return null;
    const invoice = await this.invoiceRepo.findOne({
      where: { invoiceId: entity.invoiceId, tenantId },
    });
    return {
      paymentId: entity.id,
      invoiceId: entity.invoiceId,
      status: PaymentStateMachine.fromTransactionStatus(entity.status),
      amount: String(entity.amount),
      currency: (entity.metadata?.currency as string) || invoice?.currency || 'IRR',
      provider: entity.provider,
      metadata: entity.metadata || {},
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  async pollPayment(tenantId: string, paymentId: string, correlationId?: string): Promise<CustomerPayment> {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId, tenantId } });
    if (!payment) throw new NotFoundException('Payment not found');

    if (payment.status === 'SUCCESS' || payment.status === 'FAILED' || payment.status === 'CANCELLED') {
      return this.getPayment(tenantId, paymentId) as Promise<CustomerPayment>;
    }

    const paymentServiceUrl = this.getPaymentServiceUrl();
    const response = await fetch(`${paymentServiceUrl}/api/v1/ecosystem/payments/${payment.authority}`, {
      method: 'GET',
      headers: {
        ...this.resolveAuthHeaders(correlationId),
        'X-Tenant-Id': tenantId,
      },
    });

    if (!response.ok) {
      throw new BadRequestException(`Payment status check failed: ${response.status}`);
    }

    const result: any = await response.json();
    const newStatus = result.status as string;

    if (PaymentStateMachine.canTransition(payment.status as PaymentStatus, newStatus)) {
      return await this.dataSource.transaction(async (manager) => {
        const paymentRepo = manager.getRepository(PaymentTransaction);
        const invoiceRepo = manager.getRepository(PremiumInvoice);
        const outbox = new OutboxPublisher(manager);

        payment.status = PaymentStateMachine.toTransactionStatus(newStatus);
        payment.paymentState = newStatus;
        payment.updatedAt = new Date();
        if (result.railReference) payment.refId = result.railReference;
        await paymentRepo.save(payment);

        const invoice = await invoiceRepo.findOne({ where: { invoiceId: payment.invoiceId, tenantId } });
        const paymentAmountMinor = String(payment.amount);

        if (payment.status === 'SUCCESS' && invoice) {
          const currentPaid = BigInt(invoice.paidAmountMinor || '0');
          const paidTotal = currentPaid + BigInt(paymentAmountMinor);
          invoice.paidAmountMinor = paidTotal.toString();
          if (paidTotal >= BigInt(invoice.totalAmountMinor)) {
            invoice.status = 'paid';
          } else if (paidTotal > BigInt(0)) {
            invoice.status = 'partial';
          }
          invoice.paidAt = new Date();
          await invoiceRepo.save(invoice);

          const itemId = payment.metadata?.itemId as string | undefined;
          const planId = payment.metadata?.planId as string | undefined;
          if (planId && itemId) {
            const plan = await manager.getRepository(PremiumInstallmentPlan).findOne({ where: { planId } });
            if (plan) {
              const item = plan.schedule.find((i: InstallmentScheduleItem) => i.itemId === itemId);
              if (item) {
                item.status = 'paid';
                item.paidAt = new Date();
                item.paymentId = payment.id;
                await manager.getRepository(PremiumInstallmentPlan).save(plan);
              }
            }
          }

          await this.ledgerPosting.post({
            tenantId,
            organizationId: (payment.metadata?.organizationId as string) || invoice.organizationId,
            sourceType: 'PAYMENT',
            sourceId: payment.id,
            periodId: 'default',
            idempotencyKey: `ledger-payment-${payment.id}`,
            postingDate: new Date(),
            description: payment.metadata?.itemId
              ? `Installment payment for invoice ${invoice.invoiceNumber}`
              : `Customer payment for invoice ${invoice.invoiceNumber}`,
            correlationId: correlationId || uuidv4(),
            lines: [
              {
                accountCode: 'CASH_ESCROW',
                accountName: 'Customer Premium Escrow',
                accountType: 'ASSET',
                debit: paymentAmountMinor,
                credit: '0',
                currency: invoice.currency,
                description: 'Premium held in escrow',
                dimensions: { policyId: invoice.policyId },
              },
              {
                accountCode: 'PREMIUM_RECEIVABLE',
                accountName: 'Premium Receivable',
                accountType: 'ASSET',
                debit: '0',
                credit: paymentAmountMinor,
                currency: invoice.currency,
                description: 'Receivable settled',
                dimensions: { policyId: invoice.policyId },
              },
            ],
          });

          await outbox.publish({
            topic: 'insurance.billing.payment.settled',
            eventType: 'PaymentSettled',
            eventVersion: 1,
            correlationId: correlationId || uuidv4(),
            tenantId,
            organizationId: invoice.organizationId,
            subject: { invoiceId: invoice.invoiceId, paymentId: payment.id },
            payload: {
              invoiceId: invoice.invoiceId,
              paymentId: payment.id,
              amountMinor: paymentAmountMinor,
              currency: invoice.currency,
            },
          });

          if (invoice.status === 'paid') {
            await outbox.publish({
              topic: 'insurance.billing.premium_invoice.paid',
              eventType: 'PremiumInvoicePaid',
              eventVersion: 1,
              correlationId: correlationId || uuidv4(),
              tenantId,
              organizationId: invoice.organizationId,
              subject: { invoiceId: invoice.invoiceId, policyId: invoice.policyId },
              payload: {
                invoiceId: invoice.invoiceId,
                policyId: invoice.policyId,
                totalAmountMinor: invoice.totalAmountMinor,
                paidAmountMinor: invoice.paidAmountMinor,
                currency: invoice.currency,
              },
            });
          }

          if (planId && itemId) {
            await outbox.publish({
              topic: 'insurance.billing.installment.paid',
              eventType: 'InstallmentPaid',
              eventVersion: 1,
              correlationId: correlationId || uuidv4(),
              tenantId,
              organizationId: invoice.organizationId,
              subject: { invoiceId: invoice.invoiceId, planId, itemId },
              payload: {
                invoiceId: invoice.invoiceId,
                planId,
                itemId,
                paymentId: payment.id,
                amountMinor: paymentAmountMinor,
                currency: invoice.currency,
              },
            });
          }
        } else if (payment.status === 'FAILED') {
          if (invoice) {
            invoice.status = (invoice.paidAmountMinor && invoice.paidAmountMinor !== '0') ? 'partial' : 'overdue';
            await invoiceRepo.save(invoice);

            if (invoice.status === 'overdue') {
              await outbox.publish({
                topic: 'insurance.billing.premium_invoice.overdue',
                eventType: 'PremiumInvoiceOverdue',
                eventVersion: 1,
                correlationId: correlationId || uuidv4(),
                tenantId,
                organizationId: invoice.organizationId,
                subject: { invoiceId: invoice.invoiceId, policyId: invoice.policyId },
                payload: {
                  invoiceId: invoice.invoiceId,
                  policyId: invoice.policyId,
                  totalAmountMinor: invoice.totalAmountMinor,
                  paidAmountMinor: invoice.paidAmountMinor || '0',
                  currency: invoice.currency,
                },
              });
            }
          }
          await outbox.publish({
            topic: 'insurance.billing.payment.failed',
            eventType: 'PaymentFailed',
            eventVersion: 1,
            correlationId: correlationId || uuidv4(),
            tenantId,
            subject: { paymentId: payment.id, invoiceId: payment.invoiceId },
            payload: { paymentId: payment.id, invoiceId: payment.invoiceId, reason: result.reason || 'failed' },
          });
        }

        return this.getPayment(tenantId, paymentId) as Promise<CustomerPayment>;
      });
    }

    return this.getPayment(tenantId, paymentId) as Promise<CustomerPayment>;
  }

  async retryPayment(tenantId: string, paymentId: string, correlationId?: string): Promise<CustomerPaymentResult> {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId, tenantId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'FAILED') {
      throw new BadRequestException('Only failed payments can be retried');
    }
    const invoice = await this.invoiceRepo.findOne({ where: { invoiceId: payment.invoiceId, tenantId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return this.initiate({
      tenantId,
      organizationId: (payment.metadata?.organizationId as string) || invoice.organizationId,
      invoiceId: invoice.invoiceId,
      sourceAccount: (payment.metadata?.sourceAccount as string) || '',
      rail: (payment.metadata?.rail as any) || 'PAYA',
      amountMinor: String(payment.amount),
      planId: (payment.metadata?.planId as string) || undefined,
      itemId: (payment.metadata?.itemId as string) || undefined,
      correlationId,
      callbackUrl: payment.callbackUrl,
      metadata: { ...payment.metadata, retryOf: paymentId },
    });
  }

  async payInstallment(input: {
    tenantId: string;
    organizationId: string;
    itemId: string;
    sourceAccount: string;
    paymentMethod?: string;
    rail?: 'SATNA' | 'PAYA' | 'SHETAB';
    correlationId?: string;
    callbackUrl?: string;
  }): Promise<CustomerPaymentResult> {
    const plan = await this.planRepo
      .createQueryBuilder('plan')
      .where('plan.schedule @> :item', { item: JSON.stringify([{ itemId: input.itemId }]) })
      .getOne();
    if (!plan) throw new NotFoundException('Installment not found');

    const item = plan.schedule.find((i: InstallmentScheduleItem) => i.itemId === input.itemId);
    if (!item) throw new NotFoundException('Installment item not found');
    if (item.status !== 'open') {
      throw new BadRequestException(`Installment is already ${item.status}`);
    }

    const invoice = await this.invoiceRepo.findOne({
      where: { invoiceId: plan.invoiceId, tenantId: input.tenantId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    return this.initiate({
      tenantId: input.tenantId,
      organizationId: input.organizationId,
      invoiceId: plan.invoiceId,
      sourceAccount: input.sourceAccount,
      amountMinor: item.amountMinor,
      planId: plan.planId,
      itemId: item.itemId,
      rail: input.rail || 'PAYA',
      correlationId: input.correlationId,
      callbackUrl: input.callbackUrl,
      metadata: {
        paymentMethod: input.paymentMethod,
      },
    });
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}
