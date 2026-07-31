import { Controller, Get, Headers, Query, Req, UseGuards } from '@nestjs/common';
import { AmlFraudRegulatoryService } from './aml-fraud-regulatory.service';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { PermissionsGuard } from '../permissions.guard';
import { TenantGuard } from '../tenant.guard';
import { RequirePermissions } from '../permissions.decorator';
import { AbacGuard } from '../abac.guard';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard, AbacGuard)
export class AmlFraudRegulatoryController {
  constructor(private readonly amlFraudService: AmlFraudRegulatoryService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `aml-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  @Get('/reporting/aml-fraud/regulatory-report')
  @RequirePermissions('reporting:view')
  async getReport(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const data = await this.amlFraudService.generateReport(tenantId, startDate, endDate);
    return { success: true, data, correlationId };
  }
}
