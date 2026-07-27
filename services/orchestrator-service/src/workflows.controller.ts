import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards , Req} from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { auditLogger } from './audit.logger';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';

@Controller()
export class WorkflowsController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  @Post('/workflows/processes/:processType/start')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('orchestrations:saga_start')
  async startProcess(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('processType') processType: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('workflows.process_start.request', {
      correlationId,
      tenantId,
      actor,
      action: 'orchestrations:saga_start',
      processType,
    });

    const claimId = body?.subject?.claimId || body?.claimId;
    const policyId = body?.subject?.policyId || body?.policyId;
    const complaintId = body?.subject?.complaintId || body?.complaintId;
    const recoveryId = body?.subject?.recoveryId || body?.recoveryId;
    const contractId = body?.subject?.contractId || body?.contractId;
    const context = body?.inputs ?? body?.context;

    const sagaType = String(processType || '').trim() as
      | 'ClaimPayment'
      | 'PolicyIssuance'
      | 'ComplaintHandling'
      | 'ComplaintResolution'
      | 'ReinsuranceRecovery';

    const allowed: Record<string, true> = {
      ClaimPayment: true,
      PolicyIssuance: true,
      ComplaintHandling: true,
      ComplaintResolution: true,
      ReinsuranceRecovery: true,
    };

    if (!processType) {
      auditLogger.warn('workflows.process_start.validation_failed', {
        correlationId,
        tenantId,
        actor,
        action: 'orchestrations:saga_start',
        processType,
      });
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'processType is required' },
        correlationId,
      };
    }

    if (!allowed[sagaType]) {
      auditLogger.warn('workflows.process_start.not_supported', {
        correlationId,
        tenantId,
        actor,
        action: 'orchestrations:saga_start',
        processType,
      });
      return {
        success: false,
        error: { code: 'NOT_SUPPORTED', message: 'processType not supported' },
        correlationId,
      };
    }

    if (sagaType === 'ClaimPayment' && !claimId) {
      auditLogger.warn('workflows.process_start.validation_failed', {
        correlationId,
        tenantId,
        actor,
        action: 'orchestrations:saga_start',
        processType,
      });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'subject.claimId is required for ClaimPayment' }, correlationId };
    }

    if (sagaType === 'PolicyIssuance' && !policyId) {
      auditLogger.warn('workflows.process_start.validation_failed', {
        correlationId,
        tenantId,
        actor,
        action: 'orchestrations:saga_start',
        processType,
      });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'subject.policyId is required for PolicyIssuance' }, correlationId };
    }

    if ((sagaType === 'ComplaintHandling' || sagaType === 'ComplaintResolution') && !complaintId) {
      auditLogger.warn('workflows.process_start.validation_failed', {
        correlationId,
        tenantId,
        actor,
        action: 'orchestrations:saga_start',
        processType,
      });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'subject.complaintId is required for ComplaintHandling/ComplaintResolution' }, correlationId };
    }

    if (sagaType === 'ReinsuranceRecovery' && !recoveryId) {
      auditLogger.warn('workflows.process_start.validation_failed', {
        correlationId,
        tenantId,
        actor,
        action: 'orchestrations:saga_start',
        processType,
      });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'subject.recoveryId is required for ReinsuranceRecovery' }, correlationId };
    }

    try {
      const saga = await this.orchestratorService.startSaga({
        tenantId: String(tenantId),
        sagaType,
        correlationId,
        claimId: claimId ?? null,
        policyId: policyId ?? null,
        complaintId: complaintId ?? null,
        recoveryId: recoveryId ?? null,
        contractId: contractId ?? null,
        context,
      });

      auditLogger.info('workflows.process_start.success', {
        correlationId,
        tenantId,
        actor,
        action: 'orchestrations:saga_start',
        processInstanceId: saga.sagaId,
        processType: saga.sagaType,
        status: saga.status,
      });

      return {
        success: true,
        data: {
          processInstanceId: saga.sagaId,
          processType: saga.sagaType,
          status: saga.status,
          currentStep: saga.currentStep,
          sagaId: saga.sagaId,
          sagaType: saga.sagaType,
        },
        correlationId,
      };
    } catch (e: any) {
      if (e?.code === 'VALIDATION_ERROR') {
        auditLogger.warn('workflows.process_start.validation_failed', {
          correlationId,
          tenantId,
          actor,
          action: 'orchestrations:saga_start',
          processType,
        });
        return {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: e.message },
          correlationId,
        };
      }

      if (e?.code === 'NOT_SUPPORTED') {
        auditLogger.warn('workflows.process_start.not_supported', {
          correlationId,
          tenantId,
          actor,
          action: 'orchestrations:saga_start',
          processType,
        });
        return {
          success: false,
          error: { code: 'NOT_SUPPORTED', message: e.message },
          correlationId,
        };
      }

      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('workflows.process_start.failed', err, {
        correlationId,
        tenantId,
        actor,
        action: 'orchestrations:saga_start',
        processType,
      });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to start process' },
        correlationId,
      };
    }
  }

  @Get('/workflows/processes/:processInstanceId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('orchestrations:saga_view')
  async getProcess(@Headers() headers: Record<string, any>, @Req() req: any, @Param('processInstanceId') processInstanceId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('workflows.process_get.request', {
      correlationId,
      tenantId,
      actor,
      action: 'orchestrations:saga_view',
      processInstanceId,
    });

    const saga = await this.orchestratorService.getSaga(String(tenantId), processInstanceId);
    if (!saga) {
      auditLogger.warn('workflows.process_get.not_found', {
        correlationId,
        tenantId,
        actor,
        action: 'orchestrations:saga_view',
        processInstanceId,
      });
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Process not found' },
        correlationId,
      };
    }

    return {
      success: true,
      data: {
        processInstanceId: saga.sagaId,
        processType: saga.sagaType,
        status: saga.status,
        currentStep: saga.currentStep,
        saga,
      },
      correlationId,
    };
  }

  @Get('/workflows/work-items')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('work_items:list')
  async listWorkItems(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Query('state') state?: string,
    @Query('assigneeUserId') assigneeUserId?: string,
    @Query('priority') priority?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('workflows.work_items.list.request', {
      correlationId,
      tenantId,
      actor,
      action: 'work_items:list',
    });

    const status = state === 'open' ? 'pending' : state;

    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10);

    const { rows, total } = await this.orchestratorService.listWorkItems({
      tenantId: String(tenantId),
      status,
      assignedTo: assigneeUserId,
      priority,
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

  @Post('/workflows/work-items/:workItemId/claim')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('work_items:assign')
  async claimWorkItem(@Headers() headers: Record<string, any>, @Req() req: any, @Param('workItemId') workItemId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('workflows.work_items.claim.request', {
      correlationId,
      tenantId,
      actor,
      action: 'work_items:assign',
      workItemId,
    });

    const assignedTo = body?.assigneeUserId || actor;
    if (!assignedTo) {
      auditLogger.warn('workflows.work_items.claim.validation_failed', {
        correlationId,
        tenantId,
        actor,
        action: 'work_items:assign',
        workItemId,
      });
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'assigneeUserId is required (provide in body)' },
        correlationId,
      };
    }

    try {
      const workItem = await this.orchestratorService.assignWorkItem({
        tenantId: String(tenantId),
        correlationId,
        workItemId,
        assignedTo,
      });

      if (!workItem) {
        auditLogger.warn('workflows.work_items.claim.not_found', {
          correlationId,
          tenantId,
          actor,
          action: 'work_items:assign',
          workItemId,
        });
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Work item not found' },
          correlationId,
        };
      }

      auditLogger.info('workflows.work_items.claim.success', {
        correlationId,
        tenantId,
        actor,
        action: 'work_items:assign',
        workItemId: workItem.workItemId,
        assignedTo: workItem.assignedTo,
        status: workItem.status,
      });

      return {
        success: true,
        data: {
          workItemId: workItem.workItemId,
          assignedTo: workItem.assignedTo,
          status: workItem.status,
        },
        correlationId,
      };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('workflows.work_items.claim.failed', err, {
        correlationId,
        tenantId,
        actor,
        action: 'work_items:assign',
        workItemId,
      });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to claim work item' },
        correlationId,
      };
    }
  }

  @Post('/workflows/work-items/:workItemId/complete')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('work_items:complete')
  async completeWorkItem(@Headers() headers: Record<string, any>, @Req() req: any, @Param('workItemId') workItemId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('workflows.work_items.complete.request', {
      correlationId,
      tenantId,
      actor,
      action: 'work_items:complete',
      workItemId,
    });

    if (!body?.decision) {
      auditLogger.warn('workflows.work_items.complete.validation_failed', {
        correlationId,
        tenantId,
        actor,
        action: 'work_items:complete',
        workItemId,
      });
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'decision is required' },
        correlationId,
      };
    }

    const decidedBy = body.decidedBy || actor;
    if (!decidedBy) {
      auditLogger.warn('workflows.work_items.complete.no_actor', {
        correlationId,
        tenantId,
        actor,
        action: 'work_items:complete',
        workItemId,
      });
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'decidedBy is required (provide in body)' },
        correlationId,
      };
    }

    try {
      const result = await this.orchestratorService.completeWorkItem({
        tenantId: String(tenantId),
        correlationId,
        workItemId,
        decision: body.decision,
        decidedBy,
        notes: body.notes,
        result: body.result,
      });

      if (!result) {
        auditLogger.warn('workflows.work_items.complete.not_found', {
          correlationId,
          tenantId,
          actor,
          action: 'work_items:complete',
          workItemId,
        });
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Work item not found' },
          correlationId,
        };
      }

      auditLogger.info('workflows.work_items.complete.success', {
        correlationId,
        tenantId,
        actor,
        action: 'work_items:complete',
        workItemId: result.workItem.workItemId,
        status: result.workItem.status,
        sagaId: result.workItem.sagaId,
      });

      return {
        success: true,
        data: {
          workItemId: result.workItem.workItemId,
          status: result.workItem.status,
          sagaId: result.workItem.sagaId,
        },
        correlationId,
      };
    } catch (e: any) {
      if (e?.code === 'ALREADY_DECIDED') {
        auditLogger.warn('workflows.work_items.complete.already_decided', {
          correlationId,
          tenantId,
          actor,
          action: 'work_items:complete',
          workItemId,
        });
        return {
          success: false,
          error: { code: 'ALREADY_DECIDED', message: e.message },
          correlationId,
        };
      }

      if (e?.code === 'VALIDATION_ERROR') {
        auditLogger.warn('workflows.work_items.complete.validation_failed', {
          correlationId,
          tenantId,
          actor,
          action: 'work_items:complete',
          workItemId,
        });
        return {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: e.message },
          correlationId,
        };
      }

      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('workflows.work_items.complete.failed', err, {
        correlationId,
        tenantId,
        actor,
        action: 'work_items:complete',
        workItemId,
      });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to complete work item' },
        correlationId,
      };
    }
  }
}
