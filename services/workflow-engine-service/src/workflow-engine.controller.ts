import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { WorkflowEngineService, StartProcessParams, SignalParams } from './workflow-engine.service';
import { ProcessDefinition, ProcessDefinitionStatus } from './entities/process-definition.entity';
import { ProcessInstance } from './entities/process-instance.entity';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';

@Controller('workflow')
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class WorkflowEngineController {
  constructor(private readonly workflowEngine: WorkflowEngineService) {}

  private getRequestUser(req: any): { tenantId: string; userId: string } {
    return {
      tenantId: req.tenantId,
      userId: req.user?.sub || req.user?.id || null,
    };
  }

  // ── Process Definition CRUD ──

  @Post('definitions')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('workflow:define')
  async createDefinition(
    @Body() body: {
      key: string;
      name: string;
      description?: string;
      graph: any;
      variables?: Record<string, any>;
      version?: number;
      effectiveFrom?: string;
      effectiveTo?: string;
      metadata?: Record<string, any>;
    },
    @Req() req: any,
  ): Promise<ProcessDefinition> {
    const { tenantId, userId } = this.getRequestUser(req);
    return this.workflowEngine.createDefinition({ ...body, tenantId, createdBy: userId });
  }

  @Get('definitions')
  @RequirePermissions('workflow:list')
  async listDefinitions(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('key') key?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const { tenantId } = this.getRequestUser(req);
    const lim = Math.min(parseInt(limit || '50', 10) || 50, 200);
    const off = parseInt(offset || '0', 10) || 0;
    return this.workflowEngine.listDefinitions(tenantId, status as ProcessDefinitionStatus, key, lim, off);
  }

  @Get('definitions/:id')
  @RequirePermissions('workflow:view')
  async getDefinition(@Param('id') id: string, @Req() req: any): Promise<ProcessDefinition> {
    const { tenantId } = this.getRequestUser(req);
    return this.workflowEngine.getDefinition(id, tenantId);
  }

  @Put('definitions/:id')
  @RequirePermissions('workflow:define')
  async updateDefinition(@Param('id') id: string, @Body() body: Partial<ProcessDefinition>, @Req() req: any): Promise<ProcessDefinition> {
    const { tenantId } = this.getRequestUser(req);
    return this.workflowEngine.updateDefinition(id, tenantId, body);
  }

  @Delete('definitions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('workflow:admin')
  async deleteDefinition(@Param('id') id: string, @Req() req: any): Promise<void> {
    const { tenantId } = this.getRequestUser(req);
    return this.workflowEngine.deleteDefinition(id, tenantId);
  }

  // ── Process Instance Operations ──

  @Post('start')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('workflow:start')
  async startProcess(@Body() params: StartProcessParams, @Req() req: any): Promise<ProcessInstance> {
    const { tenantId, userId } = this.getRequestUser(req);
    return this.workflowEngine.startProcess({ ...params, tenantId, startedBy: userId });
  }

  @Post('instances/:id/signal')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('workflow:signal')
  async signal(@Param('id') instanceId: string, @Body() params: Omit<SignalParams, 'instanceId' | 'tenantId'>, @Req() req: any): Promise<ProcessInstance> {
    const { tenantId, userId } = this.getRequestUser(req);
    return this.workflowEngine.signal({ instanceId, ...params, tenantId, userId });
  }

  @Post('instances/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('workflow:cancel')
  async cancel(@Param('id') instanceId: string, @Body() body: { reason?: string }, @Req() req: any): Promise<ProcessInstance> {
    const { tenantId, userId } = this.getRequestUser(req);
    return this.workflowEngine.cancelInstance(instanceId, userId, tenantId, body.reason);
  }

  @Get('instances/:id')
  @RequirePermissions('workflow:view')
  async getInstance(@Param('id') instanceId: string, @Req() req: any): Promise<ProcessInstance> {
    const { tenantId } = this.getRequestUser(req);
    return this.workflowEngine.getInstance(instanceId, tenantId);
  }

  @Get('instances')
  @RequirePermissions('workflow:list')
  async listInstances(
    @Req() req: any,
    @Query('businessKey') businessKey?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const { tenantId } = this.getRequestUser(req);
    if (businessKey) {
      return this.workflowEngine.getInstancesByBusinessKey(tenantId, businessKey);
    }
    const lim = Math.min(parseInt(limit || '50', 10) || 50, 200);
    const off = parseInt(offset || '0', 10) || 0;
    return this.workflowEngine.listInstances(tenantId, status, lim, off);
  }

  @Get('instances/:id/history')
  @RequirePermissions('workflow:history')
  async getInstanceHistory(@Param('id') instanceId: string, @Req() req: any) {
    const { tenantId } = this.getRequestUser(req);
    return this.workflowEngine.getInstanceHistory(instanceId, tenantId);
  }

  @Get('health/deep')
  async deepHealth() {
    const components: Record<string, string> = {};
    try {
      await this.workflowEngine.checkDbConnection();
      components.db = 'ok';
    } catch (err) {
      components.db = 'error';
      return { status: 'degraded', service: 'workflow-engine-service', timestamp: new Date().toISOString(), components, error: err instanceof Error ? err.message : 'DB connection failed' };
    }
    return { status: 'ok', service: 'workflow-engine-service', timestamp: new Date().toISOString(), components };
  }
}
