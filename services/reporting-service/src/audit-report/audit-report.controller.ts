import { Body, Controller, Get, Headers, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AuditReportService } from './audit-report.service';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { PermissionsGuard } from '../permissions.guard';
import { TenantGuard } from '../tenant.guard';
import { RequirePermissions } from '../permissions.decorator';
import { AbacGuard } from '../abac.guard';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard, AbacGuard)
export class AuditReportController {
  constructor(private readonly auditReportService: AuditReportService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `ar-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  @Post('/reporting/audit-reports')
  @RequirePermissions('reporting:manage')
  async create(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actorUserId = req?.user?.userId as string | undefined;

    if (!body?.reportType) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'reportType is required' }, correlationId };
    }

    try {
      const report = await this.auditReportService.create({
        tenantId,
        reportType: body.reportType,
        periodId: body.periodId,
        periodStartDate: body.periodStartDate,
        periodEndDate: body.periodEndDate,
        actorUserId,
      });
      return { success: true, data: report, correlationId };
    } catch (e: any) {
      if (e?.code === 'VALIDATION_ERROR') {
        return { success: false, error: { code: 'VALIDATION_ERROR', message: e.message }, correlationId };
      }
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create audit report' }, correlationId };
    }
  }

  @Get('/reporting/audit-reports')
  @RequirePermissions('reporting:view')
  async list(
    @Req() req: any,
    @Query('reportType') reportType?: string,
    @Query('status') status?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
  ) {
    const tenantId = req?.user?.tenantId as string | undefined;
    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);
    return this.auditReportService.list(tenantId, reportType, status, Number.isFinite(lim) ? lim : 50, Number.isFinite(off) ? off : 0);
  }

  @Get('/reporting/audit-reports/:reportId')
  @RequirePermissions('reporting:view')
  async get(@Req() req: any, @Param('reportId') reportId: string) {
    const tenantId = req?.user?.tenantId as string | undefined;
    return this.auditReportService.get(reportId, tenantId);
  }

  @Post('/reporting/audit-reports/:reportId/generate')
  @RequirePermissions('reporting:manage')
  async generate(@Req() req: any, @Headers() headers: Record<string, any>, @Param('reportId') reportId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actorUserId = req?.user?.userId as string | undefined;
    const report = await this.auditReportService.generate(reportId, tenantId, actorUserId);
    return { success: !!report, data: report, correlationId };
  }

  @Get('/reporting/audit-reports/:reportId/export')
  @RequirePermissions('reporting:view')
  async export(@Req() req: any, @Headers() headers: Record<string, any>, @Res() res: any, @Param('reportId') reportId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    try {
      const { content, contentType } = await this.auditReportService.exportReport(reportId, tenantId);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="audit-report-${reportId}.txt"`);
      return res.send(content);
    } catch (e: any) {
      return { success: false, error: { code: e?.code || 'INTERNAL_ERROR', message: e?.message || 'Export failed' }, correlationId };
    }
  }

  @Get('/reporting/audit-reports/:reportId/verify')
  @RequirePermissions('reporting:view')
  async verify(@Req() req: any, @Headers() headers: Record<string, any>, @Param('reportId') reportId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const report = await this.auditReportService.get(reportId, tenantId);
    if (!report) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Report not found' }, correlationId };
    }
    const valid = this.auditReportService.verifySignature(report);
    return { success: true, data: { valid, reportId, signature: report.signature, previousSignature: report.previousSignature }, correlationId };
  }
}
