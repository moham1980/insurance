import { Body, Controller, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { DataQualityService } from './data-quality.service';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { PermissionsGuard } from '../permissions.guard';
import { TenantGuard } from '../tenant.guard';
import { RequirePermissions } from '../permissions.decorator';
import { AbacGuard } from '../abac.guard';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard, AbacGuard)
export class DataQualityController {
  constructor(private readonly dataQualityService: DataQualityService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `dq-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  @Post('/reporting/data-quality/reconcile')
  @RequirePermissions('reporting:projections:admin')
  async reconcile(@Req() req: any, @Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const result = await this.dataQualityService.runReconciliation(tenantId);
    return { success: true, data: result, correlationId };
  }

  @Get('/reporting/data-quality/issues')
  @RequirePermissions('reporting:view')
  async list(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
  ) {
    const tenantId = req?.user?.tenantId as string | undefined;
    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);
    return this.dataQualityService.listIssues(tenantId, status, Number.isFinite(lim) ? lim : 50, Number.isFinite(off) ? off : 0);
  }

  @Get('/reporting/data-quality/issues/:issueId')
  @RequirePermissions('reporting:view')
  async get(@Req() req: any, @Param('issueId') issueId: string) {
    const tenantId = req?.user?.tenantId as string | undefined;
    return this.dataQualityService.getIssue(issueId, tenantId);
  }

  @Post('/reporting/data-quality/issues/:issueId/resolve')
  @RequirePermissions('reporting:projections:admin')
  async resolve(@Req() req: any, @Headers() headers: Record<string, any>, @Param('issueId') issueId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actorUserId = req?.user?.userId as string | undefined;
    const issue = await this.dataQualityService.resolveIssue(issueId, actorUserId || body?.actorUserId || 'unknown', tenantId);
    return { success: !!issue, data: issue, correlationId };
  }
}
