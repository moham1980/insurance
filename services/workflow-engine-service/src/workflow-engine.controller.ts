import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
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

  // ── Process Definition CRUD ──

  @Post('definitions')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('workflow:define')
  async createDefinition(@Body() body: {
    key: string;
    name: string;
    description?: string;
    graph: any;
    variables?: Record<string, any>;
    effectiveFrom?: string;
    effectiveTo?: string;
    metadata?: Record<string, any>;
  }): Promise<ProcessDefinition> {
    return this.workflowEngine.createDefinition(body);
  }

  @Get('definitions')
  @RequirePermissions('workflow:list')
  async listDefinitions(@Query('status') status?: string, @Query('key') key?: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    const lim = Math.min(parseInt(limit || '50', 10) || 50, 200);
    const off = parseInt(offset || '0', 10) || 0;
    return this.workflowEngine.listDefinitions(status as ProcessDefinitionStatus, key, lim, off);
  }

  @Get('definitions/:id')
  @RequirePermissions('workflow:view')
  async getDefinition(@Param('id') id: string): Promise<ProcessDefinition> {
    return this.workflowEngine.getDefinition(id);
  }

  @Put('definitions/:id')
  @RequirePermissions('workflow:define')
  async updateDefinition(@Param('id') id: string, @Body() body: Partial<ProcessDefinition>): Promise<ProcessDefinition> {
    return this.workflowEngine.updateDefinition(id, body);
  }

  @Delete('definitions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('workflow:admin')
  async deleteDefinition(@Param('id') id: string): Promise<void> {
    return this.workflowEngine.deleteDefinition(id);
  }

  // ── Process Instance Operations ──

  @Post('start')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('workflow:start')
  async startProcess(@Body() params: StartProcessParams): Promise<ProcessInstance> {
    return this.workflowEngine.startProcess(params);
  }

  @Post('instances/:id/signal')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('workflow:signal')
  async signal(@Param('id') instanceId: string, @Body() params: Omit<SignalParams, 'instanceId'>): Promise<ProcessInstance> {
    return this.workflowEngine.signal({ instanceId, ...params });
  }

  @Post('instances/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('workflow:cancel')
  async cancel(@Param('id') instanceId: string, @Body() body: { cancelledBy: string; reason?: string }): Promise<ProcessInstance> {
    return this.workflowEngine.cancelInstance(instanceId, body.cancelledBy, body.reason);
  }

  @Get('instances/:id')
  @RequirePermissions('workflow:view')
  async getInstance(@Param('id') instanceId: string): Promise<ProcessInstance> {
    return this.workflowEngine.getInstance(instanceId);
  }

  @Get('instances')
  @RequirePermissions('workflow:list')
  async listInstances(@Query('businessKey') businessKey?: string, @Query('status') status?: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    if (businessKey) {
      return this.workflowEngine.getInstancesByBusinessKey(businessKey);
    }
    const lim = Math.min(parseInt(limit || '50', 10) || 50, 200);
    const off = parseInt(offset || '0', 10) || 0;
    return this.workflowEngine.listInstances(status, lim, off);
  }

  @Get('instances/:id/history')
  @RequirePermissions('workflow:history')
  async getInstanceHistory(@Param('id') instanceId: string) {
    return this.workflowEngine.getInstanceHistory(instanceId);
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
