import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { BrokerageSettlementBatch } from './settlement-batch.entity';
import { SettlementBatchLine } from './settlement-batch-line.entity';
import { BrokeragePayable } from '../payables/payable.entity';
import { BrokerageReceivable } from '../receivables/receivable.entity';
import { OutboxPublisher } from '@insurance/shared';

export interface ReconciliationDiscrepancy {
  type: 'MISSING_PAYABLE' | 'MISSING_RECEIVABLE' | 'AMOUNT_MISMATCH' | 'DUPLICATE_LINE' | 'PAYMENT_STATUS_MISMATCH';
  sourceType: string;
  sourceId: string;
  expectedAmountMinor: string;
  actualAmountMinor: string;
  message: string;
}

export interface SettlementReconciliationResult {
  batchId: string;
  tenantId: string;
  status: 'RECONCILED' | 'DISCREPANCY_DETECTED';
  totalLines: number;
  discrepancies: ReconciliationDiscrepancy[];
  hashVerified: boolean;
}

@Injectable()
export class SettlementReconciliationService {
  private readonly logger = new Logger(SettlementReconciliationService.name);

  constructor(
    @InjectRepository(BrokerageSettlementBatch) private readonly batchRepo: Repository<BrokerageSettlementBatch>,
    @InjectRepository(SettlementBatchLine) private readonly lineRepo: Repository<SettlementBatchLine>,
    @InjectRepository(BrokeragePayable) private readonly payableRepo: Repository<BrokeragePayable>,
    @InjectRepository(BrokerageReceivable) private readonly receivableRepo: Repository<BrokerageReceivable>,
    private readonly dataSource: DataSource,
  ) {}

  async reconcileBatch(tenantId: string, batchId: string): Promise<SettlementReconciliationResult> {
    const batch = await this.batchRepo.findOne({ where: { batchId, tenantId } });
    if (!batch) throw new Error('Settlement batch not found');

    const lines = await this.lineRepo.find({ where: { batchId, tenantId } });
    const discrepancies: ReconciliationDiscrepancy[] = [];

    // Verify hash
    const hashInput = lines
      .map((l) => `${l.lineType}:${l.sourceType}:${l.sourceId}:${l.amountMinor}`)
      .sort()
      .join('|');
    const recomputedHash = Buffer.from(hashInput).toString('base64');
    const hashVerified = recomputedHash === batch.reconciliationHash;
    if (!hashVerified) {
      discrepancies.push({
        type: 'AMOUNT_MISMATCH',
        sourceType: 'BATCH',
        sourceId: batchId,
        expectedAmountMinor: batch.reconciliationHash,
        actualAmountMinor: recomputedHash,
        message: 'Batch reconciliation hash does not match line items',
      });
    }

    // Check each line against source payable/receivable
    for (const line of lines) {
      if (line.lineType === 'PREMIUM' || line.lineType === 'FEE') {
        const payable = await this.payableRepo.findOne({
          where: { tenantId, sourceType: line.sourceType, sourceId: line.sourceId },
        });
        if (!payable) {
          discrepancies.push({
            type: 'MISSING_PAYABLE',
            sourceType: line.sourceType,
            sourceId: line.sourceId,
            expectedAmountMinor: line.amountMinor,
            actualAmountMinor: '0',
            message: 'Payable not found for batch line',
          });
        } else if (String(payable.amount) !== line.amountMinor) {
          discrepancies.push({
            type: 'AMOUNT_MISMATCH',
            sourceType: line.sourceType,
            sourceId: line.sourceId,
            expectedAmountMinor: line.amountMinor,
            actualAmountMinor: String(payable.amount),
            message: 'Payable amount does not match batch line',
          });
        }
      } else if (line.lineType === 'COMMISSION' || line.lineType === 'CLAWBACK') {
        const receivable = await this.receivableRepo.findOne({
          where: { tenantId, sourceType: line.sourceType, sourceId: line.sourceId },
        });
        if (!receivable) {
          discrepancies.push({
            type: 'MISSING_RECEIVABLE',
            sourceType: line.sourceType,
            sourceId: line.sourceId,
            expectedAmountMinor: line.amountMinor,
            actualAmountMinor: '0',
            message: 'Receivable not found for batch line',
          });
        } else if (String(receivable.amount) !== line.amountMinor) {
          discrepancies.push({
            type: 'AMOUNT_MISMATCH',
            sourceType: line.sourceType,
            sourceId: line.sourceId,
            expectedAmountMinor: line.amountMinor,
            actualAmountMinor: String(receivable.amount),
            message: 'Receivable amount does not match batch line',
          });
        }
      }
    }

    // Verify payment status via payment-service
    if (batch.paymentId) {
      try {
        const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://localhost:18004';
        const token = process.env.PAYMENT_SERVICE_TOKEN || '';
        const response = await fetch(`${paymentServiceUrl}/api/v1/ecosystem/payments/${batch.paymentId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-Id': tenantId,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (response.ok) {
          const paymentData: any = await response.json();
          const payment = paymentData.data || paymentData;
          const paymentStatus = String(payment.status || payment.paymentStatus || '').toUpperCase();

          if (paymentStatus !== 'SUCCESS' && paymentStatus !== 'SETTLED' && paymentStatus !== 'COMPLETED') {
            discrepancies.push({
              type: 'PAYMENT_STATUS_MISMATCH',
              sourceType: 'BATCH',
              sourceId: batchId,
              expectedAmountMinor: 'SUCCESS',
              actualAmountMinor: paymentStatus,
              message: `Payment-service reports status ${paymentStatus} for batch payment ${batch.paymentId}`,
            });
          }

          const paymentAmount = String(payment.amount || payment.amountMinor || '0');
          if (paymentAmount !== '0' && paymentAmount !== String(batch.netSettlementAmount)) {
            discrepancies.push({
              type: 'AMOUNT_MISMATCH',
              sourceType: 'BATCH',
              sourceId: batchId,
              expectedAmountMinor: String(batch.netSettlementAmount),
              actualAmountMinor: paymentAmount,
              message: `Payment-service amount ${paymentAmount} does not match batch net ${batch.netSettlementAmount}`,
            });
          }
        } else {
          this.logger.warn(`Payment-service returned ${response.status} for payment ${batch.paymentId}`);
          discrepancies.push({
            type: 'PAYMENT_STATUS_MISMATCH',
            sourceType: 'BATCH',
            sourceId: batchId,
            expectedAmountMinor: 'SUCCESS',
            actualAmountMinor: 'UNKNOWN',
            message: `Payment-service returned ${response.status} for payment ${batch.paymentId}`,
          });
        }
      } catch (err: any) {
        this.logger.warn(`Failed to verify payment ${batch.paymentId} via payment-service: ${err?.message}`);
        discrepancies.push({
          type: 'PAYMENT_STATUS_MISMATCH',
          sourceType: 'BATCH',
          sourceId: batchId,
          expectedAmountMinor: 'SUCCESS',
          actualAmountMinor: 'UNAVAILABLE',
          message: `Payment-service verification unavailable: ${err?.message}`,
        });
      }
    }

    const status = discrepancies.length === 0 ? 'RECONCILED' : 'DISCREPANCY_DETECTED';

    if (status === 'DISCREPANCY_DETECTED') {
      batch.status = 'disputed';
    } else {
      batch.status = 'reconciled';
    }
    await this.batchRepo.save(batch);

    await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      if (status === 'RECONCILED') {
        await outbox.publish({
          topic: 'insurance.billing.settlement.batch.reconciled',
          eventType: 'SettlementBatchReconciled',
          eventVersion: 1,
          correlationId: uuidv4(),
          tenantId,
          subject: { batchId },
          payload: {
            batchId,
            totalLines: lines.length,
            hashVerified,
          },
        });
      } else {
        await outbox.publish({
          topic: 'insurance.billing.settlement.discrepancy_detected',
          eventType: 'SettlementDiscrepancyDetected',
          eventVersion: 1,
          correlationId: uuidv4(),
          tenantId,
          subject: { batchId },
          payload: {
            batchId,
            totalLines: lines.length,
            discrepancyCount: discrepancies.length,
            discrepancies,
          },
        });
      }
    });

    return { batchId, tenantId, status, totalLines: lines.length, discrepancies, hashVerified };
  }
}
