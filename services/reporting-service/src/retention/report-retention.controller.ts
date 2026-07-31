import { Controller, Get, Post, Headers, Req, UseGuards } from '@nestjs/common';
import { ReportRetentionService } from './report-retention.service';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { PermissionsGuard } from '../permissions.guard';
import { TenantGuard } from '../tenant.guard';
import { RequirePermissions } from '../permissions.decorator';
import { AbacGuard } from '../abac.guard';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard, AbacGuard)
export class ReportRetentionController {
  constructor(private readonly reportRetentionService: ReportRetentionService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `ret-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  @Get('/reporting/retention/policies')
  @RequirePermissions('reporting:view')
  async getPolicies(@Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const policies = await this.reportRetentionService.getPolicies();
    return { success: true, data: policies, correlationId };
  }

  @Post('/reporting/retention/apply')
  @RequirePermissions('reporting:projections:admin')
  async apply(@Req() req: any, @Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const result = await this.reportRetentionService.applyRetention(tenantId);
    return { success: true, data: result, correlationId };
  }
}
