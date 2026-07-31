import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { UnderwritingService } from './underwriting.service';
import { EcosystemJwtGuard } from './ecosystem-jwt.guard';
import { PermissionsGuard } from './permissions.guard';
import { AbacGuard } from './abac.guard';
import { RequirePermissions } from './permissions.decorator';
import { auditLogger } from './audit.logger';
import { TenantGuard } from './tenant.guard';
import {
  CreateUnderwritingRequestDto,
  DecideDto,
  EscalateDto,
  AppealDto,
  AssessRiskDto,
  CreateAppetiteRuleDto,
  EvaluateAppetiteDto,
  UpdateAppetiteRuleDto,
  ListRequestsQueryDto,
  ListAppetiteRulesQueryDto,
  SlaBreachesQueryDto,
  SlaMetricsQueryDto,
} from './dto/underwriting.dto';

@Controller()
export class UnderwritingController {
  constructor(private readonly underwritingService: UnderwritingService) {}

  private isUuid(value: any): boolean {
    return typeof value === 'string' && isUUID(value, 'all');
  }

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  @Post('/underwriting/requests')
  @UseGuards(EcosystemJwtGuard, PermissionsGuard, TenantGuard, AbacGuard)
  @RequirePermissions('underwriting:create')
  async create(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: CreateUnderwritingRequestDto) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;
    const authorization = (headers['authorization'] || headers['Authorization']) as string | undefined;

    auditLogger.info('underwriting.request.create.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'underwriting:create',
    });

    if (!body?.policyId || !body?.reasonCode) {
      auditLogger.warn('underwriting.request.create.validation_failed', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'underwriting:create',
      });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'policyId and reasonCode are required' }, correlationId };
    }

    if (!this.isUuid(body.policyId)) {
      auditLogger.warn('underwriting.request.create.validation_failed', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'underwriting:create',
      });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'policyId must be a UUID' }, correlationId };
    }

    const r = await this.underwritingService.createRequest({
      policyId: String(body.policyId),
      reasonCode: String(body.reasonCode),
      input: body.input && typeof body.input === 'object' ? body.input : undefined,
      correlationId,
      dueDate: typeof body.dueDate === 'string' ? body.dueDate : undefined,
      tenantId: tenantId!,
      actorUserId: actor?.userId ?? null,
      authorization,
      brokerOrganizationId: body.brokerOrganizationId,
      carrierOrganizationId: body.carrierOrganizationId,
    });

    auditLogger.info('underwriting.request.create.success', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'underwriting:create',
      underwritingRequestId: r.underwritingRequestId,
      policyId: r.policyId,
    });

    return { success: true, data: r, correlationId };
  }

  @Get('/underwriting/requests/:underwritingRequestId')
  @UseGuards(EcosystemJwtGuard, PermissionsGuard, TenantGuard, AbacGuard)
  @RequirePermissions('underwriting:view')
  async get(@Req() req: any, @Headers() headers: Record<string, any>, @Param('underwritingRequestId') underwritingRequestId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    if (!this.isUuid(underwritingRequestId)) {
      auditLogger.warn('underwriting.request.get.validation_failed', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'underwriting:view',
        underwritingRequestId,
      });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'underwritingRequestId must be a UUID' }, correlationId };
    }

    auditLogger.info('underwriting.request.get.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'underwriting:view',
      underwritingRequestId,
    });

    const r = await this.underwritingService.getRequest(underwritingRequestId, tenantId!);
    if (!r) {
      auditLogger.warn('underwriting.request.get.not_found', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'underwriting:view',
        underwritingRequestId,
      });
      return { success: false, error: { code: 'NOT_FOUND', message: 'Underwriting request not found' }, correlationId };
    }

    return { success: true, data: r, correlationId };
  }

  @Get('/underwriting/requests')
  @UseGuards(EcosystemJwtGuard, PermissionsGuard, TenantGuard, AbacGuard)
  @RequirePermissions('underwriting:list')
  async list(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query() query: ListRequestsQueryDto
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('underwriting.request.list.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'underwriting:list',
    });

    const lim = Math.min(query.limit ?? 50, 200);
    const off = query.offset ?? 0;

    const { rows, total } = await this.underwritingService.listRequests({
      tenantId: tenantId!,
      status: query.status,
      policyId: query.policyId,
      brokerOrganizationId: query.brokerOrganizationId || actor?.organizationId,
      limit: lim,
      offset: off,
    });

    return {
      success: true,
      data: rows,
      pagination: {
        total,
        limit: lim,
        offset: off,
      },
      correlationId,
    };
  }

  @Post('/underwriting/requests/:underwritingRequestId/decide')
  @UseGuards(EcosystemJwtGuard, PermissionsGuard, TenantGuard, AbacGuard)
  @RequirePermissions('underwriting:decide')
  async decide(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('underwritingRequestId') underwritingRequestId: string,
    @Body() body: DecideDto
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;
    const authorization = (headers['authorization'] || headers['Authorization']) as string | undefined;

    if (!this.isUuid(underwritingRequestId)) {
      auditLogger.warn('underwriting.request.decide.validation_failed', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'underwriting:decide',
        underwritingRequestId,
      });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'underwritingRequestId must be a UUID' }, correlationId };
    }

    auditLogger.info('underwriting.request.decide.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'underwriting:decide',
      underwritingRequestId,
    });

    if (!body?.decision) {
      auditLogger.warn('underwriting.request.decide.validation_failed', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'underwriting:decide',
        underwritingRequestId,
      });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'decision is required' }, correlationId };
    }

    if (!['approved', 'rejected', 'escalated', 'conditionally_approved'].includes(String(body.decision))) {
      auditLogger.warn('underwriting.request.decide.validation_failed', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'underwriting:decide',
        underwritingRequestId,
      });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'decision must be approved|rejected|escalated|conditionally_approved' }, correlationId };
    }

    const decidedBy = body.decidedBy || actor?.userId;
    if (!decidedBy) {
      auditLogger.warn('underwriting.request.decide.no_actor', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'underwriting:decide',
        underwritingRequestId,
      });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'decidedBy is required (provide in body or via JWT userId)' }, correlationId };
    }

    try {
      const r = await this.underwritingService.decide({
        underwritingRequestId,
        decision: body.decision,
        decidedBy,
        notes: body.notes,
        result: body.result && typeof body.result === 'object' ? body.result : undefined,
        conditions: body.conditions && typeof body.conditions === 'object' ? body.conditions : undefined,
        correlationId,
        tenantId: tenantId!,
        actorUserId: actor?.userId ?? null,
        authorization,
      });

      if (!r) {
        auditLogger.warn('underwriting.request.decide.not_found', {
          correlationId,
          tenantId,
          actorUserId: actor?.userId,
          action: 'underwriting:decide',
          underwritingRequestId,
        });
        return { success: false, error: { code: 'NOT_FOUND', message: 'Underwriting request not found' }, correlationId };
      }

      auditLogger.info('underwriting.request.decide.success', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'underwriting:decide',
        underwritingRequestId,
        decision: r.decision,
      });

      return { success: true, data: r, correlationId };
    } catch (e: any) {
      if (e?.code === 'ALREADY_DECIDED') {
        auditLogger.warn('underwriting.request.decide.already_decided', {
          correlationId,
          tenantId,
          actorUserId: actor?.userId,
          action: 'underwriting:decide',
          underwritingRequestId,
        });
        return { success: false, error: { code: 'ALREADY_DECIDED', message: e.message }, correlationId };
      }
      if (e?.code === 'POLICY_SERVICE_UNAVAILABLE') {
        auditLogger.warn('underwriting.request.decide.policy_service_unavailable', {
          correlationId,
          tenantId,
          actorUserId: actor?.userId,
          action: 'underwriting:decide',
          underwritingRequestId,
        });
        return { success: false, error: { code: 'POLICY_SERVICE_UNAVAILABLE', message: e.message }, correlationId };
      }
      if (e?.code === 'POLICY_DECISION_FAILED') {
        auditLogger.warn('underwriting.request.decide.policy_decision_failed', {
          correlationId,
          tenantId,
          actorUserId: actor?.userId,
          action: 'underwriting:decide',
          underwritingRequestId,
        });
        return { success: false, error: { code: 'POLICY_DECISION_FAILED', message: e.message }, correlationId };
      }
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('underwriting.request.decide.failed', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'underwriting:decide',
        underwritingRequestId,
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to decide underwriting request' }, correlationId };
    }
  }

  // SLA Enforcement Endpoints
  @Get('/underwriting/sla/breaches')
  @UseGuards(EcosystemJwtGuard, PermissionsGuard, TenantGuard, AbacGuard)
  @RequirePermissions('underwriting:list')
  async getSlaBreaches(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query() query: SlaBreachesQueryDto
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('underwriting.sla.breaches.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'underwriting:list',
    });

    const hours = query.hoursOverdue ?? 48;
    const lim = Math.min(query.limit ?? 50, 200);
    const off = query.offset ?? 0;

    const { rows, total } = await this.underwritingService.checkSlaBreaches({
      tenantId: tenantId!,
      hoursOverdue: hours,
      limit: lim,
      offset: off,
    });

    return {
      success: true,
      data: rows,
      pagination: {
        total,
        limit: lim,
        offset: off,
      },
      correlationId,
    };
  }

  @Post('/underwriting/requests/:underwritingRequestId/escalate')
  @UseGuards(EcosystemJwtGuard, PermissionsGuard, TenantGuard, AbacGuard)
  @RequirePermissions('underwriting:decide')
  async escalateOverdueReview(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('underwritingRequestId') underwritingRequestId: string,
    @Body() body: EscalateDto
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    if (!this.isUuid(underwritingRequestId)) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'underwritingRequestId must be a UUID' }, correlationId };
    }

    auditLogger.info('underwriting.escalate.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'underwriting:decide',
      underwritingRequestId,
    });

    if (!body?.reason || typeof body.reason !== 'string') {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'reason is required' }, correlationId };
    }

    try {
      const r = await this.underwritingService.escalateOverdueReview({
        underwritingRequestId,
        actorUserId: actor?.userId,
        reason: body.reason,
        tenantId: tenantId!,
      });
      return { success: true, data: r, correlationId };
    } catch (e: any) {
      if (e?.code === 'NOT_FOUND') {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Request not found' }, correlationId };
      }
      if (e?.code === 'INVALID_STATE') {
        return { success: false, error: { code: 'INVALID_STATE', message: e.message }, correlationId };
      }
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('underwriting.escalate.failed', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'underwriting:decide',
        underwritingRequestId,
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to escalate review' }, correlationId };
    }
  }

  @Get('/underwriting/sla/metrics')
  @UseGuards(EcosystemJwtGuard, PermissionsGuard, TenantGuard, AbacGuard)
  @RequirePermissions('underwriting:list')
  async getSlaMetrics(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query() query: SlaMetricsQueryDto
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('underwriting.sla.metrics.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'underwriting:list',
    });

    const metrics = await this.underwritingService.getSlaMetrics({
      tenantId: tenantId!,
      fromDate: query.from,
      toDate: query.to,
      carrierOrganizationId: query.carrierOrganizationId,
      brokerOrganizationId: query.brokerOrganizationId,
    });

    return { success: true, data: metrics, correlationId };
  }

  @Post('/underwriting/requests/:id/assess-risk')
  @UseGuards(EcosystemJwtGuard, PermissionsGuard, TenantGuard, AbacGuard)
  @RequirePermissions('underwriting:create')
  async assessRisk(
    @Param('id') id: string,
    @Body() body: AssessRiskDto,
    @Req() req: any,
    @Headers() headers: Record<string, any>
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('underwriting.assess_risk.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'underwriting:create',
      underwritingRequestId: id,
    });

    try {
      const result = await this.underwritingService.assessRisk({
        underwritingRequestId: id,
        factors: body.factors,
        tenantId: tenantId!,
      });
      return { success: true, data: result, correlationId };
    } catch (e: any) {
      auditLogger.warn('underwriting.assess_risk.error', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'underwriting:create',
        underwritingRequestId: id,
        error: e?.message,
      });
      return { success: false, error: { code: e?.code || 'INTERNAL_ERROR', message: e?.message || 'Failed to assess risk' }, correlationId };
    }
  }

  @Get('/underwriting/risk-matrix')
  @UseGuards(EcosystemJwtGuard, PermissionsGuard, TenantGuard, AbacGuard)
  @RequirePermissions('underwriting:view')
  async getRiskMatrix(@Req() req: any, @Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('underwriting.risk_matrix.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'underwriting:view',
    });

    const result = await this.underwritingService.getRiskMatrix();
    return { success: true, data: result, correlationId };
  }

  // Appetite Matrix Endpoints
  @Post('/underwriting/appetite-rules')
  @UseGuards(EcosystemJwtGuard, PermissionsGuard, TenantGuard, AbacGuard)
  @RequirePermissions('underwriting:create')
  async createAppetiteRule(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: CreateAppetiteRuleDto) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const result = await this.underwritingService.createAppetiteRule({
      tenantId: tenantId!,
      lineOfBusiness: body.lineOfBusiness,
      productId: body.productId,
      riskLevel: body.riskLevel,
      decision: body.decision,
      minSumInsured: body.minSumInsured,
      maxSumInsured: body.maxSumInsured,
      minPremium: body.minPremium,
      maxPremium: body.maxPremium,
      authorityLevel: body.authorityLevel,
      approverRole: body.approverRole,
      priority: body.priority,
      slaHours: body.slaHours,
      correlationId,
    });
    return { success: true, data: result, correlationId };
  }

  @Post('/underwriting/appetite-rules/evaluate')
  @UseGuards(EcosystemJwtGuard, PermissionsGuard, TenantGuard, AbacGuard)
  @RequirePermissions('underwriting:view')
  async evaluateAppetite(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: EvaluateAppetiteDto) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const result = await this.underwritingService.evaluateAppetite({
      tenantId: tenantId!,
      lineOfBusiness: body.lineOfBusiness,
      productId: body.productId,
      riskLevel: body.riskLevel,
      sumInsured: body.sumInsured,
      premium: body.premium,
    });
    return { success: true, data: result, correlationId };
  }

  @Get('/underwriting/appetite-rules')
  @UseGuards(EcosystemJwtGuard, PermissionsGuard, TenantGuard, AbacGuard)
  @RequirePermissions('underwriting:view')
  async listAppetiteRules(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query() query: ListAppetiteRulesQueryDto
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const lim = Math.min(query.limit ?? 50, 200);
    const off = query.offset ?? 0;
    const result = await this.underwritingService.listAppetiteRules({
      tenantId: tenantId!,
      lineOfBusiness: query.lineOfBusiness,
      productId: query.productId,
      active: query.active,
      limit: lim,
      offset: off,
    });
    return { success: true, data: result.rows, pagination: { total: result.total, limit: lim, offset: off }, correlationId };
  }

  @Patch('/underwriting/appetite-rules/:id')
  @UseGuards(EcosystemJwtGuard, PermissionsGuard, TenantGuard, AbacGuard)
  @RequirePermissions('underwriting:create')
  async updateAppetiteRule(@Req() req: any, @Headers() headers: Record<string, any>, @Param('id') id: string, @Body() body: UpdateAppetiteRuleDto) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const result = await this.underwritingService.updateAppetiteRule({
      id,
      tenantId: tenantId!,
      updates: body,
      correlationId,
    });
    if (!result) return { success: false, error: { code: 'NOT_FOUND', message: 'Appetite rule not found' }, correlationId };
    return { success: true, data: result, correlationId };
  }

  @Post('/underwriting/appetite-rules/:id/delete')
  @UseGuards(EcosystemJwtGuard, PermissionsGuard, TenantGuard, AbacGuard)
  @RequirePermissions('underwriting:create')
  async deleteAppetiteRule(@Req() req: any, @Headers() headers: Record<string, any>, @Param('id') id: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const ok = await this.underwritingService.deleteAppetiteRule({ id, tenantId: tenantId!, correlationId });
    if (!ok) return { success: false, error: { code: 'NOT_FOUND', message: 'Appetite rule not found' }, correlationId };
    return { success: true, data: { id, deleted: true }, correlationId };
  }

  @Post('/underwriting/requests/:underwritingRequestId/appeal')
  @UseGuards(EcosystemJwtGuard, PermissionsGuard, TenantGuard, AbacGuard)
  @RequirePermissions('underwriting:appeal')
  async appealDecision(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('underwritingRequestId') underwritingRequestId: string,
    @Body() body: AppealDto
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    if (!this.isUuid(underwritingRequestId)) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'underwritingRequestId must be a UUID' }, correlationId };
    }

    auditLogger.info('underwriting.appeal.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'underwriting:appeal',
      underwritingRequestId,
    });

    if (!body?.reason || typeof body.reason !== 'string') {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'reason is required' }, correlationId };
    }

    try {
      const r = await this.underwritingService.appealDecision({
        underwritingRequestId,
        reason: body.reason,
        additionalData: body.additionalData,
        correlationId,
        tenantId: tenantId!,
        actorUserId: actor?.userId ?? null,
      });

      if (!r) {
        auditLogger.warn('underwriting.appeal.not_found', {
          correlationId,
          tenantId,
          actorUserId: actor?.userId,
          action: 'underwriting:appeal',
          underwritingRequestId,
        });
        return { success: false, error: { code: 'NOT_FOUND', message: 'Underwriting request not found' }, correlationId };
      }

      auditLogger.info('underwriting.appeal.success', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'underwriting:appeal',
        underwritingRequestId,
      });

      return { success: true, data: r, correlationId };
    } catch (e: any) {
      if (e?.code === 'INVALID_STATE') {
        return { success: false, error: { code: 'INVALID_STATE', message: e.message }, correlationId };
      }
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('underwriting.appeal.failed', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'underwriting:appeal',
        underwritingRequestId,
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to appeal underwriting decision' }, correlationId };
    }
  }
}
