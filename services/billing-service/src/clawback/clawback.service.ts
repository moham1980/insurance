import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CommissionSplit } from '../commission/commission-split.entity';
import { BrokerageReceivable } from '../receivables/receivable.entity';
import { LedgerPostingService } from '../ledger/ledger-posting.service';
import { OutboxPublisher } from '@insurance/shared';
import { PolicyVerificationService } from '../policy-verification.service';

export interface ClawbackInput {
  tenantId: string;
  organizationId: string;
  policyId: string;
  cancellationSourceId: string;
  totalClawbackAmountMinor: string;
  currency: string;
  reason: string;
  approvedByPartyId: string;
  correlationId?: string;
}

export interface ClawbackResult {
  clawbackId: string;
  splitIds: string[];
  totalClawedBackMinor: string;
  journalEntryId?: string;
}

@Injectable()
export class ClawbackService {
  private readonly logger = new Logger(ClawbackService.name);

  constructor(
    @InjectRepository(CommissionSplit) private readonly splitRepo: Repository<CommissionSplit>,
    @InjectRepository(BrokerageReceivable) private readonly receivableRepo: Repository<BrokerageReceivable>,
    private readonly ledgerPosting: LedgerPostingService,
    private readonly dataSource: DataSource,
    private readonly policyVerification: PolicyVerificationService,
  ) {}

  async calculateClawback(tenantId: string, policyId: string): Promise<{
    totalClawbackMinor: string;
    splits: CommissionSplit[];
  }> {
    const splits = await this.splitRepo.find({
      where: { tenantId, sourceType: 'POLICY', sourceId: policyId, status: 'accrued' },
    });

    let total = BigInt(0);
    for (const split of splits) {
      total += BigInt(String(split.amount));
    }

    return { totalClawbackMinor: total.toString(), splits };
  }

  async applyClawback(input: ClawbackInput): Promise<ClawbackResult> {
    await this.policyVerification.verifyPolicyCancelled(
      input.tenantId,
      input.policyId,
      input.cancellationSourceId,
      input.correlationId,
    );

    const clawbackMaxDays = parseInt(process.env.CLAWBACK_MAX_DAYS || '90', 10);
    const splits = await this.splitRepo.find({
      where: { tenantId: input.tenantId, sourceType: 'POLICY', sourceId: input.policyId, status: 'accrued' },
    });
    if (splits.length > 0) {
      const oldestSplit = splits.reduce((oldest, s) => (s.createdAt < oldest.createdAt ? s : oldest));
      const daysSinceAccrual = Math.floor((Date.now() - oldestSplit.createdAt.getTime()) / (24 * 60 * 60 * 1000));
      if (daysSinceAccrual > clawbackMaxDays) {
        throw new BadRequestException(`Clawback time limit exceeded: ${daysSinceAccrual} days since accrual (max ${clawbackMaxDays} days)`);
      }
    }

    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const splitRepo = manager.getRepository(CommissionSplit);
      const receivableRepo = manager.getRepository(BrokerageReceivable);

      const splits = await splitRepo.find({
        where: { tenantId: input.tenantId, sourceType: 'POLICY', sourceId: input.policyId, status: 'accrued' },
      });

      if (splits.length === 0) throw new BadRequestException('No commission splits available for clawback');

      const requested = BigInt(input.totalClawbackAmountMinor);
      let remaining = requested;
      const splitIds: string[] = [];
      const clawbackLines: Array<{ accountCode: string; accountName: string; accountType: any; debit: string; credit: string; currency: string; description: string }> = [];

      for (const split of splits) {
        if (remaining <= BigInt(0)) break;
        const splitAmount = BigInt(String(split.amount));
        const clawAmount = splitAmount < remaining ? splitAmount : remaining;
        remaining -= clawAmount;

        split.status = 'clawback';
        await splitRepo.save(split);
        splitIds.push(split.splitId);

        // Reverse or create deduction receivable
        const existingReceivable = await receivableRepo.findOne({
          where: { tenantId: input.tenantId, sourceType: 'COMMISSION', sourceId: split.splitId },
        });
        if (existingReceivable) {
          existingReceivable.status = 'clawback';
          await receivableRepo.save(existingReceivable);
        } else {
          const deduction = receivableRepo.create({
            receivableId: uuidv4(),
            tenantId: input.tenantId,
            creditorOrganizationId: split.organizationId,
            debtorOrganizationId: input.organizationId,
            relatedPolicyId: input.policyId,
            type: 'COMMISSION',
            amount: clawAmount.toString(),
            currency: input.currency,
            dueDate: new Date(),
            status: 'clawback',
            sourceType: 'CLAWBACK',
            sourceId: split.splitId,
          });
          await receivableRepo.save(deduction);
        }

        clawbackLines.push({
          accountCode: 'COMMISSION_EXPENSE',
          accountName: 'Commission Expense',
          accountType: 'EXPENSE',
          debit: clawAmount.toString(),
          credit: '0',
          currency: input.currency,
          description: `Clawback commission for policy ${input.policyId}`,
        });
        clawbackLines.push({
          accountCode: 'COMMISSION_PAYABLE',
          accountName: 'Commission Payable',
          accountType: 'LIABILITY',
          debit: '0',
          credit: clawAmount.toString(),
          currency: input.currency,
          description: `Reduce commission payable for clawback`,
        });
      }

      const clawbackId = uuidv4();
      const journal = await this.ledgerPosting.post({
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        sourceType: 'CLAWBACK',
        sourceId: clawbackId,
        periodId: 'default',
        idempotencyKey: `clawback-${clawbackId}`,
        postingDate: new Date(),
        description: `Commission clawback for policy ${input.policyId} due to cancellation ${input.cancellationSourceId}`,
        correlationId: input.correlationId || uuidv4(),
        lines: clawbackLines,
      });

      await outbox.publish({
        topic: 'insurance.billing.clawback.applied',
        eventType: 'ClawbackPaymentInitiated',
        eventVersion: 1,
        correlationId: input.correlationId || uuidv4(),
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        subject: { clawbackId, policyId: input.policyId },
        payload: {
          clawbackId,
          policyId: input.policyId,
          totalClawedBackMinor: (requested - remaining).toString(),
          splitIds,
          journalEntryId: journal.journalEntryId,
        },
      });

      return {
        clawbackId,
        splitIds,
        totalClawedBackMinor: (requested - remaining).toString(),
        journalEntryId: journal.journalEntryId,
      };
    });
  }
}
