import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { PartyService, type ActorContext } from './party.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { auditLogger } from './audit.logger';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { PiiMaskingInterceptor } from './pii-masking.interceptor';

@Controller()
@UseInterceptors(PiiMaskingInterceptor)
export class PartyController {
  constructor(private readonly partyService: PartyService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private buildContext(req: any, correlationId: string): ActorContext {
    const user = req?.user || {};
    const tenantId = user.tenantId || user.tenant_id;
    if (!tenantId) {
      throw new Error('Tenant context is required');
    }
    return {
      tenantId,
      userId: user.userId || user.sub,
      roles: Array.isArray(user.roles) ? user.roles : [],
      correlationId,
    };
  }

  private handleError(error: any, correlationId: string) {
    auditLogger.error('controller.error', error instanceof Error ? error : new Error(String(error?.message || error)), { correlationId });
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Internal server error' },
      correlationId,
    };
  }

  @Post('/api/v1/parties')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('party:create')
  async create(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    auditLogger.info('party.create.request', { correlationId, tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'party:create' });

    if (!body?.type || !body?.fullName || !body?.nationalId) {
      auditLogger.warn('party.create.validation_failed', { correlationId, tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'party:create' });
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'type, fullName, nationalId are required' },
        correlationId,
      };
    }

    try {
      const party = await this.partyService.createParty(ctx, {
        type: body.type,
        fullName: body.fullName,
        nationalId: body.nationalId,
        mobile: body.mobile,
        organizationId: body.organizationId,
        roles: body.roles,
      });

      auditLogger.info('party.create.success', {
        correlationId,
        tenantId: ctx.tenantId,
        actorUserId: ctx.userId,
        action: 'party:create',
        partyId: party.partyId,
      });

      return {
        success: true,
        data: {
          partyId: party.partyId,
          type: party.type,
          fullName: party.fullName,
          status: party.status,
          organizationId: party.organizationId,
          createdAt: party.createdAt,
        },
        correlationId,
      };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  @Get('/api/v1/parties/:partyId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('party:view')
  async get(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    auditLogger.info('party.get.request', { correlationId, tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'party:view', partyId });

    try {
      const party = await this.partyService.getParty(ctx, partyId);
      if (!party) {
        auditLogger.warn('party.get.not_found', { correlationId, tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'party:view', partyId });
        return { success: false, error: { code: 'NOT_FOUND', message: 'Party not found' }, correlationId };
      }

      const kyc = await this.partyService.latestKyc(ctx, partyId);
      return { success: true, data: { party, kyc }, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  @Patch('/api/v1/parties/:partyId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('party:manage')
  async update(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    auditLogger.info('party.update.request', { correlationId, tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'party:update', partyId });

    try {
      const party = await this.partyService.updateParty(ctx, partyId, {
        fullName: body.fullName,
        mobile: body.mobile,
        status: body.status,
      });

      auditLogger.info('party.update.success', { correlationId, tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'party:update', partyId });

      return {
        success: true,
        data: {
          partyId: party.partyId,
          type: party.type,
          fullName: party.fullName,
          status: party.status,
          updatedAt: party.updatedAt,
        },
        correlationId,
      };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  @Get('/api/v1/parties')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('party:list')
  async list(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('nationalId') nationalId?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    auditLogger.info('party.list.request', { correlationId, tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'party:list' });

    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10);

    try {
      const { rows, total } = await this.partyService.listParties(ctx, {
        nationalId,
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
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  @Post('/party/:partyId/kyc/review')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:review')
  async review(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    auditLogger.info('kyc.review.request', { correlationId, tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'kyc:review', partyId });

    if (!body?.decision || !['approved', 'rejected'].includes(body.decision)) {
      auditLogger.warn('kyc.review.validation_failed', { correlationId, tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'kyc:review', partyId });
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'decision must be approved or rejected' },
        correlationId,
      };
    }

    try {
      const party = await this.partyService.getParty(ctx, partyId);
      if (!party) {
        auditLogger.warn('kyc.review.not_found', { correlationId, tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'kyc:review', partyId });
        return { success: false, error: { code: 'NOT_FOUND', message: 'Party not found' }, correlationId };
      }

      const review = await this.partyService.reviewKyc(ctx, {
        partyId,
        decision: body.decision,
        notes: body.notes,
        reviewerUserId: ctx.userId,
      });

      auditLogger.info('kyc.review.success', {
        correlationId,
        tenantId: ctx.tenantId,
        actorUserId: ctx.userId,
        action: 'kyc:review',
        partyId,
        status: review.status,
        kycReviewId: review.kycReviewId,
      });

      return { success: true, data: { partyId, kycReviewId: review.kycReviewId, status: review.status }, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  // KYC Workflow Endpoints
  @Post('/party/:partyId/kyc/documents')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:submit')
  async submitDocuments(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    if (!body?.documentTypes || !Array.isArray(body.documentTypes)) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'documentTypes array is required' }, correlationId };
    }

    try {
      const review = await this.partyService.submitDocuments(ctx, { partyId, documentTypes: body.documentTypes });
      return { success: true, data: { kycReviewId: review.kycReviewId, workflowStage: review.workflowStage, documentStatus: review.documentStatus }, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  @Post('/party/:partyId/kyc/documents/verify')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:verify')
  async verifyDocuments(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    if (!body?.decision || !['verified', 'rejected'].includes(body.decision)) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'decision must be verified or rejected' }, correlationId };
    }

    try {
      const review = await this.partyService.verifyDocuments(ctx, {
        partyId,
        decision: body.decision,
        reviewerUserId: ctx.userId,
        notes: body.notes,
      });
      return { success: true, data: { kycReviewId: review.kycReviewId, workflowStage: review.workflowStage, documentStatus: review.documentStatus }, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  @Post('/party/:partyId/kyc/aml-screening')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:screen')
  async runAmlScreening(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    try {
      const review = await this.partyService.runAmlScreening(ctx, {
        partyId,
        providerRequestId: body?.providerRequestId,
        idempotencyKey: body?.idempotencyKey || correlationId,
      });
      return {
        success: true,
        data: {
          kycReviewId: review.kycReviewId,
          workflowStage: review.workflowStage,
          riskLevel: review.riskLevel,
          riskScore: review.riskScore,
          riskFactors: review.riskFactors,
          amlScreeningStatus: review.amlScreeningStatus,
        },
        correlationId,
      };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  @Post('/party/:partyId/kyc/escalate')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:escalate')
  async escalateReview(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    if (!body?.reason || !body?.escalatedTo) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'reason and escalatedTo are required' }, correlationId };
    }

    try {
      const review = await this.partyService.escalateReview(ctx, {
        partyId,
        reason: body.reason,
        escalatedTo: body.escalatedTo,
        escalatedBy: ctx.userId,
      });
      return { success: true, data: { kycReviewId: review.kycReviewId, workflowStage: review.workflowStage, escalationReason: review.escalationReason }, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  @Get('/kyc/reviews')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:list')
  async listKycReviews(@Req() req: any, @Headers() headers: Record<string, any>, @Query('partyId') partyId?: string, @Query('status') status?: string, @Query('workflowStage') workflowStage?: string, @Query('limit') limit: string = '50', @Query('offset') offset: string = '0') {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);
    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);

    try {
      const result = await this.partyService.listKycReviews(ctx, {
        partyId,
        status,
        workflowStage,
        limit: Number.isFinite(lim) ? lim : 50,
        offset: Number.isFinite(off) ? off : 0,
      });
      return { success: true, data: result, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  // AML Consent Management Endpoints
  @Post('/party/:partyId/aml-consent/grant')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:review')
  async grantAmlConsent(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    if (!body?.consentType) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'consentType is required' }, correlationId };
    }

    try {
      const validTo = body.validTo ? new Date(body.validTo) : undefined;
      const party = await this.partyService.grantAmlConsent(ctx, {
        partyId,
        consentType: body.consentType,
        validTo,
        grantedBy: ctx.userId,
        purpose: body.purpose,
        legalBasis: body.legalBasis,
        channel: body.channel,
        evidence: body.evidence,
      });

      return { success: true, data: { partyId, amlConsentStatus: party.amlConsentStatus, amlConsentType: party.amlConsentType, amlConsentValidTo: party.amlConsentValidTo }, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  @Post('/party/:partyId/aml-consent/revoke')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:review')
  async revokeAmlConsent(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    try {
      const party = await this.partyService.revokeAmlConsent(ctx, {
        partyId,
        revokedBy: ctx.userId,
        reason: body.reason,
      });

      return { success: true, data: { partyId, amlConsentStatus: party.amlConsentStatus }, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  @Get('/party/:partyId/aml-consent/check')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('party:view')
  async checkAmlConsent(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    try {
      const result = await this.partyService.checkAmlConsent(ctx, partyId);
      return { success: true, data: result, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  @Get('/party/:partyId/aml-consent/history')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('party:view')
  async listConsentHistory(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string, @Query('consentType') consentType?: string) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    try {
      const result = await this.partyService.listConsentHistory(ctx, partyId, consentType);
      return { success: true, data: result, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  // Document Trust Chain Endpoints
  @Post('/party/:partyId/document-trust-chain')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:submit')
  async addToDocumentTrustChain(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    if (!body?.documentId || !body?.documentType || !body?.hash) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'documentId, documentType, and hash are required' }, correlationId };
    }

    try {
      const chainEntry = await this.partyService.addToDocumentTrustChain(ctx, {
        partyId,
        documentId: body.documentId,
        documentType: body.documentType,
        uploadedBy: ctx.userId || 'system',
        verificationMethod: body.verificationMethod || 'manual',
        hash: body.hash,
      });

      return { success: true, data: chainEntry, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  @Post('/party/:partyId/document-trust-chain/:documentId/verify')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:verify')
  async verifyDocumentInTrustChain(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string, @Param('documentId') documentId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    if (!body?.trustLevel) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'trustLevel is required' }, correlationId };
    }

    try {
      const chainEntry = await this.partyService.verifyDocumentInTrustChain(ctx, {
        partyId,
        documentId,
        verifiedBy: ctx.userId || 'system',
        trustLevel: body.trustLevel,
        reason: body.reason,
      });

      return { success: true, data: chainEntry, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  @Get('/party/:partyId/document-trust-chain')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:view')
  async getDocumentTrustChain(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    try {
      const chain = await this.partyService.getDocumentTrustChain(ctx, partyId);
      return { success: true, data: chain, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  // Identity Proofing Endpoints
  @Post('/party/:partyId/identity-proofing')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:screen')
  async performIdentityProofing(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    if (!body?.nationalId || !body?.faceImage || !body?.documentImage) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'nationalId, faceImage, and documentImage are required' }, correlationId };
    }

    try {
      const authToken = req?.headers?.authorization?.replace('Bearer ', '');
      const result = await this.partyService.performIdentityProofing(ctx, {
        partyId,
        nationalId: body.nationalId,
        faceImage: body.faceImage,
        documentImage: body.documentImage,
        proofingMethod: body.proofingMethod || 'ai',
        authToken,
      });

      return { success: true, data: result, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  @Get('/identity-proofing/:proofingId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:view')
  async getIdentityProofingResult(@Req() req: any, @Headers() headers: Record<string, any>, @Param('proofingId') proofingId: string) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    try {
      const result = await this.partyService.getIdentityProofingResult(ctx, proofingId);
      if (!result) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Identity proofing result not found' }, correlationId };
      }

      return { success: true, data: result, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  // External Verification Service Endpoints
  @Post('/party/:partyId/external-verification')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:screen')
  async requestExternalVerification(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    if (!body?.serviceType || !body?.requestPayload) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'serviceType and requestPayload are required' }, correlationId };
    }

    try {
      const authToken = req?.headers?.authorization?.replace('Bearer ', '');
      const request = await this.partyService.requestExternalVerification(ctx, {
        partyId,
        serviceType: body.serviceType,
        requestPayload: body.requestPayload,
        authToken,
        idempotencyKey: body.idempotencyKey || correlationId,
      });

      return { success: true, data: request, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  @Get('/external-verification/:requestId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:view')
  async getExternalVerificationRequest(@Req() req: any, @Headers() headers: Record<string, any>, @Param('requestId') requestId: string) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    try {
      const request = await this.partyService.getExternalVerificationRequest(ctx, requestId);
      if (!request) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'External verification request not found' }, correlationId };
      }

      return { success: true, data: request, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  // Exception Queue Endpoints
  @Post('/party/:partyId/kyc-exception')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:escalate')
  async raiseKycException(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    if (!body?.kycReviewId || !body?.exceptionType || !body?.severity || !body?.description) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'kycReviewId, exceptionType, severity, and description are required' }, correlationId };
    }

    try {
      const exception = await this.partyService.raiseKycException(ctx, {
        partyId,
        kycReviewId: body.kycReviewId,
        exceptionType: body.exceptionType,
        severity: body.severity,
        description: body.description,
        raisedBy: ctx.userId || 'system',
      });

      return { success: true, data: exception, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  @Post('/kyc-exception/:exceptionId/assign')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:review')
  async assignKycException(@Req() req: any, @Headers() headers: Record<string, any>, @Param('exceptionId') exceptionId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    if (!body?.assignedTo) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'assignedTo is required' }, correlationId };
    }

    try {
      const exception = await this.partyService.assignKycException(ctx, {
        exceptionId,
        assignedTo: body.assignedTo,
      });

      return { success: true, data: exception, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  @Post('/kyc-exception/:exceptionId/resolve')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:review')
  async resolveKycException(@Req() req: any, @Headers() headers: Record<string, any>, @Param('exceptionId') exceptionId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    if (!body?.resolutionNotes) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'resolutionNotes is required' }, correlationId };
    }

    try {
      const exception = await this.partyService.resolveKycException(ctx, {
        exceptionId,
        resolutionNotes: body.resolutionNotes,
        resolvedBy: ctx.userId || 'system',
      });

      return { success: true, data: exception, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  @Post('/kyc-exception/:exceptionId/escalate')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:escalate')
  async escalateKycException(@Req() req: any, @Headers() headers: Record<string, any>, @Param('exceptionId') exceptionId: string) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    try {
      const exception = await this.partyService.escalateKycException(ctx, { exceptionId });
      return { success: true, data: exception, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  @Get('/kyc-exceptions')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:list')
  async listKycExceptions(@Req() req: any, @Headers() headers: Record<string, any>, @Query('partyId') partyId?: string, @Query('status') status?: string, @Query('severity') severity?: string, @Query('limit') limit: string = '50', @Query('offset') offset: string = '0') {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);
    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);

    try {
      const result = await this.partyService.listKycExceptions(ctx, {
        partyId,
        status,
        severity,
        limit: Number.isFinite(lim) ? lim : 50,
        offset: Number.isFinite(off) ? off : 0,
      });

      return { success: true, data: result, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  // SLA Enforcement Endpoints
  @Get('/party/:partyId/sla-compliance')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:view')
  async checkSlaCompliance(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    try {
      const result = await this.partyService.checkSlaCompliance(ctx, partyId);
      return { success: true, data: result, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  @Get('/kyc/overdue-reviews')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:list')
  async getOverdueReviews(@Req() req: any, @Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    try {
      const reviews = await this.partyService.getOverdueReviews(ctx);
      return { success: true, data: reviews, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  // Issue 1.2: Link Party to Organization
  @Post('/party/:partyId/link-organization')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('party:update')
  async linkPartyToOrganization(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    if (!body?.organizationId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'organizationId is required' }, correlationId };
    }

    try {
      const party = await this.partyService.linkPartyToOrganization(ctx, partyId, body.organizationId);
      return { success: true, data: { partyId: party.partyId, organizationId: party.organizationId }, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  // Issue 2.1: Initiate broker-specific KYC workflow
  @Post('/party/:partyId/broker-kyc/initiate')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:review')
  async initiateBrokerKyc(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    try {
      const review = await this.partyService.initiateBrokerKyc(ctx, {
        partyId,
        licenseId: body?.licenseId,
      });
      return { success: true, data: review, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  // Issue 2.1: Update broker KYC check status
  @Post('/party/:partyId/broker-kyc/check')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:review')
  async updateBrokerKycCheck(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    if (!body?.checkType || !body?.status) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'checkType and status are required' }, correlationId };
    }

    try {
      const review = await this.partyService.updateBrokerKycCheck(ctx, {
        partyId,
        checkType: body.checkType,
        status: body.status,
        notes: body.notes,
      });
      return { success: true, data: review, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  // Issue 2.2: AML screening for commission transaction
  @Post('/party/:partyId/aml/commission-screening')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:screen')
  async screenCommissionTransaction(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    if (!body?.transactionId || body?.amount === undefined) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'transactionId and amount are required' }, correlationId };
    }

    try {
      const authToken = req?.headers?.authorization?.replace('Bearer ', '');
      const screening = await this.partyService.screenCommissionTransaction(ctx, {
        partyId,
        transactionId: body.transactionId,
        amount: body.amount,
        currency: body.currency,
        authToken,
      });
      return { success: true, data: screening, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  // Issue 2.3: AML screening for settlement batch
  @Post('/aml/settlement-batch-screening')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:screen')
  async screenSettlementBatch(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    if (!body?.batchId || !body?.items || !Array.isArray(body.items)) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'batchId and items array are required' }, correlationId };
    }

    try {
      const authToken = req?.headers?.authorization?.replace('Bearer ', '');
      const result = await this.partyService.screenSettlementBatch(ctx, {
        batchId: body.batchId,
        items: body.items,
        authToken,
      });
      return { success: true, data: result, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  // Issue 3.1: Cross-organization consent management
  @Post('/party/:partyId/cross-org-consent/grant')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:review')
  async grantCrossOrgConsent(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    if (!body?.sourceOrganizationId || !body?.targetOrganizationId || !body?.consentType || !body?.purpose) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'sourceOrganizationId, targetOrganizationId, consentType, and purpose are required' }, correlationId };
    }

    try {
      const validTo = body.validTo ? new Date(body.validTo) : undefined;
      const record = await this.partyService.grantCrossOrgConsent(ctx, {
        partyId,
        sourceOrganizationId: body.sourceOrganizationId,
        targetOrganizationId: body.targetOrganizationId,
        consentType: body.consentType,
        purpose: body.purpose,
        legalBasis: body.legalBasis,
        validTo,
        grantedBy: ctx.userId,
        channel: body.channel,
        evidence: body.evidence,
      });
      return { success: true, data: record, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  @Post('/party/:partyId/cross-org-consent/revoke')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:review')
  async revokeCrossOrgConsent(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    if (!body?.targetOrganizationId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'targetOrganizationId is required' }, correlationId };
    }

    try {
      const record = await this.partyService.revokeCrossOrgConsent(ctx, {
        partyId,
        targetOrganizationId: body.targetOrganizationId,
        consentType: body.consentType,
        revokedBy: ctx.userId,
        reason: body.reason,
      });
      return { success: true, data: record, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  @Get('/party/:partyId/cross-org-consent/check')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('party:view')
  async checkCrossOrgConsent(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string, @Query('targetOrganizationId') targetOrganizationId: string, @Query('consentType') consentType?: string) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    if (!targetOrganizationId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'targetOrganizationId is required' }, correlationId };
    }

    try {
      const result = await this.partyService.checkCrossOrgConsent(ctx, {
        partyId,
        targetOrganizationId,
        consentType,
      });
      return { success: true, data: result, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  // Issue 5.1: Bulk KYC review
  @Post('/kyc/bulk-review')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:review')
  async bulkReviewKyc(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    if (!body?.reviews || !Array.isArray(body.reviews) || body.reviews.length === 0) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'reviews array is required and must not be empty' }, correlationId };
    }

    try {
      const result = await this.partyService.bulkReviewKyc(ctx, {
        reviews: body.reviews,
        reviewerUserId: ctx.userId,
      });
      return { success: true, data: result, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  // Issue 5.2: Dedicated KYC history endpoint
  @Get('/party/:partyId/kyc-history')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:view')
  async getKycHistory(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string, @Query('limit') limit: string = '50', @Query('offset') offset: string = '0') {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    try {
      const result = await this.partyService.getKycHistory(ctx, partyId, {
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      });
      return { success: true, data: result, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  // Issue 5.3: Escalate KYC exception to organization level
  @Post('/kyc-exception/:exceptionId/escalate-to-organization')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('kyc:escalate')
  async escalateKycExceptionToOrganization(@Req() req: any, @Headers() headers: Record<string, any>, @Param('exceptionId') exceptionId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    if (!body?.organizationId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'organizationId is required' }, correlationId };
    }

    try {
      const exception = await this.partyService.escalateKycExceptionToOrganization(ctx, {
        exceptionId,
        organizationId: body.organizationId,
      });
      return { success: true, data: exception, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }

  // Issue 4.3: Get parties by organization (for sales-network sync)
  @Get('/organizations/:organizationId/parties')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('party:view')
  async getPartiesByOrganization(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('organizationId') organizationId: string,
    @Query('roleType') roleType?: string,
    @Query('status') status?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
  ) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = this.buildContext(req, correlationId);

    try {
      const result = await this.partyService.getPartiesByOrganization(ctx, organizationId, {
        roleType: roleType as any,
        status,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      });
      return { success: true, data: result, correlationId };
    } catch (error: any) {
      return this.handleError(error, correlationId);
    }
  }
}
