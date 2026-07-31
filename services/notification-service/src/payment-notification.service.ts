import { Injectable, Logger } from '@nestjs/common';
import { PaymentSmsTemplate } from './templates/payment-sms-template';
import { PaymentEmailTemplate } from './templates/payment-email-template';

export interface PaymentNotificationEvent {
  eventType: 'PaymentInitiated' | 'PaymentSettled' | 'PaymentFailed' | 'RefundInitiated' | 'RefundSettled';
  tenantId: string;
  organizationId?: string;
  customerPartyId?: string;
  correlationId?: string;
  payload: {
    invoiceId?: string;
    paymentId?: string;
    refundId?: string;
    amountMinor?: string;
    currency?: string;
    cardPan?: string;
    language?: string;
    brandKey?: string;
  };
}

@Injectable()
export class PaymentNotificationService {
  private readonly logger = new Logger(PaymentNotificationService.name);

  constructor(
    private readonly smsTemplate: PaymentSmsTemplate,
    private readonly emailTemplate: PaymentEmailTemplate,
  ) {}

  async handlePaymentEvent(event: PaymentNotificationEvent): Promise<{ sms?: string; email?: string }> {
    const lang = event.payload.language || 'fa';
    const brandKey = event.payload.brandKey || 'default';
    let sms: string | undefined;
    let email: string | undefined;

    switch (event.eventType) {
      case 'PaymentInitiated':
        sms = this.smsTemplate.paymentInitiated(event.payload, lang);
        email = this.emailTemplate.paymentInitiated(event.payload, brandKey, lang);
        break;
      case 'PaymentSettled':
        sms = this.smsTemplate.paymentSettled(event.payload, lang);
        email = this.emailTemplate.paymentSettled(event.payload, brandKey, lang);
        break;
      case 'PaymentFailed':
        sms = this.smsTemplate.paymentFailed(event.payload, lang);
        email = this.emailTemplate.paymentFailed(event.payload, brandKey, lang);
        break;
      case 'RefundInitiated':
        sms = this.smsTemplate.refundInitiated(event.payload, lang);
        email = this.emailTemplate.refundInitiated(event.payload, brandKey, lang);
        break;
      case 'RefundSettled':
        sms = this.smsTemplate.refundSettled(event.payload, lang);
        email = this.emailTemplate.refundSettled(event.payload, brandKey, lang);
        break;
    }

    this.logger.log(`Generated ${event.eventType} notification for invoice ${event.payload.invoiceId}`);
    return { sms, email };
  }

  maskCardPan(pan?: string): string {
    if (!pan || pan.length < 8) return '****';
    return pan.slice(0, 4) + '****' + pan.slice(-4);
  }
}
