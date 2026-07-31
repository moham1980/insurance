import { Body, Controller, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { RfqEngine } from './rfq/rfq-engine';
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
    correlationId: (headers?.['x-correlation-id'] as string) || user.correlationId || 'unknown',
    authHeader: (headers?.authorization as string) || (headers?.Authorization as string),
  };
}

@Controller('api/v1')
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class RfqController {
  constructor(private readonly engine: RfqEngine) {}

  @Post('/submissions/:submissionId/quotes/request')
  @RequirePermissions('submission:quotes:request')
  async requestQuote(
    @Req() req: any,
    @Headers() headers: any,
    @Param('submissionId') submissionId: string,
    @Body() body: any,
  ) {
    const ctx = buildCtx(req, headers);
    auditLogger.info('quote.request', { correlationId: ctx.correlationId, tenantId: ctx.tenantId, submissionId });
    const data = await this.engine.createRequest(ctx, submissionId, body);
    return { success: true, data, correlationId: ctx.correlationId };
  }

  @Get('/submissions/:submissionId/quotes')
  @RequirePermissions('submission:quotes:view')
  async listRequests(
    @Req() req: any,
    @Headers() headers: any,
    @Param('submissionId') submissionId: string,
    @Query() query: any,
  ) {
    const ctx = buildCtx(req, headers);
    const data = await this.engine.listRequests(ctx, { ...query, submissionId });
    return { success: true, data, correlationId: ctx.correlationId };
  }

  @Get('/quote-requests/:quoteRequestId')
  @RequirePermissions('submission:quotes:view')
  async getRequest(@Req() req: any, @Headers() headers: any, @Param('quoteRequestId') quoteRequestId: string) {
    const ctx = buildCtx(req, headers);
    const data = await this.engine.getRequest(ctx, quoteRequestId);
    return { success: true, data, correlationId: ctx.correlationId };
  }
}
