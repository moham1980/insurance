import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards , Req} from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { SlaMonitorService } from './sla-monitor.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { auditLogger } from './audit.logger';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';

@Controller()
export class WorkItemsController {
  constructor(
    private readonly orchestratorService: OrchestratorService,
    private readonly slaMonitorService: SlaMonitorService,
  ) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  @Get('/work-items')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('work_items:list')
  async list(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('priority') priority?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;
    auditLogger.info('work_items.list.request', { correlationId, tenantId, actor, action: 'work_items:list' });

    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10);

    const { rows, total } = await this.orchestratorService.listWorkItems({
      tenantId: String(tenantId),
      status,
      assignedTo,
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

  @Get('/work-items/:workItemId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('work_items:view')
  async get(@Headers() headers: Record<string, any>, @Req() req: any, @Param('workItemId') workItemId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;
    auditLogger.info('work_items.get.request', { correlationId, tenantId, actor, action: 'work_items:view', workItemId });

    const workItem = await this.orchestratorService.getWorkItem(String(tenantId), workItemId);
    if (!workItem) {
      auditLogger.warn('work_items.get.not_found', { correlationId, tenantId, actor, action: 'work_items:view', workItemId });
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Work item not found' },
        correlationId,
      };
    }

    return { success: true, data: workItem, correlationId };
  }

  @Post('/work-items/:workItemId/complete')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('work_items:complete')
  async complete(@Headers() headers: Record<string, any>, @Req() req: any, @Param('workItemId') workItemId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;
    auditLogger.info('work_items.complete.request', { correlationId, tenantId, actor, action: 'work_items:complete', workItemId });

    if (!body?.decision) {
      auditLogger.warn('work_items.complete.validation_failed', { correlationId, tenantId, actor, action: 'work_items:complete', workItemId });
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'decision is required' },
        correlationId,
      };
    }

    if ((body.decision === 'rejected' || body.decision === 'escalated') && (!body?.notes || String(body.notes).trim().length === 0)) {
      auditLogger.warn('work_items.complete.validation_failed', { correlationId, tenantId, actor, action: 'work_items:complete', workItemId });
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'notes is required for rejected/escalated decisions' },
        correlationId,
      };
    }

    // P0 security: always use the authenticated user from JWT as decidedBy.
    // body.decidedBy is ignored to prevent identity spoofing / IDOR.
    const decidedBy = actor;
    if (!decidedBy) {
      auditLogger.warn('work_items.complete.no_actor', { correlationId, tenantId, actor, action: 'work_items:complete', workItemId });
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Authenticated user identity is required (JWT sub)' },
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
        auditLogger.warn('work_items.complete.not_found', { correlationId, tenantId, actor, action: 'work_items:complete', workItemId });
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Work item not found' },
          correlationId,
        };
      }

      auditLogger.info('work_items.complete.success', {
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
        auditLogger.warn('work_items.complete.already_decided', { correlationId, tenantId, actor, action: 'work_items:complete', workItemId });
        return {
          success: false,
          error: { code: 'ALREADY_DECIDED', message: e.message },
          correlationId,
        };
      }

      if (e?.code === 'SOD_VIOLATION') {
        auditLogger.warn('work_items.complete.sod_violation', { correlationId, tenantId, actor, action: 'work_items:complete', workItemId });
        return {
          success: false,
          error: { code: 'SOD_VIOLATION', message: e.message },
          correlationId,
        };
      }

      if (e?.code === 'VALIDATION_ERROR') {
        auditLogger.warn('work_items.complete.validation_failed', { correlationId, tenantId, actor, action: 'work_items:complete', workItemId });
        return {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: e.message },
          correlationId,
        };
      }

      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('work_items.complete.failed', err, {
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

  @Post('/work-items/:workItemId/assign')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('work_items:assign')
  async assign(@Headers() headers: Record<string, any>, @Req() req: any, @Param('workItemId') workItemId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;
    auditLogger.info('work_items.assign.request', { correlationId, tenantId, actor, action: 'work_items:assign', workItemId });

    // Use req.user.userId for assignedTo if not provided in body
    const assignedTo = body?.assignedTo || actor;
    if (!assignedTo) {
      auditLogger.warn('work_items.assign.validation_failed', { correlationId, tenantId, actor, action: 'work_items:assign', workItemId });
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'assignedTo is required (provide in body)' },
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
        auditLogger.warn('work_items.assign.not_found', { correlationId, tenantId, actor, action: 'work_items:assign', workItemId });
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Work item not found' },
          correlationId,
        };
      }

      auditLogger.info('work_items.assign.success', {
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
      auditLogger.error('work_items.assign.failed', err, {
        correlationId,
        tenantId,
        actor,
        action: 'work_items:assign',
        workItemId,
      });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to assign work item' },
        correlationId,
      };
    }
  }

  @Post('/work-items/sanhab-followup')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('work_items:create_sanhab')
  async createSanhabFollowup(@Headers() headers: Record<string, any>, @Req() req: any, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('work_items.sanhab_followup.create.request', {
      correlationId,
      tenantId,
      actor,
      action: 'work_items:create_sanhab',
    });

    if (!body?.reasonCode || !body?.inquiry) {
      auditLogger.warn('work_items.sanhab_followup.create.validation_failed', {
        correlationId,
        tenantId,
        actor,
        action: 'work_items:create_sanhab',
      });
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'reasonCode and inquiry are required' },
        correlationId,
      };
    }

    const { saga, workItem } = await this.orchestratorService.createSanhabFollowupWorkItem({
        tenantId: String(tenantId),
        correlationId,
      policyId: body.policyId,
      claimId: body.claimId,
      reasonCode: String(body.reasonCode),
      inquiry: body.inquiry,
      result: body.result,
      priority: body.priority,
      submittedBy: actor, // P1 #5 (SoD): track submitter
    });

    auditLogger.info('work_items.sanhab_followup.create.success', {
      correlationId,
      tenantId,
      actor,
      action: 'work_items:create_sanhab',
      sagaId: saga.sagaId,
      workItemId: workItem.workItemId,
    });

    return {
      success: true,
      data: {
        sagaId: saga.sagaId,
        workItemId: workItem.workItemId,
      },
      correlationId,
    };
  }

  @Post('/work-items/underwriting-review')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('work_items:create_underwriting')
  async createUnderwritingReview(@Headers() headers: Record<string, any>, @Req() req: any, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('work_items.underwriting_review.create.request', {
      correlationId,
      tenantId,
      actor,
      action: 'work_items:create_underwriting',
    });

    if (!body?.policyId || !body?.reasonCode) {
      auditLogger.warn('work_items.underwriting_review.create.validation_failed', {
        correlationId,
        tenantId,
        actor,
        action: 'work_items:create_underwriting',
      });
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'policyId and reasonCode are required' },
        correlationId,
      };
    }

    const { saga, workItem } = await this.orchestratorService.createUnderwritingReviewWorkItem({
        tenantId: String(tenantId),
        correlationId,
      policyId: String(body.policyId),
      reasonCode: String(body.reasonCode),
      context: body.context && typeof body.context === 'object' ? body.context : undefined,
      priority: body.priority,
      dueDate: body.dueDate,
      submittedBy: actor, // P1 #5 (SoD): track submitter
    });

    auditLogger.info('work_items.underwriting_review.create.success', {
      correlationId,
      tenantId,
      actor,
      action: 'work_items:create_underwriting',
      sagaId: saga.sagaId,
      workItemId: workItem.workItemId,
    });

    return {
      success: true,
      data: {
        sagaId: saga.sagaId,
        workItemId: workItem.workItemId,
      },
      correlationId,
    };
  }

  @Post('/work-items/suspicious-case')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('work_items:create_suspicious_case')
  async createSuspiciousCase(@Headers() headers: Record<string, any>, @Req() req: any, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('work_items.suspicious_case.create.request', {
      correlationId,
      tenantId,
      actor,
      action: 'work_items:create_suspicious_case',
    });

    const hasPolicyId = typeof body?.policyId === 'string' && body.policyId.trim().length > 0;
    const hasClaimId = typeof body?.claimId === 'string' && body.claimId.trim().length > 0;
    const reasonCodes = Array.isArray(body?.reasonCodes) ? body.reasonCodes : undefined;
    if ((!hasPolicyId && !hasClaimId) || !Array.isArray(reasonCodes) || reasonCodes.length === 0) {
      auditLogger.warn('work_items.suspicious_case.create.validation_failed', {
        correlationId,
        tenantId,
        actor,
        action: 'work_items:create_suspicious_case',
      });
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'reasonCodes and (policyId or claimId) are required' },
        correlationId,
      };
    }

    try {
      const { saga, workItem } = await this.orchestratorService.createSuspiciousCaseWorkItem({
        tenantId: String(tenantId),
        correlationId,
        policyId: hasPolicyId ? String(body.policyId) : undefined,
        claimId: hasClaimId ? String(body.claimId) : undefined,
        reasonCodes: reasonCodes.map((x: any) => String(x)),
        explainability: body.explainability && typeof body.explainability === 'object' ? body.explainability : undefined,
        fraudScore: typeof body.fraudScore === 'number' ? body.fraudScore : undefined,
        priority: body.priority,
        dueDate: body.dueDate,
        createdBy: actor || null,
      });

      auditLogger.info('work_items.suspicious_case.create.success', {
        correlationId,
        tenantId,
        actor,
        action: 'work_items:create_suspicious_case',
        sagaId: saga.sagaId,
        workItemId: workItem.workItemId,
      });

      return {
        success: true,
        data: {
          sagaId: saga.sagaId,
          workItemId: workItem.workItemId,
        },
        correlationId,
      };
    } catch (e: any) {
      if (e?.code === 'VALIDATION_ERROR') {
        return { success: false, error: { code: 'VALIDATION_ERROR', message: e.message }, correlationId };
      }
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('work_items.suspicious_case.create.failed', err, {
        correlationId,
        tenantId,
        actor,
        action: 'work_items:create_suspicious_case',
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create suspicious case work item' }, correlationId };
    }
  }

  @Post('/work-items/override-review')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('work_items:create_override')
  async createOverrideReview(@Headers() headers: Record<string, any>, @Req() req: any, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('work_items.override_review.create.request', {
      correlationId,
      tenantId,
      actor,
      action: 'work_items:create_override',
    });

    const hasPolicyId = typeof body?.policyId === 'string' && body.policyId.trim().length > 0;
    const hasClaimId = typeof body?.claimId === 'string' && body.claimId.trim().length > 0;
    if ((!hasPolicyId && !hasClaimId) || !body?.reasonCode) {
      auditLogger.warn('work_items.override_review.create.validation_failed', {
        correlationId,
        tenantId,
        actor,
        action: 'work_items:create_override',
      });
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'reasonCode and (policyId or claimId) are required' },
        correlationId,
      };
    }

    const { saga, workItem } = await this.orchestratorService.createOverrideReviewWorkItem({
        tenantId: String(tenantId),
        correlationId,
      policyId: hasPolicyId ? String(body.policyId) : undefined,
      claimId: hasClaimId ? String(body.claimId) : undefined,
      reasonCode: String(body.reasonCode),
      context: body.context && typeof body.context === 'object' ? body.context : undefined,
      priority: body.priority,
      dueDate: body.dueDate,
      submittedBy: actor, // P1 #5 (SoD): track submitter
    });

    auditLogger.info('work_items.override_review.create.success', {
      correlationId,
      tenantId,
      actor,
      action: 'work_items:create_override',
      sagaId: saga.sagaId,
      workItemId: workItem.workItemId,
    });

    return {
      success: true,
      data: {
        sagaId: saga.sagaId,
        workItemId: workItem.workItemId,
      },
      correlationId,
    };
  }

  // SLA Monitoring Endpoints
  @Get('/work-items/sla/breaches')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('work_items:sla_view')
  async getSlaBreaches(@Headers() headers: Record<string, any>, @Req() req: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const { breached, metrics } = await this.slaMonitorService.checkSlaBreaches(tenantId);

    return {
      success: true,
      data: {
        breached,
        metrics,
      },
      correlationId,
    };
  }

  @Post('/work-items/sla/process-breaches')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('work_items:sla_manage')
  async processSlaBreaches(@Headers() headers: Record<string, any>, @Req() req: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('work_items.sla.process_breaches.request', {
      correlationId,
      tenantId,
      actor,
      action: 'work_items:sla_manage',
    });

    const result = await this.slaMonitorService.processSlaBreaches(tenantId);

    auditLogger.info('work_items.sla.process_breaches.success', {
      correlationId,
      tenantId,
      actor,
      action: 'work_items:sla_manage',
      processed: result.processed,
      escalated: result.escalated,
    });

    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Get('/work-items/sla/stats/:sagaId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('work_items:sla_view')
  async getSlaStats(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('sagaId') sagaId: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;

    try {
      const stats = await this.slaMonitorService.getSlaStats(tenantId || '00000000-0000-0000-0000-000000000000', sagaId);
      return {
        success: true,
        data: stats,
        correlationId,
      };
    } catch (e: any) {
      if (e?.message === 'Saga not found') {
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
