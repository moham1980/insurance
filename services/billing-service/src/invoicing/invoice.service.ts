import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PremiumInvoice, PremiumInvoiceStatus } from './premium-invoice.entity';
import { PremiumInvoiceLine, InvoiceLineType } from './invoice-line.entity';
import { PremiumInstallmentPlan, InstallmentScheduleItem } from './installment-plan.entity';
import { OutboxPublisher } from '@insurance/shared';
import { IdempotencyService } from '../idempotency.service';
import { PolicyVerificationService } from '../policy-verification.service';

export interface MoneyInput {
  amountMinor: string;
  currency: string;
}

export interface FeeLineInput {
  feeType: string;
  description: string;
  amount: MoneyInput;
}

export interface CreatePremiumInvoiceInput {
  tenantId: string;
  organizationId: string;
  policyId: string;
  endorsementId?: string;
  customerPartyId: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  totalPremium: MoneyInput;
  taxes: MoneyInput;
  fees: FeeLineInput[];
  totalAmount: MoneyInput;
  currency: string;
  paymentMethod?: 'card' | 'account_transfer' | 'installment' | 'cash' | 'cheque';
  lines: Array<{
    lineType: InvoiceLineType;
    description: string;
    amount: MoneyInput;
    taxAmount?: MoneyInput;
  }>;
  idempotencyKey?: string;
  correlationId?: string;
}

export interface CreateInstallmentPlanInput {
  tenantId: string;
  invoiceId: string;
  numberOfInstallments: number;
  firstDueDate: Date;
  correlationId?: string;
}

@Injectable()
export class PremiumInvoiceService {
  private readonly logger = new Logger(PremiumInvoiceService.name);

  constructor(
    @InjectRepository(PremiumInvoice) private readonly invoiceRepo: Repository<PremiumInvoice>,
    @InjectRepository(PremiumInvoiceLine) private readonly lineRepo: Repository<PremiumInvoiceLine>,
    @InjectRepository(PremiumInstallmentPlan) private readonly planRepo: Repository<PremiumInstallmentPlan>,
    private readonly dataSource: DataSource,
    private readonly idempotencyService: IdempotencyService,
    private readonly policyVerification: PolicyVerificationService,
  ) {}

  private sumAmounts(items: { amount: MoneyInput }[]): MoneyInput {
    const currency = items[0]?.amount.currency;
    let total = BigInt(0);
    for (const item of items) {
      if (item.amount.currency !== currency) {
        throw new BadRequestException('Mixed currencies in invoice lines');
      }
      total += BigInt(item.amount.amountMinor);
    }
    return { amountMinor: total.toString(), currency: currency || 'IRR' };
  }

  async createInvoice(input: CreatePremiumInvoiceInput): Promise<PremiumInvoice> {
    const scope = 'createPremiumInvoice';
    if (input.idempotencyKey) {
      const cached = await this.idempotencyService.getExisting(input.tenantId, scope, input.idempotencyKey);
      if (cached?.invoice) return cached.invoice as PremiumInvoice;
    }

    const linesTotal = this.sumAmounts(input.lines);
    if (linesTotal.amountMinor !== input.totalAmount.amountMinor) {
      throw new BadRequestException('Invoice line totals do not match totalAmount');
    }

    await this.policyVerification.verifyPolicyForInvoice(
      input.tenantId,
      input.policyId,
      input.organizationId,
      input.correlationId,
    );

    const existing = await this.invoiceRepo.findOne({
      where: {
        tenantId: input.tenantId,
        policyId: input.policyId,
        endorsementId: input.endorsementId ? input.endorsementId : IsNull(),
      },
    });
    if (existing) {
      throw new BadRequestException('An invoice already exists for this policy/endorsement');
    }

    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const invoiceRepo = manager.getRepository(PremiumInvoice);
      const lineRepo = manager.getRepository(PremiumInvoiceLine);

      const invoice = invoiceRepo.create({
        invoiceId: uuidv4(),
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        policyId: input.policyId,
        endorsementId: input.endorsementId || null,
        customerPartyId: input.customerPartyId,
        invoiceNumber: input.invoiceNumber,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        totalPremiumAmountMinor: input.totalPremium.amountMinor,
        totalPremiumCurrency: input.totalPremium.currency,
        taxesAmountMinor: input.taxes.amountMinor,
        taxesCurrency: input.taxes.currency,
        fees: (input.fees || []).map((f) => ({
          feeType: f.feeType,
          description: f.description,
          amountMinor: f.amount.amountMinor,
          currency: f.amount.currency,
        })),
        totalAmountMinor: input.totalAmount.amountMinor,
        totalAmountCurrency: input.totalAmount.currency,
        currency: input.currency,
        status: 'draft',
        paymentMethod: input.paymentMethod || null,
        installmentPlanId: null,
        cancellationReason: null,
        metadata: null,
      });

      const savedInvoice = await invoiceRepo.save(invoice);

      const savedLines: PremiumInvoiceLine[] = [];
      for (let i = 0; i < input.lines.length; i++) {
        const line = input.lines[i];
        const lineEntity = lineRepo.create({
          lineId: uuidv4(),
          invoiceId: savedInvoice.invoiceId,
          lineNumber: i + 1,
          lineType: line.lineType,
          description: line.description,
          amountMinor: line.amount.amountMinor,
          currency: line.amount.currency,
          taxAmountMinor: line.taxAmount?.amountMinor || '0',
          metadata: null,
        });
        savedLines.push(await lineRepo.save(lineEntity));
      }
      savedInvoice.lines = savedLines;

      await outbox.publish({
        topic: 'insurance.billing.premium_invoice.created',
        eventType: 'PremiumInvoiceCreated',
        eventVersion: 1,
        correlationId: input.correlationId || uuidv4(),
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        subject: { invoiceId: savedInvoice.invoiceId, policyId: input.policyId },
        payload: {
          invoiceId: savedInvoice.invoiceId,
          invoiceNumber: savedInvoice.invoiceNumber,
          policyId: input.policyId,
          customerPartyId: input.customerPartyId,
          totalAmountMinor: savedInvoice.totalAmountMinor,
          currency: savedInvoice.currency,
        },
      });

      return savedInvoice;
    });
  }

  async issueInvoice(tenantId: string, invoiceId: string, correlationId?: string): Promise<PremiumInvoice> {
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const invoiceRepo = manager.getRepository(PremiumInvoice);
      const invoice = await invoiceRepo.findOne({
        where: { invoiceId, tenantId },
      });
      if (!invoice) throw new NotFoundException('Invoice not found');
      if (invoice.status !== 'draft') {
        throw new BadRequestException(`Cannot issue invoice in status ${invoice.status}`);
      }
      invoice.status = 'issued';
      invoice.issueDate = new Date();
      const saved = await invoiceRepo.save(invoice);
      const lines = await manager.getRepository(PremiumInvoiceLine).findBy({ invoiceId });
      saved.lines = lines;

      await outbox.publish({
        topic: 'insurance.billing.premium_invoice.issued',
        eventType: 'PremiumInvoiceIssued',
        eventVersion: 1,
        correlationId: correlationId || uuidv4(),
        tenantId,
        organizationId: invoice.organizationId,
        subject: { invoiceId: saved.invoiceId, policyId: saved.policyId },
        payload: {
          invoiceId: saved.invoiceId,
          invoiceNumber: saved.invoiceNumber,
          totalAmountMinor: saved.totalAmountMinor,
          currency: saved.currency,
        },
      });

      return saved;
    });
  }

  async cancelInvoice(
    tenantId: string,
    invoiceId: string,
    reason: string,
    correlationId?: string,
  ): Promise<PremiumInvoice> {
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const invoiceRepo = manager.getRepository(PremiumInvoice);
      const invoice = await invoiceRepo.findOne({ where: { invoiceId, tenantId } });
      if (!invoice) throw new NotFoundException('Invoice not found');
      if (invoice.status === 'paid' || invoice.status === 'partial') {
        throw new BadRequestException('Cannot cancel a paid or partially paid invoice');
      }
      if (invoice.status === 'cancelled') {
        throw new BadRequestException('Invoice already cancelled');
      }
      invoice.status = 'cancelled';
      invoice.cancellationReason = reason;
      const saved = await invoiceRepo.save(invoice);

      await outbox.publish({
        topic: 'insurance.billing.premium_invoice.cancelled',
        eventType: 'PremiumInvoiceCancelled',
        eventVersion: 1,
        correlationId: correlationId || uuidv4(),
        tenantId,
        organizationId: invoice.organizationId,
        subject: { invoiceId: saved.invoiceId, policyId: saved.policyId },
        payload: { invoiceId: saved.invoiceId, reason },
      });

      return saved;
    });
  }

  async createInstallmentPlan(input: CreateInstallmentPlanInput): Promise<PremiumInstallmentPlan> {
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const invoiceRepo = manager.getRepository(PremiumInvoice);
      const planRepo = manager.getRepository(PremiumInstallmentPlan);

      const invoice = await invoiceRepo.findOne({
        where: { invoiceId: input.invoiceId, tenantId: input.tenantId },
      });
      if (!invoice) throw new NotFoundException('Invoice not found');
      if (invoice.status !== 'draft' && invoice.status !== 'issued') {
        throw new BadRequestException('Installment plan can only be created for draft or issued invoices');
      }
      if (invoice.installmentPlanId) {
        throw new BadRequestException('Invoice already has an installment plan');
      }

      const totalAmount = BigInt(invoice.totalAmountMinor);
      const perInstallment = totalAmount / BigInt(input.numberOfInstallments);
      const remainder = totalAmount % BigInt(input.numberOfInstallments);

      const schedule: InstallmentScheduleItem[] = [];
      const firstDue = new Date(input.firstDueDate);
      for (let i = 0; i < input.numberOfInstallments; i++) {
        const amount = perInstallment + (i === 0 ? remainder : BigInt(0));
        const dueDate = new Date(firstDue);
        dueDate.setDate(dueDate.getDate() + i * 30);
        schedule.push({
          itemId: uuidv4(),
          installmentNumber: i + 1,
          dueDate,
          amountMinor: amount.toString(),
          currency: invoice.currency,
          status: 'open',
        });
      }

      const plan = planRepo.create({
        planId: uuidv4(),
        invoiceId: input.invoiceId,
        numberOfInstallments: input.numberOfInstallments,
        schedule,
        status: 'active',
      });
      const savedPlan = await planRepo.save(plan);

      invoice.installmentPlanId = savedPlan.planId;
      invoice.paymentMethod = 'installment';
      await invoiceRepo.save(invoice);

      await outbox.publish({
        topic: 'insurance.billing.installment_plan.created',
        eventType: 'InstallmentPlanCreated',
        eventVersion: 1,
        correlationId: input.correlationId || uuidv4(),
        tenantId: input.tenantId,
        organizationId: invoice.organizationId,
        subject: { invoiceId: input.invoiceId, planId: savedPlan.planId },
        payload: {
          invoiceId: input.invoiceId,
          planId: savedPlan.planId,
          numberOfInstallments: input.numberOfInstallments,
          schedule,
        },
      });

      return savedPlan;
    });
  }

  async getInvoice(tenantId: string, invoiceId: string): Promise<PremiumInvoice | null> {
    const invoice = await this.invoiceRepo.findOne({
      where: { invoiceId, tenantId },
    });
    if (!invoice) return null;
    const [lines, plans] = await Promise.all([
      this.lineRepo.findBy({ invoiceId }),
      this.planRepo.findBy({ invoiceId }),
    ]);
    invoice.lines = lines;
    invoice.installmentPlans = plans;
    return invoice;
  }

  async listInvoicesByPolicy(tenantId: string, policyId: string): Promise<PremiumInvoice[]> {
    return this.invoiceRepo.find({
      where: { tenantId, policyId },
      order: { issueDate: 'DESC' },
    });
  }

  async detectOverdueInstallments(tenantId: string, correlationId?: string): Promise<{ defaultedCount: number }> {
    const now = new Date();
    const invoices = await this.invoiceRepo.find({ where: { tenantId } });
    const invoiceIds = invoices.map((i) => i.invoiceId);
    if (invoiceIds.length === 0) return { defaultedCount: 0 };

    const plans = await this.planRepo
      .createQueryBuilder('plan')
      .where('plan.invoiceId IN (:...invoiceIds)', { invoiceIds })
      .getMany();
    let defaultedCount = 0;

    for (const plan of plans) {
      let changed = false;
      for (const item of plan.schedule) {
        if (item.status === 'open' && new Date(item.dueDate) < now) {
          item.status = 'defaulted';
          defaultedCount++;
          changed = true;

          await this.dataSource.transaction(async (manager) => {
            const outbox = new OutboxPublisher(manager);
            await outbox.publish({
              topic: 'insurance.billing.installment.defaulted',
              eventType: 'InstallmentDefaulted',
              eventVersion: 1,
              correlationId: correlationId || uuidv4(),
              tenantId,
              subject: { invoiceId: plan.invoiceId, planId: plan.planId, itemId: item.itemId },
              payload: {
                invoiceId: plan.invoiceId,
                planId: plan.planId,
                itemId: item.itemId,
                amountMinor: item.amountMinor,
                dueDate: item.dueDate,
                currency: item.currency,
              },
            });
          });
        }
      }
      if (changed) {
        await this.planRepo.save(plan);
      }
    }

    return { defaultedCount };
  }
}
