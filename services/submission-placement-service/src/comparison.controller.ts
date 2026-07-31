import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ComparisonEngine } from './comparison/comparison-engine';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { RequirePermissions } from './permissions.decorator';

function buildCtx(req: any, headers: any) {
  const user = req?.user || {};
  return {
    tenantId: user.tenantId || headers?.['x-tenant-id'],
    userId: user.sub,
    roles: Array.isArray(user.roles) ? user.roles : [],
    correlationId: (headers?.['x-correlation-id'] as string) || user.correlationId || 'unknown',
  };
}

@Controller('api/v1')
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class ComparisonController {
  constructor(private readonly engine: ComparisonEngine) {}

  @Post('/quote-requests/:quoteRequestId/compare')
  @RequirePermissions('submission:quotes:compare')
  async compare(
    @Req() req: any,
    @Headers() headers: any,
    @Param('quoteRequestId') quoteRequestId: string,
    @Body() body: any,
  ) {
    const ctx = buildCtx(req, headers);
    const data = await this.engine.compare(ctx.tenantId, quoteRequestId, body);
    return { success: true, data, correlationId: ctx.correlationId };
  }

  @Get('/quote-requests/:quoteRequestId/compare')
  @RequirePermissions('submission:quotes:compare')
  async compareGet(@Req() req: any, @Headers() headers: any, @Param('quoteRequestId') quoteRequestId: string) {
    const ctx = buildCtx(req, headers);
    const data = await this.engine.compare(ctx.tenantId, quoteRequestId, {});
    return { success: true, data, correlationId: ctx.correlationId };
  }
}
