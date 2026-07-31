import { Body, Controller, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PolicyService } from './policy.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { auditLogger } from './audit.logger';
import { permissionsForRoles } from './permissions';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  private ok<T>(params: { data: T; correlationId: string; pagination?: any }) {
    return {
      success: true as const,
      data: params.data,
      ...(params.pagination ? { pagination: params.pagination } : {}),
      correlationId: params.correlationId,
    };
  }

  @Post('/policies/:policyId/underwriting/decision')
  @RequirePermissions('policy:underwriting_decide')
  async underwritingDecision(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('policyId') policyId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    if (!this.isUuid(policyId)) {
      return this.fail({ code: 'VALIDATION_ERROR', message: 'policyId must be a UUID', correlationId });
    }

    auditLogger.info('policy.underwriting_decision.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'policy:underwriting_decide',
      policyId,
    });

    if (!body?.decision || !['approved', 'rejected', 'escalated'].includes(String(body.decision))) {
      auditLogger.warn('policy.underwriting_decision.validation_failed', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'policy:underwriting_decide',
        policyId,
      });
      return this.fail({ code: 'VALIDATION_ERROR', message: 'decision must be approved|rejected|escalated', correlationId });
    }

    try {
      const policy = await this.policyService.applyUnderwritingDecision({
        policyId,
        decision: body.decision,
        notes: typeof body.notes === 'string' ? body.notes : undefined,
        actorUserId: body.decidedBy || actor?.userId || null,
        tenantId,
        correlationId,
      });
      if (!policy) {
        auditLogger.warn('policy.underwriting_decision.not_found', {
          correlationId,
          tenantId,
          actorUserId: actor?.userId,
          action: 'policy:underwriting_decide',
          policyId,
        });
        return this.fail({ code: 'NOT_FOUND', message: 'Policy not found', correlationId });
      }
      return this.ok({ data: policy, correlationId });
    } catch (e: any) {
      if (e?.code === 'INVALID_STATE') {
        auditLogger.warn('policy.underwriting_decision.invalid_state', {
          correlationId,
          tenantId,
          actorUserId: actor?.userId,
          action: 'policy:underwriting_decide',
          policyId,
        });
        return this.fail({ code: 'INVALID_STATE', message: e.message, correlationId });
      }
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('policy.underwriting_decision.failed', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'policy:underwriting_decide',
        policyId,
      });
      return this.fail({ code: 'INTERNAL_ERROR', message: 'Failed to apply underwriting decision', correlationId });
    }
  }

  private fail(params: { code: string; message: string; correlationId: string; details?: any }) {
    return {
      success: false as const,
      error: {
        code: params.code,
        message: params.message,
        ...(params.details !== undefined ? { details: params.details } : {}),
      },
      correlationId: params.correlationId,
    };
  }

  private isUuid(v: any): boolean {
    return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
  }

  private isNonEmptyString(v: any): boolean {
    return typeof v === 'string' && v.trim().length > 0;
  }

  private isValidDateString(v: any): boolean {
    if (typeof v !== 'string' || v.trim().length < 8) return false;
    const d = new Date(v);
    return !Number.isNaN(d.getTime());
  }

  private parsePagination(limitRaw: any, offsetRaw: any): { limit: number; offset: number } {
    const lim = parseInt(String(limitRaw ?? '50'), 10);
    const off = parseInt(String(offsetRaw ?? '0'), 10);
    const limit = Number.isFinite(lim) ? Math.min(Math.max(lim, 1), 200) : 50;
    const offset = Number.isFinite(off) ? Math.max(off, 0) : 0;
    return { limit, offset };
  }

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // مرحله 1: استعلام و مشاوره (Quote / پیش‌فاکتور)
  @Post('/policies/quote')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('policy:quote')
  async quote(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('policy.quote.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:quote' });

    const errors: string[] = [];
    if (!this.isUuid(body?.partyId)) errors.push('partyId must be a UUID');
    if (!this.isNonEmptyString(body?.lineOfBusiness)) errors.push('lineOfBusiness is required');
    if (!this.isValidDateString(body?.startDate)) errors.push('startDate must be a valid date string');
    if (!this.isValidDateString(body?.endDate)) errors.push('endDate must be a valid date string');
    if (typeof body?.premiumAmount !== 'number' || !Number.isFinite(body.premiumAmount) || body.premiumAmount < 0) errors.push('premiumAmount must be a non-negative number');
    if (body?.producerOrgUnitId !== undefined && body?.producerOrgUnitId !== null && !this.isUuid(body?.producerOrgUnitId))
      errors.push('producerOrgUnitId must be a UUID');

    if (errors.length > 0) {
      auditLogger.warn('policy.quote.validation_failed', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:quote' });
      return this.fail({ code: 'VALIDATION_ERROR', message: 'Invalid quote request', correlationId, details: { errors } });
    }

    const policy = await this.policyService.quote({
      partyId: body.partyId,
      lineOfBusiness: body.lineOfBusiness,
      startDate: body.startDate,
      endDate: body.endDate,
      coverages: body.coverages,
      deductibles: body.deductibles,
      installments: body.installments,
      premiumAmount: body.premiumAmount,
      tenantId,
      correlationId,
      producerOrgUnitId: body?.producerOrgUnitId ?? null,
      submissionId: body?.submissionId ?? null,
      placementId: body?.placementId ?? null,
      distributionOrganizationId: body?.distributionOrganizationId ?? actor?.organizationId ?? null,
      issuerOrganizationId: body?.issuerOrganizationId ?? null,
      productId: body?.productId ?? null,
    });

    auditLogger.info('policy.quote.success', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:quote', policyId: policy.policyId });

    return this.ok({ data: policy, correlationId });
  }

  @Post('/policies/convert-quote')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('policy:quote')
  async convertQuoteToPolicy(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('policy.convert_quote.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:quote' });

    const errors: string[] = [];
    if (!body?.quote) errors.push('quote is required');
    if (!this.isUuid(body?.quote?.productId)) errors.push('quote.productId must be a UUID');
    if (!this.isUuid(body?.quote?.partyId)) errors.push('quote.partyId must be a UUID');
    if (!this.isNonEmptyString(body?.quote?.lineOfBusiness)) errors.push('quote.lineOfBusiness is required');
    if (!this.isValidDateString(body?.quote?.startDate)) errors.push('quote.startDate must be a valid date string');
    if (!this.isValidDateString(body?.quote?.endDate)) errors.push('quote.endDate must be a valid date string');
    if (typeof body?.quote?.premiumAmount !== 'number' || !Number.isFinite(body?.quote?.premiumAmount) || body?.quote?.premiumAmount < 0) errors.push('quote.premiumAmount must be a non-negative number');
    if (body?.producerOrgUnitId !== undefined && body?.producerOrgUnitId !== null && !this.isUuid(body?.producerOrgUnitId))
      errors.push('producerOrgUnitId must be a UUID');

    if (errors.length > 0) {
      auditLogger.warn('policy.convert_quote.validation_failed', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:quote' });
      return this.fail({ code: 'VALIDATION_ERROR', message: 'Invalid convert quote request', correlationId, details: { errors } });
    }

    try {
      const policy = await this.policyService.convertQuoteToPolicy({
        quote: body.quote,
        producerOrgUnitId: body?.producerOrgUnitId ?? null,
        submissionId: body?.submissionId ?? null,
        placementId: body?.placementId ?? null,
        distributionOrganizationId: body?.distributionOrganizationId ?? actor?.organizationId ?? null,
        issuerOrganizationId: body?.issuerOrganizationId ?? null,
        actorUserId: actor?.userId,
        tenantId,
        correlationId,
      });

      auditLogger.info('policy.convert_quote.success', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:quote', policyId: policy.policyId });

      return this.ok({ data: policy, correlationId });
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('policy.convert_quote.failed', err, { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:quote' });
      return this.fail({ code: 'INTERNAL_ERROR', message: 'Failed to convert quote to policy', correlationId });
    }
  }

  // سنهاب: استعلام چندکاناله (کدملی+کدیکتا / شماره بیمه‌نامه / VIN)
  @Post('/policies/:policyId/sanhab/inquiry')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('policy:sanhab_inquiry')
  async sanhabInquiry(@Req() req: any, @Headers() headers: Record<string, any>, @Param('policyId') policyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;
    const authorization = (headers['authorization'] || headers['Authorization']) as string | undefined;

    if (!this.isUuid(policyId)) {
      auditLogger.warn('policy.sanhab_inquiry.validation_failed', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:sanhab_inquiry', policyId });
      return this.fail({ code: 'VALIDATION_ERROR', message: 'policyId must be a UUID', correlationId });
    }

    const nat = body?.nationalId;
    const uc = body?.uniqueCode;
    const pn = body?.policyNumber;
    const vin = body?.vin;

    const inquiryErrors: string[] = [];
    const hasNat = this.isNonEmptyString(nat);
    const hasUc = this.isNonEmptyString(uc);
    const hasPn = this.isNonEmptyString(pn);
    const hasVin = this.isNonEmptyString(vin);

    if ((hasNat && !hasUc) || (!hasNat && hasUc)) inquiryErrors.push('nationalId and uniqueCode must be provided together');
    if (!hasPn && !hasVin && !(hasNat && hasUc)) inquiryErrors.push('Provide either (nationalId+uniqueCode) or policyNumber or vin');

    if (inquiryErrors.length > 0) {
      auditLogger.warn('policy.sanhab_inquiry.validation_failed', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:sanhab_inquiry', policyId });
      return this.fail({
        code: 'VALIDATION_ERROR',
        message: 'Invalid SANHAB inquiry request',
        correlationId,
        details: { errors: inquiryErrors },
      });
    }

    auditLogger.info('policy.sanhab_inquiry.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'policy:sanhab_inquiry',
      policyId,
    });

    try {
      const result = await this.policyService.sanhabInquiry({
        policyId,
        actorUserId: actor?.userId,
        tenantId,
        correlationId,
        authorization,
        body: {
          nationalId: body?.nationalId,
          uniqueCode: body?.uniqueCode,
          policyNumber: body?.policyNumber,
          vin: body?.vin,
        },
      });

      return this.ok({
        data: {
          response: result.response,
          inquiryId: result.inquiry.inquiryId,
          resultCode: result.inquiry.resultCode,
          workItemId: result.inquiry.workItemId,
          workItemSagaId: result.inquiry.workItemSagaId,
        },
        correlationId,
      });
    } catch (e: any) {
      if (e?.code === 'NOT_FOUND') {
        auditLogger.warn('policy.sanhab_inquiry.not_found', {
          correlationId,
          tenantId,
          actorUserId: actor?.userId,
          action: 'policy:sanhab_inquiry',
          policyId,
        });
        return this.fail({ code: 'NOT_FOUND', message: 'Policy not found', correlationId });
      }

      const msg = e?.message || 'Sanhab inquiry failed';
      auditLogger.error('policy.sanhab_inquiry.failed', e instanceof Error ? e : new Error(String(e)), {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'policy:sanhab_inquiry',
        policyId,
      });
      return this.fail({ code: 'INTERNAL_ERROR', message: msg, correlationId });
    }
  }

  @Get('/policies/:policyId/sanhab/inquiries')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('policy:sanhab_inquiries_view')
  async listSanhabInquiries(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('policyId') policyId: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('policy.sanhab_inquiries.list.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'policy:sanhab_inquiries_view',
      policyId,
    });

    if (!this.isUuid(policyId)) return this.fail({ code: 'VALIDATION_ERROR', message: 'policyId must be a UUID', correlationId });

    const { limit: lim, offset: off } = this.parsePagination(limit, offset);

    const { rows, total } = await this.policyService.listSanhabInquiries({
      policyId,
      tenantId,
      limit: lim,
      offset: off,
    });

    return this.ok({ data: rows, correlationId, pagination: { total, limit: lim, offset: off } });
  }

  @Post('/policies/sanhab/sms-inquiry')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('policy:sanhab_inquiry')
  async sanhabSmsInquiry(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;
    const authorization = (headers['authorization'] || headers['Authorization']) as string | undefined;

    auditLogger.info('policy.sanhab.sms_inquiry.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'policy:sanhab_inquiry',
    });

    const inquiryErrors: string[] = [];
    const nat = body?.nationalId;
    const uc = body?.uniqueCode;
    const pn = body?.policyNumber;
    const vin = body?.vin;

    const hasNat = this.isNonEmptyString(nat);
    const hasUc = this.isNonEmptyString(uc);
    const hasPn = this.isNonEmptyString(pn);
    const hasVin = this.isNonEmptyString(vin);

    if ((hasNat && !hasUc) || (!hasNat && hasUc)) inquiryErrors.push('nationalId and uniqueCode must be provided together');
    if (!hasPn && !hasVin && !(hasNat && hasUc)) inquiryErrors.push('Provide either (nationalId+uniqueCode) or policyNumber or vin');

    if (inquiryErrors.length > 0) {
      auditLogger.warn('policy.sanhab.sms_inquiry.validation_failed', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'policy:sanhab_inquiry',
      });
      return this.fail({
        code: 'VALIDATION_ERROR',
        message: 'Invalid SANHAB SMS inquiry request',
        correlationId,
        details: { errors: inquiryErrors },
      });
    }

    try {
      const result = await this.policyService.sanhabSmsInquiry({
        actorUserId: actor?.userId,
        tenantId,
        correlationId,
        authorization,
        body: {
          nationalId: body?.nationalId,
          uniqueCode: body?.uniqueCode,
          policyNumber: body?.policyNumber,
          vin: body?.vin,
          phoneNumber: body?.phoneNumber,
        },
      });

      return this.ok({
        data: {
          response: result.response,
          inquiryId: result.inquiry.inquiryId,
          resultCode: result.inquiry.resultCode,
          workItemId: result.inquiry.workItemId,
          workItemSagaId: result.inquiry.workItemSagaId,
        },
        correlationId,
      });
    } catch (e: any) {
      const msg = e?.message || 'Sanhab SMS inquiry failed';
      auditLogger.error('policy.sanhab.sms_inquiry.failed', e instanceof Error ? e : new Error(String(e)), {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'policy:sanhab_inquiry',
      });
      return this.fail({ code: 'INTERNAL_ERROR', message: msg, correlationId });
    }
  }

  @Get('/policies/:policyId/changes')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('policy:changes_view')
  async listChanges(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('policyId') policyId: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('policy.changes.list.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'policy:changes_view',
      policyId,
    });

    if (!this.isUuid(policyId)) {
      return this.fail({ code: 'VALIDATION_ERROR', message: 'policyId must be a UUID', correlationId });
    }

    const { limit: lim, offset: off } = this.parsePagination(limit, offset);

    const { rows, total } = await this.policyService.listPolicyChanges({
      policyId,
      tenantId,
      limit: lim,
      offset: off,
    });

    return this.ok({ data: rows, correlationId, pagination: { total, limit: lim, offset: off } });
  }

  @Get('/policies/:policyId/timeline')
  @UseGuards(JwtAuthGuard)
  async timeline(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('policyId') policyId: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('policy.timeline.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'policy:timeline',
      policyId,
    });

    if (!this.isUuid(policyId)) return this.fail({ code: 'VALIDATION_ERROR', message: 'policyId must be a UUID', correlationId });

    const perms = permissionsForRoles(actor?.roles);
    const canViewPolicy = perms.includes('policy:view' as any);
    const canViewChanges = perms.includes('policy:changes_view' as any);
    const canViewInquiries = perms.includes('policy:sanhab_inquiries_view' as any);

    if (!canViewPolicy || (!canViewChanges && !canViewInquiries)) {
      auditLogger.warn('policy.timeline.forbidden', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'policy:timeline',
        policyId,
      });
      return this.fail({ code: 'FORBIDDEN', message: 'Forbidden', correlationId });
    }

    const { limit: lim, offset: off } = this.parsePagination(limit, offset);
    const { rows, total } = await this.policyService.getPolicyTimeline({
      policyId,
      tenantId,
      limit: lim,
      offset: off,
      includeChanges: canViewChanges,
      includeInquiries: canViewInquiries,
    });

    return this.ok({ data: rows, correlationId, pagination: { total, limit: lim, offset: off } });
  }

  // مرحله 2: جمع‌آوری اطلاعات و مدارک
  @Post('/policies/:policyId/submit-docs')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('policy:submit_docs')
  async submitDocs(@Req() req: any, @Headers() headers: Record<string, any>, @Param('policyId') policyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    if (!this.isUuid(policyId)) {
      return this.fail({ code: 'VALIDATION_ERROR', message: 'policyId must be a UUID', correlationId });
    }

    auditLogger.info('policy.submit_docs.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:submit_docs', policyId });

    if (!body?.applicationData || typeof body.applicationData !== 'object') {
      auditLogger.warn('policy.submit_docs.validation_failed', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:submit_docs', policyId });
      return this.fail({ code: 'VALIDATION_ERROR', message: 'applicationData is required (object)', correlationId });
    }

    try {
      const policy = await this.policyService.submitDocs({ policyId, applicationData: body.applicationData, tenantId, correlationId });
      if (!policy) {
        auditLogger.warn('policy.submit_docs.not_found', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:submit_docs', policyId });
        return this.fail({ code: 'NOT_FOUND', message: 'Policy not found', correlationId });
      }

      return this.ok({ data: policy, correlationId });
    } catch (e: any) {
      if (e?.code === 'INVALID_STATE') {
        auditLogger.warn('policy.submit_docs.invalid_state', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:submit_docs', policyId });
        return this.fail({ code: 'INVALID_STATE', message: e.message, correlationId });
      }
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('policy.submit_docs.failed', err, { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:submit_docs', policyId });
      return this.fail({ code: 'INTERNAL_ERROR', message: 'Failed to submit docs', correlationId });
    }
  }

  // مرحله 3: ارزیابی ریسک
  @Post('/policies/:policyId/risk-assess')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('policy:risk_assess')
  async riskAssess(@Req() req: any, @Headers() headers: Record<string, any>, @Param('policyId') policyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;
    const authorization = (headers['authorization'] || headers['Authorization']) as string | undefined;

    if (!this.isUuid(policyId)) {
      return this.fail({ code: 'VALIDATION_ERROR', message: 'policyId must be a UUID', correlationId });
    }

    auditLogger.info('policy.risk_assess.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:risk_assess', policyId });

    if (!body?.riskAssessment || typeof body.riskAssessment !== 'object') {
      auditLogger.warn('policy.risk_assess.validation_failed', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:risk_assess', policyId });
      return this.fail({ code: 'VALIDATION_ERROR', message: 'riskAssessment is required (object)', correlationId });
    }

    try {
      const policy = await this.policyService.riskAssess({
        policyId,
        riskAssessment: body.riskAssessment,
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        authorization,
      });
      if (!policy) {
        auditLogger.warn('policy.risk_assess.not_found', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:risk_assess', policyId });
        return this.fail({ code: 'NOT_FOUND', message: 'Policy not found', correlationId });
      }

      return this.ok({ data: policy, correlationId });
    } catch (e: any) {
      if (e?.code === 'INVALID_STATE') {
        auditLogger.warn('policy.risk_assess.invalid_state', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:risk_assess', policyId });
        return this.fail({ code: 'INVALID_STATE', message: e.message, correlationId });
      }
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('policy.risk_assess.failed', err, { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:risk_assess', policyId });
      return this.fail({ code: 'INTERNAL_ERROR', message: 'Failed to risk assess', correlationId });
    }
  }

  // مرحله 4: صدور بیمه‌نامه (نیازمند پرداخت)
  @Post('/policies/:policyId/issue')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('policy:issue')
  async issue(@Req() req: any, @Headers() headers: Record<string, any>, @Param('policyId') policyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;
    const authorization = (headers['authorization'] || headers['Authorization']) as string | undefined;

    if (!this.isUuid(policyId)) {
      return this.fail({ code: 'VALIDATION_ERROR', message: 'policyId must be a UUID', correlationId });
    }

    auditLogger.info('policy.issue.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:issue', policyId });

    if (!body?.paymentId || typeof body.paymentId !== 'string') {
      auditLogger.warn('policy.issue.validation_failed', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:issue', policyId });
      return this.fail({ code: 'VALIDATION_ERROR', message: 'paymentId is required', correlationId });
    }

    try {
      const policy = await this.policyService.issue({
        policyId,
        paymentId: body.paymentId,
        brokerLicenseId: body.brokerLicenseId,
        issuerOrganizationId: actor?.organizationId,
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        authorization,
      });
      if (!policy) {
        auditLogger.warn('policy.issue.not_found', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:issue', policyId });
        return this.fail({ code: 'NOT_FOUND', message: 'Policy not found', correlationId });
      }
      return this.ok({ data: policy, correlationId });
    } catch (e: any) {
      if (e?.code === 'PAYMENT_REQUIRED' || e?.code === 'PAYMENT_MISMATCH' || e?.code === 'PAYMENT_SERVICE_UNAVAILABLE' || e?.code === 'PAYMENT_SERVICE_ERROR') {
        auditLogger.warn('policy.issue.payment_required', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:issue', policyId });
        return this.fail({ code: 'PAYMENT_REQUIRED', message: e.message, correlationId });
      }
      if (e?.code === 'QUALITY_GATE_FAILED') {
        auditLogger.warn('policy.issue.quality_gate_failed', {
          correlationId,
          tenantId,
          actorUserId: actor?.userId,
          action: 'policy:issue',
          policyId,
          details: e?.details,
        });
        return this.fail({ code: 'QUALITY_GATE_FAILED', message: e.message, correlationId, details: e?.details });
      }
      if (e?.code === 'INVALID_STATE') {
        auditLogger.warn('policy.issue.invalid_state', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:issue', policyId });
        return this.fail({ code: 'INVALID_STATE', message: e.message, correlationId });
      }
      if (e?.code === 'BROKER_LICENSE_INVALID') {
        auditLogger.warn('policy.issue.broker_license_invalid', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:issue', policyId, details: e?.details });
        return this.fail({ code: 'BROKER_LICENSE_INVALID', message: e.message, correlationId, details: e?.details });
      }
      if (e?.code === 'DISTRIBUTION_AGREEMENT_INVALID') {
        auditLogger.warn('policy.issue.distribution_agreement_invalid', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:issue', policyId, details: e?.details });
        return this.fail({ code: 'DISTRIBUTION_AGREEMENT_INVALID', message: e.message, correlationId, details: e?.details });
      }
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('policy.issue.failed', err, { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:issue', policyId });
      return this.fail({ code: 'INTERNAL_ERROR', message: 'Failed to issue policy', correlationId });
    }
  }

  // مرحله 5: پس از صدور - ثبت کد یکتا (سنهاب)
  @Post('/policies/:policyId/unique-code')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('policy:set_unique_code')
  async setUniqueCode(@Req() req: any, @Headers() headers: Record<string, any>, @Param('policyId') policyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;
    const authorization = (headers['authorization'] || headers['Authorization']) as string | undefined;

    if (!this.isUuid(policyId)) {
      return this.fail({ code: 'VALIDATION_ERROR', message: 'policyId must be a UUID', correlationId });
    }

    auditLogger.info('policy.set_unique_code.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:set_unique_code', policyId });

    if (!body?.uniqueCode || typeof body.uniqueCode !== 'string') {
      auditLogger.warn('policy.set_unique_code.validation_failed', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:set_unique_code', policyId });
      return this.fail({ code: 'VALIDATION_ERROR', message: 'uniqueCode is required (string)', correlationId });
    }

    try {
      const policy = await this.policyService.setUniqueCode({
        policyId,
        uniqueCode: body.uniqueCode,
        actorUserId: actor?.userId,
        correlationId,
        tenantId,
        authorization,
      });
      if (!policy) {
        auditLogger.warn('policy.set_unique_code.not_found', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:set_unique_code', policyId });
        return this.fail({ code: 'NOT_FOUND', message: 'Policy not found', correlationId });
      }

      return this.ok({ data: policy, correlationId });
    } catch (e: any) {
      if (e?.code === 'INVALID_STATE') {
        auditLogger.warn('policy.set_unique_code.invalid_state', {
          correlationId,
          tenantId,
          actorUserId: actor?.userId,
          action: 'policy:set_unique_code',
          policyId,
        });
        return this.fail({ code: 'INVALID_STATE', message: e.message, correlationId });
      }
      if (e?.code === 'QUALITY_GATE_FAILED') {
        auditLogger.warn('policy.set_unique_code.quality_gate_failed', {
          correlationId,
          tenantId,
          actorUserId: actor?.userId,
          action: 'policy:set_unique_code',
          policyId,
          details: e?.details,
        });
        return this.fail({ code: 'QUALITY_GATE_FAILED', message: e.message, correlationId, details: e?.details });
      }

      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('policy.set_unique_code.failed', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'policy:set_unique_code',
        policyId,
      });
      return this.fail({ code: 'INTERNAL_ERROR', message: 'Failed to set unique code', correlationId });
    }
  }

  @Post('/policies/:policyId/quality-gate/override')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('policy:quality_gate_override')
  async qualityGateOverride(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('policyId') policyId: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    if (!this.isUuid(policyId)) {
      return this.fail({ code: 'VALIDATION_ERROR', message: 'policyId must be a UUID', correlationId });
    }

    const action = body?.action as string;
    const reason = body?.reason as string;
    if ((action !== 'issue' && action !== 'set_unique_code') || typeof reason !== 'string' || reason.length < 3) {
      auditLogger.warn('policy.quality_gate_override.validation_failed', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'policy:quality_gate_override',
        policyId,
      });
      return this.fail({ code: 'VALIDATION_ERROR', message: 'action (issue|set_unique_code) and reason are required', correlationId });
    }

    auditLogger.info('policy.quality_gate_override.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'policy:quality_gate_override',
      policyId,
      overrideAction: action,
    });

    const result = await this.policyService.qualityGateOverride({
      policyId,
      actorUserId: actor?.userId,
      tenantId,
      correlationId,
      overrideAction: action as any,
      reason,
    });

    if (!result) {
      return this.fail({ code: 'NOT_FOUND', message: 'Policy not found', correlationId });
    }

    return this.ok({ data: result, correlationId });
  }

  @Post('/policies/:policyId/endorse')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('policy:endorse')
  async endorse(@Req() req: any, @Headers() headers: Record<string, any>, @Param('policyId') policyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    if (!this.isUuid(policyId)) {
      return this.fail({ code: 'VALIDATION_ERROR', message: 'policyId must be a UUID', correlationId });
    }

    auditLogger.info('policy.endorse.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:endorse', policyId });

    const validTypes = ['coverage_change', 'premium_change', 'beneficiary_change', 'address_change', 'vehicle_change', 'broker_change', 'other'];
    if (!body?.endorsementType || !validTypes.includes(body.endorsementType)) {
      auditLogger.warn('policy.endorse.validation_failed', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:endorse', policyId });
      return this.fail({ code: 'VALIDATION_ERROR', message: `endorsementType is required and must be one of: ${validTypes.join(', ')}`, correlationId });
    }

    if (!body?.payload || typeof body.payload !== 'object') {
      auditLogger.warn('policy.endorse.validation_failed', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:endorse', policyId });
      return this.fail({ code: 'VALIDATION_ERROR', message: 'payload is required (object)', correlationId });
    }

    try {
      const policy = await this.policyService.endorse({
        policyId,
        endorsementType: body.endorsementType,
        payload: body.payload,
        effectiveDate: body.effectiveDate,
        reason: body.reason,
        actorUserId: actor?.userId,
        tenantId,
        correlationId,
      });
      if (!policy) {
        auditLogger.warn('policy.endorse.not_found', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:endorse', policyId });
        return this.fail({ code: 'NOT_FOUND', message: 'Policy not found', correlationId });
      }

      return this.ok({ data: policy, correlationId });
    } catch (e: any) {
      if (e?.code === 'INVALID_STATE') {
        auditLogger.warn('policy.endorse.invalid_state', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:endorse', policyId });
        return this.fail({ code: 'INVALID_STATE', message: e.message, correlationId });
      }
      if (e?.code === 'BROKER_LICENSE_INVALID') {
        auditLogger.warn('policy.endorse.broker_license_invalid', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:endorse', policyId, details: e?.details });
        return this.fail({ code: 'BROKER_LICENSE_INVALID', message: e.message, correlationId, details: e?.details });
      }
      if (e?.code === 'DISTRIBUTION_AGREEMENT_INVALID') {
        auditLogger.warn('policy.endorse.distribution_agreement_invalid', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:endorse', policyId, details: e?.details });
        return this.fail({ code: 'DISTRIBUTION_AGREEMENT_INVALID', message: e.message, correlationId, details: e?.details });
      }
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('policy.endorse.failed', err, { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:endorse', policyId });
      return this.fail({ code: 'INTERNAL_ERROR', message: 'Failed to endorse policy', correlationId });
    }
  }

  @Get('/policies/:policyId/endorsements')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('policy:changes_view')
  async listEndorsements(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('policyId') policyId: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('policy.endorsements.list.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'policy:changes_view',
      policyId,
    });

    if (!this.isUuid(policyId)) {
      return this.fail({ code: 'VALIDATION_ERROR', message: 'policyId must be a UUID', correlationId });
    }

    const { limit: lim, offset: off } = this.parsePagination(limit, offset);

    const { rows, total } = await this.policyService.listEndorsements({
      policyId,
      tenantId,
      limit: lim,
      offset: off,
    });

    return this.ok({ data: rows, correlationId, pagination: { total, limit: lim, offset: off } });
  }

  @Post('/policies/:policyId/cancel')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('policy:cancel')
  async cancel(@Req() req: any, @Headers() headers: Record<string, any>, @Param('policyId') policyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    if (!this.isUuid(policyId)) {
      return this.fail({ code: 'VALIDATION_ERROR', message: 'policyId must be a UUID', correlationId });
    }

    auditLogger.info('policy.cancel.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:cancel', policyId });

    const policy = await this.policyService.cancel({ policyId, reason: body?.reason, actorUserId: actor?.userId, tenantId, correlationId });
    if (!policy) {
      auditLogger.warn('policy.cancel.not_found', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:cancel', policyId });
      return this.fail({ code: 'NOT_FOUND', message: 'Policy not found', correlationId });
    }

    return this.ok({ data: policy, correlationId });
  }

  @Post('/policies/:policyId/lapse')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('policy:cancel')
  async lapse(@Req() req: any, @Headers() headers: Record<string, any>, @Param('policyId') policyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    if (!this.isUuid(policyId)) {
      return this.fail({ code: 'VALIDATION_ERROR', message: 'policyId must be a UUID', correlationId });
    }

    auditLogger.info('policy.lapse.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:cancel', policyId });

    const policy = await this.policyService.lapse({ policyId, reason: body?.reason, actorUserId: actor?.userId, tenantId, correlationId });
    if (!policy) {
      auditLogger.warn('policy.lapse.not_found', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:cancel', policyId });
      return this.fail({ code: 'NOT_FOUND', message: 'Policy not found', correlationId });
    }

    return this.ok({ data: policy, correlationId });
  }

  @Post('/policies/:policyId/renew')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('policy:renew')
  async renew(@Req() req: any, @Headers() headers: Record<string, any>, @Param('policyId') policyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    if (!this.isUuid(policyId)) {
      return this.fail({ code: 'VALIDATION_ERROR', message: 'policyId must be a UUID', correlationId });
    }

    auditLogger.info('policy.renew.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:renew', policyId });

    const policy = await this.policyService.renew({ policyId, newEndDate: body?.newEndDate, newPremium: body?.newPremium, newCommissionSplit: body?.newCommissionSplit, actorUserId: actor?.userId, tenantId, correlationId });
    if (!policy) {
      auditLogger.warn('policy.renew.not_found', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:renew', policyId });
      return this.fail({ code: 'NOT_FOUND', message: 'Policy not found', correlationId });
    }

    return this.ok({ data: policy, correlationId });
  }

  @Get('/policies/:policyId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('policy:view')
  async get(@Req() req: any, @Headers() headers: Record<string, any>, @Param('policyId') policyId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    if (!this.isUuid(policyId)) {
      return this.fail({ code: 'VALIDATION_ERROR', message: 'policyId must be a UUID', correlationId });
    }

    auditLogger.info('policy.get.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:view', policyId });

    const policy = await this.policyService.getPolicy(policyId, tenantId);
    if (!policy) {
      auditLogger.warn('policy.get.not_found', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:view', policyId });
      return this.fail({ code: 'NOT_FOUND', message: 'Policy not found', correlationId });
    }

    return this.ok({ data: policy, correlationId });
  }

  @Get('/policies')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('policy:list')
  async list(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('partyId') partyId?: string,
    @Query('uniqueCode') uniqueCode?: string,
    @Query('distributionOrganizationId') distributionOrganizationId?: string,
    @Query('issuerOrganizationId') issuerOrganizationId?: string,
    @Query('salesChannelType') salesChannelType?: string,
    @Query('status') status?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('policy.list.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:list' });

    const { limit: lim, offset: off } = this.parsePagination(limit, offset);

    const { rows, total } = await this.policyService.listPolicies({
      partyId,
      uniqueCode,
      tenantId,
      distributionOrganizationId,
      issuerOrganizationId,
      salesChannelType,
      status,
      limit: lim,
      offset: off,
    });

    return this.ok({ data: rows, correlationId, pagination: { total, limit: lim, offset: off } });
  }

  // Auto-renewal endpoints
  @Post('/policies/:policyId/auto-renew')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('policy:renew')
  async setAutoRenew(@Req() req: any, @Headers() headers: Record<string, any>, @Param('policyId') policyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    if (!this.isUuid(policyId)) {
      return this.fail({ code: 'VALIDATION_ERROR', message: 'policyId must be a UUID', correlationId });
    }

    auditLogger.info('policy.auto_renew.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:renew', policyId });

    if (typeof body?.autoRenew !== 'boolean') {
      auditLogger.warn('policy.auto_renew.validation_failed', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:renew', policyId });
      return this.fail({ code: 'VALIDATION_ERROR', message: 'autoRenew is required (boolean)', correlationId });
    }

    try {
      const policy = await this.policyService.setAutoRenew({
        policyId,
        autoRenew: body.autoRenew,
        maxRenewals: body?.maxRenewals,
        actorUserId: actor?.userId,
        tenantId,
        correlationId,
      });
      return this.ok({ data: policy, correlationId });
    } catch (e: any) {
      if (e?.code === 'NOT_FOUND') {
        return this.fail({ code: 'NOT_FOUND', message: 'Policy not found', correlationId });
      }
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('policy.auto_renew.failed', err, { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:renew', policyId });
      return this.fail({ code: 'INTERNAL_ERROR', message: 'Failed to set auto-renew', correlationId });
    }
  }

  @Post('/policies/:policyId/renewal/schedule')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('policy:renew')
  async scheduleRenewal(@Req() req: any, @Headers() headers: Record<string, any>, @Param('policyId') policyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    if (!this.isUuid(policyId)) {
      return this.fail({ code: 'VALIDATION_ERROR', message: 'policyId must be a UUID', correlationId });
    }

    auditLogger.info('policy.renewal.schedule.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:renew', policyId });

    if (!body?.newStartDate || !body?.newEndDate) {
      auditLogger.warn('policy.renewal.schedule.validation_failed', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:renew', policyId });
      return this.fail({ code: 'VALIDATION_ERROR', message: 'newStartDate and newEndDate are required', correlationId });
    }

    try {
      const renewal = await this.policyService.scheduleRenewal({
        policyId,
        newStartDate: new Date(body.newStartDate),
        newEndDate: new Date(body.newEndDate),
        newPremium: body?.newPremium,
        type: body?.type || 'manual',
        actorUserId: actor?.userId,
        tenantId,
        notes: body?.notes,
      });
      return this.ok({ data: renewal, correlationId });
    } catch (e: any) {
      if (e?.code === 'NOT_FOUND') {
        return this.fail({ code: 'NOT_FOUND', message: 'Policy not found', correlationId });
      }
      if (e?.code === 'INVALID_STATE') {
        return this.fail({ code: 'INVALID_STATE', message: e.message, correlationId });
      }
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('policy.renewal.schedule.failed', err, { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:renew', policyId });
      return this.fail({ code: 'INTERNAL_ERROR', message: 'Failed to schedule renewal', correlationId });
    }
  }

  @Post('/renewals/:renewalId/approve')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('policy:renew')
  async approveRenewal(@Req() req: any, @Headers() headers: Record<string, any>, @Param('renewalId') renewalId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('policy.renewal.approve.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:renew', renewalId });

    try {
      const renewal = await this.policyService.approveRenewal({
        renewalId,
        actorUserId: actor?.userId,
        tenantId,
        correlationId,
        reason: body?.reason,
      });
      return this.ok({ data: renewal, correlationId });
    } catch (e: any) {
      if (e?.code === 'NOT_FOUND') {
        return this.fail({ code: 'NOT_FOUND', message: 'Renewal not found', correlationId });
      }
      if (e?.code === 'INVALID_STATE') {
        return this.fail({ code: 'INVALID_STATE', message: e.message, correlationId });
      }
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('policy.renewal.approve.failed', err, { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:renew', renewalId });
      return this.fail({ code: 'INTERNAL_ERROR', message: 'Failed to approve renewal', correlationId });
    }
  }

  @Post('/renewals/:renewalId/reject')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('policy:renew')
  async rejectRenewal(@Req() req: any, @Headers() headers: Record<string, any>, @Param('renewalId') renewalId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('policy.renewal.reject.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:renew', renewalId });

    if (!body?.reason || typeof body.reason !== 'string') {
      auditLogger.warn('policy.renewal.reject.validation_failed', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:renew', renewalId });
      return this.fail({ code: 'VALIDATION_ERROR', message: 'reason is required', correlationId });
    }

    try {
      const renewal = await this.policyService.rejectRenewal({
        renewalId,
        actorUserId: actor?.userId,
        tenantId,
        reason: body.reason,
      });
      return this.ok({ data: renewal, correlationId });
    } catch (e: any) {
      if (e?.code === 'NOT_FOUND') {
        return this.fail({ code: 'NOT_FOUND', message: 'Renewal not found', correlationId });
      }
      if (e?.code === 'INVALID_STATE') {
        return this.fail({ code: 'INVALID_STATE', message: e.message, correlationId });
      }
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('policy.renewal.reject.failed', err, { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:renew', renewalId });
      return this.fail({ code: 'INTERNAL_ERROR', message: 'Failed to reject renewal', correlationId });
    }
  }

  @Get('/policies/:policyId/renewals')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('policy:view')
  async getRenewals(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('policyId') policyId: string,
    @Query('status') status?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('policy.renewals.list.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:view', policyId });

    const { limit: lim, offset: off } = this.parsePagination(limit, offset);

    const result = await this.policyService.getRenewals({
      policyId,
      tenantId,
      status,
      limit: lim,
      offset: off,
    });

    return this.ok({ data: result, correlationId });
  }

  @Get('/policies/renewal/due')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('policy:list')
  async getPoliciesForRenewal(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('daysBeforeExpiry') daysBeforeExpiry: string = '30',
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('policy.renewal.due.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:list' });

    const days = parseInt(daysBeforeExpiry, 10) || 30;
    const { limit: lim, offset: off } = this.parsePagination(limit, offset);

    const result = await this.policyService.getPoliciesForRenewal({
      tenantId,
      daysBeforeExpiry: days,
      limit: lim,
      offset: off,
    });

    return this.ok({ data: result, correlationId });
  }

  @Post('/policies/:policyId/sanhab-result')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('policy:set_unique_code')
  async recordSanhabResult(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('policyId') policyId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;
    const authorization = (headers['authorization'] || headers['Authorization']) as string | undefined;

    if (!this.isUuid(policyId)) {
      return this.fail({ code: 'VALIDATION_ERROR', message: 'policyId must be a UUID', correlationId });
    }

    auditLogger.info('policy.sanhab_result.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'policy:set_unique_code',
      policyId,
      sanhabStatus: body?.sanhabStatus,
    });

    const allowedStatuses = ['pending', 'confirmed', 'rejected'];
    if (!body?.sanhabStatus || !allowedStatuses.includes(body.sanhabStatus)) {
      return this.fail({ code: 'VALIDATION_ERROR', message: 'sanhabStatus is required (pending|confirmed|rejected)', correlationId });
    }

    try {
      const policy = await this.policyService.recordSanhabResult({
        policyId,
        sanhabStatus: body.sanhabStatus,
        sanhabSubmissionId: body.sanhabSubmissionId,
        sanhabResponse: body.sanhabResponse,
        uniqueCode: body.uniqueCode,
        actorUserId: actor?.userId,
        tenantId,
        correlationId,
        authorization,
      });
      if (!policy) {
        return this.fail({ code: 'NOT_FOUND', message: 'Policy not found', correlationId });
      }
      return this.ok({ data: policy, correlationId });
    } catch (e: any) {
      if (e?.code === 'INVALID_STATE') {
        return this.fail({ code: 'INVALID_STATE', message: e.message, correlationId });
      }
      if (e?.code === 'QUALITY_GATE_FAILED') {
        return this.fail({ code: 'QUALITY_GATE_FAILED', message: e.message, correlationId });
      }
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('policy.sanhab_result.failed', err, { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:set_unique_code', policyId });
      return this.fail({ code: 'INTERNAL_ERROR', message: 'Failed to record Sanhab result', correlationId });
    }
  }
}
