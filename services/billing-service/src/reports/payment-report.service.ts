import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PaymentTransaction } from '../entities/PaymentTransaction';
import { PremiumInvoice } from '../invoicing/premium-invoice.entity';
import { EscrowHolding } from '../escrow/escrow-holding.entity';
import { BrokerageSettlementBatch } from '../settlement/settlement-batch.entity';
import { CommissionSplit } from '../commission/commission-split.entity';

export interface CollectionReportQuery {
  tenantId: string;
  organizationId?: string;
  from?: Date;
  to?: Date;
}

export interface OutstandingInvoiceQuery {
  tenantId: string;
  organizationId?: string;
}

@Injectable()
export class PaymentReportService {
  private readonly logger = new Logger(PaymentReportService.name);

  constructor(
    @InjectRepository(PaymentTransaction) private readonly paymentRepo: Repository<PaymentTransaction>,
    @InjectRepository(PremiumInvoice) private readonly invoiceRepo: Repository<PremiumInvoice>,
    @InjectRepository(EscrowHolding) private readonly escrowRepo: Repository<EscrowHolding>,
    @InjectRepository(BrokerageSettlementBatch) private readonly batchRepo: Repository<BrokerageSettlementBatch>,
    @InjectRepository(CommissionSplit) private readonly splitRepo: Repository<CommissionSplit>,
  ) {}

  async collectionsReport(query: CollectionReportQuery): Promise<{
    totalCollectedMinor: string;
    totalFailedMinor: string;
    totalPendingMinor: string;
    currency: string;
    count: number;
    byStatus: Record<string, { count: number; amountMinor: string }>;
  }> {
    const where: any = { tenantId: query.tenantId };
    if (query.organizationId) where.organizationId = query.organizationId;
    if (query.from && query.to) {
      where.createdAt = Between(query.from, query.to);
    }

    const payments = await this.paymentRepo.find({ where });
    const byStatus: Record<string, { count: number; amountMinor: string }> = {};
    let totalCollected = BigInt(0);
    let totalFailed = BigInt(0);
    let totalPending = BigInt(0);

    for (const p of payments) {
      const amount = BigInt(Math.round(Number(p.amount)));
      byStatus[p.status] = byStatus[p.status] || { count: 0, amountMinor: '0' };
      byStatus[p.status].count += 1;
      byStatus[p.status].amountMinor = (BigInt(byStatus[p.status].amountMinor) + amount).toString();

      if (p.status === 'SUCCESS') totalCollected += amount;
      else if (p.status === 'FAILED') totalFailed += amount;
      else totalPending += amount;
    }

    return {
      totalCollectedMinor: totalCollected.toString(),
      totalFailedMinor: totalFailed.toString(),
      totalPendingMinor: totalPending.toString(),
      currency: payments[0]?.metadata?.currency as string || 'IRR',
      count: payments.length,
      byStatus,
    };
  }

  async outstandingInvoices(query: OutstandingInvoiceQuery): Promise<{
    totalOutstandingMinor: string;
    totalOverdueMinor: string;
    currency: string;
    count: number;
    invoices: PremiumInvoice[];
  }> {
    const where: any = { tenantId: query.tenantId, status: 'issued' };
    if (query.organizationId) where.organizationId = query.organizationId;

    const invoices = await this.invoiceRepo.find({ where });
    const overdueWhere: any = { tenantId: query.tenantId, status: 'overdue' };
    if (query.organizationId) overdueWhere.organizationId = query.organizationId;
    const overdueInvoices = await this.invoiceRepo.find({ where: overdueWhere });

    let totalOutstanding = BigInt(0);
    for (const i of invoices) {
      const remaining = BigInt(i.totalAmountMinor) - BigInt(i.paidAmountMinor || '0');
      totalOutstanding += remaining;
    }

    let totalOverdue = BigInt(0);
    for (const i of overdueInvoices) {
      const remaining = BigInt(i.totalAmountMinor) - BigInt(i.paidAmountMinor || '0');
      totalOverdue += remaining;
    }

    return {
      totalOutstandingMinor: totalOutstanding.toString(),
      totalOverdueMinor: totalOverdue.toString(),
      currency: invoices[0]?.currency || 'IRR',
      count: invoices.length + overdueInvoices.length,
      invoices: [...invoices, ...overdueInvoices],
    };
  }

  async settlementsReport(query: CollectionReportQuery): Promise<{
    totalNetSettlementMinor: string;
    totalPaidBatches: number;
    totalDisputedBatches: number;
    currency: string;
    batches: BrokerageSettlementBatch[];
  }> {
    const where: any = { tenantId: query.tenantId };
    if (query.from && query.to) {
      where.periodStart = Between(query.from, query.to);
    }

    const batches = await this.batchRepo.find({ where });
    let totalNet = BigInt(0);
    let paid = 0;
    let disputed = 0;

    for (const b of batches) {
      totalNet += BigInt(Math.round(Number(b.netSettlementAmount)));
      if (b.status === 'paid') paid++;
      if (b.status === 'disputed') disputed++;
    }

    return {
      totalNetSettlementMinor: totalNet.toString(),
      totalPaidBatches: paid,
      totalDisputedBatches: disputed,
      currency: batches[0]?.netSettlementCurrency || 'IRR',
      batches,
    };
  }

  async escrowBalance(query: { tenantId: string; escrowAccountRef?: string }): Promise<{
    escrowAccountRef: string;
    heldTotalMinor: string;
    releasedTotalMinor: string;
    remainingTotalMinor: string;
  }> {
    const ref = query.escrowAccountRef || 'insurance-premium-clearing';
    const held = await this.escrowRepo
      .createQueryBuilder('h')
      .where('h.tenant_id = :tenantId', { tenantId: query.tenantId })
      .andWhere('h.escrow_account_ref = :ref', { ref })
      .andWhere("h.status = 'held'")
      .select('COALESCE(SUM(h.amount_minor), 0)', 'total')
      .getRawOne();

    const released = await this.escrowRepo
      .createQueryBuilder('h')
      .where('h.tenant_id = :tenantId', { tenantId: query.tenantId })
      .andWhere('h.escrow_account_ref = :ref', { ref })
      .andWhere("h.status = 'released'")
      .select('COALESCE(SUM(h.amount_minor), 0)', 'total')
      .getRawOne();

    const heldTotal = BigInt(held?.total || '0');
    const releasedTotal = BigInt(released?.total || '0');

    return {
      escrowAccountRef: ref,
      heldTotalMinor: heldTotal.toString(),
      releasedTotalMinor: releasedTotal.toString(),
      remainingTotalMinor: (heldTotal - releasedTotal).toString(),
    };
  }

  async commissionAgingReport(query: { tenantId: string; organizationId?: string }): Promise<{
    totalAccruedMinor: string;
    totalPaidMinor: string;
    totalClawbackMinor: string;
    byAgeBucket: Record<string, { count: number; amountMinor: string }>;
    splits: CommissionSplit[];
  }> {
    const qb = this.splitRepo.createQueryBuilder('s')
      .where('s.tenant_id = :tenantId', { tenantId: query.tenantId });

    if (query.organizationId) {
      qb.andWhere('s.organization_id = :orgId', { orgId: query.organizationId });
    }

    const splits = await qb.orderBy('s.created_at', 'ASC').getMany();

    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;
    const buckets: Record<string, { count: number; amountMinor: string }> = {
      '0-30': { count: 0, amountMinor: '0' },
      '31-60': { count: 0, amountMinor: '0' },
      '61-90': { count: 0, amountMinor: '0' },
      '90+': { count: 0, amountMinor: '0' },
    };

    let totalAccrued = BigInt(0);
    let totalPaid = BigInt(0);
    let totalClawback = BigInt(0);

    for (const s of splits) {
      const amount = BigInt(String(s.amount));

      if (s.status === 'accrued') {
        totalAccrued += amount;
        const daysSinceAccrual = Math.floor((now - s.createdAt.getTime()) / msPerDay);
        let bucket: string;
        if (daysSinceAccrual <= 30) bucket = '0-30';
        else if (daysSinceAccrual <= 60) bucket = '31-60';
        else if (daysSinceAccrual <= 90) bucket = '61-90';
        else bucket = '90+';
        buckets[bucket].count += 1;
        buckets[bucket].amountMinor = (BigInt(buckets[bucket].amountMinor) + amount).toString();
      } else if (s.status === 'paid') {
        totalPaid += amount;
      } else if (s.status === 'clawback') {
        totalClawback += amount;
      }
    }

    return {
      totalAccruedMinor: totalAccrued.toString(),
      totalPaidMinor: totalPaid.toString(),
      totalClawbackMinor: totalClawback.toString(),
      byAgeBucket: buckets,
      splits,
    };
  }
}
