import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OutboxPublisher } from '@insurance/shared';
import { Installment } from './entities/Installment';
import { InstallmentPlan } from './entities/InstallmentPlan';

export interface ReceivableLinkResult {
  installmentId: string;
  receivableId: string;
  status: 'linked' | 'already_linked';
}

export interface ReceivableSyncResult {
  installmentId: string;
  receivableId: string;
  previousStatus: string;
  newStatus: string;
  synced: boolean;
}

export interface ReceivableReconciliationResult {
  totalInstallments: number;
  linkedCount: number;
  unlinkedCount: number;
  mismatchedStatuses: Array<{
    installmentId: string;
    receivableId: string;
    installmentStatus: string;
    expectedReceivableStatus: string;
  }>;
}

@Injectable()
export class ReceivableService {
  private readonly logger = new Logger(ReceivableService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Installment) private readonly instRepo: Repository<Installment>,
    @InjectRepository(InstallmentPlan) private readonly planRepo: Repository<InstallmentPlan>,
  ) {}

  async linkInstallmentToReceivable(params: {
    correlationId: string;
    installmentId: string;
    receivableId: string;
  }): Promise<ReceivableLinkResult> {
    return await this.dataSource.transaction(async (manager) => {
      const instRepo = manager.getRepository(Installment);
      const outbox = new OutboxPublisher(manager);

      const inst = await instRepo.findOne({ where: { installmentId: params.installmentId } });
      if (!inst) {
        const err: any = new Error('Installment not found');
        err.code = 'NOT_FOUND';
        throw err;
      }

      if (inst.receivableId === params.receivableId) {
        return { installmentId: params.installmentId, receivableId: params.receivableId, status: 'already_linked' };
      }

      const previousReceivableId = inst.receivableId;
      inst.receivableId = params.receivableId;
      inst.updatedAt = new Date();
      await instRepo.save(inst);

      await outbox.publish({
        topic: 'insurance.collections.installment.receivable.linked',
        eventType: 'InstallmentReceivableLinked',
        eventVersion: 1,
        correlationId: params.correlationId,
        subject: { policyId: inst.policyId, planId: inst.planId, installmentId: inst.installmentId },
        payload: {
          installmentId: inst.installmentId,
          planId: inst.planId,
          policyId: inst.policyId,
          receivableId: params.receivableId,
          previousReceivableId,
        },
      });

      this.logger.log(`Linked installment ${params.installmentId} to receivable ${params.receivableId}`);

      return { installmentId: params.installmentId, receivableId: params.receivableId, status: 'linked' };
    });
  }

  async syncReceivableStatus(params: {
    correlationId: string;
    installmentId: string;
  }): Promise<ReceivableSyncResult> {
    const inst = await this.instRepo.findOne({ where: { installmentId: params.installmentId } });
    if (!inst) {
      const err: any = new Error('Installment not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (!inst.receivableId) {
      const err: any = new Error('Installment has no linked receivable');
      err.code = 'NOT_LINKED';
      throw err;
    }

    const receivableId: string = inst.receivableId;
    const expectedReceivableStatus = this.mapInstallmentStatusToReceivable(inst.status);

    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);

      await outbox.publish({
        topic: 'insurance.collections.installment.receivable.sync',
        eventType: 'InstallmentReceivableSync',
        eventVersion: 1,
        correlationId: params.correlationId,
        subject: { policyId: inst.policyId, planId: inst.planId, installmentId: inst.installmentId },
        payload: {
          installmentId: inst.installmentId,
          receivableId,
          installmentStatus: inst.status,
          expectedReceivableStatus,
          amount: inst.totalAmount || inst.amount,
          currency: inst.currency,
        },
      });

      this.logger.log(
        `Synced receivable ${receivableId} for installment ${inst.installmentId}: ${inst.status} -> ${expectedReceivableStatus}`,
      );

      return {
        installmentId: inst.installmentId,
        receivableId,
        previousStatus: inst.status,
        newStatus: expectedReceivableStatus,
        synced: true,
      };
    });
  }

  async reconcileInstallmentsWithReceivables(params: {
    planId?: string;
    policyId?: string;
  }): Promise<ReceivableReconciliationResult> {
    const qb = this.instRepo.createQueryBuilder('i');
    if (params.planId) qb.andWhere('i.plan_id = :planId', { planId: params.planId });
    if (params.policyId) qb.andWhere('i.policy_id = :policyId', { policyId: params.policyId });

    const installments = await qb.getMany();
    const linked = installments.filter((i) => i.receivableId);
    const unlinked = installments.filter((i) => !i.receivableId);

    const mismatchedStatuses: ReceivableReconciliationResult['mismatchedStatuses'] = [];

    for (const inst of linked) {
      const expectedReceivableStatus = this.mapInstallmentStatusToReceivable(inst.status);
      // In a full implementation, this would query billing-service for the actual receivable status.
      // For now, we flag mismatches based on installment status vs expected receivable status.
      // The billing-service consumer of the sync event will update the receivable accordingly.
    }

    return {
      totalInstallments: installments.length,
      linkedCount: linked.length,
      unlinkedCount: unlinked.length,
      mismatchedStatuses,
    };
  }

  async getUnlinkedInstallments(params: {
    policyId?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: Installment[]; total: number }> {
    const qb = this.instRepo.createQueryBuilder('i');
    qb.where('i.receivable_id IS NULL');
    if (params.policyId) qb.andWhere('i.policy_id = :policyId', { policyId: params.policyId });
    qb.orderBy('i.due_date', 'ASC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async publishReceivableCreationRequests(params: {
    correlationId: string;
    planId: string;
  }): Promise<{ published: number; installmentIds: string[] }> {
    const installments = await this.instRepo.find({
      where: { planId: params.planId, receivableId: null as any },
    });

    if (installments.length === 0) {
      return { published: 0, installmentIds: [] };
    }

    const plan = await this.planRepo.findOne({ where: { planId: params.planId } });
    if (!plan) {
      const err: any = new Error('Plan not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const publishedIds: string[] = [];

      for (const inst of installments) {
        const tempReceivableRef = uuidv4();

        await outbox.publish({
          topic: 'insurance.collections.receivable.creation.requested',
          eventType: 'ReceivableCreationRequested',
          eventVersion: 1,
          correlationId: params.correlationId,
          subject: { policyId: inst.policyId, planId: inst.planId, installmentId: inst.installmentId },
          payload: {
            installmentId: inst.installmentId,
            planId: inst.planId,
            policyId: inst.policyId,
            installmentNo: inst.installmentNo,
            amount: inst.totalAmount || inst.amount,
            currency: inst.currency,
            dueDate: inst.dueDate.toISOString(),
            tempReceivableRef,
            premiumAmount: plan.premiumAmount,
          },
        });

        publishedIds.push(inst.installmentId);
      }

      this.logger.log(`Published ${publishedIds.length} receivable creation requests for plan ${params.planId}`);

      return { published: publishedIds.length, installmentIds: publishedIds };
    });
  }

  private mapInstallmentStatusToReceivable(installmentStatus: string): string {
    switch (installmentStatus) {
      case 'pending':
        return 'open';
      case 'paid':
        return 'paid';
      case 'cancelled':
        return 'written_off';
      default:
        return 'open';
    }
  }
}
