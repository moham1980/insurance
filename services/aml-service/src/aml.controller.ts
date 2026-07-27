import { Body, Controller, Get, Headers, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { auditLogger } from './audit.logger';
import { AmlService } from './aml.service';
import type { AmlConsentStatus } from './entities/AmlConsent';
import type { AmlRuleStatus } from './entities/AmlRule';
import type { AmlAlertStatus } from './entities/AmlAlert';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';

@Controller()
export class AmlController {
  constructor(private readonly amlService: AmlService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  @Get('/health')
  health() {
    return { status: 'ok', service: 'aml-service' };
  }

  @Post('/aml/consents')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('aml:consents:create')
  async createConsent(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('aml.consents.create.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'aml:consents:create',
    });

    const c = await this.amlService.createConsent({
      subjectNationalId: body?.subjectNationalId,
      consentType: body?.consentType,
      validFrom: body?.validFrom ? new Date(body.validFrom) : null,
      validTo: body?.validTo ? new Date(body.validTo) : null,
      notes: body?.notes,
      createdBy: actor?.userId,
    });

    return { success: true, data: c, correlationId };
  }

  @Get('/aml/consents/:consentId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('aml:consents:view')
  async getConsent(@Headers() headers: Record<string, any>, @Param('consentId') consentId: string) {
    const correlationId = this.getCorrelationId(headers);
    const c = await this.amlService.getConsent(consentId);
    if (!c) return { success: false, error: { code: 'NOT_FOUND', message: 'Consent not found' }, correlationId };
    return { success: true, data: c, correlationId };
  }

  @Get('/aml/consents')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('aml:consents:list')
  async listConsents(
    @Headers() headers: Record<string, any>,
    @Query('subjectNationalId') subjectNationalId?: string,
    @Query('status') status?: AmlConsentStatus,
    @Query('consentType') consentType?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const paging = this.amlService.normalizePaging(limit, offset);
    const out = await this.amlService.listConsents({
      subjectNationalId,
      status,
      consentType,
      limit: paging.limit,
      offset: paging.offset,
    });
    return { success: true, data: out, correlationId };
  }

  @Get('/aml/dashboard')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('aml:dashboard')
  async dashboard(@Req() req: any, @Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('aml.dashboard.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'aml:dashboard',
    });

    const data = await this.amlService.getDashboard({ now: new Date() });
    return { success: true, data, correlationId };
  }

  @Patch('/aml/consents/:consentId/revoke')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('aml:consents:revoke')
  async revokeConsent(@Headers() headers: Record<string, any>, @Param('consentId') consentId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const c = await this.amlService.revokeConsent({ consentId, reason: body?.reason ?? null });
    return { success: true, data: c, correlationId };
  }

  @Post('/aml/rules')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('aml:rules:manage')
  async createRule(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('aml.rules.create.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'aml:rules:manage',
    });

    const r = await this.amlService.createRule({
      ruleName: body?.ruleName,
      ruleType: body?.ruleType,
      expression: body?.expression,
      severity: body?.severity,
      description: body?.description,
      status: body?.status,
      createdBy: actor?.userId,
    });

    return { success: true, data: r, correlationId };
  }

  @Get('/aml/rules/:ruleId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('aml:rules:view')
  async getRule(@Headers() headers: Record<string, any>, @Param('ruleId') ruleId: string) {
    const correlationId = this.getCorrelationId(headers);
    const r = await this.amlService.getRule(ruleId);
    if (!r) return { success: false, error: { code: 'NOT_FOUND', message: 'Rule not found' }, correlationId };
    return { success: true, data: r, correlationId };
  }

  @Get('/aml/rules')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('aml:rules:list')
  async listRules(
    @Headers() headers: Record<string, any>,
    @Query('status') status?: AmlRuleStatus,
    @Query('ruleType') ruleType?: string,
    @Query('severity') severity?: any,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const paging = this.amlService.normalizePaging(limit, offset);
    const out = await this.amlService.listRules({
      status,
      ruleType,
      severity,
      q,
      limit: paging.limit,
      offset: paging.offset,
    });
    return { success: true, data: out, correlationId };
  }

  @Patch('/aml/rules/:ruleId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('aml:rules:manage')
  async updateRule(@Headers() headers: Record<string, any>, @Param('ruleId') ruleId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const r = await this.amlService.updateRule({
      ruleId,
      ruleName: body?.ruleName,
      ruleType: body?.ruleType,
      expression: body?.expression,
      severity: body?.severity,
      description: body?.description,
      status: body?.status,
    });
    return { success: true, data: r, correlationId };
  }

  @Post('/aml/alerts')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('aml:alerts:create')
  async createAlert(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('aml.alerts.create.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'aml:alerts:create',
    });

    const a = await this.amlService.createAlert({
      title: body?.title,
      subjectNationalId: body?.subjectNationalId,
      ruleId: body?.ruleId,
      severity: body?.severity,
      details: body?.details,
      createdBy: actor?.userId,
    });

    return { success: true, data: a, correlationId };
  }

  @Get('/aml/alerts/:alertId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('aml:alerts:view')
  async getAlert(@Headers() headers: Record<string, any>, @Param('alertId') alertId: string) {
    const correlationId = this.getCorrelationId(headers);
    const a = await this.amlService.getAlert(alertId);
    if (!a) return { success: false, error: { code: 'NOT_FOUND', message: 'Alert not found' }, correlationId };
    return { success: true, data: a, correlationId };
  }

  @Get('/aml/alerts')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('aml:alerts:list')
  async listAlerts(
    @Headers() headers: Record<string, any>,
    @Query('status') status?: AmlAlertStatus,
    @Query('severity') severity?: any,
    @Query('subjectNationalId') subjectNationalId?: string,
    @Query('ruleId') ruleId?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const paging = this.amlService.normalizePaging(limit, offset);
    const out = await this.amlService.listAlerts({
      status,
      severity,
      subjectNationalId,
      ruleId,
      assignedTo,
      q,
      limit: paging.limit,
      offset: paging.offset,
    });
    return { success: true, data: out, correlationId };
  }

  @Patch('/aml/alerts/:alertId/assign')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('aml:alerts:assign')
  async assignAlert(
    @Headers() headers: Record<string, any>,
    @Param('alertId') alertId: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const a = await this.amlService.assignAlert({ alertId, assignedTo: body?.assignedTo ?? null });
    return { success: true, data: a, correlationId };
  }

  @Patch('/aml/alerts/:alertId/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('aml:alerts:update_status')
  async updateAlertStatus(
    @Headers() headers: Record<string, any>,
    @Param('alertId') alertId: string,
    @Body() body: any,
    @Req() req: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const actor = req?.user as any;
    const a = await this.amlService.updateAlertStatus({ alertId, status: body?.status, decidedBy: actor?.userId ?? null, notes: body?.notes ?? null });
    return { success: true, data: a, correlationId };
  }

  @Get('/aml/export')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('aml:export')
  async exportSnapshot(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('consentsLimit') consentsLimit?: string,
    @Query('rulesLimit') rulesLimit?: string,
    @Query('alertsLimit') alertsLimit?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('aml.export.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'aml:export',
    });

    const out = await this.amlService.exportSnapshot({
      consentsLimit: parseInt(consentsLimit || '200', 10),
      rulesLimit: parseInt(rulesLimit || '200', 10),
      alertsLimit: parseInt(alertsLimit || '200', 10),
    });

    return { success: true, data: out, correlationId };
  }

  @Post('/aml/transactions/evaluate')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('aml:alerts:create')
  async evaluateTransaction(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('aml.transactions.evaluate.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'aml:alerts:create',
    });

    if (!body?.partyId || !body?.partyName || !body?.transactionType || typeof body?.amount !== 'number') {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'partyId, partyName, transactionType, amount are required' },
        correlationId,
      };
    }

    try {
      const result = await this.amlService.evaluateTransaction({
        partyId: body.partyId,
        partyName: body.partyName,
        transactionType: body.transactionType,
        amount: body.amount,
        currency: body.currency || 'IRR',
        referenceType: body.referenceType,
        referenceId: body.referenceId,
        metadata: body.metadata,
      });

      return { success: true, data: result, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('aml.transactions.evaluate.failed', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'aml:alerts:create',
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to evaluate transaction' }, correlationId };
    }
  }

  // External data source endpoints
  @Post('/aml/external-sources')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('aml:manage')
  async createExternalDataSource(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('aml.external_sources.create.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'aml:manage',
      sourceName: body?.sourceName,
    });

    if (!body?.sourceName || !body?.sourceType || !body?.connectionConfig) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'sourceName, sourceType, and connectionConfig are required' },
        correlationId,
      };
    }

    try {
      const source = await this.amlService.createExternalDataSource({
        sourceName: body.sourceName,
        sourceType: body.sourceType,
        connectionConfig: body.connectionConfig,
        syncFrequencyMinutes: body.syncFrequencyMinutes,
        createdBy: actor?.userId,
      });

      auditLogger.info('aml.external_sources.create.success', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'aml:manage',
        sourceId: source.sourceId,
      });

      return { success: true, data: source, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('aml.external_sources.create.error', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'aml:manage',
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to create external data source' }, correlationId };
    }
  }

  @Put('/aml/external-sources/:sourceId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('aml:manage')
  async updateExternalDataSource(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('sourceId') sourceId: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('aml.external_sources.update.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'aml:manage',
      sourceId,
    });

    try {
      const source = await this.amlService.updateExternalDataSource(sourceId, {
        sourceName: body.sourceName,
        connectionConfig: body.connectionConfig,
        syncFrequencyMinutes: body.syncFrequencyMinutes,
        status: body.status,
      });

      if (!source) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'External data source not found' }, correlationId };
      }

      auditLogger.info('aml.external_sources.update.success', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'aml:manage',
        sourceId,
      });

      return { success: true, data: source, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('aml.external_sources.update.error', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'aml:manage',
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to update external data source' }, correlationId };
    }
  }

  @Get('/aml/external-sources/:sourceId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('aml:view')
  async getExternalDataSource(
    @Headers() headers: Record<string, any>,
    @Param('sourceId') sourceId: string
  ) {
    const correlationId = this.getCorrelationId(headers);

    auditLogger.info('aml.external_sources.get.request', {
      correlationId,
      action: 'aml:view',
      sourceId,
    });

    const source = await this.amlService.getExternalDataSource(sourceId);
    if (!source) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'External data source not found' }, correlationId };
    }

    return { success: true, data: source, correlationId };
  }

  @Get('/aml/external-sources')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('aml:view')
  async listExternalDataSources(
    @Headers() headers: Record<string, any>,
    @Query('sourceType') sourceType?: string,
    @Query('status') status?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10);

    auditLogger.info('aml.external_sources.list.request', {
      correlationId,
      action: 'aml:view',
      sourceType,
      status,
    });

    const { rows, total } = await this.amlService.listExternalDataSources({
      sourceType: sourceType as any,
      status: status as any,
      limit: Number.isFinite(lim) ? lim : 50,
      offset: Number.isFinite(off) ? off : 0,
    });

    return {
      success: true,
      data: rows,
      pagination: { total, limit: Number.isFinite(lim) ? lim : 50, offset: Number.isFinite(off) ? off : 0 },
      correlationId,
    };
  }

  @Post('/aml/external-sources/:sourceId/sync')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('aml:manage')
  async syncExternalDataSource(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('sourceId') sourceId: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('aml.external_sources.sync.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'aml:manage',
      sourceId,
    });

    try {
      const result = await this.amlService.syncExternalDataSource(sourceId);

      auditLogger.info('aml.external_sources.sync.result', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'aml:manage',
        sourceId,
        success: result.success,
      });

      return { success: result.success, data: result, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('aml.external_sources.sync.error', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'aml:manage',
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to sync external data source' }, correlationId };
    }
  }

  @Post('/aml/external-sources/:sourceId/query')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('aml:view')
  async queryExternalDataSource(
    @Headers() headers: Record<string, any>,
    @Param('sourceId') sourceId: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);

    auditLogger.info('aml.external_sources.query.request', {
      correlationId,
      action: 'aml:view',
      sourceId,
    });

    try {
      const result = await this.amlService.queryExternalDataSource(sourceId, {
        nationalId: body.nationalId,
        name: body.name,
        limit: body.limit,
      });

      return { success: result.success, data: result, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('aml.external_sources.query.error', err, {
        correlationId,
        action: 'aml:view',
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to query external data source' }, correlationId };
    }
  }

  @Post('/aml/reports/official')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('aml:manage')
  async generateOfficialReport(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('aml.reports.official.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'aml:manage',
      reportType: body?.reportType,
    });

    if (!body?.reportType || !body?.startDate || !body?.endDate) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'reportType, startDate, and endDate are required' },
        correlationId,
      };
    }

    const validReportTypes = ['suspicious_activity', 'currency_transaction', 'annual_summary'];
    if (!validReportTypes.includes(body.reportType)) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: `reportType must be one of: ${validReportTypes.join(', ')}` },
        correlationId,
      };
    }

    try {
      const startDate = new Date(body.startDate);
      const endDate = new Date(body.endDate);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'startDate and endDate must be valid dates' },
          correlationId,
        };
      }

      const result = await this.amlService.generateOfficialReport({
        reportType: body.reportType,
        startDate,
        endDate,
        generatedBy: actor?.userId,
      });

      auditLogger.info('aml.reports.official.success', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'aml:manage',
        reportId: result.reportId,
        success: result.success,
      });

      return { success: result.success, data: result, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('aml.reports.official.error', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'aml:manage',
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to generate official AML report' }, correlationId };
    }
  }
}
