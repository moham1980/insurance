import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OutboxPublisher } from '@insurance/shared';
import { ClaimPostingService } from '../ledger/claim-posting.service';
import { LedgerPostingService } from '../ledger/ledger-posting.service';
import { FinancialPeriod } from '../entities/FinancialPeriod';

export interface ClaimPaymentResult {
  paymentId: string;
  claimId: string;
  paidAmount: string;
  currency: string;
  journalEntryId: string;
  paymentReference: string;
  status: 'initiated' | 'settled' | 'failed';
}

@Injectable()
export class ClaimPaymentService {
  private readonly logger = new Logger(ClaimPaymentService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly claimPosting: ClaimPostingService,
    private readonly ledgerPosting: LedgerPostingService,
  ) {}

  async processClaimPayment(params: {
    tenantId: string;
    organizationId: string;
    claimId: string;
    approvedAmount: string;
    currency: string;
    destinationAccountRef: string;
    carrierOrganizationId?: string;
    brokerOrganizationId?: string;
    correlationId: string;
    idempotencyKey?: string;
  }): Promise<ClaimPaymentResult> {
    const paymentId = uuidv4();
    const idempotencyKey = params.idempotencyKey || `claim-payment-${params.claimId}-${params.approvedAmount}`;

    if (BigInt(params.approvedAmount) <= 0n) {
      const err: any = new Error('approvedAmount must be positive');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const period = await this.dataSource.getRepository(FinancialPeriod).findOne({
      where: { tenantId: params.tenantId, status: 'open' as any },
      order: { startDate: 'DESC' },
    });

    if (!period) {
      const err: any = new Error('No open financial period found for claim payment');
      err.code = 'NO_OPEN_PERIOD';
      throw err;
    }

    const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://localhost:8085';
    const token = process.env.PAYMENT_SERVICE_TOKEN || '';
    const paymentReference = `CLM-${params.claimId.substring(0, 8)}-${Date.now()}`;

    let paymentStatus: 'initiated' | 'settled' | 'failed' = 'initiated';

    try {
      const response = await fetch(`${paymentServiceUrl}/api/v1/ecosystem/payments/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': params.tenantId,
          'X-Idempotency-Key': idempotencyKey,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sourceAccountRef: params.organizationId,
          destinationAccountRef: params.destinationAccountRef,
          amount: params.approvedAmount,
          currency: params.currency,
          paymentReference,
          description: `Claim payment for claim ${params.claimId}`,
          metadata: {
            claimId: params.claimId,
            paymentId,
            carrierOrganizationId: params.carrierOrganizationId,
            brokerOrganizationId: params.brokerOrganizationId,
          },
        }),
      });

      if (response.ok) {
        const data: any = await response.json();
        const status = String(data.status || data.paymentStatus || '').toUpperCase();
        if (status === 'SETTLED' || status === 'COMPLETED' || status === 'SUCCESS') {
          paymentStatus = 'settled';
        }
      } else {
        this.logger.warn(`Payment-service returned ${response.status} for claim payment ${params.claimId}`);
        paymentStatus = 'failed';
      }
    } catch (err: any) {
      this.logger.warn(`Failed to initiate payment via payment-service: ${err?.message}`);
      paymentStatus = 'failed';
    }

    const { journalEntryId } = await this.claimPosting.postClaimPayment({
      tenantId: params.tenantId,
      organizationId: params.organizationId,
      claimId: params.claimId,
      paymentId,
      paidAmount: params.approvedAmount,
      currency: params.currency,
      periodId: period.periodId,
      postingDate: new Date(),
      correlationId: params.correlationId,
      carrierOrganizationId: params.carrierOrganizationId,
      brokerOrganizationId: params.brokerOrganizationId,
    });

    await this.dataSource.transaction(async (manager) => {
      const publisher = new OutboxPublisher(manager);
      await publisher.publish({
        topic: 'insurance.claim.payment_processed',
        eventType: 'ClaimPaymentProcessed',
        eventVersion: 1,
        correlationId: params.correlationId,
        subject: {
          claimId: params.claimId,
          paymentId,
          tenantId: params.tenantId,
        },
        payload: {
          paymentId,
          claimId: params.claimId,
          paidAmount: params.approvedAmount,
          currency: params.currency,
          paymentReference,
          journalEntryId,
          status: paymentStatus,
          processedAt: new Date().toISOString(),
        },
      });
    });

    this.logger.log(`Claim payment ${paymentId} processed for claim ${params.claimId}, status: ${paymentStatus}`);

    return {
      paymentId,
      claimId: params.claimId,
      paidAmount: params.approvedAmount,
      currency: params.currency,
      journalEntryId,
      paymentReference,
      status: paymentStatus,
    };
  }
}
