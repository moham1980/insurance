import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { NbaActionLog, NbaActionStatus } from '../entities/NbaActionLog';
import { ClaimEntity } from '../entities/ClaimEntity';
import { DocumentEntity } from '../entities/DocumentEntity';

export interface NbaAction {
  actionId: string;
  actionCode: string;
  title: string;
  description: string;
  reasonCode: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requiresHuman: boolean;
  payload?: Record<string, any>;
  confidence: number;
  sourceRef: { type: string; id: string; field?: string };
  optOutAllowed: boolean;
  logId?: string;
}

export interface NbaContext {
  contextType: 'claim' | 'policy' | 'complaint' | 'customer';
  resourceId: string;
  claim?: ClaimEntity | null;
  documents?: DocumentEntity[];
}

@Injectable()
export class NbaEngineService {
  constructor(
    @InjectRepository(NbaActionLog)
    private readonly actionLogRepo: Repository<NbaActionLog>,
  ) {}

  generateActions(context: NbaContext): NbaAction[] {
    const actions: NbaAction[] = [];

    if (context.contextType === 'claim' && context.claim) {
      const claim = context.claim;
      const docs = context.documents || [];
      const extractedDocs = docs.filter((d) => d.status === 'extracted');
      const invoiceDocs = extractedDocs.filter((d) => d.documentType === 'invoice');
      const totalInvoice = invoiceDocs
        .map((d) => (d.extractedFields?.totalAmount as number) ?? 0)
        .filter((x) => typeof x === 'number')
        .reduce((a, b) => a + b, 0);

      if (claim.requiresHumanTriage || (claim.assessedAmount && totalInvoice > claim.assessedAmount * 1.2)) {
        actions.push({
          actionId: `nba:${context.resourceId}:adjuster`,
          actionCode: 'CLAIM_ASSIGN_ADJUSTER',
          title: 'ارجاع به کارشناس ارزیاب',
          description: 'فاکتورهای دریافتی بیش از ۲۰٪ مبلغ ارزیابی شده است؛ ارزیابی مجدد توسط کارشناس توصیه می‌شود.',
          reasonCode: 'AMOUNT_DISCREPANCY',
          priority: 'high',
          requiresHuman: true,
          payload: { claimId: claim.claimId, claimNumber: claim.claimNumber },
          confidence: 0.92,
          sourceRef: { type: 'claim', id: claim.claimId },
          optOutAllowed: true,
        });
      }

      if (claim.status === 'new' && extractedDocs.length === 0) {
        actions.push({
          actionId: `nba:${context.resourceId}:request_docs`,
          actionCode: 'CLAIM_REQUEST_DOCUMENTS',
          title: 'درخواست اسناد تکمیلی',
          description: 'پرونده فاقد اسناد پردازش‌شده است؛ درخواست فاکتور/گزارش پلیس ارسال شود.',
          reasonCode: 'MISSING_DOCUMENTS',
          priority: 'high',
          requiresHuman: false,
          payload: { claimId: claim.claimId },
          confidence: 0.85,
          sourceRef: { type: 'claim', id: claim.claimId },
          optOutAllowed: true,
        });
      }

      if (claim.status === 'approved' && !claim.paidAmount) {
        actions.push({
          actionId: `nba:${context.resourceId}:schedule_payment`,
          actionCode: 'CLAIM_SCHEDULE_PAYMENT',
          title: 'ثبت پرداخت خسارت',
          description: 'خسارت تأیید شده و مبلغ پرداخت نشده است؛ می‌توان پرداخت را زمان‌بندی کرد.',
          reasonCode: 'PAYMENT_DUE',
          priority: 'medium',
          requiresHuman: true,
          payload: { claimId: claim.claimId, approvedAmount: claim.approvedAmount },
          confidence: 0.88,
          sourceRef: { type: 'claim', id: claim.claimId },
          optOutAllowed: true,
        });
      }

      if (claim.lossType && claim.lossType.includes('third-party')) {
        actions.push({
          actionId: `nba:${context.resourceId}:recovery`,
          actionCode: 'CLAIM_RECOVERY_REVIEW',
          title: 'بررسی فرصت بازیافت',
          description: 'حادثه شامل خسارت طرف مقصر است؛ امکان مطالبه خسارت وارده وجود دارد.',
          reasonCode: 'THIRD_PARTY_RECOVERY',
          priority: 'medium',
          requiresHuman: true,
          payload: { claimId: claim.claimId },
          confidence: 0.8,
          sourceRef: { type: 'claim', id: claim.claimId },
          optOutAllowed: true,
        });
      }
    }

    if (actions.length === 0) {
      actions.push({
        actionId: `nba:${context.resourceId}:no_action`,
        actionCode: 'NO_ACTION_REQUIRED',
        title: 'اقدام خاصی پیشنهاد نمی‌شود',
        description: 'با توجه به وضعیت فعلی، اقدام خودکاری یا انسانی ضروری نیست.',
        reasonCode: 'STABLE_STATE',
        priority: 'low',
        requiresHuman: false,
        payload: { resourceId: context.resourceId, contextType: context.contextType },
        confidence: 0.7,
        sourceRef: { type: context.contextType, id: context.resourceId },
        optOutAllowed: false,
      });
    }

    return actions;
  }

  async logAction(log: Partial<NbaActionLog>): Promise<NbaActionLog> {
    const entry = this.actionLogRepo.create({
      logId: uuidv4(),
      actionId: log.actionId || '',
      actionCode: log.actionCode || '',
      contextType: log.contextType || '',
      resourceId: log.resourceId || '',
      actorUserId: log.actorUserId || null,
      tenantId: log.tenantId || null,
      status: (log.status as NbaActionStatus) || 'recommended',
      payload: log.payload || null,
      reasonCode: log.reasonCode || null,
      optOutReason: log.optOutReason || null,
      confidence: typeof log.confidence === 'number' ? log.confidence : 0.8,
    });
    return this.actionLogRepo.save(entry);
  }

  async markExecuted(logId: string): Promise<NbaActionLog> {
    const entry = await this.actionLogRepo.findOne({ where: { logId } });
    if (!entry) throw new NotFoundException('NBA action log not found');
    entry.status = 'executed';
    entry.updatedAt = new Date();
    return this.actionLogRepo.save(entry);
  }

  async markOptedOut(logId: string, reason?: string): Promise<NbaActionLog> {
    const entry = await this.actionLogRepo.findOne({ where: { logId } });
    if (!entry) throw new NotFoundException('NBA action log not found');
    entry.status = 'opted_out';
    entry.optOutReason = reason || null;
    entry.updatedAt = new Date();
    return this.actionLogRepo.save(entry);
  }

  async listActions(params: { contextType?: string; resourceId?: string; actorUserId?: string; tenantId?: string; limit?: number; offset?: number }) {
    const limit = Math.min(params.limit || 50, 200);
    const offset = params.offset || 0;
    const qb = this.actionLogRepo.createQueryBuilder('a');
    if (params.contextType) qb.andWhere('a.contextType = :contextType', { contextType: params.contextType });
    if (params.resourceId) qb.andWhere('a.resourceId = :resourceId', { resourceId: params.resourceId });
    if (params.actorUserId) qb.andWhere('a.actorUserId = :actorUserId', { actorUserId: params.actorUserId });
    if (params.tenantId) qb.andWhere('a.tenantId = :tenantId', { tenantId: params.tenantId });
    qb.orderBy('a.createdAt', 'DESC');
    const [rows, total] = await qb.take(limit).skip(offset).getManyAndCount();
    return { rows, total };
  }
}
