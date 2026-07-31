import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { BrokerageSettlementBatch } from './settlement/settlement-batch.entity';
import { SettlementReconciliationService } from './settlement/settlement-reconciliation.service';
import { EscrowRulesService } from './escrow/escrow-rules.service';
import { PremiumInvoiceService } from './invoicing/invoice.service';
import { PremiumInvoice, PremiumInvoiceStatus } from './invoicing/premium-invoice.entity';
import { DataSource } from 'typeorm';
import { OutboxPublisher } from '@insurance/shared';

@Injectable()
export class BillingSchedulerService {
  private readonly logger = new Logger(BillingSchedulerService.name);

  constructor(
    @InjectRepository(BrokerageSettlementBatch) private readonly batchRepo: Repository<BrokerageSettlementBatch>,
    @InjectRepository(PremiumInvoice) private readonly invoiceRepo: Repository<PremiumInvoice>,
    private readonly reconciliationService: SettlementReconciliationService,
    private readonly escrowRulesService: EscrowRulesService,
    private readonly invoiceService: PremiumInvoiceService,
    private readonly dataSource: DataSource,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async dailyReconciliation() {
    this.logger.log('Starting daily reconciliation cron job');
    const correlationId = `cron-recon-${Date.now()}`;

    try {
      const batches = await this.batchRepo.find({
        where: { status: 'paid' },
      });

      let reconciledCount = 0;
      let discrepancyCount = 0;

      for (const batch of batches) {
        try {
          const result = await this.reconciliationService.reconcileBatch(
            batch.tenantId,
            batch.batchId,
          );
          if (result.status === 'RECONCILED') {
            reconciledCount++;
          } else {
            discrepancyCount++;
          }
        } catch (err: any) {
          this.logger.error(
            `Reconciliation failed for batch ${batch.batchId}: ${err?.message}`,
          );
          discrepancyCount++;
        }
      }

      this.logger.log(
        `Daily reconciliation complete: ${reconciledCount} reconciled, ${discrepancyCount} discrepancies`,
      );

      await this.dataSource.transaction(async (manager) => {
        const outbox = new OutboxPublisher(manager);
        await outbox.publish({
          topic: 'insurance.billing.daily_reconciliation.completed',
          eventType: 'DailyReconciliationCompleted',
          eventVersion: 1,
          correlationId,
          tenantId: 'system',
          subject: {},
          payload: {
            totalBatches: batches.length,
            reconciledCount,
            discrepancyCount,
            runAt: new Date().toISOString(),
          },
        });
      });
    } catch (err: any) {
      this.logger.error(`Daily reconciliation cron failed: ${err?.message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async dailyInstallmentOverdueDetection() {
    this.logger.log('Starting daily installment overdue detection cron job');
    const correlationId = `cron-overdue-${Date.now()}`;

    try {
      const tenants = await this.getDistinctTenants();
      let totalDefaulted = 0;

      for (const tenantId of tenants) {
        try {
          const result = await this.invoiceService.detectOverdueInstallments(tenantId, correlationId);
          totalDefaulted += result.defaultedCount;
        } catch (err: any) {
          this.logger.error(
            `Overdue detection failed for tenant ${tenantId}: ${err?.message}`,
          );
        }
      }

      this.logger.log(`Daily overdue detection complete: ${totalDefaulted} installments defaulted`);

      if (totalDefaulted > 0) {
        await this.dataSource.transaction(async (manager) => {
          const outbox = new OutboxPublisher(manager);
          await outbox.publish({
            topic: 'insurance.billing.installment.overdue_detected',
            eventType: 'InstallmentOverdueDetected',
            eventVersion: 1,
            correlationId,
            tenantId: 'system',
            subject: {},
            payload: {
              totalDefaulted,
              runAt: new Date().toISOString(),
            },
          });
        });
      }
    } catch (err: any) {
      this.logger.error(`Daily overdue detection cron failed: ${err?.message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async dailyEscrowAutoRelease() {
    this.logger.log('Starting daily escrow auto-release cron job');
    const correlationId = `cron-escrow-${Date.now()}`;

    try {
      const tenants = await this.getDistinctTenants();
      let totalReleased = 0;

      for (const tenantId of tenants) {
        try {
          const result = await this.escrowRulesService.autoReleaseEligibleHoldings(tenantId, correlationId);
          totalReleased += result.length;
        } catch (err: any) {
          this.logger.error(
            `Escrow auto-release failed for tenant ${tenantId}: ${err?.message}`,
          );
        }
      }

      this.logger.log(`Daily escrow auto-release complete: ${totalReleased} holdings released`);
    } catch (err: any) {
      this.logger.error(`Daily escrow auto-release cron failed: ${err?.message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async dailyMarkOverdueInvoices() {
    this.logger.log('Starting daily mark overdue invoices cron job');
    const correlationId = `cron-inv-overdue-${Date.now()}`;

    try {
      const now = new Date();
      const overdueInvoices = await this.invoiceRepo.find({
        where: { status: 'issued' as PremiumInvoiceStatus },
      });

      let markedCount = 0;
      for (const invoice of overdueInvoices) {
        if (invoice.dueDate && new Date(invoice.dueDate) < now) {
          invoice.status = 'overdue' as PremiumInvoiceStatus;
          await this.invoiceRepo.save(invoice);
          markedCount++;

          await this.dataSource.transaction(async (manager) => {
            const outbox = new OutboxPublisher(manager);
            await outbox.publish({
              topic: 'insurance.billing.premium_invoice.overdue',
              eventType: 'PremiumInvoiceOverdue',
              eventVersion: 1,
              correlationId,
              tenantId: invoice.tenantId,
              organizationId: invoice.organizationId,
              subject: { invoiceId: invoice.invoiceId, policyId: invoice.policyId },
              payload: {
                invoiceId: invoice.invoiceId,
                policyId: invoice.policyId,
                totalAmountMinor: invoice.totalAmountMinor,
                paidAmountMinor: invoice.paidAmountMinor || '0',
                currency: invoice.currency,
              },
            });
          });
        }
      }

      this.logger.log(`Daily mark overdue invoices complete: ${markedCount} invoices marked overdue`);
    } catch (err: any) {
      this.logger.error(`Daily mark overdue cron failed: ${err?.message}`);
    }
  }

  private async getDistinctTenants(): Promise<string[]> {
    const result = await this.dataSource
      .createQueryBuilder()
      .select('DISTINCT tenant_id', 'tenantId')
      .from(PremiumInvoice, 'invoice')
      .getRawMany();
    return result.map((r: any) => r.tenantId).filter(Boolean);
  }
}
