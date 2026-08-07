import { Controller, Post, Get, Body, Param, Headers, Put, Delete, Query, Req, UseGuards } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowStatus } from './entities/WorkflowDefinition';
import { InstanceStatus } from './entities/WorkflowInstance';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';

/**
 * ──────────────────────────────────────────────────────────────────────────
 * ARCHITECTURE BOUNDARY (P1 #1 — workflow-service vs workflow-engine-service)
 * ──────────────────────────────────────────────────────────────────────────
 * This controller is the **domain-oriented workflow wrapper**.
 * It provides domain-specific workflow templates, task execution, and
 * business-level workflow operations on top of the generic BPMN engine.
 *
 * The definition-management endpoints below (create/activate/deactivate/
 * validate/update/delete/get/list definitions) currently have independent
 * logic that DUPLICATES `workflow-engine-service`.  These should eventually
 * delegate to `workflow-engine-service` (the canonical BPMN engine) instead
 * of maintaining a parallel definition store.
 *
 * Responsibility:  domain-specific workflows, templates, task execution
 * Delegates to:    `workflow-engine-service` for generic BPMN definition &
 *                  instance lifecycle management.
 * ──────────────────────────────────────────────────────────────────────────
 */
@Controller('workflow')
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class WorkflowController {
  constructor(private readonly service: WorkflowService) {}

  // P1 #1: Definition management below duplicates workflow-engine-service.
  // These endpoints should delegate to workflow-engine-service in a future refactor.
  @Post('definitions')
  async createDefinition(
    @Headers() headers: Record<string, any>,
    @Body() body: {
      tenantId: string;
      name: string;
      key: string;
      description?: string;
      definition: any;
      metadata?: Record<string, any>;
      version?: number;
      tags?: string[];
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `wf-${Date.now()}`;
    const result = await this.service.createDefinition(body);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Put('definitions/:id/activate')
  async activateDefinition(
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = headers['x-correlation-id'] || `wf-${Date.now()}`;
    const result = await this.service.activateDefinition(id);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Put('definitions/:id/deactivate')
  async deactivateDefinition(
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = headers['x-correlation-id'] || `wf-${Date.now()}`;
    const result = await this.service.deactivateDefinition(id);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Get('definitions/:id/validate')
  async validateDefinition(
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = headers['x-correlation-id'] || `wf-${Date.now()}`;
    const result = await this.service.validateDefinition(id);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Put('definitions/:id')
  async updateDefinition(
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
    @Body() body: {
      name?: string;
      description?: string;
      definition?: any;
      metadata?: Record<string, any>;
      tags?: string[];
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `wf-${Date.now()}`;
    const result = await this.service.updateDefinition(id, body);
    if (!result) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Definition not found' },
        correlationId,
      };
    }
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Delete('definitions/:id')
  async deleteDefinition(
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = headers['x-correlation-id'] || `wf-${Date.now()}`;
    const result = await this.service.deleteDefinition(id);
    return {
      success: result,
      correlationId,
    };
  }

  @Get('definitions/:id')
  async getDefinition(@Param('id') id: string) {
    const result = await this.service.getDefinition(id);
    if (!result) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Definition not found' },
      };
    }
    return {
      success: true,
      data: result,
    };
  }

  @Get('definitions')
  async listDefinitions(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query() query: any,
  ) {
    const result = await this.service.listDefinitions({
      tenantId: req?.user?.tenantId || query.tenantId,
      key: query.key,
      status: query.status as WorkflowStatus,
      tags: query.tags ? query.tags.split(',') : undefined,
      limit: Math.min(parseInt(query.limit, 10) || 50, 200),
      offset: parseInt(query.offset, 10) || 0,
    });
    return {
      success: true,
      data: result.items,
      pagination: { total: result.total, limit: Math.min(parseInt(query.limit, 10) || 50, 200), offset: parseInt(query.offset, 10) || 0 },
    };
  }

  @Post('instances')
  async startInstance(
    @Headers() headers: Record<string, any>,
    @Body() body: {
      tenantId: string;
      workflowKey: string;
      businessKey?: string;
      variables: Record<string, any>;
      metadata?: Record<string, any>;
      initiatorUserId?: string;
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `wf-${Date.now()}`;
    const result = await this.service.startInstance(body);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Post('instances/:id/advance')
  async advanceInstance(
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Body() body: {
      userId?: string;
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `wf-${Date.now()}`;
    // P0 security: use authenticated user from JWT, ignore body.userId to prevent identity spoofing.
    const userId = req?.user?.userId || req?.user?.sub;
    const result = await this.service.advanceInstance(id, userId);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Post('instances/:id/tasks/:taskId/complete')
  async completeTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Body() body: {
      userId?: string;
      variables?: Record<string, any>;
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `wf-${Date.now()}`;
    // P0 security: use authenticated user from JWT, ignore body.userId to prevent identity spoofing.
    const userId = req?.user?.userId || req?.user?.sub;
    const result = await this.service.completeTask(id, taskId, userId, body.variables);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Put('instances/:id/cancel')
  async cancelInstance(
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
    @Body() body: {
      reason?: string;
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `wf-${Date.now()}`;
    await this.service.cancelInstance(id, body.reason);
    return {
      success: true,
      correlationId,
    };
  }

  @Get('instances/:id')
  async getInstance(@Param('id') id: string) {
    const result = await this.service.getInstance(id);
    if (!result) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Instance not found' },
      };
    }
    return {
      success: true,
      data: result,
    };
  }

  @Get('instances')
  async listInstances(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query() query: any,
  ) {
    const result = await this.service.listInstances({
      tenantId: req?.user?.tenantId || query.tenantId,
      workflowKey: query.workflowKey,
      businessKey: query.businessKey,
      status: query.status as InstanceStatus,
      initiatorUserId: query.initiatorUserId,
      limit: Math.min(parseInt(query.limit, 10) || 50, 200),
      offset: parseInt(query.offset, 10) || 0,
    });
    return {
      success: true,
      data: result.items,
      pagination: { total: result.total, limit: Math.min(parseInt(query.limit, 10) || 50, 200), offset: parseInt(query.offset, 10) || 0 },
    };
  }

  @Get('instances/metrics')
  async getInstanceMetrics(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query() query: any,
  ) {
    const result = await this.service.getInstanceMetrics({
      tenantId: req?.user?.tenantId || query.tenantId,
      workflowKey: query.workflowKey,
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined,
    });
    return {
      success: true,
      data: result,
    };
  }
}
