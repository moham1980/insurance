import { Body, Controller, Get, Headers, Param, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Idempotent } from '@insurance/shared';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { DocumentsService, ALLOWED_MIMETYPES, DOCUMENT_TYPES } from './documents.service';
import { Document } from './entities/Document';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { auditLogger } from './audit.logger';
import { TenantGuard } from './tenant.guard';
import { BulkRateLimitGuard } from './bulk-rate-limit.guard'; // P2 #1: bulk rate limiting
import { AsyncJobService } from './async-job.service'; // P2 #2: async processing

@Controller()
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly asyncJobService: AsyncJobService,
  ) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private validateFile(mimeType: string, fileSize: number): { valid: boolean; error?: string } {
    const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10);
    if (!ALLOWED_MIMETYPES.includes(mimeType.toLowerCase())) {
      return { valid: false, error: `Unsupported file type: ${mimeType}. Allowed: ${ALLOWED_MIMETYPES.join(', ')}` };
    }
    if (fileSize > maxFileSize) {
      return { valid: false, error: `File size ${fileSize} exceeds maximum allowed ${maxFileSize} bytes` };
    }
    return { valid: true };
  }

  private validateDocumentType(documentType: string): documentType is Document['documentType'] {
    return DOCUMENT_TYPES.includes(documentType as Document['documentType']);
  }

  private sanitizeDocument(doc: Document, req: any) {
    const tenantId = req.tenantId;
    const userId = req.user?.userId || req.user?.sub;
    const signed = userId
      ? this.documentsService.generateSignedUrl({ documentId: doc.documentId, tenantId, userId })
      : { url: null, expiresAt: null };

    const { storageRef, ...rest } = doc as any;
    return {
      ...rest,
      downloadUrl: signed.url,
      downloadUrlExpiresAt: signed.expiresAt,
    };
  }

  private safeUnlink(filePath: string | undefined | null) {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // ignore cleanup errors
      }
    }
  }

  @Post('/documents/upload')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('documents:upload')
  async upload(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Body() _body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req.tenantId as string | undefined;
    const actor = req.user?.userId || req.user?.sub;
    auditLogger.info('documents.upload.request', { correlationId, tenantId, actor, action: 'documents:upload' });

    if (!tenantId) {
      auditLogger.warn('documents.upload.validation_failed', { correlationId, tenantId, actor, action: 'documents:upload', reason: 'tenantId missing' });
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }

    const contentType = (headers['content-type'] || headers['Content-Type'] || '') as string;
    if (!contentType.toLowerCase().includes('multipart/form-data')) {
      auditLogger.warn('documents.upload.validation_failed', { correlationId, tenantId, actor, action: 'documents:upload', reason: 'content-type' });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'multipart/form-data is required' }, correlationId };
    }

    if (typeof req.parts !== 'function') {
      auditLogger.warn('documents.upload.validation_failed', { correlationId, tenantId, actor, action: 'documents:upload', reason: 'multipart parser not available' });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'multipart parser is not available' }, correlationId };
    }

    let claimId = '';
    let documentType: Document['documentType'] = 'other';
    let tempPath: string | null = null;
    let originalName: string | null = null;
    let mimeType: string | null = null;
    let fileSize: number | null = null;

    try {
      for await (const part of req.parts()) {
        if (part.type === 'field') {
          if (part.fieldname === 'claimId' && typeof part.value === 'string') {
            claimId = part.value;
          }
          if (part.fieldname === 'documentType' && typeof part.value === 'string') {
            documentType = part.value as Document['documentType'];
          }
          continue;
        }

        if (part.type === 'file' && !tempPath) {
          originalName = part.filename;
          mimeType = part.mimetype;
          const upload = this.documentsService.prepareUpload(tenantId, part.filename || 'file');
          tempPath = upload.tempPath;
          await pipeline(part.file, fs.createWriteStream(tempPath));
          const stat = fs.statSync(tempPath);
          fileSize = stat.size;
          continue;
        }

        if (part.type === 'file') {
          part.file.resume();
        }
      }
    } catch (err) {
      this.safeUnlink(tempPath);
      auditLogger.error('documents.upload.stream_error', err as Error, { correlationId, tenantId, actor, action: 'documents:upload' });
      return { success: false, error: { code: 'UPLOAD_ERROR', message: 'Failed to read uploaded file' }, correlationId };
    }

    if (!tempPath || !originalName || !mimeType || fileSize == null) {
      auditLogger.warn('documents.upload.validation_failed', { correlationId, tenantId, actor, action: 'documents:upload', reason: 'file missing' });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'file is required (multipart/form-data)' }, correlationId };
    }

    if (!this.validateDocumentType(documentType)) {
      this.safeUnlink(tempPath);
      auditLogger.warn('documents.upload.validation_failed', { correlationId, tenantId, actor, action: 'documents:upload', reason: 'invalid documentType' });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: `Invalid documentType: ${documentType}. Allowed: ${DOCUMENT_TYPES.join(', ')}` }, correlationId };
    }

    const fileCheck = this.validateFile(mimeType, fileSize);
    if (!fileCheck.valid) {
      this.safeUnlink(tempPath);
      auditLogger.warn('documents.upload.validation_failed', { correlationId, tenantId, actor, action: 'documents:upload', reason: fileCheck.error });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: fileCheck.error! }, correlationId };
    }

    const upload = this.documentsService.prepareUpload(tenantId, originalName);
    // Move the already-written temp file to the path service expects.
    try {
      fs.renameSync(tempPath, upload.tempPath);
      tempPath = upload.tempPath;
    } catch {
      this.safeUnlink(tempPath);
      auditLogger.warn('documents.upload.validation_failed', { correlationId, tenantId, actor, action: 'documents:upload', reason: 'failed to stage upload' });
      return { success: false, error: { code: 'UPLOAD_ERROR', message: 'Failed to stage uploaded file' }, correlationId };
    }

    try {
      const doc = await this.documentsService.createFromUpload({
        correlationId,
        tenantId,
        claimId: claimId || undefined,
        documentType,
        file: {
          originalname: originalName,
          tempPath: upload.tempPath,
          storageRef: upload.storageRef,
          mimetype: mimeType,
          size: fileSize,
        },
      });

      auditLogger.info('documents.upload.success', {
        correlationId,
        tenantId,
        actor,
        action: 'documents:upload',
        documentId: doc.documentId,
        claimId: doc.claimId,
        documentType: doc.documentType,
      });

      return { success: true, data: this.sanitizeDocument(doc, req), correlationId };
    } catch (err) {
      this.safeUnlink(upload.tempPath);
      auditLogger.error('documents.upload.failed', err as Error, { correlationId, tenantId, actor, action: 'documents:upload' });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message }, correlationId };
    }
  }

  @Post('/documents/link')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('documents:link')
  async link(@Headers() headers: Record<string, any>, @Req() req: any, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req.tenantId as string | undefined;
    const actor = req.user?.userId || req.user?.sub;
    auditLogger.info('documents.link.request', { correlationId, tenantId, actor, action: 'documents:link' });

    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }

    if (!body?.documentType || !body?.fileName || !body?.storageRef) {
      auditLogger.warn('documents.link.validation_failed', { correlationId, tenantId, actor, action: 'documents:link' });
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'documentType, fileName, storageRef are required' },
        correlationId,
      };
    }

    if (!this.validateDocumentType(body.documentType)) {
      auditLogger.warn('documents.link.validation_failed', { correlationId, tenantId, actor, action: 'documents:link', reason: 'invalid documentType' });
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: `Invalid documentType: ${body.documentType}` },
        correlationId,
      };
    }

    try {
      const doc = await this.documentsService.linkDocument({
        correlationId,
        tenantId,
        claimId: body.claimId || undefined,
        documentType: body.documentType,
        file: {
          fileName: body.fileName,
          storageRef: body.storageRef,
          mimeType: body.mimeType,
          fileSize: body.fileSize,
        },
        createdBy: actor,
      });

      auditLogger.info('documents.link.success', {
        correlationId,
        tenantId,
        actor,
        action: 'documents:link',
        documentId: doc.documentId,
        claimId: doc.claimId,
        documentType: doc.documentType,
      });

      return { success: true, data: this.sanitizeDocument(doc, req), correlationId };
    } catch (err) {
      auditLogger.error('documents.link.failed', err as Error, { correlationId, tenantId, actor, action: 'documents:link' });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message }, correlationId };
    }
  }

  @Get('/documents/:documentId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('documents:view')
  async get(@Headers() headers: Record<string, any>, @Req() req: any, @Param('documentId') documentId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req.tenantId as string | undefined;
    const actor = req.user?.userId || req.user?.sub;
    auditLogger.info('documents.get.request', { correlationId, tenantId, actor, action: 'documents:view', documentId });

    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }

    const doc = await this.documentsService.getDocument(documentId, tenantId);
    if (!doc) {
      auditLogger.warn('documents.get.not_found', { correlationId, tenantId, actor, action: 'documents:view', documentId });
      return { success: false, error: { code: 'NOT_FOUND', message: 'Document not found' }, correlationId };
    }

    return { success: true, data: this.sanitizeDocument(doc, req), correlationId };
  }

  @Get('/documents/:documentId/signed-url')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('documents:view')
  async getSignedUrl(@Headers() headers: Record<string, any>, @Req() req: any, @Param('documentId') documentId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req.tenantId as string | undefined;
    const actor = req.user?.userId || req.user?.sub;
    auditLogger.info('documents.signed_url.request', { correlationId, tenantId, actor, action: 'documents:view', documentId });

    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }

    const doc = await this.documentsService.getDocument(documentId, tenantId);
    if (!doc) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Document not found' }, correlationId };
    }

    const signed = this.documentsService.generateSignedUrl({ documentId, tenantId, userId: actor });
    return { success: true, data: { downloadUrl: signed.url, expiresAt: signed.expiresAt }, correlationId };
  }

  @Get('/documents/:documentId/download')
  async download(
    @Param('documentId') documentId: string,
    @Query('token') token: string | undefined,
    @Req() req: any,
    @Res() res: any
  ) {
    if (!token) {
      return res.status(400).send({ success: false, error: { code: 'TOKEN_REQUIRED', message: 'Download token is required' } });
    }

    let verified;
    try {
      verified = this.documentsService.verifySignedUrl(token);
    } catch (err) {
      return res.status(400).send({ success: false, error: { code: 'INVALID_TOKEN', message: (err as Error).message } });
    }

    if (verified.documentId !== documentId) {
      return res.status(400).send({ success: false, error: { code: 'INVALID_TOKEN', message: 'Token does not match document' } });
    }

    const doc = await this.documentsService.getDocument(verified.documentId, verified.tenantId);
    if (!doc) {
      return res.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    try {
      const stream = await this.documentsService.getDownloadStream(doc);
      res.type(doc.mimeType || 'application/octet-stream');
      res.header('Content-Disposition', `inline; filename="${doc.fileName || 'document'}"`);
      return res.send(stream);
    } catch (err) {
      return res.status(500).send({ success: false, error: { code: 'DOWNLOAD_ERROR', message: (err as Error).message } });
    }
  }

  @Get('/documents')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('documents:list')
  async list(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Query('claimId') claimId?: string,
    @Query('reconciliationId') reconciliationId?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req.tenantId as string | undefined;
    const actor = req.user?.userId || req.user?.sub;
    auditLogger.info('documents.list.request', { correlationId, tenantId, actor, action: 'documents:list' });

    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }

    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10);

    const { rows, total } = await this.documentsService.listDocuments({
      tenantId,
      claimId,
      reconciliationId,
      limit: Number.isFinite(lim) ? lim : 50,
      offset: Number.isFinite(off) ? off : 0,
    });

    return {
      success: true,
      data: rows.map((doc) => this.sanitizeDocument(doc, req)),
      pagination: {
        total,
        limit: Number.isFinite(lim) ? lim : 50,
        offset: Number.isFinite(off) ? off : 0,
      },
      correlationId,
    };
  }

  @Post('/documents/:documentId/validate')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('documents:view')
  async validate(@Headers() headers: Record<string, any>, @Req() req: any, @Param('documentId') documentId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req.tenantId as string | undefined;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }
    const result = await this.documentsService.validateDocument(documentId, tenantId);
    return { success: true, data: result, correlationId };
  }

  // ── Boundary: simple (mimeType-based) classification ───────────────
  // This endpoint performs a lightweight, mimeType-based classification only.
  // It does NOT invoke AI/OCR. For advanced AI/OCR-based document
  // classification, use document-ai-service
  // (POST /document-ai/documents/:documentId/classify). The two classify
  // endpoints are intentionally distinct: document-service = simple/fast,
  // document-ai-service = advanced/AI. (P1 #3)
  @Post('/documents/:documentId/classify')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('documents:view')
  @Idempotent({ ttl: 86400 })
  async classify(@Headers() headers: Record<string, any>, @Req() req: any, @Param('documentId') documentId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req.tenantId as string | undefined;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }
    const result = await this.documentsService.classifyDocument(documentId, tenantId);
    return { success: true, data: result, correlationId };
  }

  @Post('/documents/:documentId/extract')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('documents:upload')
  @Idempotent({ ttl: 86400 })
  async extract(@Headers() headers: Record<string, any>, @Req() req: any, @Param('documentId') documentId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req.tenantId as string | undefined;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }
    const doc = await this.documentsService.startExtraction(documentId, tenantId, correlationId);
    return { success: true, data: this.sanitizeDocument(doc, req), correlationId };
  }

  // P2 #2: Async extract — create a job and return jobId immediately
  @Post('/documents/:documentId/extract/async')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('documents:upload')
  async extractAsync(@Headers() headers: Record<string, any>, @Req() req: any, @Param('documentId') documentId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req.tenantId as string | undefined;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }
    const job = this.asyncJobService.createJob();
    this.asyncJobService.runJob(job.jobId, async () => {
      return this.documentsService.startExtraction(documentId, tenantId, correlationId);
    }).catch((err) => {
      auditLogger.error('documents.extract.async.failed', err as Error, { correlationId, tenantId, documentId, jobId: job.jobId });
    });
    return { success: true, data: { jobId: job.jobId, status: job.status }, correlationId };
  }

  // P2 #2: Async classify — create a job and return jobId immediately
  @Post('/documents/:documentId/classify/async')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('documents:view')
  async classifyAsync(@Headers() headers: Record<string, any>, @Req() req: any, @Param('documentId') documentId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req.tenantId as string | undefined;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }
    const job = this.asyncJobService.createJob();
    this.asyncJobService.runJob(job.jobId, async () => {
      return this.documentsService.classifyDocument(documentId, tenantId);
    }).catch((err) => {
      auditLogger.error('documents.classify.async.failed', err as Error, { correlationId, tenantId, documentId, jobId: job.jobId });
    });
    return { success: true, data: { jobId: job.jobId, status: job.status }, correlationId };
  }

  // P2 #2: Get job status
  @Get('/jobs/:jobId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('documents:view')
  async getJob(@Headers() headers: Record<string, any>, @Param('jobId') jobId: string) {
    const correlationId = this.getCorrelationId(headers);
    const job = this.asyncJobService.getJob(jobId);
    if (!job) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Job not found' }, correlationId };
    }
    return { success: true, data: job, correlationId };
  }

  // Reinsurance invoice artifact endpoints
  @Post('/documents/reinsurance-invoice/upload')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('documents:upload')
  async uploadReinsuranceInvoice(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Body() _body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req.tenantId as string | undefined;
    const actor = req.user?.userId || req.user?.sub;
    auditLogger.info('documents.reinsurance_invoice.upload.request', { correlationId, tenantId, actor, action: 'documents:upload' });

    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }

    const contentType = (headers['content-type'] || headers['Content-Type'] || '') as string;
    if (!contentType.toLowerCase().includes('multipart/form-data')) {
      auditLogger.warn('documents.reinsurance_invoice.upload.validation_failed', { correlationId, tenantId, actor, action: 'documents:upload', reason: 'content-type' });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'multipart/form-data is required' }, correlationId };
    }

    if (typeof req.parts !== 'function') {
      auditLogger.warn('documents.reinsurance_invoice.upload.validation_failed', { correlationId, tenantId, actor, action: 'documents:upload', reason: 'multipart parser not available' });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'multipart parser is not available' }, correlationId };
    }

    let reconciliationId = '';
    let metadata: any = {};
    let tempPath: string | null = null;
    let originalName: string | null = null;
    let mimeType: string | null = null;
    let fileSize: number | null = null;

    try {
      for await (const part of req.parts()) {
        if (part.type === 'field') {
          if (part.fieldname === 'reconciliationId' && typeof part.value === 'string') {
            reconciliationId = part.value;
          }
          if (part.fieldname === 'metadata' && typeof part.value === 'string') {
            try {
              metadata = JSON.parse(part.value);
            } catch {
              // Ignore parse errors
            }
          }
          continue;
        }

        if (part.type === 'file' && !tempPath) {
          originalName = part.filename;
          mimeType = part.mimetype;
          const upload = this.documentsService.prepareUpload(tenantId, part.filename || 'file');
          tempPath = upload.tempPath;
          await pipeline(part.file, fs.createWriteStream(tempPath));
          const stat = fs.statSync(tempPath);
          fileSize = stat.size;
          continue;
        }

        if (part.type === 'file') {
          part.file.resume();
        }
      }
    } catch (err) {
      this.safeUnlink(tempPath);
      auditLogger.error('documents.reinsurance_invoice.upload.stream_error', err as Error, { correlationId, tenantId, actor, action: 'documents:upload' });
      return { success: false, error: { code: 'UPLOAD_ERROR', message: 'Failed to read uploaded file' }, correlationId };
    }

    if (!reconciliationId) {
      this.safeUnlink(tempPath);
      auditLogger.warn('documents.reinsurance_invoice.upload.validation_failed', { correlationId, tenantId, actor, action: 'documents:upload', reason: 'reconciliationId missing' });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'reconciliationId is required' }, correlationId };
    }

    if (!tempPath || !originalName || !mimeType || fileSize == null) {
      auditLogger.warn('documents.reinsurance_invoice.upload.validation_failed', { correlationId, tenantId, actor, action: 'documents:upload', reason: 'file missing' });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'file is required (multipart/form-data)' }, correlationId };
    }

    const fileCheck = this.validateFile(mimeType, fileSize);
    if (!fileCheck.valid) {
      this.safeUnlink(tempPath);
      auditLogger.warn('documents.reinsurance_invoice.upload.validation_failed', { correlationId, tenantId, actor, action: 'documents:upload', reason: fileCheck.error });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: fileCheck.error! }, correlationId };
    }

    const upload = this.documentsService.prepareUpload(tenantId, originalName);
    try {
      fs.renameSync(tempPath, upload.tempPath);
      tempPath = upload.tempPath;
    } catch {
      this.safeUnlink(tempPath);
      return { success: false, error: { code: 'UPLOAD_ERROR', message: 'Failed to stage uploaded file' }, correlationId };
    }

    try {
      const doc = await this.documentsService.createReinsuranceInvoiceArtifact({
        correlationId,
        tenantId,
        reconciliationId,
        file: {
          originalname: originalName,
          tempPath: upload.tempPath,
          storageRef: upload.storageRef,
          mimetype: mimeType,
          size: fileSize,
        },
        metadata,
        createdBy: actor,
      });

      auditLogger.info('documents.reinsurance_invoice.upload.success', {
        correlationId,
        tenantId,
        actor,
        action: 'documents:upload',
        documentId: doc.documentId,
        reconciliationId: doc.reconciliationId,
      });

      return { success: true, data: this.sanitizeDocument(doc, req), correlationId };
    } catch (err) {
      this.safeUnlink(upload.tempPath);
      auditLogger.error('documents.reinsurance_invoice.upload.failed', err as Error, { correlationId, tenantId, actor, action: 'documents:upload' });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message }, correlationId };
    }
  }

  @Post('/documents/reinsurance-invoice/link')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('documents:link')
  async linkReinsuranceInvoice(@Headers() headers: Record<string, any>, @Req() req: any, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req.tenantId as string | undefined;
    const actor = req.user?.userId || req.user?.sub;
    auditLogger.info('documents.reinsurance_invoice.link.request', { correlationId, tenantId, actor, action: 'documents:link' });

    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }

    if (!body?.reconciliationId || !body?.fileName || !body?.storageRef) {
      auditLogger.warn('documents.reinsurance_invoice.link.validation_failed', { correlationId, tenantId, actor, action: 'documents:link' });
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'reconciliationId, fileName, storageRef are required' },
        correlationId,
      };
    }

    try {
      const doc = await this.documentsService.linkReinsuranceInvoiceArtifact({
        correlationId,
        tenantId,
        reconciliationId: body.reconciliationId,
        file: {
          fileName: body.fileName,
          storageRef: body.storageRef,
          mimeType: body.mimeType,
          fileSize: body.fileSize,
        },
        metadata: body.metadata,
        createdBy: actor,
      });

      auditLogger.info('documents.reinsurance_invoice.link.success', {
        correlationId,
        tenantId,
        actor,
        action: 'documents:link',
        documentId: doc.documentId,
        reconciliationId: doc.reconciliationId,
      });

      return { success: true, data: this.sanitizeDocument(doc, req), correlationId };
    } catch (err) {
      auditLogger.error('documents.reinsurance_invoice.link.failed', err as Error, { correlationId, tenantId, actor, action: 'documents:link' });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message }, correlationId };
    }
  }

  @Get('/documents/reconciliation/:reconciliationId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('documents:view')
  async getReconciliationArtifacts(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('reconciliationId') reconciliationId: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req.tenantId as string | undefined;
    const actor = req.user?.userId || req.user?.sub;
    auditLogger.info('documents.reconciliation_artifacts.get.request', { correlationId, tenantId, actor, action: 'documents:view', reconciliationId });

    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }

    const docs = await this.documentsService.getReconciliationArtifacts(reconciliationId, tenantId);

    return { success: true, data: docs.map((doc) => this.sanitizeDocument(doc, req)), correlationId };
  }

  // ── P2 #7: Retention policy and legal hold ───────────────────────────

  @Put('/documents/:documentId/legal-hold')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('documents:admin')
  async setLegalHold(@Headers() headers: Record<string, any>, @Req() req: any, @Param('documentId') documentId: string, @Body() body: { legalHold: boolean }) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req.tenantId as string | undefined;
    const actor = req.user?.userId || req.user?.sub;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }
    if (typeof body?.legalHold !== 'boolean') {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'legalHold (boolean) is required' }, correlationId };
    }
    auditLogger.info('documents.legal_hold.set', { correlationId, tenantId, actor, action: 'documents:admin', documentId, legalHold: body.legalHold });
    const doc = await this.documentsService.setLegalHold(documentId, tenantId, body.legalHold);
    return { success: true, data: this.sanitizeDocument(doc, req), correlationId };
  }

  @Put('/documents/:documentId/retention')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('documents:admin')
  async setRetention(@Headers() headers: Record<string, any>, @Req() req: any, @Param('documentId') documentId: string, @Body() body: { retentionUntil?: string | null }) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req.tenantId as string | undefined;
    const actor = req.user?.userId || req.user?.sub;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }
    auditLogger.info('documents.retention.set', { correlationId, tenantId, actor, action: 'documents:admin', documentId, retentionUntil: body?.retentionUntil });
    const retentionUntil = body?.retentionUntil ? new Date(body.retentionUntil) : null;
    const doc = await this.documentsService.setRetentionUntil(documentId, tenantId, retentionUntil);
    return { success: true, data: this.sanitizeDocument(doc, req), correlationId };
  }

  @Post('/documents/retention/apply')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('documents:admin')
  async applyRetentionPolicy(@Headers() headers: Record<string, any>, @Req() req: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req.tenantId as string | undefined;
    const actor = req.user?.userId || req.user?.sub;
    auditLogger.info('documents.retention.apply', { correlationId, tenantId, actor, action: 'documents:admin' });
    const result = await this.documentsService.applyRetentionPolicy();
    return { success: true, data: result, correlationId };
  }

  // P2 #1: Bulk classify — classify multiple documents in a single request
  @Post('/documents/classify/bulk')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard, BulkRateLimitGuard)
  @RequirePermissions('documents:view')
  async bulkClassify(@Headers() headers: Record<string, any>, @Req() req: any, @Body() body: { items: Array<{ documentId: string }> }) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req.tenantId as string | undefined;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }
    const items = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'items array is required' }, correlationId };
    }
    if (items.length > 100) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Maximum 100 items per bulk request' }, correlationId };
    }

    const results: Array<{ success: boolean; data?: any; error?: any }> = [];
    let succeeded = 0;
    let failed = 0;

    for (const item of items) {
      try {
        if (!item?.documentId) {
          results.push({ success: false, error: { code: 'VALIDATION_ERROR', message: 'documentId is required' } });
          failed++;
          continue;
        }
        const result = await this.documentsService.classifyDocument(item.documentId, tenantId);
        results.push({ success: true, data: result });
        succeeded++;
      } catch (e: any) {
        const err = e instanceof Error ? e : new Error(String(e));
        results.push({ success: false, error: { code: err.message.includes('not found') ? 'NOT_FOUND' : 'INTERNAL_ERROR', message: err.message } });
        failed++;
      }
    }

    return {
      success: true,
      data: {
        results,
        summary: { total: items.length, succeeded, failed },
      },
      correlationId,
    };
  }

  // P2 #1: Bulk extract — start extraction for multiple documents in a single request
  @Post('/documents/extract/bulk')
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard, BulkRateLimitGuard)
  @RequirePermissions('documents:upload')
  async bulkExtract(@Headers() headers: Record<string, any>, @Req() req: any, @Body() body: { items: Array<{ documentId: string }> }) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req.tenantId as string | undefined;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }
    const items = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'items array is required' }, correlationId };
    }
    if (items.length > 100) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Maximum 100 items per bulk request' }, correlationId };
    }

    const results: Array<{ success: boolean; data?: any; error?: any }> = [];
    let succeeded = 0;
    let failed = 0;

    for (const item of items) {
      try {
        if (!item?.documentId) {
          results.push({ success: false, error: { code: 'VALIDATION_ERROR', message: 'documentId is required' } });
          failed++;
          continue;
        }
        const doc = await this.documentsService.startExtraction(item.documentId, tenantId, correlationId);
        results.push({ success: true, data: this.sanitizeDocument(doc, req) });
        succeeded++;
      } catch (e: any) {
        const err = e instanceof Error ? e : new Error(String(e));
        results.push({ success: false, error: { code: err.message.includes('not found') ? 'NOT_FOUND' : 'INTERNAL_ERROR', message: err.message } });
        failed++;
      }
    }

    return {
      success: true,
      data: {
        results,
        summary: { total: items.length, succeeded, failed },
      },
      correlationId,
    };
  }
}
