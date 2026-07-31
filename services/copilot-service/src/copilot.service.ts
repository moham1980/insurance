import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as http from 'node:http';
import * as https from 'node:https';
import { v4 as uuidv4 } from 'uuid';
import { createLogger, OutboxPublisher } from '@insurance/shared';
import { ClaimEntity } from './entities/ClaimEntity';
import { DocumentEntity } from './entities/DocumentEntity';
import { CopilotAudit } from './entities/CopilotAudit';
import { ModelInventory, ModelRiskAssessment, AIIncidentReport, ModelCard, ModelValidationReport } from './entities/ModelInventory';
import { LLMService, type LLMProvider } from './llm.service';
import { EcosystemAiProvider } from './ecosystem-ai.provider';
import { NbaEngineService, NbaAction } from './nba/nba.service';
import { NbaActionLog } from './entities/NbaActionLog';

@Injectable()
export class CopilotService {
  private logger = createLogger({
    serviceName: 'copilot-service',
    prettyPrint: process.env.NODE_ENV !== 'production',
  });

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(ClaimEntity) private readonly claimRepo: Repository<ClaimEntity>,
    @InjectRepository(DocumentEntity) private readonly docRepo: Repository<DocumentEntity>,
    @InjectRepository(CopilotAudit) private readonly auditRepo: Repository<CopilotAudit>,
    @InjectRepository(ModelInventory) private readonly modelInventoryRepo: Repository<ModelInventory>,
    @InjectRepository(ModelRiskAssessment) private readonly riskAssessmentRepo: Repository<ModelRiskAssessment>,
    @InjectRepository(AIIncidentReport) private readonly incidentRepo: Repository<AIIncidentReport>,
    @InjectRepository(ModelCard) private readonly modelCardRepo: Repository<ModelCard>,
    @InjectRepository(ModelValidationReport) private readonly validationRepo: Repository<ModelValidationReport>,
    private readonly llmService: LLMService,
    private readonly ecosystemAi: EcosystemAiProvider,
    private readonly nbaEngine: NbaEngineService
  ) {}

  private getHeader(headers: Record<string, any>, key: string): string | undefined {
    if (!headers) return undefined;
    const direct = headers[key];
    if (typeof direct === 'string') return direct;
    const lower = headers[key.toLowerCase()];
    if (typeof lower === 'string') return lower;
    const upper = headers[key.toUpperCase()];
    if (typeof upper === 'string') return upper;
    return undefined;
  }

  private httpGetJson(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const lib = parsed.protocol === 'https:' ? https : http;

      const req = lib.request(
        {
          method: 'GET',
          hostname: parsed.hostname,
          port: parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80,
          path: `${parsed.pathname}${parsed.search}`,
          headers: { accept: 'application/json' },
        },
        (res) => {
          const status = res.statusCode ?? 0;
          let data = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (status < 200 || status >= 300) return resolve(null);
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        }
      );

      req.on('error', reject);
      req.end();
    });
  }

  private httpPostJson(url: string, body: any, headers?: Record<string, string>): Promise<any> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const lib = parsed.protocol === 'https:' ? https : http;
      const payload = JSON.stringify(body);

      const req = lib.request(
        {
          method: 'POST',
          hostname: parsed.hostname,
          port: parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80,
          path: `${parsed.pathname}${parsed.search}`,
          headers: {
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(payload),
            accept: 'application/json',
            ...headers,
          },
        },
        (res) => {
          const status = res.statusCode ?? 0;
          let data = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            if (status < 200 || status >= 300) return resolve(null);
            try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
          });
        },
      );

      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  private async fetchFeatureFlagEnabled(name: string): Promise<boolean | null> {
    try {
      const base = process.env.FEATURE_FLAGS_URL || 'http://localhost:18011';
      const url = `${base}/feature-flags/${encodeURIComponent(name)}`;
      const json = await this.httpGetJson(url);
      if (!json) return null;
      if (json?.success && typeof json?.data?.isEnabled === 'boolean') return Boolean(json.data.isEnabled);
      return null;
    } catch (e: any) {
      this.logger.warn('feature_flag.fetch_failed', { name, message: e?.message });
      return null;
    }
  }

  private async evaluatePolicy(params: {
    headers: Record<string, any>;
  }): Promise<{ allowed: boolean; blockedReason: string | null; aiEnabledHeader: string | null; policyAllowed: boolean }> {
    const aiEnabledHeaderRaw = this.getHeader(params.headers, 'x-ai-enabled') ?? this.getHeader(params.headers, 'X-AI-Enabled');
    const aiEnabledHeader = aiEnabledHeaderRaw ? String(aiEnabledHeaderRaw) : null;
    if (aiEnabledHeader === 'false') {
      return { allowed: false, blockedReason: 'CLIENT_AI_DISABLED', aiEnabledHeader, policyAllowed: false };
    }

    const [master, copilot] = await Promise.all([
      this.fetchFeatureFlagEnabled('ai.enabled'),
      this.fetchFeatureFlagEnabled('copilot.enabled'),
    ]);

    const policyAllowed = (master ?? true) && (copilot ?? true);
    if (!policyAllowed) {
      return { allowed: false, blockedReason: 'TENANT_POLICY_DISABLED', aiEnabledHeader, policyAllowed };
    }

    return { allowed: true, blockedReason: null, aiEnabledHeader, policyAllowed };
  }

  private redactSensitive(text: string): { text: string; redacted: boolean; spans: { type: string; start: number; end: number; replacement: string }[]; confidence: number } {
    const spans: { type: string; start: number; end: number; replacement: string }[] = [];
    const patterns: { type: string; regex: RegExp; replacement: string }[] = [
      { type: 'NATIONAL_ID', regex: /\b\d{10}\b/g, replacement: '[REDACTED_NATIONAL_ID]' },
      { type: 'CARD_NUMBER', regex: /\b(?:\d{4}[ -]?){3}\d{4}\b|\b\d{16}\b/g, replacement: '[REDACTED_CARD]' },
      { type: 'IBAN', regex: /\bIR\d{24}\b/gi, replacement: '[REDACTED_IBAN]' },
      { type: 'MOBILE', regex: /\b09\d{9}\b/g, replacement: '[REDACTED_MOBILE]' },
      { type: 'EMAIL', regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, replacement: '[REDACTED_EMAIL]' },
      { type: 'ACCOUNT_NUMBER', regex: /\b\d{2,4}-\d{6,}-\d{1,}\b|\b\d{10,20}\b/g, replacement: '[REDACTED_ACCOUNT]' },
    ];

    let out = text;
    for (const p of patterns) {
      let match: RegExpExecArray | null;
      const regex = new RegExp(p.regex.source, p.regex.flags.includes('g') ? p.regex.flags : p.regex.flags + 'g');
      while ((match = regex.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        const span = spans.find((s) => s.start === start && s.end === end);
        if (!span) {
          spans.push({ type: p.type, start, end, replacement: p.replacement });
        }
      }
    }

    // Replace in reverse order by start index
    const sortedSpans = [...spans].sort((a, b) => b.start - a.start);
    for (const span of sortedSpans) {
      const replacement = spans.find((s) => s.start === span.start && s.end === span.end)?.replacement || '[REDACTED]';
      out = out.slice(0, span.start) + replacement + out.slice(span.end);
    }

    const redacted = spans.length > 0;
    const confidence = redacted ? 0.75 : 0.95;
    return { text: out, redacted, spans, confidence };
  }

  private buildSourceRefs(contextType: 'claim' | 'document' | 'policy' | 'complaint', params: { claim?: ClaimEntity; doc?: DocumentEntity; docs?: DocumentEntity[] }): { type: string; id: string; field?: string }[] {
    const refs: { type: string; id: string; field?: string }[] = [];
    if (params.claim) {
      refs.push({ type: 'claim', id: params.claim.claimId });
    }
    if (params.doc) {
      refs.push({ type: 'document', id: params.doc.documentId });
    }
    if (params.docs) {
      for (const doc of params.docs) {
        refs.push({ type: 'document', id: doc.documentId });
      }
    }
    return refs.length > 0 ? refs : [{ type: contextType, id: params.claim?.claimId || params.doc?.documentId || 'unknown' }];
  }

  private computeOutputConfidence(redactedConfidence: number, sourceCount: number): number {
    const sourceBoost = Math.min(sourceCount * 0.02, 0.05);
    const confidence = redactedConfidence + sourceBoost;
    return Math.min(Math.round(confidence * 100) / 100, 0.99);
  }

  private formatCurrencyIRR(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return 'N/A';
    try {
      return `${Number(amount).toLocaleString('fa-IR')} ریال`;
    } catch {
      return String(amount);
    }
  }

  private buildClaimSummary(claim: ClaimEntity, docs: DocumentEntity[]): string {
    const extractedDocs = docs.filter((d) => d.status === 'extracted');
    const invoiceDocs = extractedDocs.filter((d) => d.documentType === 'invoice');
    const invoiceAmounts = invoiceDocs
      .map((d) => d.extractedFields?.totalAmount)
      .filter((x: any) => typeof x === 'number') as number[];

    const totalInvoice = invoiceAmounts.reduce((a, b) => a + b, 0);

    const lines: string[] = [];
    lines.push(`خلاصه پرونده خسارت: ${claim.claimNumber}`);
    lines.push(`وضعیت: ${claim.status}`);
    lines.push(`بیمه‌نامه: ${claim.policyId}`);
    lines.push(`تاریخ حادثه: ${claim.lossDate?.toISOString?.() ?? ''}`);
    lines.push(`نوع خسارت: ${claim.lossType}`);

    if (claim.assessedAmount != null) lines.push(`مبلغ ارزیابی‌شده: ${this.formatCurrencyIRR(claim.assessedAmount)}`);
    if (claim.approvedAmount != null) lines.push(`مبلغ تایید‌شده: ${this.formatCurrencyIRR(claim.approvedAmount)}`);
    if (claim.paidAmount != null) lines.push(`مبلغ پرداخت‌شده: ${this.formatCurrencyIRR(claim.paidAmount)}`);

    lines.push(`نیاز به بررسی انسانی: ${claim.requiresHumanTriage ? 'بله' : 'خیر'}`);
    lines.push(`تعداد اسناد: ${docs.length} (استخراج‌شده: ${extractedDocs.length})`);

    if (invoiceDocs.length > 0) {
      lines.push(
        `فاکتورها: ${invoiceDocs.length} | جمع مبلغ فاکتورهای استخراج‌شده: ${this.formatCurrencyIRR(totalInvoice)}`
      );
    }

    if (claim.description) {
      lines.push(`شرح: ${claim.description}`);
    }

    return lines.join('\n');
  }

  getAvailableProviders(): LLMProvider[] {
    return this.llmService.getAvailableProviders();
  }

  // Model Inventory methods
  async registerModel(params: {
    modelName: string;
    modelType: ModelInventory['modelType'];
    version: string;
    provider?: string;
    description?: string;
    parameters?: any;
    riskLevel?: ModelInventory['riskLevel'];
    trainingDataSummary?: string;
    performanceMetrics?: any;
    tags?: string;
    createdBy?: string;
    correlationId?: string;
  }): Promise<ModelInventory> {
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const model = manager.create(ModelInventory, {
        modelName: params.modelName,
        modelType: params.modelType,
        version: params.version,
        provider: params.provider || null,
        status: 'development',
        description: params.description || null,
        parameters: params.parameters || null,
        riskLevel: params.riskLevel || 'medium',
        trainingDataSummary: params.trainingDataSummary || null,
        performanceMetrics: params.performanceMetrics || null,
        deploymentDate: null,
        lastEvaluationDate: null,
        nextEvaluationDate: null,
        tags: params.tags || null,
        metadata: null,
        createdBy: params.createdBy || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const saved = await manager.save(model);
      this.logger.info(`Model registered: ${saved.modelId} (${saved.modelName} v${saved.version})`);
      await outbox.publish({
        topic: 'insurance.ai.model.registered',
        eventType: 'AIModelRegistered',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { modelId: saved.modelId },
        payload: {
          modelId: saved.modelId,
          modelName: saved.modelName,
          modelType: saved.modelType,
          version: saved.version,
          provider: saved.provider,
          riskLevel: saved.riskLevel,
          status: saved.status,
          createdBy: saved.createdBy,
        },
      });
      return saved;
    });
  }

  async updateModelStatus(modelId: string, status: ModelInventory['status']): Promise<ModelInventory | null> {
    return await this.dataSource.transaction(async (manager) => {
      const model = await manager.findOne(ModelInventory, { where: { modelId } });
      if (!model) return null;

      model.status = status;
      if (status === 'production' && !model.deploymentDate) {
        model.deploymentDate = new Date();
      }
      model.updatedAt = new Date();

      const saved = await manager.save(model);
      this.logger.info(`Model status updated: ${modelId} -> ${status}`);
      return saved;
    });
  }

  async getModel(modelId: string): Promise<ModelInventory | null> {
    return this.modelInventoryRepo.findOne({ where: { modelId } });
  }

  async listModels(params: {
    modelType?: ModelInventory['modelType'];
    status?: ModelInventory['status'];
    riskLevel?: ModelInventory['riskLevel'];
    limit?: number;
    offset?: number;
  }): Promise<{ rows: ModelInventory[]; total: number }> {
    const qb = this.modelInventoryRepo.createQueryBuilder('m');
    if (params.modelType) qb.andWhere('m.model_type = :modelType', { modelType: params.modelType });
    if (params.status) qb.andWhere('m.status = :status', { status: params.status });
    if (params.riskLevel) qb.andWhere('m.risk_level = :riskLevel', { riskLevel: params.riskLevel });
    qb.orderBy('m.created_at', 'DESC').limit(params.limit || 50).offset(params.offset || 0);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async deleteModel(modelId: string): Promise<boolean> {
    return await this.dataSource.transaction(async (manager) => {
      const result = await manager.delete(ModelInventory, { modelId });
      if (result.affected && result.affected > 0) {
        this.logger.info(`Model deleted: ${modelId}`);
        return true;
      }
      return false;
    });
  }

  // Model Risk Assessment methods
  async createRiskAssessment(params: {
    modelId: string;
    assessmentVersion: string;
    riskScore: number;
    riskFactors?: any;
    mitigationPlan?: string;
    createdBy?: string;
  }): Promise<ModelRiskAssessment> {
    return await this.dataSource.transaction(async (manager) => {
      const assessment = manager.create(ModelRiskAssessment, {
        modelId: params.modelId,
        assessmentVersion: params.assessmentVersion,
        status: 'pending',
        assessor: null,
        riskScore: params.riskScore,
        riskFactors: params.riskFactors || null,
        mitigationPlan: params.mitigationPlan || null,
        approvalNotes: null,
        assessedAt: null,
        metadata: null,
        createdBy: params.createdBy || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const saved = await manager.save(assessment);
      this.logger.info(`Risk assessment created: ${saved.assessmentId} for model ${params.modelId}`);
      return saved;
    });
  }

  async approveRiskAssessment(assessmentId: string, assessor: string, notes?: string): Promise<ModelRiskAssessment | null> {
    return await this.dataSource.transaction(async (manager) => {
      const assessment = await manager.findOne(ModelRiskAssessment, { where: { assessmentId } });
      if (!assessment) return null;

      assessment.status = 'approved';
      assessment.assessor = assessor;
      assessment.approvalNotes = notes || null;
      assessment.assessedAt = new Date();
      assessment.updatedAt = new Date();

      const saved = await manager.save(assessment);
      this.logger.info(`Risk assessment approved: ${assessmentId} by ${assessor}`);
      return saved;
    });
  }

  async rejectRiskAssessment(assessmentId: string, assessor: string, notes?: string): Promise<ModelRiskAssessment | null> {
    return await this.dataSource.transaction(async (manager) => {
      const assessment = await manager.findOne(ModelRiskAssessment, { where: { assessmentId } });
      if (!assessment) return null;

      assessment.status = 'rejected';
      assessment.assessor = assessor;
      assessment.approvalNotes = notes || null;
      assessment.assessedAt = new Date();
      assessment.updatedAt = new Date();

      const saved = await manager.save(assessment);
      this.logger.info(`Risk assessment rejected: ${assessmentId} by ${assessor}`);
      return saved;
    });
  }

  async getRiskAssessment(assessmentId: string): Promise<ModelRiskAssessment | null> {
    return this.riskAssessmentRepo.findOne({ where: { assessmentId } });
  }

  async listRiskAssessmentsForModel(modelId: string): Promise<ModelRiskAssessment[]> {
    return this.riskAssessmentRepo.find({
      where: { modelId },
      order: { createdAt: 'DESC' },
    });
  }

  // AI Incident Report methods
  async createIncidentReport(params: {
    modelId?: string;
    incidentType: string;
    description: string;
    severity: AIIncidentReport['severity'];
    affectedSystems?: any;
    impactSummary?: string;
    occurredAt?: Date;
    reportedBy?: string;
    createdBy?: string;
    correlationId?: string;
  }): Promise<AIIncidentReport> {
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const incident = manager.create(AIIncidentReport, {
        modelId: params.modelId || null,
        incidentType: params.incidentType,
        description: params.description,
        severity: params.severity,
        status: 'open',
        affectedSystems: params.affectedSystems || null,
        impactSummary: params.impactSummary || null,
        rootCause: null,
        resolution: null,
        reportedBy: params.reportedBy || null,
        investigatedBy: null,
        occurredAt: params.occurredAt || new Date(),
        resolvedAt: null,
        metadata: null,
        createdBy: params.createdBy || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const saved = await manager.save(incident);
      this.logger.info(`Incident report created: ${saved.incidentId} (severity: ${params.severity})`);
      await outbox.publish({
        topic: 'insurance.ai.incident.created',
        eventType: 'AIIncidentCreated',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { incidentId: saved.incidentId },
        payload: {
          incidentId: saved.incidentId,
          modelId: saved.modelId,
          incidentType: saved.incidentType,
          severity: saved.severity,
          status: saved.status,
          description: saved.description,
          reportedBy: saved.reportedBy,
          occurredAt: saved.occurredAt?.toISOString?.() ?? new Date().toISOString(),
        },
      });
      return saved;
    });
  }

  async updateIncidentStatus(incidentId: string, status: AIIncidentReport['status'], investigatedBy?: string): Promise<AIIncidentReport | null> {
    return await this.dataSource.transaction(async (manager) => {
      const incident = await manager.findOne(AIIncidentReport, { where: { incidentId } });
      if (!incident) return null;

      incident.status = status;
      if (investigatedBy) incident.investigatedBy = investigatedBy;
      if (status === 'resolved' || status === 'closed') {
        incident.resolvedAt = new Date();
      }
      incident.updatedAt = new Date();

      const saved = await manager.save(incident);
      this.logger.info(`Incident status updated: ${incidentId} -> ${status}`);
      return saved;
    });
  }

  async resolveIncident(incidentId: string, resolution: string, rootCause?: string): Promise<AIIncidentReport | null> {
    return await this.dataSource.transaction(async (manager) => {
      const incident = await manager.findOne(AIIncidentReport, { where: { incidentId } });
      if (!incident) return null;

      incident.status = 'resolved';
      incident.resolution = resolution;
      incident.rootCause = rootCause || null;
      incident.resolvedAt = new Date();
      incident.updatedAt = new Date();

      const saved = await manager.save(incident);
      this.logger.info(`Incident resolved: ${incidentId}`);
      return saved;
    });
  }

  async getIncident(incidentId: string): Promise<AIIncidentReport | null> {
    return this.incidentRepo.findOne({ where: { incidentId } });
  }

  async listIncidents(params: {
    modelId?: string;
    severity?: AIIncidentReport['severity'];
    status?: AIIncidentReport['status'];
    limit?: number;
    offset?: number;
  }): Promise<{ rows: AIIncidentReport[]; total: number }> {
    const qb = this.incidentRepo.createQueryBuilder('i');
    if (params.modelId) qb.andWhere('i.modelId = :modelId', { modelId: params.modelId });
    if (params.severity) qb.andWhere('i.severity = :severity', { severity: params.severity });
    if (params.status) qb.andWhere('i.status = :status', { status: params.status });
    qb.orderBy('i.createdAt', 'DESC').limit(params.limit || 50).offset(params.offset || 0);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  // Model Card methods
  async createModelCard(params: {
    modelId: string;
    version: string;
    modelDetails?: any;
    intendedUse?: string;
    limitations?: string;
    trainingData?: any;
    evaluationMetrics?: any;
    ethicalConsiderations?: string;
    citations?: any;
    createdBy?: string;
  }): Promise<ModelCard> {
    return await this.dataSource.transaction(async (manager) => {
      const card = manager.create(ModelCard, {
        modelId: params.modelId,
        version: params.version,
        modelDetails: params.modelDetails || null,
        intendedUse: params.intendedUse || null,
        limitations: params.limitations || null,
        trainingData: params.trainingData || null,
        evaluationMetrics: params.evaluationMetrics || null,
        ethicalConsiderations: params.ethicalConsiderations || null,
        citations: params.citations || null,
        createdBy: params.createdBy || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const saved = await manager.save(card);
      this.logger.info(`Model card created: ${saved.cardId} for model ${params.modelId} v${params.version}`);
      return saved;
    });
  }

  async updateModelCard(cardId: string, params: {
    modelDetails?: any;
    intendedUse?: string;
    limitations?: string;
    trainingData?: any;
    evaluationMetrics?: any;
    ethicalConsiderations?: string;
    citations?: any;
  }): Promise<ModelCard | null> {
    return await this.dataSource.transaction(async (manager) => {
      const card = await manager.findOne(ModelCard, { where: { cardId } });
      if (!card) return null;

      Object.assign(card, params);
      card.updatedAt = new Date();

      const saved = await manager.save(card);
      this.logger.info(`Model card updated: ${cardId}`);
      return saved;
    });
  }

  async getModelCard(cardId: string): Promise<ModelCard | null> {
    return this.modelCardRepo.findOne({ where: { cardId } });
  }

  async getModelCardByVersion(modelId: string, version: string): Promise<ModelCard | null> {
    return this.modelCardRepo.findOne({ where: { modelId, version } });
  }

  async listModelCardsForModel(modelId: string): Promise<ModelCard[]> {
    return this.modelCardRepo.find({
      where: { modelId },
      order: { createdAt: 'DESC' },
    });
  }

  // Model Validation Report methods
  async createValidationReport(params: {
    modelId: string;
    version: string;
    validationType: string;
    testResults?: any;
    performanceMetrics?: any;
    dataQualityMetrics?: any;
    biasFairnessMetrics?: any;
    complianceCheck?: any;
    recommendations?: string;
    createdBy?: string;
  }): Promise<ModelValidationReport> {
    return await this.dataSource.transaction(async (manager) => {
      const report = manager.create(ModelValidationReport, {
        modelId: params.modelId,
        version: params.version,
        validationType: params.validationType,
        status: 'pending',
        testResults: params.testResults || null,
        performanceMetrics: params.performanceMetrics || null,
        dataQualityMetrics: params.dataQualityMetrics || null,
        biasFairnessMetrics: params.biasFairnessMetrics || null,
        complianceCheck: params.complianceCheck || null,
        recommendations: params.recommendations || null,
        validatedBy: null,
        validationDate: null,
        metadata: null,
        createdBy: params.createdBy || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const saved = await manager.save(report);
      this.logger.info(`Validation report created: ${saved.reportId} for model ${params.modelId} v${params.version}`);
      return saved;
    });
  }

  async updateValidationStatus(reportId: string, status: ModelValidationReport['status'], validatedBy: string, testResults?: any, performanceMetrics?: any): Promise<ModelValidationReport | null> {
    return await this.dataSource.transaction(async (manager) => {
      const report = await manager.findOne(ModelValidationReport, { where: { reportId } });
      if (!report) return null;

      report.status = status;
      report.validatedBy = validatedBy;
      report.validationDate = new Date();
      if (testResults) report.testResults = testResults;
      if (performanceMetrics) report.performanceMetrics = performanceMetrics;
      report.updatedAt = new Date();

      const saved = await manager.save(report);
      this.logger.info(`Validation report status updated: ${reportId} -> ${status}`);
      return saved;
    });
  }

  async getValidationReport(reportId: string): Promise<ModelValidationReport | null> {
    return this.validationRepo.findOne({ where: { reportId } });
  }

  async listValidationReportsForModel(modelId: string): Promise<ModelValidationReport[]> {
    return this.validationRepo.find({
      where: { modelId },
      order: { createdAt: 'DESC' },
    });
  }

  // Underwriter Assistant methods
  async assistUnderwriting(params: {
    policyId?: string;
    customerId?: string;
    productType?: string;
    coverageAmount?: number;
    riskFactors?: string[];
    headers: Record<string, any>;
    correlationId: string;
    tenantId?: string;
    actorUserId?: string;
    provider?: LLMProvider;
  }): Promise<{ recommendation: string; confidence: number; suggestedActions: string[]; riskLevel: 'low' | 'medium' | 'high' }> {
    const context = this.buildUnderwritingContext(params);
    const prompt = `به عنوان دستیار تحت‌نویس بیمه، بر اساس اطلاعات زیر توصیه‌ای برای تصمیم‌گیری بده:\n\n${context}\n\nپاسخ را به زبان فارسی بده و شامل موارد زیر باشد:\n1. توصیه کلی (تایید/رد/نیاز به بررسی بیشتر)\n2. سطح ریسک (کم/متوسط/زیاد)\n3. اقدامات پیشنهادی\n4. نکات مهم برای در نظر گرفتن`;
    try {
      const providers = params.provider ? [params.provider] : this.llmService.getAvailableProviders();
      const response = await this.llmService.generateWithFallback(
        providers,
        prompt,
        {
          systemPrompt: 'شما یک کارشناس خبره بیمه هستید. لطفاً توصیه‌های حرفه‌ای و دقیق بدهید.',
          maxTokens: 1500,
          temperature: 0.5,
        }
      );

      await this.auditRepo.save({
        resourceType: 'policy' as any,
        resourceId: params.policyId || 'unknown',
        action: 'copilot:underwriting:assist',
        userId: params.actorUserId || 'unknown',
        correlationId: params.correlationId,
        requestPayload: { policyId: params.policyId, customerId: params.customerId },
        responsePayload: { recommendation: response.text.substring(0, 500) },
        status: 'success',
        provider: response.provider,
        model: response.model,
        latencyMs: 0,
        error: null,
        createdAt: new Date(),
      });

      return {
        recommendation: response.text,
        confidence: 0.85,
        suggestedActions: ['بررسی سوابق بیمه‌گذار', 'تحلیل ریسک اضافی', 'تایید یا رد با شرایط خاص'],
        riskLevel: 'medium',
      };
    } catch (error: any) {
      this.logger.error(`Underwriting assistant failed: ${error.message}`);
      return {
        recommendation: 'خطا در دریافت توصیه. لطفاً به صورت دستی بررسی کنید.',
        confidence: 0,
        suggestedActions: ['بررسی دستی مورد'],
        riskLevel: 'medium',
      };
    }
  }

  private buildUnderwritingContext(params: {
    policyId?: string;
    customerId?: string;
    productType?: string;
    coverageAmount?: number;
    riskFactors?: string[];
  }): string {
    const lines: string[] = [];
    if (params.policyId) lines.push(`شناسه بیمه‌نامه: ${params.policyId}`);
    if (params.customerId) lines.push(`شناسه مشتری: ${params.customerId}`);
    if (params.productType) lines.push(`نوع محصول: ${params.productType}`);
    if (params.coverageAmount) lines.push(`مبلغ پوشش: ${params.coverageAmount}`);
    if (params.riskFactors && params.riskFactors.length > 0) {
      lines.push(`عوامل ریسک: ${params.riskFactors.join(', ')}`);
    }
    return lines.join('\n');
  }

  // Complaint Triage methods
  async triageComplaint(params: {
    complaintId?: string;
    customerId?: string;
    description: string;
    category?: string;
    severity?: string;
    headers: Record<string, any>;
    correlationId: string;
    tenantId?: string;
    actorUserId?: string;
    provider?: LLMProvider;
  }): Promise<{ category: string; priority: 'low' | 'medium' | 'high' | 'urgent'; suggestedActions: string[]; estimatedResolutionTime: string }> {
    const context = this.buildComplaintContext(params);
    try {
      const providers = params.provider ? [params.provider] : this.llmService.getAvailableProviders();
      const response = await this.llmService.generateWithFallback(
        providers,
        `به عنوان دستیار شکایات بیمه، بر اساس اطلاعات زیر شکایت را دسته‌بندی و اولویت‌بندی کن:\n\n${context}\n\nپاسخ را به زبان فارسی بده و شامل موارد زیر باشد:\n1. دسته‌بندی شکایت (مثلاً: فنی، مالی، رفتاری، عملیاتی)\n2. اولویت (کم/متوسط/زیاد/فوری)\n3. اقدامات پیشنهادی\n4. زمان تخمینی حل`,
        {
          systemPrompt: 'شما یک کارشناس خبره شکایات بیمه هستید. لطفاً دسته‌بندی و اولویت‌بندی دقیق و حرفه‌ای بدهید.',
          maxTokens: 1500,
          temperature: 0.5,
        }
      );

      await this.auditRepo.save({
        resourceType: 'complaint' as any,
        resourceId: params.complaintId || 'unknown',
        action: 'copilot:complaint:triage',
        userId: params.actorUserId || 'unknown',
        correlationId: params.correlationId,
        requestPayload: { complaintId: params.complaintId, customerId: params.customerId },
        responsePayload: { triage: response.text.substring(0, 500) },
        status: 'success',
        provider: response.provider,
        model: response.model,
        latencyMs: 0,
        error: null,
        createdAt: new Date(),
      });

      return {
        category: 'فنی',
        priority: 'medium',
        suggestedActions: ['بررسی سوابق مشتری', 'تحلیل علت شکایت', 'ارتباط با واحد مربوطه'],
        estimatedResolutionTime: '2-3 روز کاری',
      };
    } catch (error: any) {
      this.logger.error(`Complaint triage failed: ${error.message}`);
      return {
        category: 'عملیاتی',
        priority: 'medium',
        suggestedActions: ['بررسی دستی مورد'],
        estimatedResolutionTime: '3-5 روز کاری',
      };
    }
  }

  private buildComplaintContext(params: {
    complaintId?: string;
    customerId?: string;
    description: string;
    category?: string;
    severity?: string;
  }): string {
    const lines: string[] = [];
    if (params.complaintId) lines.push(`شناسه شکایت: ${params.complaintId}`);
    if (params.customerId) lines.push(`شناسه مشتری: ${params.customerId}`);
    if (params.category) lines.push(`دسته‌بندی فعلی: ${params.category}`);
    if (params.severity) lines.push(`شدت فعلی: ${params.severity}`);
    lines.push(`توضیحات: ${params.description}`);
    return lines.join('\n');
  }

  // Recovery Discovery methods
  async discoverRecovery(params: {
    claimId?: string;
    customerId?: string;
    policyId?: string;
    lossAmount?: number;
    coverageType?: string;
    headers: Record<string, any>;
    correlationId: string;
    tenantId?: string;
    actorUserId?: string;
    provider?: LLMProvider;
  }): Promise<{ recoveryOpportunities: string[]; estimatedRecoveryAmount: number; recommendedActions: string[]; thirdPartyClaims: boolean }> {
    const context = this.buildRecoveryContext(params);
    try {
      const providers = params.provider ? [params.provider] : this.llmService.getAvailableProviders();
      const response = await this.llmService.generateWithFallback(
        providers,
        `به عنوان کارشناس بازیابی خسارت بیمه، بر اساس اطلاعات زیر فرصت‌های بازیابی را شناسایی کن:\n\n${context}\n\nپاسخ را به زبان فارسی بده و شامل موارد زیر باشد:\n1. فرصت‌های بازیافت (subrogation، third party، salvage)\n2. مبلغ تخمینی بازیافت\n3. اقدامات پیشنهادی\n4. وجود ادعای شخص ثالث`,
        {
          systemPrompt: 'شما یک کارشناس خبره بازیافت خسارت بیمه هستید. لطفاً تحلیل دقیق و حرفه‌ای بدهید.',
          maxTokens: 1500,
          temperature: 0.5,
        }
      );

      await this.auditRepo.save({
        resourceType: 'claim' as any,
        resourceId: params.claimId || 'unknown',
        action: 'copilot:recovery:discover',
        userId: params.actorUserId || 'unknown',
        correlationId: params.correlationId,
        requestPayload: { claimId: params.claimId, policyId: params.policyId },
        responsePayload: { discovery: response.text.substring(0, 500) },
        status: 'success',
        provider: response.provider,
        model: response.model,
        latencyMs: 0,
        error: null,
        createdAt: new Date(),
      });

      return {
        recoveryOpportunities: ['Subrogation against third party', 'Salvage value recovery', 'Deductible recovery'],
        estimatedRecoveryAmount: params.lossAmount ? params.lossAmount * 0.15 : 0,
        recommendedActions: ['بررسی علت حادثه', 'شناسایی طرف مقصر', 'ارتباط با حقوقی'],
        thirdPartyClaims: true,
      };
    } catch (error: any) {
      this.logger.error(`Recovery discovery failed: ${error.message}`);
      return {
        recoveryOpportunities: ['بررسی فرصت‌های بازیافت'],
        estimatedRecoveryAmount: 0,
        recommendedActions: ['بررسی دستی مورد'],
        thirdPartyClaims: false,
      };
    }
  }

  private buildRecoveryContext(params: {
    claimId?: string;
    customerId?: string;
    policyId?: string;
    lossAmount?: number;
    coverageType?: string;
  }): string {
    const lines: string[] = [];
    if (params.claimId) lines.push(`شناسه خسارت: ${params.claimId}`);
    if (params.customerId) lines.push(`شناسه مشتری: ${params.customerId}`);
    if (params.policyId) lines.push(`شناسه بیمه‌نامه: ${params.policyId}`);
    if (params.lossAmount) lines.push(`مبلغ خسارت: ${params.lossAmount}`);
    if (params.coverageType) lines.push(`نوع پوشش: ${params.coverageType}`);
    return lines.join('\n');
  }

  // Pricing Support methods
  async assistPricing(params: {
    customerId?: string;
    productType?: string;
    coverageAmount?: number;
    riskProfile?: string;
    marketData?: any;
    headers: Record<string, any>;
    correlationId: string;
    tenantId?: string;
    actorUserId?: string;
    provider?: LLMProvider;
  }): Promise<{ suggestedPremium: number; pricingFactors: string[]; riskAdjustment: string; competitivePosition: 'low' | 'medium' | 'high' }> {
    const context = this.buildPricingContext(params);
    try {
      const providers = params.provider ? [params.provider] : this.llmService.getAvailableProviders();
      const response = await this.llmService.generateWithFallback(
        providers,
        `به عنوان کارشناس قیمت‌گذاری بیمه، بر اساس اطلاعات زیر قیمت پیشنهادی بده:\n\n${context}\n\nپاسخ را به زبان فارسی بده و شامل موارد زیر باشد:\n1. حق بیمه پیشنهادی\n2. عوامل مؤثر در قیمت‌گذاری\n3. تنظیم ریسک\n4. موقعیت رقابتی`,
        {
          systemPrompt: 'شما یک کارشناس خبره قیمت‌گذاری بیمه هستید. لطفاً تحلیل دقیق و حرفه‌ای بدهید.',
          maxTokens: 1500,
          temperature: 0.5,
        }
      );

      await this.auditRepo.save({
        resourceType: 'policy' as any,
        resourceId: 'unknown',
        action: 'copilot:pricing:assist',
        userId: params.actorUserId || 'unknown',
        correlationId: params.correlationId,
        requestPayload: { customerId: params.customerId, productType: params.productType },
        responsePayload: { pricing: response.text.substring(0, 500) },
        status: 'success',
        provider: response.provider,
        model: response.model,
        latencyMs: 0,
        error: null,
        createdAt: new Date(),
      });

      return {
        suggestedPremium: params.coverageAmount ? params.coverageAmount * 0.03 : 0,
        pricingFactors: ['سابقه بیمه‌گذار', 'نوع محصول', 'مبلغ پوشش', 'ریسک منطقه'],
        riskAdjustment: 'ریسک متوسط - بدون تنظیم خاص',
        competitivePosition: 'medium',
      };
    } catch (error: any) {
      this.logger.error(`Pricing assist failed: ${error.message}`);
      return {
        suggestedPremium: 0,
        pricingFactors: ['بررسی دستی مورد نیاز'],
        riskAdjustment: 'خطا در محاسبه',
        competitivePosition: 'medium',
      };
    }
  }

  private buildPricingContext(params: {
    customerId?: string;
    productType?: string;
    coverageAmount?: number;
    riskProfile?: string;
    marketData?: any;
  }): string {
    const lines: string[] = [];
    if (params.customerId) lines.push(`شناسه مشتری: ${params.customerId}`);
    if (params.productType) lines.push(`نوع محصول: ${params.productType}`);
    if (params.coverageAmount) lines.push(`مبلغ پوشش: ${params.coverageAmount}`);
    if (params.riskProfile) lines.push(`پروفایل ریسک: ${params.riskProfile}`);
    if (params.marketData) lines.push(`داده‌های بازار: ${JSON.stringify(params.marketData)}`);
    return lines.join('\n');
  }

  // Self-service Assistant methods
  async assistSelfService(params: {
    customerId?: string;
    query: string;
    intent?: string;
    context?: any;
    headers: Record<string, any>;
    correlationId: string;
    tenantId?: string;
    actorUserId?: string;
    provider?: LLMProvider;
  }): Promise<{ response: string; suggestedActions: string[]; relatedPolicies?: string[]; faqSuggestions: string[] }> {
    const context = this.buildSelfServiceContext(params);
    try {
      const providers = params.provider ? [params.provider] : this.llmService.getAvailableProviders();
      const response = await this.llmService.generateWithFallback(
        providers,
        `به عنوان دستیار خودخدمت مشتریان بیمه، به سوال مشتری پاسخ بده:\n\n${context}\n\nپاسخ را به زبان فارسی بده و شامل موارد زیر باشد:\n1. پاسخ مستقیم به سوال\n2. اقدامات پیشنهادی\n3. بیمه‌نامه‌های مرتبط\n4. سوالات متداول پیشنهادی`,
        {
          systemPrompt: 'شما یک دستیار خودخدمت حرفه‌ای بیمه هستید. لطفاً پاسخ‌های دقیق، دوستانه و مفید بدهید.',
          maxTokens: 1500,
          temperature: 0.6,
        }
      );

      await this.auditRepo.save({
        resourceType: 'customer' as any,
        resourceId: params.customerId || 'unknown',
        action: 'copilot:selfservice:assist',
        userId: params.actorUserId || 'unknown',
        correlationId: params.correlationId,
        requestPayload: { customerId: params.customerId, query: params.query },
        responsePayload: { response: response.text.substring(0, 500) },
        status: 'success',
        provider: response.provider,
        model: response.model,
        latencyMs: 0,
        error: null,
        createdAt: new Date(),
      });

      return {
        response: response.text,
        suggestedActions: ['مشاهده جزئیات بیمه‌نامه', 'تماس با پشتیبانی', 'ثبت درخواست'],
        relatedPolicies: [],
        faqSuggestions: ['چگونه خسارت ثبت کنم؟', 'نحوه پرداخت حق بیمه', 'تمدید بیمه‌نامه'],
      };
    } catch (error: any) {
      this.logger.error(`Self-service assist failed: ${error.message}`);
      return {
        response: 'متأسفانه در حال حاضر نمی‌توانم به سوال شما پاسخ دهم. لطفاً با پشتیبانی تماس بگیرید.',
        suggestedActions: ['تماس با پشتیبانی'],
        relatedPolicies: [],
        faqSuggestions: [],
      };
    }
  }

  private buildSelfServiceContext(params: {
    customerId?: string;
    query: string;
    intent?: string;
    context?: any;
  }): string {
    const lines: string[] = [];
    if (params.customerId) lines.push(`شناسه مشتری: ${params.customerId}`);
    if (params.intent) lines.push(`قصد: ${params.intent}`);
    lines.push(`سوال: ${params.query}`);
    if (params.context) lines.push(`Context: ${JSON.stringify(params.context)}`);
    return lines.join('\n');
  }

  private async generateLLMSummary(context: string, contextType: 'claim' | 'document', provider?: LLMProvider): Promise<{ text: string; model: string; provider: LLMProvider }> {
    if (this.ecosystemAi.isEnabled()) {
      try {
        const ecoResponse = await this.ecosystemAi.consult({
          query: `خلاصه ${contextType === 'claim' ? 'خسارت' : 'سند'} زیر را به فارسی ارائه بده:\n\n${context}`,
          context,
          contextType,
          systemPrompt: 'You are an expert insurance analyst. Provide a concise summary in Persian (Farsi).',
          maxTokens: 1000,
          temperature: 0.5,
        });
        return {
          text: ecoResponse.text,
          model: ecoResponse.model,
          provider: 'ollama' as LLMProvider,
        };
      } catch (e: any) {
        this.logger.warn(`Ecosystem AI summary failed, falling back to local LLM: ${e.message}`);
      }
    }
    try {
      const response = await this.llmService.generateSummary(context, contextType, provider);
      return {
        text: response.text,
        model: response.model,
        provider: response.provider,
      };
    } catch (error: any) {
      this.logger.warn(`LLM summary generation failed: ${error.message}, falling back to template`);
      throw error;
    }
  }

  private buildDocumentSummary(doc: DocumentEntity): string {
    const fields = doc.extractedFields || {};
    const lines: string[] = [];
    lines.push(`خلاصه سند: ${doc.fileName}`);
    lines.push(`نوع: ${doc.documentType}`);
    lines.push(`وضعیت: ${doc.status}`);
    lines.push(`ClaimId: ${doc.claimId}`);

    if (doc.status === 'extracted') {
      if (fields.invoiceNumber) lines.push(`شماره فاکتور: ${fields.invoiceNumber}`);
      if (typeof fields.totalAmount === 'number') lines.push(`مبلغ کل: ${this.formatCurrencyIRR(fields.totalAmount)}`);
      if (fields.currency) lines.push(`ارز: ${fields.currency}`);
      if (typeof fields.confidence === 'number') lines.push(`اعتماد: ${fields.confidence}`);
    }

    return lines.join('\n');
  }

  async getClaimSummary(params: {
    claimId: string;
    headers: Record<string, any>;
    correlationId: string;
    tenantId?: string;
    actorUserId?: string;
  }) {
    const policy = await this.evaluatePolicy({ headers: params.headers });
    if (!policy.allowed) {
      await this.auditRepo.save(
        this.auditRepo.create({
          resourceType: 'claim',
          resourceId: params.claimId,
          correlationId: params.correlationId,
          tenantId: params.tenantId || null,
          actorUserId: params.actorUserId || null,
          aiEnabledHeader: policy.aiEnabledHeader,
          policyAllowed: policy.policyAllowed,
          decision: 'blocked',
          blockedReason: policy.blockedReason,
          outputPreview: null,
          outputRedacted: false,
        })
      );

      return {
        ok: false as const,
        status: 403,
        body: {
          success: false,
          error: { code: 'AI_DISABLED', message: 'Copilot is disabled by policy' },
          correlationId: params.correlationId,
        },
      };
    }

    try {
      const claim = await this.claimRepo.findOne({ where: { claimId: params.claimId } });
      if (!claim) {
        return {
          ok: false as const,
          status: 404,
          body: {
            success: false,
            error: { code: 'NOT_FOUND', message: 'Claim not found' },
            correlationId: params.correlationId,
          },
        };
      }

      const docs = await this.docRepo.find({ where: { claimId: params.claimId } });
      const rawSummary = this.buildClaimSummary(claim, docs);
      const redacted = this.redactSensitive(rawSummary);
      const preview = redacted.text.length > 500 ? `${redacted.text.slice(0, 500)}...` : redacted.text;
      const sourceRefs = this.buildSourceRefs('claim', { claim, docs });
      const confidence = this.computeOutputConfidence(redacted.confidence, sourceRefs.length);

      await this.auditRepo.save(
        this.auditRepo.create({
          resourceType: 'claim',
          resourceId: params.claimId,
          correlationId: params.correlationId,
          tenantId: params.tenantId || null,
          actorUserId: params.actorUserId || null,
          aiEnabledHeader: policy.aiEnabledHeader,
          policyAllowed: policy.policyAllowed,
          decision: 'allowed',
          blockedReason: null,
          outputPreview: preview,
          outputRedacted: redacted.redacted,
        })
      );

      return {
        ok: true as const,
        status: 200,
        body: {
          success: true,
          data: {
            claimId: params.claimId,
            summary: redacted.text,
            confidence,
            sourceRefs,
            redactedSpans: redacted.spans,
            sources: {
              claim: { claimNumber: claim.claimNumber, status: claim.status },
              documents: docs.map((d) => ({ documentId: d.documentId, documentType: d.documentType, status: d.status })),
            },
          },
          correlationId: params.correlationId,
        },
      };
    } catch (e: any) {
      await this.auditRepo.save(
        this.auditRepo.create({
          resourceType: 'claim',
          resourceId: params.claimId,
          correlationId: params.correlationId,
          tenantId: params.tenantId || null,
          actorUserId: params.actorUserId || null,
          aiEnabledHeader: policy.aiEnabledHeader,
          policyAllowed: policy.policyAllowed,
          decision: 'blocked',
          blockedReason: 'INTERNAL_ERROR',
          outputPreview: null,
          outputRedacted: false,
        })
      );

      this.logger.error('copilot.claim_summary.failed', e, { correlationId: params.correlationId });
      return {
        ok: false as const,
        status: 500,
        body: {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to generate summary' },
          correlationId: params.correlationId,
        },
      };
    }
  }

  async getDocumentSummary(params: {
    documentId: string;
    headers: Record<string, any>;
    correlationId: string;
    tenantId?: string;
    actorUserId?: string;
  }) {
    const policy = await this.evaluatePolicy({ headers: params.headers });
    if (!policy.allowed) {
      await this.auditRepo.save(
        this.auditRepo.create({
          resourceType: 'document',
          resourceId: params.documentId,
          correlationId: params.correlationId,
          tenantId: params.tenantId || null,
          actorUserId: params.actorUserId || null,
          aiEnabledHeader: policy.aiEnabledHeader,
          policyAllowed: policy.policyAllowed,
          decision: 'blocked',
          blockedReason: policy.blockedReason,
          outputPreview: null,
          outputRedacted: false,
        })
      );

      return {
        ok: false as const,
        status: 403,
        body: {
          success: false,
          error: { code: 'AI_DISABLED', message: 'Copilot is disabled by policy' },
          correlationId: params.correlationId,
        },
      };
    }

    try {
      const doc = await this.docRepo.findOne({ where: { documentId: params.documentId } });
      if (!doc) {
        return {
          ok: false as const,
          status: 404,
          body: {
            success: false,
            error: { code: 'NOT_FOUND', message: 'Document not found' },
            correlationId: params.correlationId,
          },
        };
      }

      const rawSummary = this.buildDocumentSummary(doc);
      const redacted = this.redactSensitive(rawSummary);
      const preview = redacted.text.length > 500 ? `${redacted.text.slice(0, 500)}...` : redacted.text;
      const sourceRefs = this.buildSourceRefs('document', { doc });
      const confidence = this.computeOutputConfidence(redacted.confidence, sourceRefs.length);

      await this.auditRepo.save(
        this.auditRepo.create({
          resourceType: 'document',
          resourceId: params.documentId,
          correlationId: params.correlationId,
          tenantId: params.tenantId || null,
          actorUserId: params.actorUserId || null,
          aiEnabledHeader: policy.aiEnabledHeader,
          policyAllowed: policy.policyAllowed,
          decision: 'allowed',
          blockedReason: null,
          outputPreview: preview,
          outputRedacted: redacted.redacted,
        })
      );

      return {
        ok: true as const,
        status: 200,
        body: {
          success: true,
          data: {
            documentId: params.documentId,
            summary: redacted.text,
            confidence,
            sourceRefs,
            redactedSpans: redacted.spans,
            status: doc.status,
            documentType: doc.documentType,
          },
          correlationId: params.correlationId,
        },
      };
    } catch (e: any) {
      await this.auditRepo.save(
        this.auditRepo.create({
          resourceType: 'document',
          resourceId: params.documentId,
          correlationId: params.correlationId,
          tenantId: params.tenantId || null,
          actorUserId: params.actorUserId || null,
          aiEnabledHeader: policy.aiEnabledHeader,
          policyAllowed: policy.policyAllowed,
          decision: 'blocked',
          blockedReason: 'INTERNAL_ERROR',
          outputPreview: null,
          outputRedacted: false,
        })
      );

      this.logger.error('copilot.document_summary.failed', e, { correlationId: params.correlationId });
      return {
        ok: false as const,
        status: 500,
        body: {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to generate summary' },
          correlationId: params.correlationId,
        },
      };
    }
  }

  async askQuestion(params: {
    contextType: 'claim' | 'document' | 'policy' | 'complaint';
    resourceId: string;
    question: string;
    headers: Record<string, any>;
    correlationId: string;
    tenantId?: string;
    actorUserId?: string;
    provider?: LLMProvider;
  }) {
    const policy = await this.evaluatePolicy({ headers: params.headers });
    if (!policy.allowed) {
      await this.auditRepo.save(
        this.auditRepo.create({
          resourceType: params.contextType,
          resourceId: params.resourceId,
          correlationId: params.correlationId,
          tenantId: params.tenantId || null,
          actorUserId: params.actorUserId || null,
          aiEnabledHeader: policy.aiEnabledHeader,
          policyAllowed: policy.policyAllowed,
          decision: 'blocked',
          blockedReason: policy.blockedReason,
          outputPreview: null,
          outputRedacted: false,
        })
      );

      return {
        ok: false as const,
        status: 403,
        body: {
          success: false,
          error: { code: 'AI_DISABLED', message: 'Copilot is disabled by policy' },
          correlationId: params.correlationId,
        },
      };
    }

    try {
      let context = '';
      let claimForRef: ClaimEntity | null = null;
      let docForRef: DocumentEntity | null = null;
      let docsForRef: DocumentEntity[] = [];

      if (params.contextType === 'claim') {
        const claim = await this.claimRepo.findOne({ where: { claimId: params.resourceId } });
        if (!claim) {
          return {
            ok: false as const,
            status: 404,
            body: {
              success: false,
              error: { code: 'NOT_FOUND', message: 'Claim not found' },
              correlationId: params.correlationId,
            },
          };
        }
        claimForRef = claim;
        const docs = await this.docRepo.find({ where: { claimId: params.resourceId } });
        docsForRef = docs;
        context = this.buildClaimSummary(claim, docs);
      } else if (params.contextType === 'document') {
        const doc = await this.docRepo.findOne({ where: { documentId: params.resourceId } });
        if (!doc) {
          return {
            ok: false as const,
            status: 404,
            body: {
              success: false,
              error: { code: 'NOT_FOUND', message: 'Document not found' },
              correlationId: params.correlationId,
            },
          };
        }
        docForRef = doc;
        context = this.buildDocumentSummary(doc);
      } else {
        context = 'Context not available for this resource type in this implementation.';
      }

      let response: { text: string; model: string; provider: string };
      if (this.ecosystemAi.isEnabled()) {
        try {
          const ecoResponse = await this.ecosystemAi.consult({
            query: params.question,
            context,
            contextType: params.contextType as any,
            systemPrompt: 'You are an expert insurance analyst. Answer the question in Persian (Farsi) based on the context provided.',
            maxTokens: 1500,
            temperature: 0.3,
            correlationId: params.correlationId,
          });
          response = { text: ecoResponse.text, model: ecoResponse.model, provider: 'ecosystem' };
        } catch (e: any) {
          this.logger.warn(`Ecosystem AI QA failed, falling back to local LLM: ${e.message}`);
          const llmResponse = await this.llmService.answerQuestion(context, params.question, params.contextType, params.provider);
          response = { text: llmResponse.text, model: llmResponse.model, provider: llmResponse.provider };
        }
      } else {
        const llmResponse = await this.llmService.answerQuestion(context, params.question, params.contextType, params.provider);
        response = { text: llmResponse.text, model: llmResponse.model, provider: llmResponse.provider };
      }
      const redacted = this.redactSensitive(response.text);
      const preview = redacted.text.length > 500 ? `${redacted.text.slice(0, 500)}...` : redacted.text;
      const sourceRefs = this.buildSourceRefs(params.contextType, { claim: claimForRef || undefined, doc: docForRef || undefined, docs: docsForRef });
      const confidence = this.computeOutputConfidence(redacted.confidence, sourceRefs.length);

      await this.auditRepo.save(
        this.auditRepo.create({
          resourceType: params.contextType,
          resourceId: params.resourceId,
          correlationId: params.correlationId,
          tenantId: params.tenantId || null,
          actorUserId: params.actorUserId || null,
          aiEnabledHeader: policy.aiEnabledHeader,
          policyAllowed: policy.policyAllowed,
          decision: 'allowed',
          blockedReason: null,
          outputPreview: preview,
          outputRedacted: redacted.redacted,
        })
      );

      return {
        ok: true as const,
        status: 200,
        body: {
          success: true,
          data: {
            resourceId: params.resourceId,
            question: params.question,
            answer: redacted.text,
            confidence,
            sourceRefs,
            redactedSpans: redacted.spans,
            model: response.model,
            provider: response.provider,
          },
          correlationId: params.correlationId,
        },
      };
    } catch (e: any) {
      await this.auditRepo.save(
        this.auditRepo.create({
          resourceType: params.contextType,
          resourceId: params.resourceId,
          correlationId: params.correlationId,
          tenantId: params.tenantId || null,
          actorUserId: params.actorUserId || null,
          aiEnabledHeader: policy.aiEnabledHeader,
          policyAllowed: policy.policyAllowed,
          decision: 'blocked',
          blockedReason: 'INTERNAL_ERROR',
          outputPreview: null,
          outputRedacted: false,
        })
      );

      this.logger.error('copilot.ask_question.failed', e, { correlationId: params.correlationId });
      return {
        ok: false as const,
        status: 500,
        body: {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to answer question' },
          correlationId: params.correlationId,
        },
      };
    }
  }

  async getNextBestAction(params: {
    contextType: 'claim' | 'policy' | 'complaint';
    resourceId: string;
    headers: Record<string, any>;
    correlationId: string;
    tenantId?: string;
    actorUserId?: string;
    provider?: LLMProvider;
  }) {
    const policy = await this.evaluatePolicy({ headers: params.headers });
    if (!policy.allowed) {
      await this.auditRepo.save(
        this.auditRepo.create({
          resourceType: params.contextType,
          resourceId: params.resourceId,
          correlationId: params.correlationId,
          tenantId: params.tenantId || null,
          actorUserId: params.actorUserId || null,
          aiEnabledHeader: policy.aiEnabledHeader,
          policyAllowed: policy.policyAllowed,
          decision: 'blocked',
          blockedReason: policy.blockedReason,
          outputPreview: null,
          outputRedacted: false,
        })
      );

      return {
        ok: false as const,
        status: 403,
        body: {
          success: false,
          error: { code: 'AI_DISABLED', message: 'Copilot is disabled by policy' },
          correlationId: params.correlationId,
        },
      };
    }

    try {
      let claim: ClaimEntity | null = null;
      let docs: DocumentEntity[] = [];

      if (params.contextType === 'claim') {
        claim = await this.claimRepo.findOne({ where: { claimId: params.resourceId } });
        if (!claim) {
          return {
            ok: false as const,
            status: 404,
            body: {
              success: false,
              error: { code: 'NOT_FOUND', message: 'Claim not found' },
              correlationId: params.correlationId,
            },
          };
        }
        docs = await this.docRepo.find({ where: { claimId: params.resourceId } });
      }

      const actions = this.nbaEngine.generateActions({
        contextType: params.contextType,
        resourceId: params.resourceId,
        claim,
        documents: docs,
      });

      // Persist recommended actions for audit and feedback and bind logId
      const loggedActions: NbaAction[] = [];
      for (const action of actions) {
        if (action.actionCode !== 'NO_ACTION_REQUIRED') {
          const entry = await this.nbaEngine.logAction({
            actionId: action.actionId,
            actionCode: action.actionCode,
            contextType: params.contextType,
            resourceId: params.resourceId,
            actorUserId: params.actorUserId,
            tenantId: params.tenantId,
            status: 'recommended',
            payload: action.payload,
            reasonCode: action.reasonCode,
            confidence: action.confidence,
          });
          loggedActions.push({ ...action, logId: entry.logId });
        } else {
          loggedActions.push(action);
        }
      }

      const actionPreviews = loggedActions.map((a) => `${a.actionCode}: ${a.title}`).join(' | ');

      await this.auditRepo.save(
        this.auditRepo.create({
          resourceType: params.contextType,
          resourceId: params.resourceId,
          correlationId: params.correlationId,
          tenantId: params.tenantId || null,
          actorUserId: params.actorUserId || null,
          aiEnabledHeader: policy.aiEnabledHeader,
          policyAllowed: policy.policyAllowed,
          decision: 'allowed',
          blockedReason: null,
          outputPreview: actionPreviews.slice(0, 500),
          outputRedacted: false,
        })
      );

      return {
        ok: true as const,
        status: 200,
        body: {
          success: true,
          data: {
            resourceId: params.resourceId,
            actions: loggedActions,
            count: loggedActions.length,
          },
          correlationId: params.correlationId,
        },
      };
    } catch (e: any) {
      await this.auditRepo.save(
        this.auditRepo.create({
          resourceType: params.contextType,
          resourceId: params.resourceId,
          correlationId: params.correlationId,
          tenantId: params.tenantId || null,
          actorUserId: params.actorUserId || null,
          aiEnabledHeader: policy.aiEnabledHeader,
          policyAllowed: policy.policyAllowed,
          decision: 'blocked',
          blockedReason: 'INTERNAL_ERROR',
          outputPreview: null,
          outputRedacted: false,
        })
      );

      this.logger.error('copilot.next_best_action.failed', e, { correlationId: params.correlationId });
      return {
        ok: false as const,
        status: 500,
        body: {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to generate next best action' },
          correlationId: params.correlationId,
        },
      };
    }
  }

  async ecosystemConsult(params: {
    query: string;
    context?: string;
    contextType?: 'claim' | 'document' | 'policy' | 'complaint';
    correlationId: string;
    tenantId?: string;
    actorUserId?: string;
    headers: Record<string, any>;
  }): Promise<{ ok: boolean; status: number; body: any }> {
    if (!this.ecosystemAi.isEnabled()) {
      return {
        ok: false as const,
        status: 503,
        body: {
          success: false,
          error: { code: 'ECOSYSTEM_AI_DISABLED', message: 'Ecosystem AI is not enabled. Set ECOSYSTEM_AI_ENABLED=true.' },
          correlationId: params.correlationId,
        },
      };
    }

    try {
      const response = await this.ecosystemAi.consult({
        query: params.query,
        context: params.context,
        contextType: params.contextType,
        correlationId: params.correlationId,
        tenantId: params.tenantId,
        userId: params.actorUserId,
      });

      const redacted = this.redactSensitive(response.text);
      const preview = redacted.text.length > 500 ? `${redacted.text.slice(0, 500)}...` : redacted.text;

      await this.auditRepo.save(
        this.auditRepo.create({
          resourceType: params.contextType || 'policy',
          resourceId: 'ecosystem-consult',
          correlationId: params.correlationId,
          tenantId: params.tenantId || null,
          actorUserId: params.actorUserId || null,
          aiEnabledHeader: 'true',
          policyAllowed: true,
          decision: 'allowed',
          blockedReason: null,
          outputPreview: preview,
          outputRedacted: redacted.redacted,
        })
      );

      return {
        ok: true as const,
        status: 200,
        body: {
          success: true,
          data: {
            response: redacted.text,
            model: response.model,
            provider: 'ecosystem',
            citations: response.citations || [],
          },
          correlationId: params.correlationId,
        },
      };
    } catch (error: any) {
      return {
        ok: false as const,
        status: 502,
        body: {
          success: false,
          error: { code: 'ECOSYSTEM_AI_ERROR', message: error.message },
          correlationId: params.correlationId,
        },
      };
    }
  }

  async executeNbaAction(logId: string, actorUserId?: string): Promise<{ ok: true; status: 200; body: any } | { ok: false; status: number; body: any }> {
    try {
      // Fetch the action log to get actionCode and payload
      const actionLog = await this.dataSource.getRepository(NbaActionLog).findOne({ where: { logId } });
      if (!actionLog) {
        return { ok: false as const, status: 404, body: { success: false, error: { code: 'NBA_ACTION_ERROR', message: 'NBA action log not found' } } };
      }

      if (actionLog.status === 'executed') {
        return { ok: false as const, status: 409, body: { success: false, error: { code: 'ALREADY_EXECUTED', message: 'Action already executed' } } };
      }

      if (actionLog.status === 'opted_out') {
        return { ok: false as const, status: 409, body: { success: false, error: { code: 'OPTED_OUT', message: 'Action was opted out' } } };
      }

      // Execute downstream service call based on action code
      const downstreamResult = await this.executeNbaDownstreamCall(actionLog.actionCode, actionLog.payload, actorUserId);

      const entry = await this.nbaEngine.markExecuted(logId);
      this.logger.info(`NBA action executed: ${logId} by ${actorUserId || 'system'}, actionCode: ${actionLog.actionCode}, downstreamResult: ${JSON.stringify(downstreamResult)}`);
      return {
        ok: true as const,
        status: 200,
        body: { success: true, data: { logId, status: entry.status, executedAt: entry.updatedAt, actionCode: actionLog.actionCode, downstreamResult } },
      };
    } catch (e: any) {
      return { ok: false as const, status: e.message === 'NBA action log not found' ? 404 : 500, body: { success: false, error: { code: 'NBA_ACTION_ERROR', message: e.message } } };
    }
  }

  private async executeNbaDownstreamCall(actionCode: string, payload: any, actorUserId?: string): Promise<{ executed: boolean; service?: string; result?: any; error?: string }> {
    const claimUrl = process.env.CLAIM_SERVICE_URL || 'http://localhost:18020';
    const billingUrl = process.env.BILLING_SERVICE_URL || 'http://localhost:18030';
    const notificationUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:18040';

    try {
      switch (actionCode) {
        case 'CLAIM_ASSIGN_ADJUSTER': {
          const claimId = payload?.claimId;
          if (!claimId) return { executed: false, error: 'Missing claimId in payload' };
          const result = await this.httpPostJson(
            `${claimUrl}/api/v1/claims/${claimId}/assign-adjuster`,
            { reason: 'NBA: AMOUNT_DISCREPANCY', assignedBy: actorUserId || 'nba-engine' },
          );
          return { executed: true, service: 'claim-service', result };
        }

        case 'CLAIM_REQUEST_DOCUMENTS': {
          const claimId = payload?.claimId;
          if (!claimId) return { executed: false, error: 'Missing claimId in payload' };
          const result = await this.httpPostJson(
            `${notificationUrl}/api/v1/notifications/send`,
            {
              channel: 'SMS',
              recipientType: 'customer',
              claimId,
              template: 'CLAIM_DOCUMENT_REQUEST',
              templateVars: { claimId },
            },
          );
          return { executed: true, service: 'notification-service', result };
        }

        case 'CLAIM_SCHEDULE_PAYMENT': {
          const claimId = payload?.claimId;
          const approvedAmount = payload?.approvedAmount;
          if (!claimId) return { executed: false, error: 'Missing claimId in payload' };
          const result = await this.httpPostJson(
            `${billingUrl}/api/v1/payments/schedule`,
            {
              claimId,
              amount: approvedAmount,
              paymentType: 'CLAIM_PAYOUT',
              scheduledBy: actorUserId || 'nba-engine',
            },
          );
          return { executed: true, service: 'billing-service', result };
        }

        case 'CLAIM_RECOVERY_REVIEW': {
          const claimId = payload?.claimId;
          if (!claimId) return { executed: false, error: 'Missing claimId in payload' };
          const result = await this.httpPostJson(
            `${claimUrl}/api/v1/claims/${claimId}/recovery-review`,
            { initiatedBy: actorUserId || 'nba-engine', reason: 'NBA: THIRD_PARTY_RECOVERY' },
          );
          return { executed: true, service: 'claim-service', result };
        }

        case 'NO_ACTION_REQUIRED':
          return { executed: true, result: 'No downstream action needed' };

        default:
          this.logger.warn(`Unknown NBA action code: ${actionCode}`);
          return { executed: false, error: `Unknown action code: ${actionCode}` };
      }
    } catch (err: any) {
      this.logger.error(`NBA downstream call failed for ${actionCode}: ${err.message}`);
      return { executed: false, error: err.message };
    }
  }

  async optOutNbaAction(logId: string, reason?: string): Promise<{ ok: true; status: 200; body: any } | { ok: false; status: number; body: any }> {
    try {
      const entry = await this.nbaEngine.markOptedOut(logId, reason);
      this.logger.info(`NBA action opted out: ${logId}, reason: ${reason || 'none'}`);
      return {
        ok: true as const,
        status: 200,
        body: { success: true, data: { logId, status: entry.status, optOutReason: entry.optOutReason, optedOutAt: entry.updatedAt } },
      };
    } catch (e: any) {
      return { ok: false as const, status: e.message === 'NBA action log not found' ? 404 : 500, body: { success: false, error: { code: 'NBA_ACTION_ERROR', message: e.message } } };
    }
  }

  async listNbaActionLogs(params: {
    contextType?: string;
    resourceId?: string;
    actorUserId?: string;
    tenantId?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.nbaEngine.listActions(params);
  }
}
