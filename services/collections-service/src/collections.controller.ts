import { Body, Controller, Get, Headers, Param, Post, Query, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { ReceivableService } from './receivable.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { auditLogger } from './audit.logger';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import * as crypto from 'crypto';

@Controller()
export class CollectionsController {
  constructor(
    private readonly collectionsService: CollectionsService,
    private readonly receivableService: ReceivableService,
  ) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private isNonEmptyString(x: any): x is string {
    return typeof x === 'string' && x.trim().length > 0;
  }

  @Post('/collections/plans')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('collections:plan_create')
  async createPlan(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('collections.plan.create.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 'collections:plan_create' });

    const errors: string[] = [];
    if (!this.isNonEmptyString(body?.idempotencyKey)) errors.push('idempotencyKey is required');
    if (!this.isNonEmptyString(body?.policyId)) errors.push('policyId is required');
    if (typeof body?.premiumAmount !== 'number' || !Number.isFinite(body.premiumAmount) || body.premiumAmount < 0) errors.push('premiumAmount must be a non-negative number');
    if (!Array.isArray(body?.installments) || body.installments.length === 0) errors.push('installments must be a non-empty array');

    if (Array.isArray(body?.installments)) {
      for (const [idx, it] of body.installments.entries()) {
        if (!this.isNonEmptyString(it?.dueDate)) errors.push(`installments[${idx}].dueDate is required`);
        if (typeof it?.amount !== 'number' || !Number.isFinite(it.amount) || it.amount <= 0) errors.push(`installments[${idx}].amount must be > 0`);
      }
    }

    if (errors.length > 0) {
      auditLogger.warn('collections.plan.create.validation_failed', { correlationId, tenantId, actorUserId: actor?.userId, action: 'collections:plan_create' });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: errors.join('; ') }, correlationId };
    }

    const result = await this.collectionsService.createPlan({
      correlationId,
      idempotencyKey: String(body.idempotencyKey),
      policyId: String(body.policyId),
      tenantId,
      brokerOrganizationId: body.brokerOrganizationId,
      premiumAmount: body.premiumAmount,
      currency: body.currency,
      installments: body.installments,
      meta: body.meta,
    });

    auditLogger.info('collections.plan.create.success', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'collections:plan_create',
      planId: result.plan.planId,
      policyId: result.plan.policyId,
    });

    return { success: true, data: result, correlationId };
  }

  @Get('/collections/plans/:planId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('collections:plan_view')
  async getPlan(@Req() req: any, @Headers() headers: Record<string, any>, @Param('planId') planId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('collections.plan.get.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 'collections:plan_view', planId });

    const plan = await this.collectionsService.getPlan(planId);
    if (!plan) {
      auditLogger.warn('collections.plan.get.not_found', { correlationId, tenantId, actorUserId: actor?.userId, action: 'collections:plan_view', planId });
      return { success: false, error: { code: 'NOT_FOUND', message: 'Plan not found' }, correlationId };
    }

    return { success: true, data: plan, correlationId };
  }

  @Get('/collections/plans')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('collections:plan_list')
  async listPlans(@Req() req: any, @Headers() headers: Record<string, any>, @Query() query: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    const limit = Math.min(parseInt(query?.limit || '50', 10) || 50, 200);
    const offset = parseInt(query?.offset || '0', 10) || 0;

    auditLogger.info('collections.plan.list.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 'collections:plan_list' });

    const res = await this.collectionsService.listPlans({
      policyId: this.isNonEmptyString(query?.policyId) ? String(query.policyId) : undefined,
      status: this.isNonEmptyString(query?.status) ? String(query.status) : undefined,
      tenantId,
      brokerOrganizationId: actor?.organizationId,
      limit,
      offset,
    });

    return { success: true, data: res.rows, pagination: { total: res.total, limit, offset }, correlationId };
  }

  @Get('/collections/installments/:installmentId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('collections:installment_view')
  async getInstallment(@Req() req: any, @Headers() headers: Record<string, any>, @Param('installmentId') installmentId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('collections.installment.get.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'collections:installment_view',
      installmentId,
    });

    const inst = await this.collectionsService.getInstallment(installmentId);
    if (!inst) {
      auditLogger.warn('collections.installment.get.not_found', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'collections:installment_view',
        installmentId,
      });
      return { success: false, error: { code: 'NOT_FOUND', message: 'Installment not found' }, correlationId };
    }

    return { success: true, data: inst, correlationId };
  }

  @Get('/collections/installments')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('collections:installment_list')
  async listInstallments(@Req() req: any, @Headers() headers: Record<string, any>, @Query() query: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    const limit = Math.min(parseInt(query?.limit || '50', 10) || 50, 200);
    const offset = parseInt(query?.offset || '0', 10) || 0;

    auditLogger.info('collections.installment.list.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 'collections:installment_list' });

    const res = await this.collectionsService.listInstallments({
      planId: this.isNonEmptyString(query?.planId) ? String(query.planId) : undefined,
      policyId: this.isNonEmptyString(query?.policyId) ? String(query.policyId) : undefined,
      status: this.isNonEmptyString(query?.status) ? String(query.status) : undefined,
      brokerOrganizationId: actor?.organizationId,
      limit,
      offset,
    });

    return { success: true, data: res.rows, pagination: { total: res.total, limit, offset }, correlationId };
  }

  @Post('/collections/installments/:installmentId/pay')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('collections:installment_pay')
  async payInstallment(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('installmentId') installmentId: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('collections.installment.pay.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'collections:installment_pay',
      installmentId,
    });

    try {
      const inst = await this.collectionsService.payInstallment({
        correlationId,
        installmentId,
        provider: body?.provider,
        providerRef: body?.providerRef,
        paidAt: body?.paidAt,
        details: body?.details,
        partialAmount: body?.partialAmount,
      });

      if (!inst) {
        auditLogger.warn('collections.installment.pay.not_found', {
          correlationId,
          tenantId,
          actorUserId: actor?.userId,
          action: 'collections:installment_pay',
          installmentId,
        });
        return { success: false, error: { code: 'NOT_FOUND', message: 'Installment not found' }, correlationId };
      }

      return { success: true, data: inst, correlationId };
    } catch (e: any) {
      if (e?.code === 'INVALID_STATE') {
        auditLogger.warn('collections.installment.pay.invalid_state', {
          correlationId,
          tenantId,
          actorUserId: actor?.userId,
          action: 'collections:installment_pay',
          installmentId,
        });
        return { success: false, error: { code: 'INVALID_STATE', message: e.message }, correlationId };
      }
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('collections.installment.pay.failed', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'collections:installment_pay',
        installmentId,
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to pay installment' }, correlationId };
    }
  }

  // Reminder endpoints
  @Get('/collections/installments/reminder/due')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('collections:installment_list')
  async getInstallmentsForReminder(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('daysBeforeDue') daysBeforeDue: string = '7',
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('collections.installment.reminder_due.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'collections:installment_list',
    });

    const days = parseInt(daysBeforeDue, 10) || 7;
    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10) || 0;

    const res = await this.collectionsService.getInstallmentsForReminder({
      daysBeforeDue: days,
      limit: lim,
      offset: off,
    });

    return { success: true, data: res.rows, pagination: { total: res.total, limit: lim, offset: off }, correlationId };
  }

  @Post('/collections/installments/:installmentId/reminder')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('collections:installment_pay')
  async sendReminder(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('installmentId') installmentId: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('collections.installment.remind.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'collections:installment_remind',
      installmentId,
    });

    try {
      const inst = await this.collectionsService.sendReminder({
        correlationId,
        installmentId,
        actorUserId: actor?.userId,
      });
      return { success: true, data: inst, correlationId };
    } catch (e: any) {
      if (e?.code === 'NOT_FOUND') {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Installment not found' }, correlationId };
      }
      if (e?.code === 'INVALID_STATE') {
        return { success: false, error: { code: 'INVALID_STATE', message: e.message }, correlationId };
      }
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('collections.installment.remind.failed', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'collections:installment_remind',
        installmentId,
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to send reminder' }, correlationId };
    }
  }

  @Get('/collections/installments/overdue')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('collections:installment_list')
  async getOverdueInstallments(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('gracePeriodDays') gracePeriodDays: string = '7',
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('collections.installment.overdue.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'collections:installment_list',
    });

    const days = parseInt(gracePeriodDays, 10) || 7;
    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10) || 0;

    const res = await this.collectionsService.getOverdueInstallments({
      gracePeriodDays: days,
      limit: lim,
      offset: off,
    });

    return { success: true, data: res.rows, pagination: { total: res.total, limit: lim, offset: off }, correlationId };
  }

  @Post('/collections/installments/:installmentId/overdue')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('collections:installment_pay')
  async markOverdue(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('installmentId') installmentId: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('collections.installment.mark_overdue.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'collections:installment_overdue',
      installmentId,
    });

    try {
      const inst = await this.collectionsService.markOverdue({
        correlationId,
        installmentId,
        gracePeriodDays: body?.gracePeriodDays || 7,
        actorUserId: actor?.userId,
      });
      return { success: true, data: inst, correlationId };
    } catch (e: any) {
      if (e?.code === 'NOT_FOUND') {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Installment not found' }, correlationId };
      }
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('collections.installment.mark_overdue.failed', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'collections:installment_overdue',
        installmentId,
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to mark overdue' }, correlationId };
    }
  }

  @Get('collections/installments/:installmentId/late-fee')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('collections:installment_view')
  async getLateFee(@Req() req: any, @Headers() headers: Record<string, any>, @Param('installmentId') installmentId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('collections.late_fee.get.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'collections:installment_view',
      installmentId,
    });

    try {
      const result = await this.collectionsService.calculateLateFees({ installmentId });
      return { success: true, data: result, correlationId };
    } catch (e: any) {
      auditLogger.warn('collections.late_fee.get.error', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'collections:installment_view',
        installmentId,
        error: e?.message,
      });
      return { success: false, error: { code: e?.code || 'INTERNAL_ERROR', message: e?.message || 'Failed to calculate late fee' }, correlationId };
    }
  }

  @Post('collections/installments/:installmentId/late-fee/apply')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('collections:installment_pay')
  async applyLateFee(@Req() req: any, @Headers() headers: Record<string, any>, @Param('installmentId') installmentId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('collections.late_fee.apply.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'collections:installment_pay',
      installmentId,
    });

    try {
      const result = await this.collectionsService.applyLateFee({
        correlationId,
        installmentId,
        actorUserId: actor?.userId ?? null,
      });
      return { success: true, data: result, correlationId };
    } catch (e: any) {
      auditLogger.warn('collections.late_fee.apply.error', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'collections:installment_pay',
        installmentId,
        error: e?.message,
      });
      return { success: false, error: { code: e?.code || 'INTERNAL_ERROR', message: e?.message || 'Failed to apply late fee' }, correlationId };
    }
  }

  // Gateway payment endpoints
  @Post('collections/installments/:installmentId/gateway/initiate')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('collections:installment_pay')
  async initiateGatewayPayment(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('installmentId') installmentId: string,
    @Body() body: { returnUrl?: string; cancelUrl?: string }
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('collections.gateway.initiate.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'collections:installment_pay',
      installmentId,
    });

    const errors: string[] = [];
    if (!this.isNonEmptyString(body?.returnUrl)) errors.push('returnUrl is required');
    if (!this.isNonEmptyString(body?.cancelUrl)) errors.push('cancelUrl is required');

    if (errors.length > 0) {
      auditLogger.warn('collections.gateway.initiate.validation_failed', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'collections:installment_pay',
        installmentId,
      });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: errors.join('; ') }, correlationId };
    }

    try {
      const result = await this.collectionsService.initiateGatewayPayment({
        correlationId,
        installmentId,
        returnUrl: body.returnUrl!,
        cancelUrl: body.cancelUrl!,
      });
      auditLogger.info('collections.gateway.initiate.success', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'collections:installment_pay',
        installmentId,
      });
      return { success: true, data: result, correlationId };
    } catch (e: any) {
      auditLogger.warn('collections.gateway.initiate.error', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'collections:installment_pay',
        installmentId,
        error: e?.message,
      });
      return { success: false, error: { code: e?.code || 'INTERNAL_ERROR', message: e?.message || 'Failed to initiate gateway payment' }, correlationId };
    }
  }

  @Post('collections/installments/:installmentId/gateway/verify')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('collections:installment_pay')
  async verifyGatewayPayment(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('installmentId') installmentId: string,
    @Body() body: { transactionId: string }
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('collections.gateway.verify.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'collections:installment_pay',
      installmentId,
      transactionId: body.transactionId,
    });

    if (!this.isNonEmptyString(body?.transactionId)) {
      auditLogger.warn('collections.gateway.verify.validation_failed', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'collections:installment_pay',
        installmentId,
      });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'transactionId is required' }, correlationId };
    }

    const result = await this.collectionsService.verifyGatewayPayment({
      correlationId,
      installmentId,
      transactionId: body.transactionId,
    });

    auditLogger.info('collections.gateway.verify.result', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'collections:installment_pay',
      installmentId,
      success: result.success,
    });

    return { success: result.success, data: result, correlationId };
  }

  @Post('collections/gateway/callback')
  async handleGatewayCallback(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Body() body: {
      transactionId: string;
      installmentId: string;
      status: 'success' | 'failed' | 'cancelled';
      gatewayData?: Record<string, any>;
    }
  ) {
    const correlationId = this.getCorrelationId(headers);

    const signature = headers['x-gateway-signature'] || headers['X-Gateway-Signature'];
    const collectionsSecret = process.env.COLLECTIONS_CALLBACK_SECRET;
    const pspSecret = process.env.PSP_CALLBACK_SECRET;
    const callbackSecret = collectionsSecret || pspSecret;
    if (!callbackSecret) {
      auditLogger.error('collections.gateway.callback.no_secret', undefined as any, { correlationId, action: 'collections:gateway_callback' });
      throw new UnauthorizedException({ success: false, error: { code: 'GATEWAY_NOT_CONFIGURED', message: 'Callback secret not configured' } });
    }
    if (!collectionsSecret && pspSecret) {
      auditLogger.warn('collections.gateway.callback.using_fallback_secret', { correlationId, action: 'collections:gateway_callback', message: 'COLLECTIONS_CALLBACK_SECRET not set, using PSP_CALLBACK_SECRET fallback' });
    }

    const rawBody = JSON.stringify(req?.body ?? body);
    const expectedSig = crypto.createHmac('sha256', callbackSecret).update(rawBody).digest('hex');
    if (!signature || signature.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      auditLogger.warn('collections.gateway.callback.invalid_signature', { correlationId, action: 'collections:gateway_callback' });
      throw new UnauthorizedException({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Gateway callback signature verification failed' } });
    }

    auditLogger.info('collections.gateway.callback.request', {
      correlationId,
      action: 'collections:gateway_callback',
      transactionId: body.transactionId,
      status: body.status,
    });

    if (!this.isNonEmptyString(body?.transactionId) || !this.isNonEmptyString(body?.installmentId) || !body?.status) {
      auditLogger.warn('collections.gateway.callback.validation_failed', {
        correlationId,
        action: 'collections:gateway_callback',
      });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'transactionId, installmentId, and status are required' }, correlationId };
    }

    const result = await this.collectionsService.handleGatewayCallback({
      correlationId,
      transactionId: body.transactionId,
      installmentId: body.installmentId,
      status: body.status,
      gatewayData: body.gatewayData,
    });

    auditLogger.info('collections.gateway.callback.result', {
      correlationId,
      action: 'collections:gateway_callback',
      success: result.success,
    });

    return { success: result.success, data: result, correlationId };
  }

  @Post('/collections/installments/:installmentId/link-receivable')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('collections:installment_link_receivable')
  async linkReceivable(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('installmentId') installmentId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('collections.installment.link_receivable.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'collections:installment_link_receivable',
      installmentId,
      receivableId: body?.receivableId,
    });

    try {
      const result = await this.receivableService.linkInstallmentToReceivable({
        correlationId,
        installmentId,
        receivableId: body?.receivableId,
      });
      return { success: true, data: result, correlationId };
    } catch (e: any) {
      if (e?.code === 'NOT_FOUND') {
        return { success: false, error: { code: 'NOT_FOUND', message: e.message }, correlationId };
      }
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to link receivable' }, correlationId };
    }
  }

  @Post('/collections/installments/:installmentId/sync-receivable')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('collections:installment_sync_receivable')
  async syncReceivable(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('installmentId') installmentId: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('collections.installment.sync_receivable.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'collections:installment_sync_receivable',
      installmentId,
    });

    try {
      const result = await this.receivableService.syncReceivableStatus({
        correlationId,
        installmentId,
      });
      return { success: true, data: result, correlationId };
    } catch (e: any) {
      if (e?.code === 'NOT_FOUND' || e?.code === 'NOT_LINKED') {
        return { success: false, error: { code: e.code, message: e.message }, correlationId };
      }
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to sync receivable' }, correlationId };
    }
  }

  @Get('/collections/receivables/reconciliation')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('collections:receivable_reconcile')
  async reconcileReceivables(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query() query: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('collections.receivable.reconciliation.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'collections:receivable_reconcile',
    });

    const result = await this.receivableService.reconcileInstallmentsWithReceivables({
      planId: this.isNonEmptyString(query?.planId) ? String(query.planId) : undefined,
      policyId: this.isNonEmptyString(query?.policyId) ? String(query.policyId) : undefined,
    });

    return { success: true, data: result, correlationId };
  }

  @Post('/collections/plans/:planId/publish-receivable-requests')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('collections:plan_publish_receivable_requests')
  async publishReceivableRequests(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('planId') planId: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('collections.plan.publish_receivable_requests.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'collections:plan_publish_receivable_requests',
      planId,
    });

    try {
      const result = await this.receivableService.publishReceivableCreationRequests({
        correlationId,
        planId,
      });
      return { success: true, data: result, correlationId };
    } catch (e: any) {
      if (e?.code === 'NOT_FOUND') {
        return { success: false, error: { code: 'NOT_FOUND', message: e.message }, correlationId };
      }
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to publish receivable requests' }, correlationId };
    }
  }

  @Post('/collections/installments/:installmentId/waive')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('collections:installment_pay')
  async waiveInstallment(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('installmentId') installmentId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('collections.installment.waive.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'collections:installment_pay',
      installmentId,
    });

    if (!this.isNonEmptyString(body?.reason)) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'reason is required' }, correlationId };
    }

    try {
      const inst = await this.collectionsService.waiveInstallment({
        correlationId,
        installmentId,
        reason: String(body.reason),
        actorUserId: actor?.userId ?? 'system',
      });
      return { success: true, data: inst, correlationId };
    } catch (e: any) {
      if (e?.code === 'NOT_FOUND') {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Installment not found' }, correlationId };
      }
      if (e?.code === 'INVALID_STATE') {
        return { success: false, error: { code: 'INVALID_STATE', message: e.message }, correlationId };
      }
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('collections.installment.waive.failed', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'collections:installment_pay',
        installmentId,
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to waive installment' }, correlationId };
    }
  }

  @Post('/collections/installments/:installmentId/reschedule')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('collections:installment_pay')
  async rescheduleInstallment(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('installmentId') installmentId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('collections.installment.reschedule.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'collections:installment_pay',
      installmentId,
    });

    if (!this.isNonEmptyString(body?.newDueDate)) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'newDueDate is required' }, correlationId };
    }
    if (!this.isNonEmptyString(body?.reason)) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'reason is required' }, correlationId };
    }

    try {
      const inst = await this.collectionsService.rescheduleInstallment({
        correlationId,
        installmentId,
        newDueDate: String(body.newDueDate),
        reason: String(body.reason),
        actorUserId: actor?.userId ?? 'system',
      });
      return { success: true, data: inst, correlationId };
    } catch (e: any) {
      if (e?.code === 'NOT_FOUND') {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Installment not found' }, correlationId };
      }
      if (e?.code === 'INVALID_STATE') {
        return { success: false, error: { code: 'INVALID_STATE', message: e.message }, correlationId };
      }
      if (e?.code === 'VALIDATION_ERROR') {
        return { success: false, error: { code: 'VALIDATION_ERROR', message: e.message }, correlationId };
      }
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('collections.installment.reschedule.failed', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'collections:installment_pay',
        installmentId,
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to reschedule installment' }, correlationId };
    }
  }
}
