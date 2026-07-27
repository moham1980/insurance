import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OutboxPublisher } from '@insurance/shared';
import { InstallmentPlan } from './entities/InstallmentPlan';
import { Installment } from './entities/Installment';
import { IGatewayProvider } from './payment-gateway/gateway-provider.interface';
import { ZarinpalProvider } from './payment-gateway/zarinpal.provider';
import { IdPayProvider } from './payment-gateway/idpay.provider';

@Injectable()
export class CollectionsService {
  private readonly logger = new Logger(CollectionsService.name);
  private gatewayProvider: IGatewayProvider;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(InstallmentPlan) private readonly planRepo: Repository<InstallmentPlan>,
    @InjectRepository(Installment) private readonly instRepo: Repository<Installment>
  ) {
    const gateway = process.env.COLLECTIONS_GATEWAY_PROVIDER || 'zarinpal';
    const sandbox = process.env.COLLECTIONS_GATEWAY_SANDBOX === 'true';

    if (gateway === 'zarinpal') {
      this.gatewayProvider = new ZarinpalProvider(
        process.env.ZARINPAL_MERCHANT_ID || '',
        sandbox
      );
    } else if (gateway === 'idpay') {
      this.gatewayProvider = new IdPayProvider(
        process.env.IDPAY_API_KEY || '',
        sandbox
      );
    } else {
      throw new Error(`Unsupported gateway provider: ${gateway}`);
    }
  }

  async createPlan(params: {
    correlationId: string;
    idempotencyKey: string;
    policyId: string;
    premiumAmount: number;
    currency?: string;
    installments: Array<{ dueDate: string; amount: number; currency?: string }>;
    meta?: Record<string, any>;
    lateFeeRatePerDay?: number;
    lateFeeMaxDays?: number;
    lateFeeMaxAmount?: number;
  }): Promise<{ plan: InstallmentPlan; installments: Installment[] }> {
    return await this.dataSource.transaction(async (manager) => {
      const planRepo = manager.getRepository(InstallmentPlan);
      const instRepo = manager.getRepository(Installment);
      const outbox = new OutboxPublisher(manager);

      const existing = await planRepo.findOne({ where: { idempotencyKey: params.idempotencyKey } });
      if (existing) {
        const existingInstallments = await instRepo.find({ where: { planId: existing.planId }, order: { installmentNo: 'ASC' } as any });
        return { plan: existing, installments: existingInstallments };
      }

      const plan = planRepo.create({
        planId: uuidv4(),
        policyId: params.policyId,
        premiumAmount: params.premiumAmount,
        currency: params.currency || 'IRR',
        status: 'active',
        idempotencyKey: params.idempotencyKey,
        meta: params.meta || null,
        lateFeeRatePerDay: params.lateFeeRatePerDay ?? null,
        lateFeeMaxDays: params.lateFeeMaxDays ?? null,
        lateFeeMaxAmount: params.lateFeeMaxAmount ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await planRepo.save(plan);

      const installments: Installment[] = [];
      for (let i = 0; i < params.installments.length; i++) {
        const x = params.installments[i];
        const inst = instRepo.create({
          installmentId: uuidv4(),
          planId: plan.planId,
          policyId: plan.policyId,
          installmentNo: i + 1,
          dueDate: new Date(x.dueDate),
          amount: x.amount,
          currency: x.currency || plan.currency,
          status: 'pending',
          paidAt: null,
          provider: null,
          providerRef: null,
          paymentDetails: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        installments.push(inst);
      }

      await instRepo.save(installments);

      await outbox.publish({
        topic: 'insurance.collections.plan.created',
        eventType: 'InstallmentPlanCreated',
        eventVersion: 1,
        correlationId: params.correlationId,
        subject: { policyId: plan.policyId, planId: plan.planId },
        payload: {
          planId: plan.planId,
          policyId: plan.policyId,
          premiumAmount: plan.premiumAmount,
          currency: plan.currency,
          status: plan.status,
          installments: installments.map((z) => ({
            installmentId: z.installmentId,
            installmentNo: z.installmentNo,
            dueDate: z.dueDate.toISOString(),
            amount: z.amount,
            currency: z.currency,
            status: z.status,
          })),
          createdAt: plan.createdAt?.toISOString?.() ?? new Date().toISOString(),
        },
      });

      return { plan, installments };
    });
  }

  async getPlan(planId: string): Promise<InstallmentPlan | null> {
    return await this.planRepo.findOne({ where: { planId } });
  }

  async listPlans(params: { policyId?: string; status?: string; limit: number; offset: number }): Promise<{ rows: InstallmentPlan[]; total: number }> {
    const qb = this.planRepo.createQueryBuilder('p');
    if (params.policyId) qb.andWhere('p.policy_id = :policyId', { policyId: params.policyId });
    if (params.status) qb.andWhere('p.status = :status', { status: params.status });
    qb.orderBy('p.updated_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async getInstallment(installmentId: string): Promise<Installment | null> {
    return await this.instRepo.findOne({ where: { installmentId } });
  }

  async listInstallments(params: {
    planId?: string;
    policyId?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: Installment[]; total: number }> {
    const qb = this.instRepo.createQueryBuilder('i');
    if (params.planId) qb.andWhere('i.plan_id = :planId', { planId: params.planId });
    if (params.policyId) qb.andWhere('i.policy_id = :policyId', { policyId: params.policyId });
    if (params.status) qb.andWhere('i.status = :status', { status: params.status });
    qb.orderBy('i.due_date', 'ASC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async payInstallment(params: {
    correlationId: string;
    installmentId: string;
    provider?: string;
    providerRef?: string;
    paidAt?: string;
    details?: Record<string, any>;
  }): Promise<Installment | null> {
    return await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Installment);
      const outbox = new OutboxPublisher(manager);

      const inst = await repo.findOne({ where: { installmentId: params.installmentId } });
      if (!inst) return null;

      if (inst.status === 'paid') {
        return inst;
      }

      if (inst.status !== 'pending') {
        const err: any = new Error(`Invalid state transition: ${inst.status} -> paid`);
        err.code = 'INVALID_STATE';
        throw err;
      }

      if (params.providerRef) {
        const existingByRef = await repo.findOne({ where: { providerRef: params.providerRef } });
        if (existingByRef) {
          return existingByRef;
        }
      }

      inst.status = 'paid';
      inst.provider = params.provider || null;
      inst.providerRef = params.providerRef || null;
      inst.paidAt = params.paidAt ? new Date(params.paidAt) : new Date();
      inst.paymentDetails = params.details || null;
      inst.updatedAt = new Date();
      await repo.save(inst);

      await outbox.publish({
        topic: 'insurance.collections.installment.paid',
        eventType: 'InstallmentPaid',
        eventVersion: 1,
        correlationId: params.correlationId,
        subject: { policyId: inst.policyId, planId: inst.planId, installmentId: inst.installmentId },
        payload: {
          installmentId: inst.installmentId,
          planId: inst.planId,
          policyId: inst.policyId,
          installmentNo: inst.installmentNo,
          amount: inst.amount,
          currency: inst.currency,
          status: inst.status,
          paidAt: inst.paidAt?.toISOString?.() ?? new Date().toISOString(),
          provider: inst.provider,
          providerRef: inst.providerRef,
        },
      });

      return inst;
    });
  }

  // Reminder methods
  async getInstallmentsForReminder(params: {
    daysBeforeDue: number;
    limit: number;
    offset: number;
  }): Promise<{ rows: Installment[]; total: number }> {
    const now = new Date();
    const reminderDate = new Date(now);
    reminderDate.setDate(reminderDate.getDate() + params.daysBeforeDue);

    const qb = this.instRepo.createQueryBuilder('i');
    qb.where('i.status = :status', { status: 'pending' })
      .andWhere('i.due_date <= :reminderDate', { reminderDate })
      .andWhere('(i.reminder_sent_at IS NULL OR i.reminder_sent_at < :lastWeek)', { lastWeek: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) })
      .andWhere('i.reminder_count < :maxReminders', { maxReminders: 3 })
      .orderBy('i.due_date', 'ASC')
      .limit(params.limit)
      .offset(params.offset);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async sendReminder(params: {
    correlationId: string;
    installmentId: string;
    actorUserId: string;
  }): Promise<Installment> {
    return await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Installment);
      const outbox = new OutboxPublisher(manager);

      const inst = await repo.findOne({ where: { installmentId: params.installmentId } });
      if (!inst) {
        const err: any = new Error('Installment not found');
        err.code = 'NOT_FOUND';
        throw err;
      }

      if (inst.status !== 'pending') {
        const err: any = new Error('Installment must be pending to send reminder');
        err.code = 'INVALID_STATE';
        throw err;
      }

      inst.reminderSentAt = new Date();
      inst.reminderCount = (inst.reminderCount || 0) + 1;
      inst.updatedAt = new Date();
      await repo.save(inst);

      await outbox.publish({
        topic: 'insurance.collections.installment.reminder',
        eventType: 'InstallmentReminderSent',
        eventVersion: 1,
        correlationId: params.correlationId,
        subject: { policyId: inst.policyId, planId: inst.planId, installmentId: inst.installmentId },
        payload: {
          installmentId: inst.installmentId,
          planId: inst.planId,
          policyId: inst.policyId,
          installmentNo: inst.installmentNo,
          dueDate: inst.dueDate.toISOString(),
          amount: inst.amount,
          currency: inst.currency,
          reminderCount: inst.reminderCount,
          remindedBy: params.actorUserId,
        },
      });

      return inst;
    });
  }

  async getOverdueInstallments(params: {
    gracePeriodDays: number;
    limit: number;
    offset: number;
  }): Promise<{ rows: Installment[]; total: number }> {
    const now = new Date();
    const graceEnd = new Date(now);
    graceEnd.setDate(graceEnd.getDate() - params.gracePeriodDays);

    const qb = this.instRepo.createQueryBuilder('i');
    qb.where('i.status = :status', { status: 'pending' })
      .andWhere('i.due_date < :now', { now })
      .andWhere('(i.overdue_notified_at IS NULL OR i.overdue_notified_at < :lastWeek)', { lastWeek: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) })
      .orderBy('i.due_date', 'ASC')
      .limit(params.limit)
      .offset(params.offset);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async calculateLateFees(params: {
    installmentId: string;
    asOfDate?: Date;
  }): Promise<{ lateFeeAmount: number; lateFeeDays: number; totalAmount: number; baseAmount: number }> {
    const inst = await this.instRepo.findOne({ where: { installmentId: params.installmentId } });
    if (!inst) { const err: any = new Error('Not found'); err.code = 'NOT_FOUND'; throw err; }
    const plan = await this.planRepo.findOne({ where: { planId: inst.planId } });
    if (!plan || !plan.lateFeeRatePerDay || inst.status === 'paid') {
      return { lateFeeAmount: 0, lateFeeDays: 0, totalAmount: inst.amount, baseAmount: inst.amount };
    }
    const asOf = params.asOfDate || new Date();
    const lateFeeStart = inst.gracePeriodEnd ? new Date(inst.gracePeriodEnd) : new Date(inst.dueDate);
    if (asOf <= lateFeeStart) {
      return { lateFeeAmount: 0, lateFeeDays: 0, totalAmount: inst.amount, baseAmount: inst.amount };
    }
    const msPerDay = 24 * 60 * 60 * 1000;
    const lateFeeDays = Math.floor((asOf.getTime() - lateFeeStart.getTime()) / msPerDay);
    const effectiveDays = plan.lateFeeMaxDays ? Math.min(lateFeeDays, plan.lateFeeMaxDays) : lateFeeDays;
    let lateFeeAmount = (inst.amount * plan.lateFeeRatePerDay * effectiveDays) / 100;
    if (plan.lateFeeMaxAmount && lateFeeAmount > plan.lateFeeMaxAmount) { lateFeeAmount = plan.lateFeeMaxAmount; }
    return { lateFeeAmount, lateFeeDays: effectiveDays, totalAmount: inst.amount + lateFeeAmount, baseAmount: inst.amount };
  }

  async applyLateFee(params: {
    correlationId: string;
    installmentId: string;
    actorUserId: string;
  }): Promise<Installment> {
    const fees = await this.calculateLateFees({ installmentId: params.installmentId });
    const inst = await this.instRepo.findOne({ where: { installmentId: params.installmentId } });
    if (!inst) { const err: any = new Error('Not found'); err.code = 'NOT_FOUND'; throw err; }
    if (inst.status === 'paid') { const err: any = new Error('Already paid'); err.code = 'INVALID_STATE'; throw err; }
    inst.lateFeeAmount = fees.lateFeeAmount;
    inst.lateFeeDays = fees.lateFeeDays;
    inst.totalAmount = fees.totalAmount;
    inst.updatedAt = new Date();
    await this.instRepo.save(inst);
    return inst;
  }

  async markOverdue(params: {
    correlationId: string;
    installmentId: string;
    gracePeriodDays: number;
    actorUserId: string;
  }): Promise<Installment> {
    return await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Installment);
      const outbox = new OutboxPublisher(manager);

      const inst = await repo.findOne({ where: { installmentId: params.installmentId } });
      if (!inst) {
        const err: any = new Error('Installment not found');
        err.code = 'NOT_FOUND';
        throw err;
      }

      const now = new Date();
      const graceEnd = new Date(inst.dueDate);
      graceEnd.setDate(graceEnd.getDate() + params.gracePeriodDays);

      inst.overdueNotifiedAt = new Date();
      inst.gracePeriodEnd = graceEnd;
      inst.updatedAt = new Date();
      await repo.save(inst);

      await outbox.publish({
        topic: 'insurance.collections.installment.overdue',
        eventType: 'InstallmentMarkedOverdue',
        eventVersion: 1,
        correlationId: params.correlationId,
        subject: { policyId: inst.policyId, planId: inst.planId, installmentId: inst.installmentId },
        payload: {
          installmentId: inst.installmentId,
          planId: inst.planId,
          policyId: inst.policyId,
          installmentNo: inst.installmentNo,
          dueDate: inst.dueDate.toISOString(),
          amount: inst.amount,
          currency: inst.currency,
          gracePeriodEnd: graceEnd.toISOString(),
          markedBy: params.actorUserId,
        },
      });

      return inst;
    });
  }

  // Gateway payment methods
  async initiateGatewayPayment(params: {
    correlationId: string;
    installmentId: string;
    returnUrl: string;
    cancelUrl: string;
  }): Promise<{ paymentUrl: string; transactionId: string } | null> {
    const inst = await this.instRepo.findOne({ where: { installmentId: params.installmentId } });
    if (!inst) {
      throw new Error('Installment not found');
    }

    if (inst.status !== 'pending') {
      throw new Error(`Installment must be pending to initiate payment. Current status: ${inst.status}`);
    }

    const result = await this.gatewayProvider.initiatePayment({
      amount: inst.amount,
      currency: inst.currency,
      reference: inst.installmentId,
      description: `Installment ${inst.installmentNo} for policy ${inst.policyId}`,
      returnUrl: params.returnUrl,
      cancelUrl: params.cancelUrl,
      metadata: {
        planId: inst.planId,
        policyId: inst.policyId,
        installmentNo: inst.installmentNo,
      },
    });

    if (!result.success || !result.paymentUrl || !result.transactionId) {
      throw new Error(result.error || 'Failed to initiate gateway payment');
    }

    // Update installment with gateway transaction info
    inst.paymentDetails = {
      gatewayTransactionId: result.transactionId,
      gatewayProvider: process.env.COLLECTIONS_GATEWAY_PROVIDER || 'zarinpal',
      initiatedAt: new Date().toISOString(),
    };
    inst.updatedAt = new Date();
    await this.instRepo.save(inst);

    this.logger.log(`Gateway payment initiated for installment ${params.installmentId}, transaction: ${result.transactionId}`);

    return { paymentUrl: result.paymentUrl, transactionId: result.transactionId };
  }

  async verifyGatewayPayment(params: {
    correlationId: string;
    installmentId: string;
    transactionId: string;
  }): Promise<{ success: boolean; providerRef?: string; error?: string }> {
    const inst = await this.instRepo.findOne({ where: { installmentId: params.installmentId } });
    if (!inst) {
      return { success: false, error: 'Installment not found' };
    }

    if (inst.status === 'paid') {
      return { success: true, providerRef: inst.providerRef || undefined };
    }

    const result = await this.gatewayProvider.verifyPayment({
      transactionId: params.transactionId,
      reference: params.installmentId,
    });

    if (!result.success) {
      return { success: false, error: result.error || 'Payment verification failed' };
    }

    if (result.verified && result.providerRef) {
      // Mark installment as paid
      await this.payInstallment({
        correlationId: params.correlationId,
        installmentId: params.installmentId,
        provider: process.env.COLLECTIONS_GATEWAY_PROVIDER || 'zarinpal',
        providerRef: result.providerRef,
        paidAt: new Date().toISOString(),
        details: {
          gatewayTransactionId: params.transactionId,
          verifiedAt: new Date().toISOString(),
        },
      });

      this.logger.log(`Gateway payment verified for installment ${params.installmentId}, providerRef: ${result.providerRef}`);
      return { success: true, providerRef: result.providerRef };
    }

    return { success: false, error: 'Payment not verified by gateway' };
  }

  async handleGatewayCallback(params: {
    correlationId: string;
    transactionId: string;
    installmentId: string;
    status: 'success' | 'failed' | 'cancelled';
    gatewayData?: Record<string, any>;
  }): Promise<{ success: boolean; providerRef?: string; error?: string }> {
    if (params.status === 'success') {
      return this.verifyGatewayPayment({
        correlationId: params.correlationId,
        installmentId: params.installmentId,
        transactionId: params.transactionId,
      });
    } else if (params.status === 'failed' || params.status === 'cancelled') {
      const inst = await this.instRepo.findOne({ where: { installmentId: params.installmentId } });
      if (inst) {
        inst.paymentDetails = {
          ...inst.paymentDetails,
          gatewayTransactionId: params.transactionId,
      status: params.status,
      callbackData: params.gatewayData,
      callbackAt: new Date().toISOString(),
        };
        inst.updatedAt = new Date();
        await this.instRepo.save(inst);
      }
      return { success: false, error: `Payment ${params.status}` };
    }
    return { success: false, error: 'Unknown status' };
  }
}
