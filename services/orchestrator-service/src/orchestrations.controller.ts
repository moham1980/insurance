import { Body, Controller, Get, Headers, Param, Post, UseGuards , Req} from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { auditLogger } from './audit.logger';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';

@Controller()
export class OrchestrationsController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  @Post('/orchestrations/sagas')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('orchestrations:saga_start')
  async startSaga(@Headers() headers: Record<string, any>, @Req() req: any, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;
    auditLogger.info('orchestrations.saga_start.request', { correlationId, tenantId, actor, action: 'orchestrations:saga_start' });

    if (!body?.sagaType) {
      auditLogger.warn('orchestrations.saga_start.validation_failed', { correlationId, tenantId, actor, action: 'orchestrations:saga_start' });
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'sagaType is required' },
        correlationId,
      };
    }

    const sagaTypeRaw = String(body.sagaType || '').trim();
    const allowed: Record<string, true> = {
      ClaimPayment: true,
      PolicyIssuance: true,
      ComplaintHandling: true,
      ComplaintResolution: true,
      ReinsuranceRecovery: true,
    };

    if (!allowed[sagaTypeRaw]) {
      auditLogger.warn('orchestrations.saga_start.not_supported', { correlationId, tenantId, actor, action: 'orchestrations:saga_start', sagaType: sagaTypeRaw });
      return {
        success: false,
        error: { code: 'NOT_SUPPORTED', message: 'sagaType not supported' },
        correlationId,
      };
    }

    const sagaType = sagaTypeRaw as 'ClaimPayment' | 'PolicyIssuance' | 'ComplaintHandling' | 'ComplaintResolution' | 'ReinsuranceRecovery';

    if (sagaType === 'ClaimPayment' && !body?.claimId) {
      auditLogger.warn('orchestrations.saga_start.validation_failed', { correlationId, tenantId, actor, action: 'orchestrations:saga_start', sagaType });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'claimId is required for ClaimPayment' }, correlationId };
    }
    if (sagaType === 'PolicyIssuance' && !body?.policyId) {
      auditLogger.warn('orchestrations.saga_start.validation_failed', { correlationId, tenantId, actor, action: 'orchestrations:saga_start', sagaType });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'policyId is required for PolicyIssuance' }, correlationId };
    }
    if ((sagaType === 'ComplaintHandling' || sagaType === 'ComplaintResolution') && !body?.complaintId) {
      auditLogger.warn('orchestrations.saga_start.validation_failed', { correlationId, tenantId, actor, action: 'orchestrations:saga_start', sagaType });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'complaintId is required for ComplaintHandling/ComplaintResolution' }, correlationId };
    }
    if (sagaType === 'ReinsuranceRecovery' && !body?.recoveryId) {
      auditLogger.warn('orchestrations.saga_start.validation_failed', { correlationId, tenantId, actor, action: 'orchestrations:saga_start', sagaType });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'recoveryId is required for ReinsuranceRecovery' }, correlationId };
    }

    try {
      const saga = await this.orchestratorService.startSaga({
        tenantId: String(tenantId),
        sagaType,
        correlationId,
        claimId: body.claimId ?? null,
        policyId: body.policyId ?? null,
        complaintId: body.complaintId ?? null,
        recoveryId: body.recoveryId ?? null,
        contractId: body.contractId ?? null,
        context: body.context,
      });

      auditLogger.info('orchestrations.saga_start.success', {
        correlationId,
        tenantId,
        actor,
        action: 'orchestrations:saga_start',
        sagaId: saga.sagaId,
        sagaType: saga.sagaType,
        status: saga.status,
      });

      return {
        success: true,
        data: {
          sagaId: saga.sagaId,
          sagaType: saga.sagaType,
          status: saga.status,
          currentStep: saga.currentStep,
        },
        correlationId,
      };
    } catch (e: any) {
      if (e?.code === 'VALIDATION_ERROR') {
        auditLogger.warn('orchestrations.saga_start.validation_failed', { correlationId, tenantId, actor, action: 'orchestrations:saga_start', sagaType: body?.sagaType });
        return {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: e.message },
          correlationId,
        };
      }

      if (e?.code === 'NOT_SUPPORTED') {
        auditLogger.warn('orchestrations.saga_start.not_supported', { correlationId, tenantId, actor, action: 'orchestrations:saga_start', sagaType: body?.sagaType });
        return {
          success: false,
          error: { code: 'NOT_SUPPORTED', message: e.message },
          correlationId,
        };
      }

      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('orchestrations.saga_start.failed', err, {
        correlationId,
        tenantId,
        actor,
        action: 'orchestrations:saga_start',
      });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to start saga' },
        correlationId,
      };
    }
  }

  @Get('/orchestrations/sagas/:sagaId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('orchestrations:saga_view')
  async getSaga(@Headers() headers: Record<string, any>, @Req() req: any, @Param('sagaId') sagaId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;
    auditLogger.info('orchestrations.saga_get.request', { correlationId, tenantId, actor, action: 'orchestrations:saga_view', sagaId });

    const saga = await this.orchestratorService.getSaga(String(tenantId), sagaId);
    if (!saga) {
      auditLogger.warn('orchestrations.saga_get.not_found', { correlationId, tenantId, actor, action: 'orchestrations:saga_view', sagaId });
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Saga not found' },
        correlationId,
      };
    }

    return { success: true, data: saga, correlationId };
  }

  // Saga Compensation/Rollback Endpoints
  @Post('/orchestrations/sagas/:sagaId/compensation')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('orchestrations:saga_compensate')
  async initiateCompensation(@Headers() headers: Record<string, any>, @Req() req: any, @Param('sagaId') sagaId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('orchestrations.saga_compensation.request', {
      correlationId,
      tenantId,
      actor,
      action: 'orchestrations:saga_compensate',
      sagaId,
    });

    if (!body?.reason) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'reason is required' },
        correlationId,
      };
    }

    try {
      const saga = await this.orchestratorService.initiateCompensation(String(tenantId), sagaId, body.reason, actor);
      return { success: true, data: saga, correlationId };
    } catch (e: any) {
      if (e?.code === 'NOT_FOUND') {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Saga not found' },
          correlationId,
        };
      }
      if (e?.code === 'INVALID_STATE') {
        return {
          success: false,
          error: { code: 'INVALID_STATE', message: e.message },
          correlationId,
        };
      }
      throw e;
    }
  }

  @Post('/orchestrations/sagas/:sagaId/compensation/retry')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('orchestrations:saga_compensate')
  async retryCompensation(@Headers() headers: Record<string, any>, @Req() req: any, @Param('sagaId') sagaId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('orchestrations.saga_compensation_retry.request', {
      correlationId,
      tenantId,
      actor,
      action: 'orchestrations:saga_compensate',
      sagaId,
    });

    try {
      const saga = await this.orchestratorService.retryCompensation(String(tenantId), sagaId);
      return { success: true, data: saga, correlationId };
    } catch (e: any) {
      if (e?.code === 'NOT_FOUND') {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Saga not found' },
          correlationId,
        };
      }
      if (e?.code === 'INVALID_STATE') {
        return {
          success: false,
          error: { code: 'INVALID_STATE', message: e.message },
          correlationId,
        };
      }
      throw e;
    }
  }

  @Get('/orchestrations/sagas/:sagaId/compensation/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('orchestrations:saga_view')
  async getCompensationStatus(@Headers() headers: Record<string, any>, @Req() req: any, @Param('sagaId') sagaId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('orchestrations.saga_compensation_status.request', {
      correlationId,
      tenantId,
      actor,
      action: 'orchestrations:saga_view',
      sagaId,
    });

    try {
      const status = await this.orchestratorService.getCompensationStatus(String(tenantId), sagaId);
      return { success: true, data: status, correlationId };
    } catch (e: any) {
      if (e?.code === 'NOT_FOUND') {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Saga not found' },
          correlationId,
        };
      }
      throw e;
    }
  }
}
