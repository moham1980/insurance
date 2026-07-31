import { Body, Controller, Get, Headers, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { RegulatoryReportService } from './regulatory-report.service';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { PermissionsGuard } from '../permissions.guard';
import { TenantGuard } from '../tenant.guard';
import { RequirePermissions } from '../permissions.decorator';
import { AbacGuard } from '../abac.guard';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard, AbacGuard)
export class RegulatoryReportController {
  constructor(private readonly regulatoryReportService: RegulatoryReportService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `rr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  @Post('/reporting/regulatory-reports')
  @RequirePermissions('reporting:manage')
  async create(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;

    if (!body?.reportType || !body?.periodId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'reportType and periodId are required' }, correlationId };
    }

    const report = await this.regulatoryReportService.create({
      tenantId,
      reportType: body.reportType,
      issuerId: body.issuerId,
      brokerOrganizationId: body.brokerOrganizationId,
      periodId: body.periodId,
      periodStartDate: body.periodStartDate,
      periodEndDate: body.periodEndDate,
    });

    return { success: true, data: report, correlationId };
  }

  @Get('/reporting/regulatory-reports')
  @RequirePermissions('reporting:view')
  async list(
    @Req() req: any,
    @Query('reportType') reportType?: string,
    @Query('issuerId') issuerId?: string,
    @Query('brokerOrganizationId') brokerOrganizationId?: string,
    @Query('status') status?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
  ) {
    const tenantId = req?.user?.tenantId as string | undefined;
    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);
    return this.regulatoryReportService.list(tenantId, reportType, issuerId, brokerOrganizationId, status, Number.isFinite(lim) ? lim : 50, Number.isFinite(off) ? off : 0);
  }

  @Get('/reporting/regulatory-reports/:reportId')
  @RequirePermissions('reporting:view')
  async get(@Req() req: any, @Param('reportId') reportId: string) {
    const tenantId = req?.user?.tenantId as string | undefined;
    return this.regulatoryReportService.get(reportId, tenantId);
  }

  @Post('/reporting/regulatory-reports/:reportId/generate')
  @RequirePermissions('reporting:manage')
  async generate(@Req() req: any, @Headers() headers: Record<string, any>, @Param('reportId') reportId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actorUserId = req?.user?.userId as string | undefined;
    const report = await this.regulatoryReportService.generate(reportId, tenantId, actorUserId);
    return { success: !!report, data: report, correlationId };
  }

  @Get('/reporting/regulatory-reports/:reportId/export-xml')
  @RequirePermissions('reporting:view')
  async exportXML(@Req() req: any, @Headers() headers: Record<string, any>, @Res() res: any, @Param('reportId') reportId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const report = await this.regulatoryReportService.get(reportId, tenantId);
    if (!report) return { success: false, error: { code: 'NOT_FOUND', message: 'Report not found' }, correlationId };
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="regulatory-report-${reportId}.xml"`);
    return res.send(report.xmlContent || '<?xml version="1.0"?><error>No XML content</error>');
  }

  @Get('/reporting/regulatory-reports/:reportId/export-pdf')
  @RequirePermissions('reporting:view')
  async exportPDF(@Req() req: any, @Headers() headers: Record<string, any>, @Res() res: any, @Param('reportId') reportId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    try {
      const { content, contentType } = await this.regulatoryReportService.exportPDF(reportId, tenantId);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="regulatory-report-${reportId}.html"`);
      return res.send(content);
    } catch (e: any) {
      return { success: false, error: { code: e?.code || 'INTERNAL_ERROR', message: e?.message || 'Export failed' }, correlationId };
    }
  }

  @Post('/reporting/regulatory-reports/:reportId/submit')
  @RequirePermissions('reporting:manage')
  async submit(@Req() req: any, @Headers() headers: Record<string, any>, @Param('reportId') reportId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const report = await this.regulatoryReportService.submit(reportId, tenantId);
    return { success: !!report, data: report, correlationId };
  }
}
