import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { AmlConsent, type AmlConsentStatus } from './entities/AmlConsent';
import { AmlRule, type AmlRuleStatus } from './entities/AmlRule';
import { AmlAlert, type AmlAlertStatus } from './entities/AmlAlert';
import { AmlAlertDecision } from './entities/AmlAlertDecision';
import { ExternalDataSource } from './entities/ExternalDataSource';
import { OutboxPublisher } from '@insurance/shared';

function clampInt(v: any, def: number, min: number, max: number): number {
  const n = parseInt(String(v ?? def), 10);
  if (Number.isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

@Injectable()
export class AmlService {
  private readonly logger = new Logger(AmlService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(AmlConsent) private readonly consentsRepo: Repository<AmlConsent>,
    @InjectRepository(AmlRule) private readonly rulesRepo: Repository<AmlRule>,
    @InjectRepository(AmlAlert) private readonly alertsRepo: Repository<AmlAlert>,
    @InjectRepository(AmlAlertDecision) private readonly alertDecisionsRepo: Repository<AmlAlertDecision>,
    @InjectRepository(ExternalDataSource) private readonly externalDataSourceRepo: Repository<ExternalDataSource>
  ) {}

  normalizePaging(limit: any, offset: any): { limit: number; offset: number } {
    return { limit: clampInt(limit, 50, 1, 200), offset: clampInt(offset, 0, 0, 1000000) };
  }

  private encryptPii(value: string): string {
    const key = process.env.FIELD_ENCRYPTION_KEY || 'default-encryption-key-32b';
    const keyBuf = Buffer.from(key.padEnd(32, '0').substring(0, 32), 'utf8');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuf, iv);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decryptPii(value: string): string {
    const key = process.env.FIELD_ENCRYPTION_KEY || 'default-encryption-key-32b';
    const keyBuf = Buffer.from(key.padEnd(32, '0').substring(0, 32), 'utf8');
    const parts = value.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuf, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async createConsent(params: {
    subjectNationalId: string;
    consentType: string;
    validFrom?: Date | null;
    validTo?: Date | null;
    notes?: string | null;
    createdBy?: string | null;
  }): Promise<AmlConsent> {
    const subjectNationalId = (params.subjectNationalId || '').trim();
    const consentType = (params.consentType || '').trim();
    if (!subjectNationalId || !consentType) {
      throw new BadRequestException({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'subjectNationalId and consentType are required' },
      });
    }

    const encryptedNationalId = this.encryptPii(subjectNationalId);

    return await this.dataSource.transaction(async (manager) => {
      const c = manager.create(AmlConsent, {
        consentId: uuidv4(),
        subjectNationalId: encryptedNationalId,
        consentType,
        status: 'active',
        validFrom: params.validFrom ?? null,
        validTo: params.validTo ?? null,
        notes: params.notes ?? null,
        createdBy: params.createdBy ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await manager.save(c);
      return c;
    });
  }

  async getConsent(consentId: string): Promise<AmlConsent | null> {
    return await this.consentsRepo.findOne({ where: { consentId } });
  }

  async listConsents(params: {
    subjectNationalId?: string;
    status?: AmlConsentStatus;
    consentType?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: AmlConsent[]; total: number }> {
    const qb = this.consentsRepo.createQueryBuilder('c');
    if (params.subjectNationalId) qb.andWhere('c.subject_national_id = :nid', { nid: params.subjectNationalId });
    if (params.status) qb.andWhere('c.status = :status', { status: params.status });
    if (params.consentType) qb.andWhere('c.consent_type = :consentType', { consentType: params.consentType });
    qb.orderBy('c.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async revokeConsent(params: { consentId: string; reason?: string | null }): Promise<AmlConsent> {
    return await this.dataSource.transaction(async (manager) => {
      const c = await manager.findOne(AmlConsent, { where: { consentId: params.consentId } });
      if (!c) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Consent not found' } });

      if (c.status !== 'revoked') {
        c.status = 'revoked';
        if (params.reason !== undefined) c.notes = params.reason ?? null;
        c.updatedAt = new Date();
        await manager.save(c);
      }

      return c;
    });
  }

  async createRule(params: {
    ruleName: string;
    ruleType: string;
    expression: string;
    severity?: AmlRule['severity'];
    description?: string | null;
    status?: AmlRuleStatus;
    createdBy?: string | null;
  }): Promise<AmlRule> {
    const ruleName = (params.ruleName || '').trim();
    const ruleType = (params.ruleType || '').trim();
    const expression = (params.expression || '').trim();
    if (!ruleName || !ruleType || !expression) {
      throw new BadRequestException({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'ruleName, ruleType and expression are required' },
      });
    }

    const existing = await this.rulesRepo.findOne({ where: { ruleName } });
    if (existing) {
      throw new BadRequestException({ success: false, error: { code: 'DUPLICATE', message: 'ruleName already exists' } });
    }

    const r = this.rulesRepo.create({
      ruleId: uuidv4(),
      ruleName,
      ruleType,
      status: params.status ?? 'enabled',
      severity: params.severity ?? 'medium',
      expression,
      description: params.description ?? null,
      createdBy: params.createdBy ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.rulesRepo.save(r);
    return r;
  }

  async getRule(ruleId: string): Promise<AmlRule | null> {
    return await this.rulesRepo.findOne({ where: { ruleId } });
  }

  async listRules(params: {
    status?: AmlRuleStatus;
    ruleType?: string;
    severity?: AmlRule['severity'];
    q?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: AmlRule[]; total: number }> {
    const qb = this.rulesRepo.createQueryBuilder('r');
    if (params.status) qb.andWhere('r.status = :status', { status: params.status });
    if (params.ruleType) qb.andWhere('r.rule_type = :ruleType', { ruleType: params.ruleType });
    if (params.severity) qb.andWhere('r.severity = :severity', { severity: params.severity });
    if (params.q) qb.andWhere('(r.rule_name ILIKE :q OR r.rule_type ILIKE :q OR r.expression ILIKE :q)', { q: `%${params.q}%` });
    qb.orderBy('r.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async updateRule(params: {
    ruleId: string;
    ruleName?: string;
    ruleType?: string;
    expression?: string;
    severity?: AmlRule['severity'];
    description?: string | null;
    status?: AmlRuleStatus;
  }): Promise<AmlRule> {
    const r = await this.getRule(params.ruleId);
    if (!r) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Rule not found' } });

    if (params.ruleName !== undefined) {
      const ruleName = (params.ruleName || '').trim();
      if (!ruleName) throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'ruleName cannot be empty' } });
      if (ruleName !== r.ruleName) {
        const existing = await this.rulesRepo.findOne({ where: { ruleName } });
        if (existing) throw new BadRequestException({ success: false, error: { code: 'DUPLICATE', message: 'ruleName already exists' } });
        r.ruleName = ruleName;
      }
    }

    if (params.ruleType !== undefined) {
      const ruleType = (params.ruleType || '').trim();
      if (!ruleType) throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'ruleType cannot be empty' } });
      r.ruleType = ruleType;
    }

    if (params.expression !== undefined) {
      const expression = (params.expression || '').trim();
      if (!expression) throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'expression cannot be empty' } });
      r.expression = expression;
    }

    if (params.severity !== undefined) r.severity = params.severity;
    if (params.status !== undefined) r.status = params.status;
    if (params.description !== undefined) r.description = params.description ?? null;

    r.updatedAt = new Date();
    await this.rulesRepo.save(r);
    return r;
  }

  async evaluateTransaction(params: {
    partyId: string;
    partyName: string;
    transactionType: string;
    amount: number;
    currency: string;
    referenceType?: string;
    referenceId?: string;
    metadata?: Record<string, any>;
    correlationId?: string;
  }): Promise<{ alerts: AmlAlert[]; riskLevel: 'low' | 'medium' | 'high' | 'critical'; riskScore: number }> {
    const enabledRules = await this.rulesRepo.find({ where: { status: 'enabled' as any } });
    const matchedRules: Array<{ rule: AmlRule; matched: boolean }> = [];
    const context = {
      partyId: params.partyId,
      partyName: params.partyName,
      transactionType: params.transactionType,
      amount: params.amount,
      currency: params.currency,
      referenceType: params.referenceType || null,
      referenceId: params.referenceId || null,
      metadata: params.metadata || {},
    };

    for (const rule of enabledRules) {
      const matched = this.evaluateRuleExpression(rule.expression, context);
      matchedRules.push({ rule, matched });
    }

    const triggeredRules = matchedRules.filter(r => r.matched).map(r => r.rule);
    const alerts: AmlAlert[] = [];

    await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      for (const rule of triggeredRules) {
        const alert = manager.create(AmlAlert, {
          alertId: uuidv4(),
          partyId: params.partyId,
          partyName: params.partyName,
          transactionType: params.transactionType,
          amount: params.amount,
          currency: params.currency,
          status: 'open',
          riskLevel: rule.severity,
          riskScore: this.calculateRiskScore(rule.severity),
          matchedRules: [rule.ruleId],
          reason: `AML rule triggered: ${rule.ruleName}`,
          referenceType: params.referenceType || null,
          referenceId: params.referenceId || null,
          title: `AML Alert: ${rule.ruleName}`,
          escalatedAt: null,
          resolvedAt: null,
          resolution: null,
          metadata: {
            ...params.metadata,
            triggeredByRule: rule.ruleId,
            ruleExpression: rule.expression,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await manager.save(alert);
        alerts.push(alert);

        await outbox.publish({
          topic: 'insurance.aml.alert.created',
          eventType: 'AmlAlertCreated',
          eventVersion: 1,
          correlationId: params.correlationId || uuidv4(),
          subject: { alertId: alert.alertId, partyId: params.partyId },
          payload: {
            alertId: alert.alertId,
            partyId: params.partyId,
            partyName: params.partyName,
            transactionType: params.transactionType,
            amount: params.amount,
            currency: params.currency,
            riskLevel: rule.severity,
            riskScore: alert.riskScore,
            reason: alert.reason,
            referenceType: alert.referenceType,
            referenceId: alert.referenceId,
            status: 'open',
            createdAt: alert.createdAt?.toISOString?.() ?? new Date().toISOString(),
          },
        });
      }
    });

    const riskLevel = this.determineOverallRiskLevel(triggeredRules);
    const riskScore = this.calculateOverallRiskScore(triggeredRules);

    return { alerts, riskLevel, riskScore };
  }

  private evaluateRuleExpression(expression: string, context: Record<string, any>): boolean {
    try {
      const safeEval = new Function('ctx', `
        try {
          const { partyId, partyName, transactionType, amount, currency, referenceType, referenceId, metadata } = ctx;
          return ${expression};
        } catch (e) {
          return false;
        }
      `);
      return safeEval(context) === true;
    } catch (e) {
      return false;
    }
  }

  private calculateRiskScore(severity: 'low' | 'medium' | 'high' | 'critical'): number {
    const scores = { low: 25, medium: 50, high: 75, critical: 100 };
    return scores[severity] || 0;
  }

  private determineOverallRiskLevel(rules: AmlRule[]): 'low' | 'medium' | 'high' | 'critical' {
    if (rules.length === 0) return 'low';
    const severities = rules.map(r => r.severity);
    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'high';
    if (severities.includes('medium')) return 'medium';
    return 'low';
  }

  private calculateOverallRiskScore(rules: AmlRule[]): number {
    if (rules.length === 0) return 0;
    const scores = rules.map(r => this.calculateRiskScore(r.severity));
    return Math.max(...scores);
  }

  private isValidAlertTransition(from: AmlAlertStatus, to: AmlAlertStatus): boolean {
    if (from === to) return true;
    const allowed: Record<AmlAlertStatus, AmlAlertStatus[]> = {
      open: ['in_review', 'cleared', 'escalated', 'closed'],
      in_review: ['cleared', 'escalated', 'closed'],
      cleared: ['closed'],
      escalated: ['in_review', 'closed'],
      closed: [],
    };
    return (allowed[from] || []).includes(to);
  }

  async createAlert(params: {
    title: string;
    subjectNationalId?: string | null;
    ruleId?: string | null;
    severity?: AmlAlert['severity'];
    details?: any | null;
    createdBy?: string | null;
  }): Promise<AmlAlert> {
    const title = (params.title || '').trim();
    if (!title) throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'title is required' } });

    if (params.ruleId) {
      const r = await this.getRule(params.ruleId);
      if (!r) throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'ruleId is invalid' } });
    }

    const encryptedNationalId = params.subjectNationalId ? this.encryptPii(params.subjectNationalId) : null;

    return await this.dataSource.transaction(async (manager) => {
      const a = manager.create(AmlAlert, {
        alertId: uuidv4(),
        title,
        subjectNationalId: encryptedNationalId,
        ruleId: params.ruleId ?? null,
        status: 'open',
        severity: params.severity ?? 'medium',
        details: params.details ?? null,
        assignedTo: null,
        createdBy: params.createdBy ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await manager.save(a);
      return a;
    });
  }

  async getAlert(alertId: string): Promise<AmlAlert | null> {
    return await this.alertsRepo.findOne({ where: { alertId } });
  }

  async listAlerts(params: {
    status?: AmlAlertStatus;
    severity?: AmlAlert['severity'];
    subjectNationalId?: string;
    ruleId?: string;
    assignedTo?: string;
    q?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: AmlAlert[]; total: number }> {
    const qb = this.alertsRepo.createQueryBuilder('a');
    if (params.status) qb.andWhere('a.status = :status', { status: params.status });
    if (params.severity) qb.andWhere('a.severity = :severity', { severity: params.severity });
    if (params.subjectNationalId) qb.andWhere('a.subject_national_id = :nid', { nid: params.subjectNationalId });
    if (params.ruleId) qb.andWhere('a.rule_id = :ruleId', { ruleId: params.ruleId });
    if (params.assignedTo) qb.andWhere('a.assigned_to = :assignedTo', { assignedTo: params.assignedTo });
    if (params.q) qb.andWhere('(a.title ILIKE :q)', { q: `%${params.q}%` });

    qb.orderBy('a.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async assignAlert(params: { alertId: string; assignedTo: string | null }): Promise<AmlAlert> {
    return await this.dataSource.transaction(async (manager) => {
      const a = await manager.findOne(AmlAlert, { where: { alertId: params.alertId } });
      if (!a) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Alert not found' } });
      a.assignedTo = params.assignedTo;
      a.updatedAt = new Date();
      await manager.save(a);
      return a;
    });
  }

  async updateAlertStatus(params: { alertId: string; status: AmlAlertStatus; decidedBy?: string | null; notes?: string | null }): Promise<AmlAlert> {
    return await this.dataSource.transaction(async (manager) => {
      const a = await manager.findOne(AmlAlert, { where: { alertId: params.alertId } });
      if (!a) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Alert not found' } });
      if (!this.isValidAlertTransition(a.status, params.status)) {
        throw new BadRequestException({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: `invalid status transition ${a.status} -> ${params.status}` },
        });
      }

      const fromStatus = a.status;
      a.status = params.status;
      a.updatedAt = new Date();
      await manager.save(a);

      const decision = manager.create(AmlAlertDecision, {
        decisionId: uuidv4(),
        alertId: a.alertId,
        fromStatus,
        toStatus: params.status,
        notes: params.notes ?? null,
        snapshot: {
          alert: {
            alertId: a.alertId,
            subjectNationalId: a.subjectNationalId,
            ruleId: a.ruleId,
            severity: a.severity,
            title: a.title,
            details: a.details,
          },
        },
        decidedBy: params.decidedBy ?? null,
        createdAt: new Date(),
      });
      await manager.save(decision);

      return a;
    });
  }

  async getDashboard(params: { now: Date }): Promise<{
    totalsByStatus: Array<{ status: AmlAlertStatus; total: number }>;
    totalsBySeverity: Array<{ severity: AmlAlert['severity']; total: number }>;
    openUnassigned: number;
  }> {
    const totalsByStatusRaw = await this.alertsRepo
      .createQueryBuilder('a')
      .select('a.status', 'status')
      .addSelect('COUNT(*)', 'total')
      .groupBy('a.status')
      .getRawMany();

    const totalsBySeverityRaw = await this.alertsRepo
      .createQueryBuilder('a')
      .select('a.severity', 'severity')
      .addSelect('COUNT(*)', 'total')
      .groupBy('a.severity')
      .getRawMany();

    const openUnassigned = await this.alertsRepo
      .createQueryBuilder('a')
      .where('a.status IN (:...statuses)', { statuses: ['open', 'in_review', 'escalated'] })
      .andWhere('a.assigned_to IS NULL')
      .getCount();

    return {
      totalsByStatus: totalsByStatusRaw.map((r: any) => ({ status: r.status as AmlAlertStatus, total: parseInt(r.total, 10) || 0 })),
      totalsBySeverity: totalsBySeverityRaw.map((r: any) => ({ severity: r.severity as any, total: parseInt(r.total, 10) || 0 })),
      openUnassigned,
    };
  }

  async exportSnapshot(params: {
    consentsLimit: number;
    rulesLimit: number;
    alertsLimit: number;
  }): Promise<{
    consents: AmlConsent[];
    rules: AmlRule[];
    alerts: AmlAlert[];
  }> {
    const consentsLimit = clampInt(params.consentsLimit, 200, 1, 2000);
    const rulesLimit = clampInt(params.rulesLimit, 200, 1, 2000);
    const alertsLimit = clampInt(params.alertsLimit, 200, 1, 2000);

    const [consents, rules, alerts] = await Promise.all([
      this.consentsRepo.find({ order: { createdAt: 'DESC' }, take: consentsLimit }),
      this.rulesRepo.find({ order: { createdAt: 'DESC' }, take: rulesLimit }),
      this.alertsRepo.find({ order: { createdAt: 'DESC' }, take: alertsLimit }),
    ]);

    return { consents, rules, alerts };
  }

  // External data source methods
  async createExternalDataSource(params: {
    sourceName: string;
    sourceType: ExternalDataSource['sourceType'];
    connectionConfig: any;
    syncFrequencyMinutes?: number;
    createdBy?: string;
  }): Promise<ExternalDataSource> {
    const source = this.externalDataSourceRepo.create({
      sourceId: uuidv4(),
      sourceName: params.sourceName,
      sourceType: params.sourceType,
      connectionConfig: params.connectionConfig,
      status: 'inactive',
      lastSyncAt: null,
      lastSyncStatus: null,
      lastSyncError: null,
      syncFrequencyMinutes: params.syncFrequencyMinutes || null,
      totalRecordsSynced: 0,
      metadata: null,
      createdBy: params.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.externalDataSourceRepo.save(source);
    this.logger.log(`External data source created: ${source.sourceId}`);

    return source;
  }

  async updateExternalDataSource(
    sourceId: string,
    params: {
      sourceName?: string;
      connectionConfig?: any;
      syncFrequencyMinutes?: number;
      status?: ExternalDataSource['status'];
    }
  ): Promise<ExternalDataSource | null> {
    const source = await this.externalDataSourceRepo.findOne({ where: { sourceId } });
    if (!source) return null;

    if (params.sourceName !== undefined) source.sourceName = params.sourceName;
    if (params.connectionConfig !== undefined) source.connectionConfig = params.connectionConfig;
    if (params.syncFrequencyMinutes !== undefined) source.syncFrequencyMinutes = params.syncFrequencyMinutes;
    if (params.status !== undefined) source.status = params.status;
    source.updatedAt = new Date();

    await this.externalDataSourceRepo.save(source);
    this.logger.log(`External data source updated: ${sourceId}`);

    return source;
  }

  async getExternalDataSource(sourceId: string): Promise<ExternalDataSource | null> {
    return this.externalDataSourceRepo.findOne({ where: { sourceId } });
  }

  async listExternalDataSources(params: {
    sourceType?: ExternalDataSource['sourceType'];
    status?: ExternalDataSource['status'];
    limit: number;
    offset: number;
  }): Promise<{ rows: ExternalDataSource[]; total: number }> {
    const qb = this.externalDataSourceRepo.createQueryBuilder('s');
    if (params.sourceType) qb.andWhere('s.source_type = :sourceType', { sourceType: params.sourceType });
    if (params.status) qb.andWhere('s.status = :status', { status: params.status });
    qb.orderBy('s.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async deleteExternalDataSource(sourceId: string): Promise<boolean> {
    const result = await this.externalDataSourceRepo.delete({ sourceId });
    if (result.affected && result.affected > 0) {
      this.logger.log(`External data source deleted: ${sourceId}`);
      return true;
    }
    return false;
  }

  async syncExternalDataSource(sourceId: string): Promise<{
    success: boolean;
    syncedRecords?: number;
    totalRecordsSynced?: number;
    error?: string;
  }> {
    const source = await this.externalDataSourceRepo.findOne({ where: { sourceId } });
    if (!source) {
      return { success: false, error: 'Data source not found' };
    }

    source.status = 'syncing';
    source.lastSyncAt = new Date();
    await this.externalDataSourceRepo.save(source);

    try {
      let syncedRecords = 0;
      const config = source.connectionConfig || {};

      // Call the external data source endpoint if configured
      const endpoint = config.endpoint as string | undefined;
      const apiKey = config.apiKey as string | undefined;

      if (endpoint) {
        try {
          const headers: Record<string, string> = { 'content-type': 'application/json' };
          if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

          const response = await fetch(`${endpoint}/sync`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ sourceType: source.sourceType, sourceName: source.sourceName }),
          });

          if (!response.ok) {
            throw new Error(`External source returned ${response.status}`);
          }

          const result: any = await response.json().catch(() => ({}));
          syncedRecords = typeof result.syncedRecords === 'number' ? result.syncedRecords : 0;
        } catch (error: any) {
          this.logger.error(`Failed to sync external source ${source.sourceName}: ${error.message}`);
          throw error;
        }
      }

      source.status = 'active';
      source.lastSyncStatus = 'success';
      source.lastSyncError = null;
      source.totalRecordsSynced += syncedRecords;
      source.updatedAt = new Date();
      await this.externalDataSourceRepo.save(source);

      this.logger.log(`Synced ${syncedRecords} records from external source ${source.sourceName}`);

      return { success: true, syncedRecords, totalRecordsSynced: source.totalRecordsSynced };
    } catch (error: any) {
      source.status = 'error';
      source.lastSyncStatus = 'failed';
      source.lastSyncError = error.message || 'Unknown error';
      source.updatedAt = new Date();
      await this.externalDataSourceRepo.save(source);

      this.logger.error(`Failed to sync external source ${source.sourceName}: ${error.message}`);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  async queryExternalDataSource(sourceId: string, params: {
    nationalId?: string;
    name?: string;
    limit?: number;
  }): Promise<{
    success: boolean;
    results?: any[];
    error?: string;
  }> {
    const source = await this.externalDataSourceRepo.findOne({ where: { sourceId } });
    if (!source) {
      return { success: false, error: 'Data source not found' };
    }

    if (source.status !== 'active') {
      return { success: false, error: 'Data source is not active' };
    }

    try {
      const config = source.connectionConfig || {};
      const endpoint = config.endpoint as string | undefined;
      const apiKey = config.apiKey as string | undefined;
      const limit = params.limit || 10;

      if (endpoint) {
        const headers: Record<string, string> = { 'content-type': 'application/json' };
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

        const queryParams = new URLSearchParams();
        queryParams.set('limit', String(limit));
        if (params.nationalId) queryParams.set('nationalId', params.nationalId);
        if (params.name) queryParams.set('name', params.name);

        const response = await fetch(`${endpoint}/query?${queryParams.toString()}`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          throw new Error(`External source returned ${response.status}`);
        }

        const result: any = await response.json().catch(() => ({}));
        return { success: true, results: result.results || [] };
      }

      // No endpoint configured; return empty results
      return { success: true, results: [] };
    } catch (error: any) {
      this.logger.error(`Failed to query external source ${source.sourceName}: ${error.message}`);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  // Official AML report generation
  async generateOfficialReport(params: {
    reportType: 'suspicious_activity' | 'currency_transaction' | 'annual_summary';
    startDate: Date;
    endDate: Date;
    generatedBy?: string;
  }): Promise<{
    success: boolean;
    reportId?: string;
    reportData?: any;
    error?: string;
  }> {
    const reportId = uuidv4();
    const generatedAt = new Date();

    try {
      let reportData: any = {
        reportId,
        reportType: params.reportType,
        reportPeriod: {
          startDate: params.startDate.toISOString(),
          endDate: params.endDate.toISOString(),
        },
        generatedAt: generatedAt.toISOString(),
        generatedBy: params.generatedBy || null,
        organizationInfo: {
          name: process.env.ORGANIZATION_NAME || 'Insurance Company',
          registrationNumber: process.env.ORGANIZATION_REGISTRATION_NUMBER || 'N/A',
          address: process.env.ORGANIZATION_ADDRESS || 'N/A',
        },
      };

      if (params.reportType === 'suspicious_activity') {
        // Generate SAR (Suspicious Activity Report)
        const alerts = await this.alertsRepo
          .createQueryBuilder('a')
          .where('a.created_at >= :startDate', { startDate: params.startDate })
          .andWhere('a.created_at <= :endDate', { endDate: params.endDate })
          .andWhere('a.severity IN (:...severities)', { severities: ['high', 'critical'] })
          .orderBy('a.created_at', 'DESC')
          .getMany();

        reportData.suspiciousActivities = alerts.map(alert => ({
          alertId: alert.alertId,
          subjectNationalId: alert.subjectNationalId,
          ruleId: alert.ruleId,
          severity: alert.severity,
          status: alert.status,
          createdAt: alert.createdAt?.toISOString(),
          details: alert.details,
        }));

        reportData.summary = {
          totalActivities: alerts.length,
          bySeverity: {
            high: alerts.filter(a => a.severity === 'high').length,
            critical: alerts.filter(a => a.severity === 'critical').length,
          },
          byStatus: {
            open: alerts.filter(a => a.status === 'open').length,
            in_review: alerts.filter(a => a.status === 'in_review').length,
            escalated: alerts.filter(a => a.status === 'escalated').length,
            closed: alerts.filter(a => a.status === 'closed').length,
          },
        };
      } else if (params.reportType === 'currency_transaction') {
        // Generate CTR (Currency Transaction Report)
        // This would typically query transaction records above a threshold
        reportData.currencyTransactions = [];
        reportData.summary = {
          totalTransactions: 0,
          totalAmount: 0,
          currency: 'IRR',
        };
      } else if (params.reportType === 'annual_summary') {
        // Generate Annual AML Summary Report
        const totalAlerts = await this.alertsRepo
          .createQueryBuilder('a')
          .where('a.created_at >= :startDate', { startDate: params.startDate })
          .andWhere('a.created_at <= :endDate', { endDate: params.endDate })
          .getCount();

        const totalConsents = await this.consentsRepo
          .createQueryBuilder('c')
          .where('c.created_at >= :startDate', { startDate: params.startDate })
          .andWhere('c.created_at <= :endDate', { endDate: params.endDate })
          .getCount();

        const totalRules = await this.rulesRepo.count();

        reportData.annualSummary = {
          totalAlerts,
          totalConsents,
          totalRules,
          alertsBySeverity: await this.getAlertsBySeverity(params.startDate, params.endDate),
          alertsByStatus: await this.getAlertsByStatus(params.startDate, params.endDate),
        };
      }

      this.logger.log(`Official AML report generated: ${reportId} (${params.reportType})`);

      return { success: true, reportId, reportData };
    } catch (error: any) {
      this.logger.error(`Failed to generate official AML report: ${error.message}`);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  private async getAlertsBySeverity(startDate: Date, endDate: Date): Promise<any> {
    const raw = await this.alertsRepo
      .createQueryBuilder('a')
      .select('a.severity', 'severity')
      .addSelect('COUNT(*)', 'total')
      .where('a.created_at >= :startDate', { startDate })
      .andWhere('a.created_at <= :endDate', { endDate })
      .groupBy('a.severity')
      .getRawMany();

    return raw.map((r: any) => ({ severity: r.severity, total: parseInt(r.total, 10) || 0 }));
  }

  private async getAlertsByStatus(startDate: Date, endDate: Date): Promise<any> {
    const raw = await this.alertsRepo
      .createQueryBuilder('a')
      .select('a.status', 'status')
      .addSelect('COUNT(*)', 'total')
      .where('a.created_at >= :startDate', { startDate })
      .andWhere('a.created_at <= :endDate', { endDate })
      .groupBy('a.status')
      .getRawMany();

    return raw.map((r: any) => ({ status: r.status, total: parseInt(r.total, 10) || 0 }));
  }
}
