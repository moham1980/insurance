import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { DataQualityIssue } from '../entities/DataQualityIssue';
import { P6EventProducer } from '../events/p6-event-producer';

export interface ReconciliationResult {
  totalPolicies: number;
  totalPremiumInPolicy: number;
  totalPremiumInLedger: number;
  discrepancy: number;
  issuesCreated: number;
}

@Injectable()
export class PolicyLedgerReconciliation {
  private readonly logger = new Logger(PolicyLedgerReconciliation.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly eventProducer: P6EventProducer,
  ) {}

  async reconcile(tenantId?: string): Promise<ReconciliationResult> {
    let policyQb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'totalPolicies')
      .addSelect('COALESCE(SUM(premium_amount), 0)', 'totalPremiumInPolicy')
      .from('rm_policies', 'p')
      .where('p.issued_at IS NOT NULL');
    if (tenantId) policyQb = policyQb.andWhere('p.tenant_id = :tenantId', { tenantId });
    const policyStats = await policyQb.getRawOne();

    let ledgerQb = this.dataSource
      .createQueryBuilder()
      .select('COALESCE(SUM(amount), 0)', 'totalPremiumInLedger')
      .from('rm_payments', 'pay')
      .where("pay.payment_type = 'premium'")
      .andWhere('pay.status = :settled', { settled: 'settled' });
    if (tenantId) ledgerQb = ledgerQb.andWhere('pay.tenant_id = :tenantId', { tenantId });
    const ledgerStats = await ledgerQb.getRawOne();

    const totalPolicies = Number(policyStats?.totalPolicies || 0);
    const totalPremiumInPolicy = Number(policyStats?.totalPremiumInPolicy || 0);
    const totalPremiumInLedger = Number(ledgerStats?.totalPremiumInLedger || 0);
    const discrepancy = Math.abs(totalPremiumInPolicy - totalPremiumInLedger);

    let issuesCreated = 0;
    if (discrepancy > 0.01) {
      const repo = this.dataSource.getRepository(DataQualityIssue);
      const existing = await repo.findOne({
        where: {
          ruleId: 'policy_ledger_mismatch',
          status: 'open',
        } as any,
      });
      if (!existing) {
        const row = repo.create({
          issueId: uuidv4(),
          ruleId: 'policy_ledger_mismatch',
          ruleName: 'Policy premium total does not match ledger',
          entityType: 'reconciliation',
          entityId: 'policy-ledger',
          severity: 'critical',
          issueMessage: `Discrepancy of ${discrepancy} between policy premiums (${totalPremiumInPolicy}) and ledger (${totalPremiumInLedger})`,
          payload: { totalPremiumInPolicy, totalPremiumInLedger, discrepancy },
          tenantId: tenantId || null,
        } as any);
        await repo.save(row);
        issuesCreated = 1;
      }

      try {
        await this.eventProducer.publishReconciliationDiscrepancyDetected(
          'policy-ledger',
          discrepancy,
          { totalPremiumInPolicy, totalPremiumInLedger },
          tenantId,
        );
      } catch (err: any) {
        this.logger.error('Failed to publish ReconciliationDiscrepancyDetected event', { error: err?.message });
      }
    }

    this.logger.log(`Policy-Ledger reconciliation: policies=${totalPolicies}, policyPremium=${totalPremiumInPolicy}, ledgerPremium=${totalPremiumInLedger}, discrepancy=${discrepancy}, issuesCreated=${issuesCreated}`);

    return { totalPolicies, totalPremiumInPolicy, totalPremiumInLedger, discrepancy, issuesCreated };
  }
}
