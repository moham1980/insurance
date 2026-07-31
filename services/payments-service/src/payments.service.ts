import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, Between } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { OutboxPublisher } from '@insurance/shared';
import { PaymentIntent } from './entities/PaymentIntent';
import { Payment } from './entities/Payment';
import { PaymentDispute } from './entities/PaymentDispute';
import { IPspProvider } from './psp/psp.interface';
import { PSP_PROVIDER } from './psp/psp.provider.token';

function encryptField(plaintext: string): string {
  const key = process.env.FIELD_ENCRYPTION_KEY;
  if (!key) return plaintext;
  const keyBuf = crypto.createHash('sha256').update(key).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptField(value: string): string {
  if (!value || !value.startsWith('enc:')) return value;
  const key = process.env.FIELD_ENCRYPTION_KEY;
  if (!key) return value;
  const parts = value.split(':');
  if (parts.length !== 4) return value;
  const keyBuf = crypto.createHash('sha256').update(key).digest();
  const iv = Buffer.from(parts[1], 'base64');
  const tag = Buffer.from(parts[2], 'base64');
  const encrypted = Buffer.from(parts[3], 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuf, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(PaymentIntent) private readonly intentRepo: Repository<PaymentIntent>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(PaymentDispute) private readonly disputeRepo: Repository<PaymentDispute>,
    @Optional() @Inject(PSP_PROVIDER) private readonly pspProvider?: IPspProvider,
  ) {}

  async preparePayment(params: {
    tenantId: string;
    correlationId: string;
    idempotencyKey: string;
    claimId: string;
    policyId?: string;
    brokerOrganizationId?: string;
    paymentType?: string;
    amount: number;
    currency?: string;
    preparedByUserId?: string;
    beneficiaryPartyId?: string;
    destinationIban?: string;
    paymentDocs?: Record<string, any>;
    isPartial?: boolean;
    partialIndex?: number;
    totalPartialCount?: number;
  }): Promise<PaymentIntent> {
    if (!params.tenantId) {
      const err: any = new Error('tenantId is required');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    return await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PaymentIntent);
      const outbox = new OutboxPublisher(manager);

      const existing = await repo.findOne({
        where: { tenantId: params.tenantId, idempotencyKey: params.idempotencyKey },
      });
      if (existing) return existing;

      const intent = repo.create({
        paymentIntentId: uuidv4(),
        tenantId: params.tenantId,
        claimId: params.claimId,
        policyId: params.policyId || null,
        brokerOrganizationId: params.brokerOrganizationId || null,
        paymentType: (params.paymentType as any) || null,
        amount: params.amount,
        currency: params.currency || 'IRR',
        beneficiaryPartyId: params.beneficiaryPartyId || null,
        destinationIban: params.destinationIban ? encryptField(params.destinationIban) : null,
        status: 'prepared',
        idempotencyKey: params.idempotencyKey,
        preparedByUserId: params.preparedByUserId || null,
        gatewayPaymentId: null,
        paymentDocs: params.paymentDocs || null,
        financeApproval: null,
        executionResult: null,
        notificationResult: null,
        isPartial: params.isPartial || false,
        partialIndex: params.partialIndex ?? null,
        totalPartialCount: params.totalPartialCount ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await repo.save(intent);

      await outbox.publish({
        topic: 'insurance.payment.prepared',
        eventType: 'PaymentPrepared',
        eventVersion: 1,
        correlationId: params.correlationId,
        subject: { claimId: params.claimId, paymentIntentId: intent.paymentIntentId, tenantId: intent.tenantId },
        payload: {
          tenantId: intent.tenantId,
          paymentIntentId: intent.paymentIntentId,
          claimId: intent.claimId,
          policyId: intent.policyId,
          brokerOrganizationId: intent.brokerOrganizationId,
          paymentType: intent.paymentType,
          amount: intent.amount,
          currency: intent.currency,
          status: intent.status,
          isPartial: intent.isPartial,
          partialIndex: intent.partialIndex,
          totalPartialCount: intent.totalPartialCount,
          createdAt: intent.createdAt?.toISOString?.() ?? new Date().toISOString(),
        },
      });

      return intent;
    });
  }

  async failPayment(params: {
    tenantId: string;
    correlationId: string;
    paymentIntentId: string;
    reasonCode?: string;
    reasonMessage?: string;
    failedByUserId?: string;
  }): Promise<{ intent: PaymentIntent; payment: Payment } | null> {
    return await this.dataSource.transaction(async (manager) => {
      const intentRepo = manager.getRepository(PaymentIntent);
      const paymentRepo = manager.getRepository(Payment);
      const outbox = new OutboxPublisher(manager);

      const intent = await intentRepo.findOne({
        where: { tenantId: params.tenantId, paymentIntentId: params.paymentIntentId },
      });
      if (!intent) return null;

      const existingPayment = await paymentRepo.findOne({
        where: { tenantId: params.tenantId, paymentIntentId: intent.paymentIntentId, status: 'failed' },
      });
      if (intent.status === 'failed' && existingPayment) {
        return { intent, payment: existingPayment };
      }

      if (intent.status === 'cancelled') {
        const err: any = new Error(`Invalid state transition: ${intent.status} -> failed`);
        err.code = 'INVALID_STATE';
        throw err;
      }

      intent.status = 'failed';
      intent.executionResult = {
        ...(intent.executionResult || {}),
        failedByUserId: params.failedByUserId || null,
        failedAt: new Date().toISOString(),
        reasonCode: params.reasonCode || 'UNKNOWN',
        reasonMessage: params.reasonMessage || null,
      };
      intent.updatedAt = new Date();
      await intentRepo.save(intent);

      const payment = paymentRepo.create({
        tenantId: params.tenantId,
        paymentId: uuidv4(),
        paymentIntentId: intent.paymentIntentId,
        status: 'failed',
        provider: (intent.executionResult as any)?.provider ?? null,
        providerRef: (intent.executionResult as any)?.providerRef ?? null,
        amount: intent.amount,
        currency: intent.currency,
        details: intent.executionResult,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await paymentRepo.save(payment);

      await outbox.publish({
        topic: 'insurance.payment.failed',
        eventType: 'PaymentFailed',
        eventVersion: 1,
        correlationId: params.correlationId,
        subject: { claimId: intent.claimId, paymentIntentId: intent.paymentIntentId, paymentId: payment.paymentId, tenantId: intent.tenantId },
        payload: {
          tenantId: intent.tenantId,
          paymentIntentId: intent.paymentIntentId,
          paymentId: payment.paymentId,
          claimId: intent.claimId,
          amount: payment.amount,
          currency: payment.currency,
          status: intent.status,
          failure: {
            reasonCode: (intent.executionResult as any)?.reasonCode ?? null,
            reasonMessage: (intent.executionResult as any)?.reasonMessage ?? null,
            failedAt: (intent.executionResult as any)?.failedAt ?? null,
          },
        },
      });

      return { intent, payment };
    });
  }

  async financeApprove(params: {
    tenantId: string;
    correlationId: string;
    paymentIntentId: string;
    approverUserId?: string;
    decisionNotes?: string;
  }): Promise<PaymentIntent | null> {
    return await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PaymentIntent);
      const outbox = new OutboxPublisher(manager);

      const intent = await repo.findOne({
        where: { tenantId: params.tenantId, paymentIntentId: params.paymentIntentId },
      });
      if (!intent) return null;

      if (intent.status === 'finance_approved' || intent.status === 'executed' || intent.status === 'notified') {
        return intent;
      }

      if (intent.status !== 'prepared') {
        const err: any = new Error(`Invalid state transition: ${intent.status} -> finance_approved`);
        err.code = 'INVALID_STATE';
        throw err;
      }

      if (params.approverUserId && intent.preparedByUserId === params.approverUserId) {
        const err: any = new Error('Separation of duties violation: approver cannot be the user who prepared the payment');
        err.code = 'SOD_VIOLATION';
        throw err;
      }

      intent.status = 'finance_approved';
      intent.financeApproval = {
        approverUserId: params.approverUserId || null,
        decisionNotes: params.decisionNotes || null,
        approvedAt: new Date().toISOString(),
      };
      intent.updatedAt = new Date();
      await repo.save(intent);

      await outbox.publish({
        topic: 'insurance.payment.finance_approved',
        eventType: 'PaymentFinanceApproved',
        eventVersion: 1,
        correlationId: params.correlationId,
        subject: { claimId: intent.claimId, paymentIntentId: intent.paymentIntentId, tenantId: intent.tenantId },
        payload: {
          tenantId: intent.tenantId,
          paymentIntentId: intent.paymentIntentId,
          claimId: intent.claimId,
          status: intent.status,
          financeApproval: intent.financeApproval,
          updatedAt: intent.updatedAt?.toISOString?.() ?? new Date().toISOString(),
        },
      });

      return intent;
    });
  }

  async execute(params: {
    tenantId: string;
    correlationId: string;
    paymentIntentId: string;
    provider?: string;
    providerRef?: string;
    executedByUserId?: string;
    fromAccountId?: string;
    toAccountId?: string;
    paymentType?: string;
    preferredRail?: string;
    reference?: string;
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<{ intent: PaymentIntent; payment: Payment } | null> {
    return await this.dataSource.transaction(async (manager) => {
      const intentRepo = manager.getRepository(PaymentIntent);
      const paymentRepo = manager.getRepository(Payment);
      const outbox = new OutboxPublisher(manager);

      const intent = await intentRepo.findOne({
        where: { tenantId: params.tenantId, paymentIntentId: params.paymentIntentId },
      });
      if (!intent) return null;

      const existingPayment = await paymentRepo.findOne({
        where: { tenantId: params.tenantId, paymentIntentId: intent.paymentIntentId, status: 'executed' },
      });
      if (existingPayment) {
        return { intent, payment: existingPayment };
      }

      if (intent.status === 'cancelled' || intent.status === 'failed') {
        const err: any = new Error(`Invalid state transition: ${intent.status} -> executed`);
        err.code = 'INVALID_STATE';
        throw err;
      }

      if (intent.status !== 'finance_approved') {
        const err: any = new Error(`Invalid state transition: ${intent.status} -> executed`);
        err.code = 'INVALID_STATE';
        throw err;
      }

      let providerRef = params.providerRef || null;
      let provider = params.provider || null;

      if (this.pspProvider) {
        const executionId = uuidv4();
        const pspResult = await this.pspProvider.executePayment({
          gatewayPaymentId: executionId,
          amount: intent.amount,
          currency: intent.currency,
          description: params.description || `Claim payment ${intent.claimId}`,
          fromAccountId: params.fromAccountId,
          toAccountId: params.toAccountId,
          paymentType: params.paymentType,
          preferredRail: params.preferredRail,
          reference: params.reference,
          metadata: {
            ...params.metadata,
            source: 'insurance',
            tenantId: intent.tenantId,
            claimId: intent.claimId,
            paymentIntentId: intent.paymentIntentId,
          },
        });

        if (!pspResult.success) {
          const err: any = new Error(`PSP execute failed: ${pspResult.error}`);
          err.code = 'PSP_EXECUTE_FAILED';
          throw err;
        }

        providerRef = pspResult.providerRef || providerRef;
        provider = this.pspProvider.name;
      } else if (!providerRef) {
        const err: any = new Error('No payment provider configured and no providerRef supplied for manual execution');
        err.code = 'NO_PAYMENT_PROVIDER';
        throw err;
      }

      intent.status = 'executed';
      intent.executionResult = {
        provider,
        providerRef,
        executedByUserId: params.executedByUserId || null,
        executedAt: new Date().toISOString(),
      };
      intent.updatedAt = new Date();
      await intentRepo.save(intent);

      const payment = paymentRepo.create({
        tenantId: params.tenantId,
        paymentId: uuidv4(),
        paymentIntentId: intent.paymentIntentId,
        policyId: intent.policyId || null,
        brokerOrganizationId: intent.brokerOrganizationId || null,
        paymentType: (params.paymentType as Payment['paymentType']) || intent.paymentType || null,
        status: 'executed',
        provider,
        providerRef,
        amount: intent.amount,
        currency: intent.currency,
        details: intent.executionResult,
        metadata: params.metadata || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await paymentRepo.save(payment);

      await outbox.publish({
        topic: 'insurance.payment.executed',
        eventType: 'PaymentExecuted',
        eventVersion: 1,
        correlationId: params.correlationId,
        subject: { claimId: intent.claimId, paymentIntentId: intent.paymentIntentId, paymentId: payment.paymentId, tenantId: intent.tenantId },
        payload: {
          tenantId: intent.tenantId,
          paymentIntentId: intent.paymentIntentId,
          paymentId: payment.paymentId,
          claimId: intent.claimId,
          policyId: payment.policyId,
          brokerOrganizationId: payment.brokerOrganizationId,
          amount: payment.amount,
          currency: payment.currency,
          status: intent.status,
          provider,
          providerRef,
          executedAt: (intent.executionResult as any)?.executedAt,
        },
      });

      await outbox.publish({
        topic: 'insurance.payment.completed',
        eventType: 'PaymentCompleted',
        eventVersion: 1,
        correlationId: params.correlationId,
        subject: { claimId: intent.claimId, paymentIntentId: intent.paymentIntentId, paymentId: payment.paymentId, tenantId: intent.tenantId },
        payload: {
          tenantId: intent.tenantId,
          paymentIntentId: intent.paymentIntentId,
          paymentId: payment.paymentId,
          claimId: intent.claimId,
          amount: payment.amount,
          currency: payment.currency,
          completedAt: (intent.executionResult as any)?.executedAt,
        },
      });

      return { intent, payment };
    });
  }

  async notify(params: { tenantId: string; correlationId: string; paymentIntentId: string; channel?: string; details?: Record<string, any> }): Promise<PaymentIntent | null> {
    return await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PaymentIntent);
      const outbox = new OutboxPublisher(manager);

      const intent = await repo.findOne({
        where: { tenantId: params.tenantId, paymentIntentId: params.paymentIntentId },
      });
      if (!intent) return null;

      if (intent.status === 'notified') {
        return intent;
      }

      if (intent.status !== 'executed') {
        const err: any = new Error(`Invalid state transition: ${intent.status} -> notified`);
        err.code = 'INVALID_STATE';
        throw err;
      }

      intent.status = 'notified';
      intent.notificationResult = {
        channel: params.channel || 'default',
        details: params.details || {},
        notifiedAt: new Date().toISOString(),
      };
      intent.updatedAt = new Date();
      await repo.save(intent);

      await outbox.publish({
        topic: 'insurance.payment.notified',
        eventType: 'PaymentNotified',
        eventVersion: 1,
        correlationId: params.correlationId,
        subject: { claimId: intent.claimId, paymentIntentId: intent.paymentIntentId, tenantId: intent.tenantId },
        payload: {
          tenantId: intent.tenantId,
          paymentIntentId: intent.paymentIntentId,
          claimId: intent.claimId,
          amount: intent.amount,
          currency: intent.currency,
          status: intent.status,
          notifiedAt: (intent.notificationResult as any)?.notifiedAt,
        },
      });

      return intent;
    });
  }

  async confirmBankPayment(params: {
    tenantId: string;
    correlationId: string;
    paymentIntentId: string;
    bankTransactionId: string;
    amount?: number;
    currency?: string;
  }): Promise<PaymentIntent | null> {
    return await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PaymentIntent);
      const paymentRepo = manager.getRepository(Payment);
      const outbox = new OutboxPublisher(manager);

      const intent = await repo.findOne({
        where: { tenantId: params.tenantId, paymentIntentId: params.paymentIntentId },
      });
      if (!intent) return null;

      if (params.amount !== undefined && params.amount !== intent.amount) {
        const err: any = new Error(`Amount mismatch: expected ${intent.amount}, received ${params.amount}`);
        err.code = 'AMOUNT_MISMATCH';
        throw err;
      }

      if (params.currency && params.currency !== intent.currency) {
        const err: any = new Error(`Currency mismatch: expected ${intent.currency}, received ${params.currency}`);
        err.code = 'CURRENCY_MISMATCH';
        throw err;
      }

      if (intent.status === 'executed' || intent.status === 'notified') {
        return intent;
      }

      intent.status = 'executed';
      intent.executionResult = {
        bankTransactionId: params.bankTransactionId,
        executedAt: new Date().toISOString(),
        provider: 'bank',
      };
      intent.updatedAt = new Date();
      await repo.save(intent);

      const payment = paymentRepo.create({
        tenantId: params.tenantId,
        paymentId: uuidv4(),
        paymentIntentId: intent.paymentIntentId,
        status: 'executed',
        provider: 'bank',
        providerRef: params.bankTransactionId,
        amount: intent.amount,
        currency: intent.currency,
        details: intent.executionResult,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await paymentRepo.save(payment);

      await outbox.publish({
        topic: 'insurance.payment.executed',
        eventType: 'PaymentExecuted',
        eventVersion: 1,
        correlationId: params.correlationId,
        subject: { claimId: intent.claimId, paymentIntentId: intent.paymentIntentId, paymentId: payment.paymentId, tenantId: intent.tenantId },
        payload: {
          tenantId: intent.tenantId,
          paymentIntentId: intent.paymentIntentId,
          paymentId: payment.paymentId,
          claimId: intent.claimId,
          amount: payment.amount,
          currency: payment.currency,
          status: intent.status,
          bankTransactionId: params.bankTransactionId,
        },
      });

      await outbox.publish({
        topic: 'insurance.payment.completed',
        eventType: 'PaymentCompleted',
        eventVersion: 1,
        correlationId: params.correlationId,
        subject: { claimId: intent.claimId, paymentIntentId: intent.paymentIntentId, paymentId: payment.paymentId, tenantId: intent.tenantId },
        payload: {
          tenantId: intent.tenantId,
          paymentIntentId: intent.paymentIntentId,
          paymentId: payment.paymentId,
          claimId: intent.claimId,
          amount: payment.amount,
          currency: payment.currency,
          completedAt: new Date().toISOString(),
          bankTransactionId: params.bankTransactionId,
        },
      });

      return intent;
    });
  }

  async initiateGatewayPayment(params: {
    tenantId: string;
    correlationId: string;
    paymentIntentId: string;
    gatewayProvider: string;
    gatewayConfig?: Record<string, any>;
    returnUrl?: string;
    cancelUrl?: string;
  }): Promise<{ paymentIntent: PaymentIntent; gatewayPaymentId: string; paymentUrl?: string } | null> {
    return await this.dataSource.transaction(async (manager) => {
      const intentRepo = manager.getRepository(PaymentIntent);
      const outbox = new OutboxPublisher(manager);

      const intent = await intentRepo.findOne({
        where: { tenantId: params.tenantId, paymentIntentId: params.paymentIntentId },
      });
      if (!intent) return null;

      if (intent.status !== 'finance_approved') {
        const err: any = new Error(`Invalid state for gateway payment: ${intent.status}`);
        err.code = 'INVALID_STATE';
        throw err;
      }

      const gatewayPaymentId = uuidv4();
      let paymentUrl: string | undefined;
      let providerRef: string | undefined;

      if (this.pspProvider) {
        const pspResult = await this.pspProvider.initiatePayment({
          gatewayPaymentId,
          amount: intent.amount,
          currency: intent.currency,
          description: `Claim payment ${intent.claimId}`,
          returnUrl: params.returnUrl,
          cancelUrl: params.cancelUrl,
          metadata: {
            tenantId: intent.tenantId,
            claimId: intent.claimId,
            paymentIntentId: intent.paymentIntentId,
          },
        });

        if (!pspResult.success) {
          const err: any = new Error(`PSP initiate failed: ${pspResult.error}`);
          err.code = 'PSP_INITIATE_FAILED';
          throw err;
        }

        paymentUrl = pspResult.paymentUrl;
        providerRef = pspResult.providerRef;
      } else {
        paymentUrl = this.generateGatewayPaymentUrl({
          gatewayPaymentId,
          amount: intent.amount,
          currency: intent.currency,
          claimId: intent.claimId,
          returnUrl: params.returnUrl,
          cancelUrl: params.cancelUrl,
        });
      }

      intent.gatewayPaymentId = gatewayPaymentId;
      intent.executionResult = {
        gatewayProvider: params.gatewayProvider,
        gatewayPaymentId,
        gatewayConfig: params.gatewayConfig || {},
        providerRef,
        paymentUrl,
        initiatedAt: new Date().toISOString(),
      };
      intent.status = 'gateway_initiated';
      intent.updatedAt = new Date();
      await intentRepo.save(intent);

      await outbox.publish({
        topic: 'insurance.payment.gateway_initiated',
        eventType: 'PaymentGatewayInitiated',
        eventVersion: 1,
        correlationId: params.correlationId,
        subject: {
          paymentIntentId: intent.paymentIntentId,
          claimId: intent.claimId,
          tenantId: intent.tenantId,
        },
        payload: {
          tenantId: intent.tenantId,
          paymentIntentId: intent.paymentIntentId,
          claimId: intent.claimId,
          gatewayPaymentId,
          gatewayProvider: params.gatewayProvider,
          paymentUrl,
          amount: intent.amount,
          currency: intent.currency,
        },
      });

      return {
        paymentIntent: intent,
        gatewayPaymentId,
        paymentUrl,
      };
    });
  }

  async handleGatewayCallback(params: {
    tenantId?: string;
    gatewayPaymentId: string;
    status: 'success' | 'failed' | 'pending';
    gatewayRef?: string;
    gatewayResponse?: Record<string, any>;
    amount?: number;
    currency?: string;
    claimId?: string;
  }): Promise<{ intent: PaymentIntent; payment: Payment } | null> {
    if (params.status === 'pending') {
      this.logger.log(`Gateway callback received with pending status for ${params.gatewayPaymentId}; no state change`);
      return null;
    }

    if (this.pspProvider) {
      const verifyResult = await this.pspProvider.verifyCallback({
        gatewayPaymentId: params.gatewayPaymentId,
        providerRef: params.gatewayRef || '',
        status: params.status,
        signature: (params.gatewayResponse as any)?.signature,
        rawResponse: params.gatewayResponse || {},
      });
      if (!verifyResult.verified) {
        this.logger.warn(`PSP callback verification failed: ${verifyResult.error || 'unknown'}`);
        return null;
      }
    }

    return await this.dataSource.transaction(async (manager) => {
      const intentRepo = manager.getRepository(PaymentIntent);
      const paymentRepo = manager.getRepository(Payment);
      const outbox = new OutboxPublisher(manager);

      const where: any = { gatewayPaymentId: params.gatewayPaymentId };
      if (params.tenantId) {
        where.tenantId = params.tenantId;
      }

      const intent = await intentRepo.findOne({ where });
      if (!intent) return null;

      if (params.tenantId && intent.tenantId !== params.tenantId) {
        const err: any = new Error('Tenant mismatch in gateway callback');
        err.code = 'TENANT_MISMATCH';
        throw err;
      }

      if (params.amount !== undefined && params.amount !== intent.amount) {
        const err: any = new Error(`Amount mismatch in callback: expected ${intent.amount}, received ${params.amount}`);
        err.code = 'AMOUNT_MISMATCH';
        throw err;
      }

      if (params.currency && params.currency !== intent.currency) {
        const err: any = new Error(`Currency mismatch in callback: expected ${intent.currency}, received ${params.currency}`);
        err.code = 'CURRENCY_MISMATCH';
        throw err;
      }

      if (params.claimId && params.claimId !== intent.claimId) {
        const err: any = new Error(`Claim mismatch in callback: expected ${intent.claimId}, received ${params.claimId}`);
        err.code = 'CLAIM_MISMATCH';
        throw err;
      }

      if (intent.status === 'executed' || intent.status === 'failed' || intent.status === 'notified') {
        const existingPayment = await paymentRepo.findOne({
          where: { tenantId: intent.tenantId, paymentIntentId: intent.paymentIntentId, status: intent.status === 'notified' ? 'executed' : intent.status },
        });
        if (existingPayment) return { intent, payment: existingPayment };
        return null;
      }

      if (intent.status !== 'gateway_initiated') {
        const err: any = new Error(`Invalid state for gateway callback: ${intent.status}`);
        err.code = 'INVALID_STATE';
        throw err;
      }

      const paymentStatus = params.status === 'success' ? 'executed' : 'failed';
      intent.status = paymentStatus;
      intent.executionResult = {
        ...(intent.executionResult || {}),
        gatewayRef: params.gatewayRef,
        gatewayResponse: params.gatewayResponse || {},
        callbackReceivedAt: new Date().toISOString(),
      };
      intent.updatedAt = new Date();
      await intentRepo.save(intent);

      const payment = paymentRepo.create({
        tenantId: intent.tenantId,
        paymentId: uuidv4(),
        paymentIntentId: intent.paymentIntentId,
        status: paymentStatus,
        provider: (intent.executionResult as any)?.gatewayProvider || null,
        providerRef: params.gatewayRef || null,
        amount: intent.amount,
        currency: intent.currency,
        details: intent.executionResult,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await paymentRepo.save(payment);

      const topic = paymentStatus === 'executed' ? 'insurance.payment.executed' : 'insurance.payment.failed';
      const eventType = paymentStatus === 'executed' ? 'PaymentExecuted' : 'PaymentFailed';

      await outbox.publish({
        topic,
        eventType,
        eventVersion: 1,
        correlationId: (intent.executionResult as any)?.correlationId || `${Date.now()}`,
        subject: { claimId: intent.claimId, paymentIntentId: intent.paymentIntentId, paymentId: payment.paymentId, tenantId: intent.tenantId },
        payload: {
          tenantId: intent.tenantId,
          paymentIntentId: intent.paymentIntentId,
          paymentId: payment.paymentId,
          claimId: intent.claimId,
          amount: payment.amount,
          currency: payment.currency,
          status: paymentStatus,
          gatewayRef: params.gatewayRef,
        },
      });

      if (paymentStatus === 'executed') {
        await outbox.publish({
          topic: 'insurance.payment.completed',
          eventType: 'PaymentCompleted',
          eventVersion: 1,
          correlationId: (intent.executionResult as any)?.correlationId || `${Date.now()}`,
          subject: { claimId: intent.claimId, paymentIntentId: intent.paymentIntentId, paymentId: payment.paymentId, tenantId: intent.tenantId },
          payload: {
            tenantId: intent.tenantId,
            paymentIntentId: intent.paymentIntentId,
            paymentId: payment.paymentId,
            claimId: intent.claimId,
            amount: payment.amount,
            currency: payment.currency,
            completedAt: new Date().toISOString(),
            gatewayRef: params.gatewayRef,
          },
        });
      }

      if (intent.brokerOrganizationId) {
        await outbox.publish({
          topic: 'insurance.payment.gateway-callback.broker-notification',
          eventType: 'BrokerPaymentCallbackNotification',
          eventVersion: 1,
          correlationId: (intent.executionResult as any)?.correlationId || `${Date.now()}`,
          subject: { paymentIntentId: intent.paymentIntentId, paymentId: payment.paymentId, brokerOrganizationId: intent.brokerOrganizationId, tenantId: intent.tenantId },
          payload: {
            tenantId: intent.tenantId,
            paymentIntentId: intent.paymentIntentId,
            paymentId: payment.paymentId,
            claimId: intent.claimId,
            policyId: intent.policyId,
            brokerOrganizationId: intent.brokerOrganizationId,
            amount: payment.amount,
            currency: payment.currency,
            status: paymentStatus,
            gatewayRef: params.gatewayRef,
            notificationType: paymentStatus === 'executed' ? 'payment_completed' : 'payment_failed',
          },
        });
      }

      return { intent, payment };
    });
  }

  private generateGatewayPaymentUrl(params: {
    gatewayPaymentId: string;
    amount: number;
    currency: string;
    claimId: string;
    returnUrl?: string;
    cancelUrl?: string;
  }): string {
    const baseUrl = process.env.GATEWAY_PAYMENT_BASE_URL || 'https://sandbox-gateway.example.com/pay';
    const url = new URL(baseUrl);
    url.searchParams.append('payment_id', params.gatewayPaymentId);
    url.searchParams.append('amount', String(params.amount));
    url.searchParams.append('currency', params.currency);
    url.searchParams.append('claim_id', params.claimId);
    if (params.returnUrl) url.searchParams.append('return_url', params.returnUrl);
    if (params.cancelUrl) url.searchParams.append('cancel_url', params.cancelUrl);
    return url.toString();
  }

  async getIntent(paymentIntentId: string, tenantId: string): Promise<PaymentIntent | null> {
    return await this.intentRepo.findOne({ where: { tenantId, paymentIntentId } });
  }

  async getPaymentById(paymentId: string, tenantId: string): Promise<Payment | null> {
    return await this.paymentRepo.findOne({ where: { tenantId, paymentId } });
  }

  async listIntents(params: { tenantId: string; claimId?: string; status?: string; paymentType?: string; brokerOrganizationId?: string; limit: number; offset: number }): Promise<{ rows: PaymentIntent[]; total: number }> {
    const qb = this.intentRepo.createQueryBuilder('pi');
    qb.andWhere('pi.tenantId = :tenantId', { tenantId: params.tenantId });
    if (params.claimId) qb.andWhere('pi.claimId = :claimId', { claimId: params.claimId });
    if (params.status) qb.andWhere('pi.status = :status', { status: params.status });
    if (params.paymentType) qb.andWhere('pi.paymentType = :paymentType', { paymentType: params.paymentType });
    if (params.brokerOrganizationId) qb.andWhere('pi.brokerOrganizationId = :brokerOrgId', { brokerOrgId: params.brokerOrganizationId });
    qb.orderBy('pi.updatedAt', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async reconcilePayments(params: {
    tenantId: string;
    correlationId: string;
    dateFrom: string;
    dateTo: string;
  }): Promise<{ success: boolean; discrepancies?: any[]; error?: string }> {
    if (!this.pspProvider) {
      return { success: false, error: 'No PSP provider configured for reconciliation' };
    }

    const pspResult = await this.pspProvider.reconcile({ dateFrom: params.dateFrom, dateTo: params.dateTo });
    if (!pspResult.success) {
      return { success: false, error: pspResult.error };
    }

    const discrepancies: any[] = [];
    const pspRefs = new Set((pspResult.transactions || []).map((t) => t.providerRef));
    const internalPayments = await this.paymentRepo.find({
      where: {
        tenantId: params.tenantId,
        createdAt: Between(new Date(params.dateFrom), new Date(params.dateTo)),
      } as any,
    });

    for (const payment of internalPayments) {
      if (payment.providerRef && !pspRefs.has(payment.providerRef)) {
        discrepancies.push({
          type: 'MISSING_IN_PSP',
          paymentId: payment.paymentId,
          providerRef: payment.providerRef,
          amount: payment.amount,
        });
      }
    }

    return { success: true, discrepancies };
  }

  async refundPayment(params: {
    tenantId: string;
    correlationId: string;
    paymentId: string;
    amount: number;
    reason?: string;
  }): Promise<{ success: boolean; refundRef?: string; error?: string }> {
    if (!this.pspProvider) {
      return { success: false, error: 'No PSP provider configured for refunds' };
    }

    return await this.dataSource.transaction(async (manager) => {
      const paymentRepo = manager.getRepository(Payment);
      const payment = await paymentRepo.findOne({ where: { tenantId: params.tenantId, paymentId: params.paymentId } });
      if (!payment) {
        return { success: false, error: 'Payment not found' };
      }
      if (payment.status !== 'executed' && payment.status !== 'partially_refunded') {
        return { success: false, error: 'Only executed or partially_refunded payments can be refunded' };
      }

      if (!payment.providerRef) {
        return { success: false, error: 'Cannot refund payment without providerRef' };
      }

      const remainingAmount = Number(payment.amount) - Number(payment.refundedAmount || 0);
      if (params.amount > remainingAmount) {
        return { success: false, error: `Refund amount ${params.amount} exceeds remaining refundable amount ${remainingAmount}` };
      }

      const pspResult = await this.pspProvider!.refund({
        originalProviderRef: payment.providerRef,
        amount: params.amount,
        reason: params.reason,
      });

      if (pspResult.success) {
        const newRefundedAmount = Number(payment.refundedAmount || 0) + params.amount;
        const isFullRefund = newRefundedAmount >= Number(payment.amount);

        payment.status = isFullRefund ? 'refunded' : 'partially_refunded';
        payment.refundedAmount = newRefundedAmount;
        payment.metadata = {
          ...payment.metadata,
          refundRef: pspResult.refundRef,
          refundAmount: params.amount,
          totalRefundedAmount: newRefundedAmount,
          refundReason: params.reason,
          refundedAt: new Date().toISOString(),
        };
        payment.updatedAt = new Date();
        await paymentRepo.save(payment);

        const outbox = new OutboxPublisher(manager);
        await outbox.publish({
          topic: 'insurance.payment.refunded',
          eventType: 'PaymentRefunded',
          eventVersion: 1,
          correlationId: params.correlationId,
          subject: { paymentId: payment.paymentId, paymentIntentId: payment.paymentIntentId, tenantId: payment.tenantId },
          payload: {
            tenantId: payment.tenantId,
            paymentId: payment.paymentId,
            paymentIntentId: payment.paymentIntentId,
            refundRef: pspResult.refundRef,
            refundAmount: params.amount,
            totalRefundedAmount: newRefundedAmount,
            isPartial: !isFullRefund,
            refundReason: params.reason,
            refundedAt: new Date().toISOString(),
          },
        });
      }

      return pspResult;
    });
  }

  async createDispute(params: {
    tenantId: string;
    correlationId: string;
    paymentId: string;
    reason: string;
    evidence?: Record<string, any>;
  }): Promise<{ success: boolean; disputeId?: string; error?: string }> {
    return await this.dataSource.transaction(async (manager) => {
      const paymentRepo = manager.getRepository(Payment);
      const payment = await paymentRepo.findOne({ where: { tenantId: params.tenantId, paymentId: params.paymentId } });
      if (!payment) {
        return { success: false, error: 'Payment not found' };
      }

      const disputeId = uuidv4();
      const disputeRepo = manager.getRepository(PaymentDispute);
      const dispute = disputeRepo.create({
        disputeId,
        tenantId: params.tenantId,
        paymentId: payment.paymentId,
        reason: params.reason,
        evidence: params.evidence || null,
        status: 'open',
        resolutionNotes: null,
        resolvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await disputeRepo.save(dispute);

      payment.metadata = {
        ...payment.metadata,
        disputeId,
        disputeReason: params.reason,
        disputeEvidence: params.evidence,
        disputedAt: new Date().toISOString(),
        disputeStatus: 'open',
      };
      payment.status = 'disputed';
      payment.updatedAt = new Date();
      await paymentRepo.save(payment);

      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.payment.disputed',
        eventType: 'PaymentDisputed',
        eventVersion: 1,
        correlationId: params.correlationId,
        subject: { paymentId: payment.paymentId, paymentIntentId: payment.paymentIntentId, tenantId: payment.tenantId },
        payload: {
          tenantId: payment.tenantId,
          paymentId: payment.paymentId,
          paymentIntentId: payment.paymentIntentId,
          disputeId,
          disputeReason: params.reason,
          disputedAt: new Date().toISOString(),
        },
      });

      return { success: true, disputeId };
    });
  }

  async resolveDispute(params: {
    tenantId: string;
    correlationId: string;
    disputeId: string;
    resolution: 'resolved' | 'rejected';
    resolutionNotes: string;
  }): Promise<{ success: boolean; dispute?: PaymentDispute; error?: string }> {
    return await this.dataSource.transaction(async (manager) => {
      const disputeRepo = manager.getRepository(PaymentDispute);
      const dispute = await disputeRepo.findOne({ where: { tenantId: params.tenantId, disputeId: params.disputeId } });
      if (!dispute) {
        return { success: false, error: 'Dispute not found' };
      }

      if (dispute.status === 'resolved' || dispute.status === 'rejected') {
        return { success: false, error: 'Dispute already closed' };
      }

      dispute.status = params.resolution;
      dispute.resolutionNotes = params.resolutionNotes;
      dispute.resolvedAt = new Date();
      dispute.updatedAt = new Date();
      await disputeRepo.save(dispute);

      const paymentRepo = manager.getRepository(Payment);
      const payment = await paymentRepo.findOne({ where: { tenantId: params.tenantId, paymentId: dispute.paymentId } });
      if (payment) {
        payment.metadata = {
          ...payment.metadata,
          disputeStatus: params.resolution,
          disputeResolutionNotes: params.resolutionNotes,
          disputeResolvedAt: dispute.resolvedAt.toISOString(),
        };
        if (params.resolution === 'resolved') {
          payment.status = 'executed';
        }
        payment.updatedAt = new Date();
        await paymentRepo.save(payment);
      }

      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.payment.dispute.resolved',
        eventType: 'PaymentDisputeResolved',
        eventVersion: 1,
        correlationId: params.correlationId,
        subject: { paymentId: dispute.paymentId, disputeId: dispute.disputeId, tenantId: params.tenantId },
        payload: {
          tenantId: params.tenantId,
          disputeId: dispute.disputeId,
          paymentId: dispute.paymentId,
          resolution: params.resolution,
          resolutionNotes: params.resolutionNotes,
          resolvedAt: dispute.resolvedAt.toISOString(),
        },
      });

      return { success: true, dispute };
    });
  }
}
