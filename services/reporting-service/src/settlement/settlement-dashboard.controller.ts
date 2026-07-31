import { Controller, Get, Headers, Query, Req, UseGuards } from '@nestjs/common';
import { SettlementDashboardService } from './settlement-dashboard.service';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { PermissionsGuard } from '../permissions.guard';
import { TenantGuard } from '../tenant.guard';
import { RequirePermissions } from '../permissions.decorator';
import { AbacGuard } from '../abac.guard';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard, AbacGuard)
export class SettlementDashboardController {
  constructor(private readonly settlementDashboardService: SettlementDashboardService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `set-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  @Get('/reporting/settlement/dashboard')
  @RequirePermissions('reporting:view')
  async dashboard(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('brokerOrganizationId') brokerOrganizationId?: string,
    @Query('periodId') periodId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const data = await this.settlementDashboardService.getSummary({
      tenantId,
      brokerOrganizationId,
      periodId,
      startDate,
      endDate,
    });
    return { success: true, data, correlationId };
  }

  @Get('/reporting/settlement/brokers')
  @RequirePermissions('reporting:view')
  async brokers(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const data = await this.settlementDashboardService.getBrokerSettlements(tenantId, startDate, endDate);
    return { success: true, data, correlationId };
  }
}
