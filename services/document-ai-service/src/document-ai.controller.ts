import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { DocumentAiService } from './document-ai.service';
import { auditLogger } from './audit.logger';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';

@Controller()
export class DocumentAiController {
  constructor(private readonly documentAiService: DocumentAiService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  @Get('/document-ai/jobs')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('document_ai:jobs:list')
  async listJobs(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('status') status?: string,
    @Query('documentId') documentId?: string,
    @Query('tenantId') tenantId?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = String(req?.correlationId || this.getCorrelationId(headers));
    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10) || 0;

    auditLogger.info('document_ai.jobs.list.request', { correlationId, action: 'document_ai:jobs:list', status, documentId, tenantId });

    const res = await this.documentAiService.listJobs({ status, documentId, tenantId, limit: lim, offset: off });
    return { success: true, data: res.rows, pagination: { total: res.total, limit: lim, offset: off }, correlationId };
  }

  @Get('/document-ai/jobs/:jobId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('document_ai:jobs:view')
  async getJob(@Req() req: any, @Headers() headers: Record<string, any>, @Param('jobId') jobId: string) {
    const correlationId = String(req?.correlationId || this.getCorrelationId(headers));
    auditLogger.info('document_ai.jobs.get.request', { correlationId, action: 'document_ai:jobs:view', jobId });

    const job = await this.documentAiService.getJob(String(jobId));
    if (!job) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Job not found' }, correlationId };
    }
    return { success: true, data: job, correlationId };
  }

  @Patch('/document-ai/jobs/:jobId/retry')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('document_ai:jobs:retry')
  async retryJob(@Req() req: any, @Headers() headers: Record<string, any>, @Param('jobId') jobId: string, @Body() _body: any) {
    const correlationId = String(req?.correlationId || this.getCorrelationId(headers));
    auditLogger.info('document_ai.jobs.retry.request', { correlationId, action: 'document_ai:jobs:retry', jobId });

    const job = await this.documentAiService.retryJob(String(jobId));
    if (!job) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Job not found' }, correlationId };
    }
    return { success: true, data: job, correlationId };
  }

  @Get('/document-ai/audit')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('document_ai:audit:list')
  async listAudit(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('documentId') documentId?: string,
    @Query('decision') decision?: string,
    @Query('tenantId') tenantId?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = String(req?.correlationId || this.getCorrelationId(headers));
    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10) || 0;

    auditLogger.info('document_ai.audit.list.request', { correlationId, action: 'document_ai:audit:list', documentId, decision, tenantId });

    const res = await this.documentAiService.listAudit({ documentId, decision, tenantId, limit: lim, offset: off });
    return { success: true, data: res.rows, pagination: { total: res.total, limit: lim, offset: off }, correlationId };
  }

  @Get('/document-ai/usage/daily')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('document_ai:usage:view')
  async usageDaily(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('tenantId') tenantId?: string,
    @Query('usageDate') usageDate?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = String(req?.correlationId || this.getCorrelationId(headers));
    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10) || 0;

    auditLogger.info('document_ai.usage.daily.request', { correlationId, action: 'document_ai:usage:view', tenantId, usageDate });

    const res = await this.documentAiService.listUsageDaily({ tenantId, usageDate, limit: lim, offset: off });
    return { success: true, data: res.rows, pagination: { total: res.total, limit: lim, offset: off }, correlationId };
  }

  @Get('/document-ai/eval/cases')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('document_ai:eval:cases:list')
  async listEvalCases(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('enabled') enabled?: string,
    @Query('tag') tag?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = String(req?.correlationId || this.getCorrelationId(headers));
    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10) || 0;

    auditLogger.info('document_ai.eval.cases.list.request', { correlationId, action: 'document_ai:eval:cases:list', enabled, tag });

    const res = await this.documentAiService.listEvalCases({ enabled, tag, limit: lim, offset: off });
    return { success: true, data: res.rows, pagination: { total: res.total, limit: lim, offset: off }, correlationId };
  }

  @Post('/document-ai/eval/cases')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('document_ai:eval:cases:manage')
  async createEvalCase(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = String(req?.correlationId || this.getCorrelationId(headers));
    auditLogger.info('document_ai.eval.cases.create.request', { correlationId, action: 'document_ai:eval:cases:manage' });

    const name = body?.name;
    const documentId = body?.documentId;
    const expected = body?.expected;
    const tags = body?.tags;
    const enabled = body?.enabled;

    if (typeof name !== 'string' || name.trim().length < 3) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'name is required (min 3 chars)' }, correlationId };
    }
    if (typeof documentId !== 'string' || documentId.trim().length < 10) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'documentId is required' }, correlationId };
    }
    if (expected == null || typeof expected !== 'object') {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'expected must be an object' }, correlationId };
    }

    try {
      const row = await this.documentAiService.createEvalCase({
        name: name.trim(),
        documentId: documentId.trim(),
        expected,
        tags: Array.isArray(tags) ? tags : null,
        enabled: typeof enabled === 'boolean' ? enabled : undefined,
      });
      return { success: true, data: row, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('document_ai.eval.cases.create.failed', err, { correlationId, action: 'document_ai:eval:cases:manage' });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create eval case' }, correlationId };
    }
  }

  @Patch('/document-ai/eval/cases/:caseId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('document_ai:eval:cases:manage')
  async updateEvalCase(@Req() req: any, @Headers() headers: Record<string, any>, @Param('caseId') caseId: string, @Body() body: any) {
    const correlationId = String(req?.correlationId || this.getCorrelationId(headers));
    auditLogger.info('document_ai.eval.cases.update.request', { correlationId, action: 'document_ai:eval:cases:manage', caseId });

    try {
      const row = await this.documentAiService.updateEvalCase(String(caseId), {
        name: typeof body?.name === 'string' ? body.name : undefined,
        expected: 'expected' in (body || {}) ? body.expected : undefined,
        tags: 'tags' in (body || {}) ? body.tags : undefined,
        enabled: typeof body?.enabled === 'boolean' ? body.enabled : undefined,
      });

      if (!row) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Eval case not found' }, correlationId };
      }
      return { success: true, data: row, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('document_ai.eval.cases.update.failed', err, { correlationId, action: 'document_ai:eval:cases:manage', caseId });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update eval case' }, correlationId };
    }
  }

  @Get('/document-ai/eval/runs')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('document_ai:eval:runs:list')
  async listEvalRuns(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('status') status?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = String(req?.correlationId || this.getCorrelationId(headers));
    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10) || 0;

    auditLogger.info('document_ai.eval.runs.list.request', { correlationId, action: 'document_ai:eval:runs:list', status });

    const res = await this.documentAiService.listEvalRuns({ status, limit: lim, offset: off });
    return { success: true, data: res.rows, pagination: { total: res.total, limit: lim, offset: off }, correlationId };
  }

  @Post('/document-ai/eval/runs')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('document_ai:eval:runs:start')
  async startEvalRun(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = String(req?.correlationId || this.getCorrelationId(headers));
    auditLogger.info('document_ai.eval.runs.start.request', { correlationId, action: 'document_ai:eval:runs:start' });

    try {
      const run = await this.documentAiService.createEvalRun(body && typeof body === 'object' ? body : null);
      return { success: true, data: run, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('document_ai.eval.runs.start.failed', err, { correlationId, action: 'document_ai:eval:runs:start' });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to start eval run' }, correlationId };
    }
  }

  @Get('/document-ai/eval/runs/:runId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('document_ai:eval:runs:view')
  async getEvalRun(@Req() req: any, @Headers() headers: Record<string, any>, @Param('runId') runId: string) {
    const correlationId = String(req?.correlationId || this.getCorrelationId(headers));
    auditLogger.info('document_ai.eval.runs.get.request', { correlationId, action: 'document_ai:eval:runs:view', runId });

    const run = await this.documentAiService.getEvalRun(String(runId));
    if (!run) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Eval run not found' }, correlationId };
    }
    return { success: true, data: run, correlationId };
  }

  @Get('/document-ai/eval/runs/:runId/results')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('document_ai:eval:runs:view')
  async listEvalResults(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('runId') runId: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = String(req?.correlationId || this.getCorrelationId(headers));
    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10) || 0;

    auditLogger.info('document_ai.eval.results.list.request', { correlationId, action: 'document_ai:eval:runs:view', runId });

    const res = await this.documentAiService.listEvalResults({ runId: String(runId), limit: lim, offset: off });
    return { success: true, data: res.rows, pagination: { total: res.total, limit: lim, offset: off }, correlationId };
  }
}
