import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from '../entities/Invoice';
import { PaymentTransaction as PaymentTransactionEntity } from '../entities/PaymentTransaction';
import { OutboxPublisher } from '@insurance/shared';
import { v4 as uuidv4 } from 'uuid';

export type PaymentProvider = 'ZARINPAL' | 'IDPAY' | 'PAYIR' | 'BEHPARDAKHT' | 'SAMAN' | 'MELLAT' | 'PASARGAD' | 'ECOSYSTEM' | 'MOCK';

export interface PaymentRequest {
  tenantId: string;
  invoiceId: string;
  amount: number;
  callbackUrl: string;
  description?: string;
  mobile?: string;
  email?: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

export interface PaymentResponse {
  success: boolean;
  paymentId: string;
  redirectUrl?: string;
  authority?: string;
  message?: string;
  errorCode?: string;
}

export interface PaymentVerificationRequest {
  tenantId: string;
  paymentId: string;
  authority: string;
  amount: number;
  provider: PaymentProvider;
  correlationId?: string;
}

export interface PaymentVerificationResponse {
  success: boolean;
  refId?: string;
  cardPan?: string;
  message?: string;
  errorCode?: string;
}

export interface PaymentTransaction {
  id: string;
  invoiceId: string;
  amount: number;
  provider: PaymentProvider;
  authority: string;
  refId?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  callbackUrl: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);

  constructor(
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(PaymentTransactionEntity) private readonly transactionRepo: Repository<PaymentTransactionEntity>,
  ) {}

  private getProvider(): PaymentProvider {
    const provider = (process.env.PAYMENT_PROVIDER || 'MOCK').toUpperCase() as PaymentProvider;
    return provider;
  }

  private getMerchantId(): string {
    return process.env.PAYMENT_MERCHANT_ID || '';
  }

  private getApiUrl(): string {
    const provider = this.getProvider();
    const urls: Record<PaymentProvider, string> = {
      ZARINPAL: 'https://api.zarinpal.com/pg/v4/payment',
      IDPAY: 'https://api.idpay.ir/v1.1',
      PAYIR: 'https://pay.ir/pg',
      MOCK: '',
      BEHPARDAKHT: 'https://bpm.shaparak.ir/pgwchannel/services/pgwport/v2',
      SAMAN: 'https://sep.shaparak.ir/Payment.aspx',
      MELLAT: 'https://bpm.shaparak.ir/pgwchannel/services/pgwport/v2',
      PASARGAD: 'https://pep.shaparak.ir/Api/v1/Payment',
      ECOSYSTEM: process.env.PAYMENT_SERVICE_URL || 'http://localhost:8085',
    };
    return urls[provider];
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

  private resolveEscrowAccount(): string {
    const ref = process.env.INSURANCE_ESCROW_ACCOUNT_REF || '';
    const number = process.env.INSURANCE_ESCROW_ACCOUNT_NUMBER || '';
    const account = number || ref;
    if (!account) {
      throw new Error('INSURANCE_ESCROW_ACCOUNT_REF or INSURANCE_ESCROW_ACCOUNT_NUMBER is required for ECOSYSTEM payments');
    }
    return account;
  }

  private toInterface(entity: PaymentTransactionEntity): PaymentTransaction {
    return {
      id: entity.id,
      invoiceId: entity.invoiceId,
      amount: entity.amount,
      provider: entity.provider as PaymentProvider,
      authority: entity.authority,
      refId: entity.refId || undefined,
      status: entity.status,
      callbackUrl: entity.callbackUrl,
      metadata: (entity.metadata as Record<string, any>) || {},
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  async initiatePayment(params: PaymentRequest): Promise<PaymentResponse> {
    this.logger.log(`Initiating payment for invoice: ${params.invoiceId}, amount: ${params.amount}, tenant: ${params.tenantId}`);

    const invoice = await this.invoiceRepo.findOne({ where: { id: params.invoiceId, tenantId: params.tenantId } });
    if (!invoice) {
      return {
        success: false,
        paymentId: '',
        message: 'Invoice not found',
        errorCode: 'INVOICE_NOT_FOUND',
      };
    }

    if (invoice.status === InvoiceStatus.PAID) {
      return {
        success: false,
        paymentId: '',
        message: 'Invoice already paid',
        errorCode: 'INVOICE_ALREADY_PAID',
      };
    }

    const provider = this.getProvider();
    const paymentId = uuidv4();
    const authority = uuidv4();

    const entity = this.transactionRepo.create({
      id: paymentId,
      tenantId: params.tenantId,
      invoiceId: params.invoiceId,
      amount: params.amount,
      provider,
      authority,
      status: 'PENDING',
      callbackUrl: params.callbackUrl,
      metadata: {
        ...params.metadata,
        description: params.description,
        mobile: params.mobile,
        email: params.email,
      },
      idempotencyKey: params.idempotencyKey || null,
    });

    try {
      const saved = await this.transactionRepo.save(entity);
      const redirectUrl = await this.createPaymentRequest(provider, saved, params);
      saved.authority = redirectUrl ? saved.authority : saved.authority;
      await this.transactionRepo.save(saved);

      return {
        success: true,
        paymentId: saved.id,
        redirectUrl,
        authority: saved.authority,
        message: 'Payment initiated successfully',
      };
    } catch (error: any) {
      this.logger.error(`Payment initiation failed: ${error.message}`);
      entity.status = 'FAILED';
      await this.transactionRepo.save(entity).catch(() => {});
      return {
        success: false,
        paymentId,
        message: error.message || 'Payment initiation failed',
        errorCode: 'PAYMENT_INIT_FAILED',
      };
    }
  }

  private async createPaymentRequest(
    provider: PaymentProvider,
    transaction: PaymentTransactionEntity,
    params: PaymentRequest
  ): Promise<string> {
    const merchantId = this.getMerchantId();
    const apiUrl = this.getApiUrl();

    switch (provider) {
      case 'ZARINPAL':
        return this.createZarinpalRequest(merchantId, apiUrl, transaction, params);
      case 'IDPAY':
        return this.createIdpayRequest(merchantId, apiUrl, transaction, params);
      case 'PAYIR':
        return this.createPayirRequest(merchantId, apiUrl, transaction, params);
      case 'ECOSYSTEM':
        return this.createEcosystemRequest(apiUrl, transaction, params);
      case 'MOCK':
        return this.createMockRequest(transaction, params);
      default:
        throw new Error(`Payment provider ${provider} not yet implemented`);
    }
  }

  private async createZarinpalRequest(
    merchantId: string,
    apiUrl: string,
    transaction: PaymentTransactionEntity,
    params: PaymentRequest
  ): Promise<string> {
    const requestUrl = `${apiUrl}/request.json`;

    const requestBody = {
      merchant_id: merchantId,
      amount: transaction.amount * 10,
      currency: 'IRR',
      description: params.description || `Payment for invoice ${transaction.invoiceId}`,
      callback_url: params.callbackUrl,
      metadata: {
        mobile: params.mobile,
        email: params.email,
        order_id: transaction.invoiceId,
      },
    };

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const result: any = await response.json();

    if (result.data?.code === 100) {
      const authority = result.data.authority;
      transaction.authority = authority;
      await this.transactionRepo.save(transaction);

      return `https://www.zarinpal.com/pg/StartPay/${authority}`;
    } else {
      throw new Error(`ZarinPal error: ${result.errors?.code || 'Unknown'} - ${result.errors?.message || 'Unknown error'}`);
    }
  }

  private async createIdpayRequest(
    merchantId: string,
    apiUrl: string,
    transaction: PaymentTransactionEntity,
    params: PaymentRequest
  ): Promise<string> {
    const requestUrl = `${apiUrl}/payment`;

    const requestBody = {
      merchant_id: merchantId,
      amount: transaction.amount * 10,
      order_id: transaction.invoiceId,
      callback: params.callbackUrl,
      desc: params.description || `Payment for invoice ${transaction.invoiceId}`,
      metadata: {
        mobile: params.mobile,
        email: params.email,
      },
    };

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': merchantId,
      },
      body: JSON.stringify(requestBody),
    });

    const result: any = await response.json();

    if (result.id) {
      transaction.authority = result.id;
      await this.transactionRepo.save(transaction);

      return `https://idpay.ir/p/${result.id}`;
    } else {
      throw new Error(`IDPay error: ${result.error_code || 'Unknown'} - ${result.error_message || 'Unknown error'}`);
    }
  }

  private async createPayirRequest(
    merchantId: string,
    apiUrl: string,
    transaction: PaymentTransactionEntity,
    params: PaymentRequest
  ): Promise<string> {
    const requestUrl = `${apiUrl}/send`;

    const requestBody = {
      api: merchantId,
      amount: transaction.amount * 10,
      redirect: params.callbackUrl,
      mobile: params.mobile,
      factorNumber: transaction.invoiceId,
      description: params.description || `Payment for invoice ${transaction.invoiceId}`,
    };

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const result: any = await response.json();

    if (result.status === 1) {
      transaction.authority = result.token;
      await this.transactionRepo.save(transaction);

      return `${apiUrl}/${result.token}`;
    } else {
      throw new Error(`Pay.ir error: ${result.status} - ${result.errorMessage || 'Unknown error'}`);
    }
  }

  private async createEcosystemRequest(
    apiUrl: string,
    transaction: PaymentTransactionEntity,
    params: PaymentRequest
  ): Promise<string> {
    const fromAccount = process.env.INSURANCE_BANK_ACCOUNT || process.env.PATIENT_BANK_ACCOUNT || '';
    const escrowAccount = this.resolveEscrowAccount();

    if (!fromAccount) {
      throw new Error('INSURANCE_BANK_ACCOUNT or PATIENT_BANK_ACCOUNT is required for ECOSYSTEM payments');
    }

    const idempotencyKey = params.idempotencyKey || `insurance-invoice-${transaction.invoiceId}-${transaction.id}`;

    const response = await fetch(`${apiUrl}/api/v1/ecosystem/payments/initiate`, {
      method: 'POST',
      headers: {
        ...this.resolveAuthHeaders(params.idempotencyKey),
        'X-Idempotency-Key': idempotencyKey,
        'X-Tenant-Id': params.tenantId,
      },
      body: JSON.stringify({
        fromAccountId: fromAccount,
        toAccountId: escrowAccount,
        amount: String(transaction.amount),
        currency: 'IRR',
        paymentType: 'TRANSFER',
        reference: `invoice-${transaction.invoiceId}`,
        description: params.description || `Insurance invoice ${transaction.invoiceId}`,
      }),
    });

    if (!response.ok && response.status !== 202) {
      const errBody = await response.text();
      throw new Error(`Ecosystem payment failed: ${response.status} ${errBody}`);
    }

    const result: any = await response.json();
    transaction.authority = result.paymentId;
    await this.transactionRepo.save(transaction);

    return '';
  }

  private async verifyEcosystemPayment(
    apiUrl: string,
    transaction: PaymentTransactionEntity
  ): Promise<PaymentVerificationResponse> {
    const response = await fetch(`${apiUrl}/api/v1/ecosystem/payments/${transaction.authority}`, {
      method: 'GET',
      headers: {
        ...this.resolveAuthHeaders(transaction.idempotencyKey || undefined),
        'Content-Type': 'application/json',
        'X-Tenant-Id': transaction.tenantId,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        message: `Ecosystem payment status check failed: ${response.status}`,
        errorCode: 'ECOSYSTEM_VERIFY_FAILED',
      };
    }

    const result: any = await response.json();

    if (result.status === 'SETTLED') {
      return {
        success: true,
        refId: result.railReference || transaction.authority,
        message: 'Payment verified via ecosystem payment-service',
      };
    }

    return {
      success: false,
      message: `Payment status: ${result.status}`,
      errorCode: 'PAYMENT_NOT_SETTLED',
    };
  }

  async verifyPayment(params: PaymentVerificationRequest): Promise<PaymentVerificationResponse> {
    this.logger.log(`Verifying payment: ${params.paymentId}, authority: ${params.authority}`);

    const transaction = await this.transactionRepo.findOne({
      where: { id: params.paymentId, tenantId: params.tenantId },
    });
    if (!transaction) {
      return {
        success: false,
        message: 'Transaction not found',
        errorCode: 'TRANSACTION_NOT_FOUND',
      };
    }

    if (transaction.status === 'SUCCESS') {
      return {
        success: true,
        refId: transaction.refId || undefined,
        message: 'Payment already verified',
      };
    }

    if (transaction.status === 'FAILED' || transaction.status === 'CANCELLED') {
      return {
        success: false,
        message: 'Payment already failed or cancelled',
        errorCode: 'PAYMENT_FAILED',
      };
    }

    try {
      const result = await this.verifyPaymentWithProvider(params.provider, transaction);

      if (result.success) {
        transaction.status = 'SUCCESS';
        transaction.refId = result.refId || null;
        transaction.updatedAt = new Date();
        await this.transactionRepo.save(transaction);

        const invoice = await this.invoiceRepo.findOne({
          where: { id: transaction.invoiceId, tenantId: params.tenantId },
        });
        if (invoice && invoice.status !== InvoiceStatus.PAID) {
          invoice.paidAmount += transaction.amount;
          invoice.paidAt = new Date();
          if (invoice.paidAmount >= invoice.amount) {
            invoice.status = InvoiceStatus.PAID;
          }
          await this.invoiceRepo.save(invoice);
        }
      } else {
        transaction.status = 'FAILED';
        transaction.updatedAt = new Date();
        await this.transactionRepo.save(transaction);
      }

      return result;
    } catch (error: any) {
      this.logger.error(`Payment verification failed: ${error.message}`);
      transaction.status = 'FAILED';
      transaction.updatedAt = new Date();
      await this.transactionRepo.save(transaction).catch(() => {});
      return {
        success: false,
        message: error.message || 'Payment verification failed',
        errorCode: 'VERIFICATION_FAILED',
      };
    }
  }

  private async verifyPaymentWithProvider(
    provider: PaymentProvider,
    transaction: PaymentTransactionEntity
  ): Promise<PaymentVerificationResponse> {
    const merchantId = this.getMerchantId();
    const apiUrl = this.getApiUrl();

    switch (provider) {
      case 'ZARINPAL':
        return this.verifyZarinpalPayment(merchantId, apiUrl, transaction);
      case 'IDPAY':
        return this.verifyIdpayPayment(merchantId, apiUrl, transaction);
      case 'PAYIR':
        return this.verifyPayirPayment(merchantId, apiUrl, transaction);
      case 'ECOSYSTEM':
        return this.verifyEcosystemPayment(apiUrl, transaction);
      case 'MOCK':
        return this.verifyMockPayment(transaction);
      default:
        throw new Error(`Payment provider ${provider} not yet implemented`);
    }
  }

  private async verifyZarinpalPayment(
    merchantId: string,
    apiUrl: string,
    transaction: PaymentTransactionEntity
  ): Promise<PaymentVerificationResponse> {
    const requestUrl = `${apiUrl}/verify.json`;

    const requestBody = {
      merchant_id: merchantId,
      amount: transaction.amount * 10,
      authority: transaction.authority,
    };

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const result: any = await response.json();

    if (result.data?.code === 100) {
      return {
        success: true,
        refId: result.data.ref_id,
        cardPan: result.data.card_pan,
        message: 'Payment verified successfully',
      };
    } else {
      return {
        success: false,
        message: `ZarinPal verification error: ${result.errors?.code || 'Unknown'} - ${result.errors?.message || 'Unknown error'}`,
        errorCode: result.errors?.code || 'VERIFICATION_FAILED',
      };
    }
  }

  private async verifyIdpayPayment(
    merchantId: string,
    apiUrl: string,
    transaction: PaymentTransactionEntity
  ): Promise<PaymentVerificationResponse> {
    const requestUrl = `${apiUrl}/payment/verify`;

    const requestBody = {
      id: transaction.authority,
      order_id: transaction.invoiceId,
    };

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': merchantId,
      },
      body: JSON.stringify(requestBody),
    });

    const result: any = await response.json();

    if (result.status === 100) {
      return {
        success: true,
        refId: result.track_id?.toString(),
        cardPan: result.payment?.card_no,
        message: 'Payment verified successfully',
      };
    } else {
      return {
        success: false,
        message: `IDPay verification error: ${result.error_code || 'Unknown'} - ${result.error_message || 'Unknown error'}`,
        errorCode: result.error_code || 'VERIFICATION_FAILED',
      };
    }
  }

  private async verifyPayirPayment(
    merchantId: string,
    apiUrl: string,
    transaction: PaymentTransactionEntity
  ): Promise<PaymentVerificationResponse> {
    const requestUrl = `${apiUrl}/verify`;

    const requestBody = {
      api: merchantId,
      token: transaction.authority,
      amount: transaction.amount * 10,
    };

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const result: any = await response.json();

    if (result.status === 1) {
      return {
        success: true,
        refId: result.transId?.toString(),
        cardPan: result.cardNumber,
        message: 'Payment verified successfully',
      };
    } else {
      return {
        success: false,
        message: `Pay.ir verification error: ${result.status} - ${result.errorMessage || 'Unknown error'}`,
        errorCode: result.status?.toString() || 'VERIFICATION_FAILED',
      };
    }
  }

  async cancelPayment(tenantId: string, paymentId: string): Promise<{ success: boolean; message: string }> {
    const transaction = await this.transactionRepo.findOne({ where: { id: paymentId, tenantId } });
    if (!transaction) {
      return {
        success: false,
        message: 'Transaction not found',
      };
    }

    if (transaction.status !== 'PENDING') {
      return {
        success: false,
        message: 'Cannot cancel payment in current status',
      };
    }

    transaction.status = 'CANCELLED';
    transaction.updatedAt = new Date();
    await this.transactionRepo.save(transaction);

    return {
      success: true,
      message: 'Payment cancelled successfully',
    };
  }

  async getTransaction(tenantId: string, paymentId: string): Promise<PaymentTransaction | null> {
    const entity = await this.transactionRepo.findOne({ where: { id: paymentId, tenantId } });
    return entity ? this.toInterface(entity) : null;
  }

  async getTransactionsByInvoice(tenantId: string, invoiceId: string): Promise<PaymentTransaction[]> {
    const entities = await this.transactionRepo.find({ where: { tenantId, invoiceId } });
    return entities.map(this.toInterface);
  }

  private async createMockRequest(
    transaction: PaymentTransactionEntity,
    params: PaymentRequest
  ): Promise<string> {
    this.logger.log(`Mock payment created for invoice ${params.invoiceId}, amount ${params.amount}`);
    transaction.authority = `MOCK-${transaction.id}`;
    transaction.refId = `MOCK-REF-${Date.now()}`;
    await this.transactionRepo.save(transaction);
    return `${params.callbackUrl}?mock=1&authority=${transaction.authority}&status=success`;
  }

  private async verifyMockPayment(
    transaction: PaymentTransactionEntity
  ): Promise<PaymentVerificationResponse> {
    this.logger.log(`Mock payment verified for transaction ${transaction.id}`);
    return {
      success: true,
      refId: transaction.refId || `MOCK-REF-${Date.now()}`,
      message: 'Mock payment verified successfully',
    };
  }

  async healthCheck(): Promise<{ healthy: boolean; provider: PaymentProvider; message: string }> {
    try {
      const provider = this.getProvider();

      if (provider === 'MOCK') {
        return { healthy: true, provider, message: 'Mock payment provider active (demo mode)' };
      }

      const merchantId = this.getMerchantId();
      if (!merchantId) {
        return {
          healthy: false,
          provider,
          message: 'Merchant ID not configured',
        };
      }

      return {
        healthy: true,
        provider,
        message: 'Payment gateway is configured',
      };
    } catch (error: any) {
      return {
        healthy: false,
        provider: this.getProvider(),
        message: error.message || 'Health check failed',
      };
    }
  }
}
