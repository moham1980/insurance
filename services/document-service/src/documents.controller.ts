import { Body, Controller, Get, Headers, Param, Post, Query, Req } from '@nestjs/common';
import path from 'path';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import { DocumentsService } from './documents.service';
import { Document } from './entities/Document';

@Controller()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private ensureUploadDir(): string {
    const uploadDir = process.env.DOCUMENT_UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');
    fs.mkdirSync(uploadDir, { recursive: true });
    return uploadDir;
  }

  @Get('/health')
  health() {
    return { status: 'ok', service: 'document-service' };
  }

  @Post('/documents/upload')
  async upload(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);

    this.ensureUploadDir();

    const contentType = (headers['content-type'] || headers['Content-Type'] || '') as string;

    let claimId = (body?.claimId as string) || '';
    let documentType = ((body?.documentType as Document['documentType']) || 'other') as Document['documentType'];

    if (!contentType.toLowerCase().includes('multipart/form-data')) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'multipart/form-data is required' },
        correlationId,
      };
    }

    let storedPath: string | null = null;
    let originalName: string | null = null;
    let mimeType: string | null = null;
    let fileSize: number | null = null;

    const uploadDir = this.ensureUploadDir();

    if (typeof req.parts !== 'function') {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'multipart parser is not available' },
        correlationId,
      };
    }

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

      if (part.type === 'file' && !storedPath) {
        originalName = part.filename;
        mimeType = part.mimetype;
        const safeName = (part.filename || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
        const storedFileName = `${Date.now()}-${safeName}`;
        storedPath = path.join(uploadDir, storedFileName);
        await pipeline(part.file, fs.createWriteStream(storedPath));
        const stat = fs.statSync(storedPath);
        fileSize = stat.size;
        continue;
      }

      if (part.type === 'file') {
        part.file.resume();
      }
    }

    if (!claimId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'claimId is required' }, correlationId };
    }

    if (!storedPath || !originalName || !mimeType || fileSize == null) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'file is required (multipart/form-data)' },
        correlationId,
      };
    }

    const doc = await this.documentsService.createFromUpload({
      correlationId,
      claimId,
      documentType,
      file: {
        originalname: originalName,
        path: storedPath,
        mimetype: mimeType,
        size: fileSize,
      },
    });

    return { success: true, data: { documentId: doc.documentId, status: doc.status }, correlationId };
  }

  @Post('/documents/link')
  async link(@Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);

    if (!body?.claimId || !body?.documentType || !body?.fileName || !body?.storageRef) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'claimId, documentType, fileName, storageRef are required' },
        correlationId,
      };
    }

    const doc = await this.documentsService.linkDocument({
      correlationId,
      claimId: body.claimId,
      documentType: body.documentType,
      fileName: body.fileName,
      storageRef: body.storageRef,
      mimeType: body.mimeType,
      fileSize: body.fileSize,
    });

    return { success: true, data: { documentId: doc.documentId, status: doc.status }, correlationId };
  }

  @Get('/documents/:documentId')
  async get(@Headers() headers: Record<string, any>, @Param('documentId') documentId: string) {
    const correlationId = this.getCorrelationId(headers);

    const doc = await this.documentsService.getDocument(documentId);
    if (!doc) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Document not found' }, correlationId };
    }

    return { success: true, data: doc, correlationId };
  }

  @Get('/documents')
  async list(
    @Headers() headers: Record<string, any>,
    @Query('claimId') claimId?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);

    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);

    const { rows, total } = await this.documentsService.listDocuments({
      claimId,
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
}
