import { Body, Controller, Headers, Post, Req, UseGuards } from '@nestjs/common';
import * as crypto from 'crypto';
import { PaymentsService } from './payments.service';
import { auditLogger } from './audit.logger';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { TenantGuard } from './tenant.guard';
import { RequirePermissions } from './permissions.decorator';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
export class GatewayCallbackController {
  constructor(private readonly paymentsService: PaymentsService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  @Post('/payments/gateway/callback')
  @RequirePermissions('payments:gateway_callback')
  async handleGatewayCallback(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.tenantId ?? req?.user?.tenantId ?? req?.user?.tenant_id;
    const actor = req?.user || {};

    auditLogger.info('payments.gateway.callback.request', { correlationId, tenantId, actorUserId: actor?.sub || actor?.userId });

    if (!tenantId) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Tenant identifier required' }, correlationId };
    }

    if (!body?.gatewayPaymentId || !body?.status) {
      auditLogger.warn('payments.gateway.callback.validation_failed', { correlationId, tenantId });
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'gatewayPaymentId and status are required' },
        correlationId,
      };
    }

    if (!['success', 'failed', 'pending'].includes(body.status)) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'status must be one of success, failed, pending' },
        correlationId,
      };
    }

    const callbackSecret = process.env.PSP_CALLBACK_SECRET;
    if (callbackSecret) {
      if (!body.signature) {
        auditLogger.warn('payments.gateway.callback.hmac_missing', { correlationId, tenantId });
        return { success: false, error: { code: 'UNAUTHORIZED', message: 'Callback signature required' }, correlationId };
      }
      const expected = crypto
        .createHmac('sha256', callbackSecret)
        .update(`${body.gatewayPaymentId}:${body.gatewayRef || ''}:${body.status}`)
        .digest('hex');
      if (expected !== body.signature) {
        auditLogger.warn('payments.gateway.callback.hmac_failed', { correlationId, tenantId });
        return { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid callback signature' }, correlationId };
      }
    }

    try {
      const result = await this.paymentsService.handleGatewayCallback({
        tenantId,
        gatewayPaymentId: String(body.gatewayPaymentId),
        status: body.status,
        gatewayRef: body.gatewayRef,
        gatewayResponse: body.gatewayResponse,
        amount: typeof body.amount === 'number' ? body.amount : undefined,
        currency: body.currency,
        claimId: body.claimId,
      });

      if (body.status === 'pending') {
        return { success: true, data: { acknowledged: true, state: 'pending' }, correlationId };
      }

      if (!result) {
        auditLogger.warn('payments.gateway.callback.not_found', { correlationId, tenantId });
        return { success: false, error: { code: 'NOT_FOUND', message: 'Payment intent not found' }, correlationId };
      }

      return { success: true, data: result, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('payments.gateway.callback.failed', err, { correlationId, tenantId });
      return { success: false, error: { code: e?.code || 'INTERNAL_ERROR', message: e?.message || 'Failed to handle gateway callback' }, correlationId };
    }
  }
}
