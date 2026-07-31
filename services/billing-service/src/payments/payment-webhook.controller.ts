import { Controller, Post, Body, Headers, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PaymentTransaction } from '../entities/PaymentTransaction';
import { PremiumInvoice } from '../invoicing/premium-invoice.entity';
import { CustomerPaymentService } from './customer-payment.service';
import { OutboxPublisher } from '@insurance/shared';
import { createHmac } from 'crypto';

export interface PaymentWebhookPayload {
  paymentId: string;
  status: string;
  railReference?: string;
  amount?: string;
  currency?: string;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
}

@Controller('webhooks/payments')
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(
    @InjectRepository(PaymentTransaction) private readonly paymentRepo: Repository<PaymentTransaction>,
    @InjectRepository(PremiumInvoice) private readonly invoiceRepo: Repository<PremiumInvoice>,
    private readonly customerPaymentService: CustomerPaymentService,
    private readonly dataSource: DataSource,
  ) {}

  private verifySignature(body: any, signature: string): boolean {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET || '';
    if (!secret) {
      this.logger.warn('PAYMENT_WEBHOOK_SECRET not set; skipping signature verification');
      return true;
    }
    const expected = createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex');
    return signature === expected;
  }

  @Post()
  async handleWebhook(
    @Body() body: PaymentWebhookPayload,
    @Headers('x-signature') signature: string,
    @Headers('x-idempotency-key') idempotencyKey: string,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-correlation-id') correlationId: string,
  ) {
    if (!tenantId) throw new BadRequestException('X-Tenant-Id header is required');

    if (!this.verifySignature(body, signature || '')) {
      throw new BadRequestException('Invalid webhook signature');
    }

    if (idempotencyKey) {
      const existing = await this.paymentRepo.findOne({ where: { idempotencyKey, tenantId } });
      if (existing && existing.status === 'SUCCESS') {
        return { success: true, data: { paymentId: existing.id, status: existing.status } };
      }
    }

    // Find payment by payment service id (authority) or idempotency key
    const payment = await this.paymentRepo.findOne({
      where: [
        { authority: body.paymentId, tenantId },
        { idempotencyKey, tenantId },
      ],
    });

    if (!payment) {
      throw new BadRequestException('Payment not found for webhook');
    }

    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const paymentRepo = manager.getRepository(PaymentTransaction);
      const invoiceRepo = manager.getRepository(PremiumInvoice);

      if (body.status === 'SETTLED') {
        payment.status = 'SUCCESS';
        payment.refId = body.railReference || payment.refId;
      } else if (body.status === 'FAILED') {
        payment.status = 'FAILED';
      } else {
        payment.status = 'PENDING';
      }
      payment.updatedAt = new Date();
      await paymentRepo.save(payment);

      const invoice = await invoiceRepo.findOne({ where: { invoiceId: payment.invoiceId, tenantId } });
      if (payment.status === 'SUCCESS' && invoice) {
        invoice.status = 'paid';
        invoice.paidAt = new Date();
        await invoiceRepo.save(invoice);

        await outbox.publish({
          topic: 'insurance.billing.payment.settled',
          eventType: 'PaymentSettled',
          eventVersion: 1,
          correlationId: correlationId || `wh-${Date.now()}`,
          tenantId,
          organizationId: invoice.organizationId,
          subject: { invoiceId: invoice.invoiceId, paymentId: payment.id },
          payload: {
            invoiceId: invoice.invoiceId,
            paymentId: payment.id,
            amountMinor: invoice.totalAmountMinor,
            currency: invoice.currency,
            railReference: body.railReference,
          },
        });
      } else if (payment.status === 'FAILED' && invoice) {
        invoice.status = (invoice.paidAmountMinor && invoice.paidAmountMinor !== '0') ? 'partial' : 'overdue';
        await invoiceRepo.save(invoice);

        await outbox.publish({
          topic: 'insurance.billing.payment.failed',
          eventType: 'PaymentFailed',
          eventVersion: 1,
          correlationId: correlationId || `wh-${Date.now()}`,
          tenantId,
          subject: { paymentId: payment.id, invoiceId: invoice.invoiceId },
          payload: { paymentId: payment.id, invoiceId: invoice.invoiceId, reason: body.status },
        });
      }

      return { success: true, data: { paymentId: payment.id, status: payment.status } };
    });
  }
}
