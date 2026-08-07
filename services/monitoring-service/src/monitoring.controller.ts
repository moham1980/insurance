import { Body, Controller, Get, Headers, Param, Patch, Post, Put, Delete, Query, Req, Res, UseGuards } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import type { MetricPayload, SLOPayload } from './monitoring.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';

@Controller()
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  @Get('/health')
  health() {
    return { status: 'ok', service: 'monitoring-service' };
  }

  @Get('/metrics')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('monitoring:metrics:view')
  async metrics(@Res() res: any) {
    res.setHeader('Content-Type', this.monitoringService.getPrometheusContentType());
    res.end(await this.monitoringService.getPrometheusMetrics());
  }

  @Post('/metrics')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('monitoring:metrics:view')
  async recordMetric(@Headers() headers: Record<string, any>, @Body() body: MetricPayload) {
    const correlationId = this.getCorrelationId(headers);

    try {
      await this.monitoringService.recordMetric(body);
      return { success: true, data: { recorded: true }, correlationId };
    } catch (_e) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to record metric' }, correlationId };
    }
  }

  @Get('/slos')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('monitoring:slos:list')
  async listSLOs(
    @Headers() headers: Record<string, any>,
    @Query('serviceName') serviceName?: string,
    @Query('status') status?: string,
    @Query('cursor') cursor?: string, // P1 #8: cursor-based pagination
    @Query('limit') limit?: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const result = await this.monitoringService.listSLOs({ serviceName, status, cursor, limit: limit ? parseInt(limit, 10) : undefined });
    // P1 #8: return cursor-based pagination info when cursor is used
    if (cursor && result && typeof (result as any).hasNext !== 'undefined') {
      return { success: true, data: (result as any).items, pagination: { hasNext: (result as any).hasNext, nextCursor: (result as any).nextCursor }, correlationId };
    }
    return { success: true, data: result, correlationId };
  }

  @Post('/slos')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('monitoring:slos:create')
  async createSLO(@Headers() headers: Record<string, any>, @Body() body: SLOPayload) {
    const correlationId = this.getCorrelationId(headers);

    try {
      const slo = await this.monitoringService.createSLO(body);
      return { success: true, data: slo, correlationId };
    } catch (_e) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create SLO' }, correlationId };
    }
  }

  @Get('/alerts')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('monitoring:alerts:list')
  async listAlerts(
    @Headers() headers: Record<string, any>,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('serviceName') serviceName?: string,
    @Query('cursor') cursor?: string, // P1 #8: cursor-based pagination
    @Query('limit') limit?: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const result = await this.monitoringService.listAlerts({ status, severity, serviceName, cursor, limit: limit ? parseInt(limit, 10) : undefined });
    // P1 #8: return cursor-based pagination info when cursor is used
    if (cursor && result && typeof (result as any).hasNext !== 'undefined') {
      return { success: true, data: (result as any).items, pagination: { hasNext: (result as any).hasNext, nextCursor: (result as any).nextCursor }, correlationId };
    }
    return { success: true, data: result, correlationId };
  }

  @Patch('/alerts/:alertId/ack')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('monitoring:alerts:ack')
  async ack(@Headers() headers: Record<string, any>, @Param('alertId') alertId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);

    try {
      const alert = await this.monitoringService.acknowledgeAlert({ alertId, acknowledgedBy: body?.acknowledgedBy });
      if (!alert) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Alert not found' }, correlationId };
      }
      return { success: true, data: alert, correlationId };
    } catch (_e) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to acknowledge alert' }, correlationId };
    }
  }

  // P2 #8: Alert silencing for maintenance windows

  @Post('/alerts/silence')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('monitoring:alerts:silence')
  async silenceAlert(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Body() body: { alertName: string; silenceUntil: string; reason?: string },
  ) {
    const correlationId = this.getCorrelationId(headers);

    try {
      if (!body?.alertName || !body?.silenceUntil) {
        return { success: false, error: { code: 'BAD_REQUEST', message: 'alertName and silenceUntil are required' }, correlationId };
      }
      const silence = await this.monitoringService.createAlertSilence({
        tenantId: req?.user?.tenantId,
        alertName: body.alertName,
        silenceUntil: new Date(body.silenceUntil),
        createdBy: req?.user?.userId || req?.user?.sub || 'system',
        reason: body.reason,
      });
      return { success: true, data: silence, correlationId };
    } catch (_e) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create alert silence' }, correlationId };
    }
  }

  @Get('/alerts/silences')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('monitoring:alerts:list')
  async listSilences(@Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    try {
      const silences = await this.monitoringService.listAlertSilences();
      return { success: true, data: silences, correlationId };
    } catch (_e) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list alert silences' }, correlationId };
    }
  }

  @Get('/dashboard')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('monitoring:dashboard:view')
  async dashboard(@Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const dashboard = await this.monitoringService.getDashboard();
    return { success: true, data: dashboard, correlationId };
  }

  // P2 #5: Dashboard customization — CRUD endpoints (tenant-scoped and user-scoped)

  @Get('/dashboards')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('monitoring:dashboard:view')
  async listDashboards(@Headers() headers: Record<string, any>, @Req() req: any, @Query('userId') userId?: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }
    const dashboards = await this.monitoringService.listDashboards({ tenantId, userId });
    return { success: true, data: dashboards, correlationId };
  }

  @Post('/dashboards')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('monitoring:dashboard:view')
  async createDashboard(@Headers() headers: Record<string, any>, @Req() req: any, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const userId = req?.user?.userId || req?.user?.sub || 'system';
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }
    if (!body?.name) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'name is required' }, correlationId };
    }
    const dashboard = await this.monitoringService.createDashboard({
      tenantId,
      userId,
      name: body.name,
      widgets: body.widgets,
      layout: body.layout,
    });
    return { success: true, data: dashboard, correlationId };
  }

  @Put('/dashboards/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('monitoring:dashboard:view')
  async updateDashboard(@Headers() headers: Record<string, any>, @Req() req: any, @Param('id') id: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }
    const dashboard = await this.monitoringService.updateDashboard({
      dashboardId: id,
      tenantId,
      name: body?.name,
      widgets: body?.widgets,
      layout: body?.layout,
    });
    if (!dashboard) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Dashboard not found' }, correlationId };
    }
    return { success: true, data: dashboard, correlationId };
  }

  @Delete('/dashboards/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('monitoring:dashboard:view')
  async deleteDashboard(@Headers() headers: Record<string, any>, @Req() req: any, @Param('id') id: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }
    const deleted = await this.monitoringService.deleteDashboard({ dashboardId: id, tenantId });
    if (!deleted) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Dashboard not found' }, correlationId };
    }
    return { success: true, data: { deleted: true }, correlationId };
  }
}
