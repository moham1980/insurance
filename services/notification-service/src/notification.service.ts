import { Injectable, Logger, Inject, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { OutboxPublisher } from '@insurance/shared';
import { v4 as uuidv4 } from 'uuid';
import { randomInt } from 'crypto';
import { NotificationLog, NotificationStatus, NotificationChannel, NotificationType } from './entities/NotificationLog';
import { EmailTemplate, EmailTemplateType } from './entities/EmailTemplate';
import { SmsTemplate, SmsTemplateType } from './entities/SmsTemplate';
import { ISmsProvider } from './sms-providers/sms-provider.interface';
import { IEmailProvider } from './email-providers/email-provider.interface';
import { RedisService } from './redis.service';

interface CreateNotificationParams {
  tenantId: string;
  userId?: string;
  correlationId?: string;
  channel: NotificationChannel;
  type: NotificationType;
  recipient: string;
  message: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly maxRetries = 3;
  private readonly retryDelayMs = 5000;
  private readonly otpTtlSeconds = 300;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(NotificationLog)
    private notificationRepo: Repository<NotificationLog>,
    @InjectRepository(EmailTemplate)
    private emailTemplateRepo: Repository<EmailTemplate>,
    @InjectRepository(SmsTemplate)
    private smsTemplateRepo: Repository<SmsTemplate>,
    @Inject('SMS_PROVIDER') private smsProvider: ISmsProvider,
    @Inject('EMAIL_PROVIDER') private emailProvider: IEmailProvider,
    @Inject('SMS_FALLBACK_PROVIDER') private fallbackSmsProvider: ISmsProvider | undefined,
    private readonly redisService: RedisService,
  ) {}

  private otpKey(tenantId: string, reference: string): string {
    return `otp:${tenantId}:${reference}`;
  }

  private otpRateLimitKey(tenantId: string, recipient: string): string {
    return `otp_rate:${tenantId}:${recipient}`;
  }

  private async checkOtpRateLimit(tenantId: string, recipient: string): Promise<void> {
    const maxOtpPerWindow = parseInt(process.env.OTP_MAX_PER_WINDOW || '5', 10);
    const otpWindowMs = parseInt(process.env.OTP_WINDOW_MS || '300000', 10);
    const key = this.otpRateLimitKey(tenantId, recipient);
    const current = await this.redisService.get(key);
    if (current && parseInt(current, 10) >= maxOtpPerWindow) {
      throw new BadRequestException(
        `OTP rate limit exceeded for ${recipient}. Max ${maxOtpPerWindow} OTPs per ${otpWindowMs / 1000}s.`,
      );
    }
    const count = await this.redisService.incr(key);
    if (count === 1) {
      await this.redisService.expire(key, Math.floor(otpWindowMs / 1000));
    }
  }

  private async createNotificationLog(manager: EntityManager, params: CreateNotificationParams): Promise<NotificationLog> {
    const repo = manager.getRepository(NotificationLog);
    const entry = repo.create({
      ...params,
      status: NotificationStatus.PENDING,
      retryCount: 0,
    });
    const saved = await repo.save(entry);
    const outbox = new OutboxPublisher(manager);
    await outbox.publish({
      topic: 'insurance.notification.created',
      eventType: 'NotificationCreated',
      eventVersion: 1,
      correlationId: params.correlationId || uuidv4(),
      subject: { notificationId: saved.id, tenantId: params.tenantId },
      payload: {
        notificationId: saved.id,
        channel: params.channel,
        type: params.type,
        recipient: params.recipient,
        status: saved.status,
        tenantId: params.tenantId,
      },
    });
    return saved;
  }

  private scheduleProcess(logId: string, delayMs: number = 0): void {
    setTimeout(() => {
      this.processNotification(logId).catch((err) => {
        this.logger.error(`Scheduled notification processing failed for ${logId}: ${err.message}`);
      });
    }, delayMs);
  }

  async sendNotification(params: CreateNotificationParams): Promise<NotificationLog> {
    const log = await this.dataSource.transaction(async (manager) => {
      return this.createNotificationLog(manager, params);
    });
    this.scheduleProcess(log.id);
    return log;
  }

  async sendOtp(params: {
    tenantId: string;
    recipient: string;
    correlationId?: string;
    userId?: string;
  }): Promise<{ reference: string; logId: string }> {
    await this.checkOtpRateLimit(params.tenantId, params.recipient);
    const otp = String(randomInt(100000, 1000000));
    const log = await this.dataSource.transaction(async (manager) => {
      return this.createNotificationLog(manager, {
        tenantId: params.tenantId,
        userId: params.userId,
        correlationId: params.correlationId,
        channel: NotificationChannel.SMS,
        type: NotificationType.OTP,
        recipient: params.recipient,
        message: 'OTP verification',
        metadata: { otpReference: true },
      });
    });
    await this.redisService.setEx(this.otpKey(params.tenantId, log.id), this.otpTtlSeconds, otp);
    this.scheduleProcess(log.id);
    this.logger.log(`OTP queued for ${params.recipient} with reference ${log.id}`);
    return { reference: log.id, logId: log.id };
  }

  async verifyOtp(reference: string, code: string, tenantId: string): Promise<{ valid: boolean }> {
    const stored = await this.redisService.get(this.otpKey(tenantId, reference));
    if (!stored) {
      throw new BadRequestException('OTP not found or expired');
    }
    if (stored !== code) {
      throw new BadRequestException('Invalid OTP');
    }
    await this.redisService.del(this.otpKey(tenantId, reference));
    return { valid: true };
  }

  private async processNotification(logId: string): Promise<void> {
    const log = await this.notificationRepo.findOne({ where: { id: logId } });
    if (!log) return;
    if (log.status !== NotificationStatus.PENDING && log.status !== NotificationStatus.RETRYING) {
      this.logger.warn(`Notification ${logId} is not in a processable state (${log.status})`);
      return;
    }

    let result: { success: boolean; messageId?: string; error?: string };

    try {
      if (log.channel === NotificationChannel.SMS) {
        if (log.type === NotificationType.OTP) {
          const otp = await this.redisService.get(this.otpKey(log.tenantId, log.id));
          if (!otp) {
            result = { success: false, error: 'OTP expired or not found' };
          } else {
            result = await this.smsProvider.sendOtp(log.recipient, otp);
            if (!result.success && this.fallbackSmsProvider) {
              this.logger.warn(`Primary SMS OTP failed, trying fallback provider`, { recipient: log.recipient, error: result.error });
              result = await this.fallbackSmsProvider.sendOtp(log.recipient, otp);
              if (result.success) {
                log.metadata = { ...log.metadata, fallbackProvider: true };
              }
            }
          }
        } else if (log.metadata?.templateId) {
          const template = await this.smsTemplateRepo.findOne({
            where: { id: log.metadata.templateId, tenantId: log.tenantId, isActive: true },
          });
          if (!template) {
            throw new Error(`SMS template not found for id: ${log.metadata.templateId}`);
          }
          const variables = log.metadata.variables || {};
          const message = this.renderTemplate(template.message, variables);
          result = await this.smsProvider.sendSms(log.recipient, message);
          if (!result.success && this.fallbackSmsProvider) {
            this.logger.warn(`Primary SMS failed, trying fallback provider`, { recipient: log.recipient, error: result.error });
            result = await this.fallbackSmsProvider.sendSms(log.recipient, message);
            if (result.success) {
              log.metadata = { ...log.metadata, fallbackProvider: true };
            }
          }
        } else {
          result = await this.smsProvider.sendSms(log.recipient, log.message);
          if (!result.success && this.fallbackSmsProvider) {
            this.logger.warn(`Primary SMS failed, trying fallback provider`, { recipient: log.recipient, error: result.error });
            result = await this.fallbackSmsProvider.sendSms(log.recipient, log.message);
            if (result.success) {
              log.metadata = { ...log.metadata, fallbackProvider: true };
            }
          }
        }
      } else if (log.channel === NotificationChannel.EMAIL) {
        if (log.metadata?.templateId) {
          const template = await this.emailTemplateRepo.findOne({
            where: { id: log.metadata.templateId, tenantId: log.tenantId, isActive: true },
          });
          if (!template) {
            throw new Error(`Email template not found for id: ${log.metadata.templateId}`);
          }
          const variables = log.metadata.variables || {};
          const subject = this.renderTemplate(template.subject, variables);
          const body = this.renderTemplate(template.body, variables);
          const html = template.html ? this.renderTemplate(template.html, variables) : undefined;
          result = await this.emailProvider.sendEmail(log.recipient, subject, body, { html });
        } else {
          const subject = log.metadata?.subject || log.message.substring(0, 100);
          const body = log.metadata?.body || log.message;
          const html = log.metadata?.html;
          result = await this.emailProvider.sendEmail(log.recipient, subject, body, { html });
        }
      } else {
        throw new Error(`Unsupported channel: ${log.channel}`);
      }

      if (result.success) {
        log.status = NotificationStatus.SENT;
        log.sentAt = new Date();
        log.metadata = { ...log.metadata, messageId: result.messageId };
      } else {
        log.status = NotificationStatus.FAILED;
        log.errorMessage = result.error || 'Unknown error';
        log.retryCount += 1;
      }
    } catch (error: any) {
      log.status = NotificationStatus.FAILED;
      log.errorMessage = error.message || 'Unknown error';
      log.retryCount += 1;
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.save(log);
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: log.status === NotificationStatus.SENT ? 'insurance.notification.sent' : 'insurance.notification.failed',
        eventType: log.status === NotificationStatus.SENT ? 'NotificationSent' : 'NotificationFailed',
        eventVersion: 1,
        correlationId: log.correlationId || uuidv4(),
        subject: { notificationId: log.id, tenantId: log.tenantId },
        payload: {
          notificationId: log.id,
          status: log.status,
          recipient: log.recipient,
          channel: log.channel,
          errorMessage: log.errorMessage || null,
        },
      });
    });
  }

  async getNotification(id: string, tenantId: string): Promise<NotificationLog | null> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant required');
    }
    return this.notificationRepo.findOne({ where: { id, tenantId } });
  }

  async listNotifications(params: {
    tenantId: string;
    userId?: string;
    correlationId?: string;
    channel?: NotificationChannel;
    type?: NotificationType;
    status?: NotificationStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ data: NotificationLog[]; total: number }> {
    if (!params.tenantId) {
      throw new ForbiddenException('Tenant required');
    }
    const queryBuilder = this.notificationRepo.createQueryBuilder('log');

    queryBuilder.andWhere('log.tenantId = :tenantId', { tenantId: params.tenantId });
    if (params.userId) queryBuilder.andWhere('log.userId = :userId', { userId: params.userId });
    if (params.correlationId) queryBuilder.andWhere('log.correlationId = :correlationId', { correlationId: params.correlationId });
    if (params.channel) queryBuilder.andWhere('log.channel = :channel', { channel: params.channel });
    if (params.type) queryBuilder.andWhere('log.type = :type', { type: params.type });
    if (params.status) queryBuilder.andWhere('log.status = :status', { status: params.status });

    const limit = params.limit || 50;
    const offset = params.offset || 0;

    const [data, total] = await queryBuilder
      .orderBy('log.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getManyAndCount();

    return { data, total };
  }

  async retryNotification(id: string, tenantId?: string): Promise<NotificationLog | null> {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;
    const log = await this.notificationRepo.findOne({ where });
    if (!log) return null;

    if (log.status !== NotificationStatus.FAILED) {
      throw new Error('Only failed notifications can be retried');
    }

    if (log.retryCount >= this.maxRetries) {
      throw new Error(`Maximum retry attempts (${this.maxRetries}) reached`);
    }

    log.status = NotificationStatus.RETRYING;
    await this.notificationRepo.save(log);

    const delay = this.retryDelayMs * Math.pow(2, log.retryCount);
    this.logger.log(`Retrying notification ${id} after ${delay}ms (attempt ${log.retryCount + 1})`);
    this.scheduleProcess(log.id, delay);

    return this.notificationRepo.findOne({ where: { id } });
  }

  async retryAllFailed(params: { tenantId: string; maxRetries?: number }): Promise<{ retried: number }> {
    const qb = this.notificationRepo.createQueryBuilder('log')
      .where('log.status = :status', { status: NotificationStatus.FAILED })
      .andWhere('log.retryCount < :maxRetries', { maxRetries: params.maxRetries || this.maxRetries });

    qb.andWhere('log.tenantId = :tenantId', { tenantId: params.tenantId });

    const failedNotifications = await qb.getMany();
    let retried = 0;

    for (const notification of failedNotifications) {
      try {
        await this.retryNotification(notification.id, params.tenantId);
        retried++;
      } catch (error: any) {
        this.logger.error(`Retry scheduling failed for notification ${notification.id}: ${error.message}`);
      }
    }

    return { retried };
  }

  async handleDeliveryCallback(params: {
    notificationId: string;
    provider: string;
    status: 'delivered' | 'failed' | 'bounced' | 'complained';
    timestamp?: Date;
    details?: Record<string, any>;
    tenantId?: string;
  }): Promise<NotificationLog | null> {
    const where: any = { id: params.notificationId };
    if (params.tenantId) where.tenantId = params.tenantId;
    const log = await this.notificationRepo.findOne({ where });
    if (!log) return null;

    log.metadata = {
      ...log.metadata,
      deliveryStatus: params.status,
      deliveryProvider: params.provider,
      deliveryTimestamp: params.timestamp || new Date(),
      deliveryDetails: params.details,
    };

    let eventTopic = 'insurance.notification.failed';
    let eventType = 'NotificationFailed';

    if (params.status === 'delivered') {
      log.status = NotificationStatus.DELIVERED;
      log.deliveredAt = params.timestamp || new Date();
      eventTopic = 'insurance.notification.delivered';
      eventType = 'NotificationDelivered';
    } else {
      log.status = NotificationStatus.FAILED;
      log.errorMessage = params.details?.errorMessage || `Delivery ${params.status}`;
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.save(log);
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: eventTopic,
        eventType,
        eventVersion: 1,
        correlationId: log.correlationId || uuidv4(),
        subject: { notificationId: log.id, tenantId: log.tenantId },
        payload: {
          notificationId: log.id,
          status: log.status,
          recipient: log.recipient,
          channel: log.channel,
          deliveryStatus: params.status,
          errorMessage: log.errorMessage || null,
        },
      });
    });

    this.logger.log(`Delivery callback received for notification ${params.notificationId}: ${params.status}`);
    return log;
  }

  async sendBulkNotifications(params: {
    tenantId: string;
    userId?: string;
    channel: NotificationChannel;
    type: NotificationType;
    recipients: string[];
    message: string;
    scheduledAt?: Date;
    metadata?: Record<string, any>;
    correlationId?: string;
  }): Promise<{ batchId: string; total: number; queued: number }> {
    const batchId = uuidv4();
    const correlationId = params.correlationId || `bulk-${Date.now()}`;
    const logs = await this.dataSource.transaction(async (manager) => {
      const created: NotificationLog[] = [];
      for (const recipient of params.recipients) {
        const log = await this.createNotificationLog(manager, {
          tenantId: params.tenantId,
          userId: params.userId,
          correlationId,
          channel: params.channel,
          type: params.type,
          recipient,
          message: params.message,
          metadata: { ...params.metadata, batchId, scheduledAt: params.scheduledAt },
        });
        created.push(log);
      }
      return created;
    });

    for (const log of logs) {
      if (!params.scheduledAt) {
        this.scheduleProcess(log.id);
      }
    }

    return { batchId, total: params.recipients.length, queued: logs.length };
  }

  private renderTemplate(template: string, variables: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\{\\{\\s*${safeKey}\\s*\\}\\}`, 'g');
      result = result.replace(regex, String(value));
    }
    return result;
  }

  async sendSmsWithTemplate(params: {
    tenantId: string;
    type: SmsTemplateType;
    recipient: string;
    variables: Record<string, any>;
    language?: string;
    userId?: string;
    correlationId?: string;
  }): Promise<NotificationLog> {
    const language = params.language || 'en';
    const template = await this.smsTemplateRepo.findOne({
      where: { type: params.type, language, isActive: true, tenantId: params.tenantId },
    });

    if (!template) {
      throw new Error(`SMS template not found for type: ${params.type}, language: ${language}`);
    }

    return this.sendNotification({
      tenantId: params.tenantId,
      userId: params.userId,
      correlationId: params.correlationId,
      channel: NotificationChannel.SMS,
      type: params.type as unknown as NotificationType,
      recipient: params.recipient,
      message: `[SMS template: ${params.type}]`,
      metadata: { templateId: template.id, templateType: params.type, variables: params.variables, language },
    });
  }

  async sendEmailWithTemplate(params: {
    tenantId: string;
    type: EmailTemplateType;
    recipient: string;
    variables: Record<string, any>;
    language?: string;
    userId?: string;
    correlationId?: string;
  }): Promise<NotificationLog> {
    const language = params.language || 'en';
    const template = await this.emailTemplateRepo.findOne({
      where: { type: params.type, language, isActive: true, tenantId: params.tenantId },
    });

    if (!template) {
      throw new Error(`Email template not found for type: ${params.type}, language: ${language}`);
    }

    return this.sendNotification({
      tenantId: params.tenantId,
      userId: params.userId,
      correlationId: params.correlationId,
      channel: NotificationChannel.EMAIL,
      type: params.type as unknown as NotificationType,
      recipient: params.recipient,
      message: `[Email template: ${params.type}]`,
      metadata: { templateId: template.id, templateType: params.type, variables: params.variables, language },
    });
  }

  async createEmailTemplate(params: {
    tenantId: string;
    type: EmailTemplateType;
    language: string;
    subject: string;
    body: string;
    html?: string;
    variables?: Record<string, string>;
    description?: string;
  }): Promise<EmailTemplate> {
    const template = this.emailTemplateRepo.create({
      ...params,
      isActive: true,
    });
    return this.emailTemplateRepo.save(template);
  }

  async updateEmailTemplate(id: string, tenantId: string, params: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const template = await this.emailTemplateRepo.findOne({ where: { id, tenantId } });
    if (!template) {
      const err: any = new BadRequestException('Template not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    Object.assign(template, params);
    return this.emailTemplateRepo.save(template);
  }

  async getEmailTemplate(type: EmailTemplateType, language: string, tenantId: string): Promise<EmailTemplate | null> {
    return this.emailTemplateRepo.findOne({ where: { type, language, isActive: true, tenantId } });
  }

  async listEmailTemplates(params: {
    tenantId: string;
    type?: EmailTemplateType;
    language?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: EmailTemplate[]; total: number }> {
    const qb = this.emailTemplateRepo.createQueryBuilder('t');
    qb.andWhere('t.tenantId = :tenantId', { tenantId: params.tenantId });
    if (params.type) qb.andWhere('t.type = :type', { type: params.type });
    if (params.language) qb.andWhere('t.language = :language', { language: params.language });
    qb.orderBy('t.createdAt', 'DESC');
    const limit = params.limit || 50;
    const offset = params.offset || 0;
    const [data, total] = await qb.limit(limit).offset(offset).getManyAndCount();
    return { data, total };
  }

  async createSmsTemplate(params: {
    tenantId: string;
    type: SmsTemplateType;
    language: string;
    message: string;
    variables?: Record<string, string>;
    description?: string;
  }): Promise<SmsTemplate> {
    const template = this.smsTemplateRepo.create({
      ...params,
      isActive: true,
    });
    return this.smsTemplateRepo.save(template);
  }

  async updateSmsTemplate(id: string, tenantId: string, params: Partial<SmsTemplate>): Promise<SmsTemplate> {
    const template = await this.smsTemplateRepo.findOne({ where: { id, tenantId } });
    if (!template) {
      const err: any = new BadRequestException('Template not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    Object.assign(template, params);
    return this.smsTemplateRepo.save(template);
  }

  async getSmsTemplate(type: SmsTemplateType, language: string, tenantId: string): Promise<SmsTemplate | null> {
    return this.smsTemplateRepo.findOne({ where: { type, language, isActive: true, tenantId } });
  }

  async listSmsTemplates(params: {
    tenantId: string;
    type?: SmsTemplateType;
    language?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: SmsTemplate[]; total: number }> {
    const qb = this.smsTemplateRepo.createQueryBuilder('t');
    qb.andWhere('t.tenantId = :tenantId', { tenantId: params.tenantId });
    if (params.type) qb.andWhere('t.type = :type', { type: params.type });
    if (params.language) qb.andWhere('t.language = :language', { language: params.language });
    qb.orderBy('t.createdAt', 'DESC');
    const limit = params.limit || 50;
    const offset = params.offset || 0;
    const [data, total] = await qb.limit(limit).offset(offset).getManyAndCount();
    return { data, total };
  }

  async seedDefaultTemplates(tenantId: string): Promise<{ email: number; sms: number }> {
    let emailCount = 0;
    let smsCount = 0;

    const emailTemplates = [
      {
        type: 'policy_issued' as EmailTemplateType,
        language: 'fa',
        subject: 'صدور بیمه‌نامه شما',
        body: 'با سلام،\n\nبیمه‌نامه شماره {{policyNumber}} با موفقیت صادر شد.\n\nتاریخ شروع: {{startDate}}\nتاریخ پایان: {{endDate}}\nمبلغ حق بیمه: {{premiumAmount}}\n\nبا احترام،\nشرکت بیمه',
        html: '<p>با سلام،</p><p>بیمه‌نامه شماره {{policyNumber}} با موفقیت صادر شد.</p><p>تاریخ شروع: {{startDate}}</p><p>تاریخ پایان: {{endDate}}</p><p>مبلغ حق بیمه: {{premiumAmount}}</p><p>با احترام،<br>شرکت بیمه</p>',
        description: 'Email template for policy issuance',
      },
      {
        type: 'claim_submitted' as EmailTemplateType,
        language: 'fa',
        subject: 'ثبت خسارت شما',
        body: 'با سلام،\n\nخسارت شماره {{claimNumber}} با موفقیت ثبت شد.\n\nتاریخ وقوع: {{lossDate}}\nمبلغ خسارت: {{lossAmount}}\n\nوضعیت: در حال بررسی\n\nبا احترام،\nشرکت بیمه',
        html: '<p>با سلام،</p><p>خسارت شماره {{claimNumber}} با موفقیت ثبت شد.</p><p>تاریخ وقوع: {{lossDate}}</p><p>مبلغ خسارت: {{lossAmount}}</p><p>وضعیت: در حال بررسی</p><p>با احترام،<br>شرکت بیمه</p>',
        description: 'Email template for claim submission',
      },
      {
        type: 'complaint_received' as EmailTemplateType,
        language: 'fa',
        subject: 'دریافت شکایت شما',
        body: 'با سلام،\n\nشکایت شماره {{complaintNumber}} دریافت شد.\n\nموضوع: {{subject}}\n\nوضعیت: در حال بررسی\n\nبا احترام،\nشرکت بیمه',
        html: '<p>با سلام،</p><p>شکایت شماره {{complaintNumber}} دریافت شد.</p><p>موضوع: {{subject}}</p><p>وضعیت: در حال بررسی</p><p>با احترام،<br>شرکت بیمه</p>',
        description: 'Email template for complaint receipt',
      },
      {
        type: 'installment_due' as EmailTemplateType,
        language: 'fa',
        subject: 'یادآوری قسط بیمه',
        body: 'با سلام،\n\nقسط بیمه‌نامه شماره {{policyNumber}} سررسید شده است.\n\nمبلغ قسط: {{installmentAmount}}\nتاریخ سررسید: {{dueDate}}\n\nلطفاً پرداخت خود را انجام دهید.\n\nبا احترام،\nشرکت بیمه',
        html: '<p>با سلام،</p><p>قسط بیمه‌نامه شماره {{policyNumber}} سررسید شده است.</p><p>مبلغ قسط: {{installmentAmount}}</p><p>تاریخ سررسید: {{dueDate}}</p><p>لطفاً پرداخت خود را انجام دهید.</p><p>با احترام،<br>شرکت بیمه</p>',
        description: 'Email template for installment due reminder',
      },
    ];

    for (const template of emailTemplates) {
      const existing = await this.emailTemplateRepo.findOne({
        where: { type: template.type, language: template.language, tenantId },
      });
      if (!existing) {
        await this.createEmailTemplate({ ...(template as any), tenantId });
        emailCount++;
      }
    }

    const smsTemplates = [
      {
        type: 'policy_issued' as SmsTemplateType,
        language: 'fa',
        message: 'بیمه‌نامه شماره {{policyNumber}} صادر شد. شروع: {{startDate}}، پایان: {{endDate}}',
        description: 'SMS template for policy issuance',
      },
      {
        type: 'claim_submitted' as SmsTemplateType,
        language: 'fa',
        message: 'خسارت شماره {{claimNumber}} ثبت شد. وضعیت: در حال بررسی',
        description: 'SMS template for claim submission',
      },
      {
        type: 'complaint_received' as SmsTemplateType,
        language: 'fa',
        message: 'شکایت شماره {{complaintNumber}} دریافت شد. موضوع: {{subject}}',
        description: 'SMS template for complaint receipt',
      },
      {
        type: 'installment_due' as SmsTemplateType,
        language: 'fa',
        message: 'قسط بیمه‌نامه {{policyNumber}} سررسید شد. مبلغ: {{installmentAmount}}',
        description: 'SMS template for installment due reminder',
      },
      {
        type: 'otp' as SmsTemplateType,
        language: 'fa',
        message: 'کد تأیید شما: {{otp}}. اعتبار: ۵ دقیقه',
        description: 'SMS template for OTP',
      },
    ];

    for (const template of smsTemplates) {
      const existing = await this.smsTemplateRepo.findOne({
        where: { type: template.type, language: template.language, tenantId },
      });
      if (!existing) {
        await this.createSmsTemplate({ ...(template as any), tenantId });
        smsCount++;
      }
    }

    this.logger.log(`Seeded ${emailCount} email templates and ${smsCount} SMS templates for tenant ${tenantId}`);
    return { email: emailCount, sms: smsCount };
  }
}
