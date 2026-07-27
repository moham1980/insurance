import { IGatewayProvider } from './gateway-provider.interface';

export class ZarinpalProvider implements IGatewayProvider {
  constructor(private merchantId: string, private sandbox: boolean = false) {}

  async initiatePayment(params: {
    amount: number;
    currency: string;
    reference: string;
    description: string;
    returnUrl: string;
    cancelUrl: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; paymentUrl?: string; transactionId?: string; error?: string }> {
    try {
      const baseUrl = this.sandbox
        ? 'https://sandbox.zarinpal.com/pg/v4/payment/request.json'
        : 'https://api.zarinpal.com/pg/v4/payment/request.json';

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: this.merchantId,
          amount: params.amount,
          currency: params.currency === 'IRR' ? 'IRR' : 'IRT',
          description: params.description,
          callback_url: params.returnUrl,
          metadata: {
            reference: params.reference,
            ...params.metadata,
          },
        }),
      });

      const data = await response.json();

      if (data.errors?.code === 0 && data.data?.authority) {
        const paymentUrl = this.sandbox
          ? `https://sandbox.zarinpal.com/pg/StartPay/${data.data.authority}`
          : `https://www.zarinpal.com/pg/StartPay/${data.data.authority}`;

        return { success: true, paymentUrl, transactionId: data.data.authority };
      }

      return { success: false, error: data.errors?.message || 'Zarinpal initiation failed' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Zarinpal request failed' };
    }
  }

  async verifyPayment(params: {
    transactionId: string;
    reference: string;
  }): Promise<{ success: boolean; verified: boolean; providerRef?: string; error?: string }> {
    try {
      const baseUrl = this.sandbox
        ? 'https://sandbox.zarinpal.com/pg/v4/payment/verify.json'
        : 'https://api.zarinpal.com/pg/v4/payment/verify.json';

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: this.merchantId,
          amount: 0, // Amount is not required for verification in v4
          authority: params.transactionId,
        }),
      });

      const data = await response.json();

      if (data.errors?.code === 0 && data.data?.ref_id) {
        return { success: true, verified: true, providerRef: String(data.data.ref_id) };
      }

      return { success: true, verified: false, error: data.errors?.message || 'Payment not verified' };
    } catch (error: any) {
      return { success: false, verified: false, error: error.message || 'Zarinpal verification failed' };
    }
  }
}
