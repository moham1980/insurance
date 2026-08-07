import { Controller, Post, Get, Body, Param, Headers, Put, Delete, Query, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { RuleEngineService } from './rule-engine.service';
import { RuleStatus, RuleType } from './entities/Rule';
import { ExecutionStatus } from './entities/RuleExecution';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { TenantGuard } from './tenant.guard';
import { RequirePermissions } from './permissions.decorator';

@Controller('rule-engine')
@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
export class RuleEngineController {
  constructor(private readonly service: RuleEngineService) {}

  private tenantIdFrom(req: any): string {
    const tenantId = req?.user?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Tenant not available in token' },
      });
    }
    return tenantId as string;
  }

  @Post('rules')
  @RequirePermissions('rule_engine:rules:create')
  async createRule(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Body() body: {
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
    const tenantId = this.tenantIdFrom(req);
    const result = await this.service.createRule({ ...body, tenantId });
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Put('rules/:id/activate')
  @RequirePermissions('rule_engine:rules:activate')
  async activateRule(
    @Req() req: any,
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = headers['x-correlation-id'] || `re-${Date.now()}`;
    const tenantId = this.tenantIdFrom(req);
    const result = await this.service.activateRule(tenantId, id);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // P1 #5 (SoD): Submit / Approve / Reject endpoints
  // State machine: DRAFT → PENDING_APPROVAL → APPROVED/REJECTED
  // The submitter cannot be the approver (Segregation of Duties).
  // ──────────────────────────────────────────────────────────────────────────

  @Put('rules/:id/submit')
  @RequirePermissions('rule_engine:rules:submit')
  async submitRuleForApproval(
    @Req() req: any,
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = headers['x-correlation-id'] || `re-${Date.now()}`;
    const tenantId = this.tenantIdFrom(req);
    const actor = req?.user?.userId || req?.user?.sub;
    if (!actor) {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authenticated user identity is required' },
      });
    }
    const result = await this.service.submitRuleForApproval(tenantId, id, actor);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Put('rules/:id/approve')
  @RequirePermissions('rule_engine:rules:approve')
  async approveRule(
    @Req() req: any,
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = headers['x-correlation-id'] || `re-${Date.now()}`;
    const tenantId = this.tenantIdFrom(req);
    const actor = req?.user?.userId || req?.user?.sub;
    if (!actor) {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authenticated user identity is required' },
      });
    }
    const result = await this.service.approveRule(tenantId, id, actor);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Put('rules/:id/reject')
  @RequirePermissions('rule_engine:rules:approve')
  async rejectRule(
    @Req() req: any,
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
    @Body() body: { reason?: string },
  ) {
    const correlationId = headers['x-correlation-id'] || `re-${Date.now()}`;
    const tenantId = this.tenantIdFrom(req);
    const actor = req?.user?.userId || req?.user?.sub;
    if (!actor) {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authenticated user identity is required' },
      });
    }
    const result = await this.service.rejectRule(tenantId, id, actor, body?.reason);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Put('rules/:id/deactivate')
  @RequirePermissions('rule_engine:rules:deactivate')
  async deactivateRule(
    @Req() req: any,
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = headers['x-correlation-id'] || `re-${Date.now()}`;
    const tenantId = this.tenantIdFrom(req);
    const result = await this.service.deactivateRule(tenantId, id);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Put('rules/:id')
  @RequirePermissions('rule_engine:rules:update')
  async updateRule(
    @Req() req: any,
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
    const tenantId = this.tenantIdFrom(req);
    const result = await this.service.updateRule(tenantId, id, body);
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
  @RequirePermissions('rule_engine:rules:delete')
  async deleteRule(
    @Req() req: any,
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = headers['x-correlation-id'] || `re-${Date.now()}`;
    const tenantId = this.tenantIdFrom(req);
    const result = await this.service.deleteRule(tenantId, id);
    return {
      success: result,
      correlationId,
    };
  }

  @Get('rules/:id/validate')
  @RequirePermissions('rule_engine:rules:view')
  async validateRule(
    @Req() req: any,
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = headers['x-correlation-id'] || `re-${Date.now()}`;
    const tenantId = this.tenantIdFrom(req);
    const result = await this.service.validateRule(tenantId, id);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Post('evaluate')
  @RequirePermissions('rule_engine:evaluate')
  async evaluateRules(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Body() body: {
      ruleSetKey: string;
      businessKey?: string;
      input: Record<string, any>;
      metadata?: Record<string, any>;
      dryRun?: boolean;
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `re-${Date.now()}`;
    const tenantId = this.tenantIdFrom(req);
    const result = await this.service.evaluateRules({ ...body, tenantId });
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Get('rules/:id')
  @RequirePermissions('rule_engine:rules:view')
  async getRule(@Req() req: any, @Param('id') id: string) {
    const tenantId = this.tenantIdFrom(req);
    const result = await this.service.getRule(tenantId, id);
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
  @RequirePermissions('rule_engine:rules:list')
  async listRules(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query() query: any,
  ) {
    const tenantId = this.tenantIdFrom(req);
    const result = await this.service.listRules({
      tenantId,
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
  @RequirePermissions('rule_engine:executions:list')
  async listExecutions(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query() query: any,
  ) {
    const tenantId = this.tenantIdFrom(req);
    const result = await this.service.listExecutions({
      tenantId,
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
  @RequirePermissions('rule_engine:executions:view')
  async getExecution(@Req() req: any, @Param('id') id: string) {
    const tenantId = this.tenantIdFrom(req);
    const result = await this.service.getExecution(tenantId, id);
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
  @RequirePermissions('rule_engine:executions:list')
  async getExecutionMetrics(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query() query: any,
  ) {
    const tenantId = this.tenantIdFrom(req);
    const result = await this.service.getExecutionMetrics({
      tenantId,
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
  @RequirePermissions('rule_engine:templates:create')
  async createTemplate(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Body() body: {
      name: string;
      category: string;
      description?: string;
      conditionTemplate: string;
      actionTemplate?: any;
      variables: string[];
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `re-${Date.now()}`;
    const tenantId = this.tenantIdFrom(req);
    const result = await this.service.createTemplate({ ...body, tenantId });
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Get('templates')
  @RequirePermissions('rule_engine:templates:list')
  async listTemplates(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query() query: any,
  ) {
    const tenantId = this.tenantIdFrom(req);
    const result = await this.service.listTemplates({
      tenantId,
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
  @RequirePermissions('rule_engine:templates:create')
  async createRuleFromTemplate(
    @Req() req: any,
    @Param('templateId') templateId: string,
    @Headers() headers: Record<string, any>,
    @Body() body: {
      name: string;
      ruleSetKey: string;
      type: RuleType;
      variableValues: Record<string, any>;
      priority?: number;
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `re-${Date.now()}`;
    const tenantId = this.tenantIdFrom(req);
    const result = await this.service.createRuleFromTemplate({
      ...body,
      tenantId,
      templateId,
    });
    return {
      success: true,
      data: result,
      correlationId,
    };
  }
}
