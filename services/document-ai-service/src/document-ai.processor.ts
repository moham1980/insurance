import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { createLogger, OutboxPublisher } from '@insurance/shared';
import { DocumentEntity } from './entities/DocumentEntity';
import { DocumentAiAudit, type DocumentAiDecision } from './entities/DocumentAiAudit';
import { DocumentAiUsageDaily } from './entities/DocumentAiUsageDaily';
import { GeminiService } from './gemini/gemini.service';
import { DeepSeekService } from './deepseek/deepseek.service';
import { OcrService, OcrProvider } from './ocr/ocr.service';

@Injectable()
export class DocumentAiProcessor {
  private logger = createLogger({
    serviceName: 'document-ai-service',
    prettyPrint: process.env.NODE_ENV !== 'production',
  });

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(DocumentEntity) private readonly docRepo: Repository<DocumentEntity>,
    @InjectRepository(DocumentAiAudit) private readonly auditRepo: Repository<DocumentAiAudit>,
    @InjectRepository(DocumentAiUsageDaily) private readonly usageRepo: Repository<DocumentAiUsageDaily>,
    private readonly geminiService: GeminiService,
    private readonly deepSeekService: DeepSeekService,
    private readonly ocrService: OcrService
  ) {}

  private getTenantDailyJobLimit(): number {
    const raw = process.env.DOCUMENT_AI_TENANT_DAILY_JOB_LIMIT;
    const n = parseInt(raw || '200', 10);
    return Number.isFinite(n) && n > 0 ? n : 200;
  }

  private getTenantDailyRequestLimit(): number {
    const raw = process.env.DOCUMENT_AI_TENANT_DAILY_REQUEST_LIMIT;
    const n = parseInt(raw || '500', 10);
    return Number.isFinite(n) && n > 0 ? n : 500;
  }

  private todayDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private async upsertUsage(params: {
    tenantId: string;
    jobsStartedInc?: number;
    jobsCompletedInc?: number;
    jobsFailedInc?: number;
    aiRequestsInc?: number;
    approxInputCharsInc?: number;
    approxOutputCharsInc?: number;
  }): Promise<void> {
    const d = this.todayDate();
    const t = params.tenantId;
    await this.dataSource.query(
      `
      INSERT INTO document_ai.document_ai_usage_daily (
        tenant_id,
        usage_date,
        jobs_started,
        jobs_completed,
        jobs_failed,
        ai_requests,
        approx_input_chars,
        approx_output_chars,
        created_at,
        updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
      ON CONFLICT (tenant_id, usage_date)
      DO UPDATE SET
        jobs_started = document_ai.document_ai_usage_daily.jobs_started + EXCLUDED.jobs_started,
        jobs_completed = document_ai.document_ai_usage_daily.jobs_completed + EXCLUDED.jobs_completed,
        jobs_failed = document_ai.document_ai_usage_daily.jobs_failed + EXCLUDED.jobs_failed,
        ai_requests = document_ai.document_ai_usage_daily.ai_requests + EXCLUDED.ai_requests,
        approx_input_chars = document_ai.document_ai_usage_daily.approx_input_chars + EXCLUDED.approx_input_chars,
        approx_output_chars = document_ai.document_ai_usage_daily.approx_output_chars + EXCLUDED.approx_output_chars,
        updated_at = NOW()
      `,
      [
        t,
        d,
        params.jobsStartedInc || 0,
        params.jobsCompletedInc || 0,
        params.jobsFailedInc || 0,
        params.aiRequestsInc || 0,
        params.approxInputCharsInc || 0,
        params.approxOutputCharsInc || 0,
      ]
    );
  }

  private async assertWithinBudget(params: { tenantId: string; aiRequestsPlanned: number }): Promise<void> {
    const limitJobs = this.getTenantDailyJobLimit();
    const limitReq = this.getTenantDailyRequestLimit();
    const d = this.todayDate();

    const row = await this.usageRepo.findOne({ where: { tenantId: params.tenantId, usageDate: d } });
    const jobsStarted = row?.jobsStarted || 0;
    const aiRequests = row?.aiRequests || 0;

    if (jobsStarted + 1 > limitJobs) {
      const err: any = new Error('Tenant daily job limit exceeded');
      err.code = 'TENANT_DAILY_JOB_LIMIT_EXCEEDED';
      throw err;
    }

    if (aiRequests + params.aiRequestsPlanned > limitReq) {
      const err: any = new Error('Tenant daily AI request limit exceeded');
      err.code = 'TENANT_DAILY_REQUEST_LIMIT_EXCEEDED';
      throw err;
    }
  }

  private getConfidenceThreshold(): number {
    const raw = process.env.DOCUMENT_AI_CONFIDENCE_THRESHOLD;
    if (!raw) return 0.8;
    const n = parseFloat(raw);
    if (!Number.isFinite(n) || n <= 0 || n > 1) return 0.8;
    return n;
  }

  private parseConfidence(extractedFields: Record<string, unknown>): number | null {
    const v: any = (extractedFields as any)?.confidence;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }

  private async extractWithFallback(
    imageBytes: Buffer,
    mimeType: string,
    correlationId: string,
    useOcr: boolean = false
  ): Promise<{ text: string; provider: string }> {
    const providers = ['ocr', 'gemini', 'deepseek'];
    let lastError: Error | null = null;

    for (const provider of providers) {
      try {
        this.logger.info(`Attempting extraction with provider: ${provider}`, { correlationId });
        if (provider === 'ocr' && useOcr) {
          const ocrResult = await this.ocrService.extractText(imageBytes, mimeType);
          return { text: ocrResult.text, provider: `ocr_${ocrResult.provider}` };
        } else if (provider === 'gemini') {
          const text = await this.geminiService.extractTextFromImage(imageBytes, mimeType);
          return { text, provider };
        } else if (provider === 'deepseek') {
          // DeepSeek doesn't have image extraction, skip
          continue;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(`Extraction failed with provider ${provider}, trying fallback`, { correlationId, error: lastError.message });
      }
    }

    throw lastError || new Error('All extraction providers failed');
  }

  private async analyzeWithFallback(
    text: string,
    correlationId: string
  ): Promise<{ summary: string; keyPoints: string[]; provider: string }> {
    const providers = ['deepseek', 'gemini'];
    let lastError: Error | null = null;

    for (const provider of providers) {
      try {
        this.logger.info(`Attempting analysis with provider: ${provider}`, { correlationId });
        if (provider === 'deepseek') {
          const analysis = await this.deepSeekService.analyzeText({ text, task: 'insurance_document', language: 'fa' });
          return { summary: analysis.summary, keyPoints: analysis.keyPoints, provider };
        } else if (provider === 'gemini') {
          // Gemini can also do text analysis using analyzeDocument
          const analysis = await this.geminiService.analyzeDocument(text, 'insurance');
          return { summary: analysis.summary, keyPoints: analysis.keyPoints, provider };
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(`Analysis failed with provider ${provider}, trying fallback`, { correlationId, error: lastError.message });
      }
    }

    throw lastError || new Error('All analysis providers failed');
  }

  private computeConfidence(params: { extractionProvider?: string; analysisProvider?: string }): number {
    let score = 0.65;
    if (params.extractionProvider && !params.extractionProvider.includes('failed')) score += 0.15;
    if (params.analysisProvider && !params.analysisProvider.includes('failed')) score += 0.15;
    return Math.min(score, 0.95);
  }

  private createFailedExtraction(doc: DocumentEntity, reason: string): { extractedText: string; extractedFields: Record<string, unknown> } {
    return {
      extractedText: '',
      extractedFields: {
        documentType: doc.documentType,
        fileName: doc.fileName,
        storageRef: doc.storageRef,
        extractionFailed: true,
        failureReason: reason,
      },
    };
  }

  private async validateExtractedFields(params: {
    doc: DocumentEntity;
    extractedFields: Record<string, unknown>;
    correlationId: string;
  }): Promise<{
    valid: boolean;
    violations: Array<{ field: string; expected: string; actual: string; severity: 'error' | 'warning' }>;
  }> {
    const violations: Array<{ field: string; expected: string; actual: string; severity: 'error' | 'warning' }> = [];

    // Cross-check against policy/claim if linked
    if (params.doc.claimId) {
      // In production, call claims-service or policy-service for ground truth
      // For now, perform structural validation
    }

    // Document-type specific validation
    if (params.doc.documentType === 'invoice') {
      const amount = params.extractedFields.totalAmount;
      if (amount === undefined || amount === null) {
        violations.push({ field: 'totalAmount', expected: 'numeric value', actual: String(amount), severity: 'error' });
      }
      const invNum = params.extractedFields.invoiceNumber;
      if (!invNum || String(invNum).length < 3) {
        violations.push({ field: 'invoiceNumber', expected: 'non-empty string >= 3 chars', actual: String(invNum), severity: 'warning' });
      }
    }

    if (params.doc.documentType === 'national_id_card') {
      const nationalId = params.extractedFields.nationalId;
      if (!nationalId || !/^\d{10}$/.test(String(nationalId))) {
        violations.push({ field: 'nationalId', expected: '10-digit Iranian national ID', actual: String(nationalId), severity: 'error' });
      }
    }

    if (params.doc.documentType === 'driving_license') {
      const licenseNumber = params.extractedFields.licenseNumber;
      if (!licenseNumber || String(licenseNumber).length < 5) {
        violations.push({ field: 'licenseNumber', expected: 'non-empty string >= 5 chars', actual: String(licenseNumber), severity: 'error' });
      }
    }

    // Generic confidence validation
    const confidence = this.parseConfidence(params.extractedFields);
    if (confidence === null) {
      violations.push({ field: 'confidence', expected: 'numeric value', actual: 'null', severity: 'warning' });
    }

    return { valid: violations.filter(v => v.severity === 'error').length === 0, violations };
  }

  private async routeToWorkItem(params: {
    doc: DocumentEntity;
    correlationId: string;
    tenantId?: string | null;
    actorUserId?: string | null;
    decision: string;
    decisionReason: string | null;
    confidence: number | null;
    violations?: Array<{ field: string; expected: string; actual: string; severity: 'error' | 'warning' }>;
  }): Promise<void> {
    const orchUrl = process.env.ORCHESTRATOR_URL;
    if (!orchUrl) {
      this.logger.warn('Cannot route to work item: ORCHESTRATOR_URL not configured', { documentId: params.doc.documentId, correlationId: params.correlationId });
      return;
    }

    try {
      await fetch(`${orchUrl}/work-items/document-ai-review`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-correlation-id': params.correlationId,
          ...(params.tenantId ? { 'x-tenant-id': String(params.tenantId) } : {}),
        },
        body: JSON.stringify({
          documentId: params.doc.documentId,
          claimId: params.doc.claimId,
          documentType: params.doc.documentType,
          decision: params.decision,
          reason: params.decisionReason,
          confidence: params.confidence,
          violations: params.violations || [],
          priority: 'medium',
        }),
      });
    } catch (error) {
      this.logger.warn('Failed to route document to work item', { documentId: params.doc.documentId, correlationId: params.correlationId, error: (error as Error).message });
    }
  }

  private async tryFetchBytes(storageRef: string): Promise<Buffer | null> {
    try {
      if (!storageRef) return null;

      if (storageRef.startsWith('http://') || storageRef.startsWith('https://')) {
        const res = await fetch(storageRef);
        if (!res.ok) return null;
        const ab = await res.arrayBuffer();
        return Buffer.from(ab);
      }

      return null;
    } catch {
      return null;
    }
  }

  async extractForEval(params: {
    documentId: string;
    correlationId: string;
  }): Promise<{
    extractedText: string;
    extractedFields: Record<string, unknown>;
    decision: DocumentAiDecision;
    reason: string | null;
    confidence: number | null;
    threshold: number;
    provider: any | null;
    errorMessage: string | null;
    errorStack: string | null;
  }> {
    const { documentId, correlationId } = params;

    const doc = await this.docRepo.findOne({ where: { documentId } });
    if (!doc) {
      return {
        extractedText: '',
        extractedFields: {},
        decision: 'failed',
        reason: 'DOCUMENT_NOT_FOUND',
        confidence: null,
        threshold: this.getConfidenceThreshold(),
        provider: null,
        errorMessage: 'Document not found',
        errorStack: null,
      };
    }

    let extractedText = '';
    let extractedFields: Record<string, unknown> = {};
    let decision: DocumentAiDecision = 'extracted';
    let decisionReason: string | null = null;
    let provider: any | null = null;
    let errMsg: string | null = null;
    let errStack: string | null = null;

    try {
      const mimeType = doc.mimeType || '';

      if (mimeType.startsWith('image/')) {
        const imageBytes = await this.tryFetchBytes(doc.storageRef);
        if (imageBytes) {
          try {
            const { text: extractedTextFromImage, provider: extractionProvider } = await this.extractWithFallback(imageBytes, mimeType, correlationId);
            const { summary, keyPoints, provider: analysisProvider } = await this.analyzeWithFallback(extractedTextFromImage, correlationId);
            extractedText = extractedTextFromImage;
            extractedFields = {
              documentType: doc.documentType,
              fileName: doc.fileName,
              storageRef: doc.storageRef,
              confidence: this.computeConfidence({ extractionProvider, analysisProvider }),
              summary,
              keyPoints,
              aiProvider: {
                image: extractionProvider,
                analysis: analysisProvider,
              },
            };
            provider = (extractedFields as any).aiProvider;
          } catch (fallbackError) {
            const error = fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
            this.logger.error('All AI providers failed for image extraction in eval', error, { documentId, correlationId });
            const failed = this.createFailedExtraction(doc, 'ALL_AI_PROVIDERS_FAILED');
            extractedText = failed.extractedText;
            extractedFields = failed.extractedFields;
            decision = 'needs_review';
            decisionReason = 'ALL_AI_PROVIDERS_FAILED';
          }
        } else {
          const failed = this.createFailedExtraction(doc, 'IMAGE_BYTES_UNAVAILABLE');
          extractedText = failed.extractedText;
          extractedFields = failed.extractedFields;
          decision = 'needs_review';
          decisionReason = 'IMAGE_BYTES_UNAVAILABLE';
        }
      } else {
        // For non-image documents, try text analysis directly if content is available
        const docContent = doc.extractedText || '';
        try {
          const { summary, keyPoints, provider: analysisProvider } = await this.analyzeWithFallback(docContent || doc.fileName, correlationId);
          extractedText = docContent;
          extractedFields = {
            documentType: doc.documentType,
            fileName: doc.fileName,
            storageRef: doc.storageRef,
            summary,
            keyPoints,
            aiProvider: {
              analysis: analysisProvider,
            },
          };
          provider = (extractedFields as any).aiProvider;
        } catch (fallbackError) {
          const error = fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
          this.logger.error('All AI providers failed for text analysis in eval', error, { documentId, correlationId });
          const failed = this.createFailedExtraction(doc, 'ALL_AI_PROVIDERS_FAILED');
          extractedText = failed.extractedText;
          extractedFields = failed.extractedFields;
          decision = 'needs_review';
          decisionReason = 'ALL_AI_PROVIDERS_FAILED';
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('AI processing failed (eval)', error, { documentId, correlationId });
      errMsg = error.message;
      errStack = error.stack || null;
      const failed = this.createFailedExtraction(doc, 'AI_PROCESSING_FAILED');
      extractedText = failed.extractedText;
      extractedFields = failed.extractedFields;
      decision = 'needs_review';
      decisionReason = 'AI_PROCESSING_FAILED';
    }

    const confidence = this.parseConfidence(extractedFields);
    const threshold = this.getConfidenceThreshold();
    if (decision === 'extracted' && (confidence === null || confidence < threshold)) {
      decision = 'needs_review';
      decisionReason = confidence === null ? 'CONFIDENCE_MISSING' : 'LOW_CONFIDENCE';
    }

    return {
      extractedText,
      extractedFields,
      decision,
      reason: decisionReason,
      confidence,
      threshold,
      provider,
      errorMessage: errMsg,
      errorStack: errStack,
    };
  }

  async processDocument(params: {
    documentId: string;
    correlationId: string;
    tenantId?: string | null;
    actorUserId?: string | null;
    traceparent?: string | null;
  }): Promise<void> {
    const { documentId, correlationId, tenantId, actorUserId } = params;

    const normalizedTenantId = (tenantId && String(tenantId).trim().length > 0 ? String(tenantId) : 'default').trim();

    const doc = await this.docRepo.findOne({ where: { documentId } });
    if (!doc) {
      this.logger.warn('Document not found - skipping', { documentId, correlationId });
      return;
    }

    await this.docRepo.update({ documentId }, { status: 'extracting', updatedAt: new Date() });

    let extractedText = '';
    let extractedFields: Record<string, unknown> = {};
    let decision: DocumentAiDecision = 'extracted';
    let decisionReason: string | null = null;
    let provider: any | null = null;
    let errMsg: string | null = null;
    let errStack: string | null = null;

    try {
      const mimeType = doc.mimeType || '';

      const aiRequestsPlanned = mimeType.startsWith('image/') ? 2 : 1;
      await this.assertWithinBudget({ tenantId: normalizedTenantId, aiRequestsPlanned });
      await this.upsertUsage({ tenantId: normalizedTenantId, jobsStartedInc: 1, aiRequestsInc: aiRequestsPlanned });

      if (mimeType.startsWith('image/')) {
        const imageBytes = await this.tryFetchBytes(doc.storageRef);
        if (imageBytes) {
          try {
            const { text: extractedTextFromImage, provider: extractionProvider } = await this.extractWithFallback(imageBytes, mimeType, correlationId);
            const { summary, keyPoints, provider: analysisProvider } = await this.analyzeWithFallback(extractedTextFromImage, correlationId);
            extractedText = extractedTextFromImage;
            extractedFields = {
              documentType: doc.documentType,
              fileName: doc.fileName,
              storageRef: doc.storageRef,
              confidence: this.computeConfidence({ extractionProvider, analysisProvider }),
              summary,
              keyPoints,
              aiProvider: {
                image: extractionProvider,
                analysis: analysisProvider,
              },
            };
            provider = (extractedFields as any).aiProvider;
          } catch (fallbackError) {
            const error = fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
            this.logger.error('All AI providers failed for image extraction', error, { documentId, correlationId });
            const failed = this.createFailedExtraction(doc, 'ALL_AI_PROVIDERS_FAILED');
            extractedText = failed.extractedText;
            extractedFields = failed.extractedFields;
            decision = 'needs_review';
            decisionReason = 'ALL_AI_PROVIDERS_FAILED';
          }
        } else {
          const failed = this.createFailedExtraction(doc, 'IMAGE_BYTES_UNAVAILABLE');
          extractedText = failed.extractedText;
          extractedFields = failed.extractedFields;
          decision = 'needs_review';
          decisionReason = 'IMAGE_BYTES_UNAVAILABLE';
        }
      } else {
        const docContent = doc.extractedText || '';
        try {
          const { summary, keyPoints, provider: analysisProvider } = await this.analyzeWithFallback(docContent || doc.fileName, correlationId);
          extractedText = docContent;
          extractedFields = {
            documentType: doc.documentType,
            fileName: doc.fileName,
            storageRef: doc.storageRef,
            summary,
            keyPoints,
            aiProvider: {
              analysis: analysisProvider,
            },
          };
          provider = (extractedFields as any).aiProvider;
        } catch (fallbackError) {
          const error = fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
          this.logger.error('All AI providers failed for text analysis', error, { documentId, correlationId });
          const failed = this.createFailedExtraction(doc, 'ALL_AI_PROVIDERS_FAILED');
          extractedText = failed.extractedText;
          extractedFields = failed.extractedFields;
          decision = 'needs_review';
          decisionReason = 'ALL_AI_PROVIDERS_FAILED';
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('AI processing failed', error, { documentId, correlationId });
      errMsg = error.message;
      errStack = error.stack || null;
      const failed = this.createFailedExtraction(doc, 'AI_PROCESSING_FAILED');
      extractedText = failed.extractedText;
      extractedFields = failed.extractedFields;
      decision = 'needs_review';
      decisionReason = 'AI_PROCESSING_FAILED';
    }

    const confidence = this.parseConfidence(extractedFields);
    const threshold = this.getConfidenceThreshold();
    if (decision === 'extracted' && (confidence === null || confidence < threshold)) {
      decision = 'needs_review';
      decisionReason = confidence === null ? 'CONFIDENCE_MISSING' : 'LOW_CONFIDENCE';
    }

    // Run business validation for successfully extracted documents
    let validationResult: { valid: boolean; violations: Array<{ field: string; expected: string; actual: string; severity: 'error' | 'warning' }> } | null = null;
    if (decision === 'extracted') {
      validationResult = await this.validateExtractedFields({ doc, extractedFields, correlationId });
      if (!validationResult.valid) {
        decision = 'needs_review';
        decisionReason = 'BUSINESS_VALIDATION_FAILED';
      }
    }

    await this.docRepo.update(
      { documentId },
      {
        status: decision === 'extracted' ? 'extracted' : 'failed',
        extractedText,
        extractedFields,
        updatedAt: new Date(),
      }
    );

    if (decision === 'extracted') {
      await this.upsertUsage({ tenantId: normalizedTenantId, jobsCompletedInc: 1 });
    } else {
      await this.upsertUsage({ tenantId: normalizedTenantId, jobsFailedInc: 1 });
    }

    await this.auditRepo.save(
      this.auditRepo.create({
        documentId: doc.documentId,
        claimId: doc.claimId || null,
        correlationId: correlationId || null,
        tenantId: tenantId || null,
        actorUserId: actorUserId || null,
        action: 'document_ai:extract',
        status: decision,
        input: {
          documentType: doc.documentType,
          fileName: doc.fileName,
          storageRef: doc.storageRef,
          mimeType: doc.mimeType,
          fileSize: doc.fileSize,
        },
        output: {
          extractedFields,
          extractedTextPreview: extractedText.slice(0, 512),
        },
        confidence: confidence === null ? null : String(confidence),
        decision,
        reason: decisionReason,
        provider,
        errorMessage: errMsg,
        errorStack: errStack,
      })
    );

    if (decision !== 'extracted') {
      await this.routeToWorkItem({
        doc,
        correlationId,
        tenantId,
        actorUserId,
        decision,
        decisionReason,
        confidence,
        violations: validationResult?.violations,
      });
      await this.dataSource.transaction(async (manager) => {
        const outbox = new OutboxPublisher(manager);
        await outbox.publish({
          topic: 'insurance.document.extraction.needs_review',
          eventType: 'DocumentExtractionNeedsReview',
          eventVersion: 1,
          correlationId,
          subject: {
            ...(tenantId ? { tenantId: String(tenantId) } : {}),
            documentId: doc.documentId,
            claimId: doc.claimId,
          },
          payload: {
            documentId: doc.documentId,
            claimId: doc.claimId,
            decision,
            reason: decisionReason,
            confidence,
            threshold,
          },
        });
      });
      this.logger.warn('Document extraction needs review', { documentId, correlationId, decisionReason, confidence, threshold });
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.document.extracted',
        eventType: 'DocumentExtracted',
        eventVersion: 1,
        correlationId,
        subject: {
          ...(tenantId ? { tenantId: String(tenantId) } : {}),
          documentId: doc.documentId,
          claimId: doc.claimId,
        },
        payload: {
          documentId: doc.documentId,
          claimId: doc.claimId,
          status: 'extracted',
          extractedFields,
          extractedTextPreview: extractedText.slice(0, 256),
          confidence: confidence,
        },
      });
    });

    this.logger.info('Document extracted', { documentId, correlationId });
  }
}
