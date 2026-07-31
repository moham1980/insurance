import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { DataQualityIssue } from '../entities/DataQualityIssue';
import { P6EventProducer } from '../events/p6-event-producer';

export interface PaymentLedgerReconciliationResult {
  totalClaimPayments: number;
  totalPaidInClaims: number;
  totalPaidInLedger: number;
  discrepancy: number;
  issuesCreated: number;
}

@Injectable()
export class PaymentLedgerReconciliation {
  private readonly logger = new Logger(PaymentLedgerReconciliation.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly eventProducer: P6EventProducer,
  ) {}

  async reconcile(tenantId?: string): Promise<PaymentLedgerReconciliationResult> {
    let claimQb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'totalClaimPayments')
      .addSelect('COALESCE(SUM(approved_amount), 0)', 'totalPaidInClaims')
      .from('rm_claim_payments', 'cp')
      .where('cp.claim_paid_at IS NOT NULL');
    if (tenantId) claimQb = claimQb.andWhere('cp.tenant_id = :tenantId', { tenantId });
    const claimStats = await claimQb.getRawOne();

    let ledgerQb = this.dataSource
      .createQueryBuilder()
      .select('COALESCE(SUM(amount), 0)', 'totalPaidInLedger')
      .from('rm_payments', 'pay')
      .where("pay.payment_type = 'claim'")
      .andWhere('pay.status = :settled', { settled: 'settled' });
    if (tenantId) ledgerQb = ledgerQb.andWhere('pay.tenant_id = :tenantId', { tenantId });
    const ledgerStats = await ledgerQb.getRawOne();

    const totalClaimPayments = Number(claimStats?.totalClaimPayments || 0);
    const totalPaidInClaims = Number(claimStats?.totalPaidInClaims || 0);
    const totalPaidInLedger = Number(ledgerStats?.totalPaidInLedger || 0);
    const discrepancy = Math.abs(totalPaidInClaims - totalPaidInLedger);

    let issuesCreated = 0;
    if (discrepancy > 0.01) {
      const repo = this.dataSource.getRepository(DataQualityIssue);
      const existing = await repo.findOne({
        where: {
          ruleId: 'payment_ledger_mismatch',
          status: 'open',
        } as any,
      });
      if (!existing) {
        const row = repo.create({
          issueId: uuidv4(),
          ruleId: 'payment_ledger_mismatch',
          ruleName: 'Claim payment total does not match ledger',
          entityType: 'reconciliation',
          entityId: 'payment-ledger',
          severity: 'critical',
          issueMessage: `Discrepancy of ${discrepancy} between claim payments (${totalPaidInClaims}) and ledger (${totalPaidInLedger})`,
          payload: { totalPaidInClaims, totalPaidInLedger, discrepancy },
          tenantId: tenantId || null,
        } as any);
        await repo.save(row);
        issuesCreated = 1;
      }

      try {
        await this.eventProducer.publishReconciliationDiscrepancyDetected(
          'payment-ledger',
          discrepancy,
          { totalPaidInClaims, totalPaidInLedger },
          tenantId,
        );
      } catch (err: any) {
        this.logger.error('Failed to publish ReconciliationDiscrepancyDetected event', { error: err?.message });
      }
    }

    this.logger.log(`Payment-Ledger reconciliation: claimPayments=${totalClaimPayments}, claimsPaid=${totalPaidInClaims}, ledgerPaid=${totalPaidInLedger}, discrepancy=${discrepancy}, issuesCreated=${issuesCreated}`);

    return { totalClaimPayments, totalPaidInClaims, totalPaidInLedger, discrepancy, issuesCreated };
  }
}
