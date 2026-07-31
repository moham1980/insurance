import { Body, Controller, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PlacementService, PlacementContext } from './placement/placement.service';
import { PlacementOrchestrator, BindResult } from './placement/placement-orchestrator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { RequirePermissions } from './permissions.decorator';
import { auditLogger } from './audit.logger';

function buildCtx(req: any, headers: any): PlacementContext {
  const user = req?.user || {};
  return {
    tenantId: user.tenantId || headers?.['x-tenant-id'],
    userId: user.sub,
    roles: Array.isArray(user.roles) ? user.roles : [],
    correlationId: (headers?.['x-correlation-id'] as string) || user.correlationId || 'unknown',
    authHeader: (headers?.authorization as string) || (headers?.Authorization as string),
  };
}

@Controller('api/v1')
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class PlacementController {
  constructor(
    private readonly placementService: PlacementService,
    private readonly orchestrator: PlacementOrchestrator,
  ) {}

  @Post('/quote-responses/:quoteResponseId/select')
  @RequirePermissions('submission:quotes:select')
  async selectQuote(@Req() req: any, @Headers() headers: any, @Param('quoteResponseId') quoteResponseId: string) {
    const ctx = buildCtx(req, headers);
    const data = await this.placementService.selectQuote(ctx, quoteResponseId);
    return { success: true, data, correlationId: ctx.correlationId };
  }

  @Post('/quote-responses/:quoteResponseId/placement')
  @RequirePermissions('submission:placement:create')
  async createPlacement(
    @Req() req: any,
    @Headers() headers: any,
    @Param('quoteResponseId') quoteResponseId: string,
  ) {
    const ctx = buildCtx(req, headers);
    const idempotencyKey = (headers?.['x-idempotency-key'] as string) || undefined;
    const data = await this.placementService.create(ctx, quoteResponseId, idempotencyKey);
    return { success: true, data, correlationId: ctx.correlationId };
  }

  @Post('/placements/:placementId/bind')
  @RequirePermissions('submission:placement:create')
  async bind(@Req() req: any, @Headers() headers: any, @Param('placementId') placementId: string): Promise<BindResult & { success: boolean; correlationId: string }> {
    const ctx = buildCtx(req, headers);
    auditLogger.info('placement.bind', { correlationId: ctx.correlationId, tenantId: ctx.tenantId, placementId });
    const result = await this.orchestrator.bind(ctx, placementId);
    return { ...result, success: result.success, correlationId: ctx.correlationId };
  }

  @Post('/placements/:placementId/retry')
  @RequirePermissions('submission:placement:retry')
  async retry(@Req() req: any, @Headers() headers: any, @Param('placementId') placementId: string) {
    const ctx = buildCtx(req, headers);
    const result = await this.orchestrator.retry(ctx, placementId);
    return { ...result, success: result.success, correlationId: ctx.correlationId };
  }

  @Post('/placements/:placementId/cancel')
  @RequirePermissions('submission:placement:cancel')
  async cancel(@Req() req: any, @Headers() headers: any, @Param('placementId') placementId: string) {
    const ctx = buildCtx(req, headers);
    const data = await this.orchestrator.cancel(ctx, placementId);
    return { success: true, data, correlationId: ctx.correlationId };
  }

  @Get('/placements')
  @RequirePermissions('submission:placement:view')
  async list(@Req() req: any, @Headers() headers: any, @Query() query: any) {
    const ctx = buildCtx(req, headers);
    const data = await this.placementService.list(ctx, query);
    return { success: true, data, correlationId: ctx.correlationId };
  }

  @Get('/placements/:placementId')
  @RequirePermissions('submission:placement:view')
  async get(@Req() req: any, @Headers() headers: any, @Param('placementId') placementId: string) {
    const ctx = buildCtx(req, headers);
    const data = await this.placementService.get(ctx, placementId);
    return { success: true, data, correlationId: ctx.correlationId };
  }
}
