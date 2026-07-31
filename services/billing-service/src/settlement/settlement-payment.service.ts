import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { BrokerageSettlementBatch } from './settlement-batch.entity';
import { SettlementBatchLine, SettlementBatchLineType } from './settlement-batch-line.entity';
import { BrokeragePayable } from '../payables/payable.entity';
import { BrokerageReceivable } from '../receivables/receivable.entity';
import { OutboxPublisher } from '@insurance/shared';

@Injectable()
export class SettlementPaymentService {
  private readonly logger = new Logger(SettlementPaymentService.name);

  constructor(
    @InjectRepository(BrokerageSettlementBatch) private readonly batchRepo: Repository<BrokerageSettlementBatch>,
    @InjectRepository(SettlementBatchLine) private readonly lineRepo: Repository<SettlementBatchLine>,
    @InjectRepository(BrokeragePayable) private readonly payableRepo: Repository<BrokeragePayable>,
    @InjectRepository(BrokerageReceivable) private readonly receivableRepo: Repository<BrokerageReceivable>,
    private readonly dataSource: DataSource,
  ) {}

  async createBatch(params: {
    tenantId: string;
    fromOrganizationId: string;
    toOrganizationId: string;
    periodStart: Date;
    periodEnd: Date;
    correlationId: string;
    approvedByPartyId?: string;
    calculatedByPartyId?: string;
  }): Promise<BrokerageSettlementBatch> {
    return await this.dataSource.transaction(async (manager) => {
      const payableRepo = manager.getRepository(BrokeragePayable);
      const receivableRepo = manager.getRepository(BrokerageReceivable);
      const batchRepo = manager.getRepository(BrokerageSettlementBatch);
      const outbox = new OutboxPublisher(manager);

      const payables = await payableRepo.find({
        where: {
          tenantId: params.tenantId,
          creditorOrganizationId: params.toOrganizationId,
          debtorOrganizationId: params.fromOrganizationId,
          status: 'open',
        },
      });

      const receivables = await receivableRepo.find({
        where: {
          tenantId: params.tenantId,
          creditorOrganizationId: params.toOrganizationId,
          debtorOrganizationId: params.fromOrganizationId,
          status: 'open',
        },
      });

      const totalPayables = payables.reduce((sum, p) => sum + BigInt(String(p.amount)), BigInt(0));
      const totalReceivables = receivables.reduce((sum, r) => sum + BigInt(String(r.amount)), BigInt(0));
      const net = totalPayables - totalReceivables;

      const payableItems = payables.map((p) => ({
        id: p.payableId,
        type: 'payable' as const,
        amount: String(p.amount),
        currency: p.currency,
        sourceType: p.sourceType,
        sourceId: p.sourceId,
        organizationId: p.debtorOrganizationId,
      }));
      const receivableItems = receivables.map((r) => ({
        id: r.receivableId,
        type: 'receivable' as const,
        amount: String(r.amount),
        currency: r.currency,
        sourceType: r.sourceType,
        sourceId: r.sourceId,
        organizationId: r.creditorOrganizationId,
      }));
      const items = [...payableItems, ...receivableItems];

      // Build line objects first so hash can be computed from the same data as stored lines
      const lineObjects: Array<{
        lineType: SettlementBatchLineType;
        sourceType: string;
        sourceId: string;
        amountMinor: string;
        currency: string;
        organizationId: string;
        nettedAmountMinor: string;
        itemType: 'payable' | 'receivable';
        itemId: string;
      }> = [];

      for (const item of items) {
        const lineType: SettlementBatchLineType =
          item.type === 'payable'
            ? (item.sourceType?.toUpperCase() as SettlementBatchLineType) || 'PREMIUM'
            : (item.sourceType?.toUpperCase() as SettlementBatchLineType) || 'COMMISSION';

        lineObjects.push({
          lineType,
          sourceType: item.sourceType,
          sourceId: item.sourceId,
          amountMinor: item.amount,
          currency: item.currency,
          organizationId: item.organizationId,
          nettedAmountMinor: item.type === 'payable' ? item.amount : (BigInt(item.amount) * BigInt(-1)).toString(),
          itemType: item.type,
          itemId: item.id,
        });
      }

      // Compute hash from the same fields that reconcileBatch will read from saved lines
      const hashInput = lineObjects
        .map((l) => `${l.lineType}:${l.sourceType}:${l.sourceId}:${l.amountMinor}`)
        .sort()
        .join('|');
      const reconciliationHash = Buffer.from(hashInput).toString('base64');

      const batch = new BrokerageSettlementBatch();
      batch.batchId = uuidv4();
      batch.tenantId = params.tenantId;
      batch.fromOrganizationId = params.fromOrganizationId;
      batch.toOrganizationId = params.toOrganizationId;
      batch.periodStart = params.periodStart;
      batch.periodEnd = params.periodEnd;
      batch.totalPremiumAmount = totalPayables.toString();
      batch.totalPremiumCurrency = payables[0]?.currency || receivables[0]?.currency || 'IRR';
      batch.totalCommissionAmount = totalReceivables.toString();
      batch.totalCommissionCurrency = receivables[0]?.currency || payables[0]?.currency || 'IRR';
      batch.netSettlementAmount = net.toString();
      batch.netSettlementCurrency = payables[0]?.currency || receivables[0]?.currency || 'IRR';
      batch.reconciliationHash = reconciliationHash;
      batch.status = 'draft';
      batch.approvedByPartyId = params.approvedByPartyId || null;
      batch.calculatedByPartyId = params.calculatedByPartyId || null;
      batch.metadata = { itemCount: items.length, items: items.map((i) => ({ id: i.id, type: i.type, amount: i.amount })) };

      const savedBatch = await batchRepo.save(batch);

      const lineRepo = manager.getRepository(SettlementBatchLine);
      for (const lObj of lineObjects) {
        const line = lineRepo.create({
          batchLineId: uuidv4(),
          tenantId: params.tenantId,
          batchId: savedBatch.batchId,
          organizationId: lObj.organizationId,
          lineType: lObj.lineType,
          sourceType: lObj.sourceType,
          sourceId: lObj.sourceId,
          amountMinor: lObj.amountMinor,
          currency: lObj.currency,
          nettedAmountMinor: lObj.nettedAmountMinor,
          status: 'included',
        });
        await lineRepo.save(line);
      }

      await outbox.publish({
        topic: 'insurance.billing.settlement.batch.created',
        eventType: 'SettlementBatchCreated',
        eventVersion: 1,
        correlationId: params.correlationId,
        tenantId: params.tenantId,
        subject: { batchId: batch.batchId },
        payload: {
          batchId: batch.batchId,
          fromOrganizationId: params.fromOrganizationId,
          toOrganizationId: params.toOrganizationId,
          netSettlementAmount: net.toString(),
          reconciliationHash,
        },
      });

      return savedBatch;
    });
  }

  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_BACKOFF_MS = 1000;

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

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async approveBatch(batchId: string, tenantId: string, approvedByPartyId: string, correlationId?: string): Promise<BrokerageSettlementBatch> {
    const batch = await this.batchRepo.findOne({ where: { batchId, tenantId } });
    if (!batch) throw new BadRequestException('Settlement batch not found');
    if (batch.status !== 'draft') throw new BadRequestException(`Cannot approve batch in status ${batch.status}`);

    if (batch.calculatedByPartyId && batch.calculatedByPartyId === approvedByPartyId) {
      throw new BadRequestException('SoD conflict: the party who calculated the batch cannot approve it');
    }

    batch.status = 'approved';
    batch.approvedByPartyId = approvedByPartyId;
    await this.batchRepo.save(batch);

    await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.billing.settlement.batch.approved',
        eventType: 'SettlementBatchApproved',
        eventVersion: 1,
        correlationId: correlationId || uuidv4(),
        tenantId,
        subject: { batchId: batch.batchId },
        payload: {
          batchId: batch.batchId,
          approvedByPartyId,
          netSettlementAmount: batch.netSettlementAmount,
        },
      });
    });

    return batch;
  }

  async confirmAndPay(params: {
    batchId: string;
    tenantId: string;
    fromAccountId: string;
    toAccountId: string;
    correlationId: string;
  }): Promise<BrokerageSettlementBatch> {
    const batch = await this.batchRepo.findOne({ where: { batchId: params.batchId, tenantId: params.tenantId } });
    if (!batch) throw new BadRequestException('Settlement batch not found');
    if (batch.status !== 'approved' && batch.status !== 'retry_pending') throw new BadRequestException('Settlement batch must be approved before payment');

    const netBig = BigInt(batch.netSettlementAmount);
    const isNegative = netBig < BigInt(0);
    const absNet = isNegative ? -netBig : netBig;

    const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://localhost:8085';
    const idempotencyKey = `settlement-${batch.batchId}`;

    let lastError: Error | null = null;
    const maxRetries = SettlementPaymentService.MAX_RETRIES;
    const attemptCount = (batch.metadata?.retryCount as number) || 0;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(`${paymentServiceUrl}/api/v1/ecosystem/payments/initiate`, {
          method: 'POST',
          headers: {
            ...this.resolveAuthHeaders(params.correlationId),
            'X-Idempotency-Key': idempotencyKey,
            'X-Tenant-Id': params.tenantId,
          },
          body: JSON.stringify({
            fromAccountId: isNegative ? params.toAccountId : params.fromAccountId,
            toAccountId: isNegative ? params.fromAccountId : params.toAccountId,
            amount: absNet.toString(),
            currency: batch.netSettlementCurrency,
            paymentType: 'TRANSFER',
            reference: `settlement-${batch.batchId}`,
            description: `Brokerage settlement batch ${batch.batchId}`,
          }),
        });

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`Settlement payment initiation failed: ${response.status} ${errBody}`);
        }

        const result: any = await response.json();
        batch.status = 'confirmed';
        batch.paymentId = result.paymentId || null;
        batch.metadata = { ...batch.metadata, retryCount: attemptCount + attempt, lastError: null, netDirection: isNegative ? 'reverse' : 'forward' };
        await this.batchRepo.save(batch);

        return batch;
      } catch (err: any) {
        lastError = err;
        this.logger.warn(
          `Settlement payment attempt ${attempt + 1}/${maxRetries} failed for batch ${batch.batchId}: ${err?.message}`,
        );

        if (attempt < maxRetries - 1) {
          const backoffMs = SettlementPaymentService.BASE_BACKOFF_MS * Math.pow(2, attempt);
          await this.sleep(backoffMs);
        }
      }
    }

    batch.status = 'manual_review';
    batch.metadata = {
      ...batch.metadata,
      retryCount: attemptCount + maxRetries,
      lastError: lastError?.message || 'Unknown error',
      failedAt: new Date().toISOString(),
    };
    await this.batchRepo.save(batch);

    this.logger.error(
      `Settlement payment for batch ${batch.batchId} exhausted ${maxRetries} retries, moved to manual_review`,
    );

    throw new Error(`Settlement payment failed after ${maxRetries} retries: ${lastError?.message}`);
  }

  async verifyPayment(batchId: string, tenantId: string): Promise<BrokerageSettlementBatch> {
    const batch = await this.batchRepo.findOne({ where: { batchId, tenantId } });
    if (!batch) throw new Error('Settlement batch not found');
    if (!batch.paymentId) throw new Error('Settlement batch has no payment id');

    const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://localhost:8085';
    const response = await fetch(`${paymentServiceUrl}/api/v1/ecosystem/payments/${batch.paymentId}`, {
      method: 'GET',
      headers: {
        ...this.resolveAuthHeaders(`verify-${batch.batchId}`),
        'X-Tenant-Id': tenantId,
      },
    });

    if (!response.ok) {
      throw new Error(`Settlement payment verification failed: ${response.status}`);
    }

    const result: any = await response.json();
    if (result.status === 'SETTLED') {
      batch.status = 'paid';
      await this.batchRepo.save(batch);

      // Mark covered payables/receivables as paid
      await this.dataSource.transaction(async (manager) => {
        const outbox = new OutboxPublisher(manager);
        const lineRepo = manager.getRepository(SettlementBatchLine);
        const items = (batch.metadata?.items || []) as { id: string; type: string; sourceType?: string; sourceId?: string }[];
        for (const item of items) {
          if (item.type === 'payable') {
            await manager.update(BrokeragePayable, { payableId: item.id }, { status: 'paid' });
          } else if (item.type === 'receivable') {
            await manager.update(BrokerageReceivable, { receivableId: item.id }, { status: 'paid' });
          }
          const line = await lineRepo.findOne({
            where: { batchId: batch.batchId, sourceId: item.id },
          });
          if (line) {
            line.status = 'paid';
            await lineRepo.save(line);
          }
        }

        await outbox.publish({
          topic: 'insurance.billing.settlement.batch.paid',
          eventType: 'SettlementBatchPaid',
          eventVersion: 1,
          correlationId: `verify-${batch.batchId}`,
          tenantId,
          subject: { batchId: batch.batchId, paymentId: batch.paymentId },
          payload: {
            batchId: batch.batchId,
            paymentId: batch.paymentId,
            netSettlementAmount: batch.netSettlementAmount,
          },
        });
      });
    }

    return batch;
  }
}
