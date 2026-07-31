import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ClaimsService } from './claims.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { auditLogger } from './audit.logger';

@Controller()
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getIdempotencyKey(headers: Record<string, any>, body: any): string | undefined {
    const key = headers['x-idempotency-key'] || headers['Idempotency-Key'] || body?.idempotencyKey;
    if (typeof key === 'string' && key.length > 0) return key;
    return undefined;
  }

  private getUserInfo(req: any): { tenantId?: string; actor?: string; authorization?: string; organizationId?: string; roles?: string[] } {
    const user = req?.user || {};
    return {
      tenantId: user.tenantId || user.tenant_id,
      actor: user.userId || user.sub,
      organizationId: user.organizationId || user.organization_id,
      roles: Array.isArray(user.roles) ? user.roles : [],
    };
  }

  private getAuthorization(headers: Record<string, any>): string | undefined {
    return (headers['authorization'] || headers['Authorization']) as string | undefined;
  }

  private formatError(e: any, correlationId: string, fallbackMessage: string): any {
    const code = e?.code || 'INTERNAL_ERROR';
    const knownClientCodes = new Set([
      'VALIDATION_ERROR',
      'NOT_FOUND',
      'INVALID_STATE',
      'CROSS_TENANT_ACCESS_DENIED',
      'CONFLICT_OF_INTEREST',
      'AMOUNT_LIMIT_EXCEEDED',
      'AMOUNT_MISMATCH',
      'CURRENCY_MISMATCH',
      'POLICY_NOT_VALIDATED',
      'PAYMENT_REFERENCE_DUPLICATE',
      'IDEMPOTENCY_CONFLICT',
      'POLICY_NOT_FOUND',
      'POLICY_SERVICE_NOT_CONFIGURED',
      'SAGA_START_FAILED',
      'NO_DISTRIBUTION_AGREEMENT',
      'DUPLICATE_CLAIM',
    ]);
    return {
      success: false,
      error: {
        code: knownClientCodes.has(code) ? code : 'INTERNAL_ERROR',
        message: knownClientCodes.has(code) ? (e?.message || fallbackMessage) : fallbackMessage,
      },
      correlationId,
    };
  }

  @Post('/claims')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:register')
  async createClaim(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const { tenantId, actor } = this.getUserInfo(req);
    const idempotencyKey = this.getIdempotencyKey(headers, body);

    auditLogger.info('claims.create.request', {
      correlationId,
      tenantId,
      actor,
      action: 'claims:register',
    });

    if (!tenantId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'tenantId is required' }, correlationId };
    }

    if (!body?.policyId || !body?.claimantPartyId || !body?.lossDate || !body?.lossType) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: policyId, claimantPartyId, lossDate, lossType',
        },
        correlationId,
      };
    }

    try {
      const claim = await this.claimsService.createClaim({
        correlationId,
        tenantId,
        actorUserId: actor,
        policyId: body.policyId,
        policyNumber: body.policyNumber,
        claimantPartyId: body.claimantPartyId,
        brokerOrganizationId: body.brokerOrganizationId,
        distributionOrganizationId: body.distributionOrganizationId,
        carrierOrganizationId: body.carrierOrganizationId,
        recordOwnerOrganizationId: body.recordOwnerOrganizationId,
        authoritativeTenantId: body.authoritativeTenantId,
        representativePartyId: body.representativePartyId,
        claimType: body.claimType,
        notificationChannel: body.notificationChannel,
        lossDate: body.lossDate,
        lossType: body.lossType,
        description: body.description,
        idempotencyKey,
      });

      auditLogger.info('claims.create.success', {
        correlationId,
        tenantId,
        actor,
        action: 'claims:register',
        claimId: claim.claimId,
        policyId: claim.policyId,
      });

      return {
        success: true,
        data: {
          claimId: claim.claimId,
          claimNumber: claim.claimNumber,
          status: claim.status,
          createdAt: claim.createdAt,
        },
        correlationId,
      };
    } catch (e: any) {
      auditLogger.error('claims.create.failed', e, { correlationId, tenantId, actor, action: 'claims:register' });
      return this.formatError(e, correlationId, 'Failed to create claim');
    }
  }

  @Post('/claims/:claimId/assess')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:assess')
  async assess(@Headers() headers: Record<string, any>, @Req() req: any, @Param('claimId') claimId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const { tenantId, actor } = this.getUserInfo(req);
    auditLogger.info('claims.assess.request', { correlationId, tenantId, actor, action: 'claims:assess', claimId });

    if (typeof body?.assessedAmount !== 'number') {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'assessedAmount is required (number)' }, correlationId };
    }

    try {
      const claim = await this.claimsService.assessClaim({
        correlationId,
        tenantId,
        actorUserId: actor,
        claimId,
        assessedAmount: body.assessedAmount,
      });
      if (!claim) {
        return { success: false, error: { code: 'NOT_FOUND', message: `Claim with ID ${claimId} not found` }, correlationId };
      }

      auditLogger.info('claims.assess.success', { correlationId, tenantId, actor, action: 'claims:assess', claimId, status: claim.status });
      return { success: true, data: { claimId, status: claim.status }, correlationId };
    } catch (e: any) {
      auditLogger.error('claims.assess.failed', e, { correlationId, tenantId, actor, action: 'claims:assess', claimId });
      return this.formatError(e, correlationId, 'Failed to assess claim');
    }
  }

  @Post('/claims/:claimId/approve')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:approve')
  async approve(@Headers() headers: Record<string, any>, @Req() req: any, @Param('claimId') claimId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const { tenantId, actor } = this.getUserInfo(req);
    auditLogger.info('claims.approve.request', { correlationId, tenantId, actor, action: 'claims:approve', claimId });

    if (typeof body?.approvedAmount !== 'number') {
      auditLogger.warn('claims.approve.validation_failed', { correlationId, tenantId, actor, action: 'claims:approve', claimId });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'approvedAmount is required (number)' }, correlationId };
    }

    try {
      const claim = await this.claimsService.approveClaim({
        correlationId,
        claimId,
        approvedAmount: body.approvedAmount,
        currency: body.currency,
        authorization: this.getAuthorization(headers),
        tenantId,
        actorUserId: actor,
      });
      if (!claim) {
        auditLogger.warn('claims.approve.not_found', { correlationId, tenantId, actor, action: 'claims:approve', claimId });
        return { success: false, error: { code: 'NOT_FOUND', message: `Claim with ID ${claimId} not found` }, correlationId };
      }

      auditLogger.info('claims.approve.success', { correlationId, tenantId, actor, action: 'claims:approve', claimId, status: claim.status });
      return { success: true, data: { claimId, status: claim.status }, correlationId };
    } catch (e: any) {
      auditLogger.error('claims.approve.failed', e, { correlationId, tenantId, actor, action: 'claims:approve', claimId });
      return this.formatError(e, correlationId, 'Failed to approve claim');
    }
  }

  @Post('/claims/:claimId/reject')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:reject')
  async reject(@Headers() headers: Record<string, any>, @Req() req: any, @Param('claimId') claimId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const { tenantId, actor } = this.getUserInfo(req);
    auditLogger.info('claims.reject.request', { correlationId, tenantId, actor, action: 'claims:reject', claimId });

    if (!body?.reason) {
      auditLogger.warn('claims.reject.validation_failed', { correlationId, tenantId, actor, action: 'claims:reject', claimId });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'reason is required (string)' }, correlationId };
    }

    try {
      const claim = await this.claimsService.rejectClaim({
        correlationId,
        tenantId,
        actorUserId: actor,
        claimId,
        reason: body.reason,
      });
      if (!claim) {
        auditLogger.warn('claims.reject.not_found', { correlationId, tenantId, actor, action: 'claims:reject', claimId });
        return { success: false, error: { code: 'NOT_FOUND', message: `Claim with ID ${claimId} not found` }, correlationId };
      }

      auditLogger.info('claims.reject.success', { correlationId, tenantId, actor, action: 'claims:reject', claimId, status: claim.status });
      return { success: true, data: { claimId, status: claim.status }, correlationId };
    } catch (e: any) {
      auditLogger.error('claims.reject.failed', e, { correlationId, tenantId, actor, action: 'claims:reject', claimId });
      return this.formatError(e, correlationId, 'Failed to reject claim');
    }
  }

  @Post('/claims/:claimId/pay')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:pay')
  async pay(@Headers() headers: Record<string, any>, @Req() req: any, @Param('claimId') claimId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const { tenantId, actor } = this.getUserInfo(req);
    auditLogger.info('claims.pay.request', { correlationId, tenantId, actor, action: 'claims:pay', claimId });

    if (typeof body?.paidAmount !== 'number') {
      auditLogger.warn('claims.pay.validation_failed', { correlationId, tenantId, actor, action: 'claims:pay', claimId });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'paidAmount is required (number)' }, correlationId };
    }

    try {
      const claim = await this.claimsService.payClaim({
        correlationId,
        tenantId,
        actorUserId: actor,
        claimId,
        paidAmount: body.paidAmount,
        paymentReference: body.paymentReference,
      });
      if (!claim) {
        auditLogger.warn('claims.pay.not_found', { correlationId, tenantId, actor, action: 'claims:pay', claimId });
        return { success: false, error: { code: 'NOT_FOUND', message: `Claim with ID ${claimId} not found` }, correlationId };
      }

      auditLogger.info('claims.pay.success', { correlationId, tenantId, actor, action: 'claims:pay', claimId, status: claim.status });
      return { success: true, data: { claimId, status: claim.status }, correlationId };
    } catch (e: any) {
      auditLogger.error('claims.pay.failed', e, { correlationId, tenantId, actor, action: 'claims:pay', claimId });
      return this.formatError(e, correlationId, 'Failed to pay claim');
    }
  }

  @Post('/claims/:claimId/close')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:close')
  async close(@Headers() headers: Record<string, any>, @Req() req: any, @Param('claimId') claimId: string) {
    const correlationId = this.getCorrelationId(headers);
    const { tenantId, actor } = this.getUserInfo(req);
    auditLogger.info('claims.close.request', { correlationId, tenantId, actor, action: 'claims:close', claimId });

    try {
      const claim = await this.claimsService.closeClaim({
        correlationId,
        tenantId,
        actorUserId: actor,
        claimId,
      });
      if (!claim) {
        auditLogger.warn('claims.close.not_found', { correlationId, tenantId, actor, action: 'claims:close', claimId });
        return { success: false, error: { code: 'NOT_FOUND', message: `Claim with ID ${claimId} not found` }, correlationId };
      }

      auditLogger.info('claims.close.success', { correlationId, tenantId, actor, action: 'claims:close', claimId, status: claim.status });
      return { success: true, data: { claimId, status: claim.status }, correlationId };
    } catch (e: any) {
      auditLogger.error('claims.close.failed', e, { correlationId, tenantId, actor, action: 'claims:close', claimId });
      return this.formatError(e, correlationId, 'Failed to close claim');
    }
  }

  @Post('/claims/:claimId/refer-to-adjuster')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:refer_adjuster')
  async referToAdjuster(@Headers() headers: Record<string, any>, @Req() req: any, @Param('claimId') claimId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const { tenantId, actor } = this.getUserInfo(req);
    auditLogger.info('claims.refer_to_adjuster.request', { correlationId, tenantId, actor, action: 'claims:refer_adjuster', claimId });

    if (!body?.adjusterId || !body?.reason) {
      auditLogger.warn('claims.refer_to_adjuster.validation_failed', { correlationId, tenantId, actor, action: 'claims:refer_adjuster', claimId });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'adjusterId and reason are required' }, correlationId };
    }

    try {
      const claim = await this.claimsService.referToAdjuster({
        correlationId,
        tenantId,
        actorUserId: actor,
        claimId,
        adjusterId: body.adjusterId,
        reason: body.reason,
      });
      if (!claim) {
        auditLogger.warn('claims.refer_to_adjuster.not_found', { correlationId, tenantId, actor, action: 'claims:refer_adjuster', claimId });
        return { success: false, error: { code: 'NOT_FOUND', message: `Claim with ID ${claimId} not found` }, correlationId };
      }

      auditLogger.info('claims.refer_to_adjuster.success', { correlationId, tenantId, actor, action: 'claims:refer_adjuster', claimId, status: claim.status });
      return { success: true, data: { claimId, status: claim.status, adjusterId: body.adjusterId }, correlationId };
    } catch (e: any) {
      auditLogger.error('claims.refer_to_adjuster.failed', e, { correlationId, tenantId, actor, action: 'claims:refer_adjuster', claimId });
      return this.formatError(e, correlationId, 'Failed to refer claim to adjuster');
    }
  }

  @Get('/claims/:claimId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:view')
  async get(@Headers() headers: Record<string, any>, @Req() req: any, @Param('claimId') claimId: string) {
    const correlationId = this.getCorrelationId(headers);
    const { tenantId, organizationId, roles } = this.getUserInfo(req);
    const claim = await this.claimsService.getClaim({ claimId, tenantId, organizationId, roles });
    if (!claim) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: `Claim with ID ${claimId} not found` },
        correlationId,
      };
    }

    return { success: true, data: claim, correlationId };
  }

  @Patch('/claims/:claimId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:edit')
  async updateClaim(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('claimId') claimId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const { tenantId, actor } = this.getUserInfo(req);

    try {
      const claim = await this.claimsService.updateClaim({
        correlationId,
        tenantId,
        actorUserId: actor,
        claimId,
        updates: body,
      });

      if (!claim) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: `Claim with ID ${claimId} not found` },
          correlationId,
        };
      }

      return { success: true, data: claim, correlationId };
    } catch (e: any) {
      return {
        success: false,
        error: { code: e.code || 'INTERNAL_ERROR', message: e.message },
        correlationId,
      };
    }
  }

  @Get('/claims')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:list')
  async list(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Query('policyId') policyId?: string,
    @Query('status') status?: string,
    @Query('limit') limit: string = '20',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const { tenantId, organizationId, roles } = this.getUserInfo(req);

    const lim = Math.min(parseInt(limit, 10) || 20, 200);
    const off = parseInt(offset, 10);

    const { rows, total } = await this.claimsService.listClaims({
      tenantId,
      policyId,
      status,
      limit: Number.isFinite(lim) ? lim : 20,
      offset: Number.isFinite(off) ? off : 0,
      organizationId,
      roles,
    });

    return {
      success: true,
      data: rows,
      pagination: {
        total,
        limit: Number.isFinite(lim) ? lim : 20,
        offset: Number.isFinite(off) ? off : 0,
      },
      correlationId,
    };
  }

  @Post('/claims/:claimId/calculate-deductible')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:assess')
  async calculateDeductible(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('claimId') claimId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const { tenantId, actor } = this.getUserInfo(req);
    auditLogger.info('claims.calculate_deductible.request', { correlationId, tenantId, actor, action: 'claims:assess', claimId });

    if (typeof body?.grossClaimAmount !== 'number') {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'grossClaimAmount is required (number)' }, correlationId };
    }

    try {
      const result = await this.claimsService.calculateDeductible({
        claimId,
        tenantId,
        grossClaimAmount: body.grossClaimAmount,
        deductibleAmount: body.deductibleAmount,
        deductiblePercentage: body.deductiblePercentage,
        franchiseAmount: body.franchiseAmount,
        franchisePercentage: body.franchisePercentage,
      });
      auditLogger.info('claims.calculate_deductible.success', { correlationId, tenantId, actor, action: 'claims:assess', claimId });
      return { success: true, data: result, correlationId };
    } catch (e: any) {
      auditLogger.error('claims.calculate_deductible.failed', e, { correlationId, tenantId, actor, action: 'claims:assess', claimId });
      return this.formatError(e, correlationId, 'Failed to calculate deductible');
    }
  }

  @Get('/claims/fnol/form-defaults')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:register')
  async getFnolFormDefaults(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Query('policyId') policyId: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const { tenantId, actor } = this.getUserInfo(req);
    auditLogger.info('claims.fnol.form_defaults.request', {
      correlationId,
      tenantId,
      actor,
      action: 'claims:register',
      policyId,
    });

    if (!policyId) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'policyId is required' },
        correlationId,
      };
    }

    try {
      const defaults = await this.claimsService.getFnolFormDefaults({
        correlationId,
        tenantId,
        policyId,
        authorization: this.getAuthorization(headers),
      });
      auditLogger.info('claims.fnol.form_defaults.success', {
        correlationId,
        tenantId,
        actor,
        action: 'claims:register',
        policyId,
      });

      return { success: true, data: defaults, correlationId };
    } catch (e: any) {
      auditLogger.error('claims.fnol.form_defaults.failed', e, {
        correlationId,
        tenantId,
        actor,
        action: 'claims:register',
        policyId,
      });
      return this.formatError(e, correlationId, 'Failed to get FNOL form defaults');
    }
  }

  @Post('/claims/fnol')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:register')
  async createFnolClaim(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const { tenantId, actor } = this.getUserInfo(req);
    auditLogger.info('claims.fnol.create.request', {
      correlationId,
      tenantId,
      actor,
      action: 'claims:register',
    });

    if (!tenantId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'tenantId is required' }, correlationId };
    }

    if (!body?.policyId || !body?.claimantPartyId || !body?.lossDate || !body?.lossType || !body?.notificationChannel) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: policyId, claimantPartyId, lossDate, lossType, notificationChannel',
        },
        correlationId,
      };
    }

    try {
      const claim = await this.claimsService.createFnolClaim({
        correlationId,
        tenantId,
        actorUserId: actor,
        policyId: body.policyId,
        claimantPartyId: body.claimantPartyId,
        lossDate: body.lossDate,
        lossType: body.lossType,
        description: body.description,
        notificationChannel: body.notificationChannel,
        notificationSource: body.notificationSource,
        contactPhone: body.contactPhone,
        contactEmail: body.contactEmail,
        locationAddress: body.locationAddress,
        locationCity: body.locationCity,
        locationProvince: body.locationProvince,
        witnesses: body.witnesses,
        attachedDocuments: body.attachedDocuments,
      });

      auditLogger.info('claims.fnol.create.success', {
        correlationId,
        tenantId,
        actor,
        action: 'claims:register',
        claimId: claim.claimId,
        policyId: claim.policyId,
        autoTriageCategory: claim.autoTriageCategory,
        autoTriageScore: claim.autoTriageScore,
      });

      return {
        success: true,
        data: {
          claimId: claim.claimId,
          claimNumber: claim.claimNumber,
          status: claim.status,
          autoTriageCategory: claim.autoTriageCategory,
          autoTriageScore: claim.autoTriageScore,
          requiresHumanTriage: claim.requiresHumanTriage,
          createdAt: claim.createdAt,
        },
        correlationId,
      };
    } catch (e: any) {
      auditLogger.error('claims.fnol.create.failed', e, {
        correlationId,
        tenantId,
        actor,
        action: 'claims:register',
      });
      return this.formatError(e, correlationId, 'Failed to create FNOL claim');
    }
  }

  @Post('/claims/:claimId/validate-policy')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:assess')
  async validatePolicyForClaim(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('claimId') claimId: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const { tenantId, actor } = this.getUserInfo(req);
    auditLogger.info('claims.validate_policy.request', { correlationId, tenantId, actor, action: 'claims:assess', claimId });

    try {
      const result = await this.claimsService.validatePolicyForClaim({
        correlationId,
        tenantId,
        claimId,
        authorization: this.getAuthorization(headers),
      });
      auditLogger.info('claims.validate_policy.success', { correlationId, tenantId, actor, action: 'claims:assess', claimId, valid: result.valid });
      return { success: true, data: result, correlationId };
    } catch (e: any) {
      auditLogger.error('claims.validate_policy.failed', e, { correlationId, tenantId, actor, action: 'claims:assess', claimId });
      return this.formatError(e, correlationId, 'Failed to validate policy');
    }
  }

  @Post('/claims/:claimId/acknowledge')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:view')
  async acknowledgeClaim(@Headers() headers: Record<string, any>, @Req() req: any, @Param('claimId') claimId: string) {
    const correlationId = this.getCorrelationId(headers);
    const { tenantId, actor } = this.getUserInfo(req);

    try {
      const claim = await this.claimsService.acknowledgeClaim({ correlationId, tenantId, actorUserId: actor, claimId });
      if (!claim) return { success: false, error: { code: 'NOT_FOUND', message: `Claim ${claimId} not found` }, correlationId };
      return { success: true, data: { claimId, status: claim.status }, correlationId };
    } catch (e: any) {
      return this.formatError(e, correlationId, 'Failed to acknowledge claim');
    }
  }

  @Post('/claims/:claimId/submit-to-carrier')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:register')
  async submitToCarrier(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('claimId') claimId: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const { tenantId, actor } = this.getUserInfo(req);

    try {
      const claim = await this.claimsService.submitClaimToCarrier({
        correlationId,
        tenantId,
        actorUserId: actor,
        claimId,
        externalClaimId: body.externalClaimId,
      });
      if (!claim) return { success: false, error: { code: 'NOT_FOUND', message: `Claim ${claimId} not found` }, correlationId };
      return { success: true, data: { claimId, status: claim.status, externalClaimId: claim.externalClaimId }, correlationId };
    } catch (e: any) {
      return this.formatError(e, correlationId, 'Failed to submit claim to carrier');
    }
  }

  @Post('/claims/:claimId/appeal')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:reject')
  async appealClaim(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('claimId') claimId: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const { tenantId, actor } = this.getUserInfo(req);

    if (!body?.reason) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'reason is required' }, correlationId };
    }

    try {
      const claim = await this.claimsService.appealClaim({
        correlationId,
        tenantId,
        actorUserId: actor,
        claimId,
        reason: body.reason,
      });
      if (!claim) return { success: false, error: { code: 'NOT_FOUND', message: `Claim ${claimId} not found` }, correlationId };
      return { success: true, data: { claimId, status: claim.status }, correlationId };
    } catch (e: any) {
      return this.formatError(e, correlationId, 'Failed to appeal claim');
    }
  }

  @Get('/claims/:claimId/history')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:view')
  async getClaimHistory(@Headers() headers: Record<string, any>, @Req() req: any, @Param('claimId') claimId: string) {
    const correlationId = this.getCorrelationId(headers);
    const { tenantId, organizationId, roles } = this.getUserInfo(req);

    try {
      const claim = await this.claimsService.getClaim({ claimId, tenantId, organizationId, roles });
      if (!claim) return { success: false, error: { code: 'NOT_FOUND', message: `Claim ${claimId} not found` }, correlationId };
      const history = this.claimsService.getClaimHistory(claim);
      return { success: true, data: { claimId, history }, correlationId };
    } catch (e: any) {
      return this.formatError(e, correlationId, 'Failed to get claim history');
    }
  }
}
