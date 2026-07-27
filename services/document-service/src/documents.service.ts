import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OutboxPublisher } from '@insurance/shared';
import { Document } from './entities/Document';

export const DOCUMENT_TYPES: Document['documentType'][] = [
  'invoice',
  'medical_report',
  'police_report',
  'photo',
  'receipt',
  'other',
  'reinsurance_invoice',
];

export const ALLOWED_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'image/tiff',
];

interface UploadFile {
  originalname: string;
  tempPath: string;
  storageRef: string;
  mimetype: string;
  size: number;
}

interface LinkFile {
  fileName: string;
  storageRef: string;
  mimeType?: string;
  fileSize?: number;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Document) private readonly documentRepo: Repository<Document>
  ) {}

  // ---------------------------------------------------------------------------
  // Storage helpers
  // ---------------------------------------------------------------------------

  private getUploadBaseDir(): string {
    return process.env.DOCUMENT_UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');
  }

  private getSafeTenantId(tenantId: string): string {
    return tenantId.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  private ensureTenantUploadDir(tenantId: string): string {
    const dir = path.join(this.getUploadBaseDir(), 'tenants', this.getSafeTenantId(tenantId));
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  private getEncryptionKey(): Buffer | null {
    if (process.env.DOCUMENT_ENCRYPT_AT_REST !== 'true') return null;
    const raw = process.env.DOCUMENT_ENCRYPTION_KEY;
    if (!raw) {
      throw new Error('DOCUMENT_ENCRYPT_AT_REST is enabled but DOCUMENT_ENCRYPTION_KEY is not set');
    }
    let key = Buffer.from(raw, 'base64');
    if (key.length === 32) return key;
    key = Buffer.from(raw);
    if (key.length === 32) return key;
    return crypto.createHash('sha256').update(raw).digest();
  }

  private isEncryptedStorage(): boolean {
    return this.getEncryptionKey() !== null;
  }

  private safeFileName(originalName: string): string {
    let base = (originalName || 'file')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '_')
      .replace(/^[.]+/, '')
      .replace(/\.$/, '');
    if (!base) base = 'file';
    return `${Date.now()}-${uuidv4()}-${base}`;
  }

  prepareUpload(tenantId: string, originalName: string): { tempPath: string; storageRef: string } {
    const dir = this.ensureTenantUploadDir(tenantId);
    const fileName = this.safeFileName(originalName);
    const tempPath = path.join(dir, `.tmp-${fileName}`);
    let storageRef = path.join('tenants', this.getSafeTenantId(tenantId), fileName);
    storageRef = storageRef.replace(/\\/g, '/');
    return { tempPath, storageRef };
  }

  private getAbsoluteStoragePath(storageRef: string): string {
    const base = this.getUploadBaseDir();
    const resolved = path.resolve(base, storageRef);
    const baseResolved = path.resolve(base);
    if (!resolved.startsWith(baseResolved + path.sep) && resolved !== baseResolved) {
      throw new BadRequestException({ code: 'INVALID_STORAGE_REF', message: 'Storage reference is outside the upload directory' });
    }
    return resolved;
  }

  private validateStorageRef(storageRef: string, tenantId: string): void {
    if (!storageRef || typeof storageRef !== 'string') {
      throw new BadRequestException({ code: 'INVALID_STORAGE_REF', message: 'storageRef is required' });
    }
    if (storageRef.includes('..') || path.isAbsolute(storageRef)) {
      throw new BadRequestException({ code: 'INVALID_STORAGE_REF', message: 'storageRef must be relative and safe' });
    }
    const safeTenant = this.getSafeTenantId(tenantId);
    const expectedPrefix = `tenants/${safeTenant}/`;
    const objectStoragePrefix = /^(s3:\/\/|https?:\/\/)/i;
    if (!objectStoragePrefix.test(storageRef) && !storageRef.startsWith(expectedPrefix)) {
      throw new BadRequestException({
        code: 'CROSS_TENANT_STORAGE_REF',
        message: 'storageRef does not belong to the request tenant (CROSS_TENANT_STORAGE_REF)',
      });
    }
  }

  private async encryptBuffer(plain: Buffer): Promise<Buffer> {
    const key = this.getEncryptionKey();
    if (!key) return plain;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]);
  }

  private async decryptBuffer(input: Buffer): Promise<Buffer> {
    const key = this.getEncryptionKey();
    if (!key) return input;
    if (input.length < 28) throw new Error('Invalid encrypted file');
    const iv = input.subarray(0, 12);
    const authTag = input.subarray(12, 28);
    const encrypted = input.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  async storeFile(tenantId: string, file: UploadFile): Promise<string> {
    const finalStorageRef = this.isEncryptedStorage() ? `${file.storageRef}.enc` : file.storageRef;
    const finalPath = this.getAbsoluteStoragePath(finalStorageRef);

    const plain = await fs.promises.readFile(file.tempPath);
    const stored = await this.encryptBuffer(plain);
    await fs.promises.writeFile(finalPath, stored);
    await fs.promises.unlink(file.tempPath).catch(() => undefined);

    return finalStorageRef;
  }

  private async readFileBuffer(storageRef: string): Promise<Buffer> {
    const abs = this.getAbsoluteStoragePath(storageRef);
    const encrypted = await fs.promises.readFile(abs);
    return this.decryptBuffer(encrypted);
  }

  async getDownloadStream(document: Document): Promise<Readable> {
    const buffer = await this.readFileBuffer(document.storageRef);
    return Readable.from([buffer]);
  }

  private validateDocumentType(documentType: string): asserts documentType is Document['documentType'] {
    if (!DOCUMENT_TYPES.includes(documentType as Document['documentType'])) {
      throw new BadRequestException({
        code: 'INVALID_DOCUMENT_TYPE',
        message: `Invalid documentType: ${documentType}. Allowed: ${DOCUMENT_TYPES.join(', ')}`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Document CRUD
  // ---------------------------------------------------------------------------

  async createFromUpload(params: {
    correlationId: string;
    tenantId: string;
    claimId?: string;
    documentType: Document['documentType'];
    file: UploadFile;
  }): Promise<Document> {
    this.validateDocumentType(params.documentType);
    const storageRef = await this.storeFile(params.tenantId, params.file);

    const doc = this.documentRepo.create({
      documentId: uuidv4(),
      tenantId: params.tenantId,
      claimId: params.claimId || null,
      documentType: params.documentType,
      fileName: params.file.originalname,
      storageRef,
      mimeType: params.file.mimetype,
      fileSize: params.file.size,
      status: 'pending',
      extractedText: null,
      extractedFields: null,
    });

    await this.documentRepo.save(doc);

    await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.document.uploaded',
        eventType: 'DocumentUploaded',
        eventVersion: 1,
        correlationId: params.correlationId,
        subject: {
          documentId: doc.documentId,
          tenantId: doc.tenantId,
          ...(doc.claimId ? { claimId: doc.claimId } : {}),
        },
        payload: {
          documentId: doc.documentId,
          tenantId: doc.tenantId,
          ...(doc.claimId ? { claimId: doc.claimId } : {}),
          documentType: doc.documentType,
          fileName: doc.fileName,
          mimeType: doc.mimeType,
          fileSize: doc.fileSize,
          status: doc.status,
          createdAt: doc.createdAt?.toISOString?.() ?? new Date().toISOString(),
        },
      });
    });

    if (doc.claimId) {
      await this.dataSource.transaction(async (manager) => {
        const outbox = new OutboxPublisher(manager);
        await outbox.publish({
          topic: 'insurance.claim.documents_attached',
          eventType: 'ClaimDocumentsAttached',
          eventVersion: 1,
          correlationId: params.correlationId,
          subject: {
            claimId: doc.claimId!,
            tenantId: doc.tenantId,
          },
          payload: {
            claimId: doc.claimId!,
            tenantId: doc.tenantId,
            documentIds: [doc.documentId],
            documents: [
              {
                documentId: doc.documentId,
                type: doc.documentType,
                source: 'upload',
              },
            ],
          },
        });
      });
    }

    return doc;
  }

  async linkDocument(params: {
    correlationId: string;
    tenantId: string;
    claimId?: string;
    documentType: Document['documentType'];
    file: LinkFile;
    createdBy?: string;
  }): Promise<Document> {
    this.validateDocumentType(params.documentType);
    this.validateStorageRef(params.file.storageRef, params.tenantId);

    const doc = this.documentRepo.create({
      documentId: uuidv4(),
      tenantId: params.tenantId,
      claimId: params.claimId || null,
      documentType: params.documentType,
      fileName: params.file.fileName,
      storageRef: params.file.storageRef,
      mimeType: params.file.mimeType || null,
      fileSize: params.file.fileSize ?? null,
      status: 'pending',
      extractedText: null,
      extractedFields: null,
      createdBy: params.createdBy || null,
    });

    await this.documentRepo.save(doc);

    await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.document.linked',
        eventType: 'DocumentLinked',
        eventVersion: 1,
        correlationId: params.correlationId,
        subject: {
          documentId: doc.documentId,
          tenantId: doc.tenantId,
          ...(doc.claimId ? { claimId: doc.claimId } : {}),
        },
        payload: {
          documentId: doc.documentId,
          tenantId: doc.tenantId,
          ...(doc.claimId ? { claimId: doc.claimId } : {}),
          documentType: doc.documentType,
          fileName: doc.fileName,
          status: doc.status,
          createdAt: doc.createdAt?.toISOString?.() ?? new Date().toISOString(),
        },
      });
    });

    if (doc.claimId) {
      await this.dataSource.transaction(async (manager) => {
        const outbox = new OutboxPublisher(manager);
        await outbox.publish({
          topic: 'insurance.claim.documents_attached',
          eventType: 'ClaimDocumentsAttached',
          eventVersion: 1,
          correlationId: params.correlationId,
          subject: {
            claimId: doc.claimId!,
            tenantId: doc.tenantId,
          },
          payload: {
            claimId: doc.claimId!,
            tenantId: doc.tenantId,
            documentIds: [doc.documentId],
            documents: [
              {
                documentId: doc.documentId,
                type: doc.documentType,
                source: 'link',
              },
            ],
          },
        });
      });
    }

    return doc;
  }

  async getDocument(documentId: string, tenantId: string): Promise<Document | null> {
    return this.documentRepo.findOne({ where: { documentId, tenantId } });
  }

  async listDocuments(params: {
    tenantId: string;
    claimId?: string;
    reconciliationId?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: Document[]; total: number }> {
    const qb = this.documentRepo.createQueryBuilder('d');
    qb.andWhere('d.tenantId = :tenantId', { tenantId: params.tenantId });

    if (params.claimId) {
      qb.andWhere('d.claimId = :claimId', { claimId: params.claimId });
    }

    if (params.reconciliationId) {
      qb.andWhere('d.reconciliationId = :reconciliationId', { reconciliationId: params.reconciliationId });
    }

    qb.orderBy('d.createdAt', 'DESC')
      .limit(params.limit)
      .offset(params.offset);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async createReinsuranceInvoiceArtifact(params: {
    correlationId: string;
    tenantId: string;
    reconciliationId: string;
    file: UploadFile;
    metadata?: {
      invoiceNumber?: string;
      invoiceDate?: string;
      amount?: number;
      currency?: string;
      reinsurer?: string;
      period?: string;
    };
    createdBy?: string;
  }): Promise<Document> {
    const storageRef = await this.storeFile(params.tenantId, params.file);

    const doc = this.documentRepo.create({
      documentId: uuidv4(),
      tenantId: params.tenantId,
      claimId: null,
      reconciliationId: params.reconciliationId,
      documentType: 'reinsurance_invoice',
      fileName: params.file.originalname,
      storageRef,
      mimeType: params.file.mimetype,
      fileSize: params.file.size,
      status: 'pending',
      extractedText: null,
      extractedFields: null,
      metadata: params.metadata || null,
      createdBy: params.createdBy || null,
    });

    await this.documentRepo.save(doc);

    await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.reinsurance.invoice_artifact_stored',
        eventType: 'ReinsuranceInvoiceArtifactStored',
        eventVersion: 1,
        correlationId: params.correlationId,
        subject: {
          documentId: doc.documentId,
          tenantId: doc.tenantId,
          reconciliationId: doc.reconciliationId || '',
        },
        payload: {
          documentId: doc.documentId,
          tenantId: doc.tenantId,
          reconciliationId: doc.reconciliationId || '',
          documentType: doc.documentType,
          fileName: doc.fileName,
          mimeType: doc.mimeType,
          fileSize: doc.fileSize,
          status: doc.status,
          metadata: doc.metadata,
          createdBy: doc.createdBy,
          createdAt: doc.createdAt?.toISOString?.() ?? new Date().toISOString(),
        },
      });
    });

    this.logger.log(`Reinsurance invoice artifact stored: ${doc.documentId} for reconciliation ${params.reconciliationId}`);

    return doc;
  }

  async linkReinsuranceInvoiceArtifact(params: {
    correlationId: string;
    tenantId: string;
    reconciliationId: string;
    file: LinkFile;
    metadata?: {
      invoiceNumber?: string;
      invoiceDate?: string;
      amount?: number;
      currency?: string;
      reinsurer?: string;
      period?: string;
    };
    createdBy?: string;
  }): Promise<Document> {
    this.validateStorageRef(params.file.storageRef, params.tenantId);

    const doc = this.documentRepo.create({
      documentId: uuidv4(),
      tenantId: params.tenantId,
      claimId: null,
      reconciliationId: params.reconciliationId,
      documentType: 'reinsurance_invoice',
      fileName: params.file.fileName,
      storageRef: params.file.storageRef,
      mimeType: params.file.mimeType || null,
      fileSize: params.file.fileSize ?? null,
      status: 'pending',
      extractedText: null,
      extractedFields: null,
      metadata: params.metadata || null,
      createdBy: params.createdBy || null,
    });

    await this.documentRepo.save(doc);

    await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.reinsurance.invoice_artifact_linked',
        eventType: 'ReinsuranceInvoiceArtifactLinked',
        eventVersion: 1,
        correlationId: params.correlationId,
        subject: {
          documentId: doc.documentId,
          tenantId: doc.tenantId,
          reconciliationId: doc.reconciliationId || '',
        },
        payload: {
          documentId: doc.documentId,
          tenantId: doc.tenantId,
          reconciliationId: doc.reconciliationId || '',
          documentType: doc.documentType,
          fileName: doc.fileName,
          status: doc.status,
          metadata: doc.metadata,
          createdBy: doc.createdBy,
          createdAt: doc.createdAt?.toISOString?.() ?? new Date().toISOString(),
        },
      });
    });

    this.logger.log(`Reinsurance invoice artifact linked: ${doc.documentId} for reconciliation ${params.reconciliationId}`);

    return doc;
  }

  async getReconciliationArtifacts(reconciliationId: string, tenantId: string): Promise<Document[]> {
    return this.documentRepo.find({
      where: { reconciliationId, tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  // ---------------------------------------------------------------------------
  // Validation / classification / extraction
  // ---------------------------------------------------------------------------

  async validateDocument(documentId: string, tenantId: string): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    const doc = await this.getDocument(documentId, tenantId);
    if (!doc) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Document not found' });
    }

    if (!ALLOWED_MIMETYPES.includes(doc.mimeType?.toLowerCase() || '')) {
      issues.push(`Unsupported mime type: ${doc.mimeType}`);
    }

    try {
      const abs = this.getAbsoluteStoragePath(doc.storageRef);
      const stat = fs.statSync(abs);
      if (!stat.isFile()) issues.push('Storage reference does not point to a file');
      if (doc.fileSize != null && stat.size !== doc.fileSize) {
        issues.push(`File size mismatch: expected ${doc.fileSize}, found ${stat.size}`);
      }
    } catch (err) {
      issues.push(`File not accessible: ${(err as Error).message}`);
    }

    const valid = issues.length === 0;
    return { valid, issues };
  }

  async classifyDocument(documentId: string, tenantId: string): Promise<{
    documentType: Document['documentType'];
    confidence: number;
    detectedMime: string;
    issues: string[];
  }> {
    const doc = await this.getDocument(documentId, tenantId);
    if (!doc) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Document not found' });
    }

    const issues: string[] = [];
    const mime = (doc.mimeType || 'application/octet-stream').toLowerCase();
    if (!ALLOWED_MIMETYPES.includes(mime)) {
      issues.push(`Unsupported mime type: ${mime}`);
    }

    const typeConfidence: Record<Document['documentType'], number> = {
      photo: mime.startsWith('image/') ? 0.95 : 0.4,
      receipt: mime === 'application/pdf' ? 0.8 : 0.3,
      invoice: mime === 'application/pdf' ? 0.85 : 0.3,
      medical_report: mime === 'application/pdf' ? 0.85 : 0.3,
      police_report: mime === 'application/pdf' ? 0.8 : 0.3,
      reinsurance_invoice: mime === 'application/pdf' ? 0.85 : 0.3,
      other: 0.5,
    };

    const documentType = doc.documentType || 'other';
    const confidence = typeConfidence[documentType] ?? 0.5;

    return { documentType, confidence, detectedMime: mime, issues };
  }

  async startExtraction(documentId: string, tenantId: string, correlationId: string): Promise<Document> {
    const doc = await this.getDocument(documentId, tenantId);
    if (!doc) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Document not found' });
    }
    if (doc.status !== 'pending' && doc.status !== 'failed') {
      throw new BadRequestException({ code: 'INVALID_STATE', message: `Cannot extract document in ${doc.status} state` });
    }

    doc.status = 'extracting';
    await this.documentRepo.save(doc);

    // Trigger async extraction; failures are recorded in the document status.
    this.processExtraction(doc, correlationId).catch((err) => {
      this.logger.error(`Extraction failed for ${documentId}`, err as Error);
    });

    return doc;
  }

  private async processExtraction(doc: Document, correlationId: string): Promise<void> {
    const ocrUrl = process.env.OCR_ENGINE_URL || process.env.DOCUMENT_AI_SERVICE_URL;
    if (!ocrUrl) {
      doc.status = 'failed';
      doc.extractedText = null;
      doc.extractedFields = { error: 'OCR_NOT_CONFIGURED', message: 'No OCR engine configured' };
      await this.documentRepo.save(doc);
      return;
    }

    try {
      const fileBuffer = await this.readFileBuffer(doc.storageRef);
      const base64 = fileBuffer.toString('base64');
      const response = await fetch(`${ocrUrl}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: doc.documentId,
          tenantId: doc.tenantId,
          mimeType: doc.mimeType,
          fileName: doc.fileName,
          data: base64,
        }),
      });

      if (!response.ok) {
        throw new Error(`OCR engine returned ${response.status}`);
      }

      const result = (await response.json()) as { text?: string; fields?: object };
      doc.status = 'extracted';
      doc.extractedText = result.text || null;
      doc.extractedFields = result.fields || null;
    } catch (err) {
      doc.status = 'failed';
      doc.extractedText = null;
      doc.extractedFields = { error: 'EXTRACTION_FAILED', message: (err as Error).message };
    }

    await this.documentRepo.save(doc);

    await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.document.extraction_completed',
        eventType: 'DocumentExtractionCompleted',
        eventVersion: 1,
        correlationId,
        subject: { documentId: doc.documentId, tenantId: doc.tenantId },
        payload: {
          documentId: doc.documentId,
          tenantId: doc.tenantId,
          status: doc.status,
          extractedFields: doc.extractedFields,
        },
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Signed URLs
  // ---------------------------------------------------------------------------

  private getSigningSecret(): string {
    return process.env.DOCUMENT_DOWNLOAD_SECRET || process.env.JWT_SECRET || 'default-secret-change-in-production';
  }

  generateSignedUrl(params: { documentId: string; tenantId: string; userId: string; ttlSeconds?: number }): { url: string; expiresAt: string } {
    const ttl = params.ttlSeconds ?? 900;
    const exp = Math.floor(Date.now() / 1000) + ttl;
    const payload = {
      documentId: params.documentId,
      tenantId: params.tenantId,
      sub: params.userId,
      exp,
    };
    const signature = crypto
      .createHmac('sha256', this.getSigningSecret())
      .update(`${payload.documentId}:${payload.tenantId}:${payload.sub}:${payload.exp}`)
      .digest('base64url');
    const token = Buffer.from(JSON.stringify({ ...payload, signature })).toString('base64url');
    const url = `/documents/${params.documentId}/download?token=${encodeURIComponent(token)}`;
    return { url, expiresAt: new Date(exp * 1000).toISOString() };
  }

  verifySignedUrl(token: string): { documentId: string; tenantId: string; sub: string; exp: number } {
    let payload: any;
    try {
      payload = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
    } catch {
      throw new BadRequestException({ code: 'INVALID_TOKEN', message: 'Malformed download token' });
    }

    const { documentId, tenantId, sub, exp, signature } = payload;
    if (!documentId || !tenantId || !sub || !exp || !signature) {
      throw new BadRequestException({ code: 'INVALID_TOKEN', message: 'Incomplete download token' });
    }

    const expected = crypto
      .createHmac('sha256', this.getSigningSecret())
      .update(`${documentId}:${tenantId}:${sub}:${exp}`)
      .digest('base64url');

    if (signature.length !== expected.length) {
      throw new BadRequestException({ code: 'INVALID_TOKEN', message: 'Token signature mismatch' });
    }

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      throw new BadRequestException({ code: 'INVALID_TOKEN', message: 'Token signature mismatch' });
    }

    if (Date.now() / 1000 > exp) {
      throw new BadRequestException({ code: 'TOKEN_EXPIRED', message: 'Download token has expired' });
    }

    return { documentId, tenantId, sub, exp };
  }
}

