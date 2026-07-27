import { Controller, Post, Get, Patch, Body, Param, Headers, Put, Delete, HttpCode, HttpStatus, UseGuards, Query, Req } from '@nestjs/common';
import { ModelSwitchboardService } from './model-switchboard.service';
import { ModelType, ModelStatus } from './entities/ModelDefinition';
import { InvocationStatus } from './entities/ModelInvocation';
import { RoutingStrategy } from './entities/RoutePolicy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';

@Controller('model-switchboard')
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class ModelSwitchboardController {
  constructor(private readonly service: ModelSwitchboardService) {}

  // ── Model CRUD ──────────────────────────────────────────────────────

  @Post('models')
  @RequirePermissions('switchboard:manage_models')
  async registerModel(
    @Headers() headers: Record<string, any>,
    @Body() body: {
      tenantId: string;
      name: string;
      modelKey: string;
      modelType: ModelType;
      description?: string;
      config: {
        endpoint?: string;
        provider?: string;
        version?: string;
        parameters?: Record<string, any>;
        capabilities?: string[];
      };
      priority?: number;
      metadata?: Record<string, any>;
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `ms-${Date.now()}`;
    const result = await this.service.registerModel(body);
    return { success: true, data: result, correlationId };
  }

  @Put('models/:id/activate')
  @RequirePermissions('switchboard:manage_models')
  async activateModel(
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = headers['x-correlation-id'] || `ms-${Date.now()}`;
    const result = await this.service.activateModel(id);
    return { success: true, data: result, correlationId };
  }

  @Get('models/:id')
  @RequirePermissions('switchboard:manage_models')
  async getModel(@Param('id') id: string) {
    const result = await this.service.getModel(id);
    if (!result) return { success: false, error: { code: 'NOT_FOUND', message: 'Model not found' } };
    return { success: true, data: result };
  }

  @Get('models')
  @RequirePermissions('switchboard:manage_models')
  async listModels(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Query() query: any,
  ) {
    const result = await this.service.listModels({
      tenantId: req?.user?.tenantId || query.tenantId,
      modelType: query.modelType as ModelType,
      status: query.status as ModelStatus,
      limit: query.limit ? Math.min(parseInt(query.limit, 10), 200) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });
    return { success: true, data: result.items, pagination: { total: result.total, limit: query.limit || 50, offset: query.offset || 0 } };
  }

  @Post('invoke')
  @RequirePermissions('switchboard:route')
  async invokeModel(
    @Headers() headers: Record<string, any>,
    @Body() body: {
      tenantId: string;
      modelType: ModelType;
      businessKey?: string;
      input: Record<string, any>;
      metadata?: Record<string, any>;
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `ms-${Date.now()}`;
    const result = await this.service.invokeModel(body);
    return { success: true, data: result, correlationId };
  }

  @Get('invocations')
  @RequirePermissions('switchboard:view_usage')
  async listInvocations(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Query() query: any,
  ) {
    const result = await this.service.listInvocations({
      tenantId: req?.user?.tenantId || query.tenantId,
      modelKey: query.modelKey,
      businessKey: query.businessKey,
      status: query.status as InvocationStatus,
      limit: query.limit ? Math.min(parseInt(query.limit, 10), 200) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });
    return { success: true, data: result.items, pagination: { total: result.total, limit: query.limit || 50, offset: query.offset || 0 } };
  }

  // ── RoutePolicy CRUD ──────────────────────────────────────────────

  @Post('policies')
  @RequirePermissions('switchboard:manage_policies')
  async createRoutePolicy(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Body() body: {
      capability: string;
      tenantId?: string;
      primaryModel: string;
      fallbackChain?: string[];
      qualityThreshold?: number;
      costBudgetPerDay?: number;
      routingStrategy?: RoutingStrategy;
      metadata?: Record<string, any>;
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `ms-${Date.now()}`;
    const result = await this.service.createRoutePolicy({ ...body, createdBy: req?.user?.userId || req?.user?.sub || 'system' });
    return { success: true, data: result, correlationId };
  }

  @Get('policies')
  @RequirePermissions('switchboard:manage_policies')
  async listRoutePolicies(
    @Query() query: any,
  ) {
    const result = await this.service.listRoutePolicies({
      capability: query.capability,
      tenantId: query.tenantId,
      isActive: query.isActive !== undefined ? query.isActive === 'true' : undefined,
      limit: query.limit ? Math.min(parseInt(query.limit, 10), 200) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });
    return { success: true, data: result.items, pagination: { total: result.total } };
  }

  @Get('policies/:id')
  @RequirePermissions('switchboard:manage_policies')
  async getRoutePolicy(@Param('id') id: string) {
    const result = await this.service.getRoutePolicy(id);
    if (!result) return { success: false, error: { code: 'NOT_FOUND', message: 'RoutePolicy not found' } };
    return { success: true, data: result };
  }

  @Put('policies/:id')
  @RequirePermissions('switchboard:manage_policies')
  async updateRoutePolicy(
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Body() body: Partial<{
      capability: string;
      tenantId: string;
      primaryModel: string;
      fallbackChain: string[];
      qualityThreshold: number;
      costBudgetPerDay: number;
      routingStrategy: RoutingStrategy;
      metadata: Record<string, any>;
      isActive: boolean;
    }>,
  ) {
    const result = await this.service.updateRoutePolicy(id, { ...body, updatedBy: req?.user?.userId || req?.user?.sub || 'system' });
    return { success: true, data: result };
  }

  @Delete('policies/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('switchboard:admin')
  async deleteRoutePolicy(@Param('id') id: string) {
    await this.service.deleteRoutePolicy(id);
  }

  // ── Routing ────────────────────────────────────────────────────────

  @Post('route')
  @RequirePermissions('switchboard:route')
  async route(
    @Headers() headers: Record<string, any>,
    @Body() body: { capability: string; tenantId?: string },
  ) {
    const correlationId = headers['x-correlation-id'] || `ms-${Date.now()}`;
    const result = await this.service.route(body);
    return { success: true, data: result, correlationId };
  }

  // ── Usage ──────────────────────────────────────────────────────────

  @Post('record-usage')
  @RequirePermissions('switchboard:record_usage')
  async recordUsage(
    @Headers() headers: Record<string, any>,
    @Body() body: {
      modelId: string;
      tenantId?: string;
      capability: string;
      inputTokens: number;
      outputTokens: number;
      costMicroCents: number;
      latencyMs: number;
      qualityScore?: number;
      requestId?: string;
      metadata?: Record<string, any>;
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `ms-${Date.now()}`;
    const result = await this.service.recordUsage(body);
    return { success: true, data: result, correlationId };
  }

  @Get('usage')
  @RequirePermissions('switchboard:view_usage')
  async getUsageReport(
    @Query() query: any,
  ) {
    const result = await this.service.getUsageReport({
      tenantId: query.tenantId,
      modelId: query.modelId,
      capability: query.capability,
      periodStart: query.periodStart ? new Date(query.periodStart) : undefined,
      periodEnd: query.periodEnd ? new Date(query.periodEnd) : undefined,
      limit: query.limit ? Math.min(parseInt(query.limit, 10), 200) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });
    return { success: true, data: result.items, pagination: { total: result.total } };
  }

  @Get('usage/summary')
  @RequirePermissions('switchboard:view_usage')
  async getUsageSummary(
    @Query() query: any,
  ) {
    const result = await this.service.getUsageSummary({
      tenantId: query.tenantId,
      periodStart: query.periodStart ? new Date(query.periodStart) : undefined,
      periodEnd: query.periodEnd ? new Date(query.periodEnd) : undefined,
    });
    return { success: true, data: result };
  }

  // ── Model Card / AI Governance ────────────────────────────────────

  @Post('model-cards')
  @RequirePermissions('switchboard:manage')
  async createModelCard(@Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = headers['x-correlation-id'] || `ms-${Date.now()}`;
    const result = await this.service.createModelCard(body);
    return { success: true, data: result, correlationId };
  }

  @Get('model-cards')
  @RequirePermissions('switchboard:view')
  async listModelCards(@Query() query: any) {
    const result = await this.service.listModelCards({
      status: query.status,
      limit: query.limit ? Math.min(parseInt(query.limit, 10), 200) : 50,
      offset: query.offset ? parseInt(query.offset, 10) : 0,
    });
    return { success: true, data: result.rows, pagination: { total: result.total } };
  }

  @Get('model-cards/:modelId')
  @RequirePermissions('switchboard:view')
  async getModelCard(@Param('modelId') modelId: string) {
    const result = await this.service.getModelCard(modelId);
    if (!result) return { success: false, error: { code: 'NOT_FOUND', message: 'Model card not found' } };
    return { success: true, data: result };
  }

  @Patch('model-cards/:id')
  @RequirePermissions('switchboard:manage')
  async updateModelCard(@Param('id') id: string, @Body() body: any) {
    const result = await this.service.updateModelCard(id, body);
    if (!result) return { success: false, error: { code: 'NOT_FOUND', message: 'Model card not found' } };
    return { success: true, data: result };
  }

  @Post('model-cards/:id/approve')
  @RequirePermissions('switchboard:manage')
  async approveModelCard(@Headers() headers: Record<string, any>, @Req() req: any, @Param('id') id: string) {
    const actor = req?.user?.userId || 'system';
    const result = await this.service.approveModelCard(id, actor);
    if (!result) return { success: false, error: { code: 'NOT_FOUND', message: 'Model card not found' } };
    return { success: true, data: result };
  }

  @Post('model-cards/:id/deprecate')
  @RequirePermissions('switchboard:manage')
  async deprecateModelCard(@Param('id') id: string) {
    const result = await this.service.deprecateModelCard(id);
    if (!result) return { success: false, error: { code: 'NOT_FOUND', message: 'Model card not found' } };
    return { success: true, data: result };
  }

  // ── Health ──────────────────────────────────────────────────────────

  @Get('health')
  async health() {
    const modelsHealth = await this.service.getModelsHealth();
    return { success: true, data: { service: 'model-switchboard-service', models: modelsHealth, timestamp: new Date().toISOString() } };
  }
}
