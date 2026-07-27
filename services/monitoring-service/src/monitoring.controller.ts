import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
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
  async listSLOs(@Headers() headers: Record<string, any>, @Query('serviceName') serviceName?: string, @Query('status') status?: string) {
    const correlationId = this.getCorrelationId(headers);
    const slos = await this.monitoringService.listSLOs({ serviceName, status });
    return { success: true, data: slos, correlationId };
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
    @Query('serviceName') serviceName?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const alerts = await this.monitoringService.listAlerts({ status, severity, serviceName });
    return { success: true, data: alerts, correlationId };
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

  @Get('/dashboard')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('monitoring:dashboard:view')
  async dashboard(@Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const dashboard = await this.monitoringService.getDashboard();
    return { success: true, data: dashboard, correlationId };
  }
}
