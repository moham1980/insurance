import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SubmissionService } from './submission.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { RequirePermissions } from './permissions.decorator';
import { auditLogger } from './audit.logger';

function buildCtx(req: any, headers: any) {
  const user = req?.user || {};
  return {
    tenantId: user.tenantId || headers?.['x-tenant-id'],
    userId: user.sub,
    roles: Array.isArray(user.roles) ? user.roles : [],
    organizationId: user.organizationId,
    correlationId: (headers?.['x-correlation-id'] as string) || user.correlationId || 'unknown',
  };
}

@Controller('api/v1')
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class SubmissionController {
  constructor(private readonly service: SubmissionService) {}

  @Post('/submissions')
  @RequirePermissions('submission:submissions:create')
  async create(@Req() req: any, @Headers() headers: any, @Body() body: any) {
    const ctx = buildCtx(req, headers);
    auditLogger.info('submission.create', { correlationId: ctx.correlationId, tenantId: ctx.tenantId });
    const idempotencyKey = headers?.['x-idempotency-key'] as string | undefined;
    const data = await this.service.create(ctx, body, idempotencyKey);
    return { success: true, data, correlationId: ctx.correlationId };
  }

  @Get('/submissions')
  @RequirePermissions('submission:submissions:list')
  async list(@Req() req: any, @Headers() headers: any, @Query() query: any) {
    const ctx = buildCtx(req, headers);
    const data = await this.service.list(ctx, query);
    return { success: true, data, correlationId: ctx.correlationId };
  }

  @Get('/submissions/:submissionId')
  @RequirePermissions('submission:submissions:view')
  async get(@Req() req: any, @Headers() headers: any, @Param('submissionId') submissionId: string) {
    const ctx = buildCtx(req, headers);
    const data = await this.service.get(ctx, submissionId);
    return { success: true, data, correlationId: ctx.correlationId };
  }

  @Patch('/submissions/:submissionId')
  @RequirePermissions('submission:submissions:update')
  async patch(@Req() req: any, @Headers() headers: any, @Param('submissionId') submissionId: string, @Body() body: any) {
    const ctx = buildCtx(req, headers);
    const data = await this.service.patch(ctx, submissionId, body);
    return { success: true, data, correlationId: ctx.correlationId };
  }

  @Post('/submissions/:submissionId/submit')
  @RequirePermissions('submission:submissions:submit')
  async submit(@Req() req: any, @Headers() headers: any, @Param('submissionId') submissionId: string) {
    const ctx = buildCtx(req, headers);
    auditLogger.info('submission.submit', { correlationId: ctx.correlationId, tenantId: ctx.tenantId, submissionId });
    const data = await this.service.submit(ctx, submissionId);
    return { success: true, data, correlationId: ctx.correlationId };
  }

  @Post('/submissions/:submissionId/expire')
  @RequirePermissions('submission:submissions:expire')
  async expire(@Req() req: any, @Headers() headers: any, @Param('submissionId') submissionId: string) {
    const ctx = buildCtx(req, headers);
    const data = await this.service.expire(ctx, submissionId);
    return { success: true, data, correlationId: ctx.correlationId };
  }
}
