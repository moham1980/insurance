import { Injectable, Logger } from '@nestjs/common';
import { PaymentAdapter, PaymentAdapterRequest, PaymentAdapterResponse, PaymentVerificationAdapterResponse } from './payment-adapter.interface';

@Injectable()
export class EcosystemPaymentAdapter implements PaymentAdapter {
  readonly name = 'ECOSYSTEM';
  private readonly logger = new Logger(EcosystemPaymentAdapter.name);

  private getPaymentServiceUrl(): string {
    return process.env.PAYMENT_SERVICE_URL || 'http://localhost:8085';
  }

  async initiate(request: PaymentAdapterRequest): Promise<PaymentAdapterResponse> {
    const url = `${this.getPaymentServiceUrl()}/api/v1/ecosystem/payments/initiate`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': request.idempotencyKey,
        'X-Tenant-Id': request.tenantId,
        'X-Correlation-Id': request.correlationId || '',
        'Authorization': `Bearer ${process.env.PAYMENT_SERVICE_TOKEN || ''}`,
      },
      body: JSON.stringify({
        fromAccountId: request.sourceAccount,
        toAccountId: request.destinationAccount,
        amount: request.amount,
        currency: request.currency,
        paymentType: 'TRANSFER',
        rail: request.rail || 'PAYA',
        reference: request.reference,
        description: request.description,
        metadata: request.metadata,
      }),
    });

    if (!response.ok && response.status !== 202) {
      const errBody = await response.text();
      this.logger.error(`Ecosystem payment initiation failed: ${response.status} ${errBody}`);
      return {
        success: false,
        message: `Ecosystem payment initiation failed: ${response.status} ${errBody}`,
        errorCode: 'ECOSYSTEM_INIT_FAILED',
      };
    }

    const result: any = await response.json();
    return {
      success: true,
      paymentId: result.paymentId,
      message: 'Ecosystem payment initiated',
    };
  }

  async verify(paymentId: string, tenantId: string): Promise<PaymentVerificationAdapterResponse> {
    const url = `${this.getPaymentServiceUrl()}/api/v1/ecosystem/payments/${paymentId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': tenantId,
        'Authorization': `Bearer ${process.env.PAYMENT_SERVICE_TOKEN || ''}`,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        message: `Payment verification failed: ${response.status}`,
        errorCode: 'ECOSYSTEM_VERIFY_FAILED',
      };
    }

    const result: any = await response.json();
    return {
      success: result.status === 'SETTLED',
      status: result.status,
      refId: result.railReference,
      message: `Payment status: ${result.status}`,
    };
  }
}
