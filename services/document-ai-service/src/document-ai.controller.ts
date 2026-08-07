import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { DocumentAiService } from './document-ai.service';
import { OcrService, OcrProvider } from './ocr/ocr.service';
import { auditLogger } from './audit.logger';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { OcrRateLimitGuard } from './ocr-rate-limit.guard';
import { AsyncJobService } from './async-job.service'; // P2 #2: async processing

@Controller()
export class DocumentAiController {
  constructor(
    private readonly documentAiService: DocumentAiService,
    private readonly ocrService: OcrService,
    private readonly asyncJobService: AsyncJobService,
  ) {}

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

  @Post('/document-ai/documents/:documentId/redact')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('document_ai:ocr:redact')
  async redactDocument(@Param('documentId') documentId: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const correlationId = String(req?.correlationId || this.getCorrelationId(headers));
    const tenantId = req?.user?.tenantId as string | undefined;
    const actorUserId = req?.user?.userId as string | undefined;
    auditLogger.info('document_ai.ocr.redact.request', { correlationId, action: 'document_ai:ocr:redact', documentId });
    try {
      const result = await this.documentAiService.redactDocument({ documentId, tenantId, actorUserId, correlationId });
      return { success: true, data: result, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('document_ai.ocr.redact.failed', err, { correlationId, action: 'document_ai:ocr:redact', documentId });
      return { success: false, error: { code: e.message === 'Document not found' ? 'NOT_FOUND' : 'INTERNAL_ERROR', message: e.message }, correlationId };
    }
  }

  // ── Boundary: advanced (AI/OCR-based) classification ──────────────
  // This endpoint performs advanced classification using OCR-extracted text
  // and keyword/AI scoring. It is the AI/OCR counterpart to the simple
  // mimeType-based classification in document-service
  // (POST /documents/:documentId/classify). The two classify endpoints are
  // intentionally distinct: document-service = simple/fast (mimeType),
  // document-ai-service = advanced/AI (OCR text + keywords). (P1 #3)
  @Post('/document-ai/documents/:documentId/classify')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('document_ai:ocr:classify')
  async classifyDocument(@Param('documentId') documentId: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const correlationId = String(req?.correlationId || this.getCorrelationId(headers));
    const tenantId = req?.user?.tenantId as string | undefined;
    const actorUserId = req?.user?.userId as string | undefined;
    auditLogger.info('document_ai.ocr.classify.request', { correlationId, action: 'document_ai:ocr:classify', documentId });
    try {
      const result = await this.documentAiService.classifyDocument({ documentId, tenantId, actorUserId, correlationId });
      return { success: true, data: result, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('document_ai.ocr.classify.failed', err, { correlationId, action: 'document_ai:ocr:classify', documentId });
      return { success: false, error: { code: e.message === 'Document not found' ? 'NOT_FOUND' : 'INTERNAL_ERROR', message: e.message }, correlationId };
    }
  }

  @Post('/document-ai/documents/:documentId/confirm')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('document_ai:ocr:confirm')
  async confirmDocument(@Param('documentId') documentId: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const correlationId = String(req?.correlationId || this.getCorrelationId(headers));
    const tenantId = req?.user?.tenantId as string | undefined;
    const actorUserId = req?.user?.userId as string | undefined;
    auditLogger.info('document_ai.ocr.confirm.request', { correlationId, action: 'document_ai:ocr:confirm', documentId });
    try {
      const result = await this.documentAiService.confirmDocumentFields({ documentId, tenantId, actorUserId, correlationId });
      return { success: true, data: result, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('document_ai.ocr.confirm.failed', err, { correlationId, action: 'document_ai:ocr:confirm', documentId });
      return { success: false, error: { code: e.message === 'Document not found' ? 'NOT_FOUND' : 'INTERNAL_ERROR', message: e.message }, correlationId };
    }
  }

  // Direct OCR extract — inline extraction without creating a job
  @Post('/api/v1/ocr/extract')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard, OcrRateLimitGuard)
  @RequirePermissions('document_ai:ocr:extract')
  async extractOcr(@Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const correlationId = String(req?.correlationId || this.getCorrelationId(headers));
    const tenantId = req?.user?.tenantId as string | undefined;
    const actorUserId = req?.user?.userId as string | undefined;
    auditLogger.info('document_ai.ocr.extract.request', { correlationId, action: 'document_ai:ocr:extract', tenantId, actorUserId });

    if (!body?.fileBase64) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'fileBase64 is required' }, correlationId };
    }

    // File size validation — reject files larger than the configured max size
    const maxFileSizeBytes = parseInt(process.env.OCR_MAX_FILE_SIZE_BYTES || '10485760', 10); // default 10MB
    const buffer = Buffer.from(body.fileBase64, 'base64');
    if (buffer.length > maxFileSizeBytes) {
      const maxMB = (maxFileSizeBytes / (1024 * 1024)).toFixed(1);
      auditLogger.warn('document_ai.ocr.extract.file_too_large', { correlationId, action: 'document_ai:ocr:extract', fileSize: buffer.length, maxSize: maxFileSizeBytes });
      return { success: false, error: { code: 'FILE_TOO_LARGE', message: `File size exceeds maximum allowed size of ${maxMB}MB` }, correlationId };
    }

    try {
      const mimeType = body.mimeType || 'image/png';
      const provider = (body.provider as OcrProvider) || OcrProvider.TESSERACT;
      const language = body.language || 'fas+eng';

      const result = await this.ocrService.extractWithFallback(buffer, mimeType, provider, language);
      return { success: true, data: result, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('document_ai.ocr.extract.failed', err, { correlationId, action: 'document_ai:ocr:extract' });
      return { success: false, error: { code: 'OCR_ERROR', message: e.message }, correlationId };
    }
  }

  // P2 #2: Async OCR extract — create a job and return jobId immediately
  @Post('/api/v1/ocr/extract/async')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard, OcrRateLimitGuard)
  @RequirePermissions('document_ai:ocr:extract')
  async extractOcrAsync(@Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const correlationId = String(req?.correlationId || this.getCorrelationId(headers));
    const tenantId = req?.user?.tenantId as string | undefined;
    const actorUserId = req?.user?.userId as string | undefined;
    auditLogger.info('document_ai.ocr.extract.async.request', { correlationId, action: 'document_ai:ocr:extract', tenantId, actorUserId });

    if (!body?.fileBase64) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'fileBase64 is required' }, correlationId };
    }

    const maxFileSizeBytes = parseInt(process.env.OCR_MAX_FILE_SIZE_BYTES || '10485760', 10);
    const buffer = Buffer.from(body.fileBase64, 'base64');
    if (buffer.length > maxFileSizeBytes) {
      const maxMB = (maxFileSizeBytes / (1024 * 1024)).toFixed(1);
      return { success: false, error: { code: 'FILE_TOO_LARGE', message: `File size exceeds maximum allowed size of ${maxMB}MB` }, correlationId };
    }

    const mimeType = body.mimeType || 'image/png';
    const provider = (body.provider as OcrProvider) || OcrProvider.TESSERACT;
    const language = body.language || 'fas+eng';

    const job = this.asyncJobService.createJob();
    this.asyncJobService.runJob(job.jobId, async () => {
      return this.ocrService.extractWithFallback(buffer, mimeType, provider, language);
    }).catch((err) => {
      auditLogger.error('document_ai.ocr.extract.async.failed', err as Error, { correlationId, jobId: job.jobId });
    });

    return { success: true, data: { jobId: job.jobId, status: job.status }, correlationId };
  }

  // P2 #2: Get async job status
  @Get('/api/v1/jobs/:jobId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('document_ai:jobs:view')
  async getAsyncJob(@Param('jobId') jobId: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const correlationId = String(req?.correlationId || this.getCorrelationId(headers));
    const job = this.asyncJobService.getJob(jobId);
    if (!job) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Job not found' }, correlationId };
    }
    return { success: true, data: job, correlationId };
  }
}
