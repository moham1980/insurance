import { Body, Controller, Get, Param, Post, Put, Query, Req, Headers, UseGuards } from '@nestjs/common';
import { ConnectorConfigService } from './connector-config.service';
import { CarrierConnectorFactory } from './carrier-connectors/carrier-connector.factory';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { RequirePermissions } from './permissions.decorator';
import { auditLogger } from './audit.logger';

function buildCtx(req: any, headers: any) {
  const correlationId = (headers?.['x-correlation-id'] as string) || req?.user?.correlationId || 'unknown';
  const user = req?.user || {};
  return {
    tenantId: user.tenantId || headers?.['x-tenant-id'],
    userId: user.sub,
    roles: Array.isArray(user.roles) ? user.roles : [],
    organizationId: user.organizationId,
    correlationId,
  };
}

@Controller('api/v1')
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class ConnectorConfigController {
  constructor(
    private readonly service: ConnectorConfigService,
    private readonly factory: CarrierConnectorFactory,
  ) {}

  @Post('/carrier-connectors')
  @RequirePermissions('submission:connectors:configure')
  async create(@Req() req: any, @Headers() headers: any, @Body() body: any) {
    const ctx = buildCtx(req, headers);
    auditLogger.info('connector.create', { correlationId: ctx.correlationId, tenantId: ctx.tenantId, carrierOrganizationId: body?.carrierOrganizationId });
    const data = await this.service.create(ctx, body);
    return { success: true, data, correlationId: ctx.correlationId };
  }

  @Get('/carrier-connectors')
  @RequirePermissions('submission:connectors:view')
  async list(@Req() req: any, @Headers() headers: any, @Query() query: any) {
    const ctx = buildCtx(req, headers);
    const data = await this.service.list(ctx, query);
    return { success: true, data, correlationId: ctx.correlationId };
  }

  @Get('/carrier-connectors/:connectorId')
  @RequirePermissions('submission:connectors:view')
  async get(@Req() req: any, @Headers() headers: any, @Param('connectorId') connectorId: string) {
    const ctx = buildCtx(req, headers);
    const data = await this.service.get(ctx, connectorId);
    return { success: true, data, correlationId: ctx.correlationId };
  }

  @Put('/carrier-connectors/:connectorId')
  @RequirePermissions('submission:connectors:configure')
  async update(@Req() req: any, @Headers() headers: any, @Param('connectorId') connectorId: string, @Body() body: any) {
    const ctx = buildCtx(req, headers);
    const data = await this.service.update(ctx, connectorId, body);
    return { success: true, data, correlationId: ctx.correlationId };
  }

  @Get('/carrier-connectors/:carrierOrganizationId/health')
  @RequirePermissions('submission:connectors:view')
  async health(@Req() req: any, @Headers() headers: any, @Param('carrierOrganizationId') carrierOrganizationId: string) {
    const ctx = buildCtx(req, headers);
    const config = await this.service.getActiveConnectorForCarrier(ctx.tenantId, carrierOrganizationId);
    if (!config) {
      return { success: false, data: { healthy: false, reason: 'No active connector' }, correlationId: ctx.correlationId };
    }
    return { success: true, data: { healthy: true, connectorType: config.connectorType, connectorId: config.connectorId }, correlationId: ctx.correlationId };
  }

  @Post('/carrier-connectors/:carrierOrganizationId/test')
  @RequirePermissions('submission:connectors:configure')
  async test(@Req() req: any, @Headers() headers: any, @Param('carrierOrganizationId') carrierOrganizationId: string) {
    const ctx = buildCtx(req, headers);
    auditLogger.info('connector.test', { correlationId: ctx.correlationId, tenantId: ctx.tenantId, carrierOrganizationId });
    const config = await this.service.getActiveConnectorForCarrier(ctx.tenantId, carrierOrganizationId);
    if (!config) {
      return { success: false, error: { code: 'NO_CONNECTOR', message: 'No active connector for carrier' }, correlationId: ctx.correlationId };
    }
    try {
      const connector = this.factory.getConnector(config.connectorType);
      const testPayload = {
        submissionId: 'test',
        quoteRequestId: 'test',
        tenantId: ctx.tenantId,
        carrierOrganizationId,
        productId: 'test',
        productVersion: 1,
        lineOfBusiness: 'test',
        exposure: {},
        effectiveFrom: new Date(),
        effectiveTo: new Date(Date.now() + 86400000),
        correlationId: ctx.correlationId,
      };
      const result = await connector.requestQuote(testPayload, config.config);
      return { success: true, data: { connectorType: config.connectorType, status: result.status, testedAt: new Date().toISOString() }, correlationId: ctx.correlationId };
    } catch (e: any) {
      return { success: false, error: { code: 'TEST_FAILED', message: e.message }, correlationId: ctx.correlationId };
    }
  }
}
