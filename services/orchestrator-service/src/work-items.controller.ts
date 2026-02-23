import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';

@Controller()
export class WorkItemsController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  @Get('/work-items')
  async list(
    @Headers() headers: Record<string, any>,
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('priority') priority?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);

    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);

    const { rows, total } = await this.orchestratorService.listWorkItems({
      status,
      assignedTo,
      priority,
      limit: Number.isFinite(lim) ? lim : 50,
      offset: Number.isFinite(off) ? off : 0,
    });

    return {
      success: true,
      data: rows,
      pagination: {
        total,
        limit: Number.isFinite(lim) ? lim : 50,
        offset: Number.isFinite(off) ? off : 0,
      },
      correlationId,
    };
  }

  @Get('/work-items/:workItemId')
  async get(@Headers() headers: Record<string, any>, @Param('workItemId') workItemId: string) {
    const correlationId = this.getCorrelationId(headers);

    const workItem = await this.orchestratorService.getWorkItem(workItemId);
    if (!workItem) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Work item not found' },
        correlationId,
      };
    }

    return { success: true, data: workItem, correlationId };
  }

  @Post('/work-items/:workItemId/complete')
  async complete(@Headers() headers: Record<string, any>, @Param('workItemId') workItemId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);

    if (!body?.decision || !body?.decidedBy) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'decision and decidedBy are required' },
        correlationId,
      };
    }

    try {
      const result = await this.orchestratorService.completeWorkItem({
        correlationId,
        workItemId,
        decision: body.decision,
        decidedBy: body.decidedBy,
        notes: body.notes,
      });

      if (!result) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Work item not found' },
          correlationId,
        };
      }

      return {
        success: true,
        data: {
          workItemId: result.workItem.workItemId,
          status: result.workItem.status,
          sagaId: result.workItem.sagaId,
        },
        correlationId,
      };
    } catch (e: any) {
      if (e?.code === 'ALREADY_DECIDED') {
        return {
          success: false,
          error: { code: 'ALREADY_DECIDED', message: e.message },
          correlationId,
        };
      }

      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to complete work item' },
        correlationId,
      };
    }
  }

  @Post('/work-items/:workItemId/assign')
  async assign(@Headers() headers: Record<string, any>, @Param('workItemId') workItemId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);

    if (!body?.assignedTo) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'assignedTo is required' },
        correlationId,
      };
    }

    try {
      const workItem = await this.orchestratorService.assignWorkItem({
        correlationId,
        workItemId,
        assignedTo: body.assignedTo,
      });

      if (!workItem) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Work item not found' },
          correlationId,
        };
      }

      return {
        success: true,
        data: {
          workItemId: workItem.workItemId,
          assignedTo: workItem.assignedTo,
          status: workItem.status,
        },
        correlationId,
      };
    } catch (_e) {
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to assign work item' },
        correlationId,
      };
    }
  }
}
