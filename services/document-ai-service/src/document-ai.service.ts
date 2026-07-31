import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentEntity } from './entities/DocumentEntity';
import { DocumentAiJob } from './entities/DocumentAiJob';
import { DocumentAiAudit } from './entities/DocumentAiAudit';
import { DocumentAiUsageDaily } from './entities/DocumentAiUsageDaily';
import { DocumentAiEvalCase } from './entities/DocumentAiEvalCase';
import { DocumentAiEvalRun } from './entities/DocumentAiEvalRun';
import { DocumentAiEvalResult } from './entities/DocumentAiEvalResult';
import { OcrRedactionService, RedactedTextResult, DocumentClassification, FieldConfirmation } from './ocr/ocr-redaction.service';

@Injectable()
export class DocumentAiService {
  constructor(
    @InjectRepository(DocumentEntity) private readonly documentRepo: Repository<DocumentEntity>,
    @InjectRepository(DocumentAiJob) private readonly jobRepo: Repository<DocumentAiJob>,
    @InjectRepository(DocumentAiAudit) private readonly auditRepo: Repository<DocumentAiAudit>,
    @InjectRepository(DocumentAiUsageDaily) private readonly usageRepo: Repository<DocumentAiUsageDaily>,
    @InjectRepository(DocumentAiEvalCase) private readonly evalCaseRepo: Repository<DocumentAiEvalCase>,
    @InjectRepository(DocumentAiEvalRun) private readonly evalRunRepo: Repository<DocumentAiEvalRun>,
    @InjectRepository(DocumentAiEvalResult) private readonly evalResultRepo: Repository<DocumentAiEvalResult>,
    private readonly ocrRedaction: OcrRedactionService
  ) {}

  async listJobs(params: {
    status?: string;
    documentId?: string;
    tenantId?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: DocumentAiJob[]; total: number }> {
    const qb = this.jobRepo.createQueryBuilder('j');

    if (params.status) qb.andWhere('j.status = :status', { status: params.status });
    if (params.documentId) qb.andWhere('j.document_id = :documentId', { documentId: params.documentId });
    if (params.tenantId) qb.andWhere('j.tenant_id = :tenantId', { tenantId: params.tenantId });

    qb.orderBy('j.created_at', 'DESC').limit(params.limit).offset(params.offset);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async getJob(jobId: string): Promise<DocumentAiJob | null> {
    return this.jobRepo.findOne({ where: { jobId } });
  }

  async retryJob(jobId: string): Promise<DocumentAiJob | null> {
    const job = await this.jobRepo.findOne({ where: { jobId } });
    if (!job) return null;

    job.status = 'retry';
    job.nextRunAt = new Date();
    job.lockedAt = null;
    job.lockedBy = null;
    job.lastErrorMessage = null;
    job.lastErrorStack = null;
    job.dlqReason = null;
    job.updatedAt = new Date();

    return this.jobRepo.save(job);
  }

  async listAudit(params: {
    documentId?: string;
    decision?: string;
    tenantId?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: DocumentAiAudit[]; total: number }> {
    const qb = this.auditRepo.createQueryBuilder('a');

    if (params.documentId) qb.andWhere('a.document_id = :documentId', { documentId: params.documentId });
    if (params.decision) qb.andWhere('a.decision = :decision', { decision: params.decision });
    if (params.tenantId) qb.andWhere('a.tenant_id = :tenantId', { tenantId: params.tenantId });

    qb.orderBy('a.created_at', 'DESC').limit(params.limit).offset(params.offset);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async listUsageDaily(params: {
    tenantId?: string;
    usageDate?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: DocumentAiUsageDaily[]; total: number }> {
    const qb = this.usageRepo.createQueryBuilder('u');

    if (params.tenantId) qb.andWhere('u.tenant_id = :tenantId', { tenantId: params.tenantId });
    if (params.usageDate) qb.andWhere('u.usage_date = :usageDate', { usageDate: params.usageDate });

    qb.orderBy('u.usage_date', 'DESC').addOrderBy('u.tenant_id', 'ASC').limit(params.limit).offset(params.offset);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async listEvalCases(params: {
    enabled?: string;
    tag?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: DocumentAiEvalCase[]; total: number }> {
    const qb = this.evalCaseRepo.createQueryBuilder('c');

    if (params.enabled === 'true' || params.enabled === 'false') {
      qb.andWhere('c.enabled = :enabled', { enabled: params.enabled === 'true' });
    }

    if (params.tag && params.tag.trim().length > 0) {
      qb.andWhere(':tag = ANY(c.tags)', { tag: params.tag.trim() });
    }

    qb.orderBy('c.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async createEvalCase(input: {
    name: string;
    documentId: string;
    expected: any;
    tags?: string[] | null;
    enabled?: boolean;
  }): Promise<DocumentAiEvalCase> {
    const row = this.evalCaseRepo.create({
      name: String(input.name),
      documentId: String(input.documentId),
      expected: input.expected ?? {},
      tags: Array.isArray(input.tags) ? input.tags.map((t) => String(t)) : null,
      enabled: typeof input.enabled === 'boolean' ? input.enabled : true,
    });
    return this.evalCaseRepo.save(row);
  }

  async updateEvalCase(caseId: string, patch: { name?: string; expected?: any; tags?: string[] | null; enabled?: boolean }): Promise<DocumentAiEvalCase | null> {
    const row = await this.evalCaseRepo.findOne({ where: { caseId: String(caseId) } });
    if (!row) return null;

    if (typeof patch.name === 'string') row.name = patch.name;
    if (typeof patch.enabled === 'boolean') row.enabled = patch.enabled;
    if ('expected' in patch) row.expected = patch.expected ?? {};
    if ('tags' in patch) row.tags = Array.isArray(patch.tags) ? patch.tags.map((t) => String(t)) : null;
    row.updatedAt = new Date();
    return this.evalCaseRepo.save(row);
  }

  async listEvalRuns(params: { status?: string; limit: number; offset: number }): Promise<{ rows: DocumentAiEvalRun[]; total: number }> {
    const qb = this.evalRunRepo.createQueryBuilder('r');
    if (params.status && params.status.trim().length > 0) qb.andWhere('r.status = :status', { status: params.status.trim() });
    qb.orderBy('r.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async createEvalRun(params: any | null): Promise<DocumentAiEvalRun> {
    const row: DocumentAiEvalRun = this.evalRunRepo.create({
      status: 'queued',
      params: params ?? null,
      errorMessage: null,
      errorStack: null,
      startedAt: null,
      finishedAt: null,
    });
    return this.evalRunRepo.save(row);
  }

  async getEvalRun(runId: string): Promise<DocumentAiEvalRun | null> {
    return this.evalRunRepo.findOne({ where: { runId: String(runId) } });
  }

  async listEvalResults(params: { runId: string; limit: number; offset: number }): Promise<{ rows: DocumentAiEvalResult[]; total: number }> {
    const qb = this.evalResultRepo.createQueryBuilder('x');
    qb.andWhere('x.run_id = :runId', { runId: String(params.runId) });
    qb.orderBy('x.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async getDocument(documentId: string): Promise<DocumentEntity | null> {
    return this.documentRepo.findOne({ where: { documentId } });
  }

  async redactDocument(params: {
    documentId: string;
    tenantId?: string;
    actorUserId?: string;
    correlationId?: string;
  }): Promise<{ document: DocumentEntity; redaction: RedactedTextResult }> {
    const doc = await this.documentRepo.findOne({ where: { documentId: params.documentId } });
    if (!doc) throw new NotFoundException('Document not found');

    const text = doc.extractedText || '';
    const redaction = this.ocrRedaction.redactText(text);

    doc.redactedText = redaction.redactedText;
    doc.redactedSpans = redaction.spans as any;
    doc.updatedAt = new Date();
    const saved = await this.documentRepo.save(doc);

    await this.auditRepo.save(this.auditRepo.create({
      documentId: doc.documentId,
      claimId: doc.claimId || null,
      correlationId: params.correlationId || null,
      tenantId: params.tenantId || null,
      actorUserId: params.actorUserId || null,
      action: 'redact',
      decision: 'extracted',
      input: { documentId: params.documentId },
      output: { redacted: redaction.redacted, spanCount: redaction.spans.length },
      confidence: redaction.redacted ? '0.85' : '0.95',
    }));

    return { document: saved, redaction };
  }

  async classifyDocument(params: {
    documentId: string;
    tenantId?: string;
    actorUserId?: string;
    correlationId?: string;
  }): Promise<{ document: DocumentEntity; classification: DocumentClassification }> {
    const doc = await this.documentRepo.findOne({ where: { documentId: params.documentId } });
    if (!doc) throw new NotFoundException('Document not found');

    const text = doc.extractedText || '';
    const classification = this.ocrRedaction.classifyDocument(text, doc.fileName);

    doc.documentType = classification.documentType;
    doc.classificationConfidence = classification.confidence;
    doc.updatedAt = new Date();
    const saved = await this.documentRepo.save(doc);

    await this.auditRepo.save(this.auditRepo.create({
      documentId: doc.documentId,
      claimId: doc.claimId || null,
      correlationId: params.correlationId || null,
      tenantId: params.tenantId || null,
      actorUserId: params.actorUserId || null,
      action: 'classify',
      decision: 'extracted',
      input: { documentId: params.documentId, fileName: doc.fileName },
      output: classification,
      confidence: String(classification.confidence),
    }));

    return { document: saved, classification };
  }

  async confirmDocumentFields(params: {
    documentId: string;
    tenantId?: string;
    actorUserId?: string;
    correlationId?: string;
  }): Promise<{ document: DocumentEntity; fields: Record<string, any>; confirmation: FieldConfirmation }> {
    const doc = await this.documentRepo.findOne({ where: { documentId: params.documentId } });
    if (!doc) throw new NotFoundException('Document not found');

    const text = doc.extractedText || '';
    const documentType = doc.documentType || 'unknown';
    const fields = this.ocrRedaction.extractFields(text, documentType);
    const confirmation = this.ocrRedaction.confirmFields(documentType, fields);

    doc.extractedFields = fields as any;
    doc.confirmationStatus = confirmation.confirmationStatus;
    doc.updatedAt = new Date();
    const saved = await this.documentRepo.save(doc);

    await this.auditRepo.save(this.auditRepo.create({
      documentId: doc.documentId,
      claimId: doc.claimId || null,
      correlationId: params.correlationId || null,
      tenantId: params.tenantId || null,
      actorUserId: params.actorUserId || null,
      action: 'confirm_fields',
      decision: confirmation.confirmationStatus === 'complete' ? 'extracted' : 'needs_review',
      input: { documentId: params.documentId, documentType },
      output: { fields, confirmation },
      confidence: String(confirmation.confidence),
    }));

    return { document: saved, fields, confirmation };
  }
}
