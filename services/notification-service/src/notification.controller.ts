import { Controller, Get, Post, Body, Param, Headers, Query, Req, UseGuards, BadRequestException, Delete } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CredentialVaultService } from './credential-vault.service';
import { NotificationChannel, NotificationType } from './entities/NotificationLog';
import { EmailTemplateType } from './entities/EmailTemplate';
import { SmsTemplateType } from './entities/SmsTemplate';
import { CredentialProvider, CredentialType } from './entities/Credential';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { TenantGuard } from './tenant.guard';
import { CallbackAuthGuard } from './callback-auth.guard';
import { PushChannel } from './push-channel';

interface RequestWithTenant {
  tenantId?: string;
  user?: any;
}

@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly credentialVault: CredentialVaultService,
    private readonly pushChannel: PushChannel,
  ) {}

  private toSummary(log: any) {
    return {
      id: log.id,
      tenantId: log.tenantId,
      userId: log.userId,
      correlationId: log.correlationId,
      channel: log.channel,
      type: log.type,
      recipient: log.recipient,
      status: log.status,
      retryCount: log.retryCount,
      sentAt: log.sentAt,
      deliveredAt: log.deliveredAt,
      createdAt: log.createdAt,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('notification:send')
  async send(
    @Req() req: RequestWithTenant,
    @Headers() headers: Record<string, any>,
    @Body() body: {
      userId?: string;
      correlationId?: string;
      channel: NotificationChannel;
      type: NotificationType;
      recipient: string;
      message: string;
      metadata?: Record<string, any>;
    },
  ) {
    const correlationId = headers['x-correlation-id'] || body.correlationId || `notif-${Date.now()}`;
    const result = await this.notificationService.sendNotification({
      ...body,
      tenantId: req.tenantId!,
      correlationId,
    });
    return {
      success: true,
      data: this.toSummary(result),
      correlationId,
    };
  }

  @Post('otp')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('notification:otp:send')
  async sendOtp(
    @Req() req: RequestWithTenant,
    @Headers() headers: Record<string, any>,
    @Body() body: {
      recipient?: string;
      phoneNumber?: string;
      correlationId?: string;
      userId?: string;
    },
  ) {
    const recipient = body.recipient || body.phoneNumber;
    if (!recipient) {
      throw new BadRequestException('recipient required');
    }
    const correlationId = headers['x-correlation-id'] || body.correlationId || `otp-${Date.now()}`;
    const result = await this.notificationService.sendOtp({
      tenantId: req.tenantId!,
      recipient,
      correlationId,
      userId: body.userId,
    });
    return {
      success: true,
      data: { reference: result.reference },
      correlationId,
    };
  }

  @Post('otp/verify')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('notification:otp:verify')
  async verifyOtp(
    @Req() req: RequestWithTenant,
    @Body() body: { reference: string; code: string },
  ) {
    if (!body.reference || !body.code) {
      throw new BadRequestException('reference and code required');
    }
    const result = await this.notificationService.verifyOtp(body.reference, body.code, req.tenantId!);
    return { success: true, data: result };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('notification:view')
  async get(@Req() req: RequestWithTenant, @Param('id') id: string) {
    const result = await this.notificationService.getNotification(id, req.tenantId!);
    if (!result) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Notification not found' },
      };
    }
    return {
      success: true,
      data: result,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('notification:list')
  async list(
    @Req() req: RequestWithTenant,
    @Query('userId') userId?: string,
    @Query('correlationId') correlationId?: string,
    @Query('channel') channel?: NotificationChannel,
    @Query('type') type?: NotificationType,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.notificationService.listNotifications({
      tenantId: req.tenantId!,
      userId,
      correlationId,
      channel,
      type,
      status: status as any,
      limit: limit ? Math.min(parseInt(limit, 10), 200) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    return {
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        limit: limit ? Math.min(parseInt(limit, 10), 200) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    };
  }

  @Post('delivery-callback')
  @UseGuards(CallbackAuthGuard)
  async deliveryCallback(@Body() body: {
    messageId: string;
    status: 'delivered' | 'failed' | 'bounced' | 'complained';
    provider: string;
    recipient?: string;
    errorCode?: string;
    errorMessage?: string;
    deliveredAt?: string;
    tenantId?: string;
  }) {
    const result = await this.notificationService.handleDeliveryCallback({
      notificationId: body.messageId,
      provider: body.provider,
      status: body.status,
      timestamp: body.deliveredAt ? new Date(body.deliveredAt) : undefined,
      details: {
        recipient: body.recipient,
        errorCode: body.errorCode,
        errorMessage: body.errorMessage,
      },
      tenantId: body.tenantId,
    });
    if (!result) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Notification not found for callback' } };
    }
    return { success: true, data: this.toSummary(result) };
  }

  // SMS Template endpoints
  @Post('sms/templates')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('notification:templates:manage')
  async createSmsTemplate(
    @Req() req: RequestWithTenant,
    @Body() body: {
      type: SmsTemplateType;
      language: string;
      message: string;
      variables?: Record<string, string>;
      description?: string;
    },
  ) {
    const result = await this.notificationService.createSmsTemplate({ ...body, tenantId: req.tenantId! });
    return { success: true, data: result };
  }

  @Get('sms/templates')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('notification:list')
  async listSmsTemplates(
    @Req() req: RequestWithTenant,
    @Query('type') type?: SmsTemplateType,
    @Query('language') language?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.notificationService.listSmsTemplates({
      tenantId: req.tenantId!,
      type,
      language,
      limit: limit ? Math.min(parseInt(limit, 10), 200) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    return {
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        limit: limit ? Math.min(parseInt(limit, 10), 200) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    };
  }

  @Get('sms/templates/:type/:language')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('notification:view')
  async getSmsTemplate(
    @Req() req: RequestWithTenant,
    @Param('type') type: SmsTemplateType,
    @Param('language') language: string,
  ) {
    const result = await this.notificationService.getSmsTemplate(type, language, req.tenantId!);
    if (!result) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } };
    }
    return { success: true, data: result };
  }

  @Post('sms/templates/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('notification:templates:manage')
  async updateSmsTemplate(
    @Req() req: RequestWithTenant,
    @Param('id') id: string,
    @Body() body: Partial<any>,
  ) {
    const result = await this.notificationService.updateSmsTemplate(id, req.tenantId!, body);
    return { success: true, data: result };
  }

  @Post('sms/send-template')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('notification:send')
  async sendSmsWithTemplate(
    @Req() req: RequestWithTenant,
    @Headers() headers: Record<string, any>,
    @Body() body: {
      type: SmsTemplateType;
      recipient: string;
      variables: Record<string, any>;
      language?: string;
      userId?: string;
      correlationId?: string;
    },
  ) {
    const correlationId = headers['x-correlation-id'] || body.correlationId || `sms-tpl-${Date.now()}`;
    const result = await this.notificationService.sendSmsWithTemplate({
      ...body,
      tenantId: req.tenantId!,
      correlationId,
    });
    return { success: true, data: this.toSummary(result), correlationId };
  }

  // Email Template endpoints
  @Post('email/templates')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('notification:templates:manage')
  async createEmailTemplate(
    @Req() req: RequestWithTenant,
    @Body() body: {
      type: EmailTemplateType;
      language: string;
      subject: string;
      body: string;
      html?: string;
      variables?: Record<string, string>;
      description?: string;
    },
  ) {
    const result = await this.notificationService.createEmailTemplate({ ...body, tenantId: req.tenantId! });
    return { success: true, data: result };
  }

  @Get('email/templates')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('notification:list')
  async listEmailTemplates(
    @Req() req: RequestWithTenant,
    @Query('type') type?: EmailTemplateType,
    @Query('language') language?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.notificationService.listEmailTemplates({
      tenantId: req.tenantId!,
      type,
      language,
      limit: limit ? Math.min(parseInt(limit, 10), 200) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    return {
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        limit: limit ? Math.min(parseInt(limit, 10), 200) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    };
  }

  @Get('email/templates/:type/:language')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('notification:view')
  async getEmailTemplate(
    @Req() req: RequestWithTenant,
    @Param('type') type: EmailTemplateType,
    @Param('language') language: string,
  ) {
    const result = await this.notificationService.getEmailTemplate(type, language, req.tenantId!);
    if (!result) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } };
    }
    return { success: true, data: result };
  }

  @Post('email/templates/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('notification:templates:manage')
  async updateEmailTemplate(
    @Req() req: RequestWithTenant,
    @Param('id') id: string,
    @Body() body: Partial<any>,
  ) {
    const result = await this.notificationService.updateEmailTemplate(id, req.tenantId!, body);
    return { success: true, data: result };
  }

  @Post('email/send-template')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('notification:send')
  async sendEmailWithTemplate(
    @Req() req: RequestWithTenant,
    @Headers() headers: Record<string, any>,
    @Body() body: {
      type: EmailTemplateType;
      recipient: string;
      variables: Record<string, any>;
      language?: string;
      userId?: string;
      correlationId?: string;
    },
  ) {
    const correlationId = headers['x-correlation-id'] || body.correlationId || `email-tpl-${Date.now()}`;
    const result = await this.notificationService.sendEmailWithTemplate({
      ...body,
      tenantId: req.tenantId!,
      correlationId,
    });
    return { success: true, data: this.toSummary(result), correlationId };
  }

  // Retry endpoints
  @Post(':id/retry')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('notification:retry')
  async retry(@Req() req: RequestWithTenant, @Param('id') id: string) {
    try {
      const result = await this.notificationService.retryNotification(id, req.tenantId!);
      if (!result) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Notification not found' } };
      }
      return { success: true, data: this.toSummary(result) };
    } catch (error: any) {
      return { success: false, error: { code: 'RETRY_FAILED', message: error.message } };
    }
  }

  @Post('retry-all-failed')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('notification:retry')
  async retryAllFailed(
    @Req() req: RequestWithTenant,
    @Body() body: { maxRetries?: number },
  ) {
    const result = await this.notificationService.retryAllFailed({ tenantId: req.tenantId!, maxRetries: body.maxRetries });
    return { success: true, data: result };
  }

  // Bulk notification endpoint
  @Post('bulk')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('notification:send')
  async sendBulk(
    @Req() req: RequestWithTenant,
    @Headers() headers: Record<string, any>,
    @Body() body: {
      channel: NotificationChannel;
      type: NotificationType;
      recipients: string[];
      message: string;
      scheduledAt?: Date;
      metadata?: Record<string, any>;
      userId?: string;
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `bulk-${Date.now()}`;
    const result = await this.notificationService.sendBulkNotifications({
      ...body,
      tenantId: req.tenantId!,
      correlationId,
    });
    return { success: true, data: result, correlationId };
  }

  // Webhook for delivery status callbacks
  @Post('webhooks/delivery')
  @UseGuards(CallbackAuthGuard)
  async handleDeliveryCallback(
    @Body() body: {
      notificationId: string;
      provider: string;
      status: 'delivered' | 'failed' | 'bounced' | 'complained';
      timestamp?: Date;
      details?: Record<string, any>;
      tenantId?: string;
    },
  ) {
    const result = await this.notificationService.handleDeliveryCallback(body);
    if (!result) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Notification not found' } };
    }
    return { success: true, data: this.toSummary(result) };
  }

  // Seed default templates endpoint
  @Post('templates/seed-defaults')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('notification:templates:manage')
  async seedDefaultTemplates(@Req() req: RequestWithTenant) {
    const result = await this.notificationService.seedDefaultTemplates(req.tenantId!);
    return { success: true, data: result };
  }

  // Push notification endpoint
  @Post('push')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('notification:send')
  async sendPush(
    @Req() req: RequestWithTenant,
    @Headers() headers: Record<string, any>,
    @Body() body: {
      subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
      title: string;
      body: string;
      type?: NotificationType;
      metadata?: Record<string, any>;
      userId?: string;
      correlationId?: string;
    },
  ) {
    if (!body.subscription?.endpoint || !body.subscription?.keys?.p256dh || !body.subscription?.keys?.auth) {
      throw new BadRequestException('Valid push subscription (endpoint, keys.p256dh, keys.auth) is required');
    }
    if (!body.title || !body.body) {
      throw new BadRequestException('title and body are required');
    }
    const correlationId = headers['x-correlation-id'] || body.correlationId || `push-${Date.now()}`;
    const result = await this.notificationService.sendPushNotification({
      tenantId: req.tenantId!,
      userId: body.userId,
      correlationId,
      subscription: body.subscription,
      title: body.title,
      body: body.body,
      type: body.type,
      metadata: body.metadata,
    });
    return { success: true, data: this.toSummary(result), correlationId };
  }

  // Provider health-check endpoints
  @Get('health/providers')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('notification:view')
  async checkProvidersHealth() {
    const smsProviderName = process.env.SMS_PROVIDER || 'kavenegar';
    const emailProviderName = process.env.EMAIL_PROVIDER || 'sendgrid';
    const fallbackSmsProviderName = process.env.SMS_FALLBACK_PROVIDER || null;

    return {
      success: true,
      data: {
        sms: {
          provider: smsProviderName,
          configured: !!(process.env.KAVENEGAR_API_KEY || process.env.TWILIO_ACCOUNT_SID || process.env.MELLIPAYAMAK_USERNAME),
        },
        email: {
          provider: emailProviderName,
          configured: !!(process.env.SENDGRID_API_KEY || process.env.AWS_ACCESS_KEY_ID),
        },
        fallbackSms: {
          provider: fallbackSmsProviderName,
          configured: !!fallbackSmsProviderName,
        },
        push: {
          enabled: this.pushChannel.isEnabled(),
          vapidConfigured: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
        },
      },
    };
  }

  // Credential Vault endpoints
  @Get('credentials')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('notification:credentials:view')
  async listCredentials(
    @Req() req: RequestWithTenant,
    @Query('provider') provider?: string,
  ) {
    const rows = await this.credentialVault.listCredentials(req.tenantId!, provider);
    return {
      success: true,
      data: rows.map((r) => ({
        credentialId: r.credentialId,
        tenantId: r.tenantId,
        provider: r.provider,
        credentialType: r.credentialType,
        maskedValue: r.maskedValue,
        isActive: r.isActive,
        expiresAt: r.expiresAt,
        createdAt: r.createdAt,
      })),
    };
  }

  @Post('credentials')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('notification:credentials:manage')
  async setCredential(
    @Req() req: RequestWithTenant,
    @Body() body: { provider: CredentialProvider; credentialType: CredentialType; value: string; extra?: Record<string, string>; expiresAt?: string },
  ) {
    const record = await this.credentialVault.setCredential({
      tenantId: req.tenantId!,
      provider: body.provider,
      credentialType: body.credentialType,
      value: body.value,
      extra: body.extra,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });
    return {
      success: true,
      data: {
        credentialId: record.credentialId,
        provider: record.provider,
        credentialType: record.credentialType,
        maskedValue: record.maskedValue,
        isActive: record.isActive,
        expiresAt: record.expiresAt,
      },
    };
  }

  @Post('credentials/:credentialId/rotate')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('notification:credentials:manage')
  async rotateCredential(
    @Req() req: RequestWithTenant,
    @Param('credentialId') credentialId: string,
    @Body() body: { provider: CredentialProvider; credentialType: CredentialType; value: string; extra?: Record<string, string>; expiresAt?: string },
  ) {
    const existing = await this.credentialVault.getCredential(req.tenantId!, body.provider, body.credentialType);
    if (!existing || existing.credentialId !== credentialId) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Credential not found' } };
    }
    const record = await this.credentialVault.rotateCredential({
      tenantId: req.tenantId!,
      provider: existing.provider,
      credentialType: existing.credentialType,
      value: body.value,
      extra: body.extra,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });
    return {
      success: true,
      data: {
        credentialId: record.credentialId,
        provider: record.provider,
        credentialType: record.credentialType,
        maskedValue: record.maskedValue,
        isActive: record.isActive,
        expiresAt: record.expiresAt,
      },
    };
  }

  @Delete('credentials/:credentialId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('notification:credentials:manage')
  async deleteCredential(
    @Req() req: RequestWithTenant,
    @Param('credentialId') credentialId: string,
  ) {
    const deleted = await this.credentialVault.deleteCredential(credentialId);
    return { success: deleted, data: { credentialId, deleted } };
  }
}
