import { IGatewayProvider } from './gateway-provider.interface';

export class IdPayProvider implements IGatewayProvider {
  constructor(private apiKey: string, private sandbox: boolean = false) {}

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
        ? 'https://api.idpay.ir/v1.1/payment'
        : 'https://api.idpay.ir/v1.1/payment';

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
        },
        body: JSON.stringify({
          order_id: params.reference,
          amount: params.amount,
          currency: params.currency === 'IRR' ? 'IRR' : 'IRT',
          desc: params.description,
          callback: params.returnUrl,
          metadata: params.metadata,
        }),
      });

      const data = await response.json();

      if (data.id && data.link) {
        return { success: true, paymentUrl: data.link, transactionId: String(data.id) };
      }

      return { success: false, error: data.error_message || 'IDPay initiation failed' };
    } catch (error: any) {
      return { success: false, error: error.message || 'IDPay request failed' };
    }
  }

  async verifyPayment(params: {
    transactionId: string;
    reference: string;
  }): Promise<{ success: boolean; verified: boolean; providerRef?: string; error?: string }> {
    try {
      const baseUrl = this.sandbox
        ? 'https://api.idpay.ir/v1.1/payment/verify'
        : 'https://api.idpay.ir/v1.1/payment/verify';

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
        },
        body: JSON.stringify({
          id: params.transactionId,
          order_id: params.reference,
        }),
      });

      const data = await response.json();

      if (data.status === 100 && data.track_id) {
        return { success: true, verified: true, providerRef: String(data.track_id) };
      }

      return { success: true, verified: false, error: data.error_message || 'Payment not verified' };
    } catch (error: any) {
      return { success: false, verified: false, error: error.message || 'IDPay verification failed' };
    }
  }
}
