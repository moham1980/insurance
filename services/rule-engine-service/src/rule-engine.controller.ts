import { Controller, Post, Get, Body, Param, Headers, Put, Delete, Query, Req, UseGuards } from '@nestjs/common';
import { RuleEngineService } from './rule-engine.service';
import { RuleStatus, RuleType } from './entities/Rule';
import { ExecutionStatus } from './entities/RuleExecution';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';

@Controller('rule-engine')
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class RuleEngineController {
  constructor(private readonly service: RuleEngineService) {}

  @Post('rules')
  async createRule(
    @Headers() headers: Record<string, any>,
    @Body() body: {
      tenantId: string;
      name: string;
      ruleSetKey: string;
      type: RuleType;
      description?: string;
      condition: { expression: string; variables: string[] };
      action?: any;
      priority?: number;
      metadata?: Record<string, any>;
      templateId?: string;
      version?: number;
      tags?: string[];
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `re-${Date.now()}`;
    const result = await this.service.createRule(body);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Put('rules/:id/activate')
  async activateRule(
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = headers['x-correlation-id'] || `re-${Date.now()}`;
    const result = await this.service.activateRule(id);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Put('rules/:id/deactivate')
  async deactivateRule(
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = headers['x-correlation-id'] || `re-${Date.now()}`;
    const result = await this.service.deactivateRule(id);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Put('rules/:id')
  async updateRule(
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
    @Body() body: {
      name?: string;
      description?: string;
      condition?: { expression: string; variables: string[] };
      action?: any;
      priority?: number;
      status?: RuleStatus;
      metadata?: Record<string, any>;
      tags?: string[];
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `re-${Date.now()}`;
    const result = await this.service.updateRule(id, body);
    if (!result) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Rule not found' },
        correlationId,
      };
    }
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Delete('rules/:id')
  async deleteRule(
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = headers['x-correlation-id'] || `re-${Date.now()}`;
    const result = await this.service.deleteRule(id);
    return {
      success: result,
      correlationId,
    };
  }

  @Get('rules/:id/validate')
  async validateRule(
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = headers['x-correlation-id'] || `re-${Date.now()}`;
    const result = await this.service.validateRule(id);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Post('evaluate')
  async evaluateRules(
    @Headers() headers: Record<string, any>,
    @Body() body: {
      tenantId: string;
      ruleSetKey: string;
      businessKey?: string;
      input: Record<string, any>;
      metadata?: Record<string, any>;
      dryRun?: boolean;
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `re-${Date.now()}`;
    const result = await this.service.evaluateRules(body);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Get('rules/:id')
  async getRule(@Param('id') id: string) {
    const result = await this.service.getRule(id);
    if (!result) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Rule not found' },
      };
    }
    return {
      success: true,
      data: result,
    };
  }

  @Get('rules')
  async listRules(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query() query: any,
  ) {
    const result = await this.service.listRules({
      tenantId: req?.user?.tenantId || query.tenantId,
      ruleSetKey: query.ruleSetKey,
      status: query.status as RuleStatus,
      type: query.type as RuleType,
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

  @Get('executions')
  async listExecutions(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query() query: any,
  ) {
    const result = await this.service.listExecutions({
      tenantId: req?.user?.tenantId || query.tenantId,
      ruleSetKey: query.ruleSetKey,
      businessKey: query.businessKey,
      status: query.status as ExecutionStatus,
      limit: Math.min(parseInt(query.limit, 10) || 50, 200),
      offset: parseInt(query.offset, 10) || 0,
    });
    return {
      success: true,
      data: result.items,
      pagination: { total: result.total, limit: Math.min(parseInt(query.limit, 10) || 50, 200), offset: parseInt(query.offset, 10) || 0 },
    };
  }

  @Get('executions/:id')
  async getExecution(@Param('id') id: string) {
    const result = await this.service.getExecution(id);
    if (!result) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Execution not found' },
      };
    }
    return {
      success: true,
      data: result,
    };
  }

  @Get('executions/metrics')
  async getExecutionMetrics(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query() query: any,
  ) {
    const result = await this.service.getExecutionMetrics({
      tenantId: req?.user?.tenantId || query.tenantId,
      ruleSetKey: query.ruleSetKey,
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined,
    });
    return {
      success: true,
      data: result,
    };
  }

  @Post('templates')
  async createTemplate(
    @Headers() headers: Record<string, any>,
    @Body() body: {
      tenantId: string;
      name: string;
      category: string;
      description?: string;
      conditionTemplate: string;
      actionTemplate?: any;
      variables: string[];
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `re-${Date.now()}`;
    const result = await this.service.createTemplate(body);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Get('templates')
  async listTemplates(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query() query: any,
  ) {
    const result = await this.service.listTemplates({
      tenantId: req?.user?.tenantId || query.tenantId,
      category: query.category,
      limit: Math.min(parseInt(query.limit, 10) || 50, 200),
      offset: parseInt(query.offset, 10) || 0,
    });
    return {
      success: true,
      data: result.items,
      pagination: { total: result.total, limit: Math.min(parseInt(query.limit, 10) || 50, 200), offset: parseInt(query.offset, 10) || 0 },
    };
  }

  @Post('templates/:templateId/rules')
  async createRuleFromTemplate(
    @Param('templateId') templateId: string,
    @Headers() headers: Record<string, any>,
    @Body() body: {
      tenantId: string;
      name: string;
      ruleSetKey: string;
      type: RuleType;
      variableValues: Record<string, any>;
      priority?: number;
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `re-${Date.now()}`;
    const result = await this.service.createRuleFromTemplate({
      ...body,
      templateId,
    });
    return {
      success: true,
      data: result,
      correlationId,
    };
  }
}
