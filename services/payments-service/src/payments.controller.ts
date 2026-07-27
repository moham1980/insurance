import { Body, Controller, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { auditLogger } from './audit.logger';
import { TenantGuard } from './tenant.guard';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getActor(req: any): { userId?: string; tenantId?: string } {
    const user = req?.user || {};
    return {
      userId: user.sub || user.userId || user.preferred_username,
      tenantId: req?.tenantId ?? user.tenantId ?? user.tenant_id,
    };
  }

  @Post('/payments/prepare')
  @RequirePermissions('payments:prepare')
  async prepare(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const actor = this.getActor(req);

    auditLogger.info('payments.prepare.request', { correlationId, tenantId: actor.tenantId, actorUserId: actor.userId, action: 'payments:prepare' });

    if (!actor.tenantId) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Tenant identifier required' }, correlationId };
    }

    if (!body?.idempotencyKey || !body?.claimId || typeof body?.amount !== 'number') {
      auditLogger.warn('payments.prepare.validation_failed', { correlationId, tenantId: actor.tenantId, actorUserId: actor.userId, action: 'payments:prepare' });
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'idempotencyKey, claimId, amount are required' },
        correlationId,
      };
    }

    const intent = await this.paymentsService.preparePayment({
      correlationId,
      tenantId: actor.tenantId,
      idempotencyKey: String(body.idempotencyKey),
      claimId: String(body.claimId),
      amount: body.amount,
      currency: body.currency,
      preparedByUserId: actor.userId,
      beneficiaryPartyId: body.beneficiaryPartyId,
      destinationIban: body.destinationIban,
      paymentDocs: body.paymentDocs,
      isPartial: body.isPartial,
      partialIndex: body.partialIndex,
      totalPartialCount: body.totalPartialCount,
    });

    auditLogger.info('payments.prepare.success', {
      correlationId,
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action: 'payments:prepare',
      paymentIntentId: intent.paymentIntentId,
      claimId: intent.claimId,
    });

    return { success: true, data: intent, correlationId };
  }

  @Post('/payments/:paymentIntentId/approve')
  @RequirePermissions('payments:approve')
  async approve(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('paymentIntentId') paymentIntentId: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const actor = this.getActor(req);

    auditLogger.info('payments.approve.request', {
      correlationId,
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action: 'payments:approve',
      paymentIntentId,
    });

    if (!actor.tenantId) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Tenant identifier required' }, correlationId };
    }

    try {
      const intent = await this.paymentsService.financeApprove({
        correlationId,
        tenantId: actor.tenantId,
        paymentIntentId,
        approverUserId: actor.userId,
        decisionNotes: body?.decisionNotes,
      });

      if (!intent) {
        auditLogger.warn('payments.approve.not_found', {
          correlationId,
          tenantId: actor.tenantId,
          actorUserId: actor.userId,
          action: 'payments:approve',
          paymentIntentId,
        });
        return { success: false, error: { code: 'NOT_FOUND', message: 'Payment intent not found' }, correlationId };
      }

      return { success: true, data: intent, correlationId };
    } catch (e: any) {
      if (e?.code === 'INVALID_STATE' || e?.code === 'SOD_VIOLATION') {
        auditLogger.warn('payments.approve.invalid_state', {
          correlationId,
          tenantId: actor.tenantId,
          actorUserId: actor.userId,
          action: 'payments:approve',
          paymentIntentId,
        });
        return { success: false, error: { code: e.code, message: e.message }, correlationId };
      }
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('payments.approve.failed', err, {
        correlationId,
        tenantId: actor.tenantId,
        actorUserId: actor.userId,
        action: 'payments:approve',
        paymentIntentId,
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to approve payment' }, correlationId };
    }
  }

  @Post('/payments/:paymentIntentId/execute')
  @RequirePermissions('payments:execute')
  async execute(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('paymentIntentId') paymentIntentId: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const actor = this.getActor(req);

    auditLogger.info('payments.execute.request', {
      correlationId,
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action: 'payments:execute',
      paymentIntentId,
    });

    if (!actor.tenantId) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Tenant identifier required' }, correlationId };
    }

    try {
      const result = await this.paymentsService.execute({
        correlationId,
        tenantId: actor.tenantId,
        paymentIntentId,
        provider: body?.provider,
        providerRef: body?.providerRef,
        executedByUserId: actor.userId,
        fromAccountId: body?.fromAccountId,
        toAccountId: body?.toAccountId,
        paymentType: body?.paymentType,
        preferredRail: body?.preferredRail,
        reference: body?.reference,
        description: body?.description,
        metadata: body?.metadata,
      });

      if (!result) {
        auditLogger.warn('payments.execute.not_found', {
          correlationId,
          tenantId: actor.tenantId,
          actorUserId: actor.userId,
          action: 'payments:execute',
          paymentIntentId,
        });
        return { success: false, error: { code: 'NOT_FOUND', message: 'Payment intent not found' }, correlationId };
      }

      return { success: true, data: result, correlationId };
    } catch (e: any) {
      if (e?.code === 'INVALID_STATE' || e?.code === 'NO_PAYMENT_PROVIDER' || e?.code === 'PSP_EXECUTE_FAILED') {
        auditLogger.warn('payments.execute.invalid_state', {
          correlationId,
          tenantId: actor.tenantId,
          actorUserId: actor.userId,
          action: 'payments:execute',
          paymentIntentId,
        });
        return { success: false, error: { code: e.code, message: e.message }, correlationId };
      }
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('payments.execute.failed', err, {
        correlationId,
        tenantId: actor.tenantId,
        actorUserId: actor.userId,
        action: 'payments:execute',
        paymentIntentId,
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to execute payment' }, correlationId };
    }
  }

  @Post('/payments/:paymentIntentId/fail')
  @RequirePermissions('payments:fail')
  async fail(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('paymentIntentId') paymentIntentId: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const actor = this.getActor(req);

    auditLogger.info('payments.fail.request', {
      correlationId,
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action: 'payments:fail',
      paymentIntentId,
    });

    if (!actor.tenantId) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Tenant identifier required' }, correlationId };
    }

    try {
      const result = await this.paymentsService.failPayment({
        correlationId,
        tenantId: actor.tenantId,
        paymentIntentId,
        reasonCode: body?.reasonCode,
        reasonMessage: body?.reasonMessage,
        failedByUserId: actor.userId,
      });

      if (!result) {
        auditLogger.warn('payments.fail.not_found', {
          correlationId,
          tenantId: actor.tenantId,
          actorUserId: actor.userId,
          action: 'payments:fail',
          paymentIntentId,
        });
        return { success: false, error: { code: 'NOT_FOUND', message: 'Payment intent not found' }, correlationId };
      }

      return { success: true, data: result, correlationId };
    } catch (e: any) {
      if (e?.code === 'INVALID_STATE') {
        auditLogger.warn('payments.fail.invalid_state', {
          correlationId,
          tenantId: actor.tenantId,
          actorUserId: actor.userId,
          action: 'payments:fail',
          paymentIntentId,
        });
        return { success: false, error: { code: 'INVALID_STATE', message: e.message }, correlationId };
      }
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('payments.fail.failed', err, {
        correlationId,
        tenantId: actor.tenantId,
        actorUserId: actor.userId,
        action: 'payments:fail',
        paymentIntentId,
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fail payment' }, correlationId };
    }
  }

  @Post('/payments/:paymentIntentId/notify')
  @RequirePermissions('payments:notify')
  async notify(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('paymentIntentId') paymentIntentId: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const actor = this.getActor(req);

    auditLogger.info('payments.notify.request', {
      correlationId,
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action: 'payments:notify',
      paymentIntentId,
    });

    if (!actor.tenantId) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Tenant identifier required' }, correlationId };
    }

    try {
      const intent = await this.paymentsService.notify({
        correlationId,
        tenantId: actor.tenantId,
        paymentIntentId,
        channel: body?.channel,
        details: body?.details,
      });

      if (!intent) {
        auditLogger.warn('payments.notify.not_found', {
          correlationId,
          tenantId: actor.tenantId,
          actorUserId: actor.userId,
          action: 'payments:notify',
          paymentIntentId,
        });
        return { success: false, error: { code: 'NOT_FOUND', message: 'Payment intent not found' }, correlationId };
      }

      return { success: true, data: intent, correlationId };
    } catch (e: any) {
      if (e?.code === 'INVALID_STATE') {
        auditLogger.warn('payments.notify.invalid_state', {
          correlationId,
          tenantId: actor.tenantId,
          actorUserId: actor.userId,
          action: 'payments:notify',
          paymentIntentId,
        });
        return { success: false, error: { code: 'INVALID_STATE', message: e.message }, correlationId };
      }
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('payments.notify.failed', err, {
        correlationId,
        tenantId: actor.tenantId,
        actorUserId: actor.userId,
        action: 'payments:notify',
        paymentIntentId,
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to notify payment' }, correlationId };
    }
  }

  @Get('/payments/:paymentIntentId')
  @RequirePermissions('payments:view')
  async get(@Req() req: any, @Headers() headers: Record<string, any>, @Param('paymentIntentId') paymentIntentId: string) {
    const correlationId = this.getCorrelationId(headers);
    const actor = this.getActor(req);

    auditLogger.info('payments.get.request', { correlationId, tenantId: actor.tenantId, actorUserId: actor.userId, action: 'payments:view', paymentIntentId });

    if (!actor.tenantId) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Tenant identifier required' }, correlationId };
    }

    const intent = await this.paymentsService.getIntent(paymentIntentId, actor.tenantId);
    if (!intent) {
      auditLogger.warn('payments.get.not_found', { correlationId, tenantId: actor.tenantId, actorUserId: actor.userId, action: 'payments:view', paymentIntentId });
      return { success: false, error: { code: 'NOT_FOUND', message: 'Payment intent not found' }, correlationId };
    }

    return { success: true, data: intent, correlationId };
  }

  @Get('/api/v1/ecosystem/payments/:paymentId')
  @RequirePermissions('payments:view')
  async getPaymentById(@Req() req: any, @Headers() headers: Record<string, any>, @Param('paymentId') paymentId: string) {
    const correlationId = this.getCorrelationId(headers);
    const actor = this.getActor(req);

    auditLogger.info('payments.get_by_id.request', { correlationId, tenantId: actor.tenantId, actorUserId: actor.userId, action: 'payments:view', paymentId });

    if (!actor.tenantId) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Tenant identifier required' }, correlationId };
    }

    const payment = await this.paymentsService.getPaymentById(paymentId, actor.tenantId);
    if (!payment) {
      auditLogger.warn('payments.get_by_id.not_found', { correlationId, tenantId: actor.tenantId, actorUserId: actor.userId, action: 'payments:view', paymentId });
      return { success: false, error: { code: 'NOT_FOUND', message: 'Payment not found' }, correlationId };
    }

    return { success: true, data: payment, correlationId };
  }

  @Get('/payments')
  @RequirePermissions('payments:list')
  async list(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('claimId') claimId?: string,
    @Query('status') status?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const actor = this.getActor(req);

    auditLogger.info('payments.list.request', { correlationId, tenantId: actor.tenantId, actorUserId: actor.userId, action: 'payments:list' });

    if (!actor.tenantId) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Tenant identifier required' }, correlationId };
    }

    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10);

    const { rows, total } = await this.paymentsService.listIntents({
      tenantId: actor.tenantId,
      claimId,
      status,
      limit: Number.isFinite(lim) ? lim : 50,
      offset: Number.isFinite(off) ? off : 0,
    });

    return {
      success: true,
      data: rows,
      pagination: {
        total,
        limit: Number.isFinite(lim) ? lim : 50,
        offset: Number.isFinite(off) ? off : 0,
      },
      correlationId,
    };
  }

  @Post('/payments/:paymentIntentId/gateway/initiate')
  @RequirePermissions('payments:execute')
  async initiateGatewayPayment(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('paymentIntentId') paymentIntentId: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const actor = this.getActor(req);

    auditLogger.info('payments.gateway.initiate.request', {
      correlationId,
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action: 'payments:execute',
      paymentIntentId,
    });

    if (!actor.tenantId) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Tenant identifier required' }, correlationId };
    }

    if (!body?.gatewayProvider) {
      auditLogger.warn('payments.gateway.initiate.validation_failed', {
        correlationId,
        tenantId: actor.tenantId,
        actorUserId: actor.userId,
        action: 'payments:execute',
      });
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'gatewayProvider is required' },
        correlationId,
      };
    }

    try {
      const result = await this.paymentsService.initiateGatewayPayment({
        correlationId,
        tenantId: actor.tenantId,
        paymentIntentId,
        gatewayProvider: body.gatewayProvider,
        gatewayConfig: body.gatewayConfig,
        returnUrl: body.returnUrl,
        cancelUrl: body.cancelUrl,
      });

      if (!result) {
        auditLogger.warn('payments.gateway.initiate.not_found', {
          correlationId,
          tenantId: actor.tenantId,
          actorUserId: actor.userId,
          action: 'payments:execute',
          paymentIntentId,
        });
        return { success: false, error: { code: 'NOT_FOUND', message: 'Payment intent not found' }, correlationId };
      }

      return { success: true, data: result, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('payments.gateway.initiate.failed', err, {
        correlationId,
        tenantId: actor.tenantId,
        actorUserId: actor.userId,
        action: 'payments:execute',
        paymentIntentId,
      });
      return { success: false, error: { code: e?.code || 'INTERNAL_ERROR', message: e?.message || 'Failed to initiate gateway payment' }, correlationId };
    }
  }

  @Post('/payments/reconcile')
  @RequirePermissions('payments:reconcile')
  async reconcile(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Body() body: { dateFrom: string; dateTo: string },
  ) {
    const correlationId = this.getCorrelationId(headers);
    const actor = this.getActor(req);

    auditLogger.info('payments.reconcile.request', { correlationId, tenantId: actor.tenantId, actorUserId: actor.userId, action: 'payments:reconcile' });

    if (!actor.tenantId) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Tenant identifier required' }, correlationId };
    }

    if (!body?.dateFrom || !body?.dateTo) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'dateFrom and dateTo are required' }, correlationId };
    }

    const result = await this.paymentsService.reconcilePayments({
      correlationId,
      tenantId: actor.tenantId,
      dateFrom: body.dateFrom,
      dateTo: body.dateTo,
    });

    return { ...result, correlationId };
  }

  @Post('/payments/:paymentId/refund')
  @RequirePermissions('payments:refund')
  async refund(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('paymentId') paymentId: string,
    @Body() body: { amount: number; reason?: string },
  ) {
    const correlationId = this.getCorrelationId(headers);
    const actor = this.getActor(req);

    auditLogger.info('payments.refund.request', { correlationId, tenantId: actor.tenantId, actorUserId: actor.userId, action: 'payments:refund', paymentId });

    if (!actor.tenantId) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Tenant identifier required' }, correlationId };
    }

    if (!paymentId || typeof body?.amount !== 'number') {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'paymentId and amount are required' }, correlationId };
    }

    const result = await this.paymentsService.refundPayment({
      correlationId,
      tenantId: actor.tenantId,
      paymentId,
      amount: body.amount,
      reason: body.reason,
    });

    return { ...result, correlationId };
  }

  @Post('/payments/:paymentId/dispute')
  @RequirePermissions('payments:dispute')
  async dispute(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('paymentId') paymentId: string,
    @Body() body: { reason: string; evidence?: Record<string, any> },
  ) {
    const correlationId = this.getCorrelationId(headers);
    const actor = this.getActor(req);

    auditLogger.info('payments.dispute.request', { correlationId, tenantId: actor.tenantId, actorUserId: actor.userId, action: 'payments:dispute', paymentId });

    if (!actor.tenantId) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Tenant identifier required' }, correlationId };
    }

    if (!paymentId || !body?.reason) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'paymentId and reason are required' }, correlationId };
    }

    const result = await this.paymentsService.createDispute({
      correlationId,
      tenantId: actor.tenantId,
      paymentId,
      reason: body.reason,
      evidence: body.evidence,
    });

    return { ...result, correlationId };
  }
}
