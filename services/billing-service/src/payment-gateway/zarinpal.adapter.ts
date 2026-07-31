import { Injectable, Logger } from '@nestjs/common';
import { PaymentAdapter, PaymentAdapterRequest, PaymentAdapterResponse, PaymentVerificationAdapterResponse } from './payment-adapter.interface';

@Injectable()
export class ZarinpalPaymentAdapter implements PaymentAdapter {
  readonly name = 'ZARINPAL';
  private readonly logger = new Logger(ZarinpalPaymentAdapter.name);

  private getApiUrl(): string {
    return process.env.ZARINPAL_API_URL || 'https://api.zarinpal.com/pg/v4/payment';
  }

  private getMerchantId(): string {
    return process.env.ZARINPAL_MERCHANT_ID || '';
  }

  async initiate(request: PaymentAdapterRequest): Promise<PaymentAdapterResponse> {
    const url = `${this.getApiUrl()}/request.json`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: this.getMerchantId(),
        amount: Number(request.amount) * 10,
        currency: request.currency,
        description: request.description,
        callback_url: request.metadata?.callbackUrl || '',
        metadata: {
          mobile: request.metadata?.mobile,
          email: request.metadata?.email,
          order_id: request.reference,
        },
      }),
    });

    const result: any = await response.json();
    if (result.data?.code === 100) {
      return {
        success: true,
        paymentId: result.data.authority,
        redirectUrl: `https://www.zarinpal.com/pg/StartPay/${result.data.authority}`,
        message: 'Zarinpal payment initiated',
      };
    }

    return {
      success: false,
      message: `Zarinpal error: ${result.errors?.code} - ${result.errors?.message}`,
      errorCode: result.errors?.code || 'ZARINPAL_ERROR',
    };
  }

  async verify(paymentId: string, tenantId: string): Promise<PaymentVerificationAdapterResponse> {
    const url = `${this.getApiUrl()}/verify.json`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: this.getMerchantId(),
        amount: 0,
        authority: paymentId,
      }),
    });

    const result: any = await response.json();
    if (result.data?.code === 100) {
      return {
        success: true,
        refId: result.data.ref_id,
        cardPan: result.data.card_pan,
        message: 'Zarinpal payment verified',
      };
    }

    return {
      success: false,
      message: `Zarinpal verification error: ${result.errors?.code} - ${result.errors?.message}`,
      errorCode: result.errors?.code || 'ZARINPAL_VERIFY_FAILED',
    };
  }
}
