import { Controller, Get, Post, Body, Param, Headers, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationChannel, NotificationType } from './entities/NotificationLog';
import { EmailTemplateType } from './entities/EmailTemplate';
import { SmsTemplateType } from './entities/SmsTemplate';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { TenantGuard } from './tenant.guard';
import { CallbackAuthGuard } from './callback-auth.guard';

interface RequestWithTenant {
  tenantId?: string;
  user?: any;
}

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

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
}
