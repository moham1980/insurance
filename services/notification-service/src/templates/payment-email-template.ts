import { Injectable } from '@nestjs/common';
import { PaymentTemplatePayload } from './payment-sms-template';

@Injectable()
export class PaymentEmailTemplate {
  private maskCardPan(pan?: string): string {
    if (!pan || pan.length < 8) return '****';
    return pan.slice(0, 4) + '****' + pan.slice(-4);
  }

  private formatAmount(amountMinor?: string, currency?: string): string {
    if (!amountMinor) return '-';
    const amount = (BigInt(amountMinor) / BigInt(10)).toString();
    return `${amount} ${currency || 'IRR'}`;
  }

  private brandHeader(brandKey: string, lang: string): string {
    return lang === 'fa'
      ? `<h1 style="direction: rtl; text-align: right;">${brandKey}</h1>`
      : `<h1>${brandKey}</h1>`;
  }

  paymentInitiated(payload: PaymentTemplatePayload, brandKey: string, lang: string): string {
    return `${this.brandHeader(brandKey, lang)}
<p>${lang === 'fa' ? 'پرداخت شما آغاز شده است.' : 'Your payment has been initiated.'}</p>
<ul>
  <li>${lang === 'fa' ? 'صورت‌حساب' : 'Invoice'}: ${payload.invoiceId}</li>
  <li>${lang === 'fa' ? 'مبلغ' : 'Amount'}: ${this.formatAmount(payload.amountMinor, payload.currency)}</li>
</ul>`;
  }

  paymentSettled(payload: PaymentTemplatePayload, brandKey: string, lang: string): string {
    return `${this.brandHeader(brandKey, lang)}
<p>${lang === 'fa' ? 'پرداخت شما با موفقیت انجام شد.' : 'Your payment has been settled successfully.'}</p>
<ul>
  <li>${lang === 'fa' ? 'صورت‌حساب' : 'Invoice'}: ${payload.invoiceId}</li>
  <li>${lang === 'fa' ? 'مبلغ' : 'Amount'}: ${this.formatAmount(payload.amountMinor, payload.currency)}</li>
  <li>${lang === 'fa' ? 'کارت' : 'Card'}: ${this.maskCardPan(payload.cardPan)}</li>
</ul>`;
  }

  paymentFailed(payload: PaymentTemplatePayload, brandKey: string, lang: string): string {
    return `${this.brandHeader(brandKey, lang)}
<p>${lang === 'fa' ? 'پرداخت ناموفق بود.' : 'Payment failed.'}</p>
<ul>
  <li>${lang === 'fa' ? 'صورت‌حساب' : 'Invoice'}: ${payload.invoiceId}</li>
  <li>${lang === 'fa' ? 'لطفاً مجدداً تلاش کنید یا با پشتیبانی تماس بگیرید.' : 'Please try again or contact support.'}</li>
</ul>`;
  }

  refundInitiated(payload: PaymentTemplatePayload, brandKey: string, lang: string): string {
    return `${this.brandHeader(brandKey, lang)}
<p>${lang === 'fa' ? 'درخواست بازپرداخت ثبت شد.' : 'Refund request has been initiated.'}</p>
<ul>
  <li>${lang === 'fa' ? 'شناسه بازپرداخت' : 'Refund ID'}: ${payload.refundId}</li>
  <li>${lang === 'fa' ? 'مبلغ' : 'Amount'}: ${this.formatAmount(payload.amountMinor, payload.currency)}</li>
</ul>`;
  }

  refundSettled(payload: PaymentTemplatePayload, brandKey: string, lang: string): string {
    return `${this.brandHeader(brandKey, lang)}
<p>${lang === 'fa' ? 'بازپرداخت به حساب شما واریز شد.' : 'Refund has been deposited to your account.'}</p>
<ul>
  <li>${lang === 'fa' ? 'شناسه بازپرداخت' : 'Refund ID'}: ${payload.refundId}</li>
  <li>${lang === 'fa' ? 'مبلغ' : 'Amount'}: ${this.formatAmount(payload.amountMinor, payload.currency)}</li>
</ul>`;
  }
}
