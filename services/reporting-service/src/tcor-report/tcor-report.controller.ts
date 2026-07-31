import { Body, Controller, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { TCoRReportCalculator } from './tcor-report.calculator';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { PermissionsGuard } from '../permissions.guard';
import { TenantGuard } from '../tenant.guard';
import { RequirePermissions } from '../permissions.decorator';
import { AbacGuard } from '../abac.guard';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard, AbacGuard)
export class TCoRReportController {
  constructor(private readonly tcoRReportCalculator: TCoRReportCalculator) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `tcor-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  @Post('/reporting/tcor-reports')
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

    const report = await this.tcoRReportCalculator.createDraft({
      tenantId,
      periodId: body.periodId,
      periodStartDate: body.periodStartDate,
      periodEndDate: body.periodEndDate,
      reportType: body.reportType,
      actorUserId,
    });

    return { success: true, data: report, correlationId };
  }

  @Get('/reporting/tcor-reports')
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
    return this.tcoRReportCalculator.list(tenantId, status, Number.isFinite(lim) ? lim : 50, Number.isFinite(off) ? off : 0);
  }

  @Get('/reporting/tcor-reports/:reportId')
  @RequirePermissions('reporting:view')
  async get(@Req() req: any, @Param('reportId') reportId: string) {
    const tenantId = req?.user?.tenantId as string | undefined;
    return this.tcoRReportCalculator.get(reportId, tenantId);
  }

  @Post('/reporting/tcor-reports/:reportId/generate')
  @RequirePermissions('reporting:manage')
  async generate(@Req() req: any, @Param('reportId') reportId: string, @Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const report = await this.tcoRReportCalculator.generate(reportId, tenantId);
    return { success: !!report, data: report, correlationId };
  }

  @Get('/reporting/tcor-reports/:reportId/drilldown')
  @RequirePermissions('reporting:view')
  async drilldown(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('reportId') reportId: string,
    @Query('by') by: string = 'policy',
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const validBy = ['policy', 'lineOfBusiness', 'carrier'];
    if (!validBy.includes(by)) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: `by must be one of: ${validBy.join(', ')}` }, correlationId };
    }
    const data = await this.tcoRReportCalculator.drilldown(reportId, by, tenantId);
    return { success: true, data, correlationId };
  }

  @Post('/reporting/tcor-reports/:reportId/approve')
  @RequirePermissions('reporting:manage')
  async approve(@Req() req: any, @Param('reportId') reportId: string, @Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actorUserId = req?.user?.userId as string | undefined;
    const report = await this.tcoRReportCalculator.approve(reportId, actorUserId || 'unknown', tenantId);
    return { success: !!report, data: report, correlationId };
  }

  @Post('/reporting/tcor-reports/:reportId/submit')
  @RequirePermissions('reporting:manage')
  async submit(@Req() req: any, @Param('reportId') reportId: string, @Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const report = await this.tcoRReportCalculator.submit(reportId, tenantId);
    return { success: !!report, data: report, correlationId };
  }
}
