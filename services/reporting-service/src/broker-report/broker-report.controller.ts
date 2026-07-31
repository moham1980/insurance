import { Body, Controller, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { BrokerReportGenerator } from './broker-report-generator';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { PermissionsGuard } from '../permissions.guard';
import { TenantGuard } from '../tenant.guard';
import { RequirePermissions } from '../permissions.decorator';
import { AbacGuard } from '../abac.guard';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard, AbacGuard)
export class BrokerReportController {
  constructor(private readonly brokerReportGenerator: BrokerReportGenerator) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `br-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  @Post('/reporting/broker-reports')
  @RequirePermissions('reporting:manage')
  async create(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actorUserId = req?.user?.userId as string | undefined;

    if (!body?.periodId || !body?.periodStartDate || !body?.periodEndDate) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'periodId, periodStartDate and periodEndDate are required' }, correlationId };
    }

    const report = await this.brokerReportGenerator.createDraft({
      tenantId,
      brokerOrganizationId: body.brokerOrganizationId,
      periodId: body.periodId,
      periodStartDate: body.periodStartDate,
      periodEndDate: body.periodEndDate,
      reportType: body.reportType,
      actorUserId,
    });

    return { success: true, data: report, correlationId };
  }

  @Get('/reporting/broker-reports')
  @RequirePermissions('reporting:view')
  async list(
    @Req() req: any,
    @Query('brokerOrganizationId') brokerOrganizationId?: string,
    @Query('status') status?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
  ) {
    const tenantId = req?.user?.tenantId as string | undefined;
    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);
    return this.brokerReportGenerator.list(tenantId, brokerOrganizationId, status, Number.isFinite(lim) ? lim : 50, Number.isFinite(off) ? off : 0);
  }

  @Get('/reporting/broker-reports/:reportId')
  @RequirePermissions('reporting:view')
  async get(@Req() req: any, @Param('reportId') reportId: string) {
    const tenantId = req?.user?.tenantId as string | undefined;
    return this.brokerReportGenerator.get(reportId, tenantId);
  }

  @Post('/reporting/broker-reports/:reportId/generate')
  @RequirePermissions('reporting:manage')
  async generate(@Req() req: any, @Param('reportId') reportId: string, @Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const report = await this.brokerReportGenerator.generate(reportId, tenantId);
    return { success: !!report, data: report, correlationId };
  }

  @Post('/reporting/broker-reports/:reportId/approve')
  @RequirePermissions('reporting:manage')
  async approve(@Req() req: any, @Param('reportId') reportId: string, @Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actorUserId = req?.user?.userId as string | undefined;
    const report = await this.brokerReportGenerator.approve(reportId, actorUserId || 'unknown', tenantId);
    return { success: !!report, data: report, correlationId };
  }

  @Post('/reporting/broker-reports/:reportId/submit')
  @RequirePermissions('reporting:manage')
  async submit(@Req() req: any, @Param('reportId') reportId: string, @Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const report = await this.brokerReportGenerator.submit(reportId, tenantId);
    return { success: !!report, data: report, correlationId };
  }
}
