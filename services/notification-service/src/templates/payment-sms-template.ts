import { Injectable } from '@nestjs/common';

export interface PaymentTemplatePayload {
  invoiceId?: string;
  paymentId?: string;
  refundId?: string;
  amountMinor?: string;
  currency?: string;
  cardPan?: string;
}

@Injectable()
export class PaymentSmsTemplate {
  private maskCardPan(pan?: string): string {
    if (!pan || pan.length < 8) return '****';
    return pan.slice(0, 4) + '****' + pan.slice(-4);
  }

  private formatAmount(amountMinor?: string, currency?: string): string {
    if (!amountMinor) return '-';
    const amount = (BigInt(amountMinor) / BigInt(10)).toString();
    return `${amount} ${currency || 'IRR'}`;
  }

  paymentInitiated(payload: PaymentTemplatePayload, lang: string): string {
    if (lang === 'fa') {
      return `پرداخت به مبلغ ${this.formatAmount(payload.amountMinor, payload.currency)} برای صورت‌حساب ${payload.invoiceId} آغاز شد.`;
    }
    return `Payment of ${this.formatAmount(payload.amountMinor, payload.currency)} for invoice ${payload.invoiceId} has been initiated.`;
  }

  paymentSettled(payload: PaymentTemplatePayload, lang: string): string {
    if (lang === 'fa') {
      return `پرداخت به مبلغ ${this.formatAmount(payload.amountMinor, payload.currency)} با موفقیت تسویه شد. کارت: ${this.maskCardPan(payload.cardPan)}`;
    }
    return `Payment of ${this.formatAmount(payload.amountMinor, payload.currency)} settled successfully. Card: ${this.maskCardPan(payload.cardPan)}`;
  }

  paymentFailed(payload: PaymentTemplatePayload, lang: string): string {
    if (lang === 'fa') {
      return `پرداخت صورت‌حساب ${payload.invoiceId} ناموفق بود. لطفاً مجدداً تلاش کنید.`;
    }
    return `Payment for invoice ${payload.invoiceId} failed. Please try again.`;
  }

  refundInitiated(payload: PaymentTemplatePayload, lang: string): string {
    if (lang === 'fa') {
      return `درخواست بازپرداخت به مبلغ ${this.formatAmount(payload.amountMinor, payload.currency)} ثبت شد.`;
    }
    return `Refund request of ${this.formatAmount(payload.amountMinor, payload.currency)} has been initiated.`;
  }

  refundSettled(payload: PaymentTemplatePayload, lang: string): string {
    if (lang === 'fa') {
      return `بازپرداخت به مبلغ ${this.formatAmount(payload.amountMinor, payload.currency)} به حساب شما واریز شد.`;
    }
    return `Refund of ${this.formatAmount(payload.amountMinor, payload.currency)} has been deposited to your account.`;
  }
}
