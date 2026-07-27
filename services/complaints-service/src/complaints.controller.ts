import { Body, Controller, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { auditLogger } from './audit.logger';
import { ComplaintsService } from './complaints.service';
import type { ComplaintStatus, ComplaintType } from './entities/Complaint';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';

@Controller()
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  @Get('/health')
  health() {
    return { status: 'ok', service: 'complaints-service' };
  }

  @Post('/complaints')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('complaints:create')
  async create(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('complaints.create.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'complaints:create',
    });

    const complaintType = body?.complaintType as ComplaintType | undefined;
    const description = body?.description as string | undefined;
    if (!complaintType || typeof description !== 'string' || description.length === 0) {
      auditLogger.warn('complaints.create.validation_failed', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'complaints:create',
      });
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'complaintType and description are required' },
        correlationId,
      };
    }

    const c = await this.complaintsService.createComplaint({
      complaintType,
      description,
      policyCompanyName: body?.policyCompanyName,
      policyNumber: body?.policyNumber,
      policyTitle: body?.policyTitle,
      policyId: body?.policyId,
      claimId: body?.claimId,
      complainantNationalId: body?.complainantNationalId,
      complainantBirthDate: body?.complainantBirthDate,
      complainantMobile: body?.complainantMobile,
      complainantAddress: body?.complainantAddress,
      complainantRepresentativeStatus: body?.complainantRepresentativeStatus,
      assignedTo: body?.assignedTo,
      createdBy: actor?.userId,
      audit: { correlationId, tenantId, actorUserId: actor?.userId },
    });

    auditLogger.info('complaints.create.success', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'complaints:create',
      complaintId: c.complaintId,
    });

    return { success: true, data: c, correlationId };
  }

  @Post('/complaints/:complaintId/escalate')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('complaints:escalate')
  async escalate(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('complaintId') complaintId: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    const escalatedReason = body?.reason;
    if (typeof escalatedReason !== 'string' || escalatedReason.trim().length === 0) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'reason is required' },
        correlationId,
      };
    }

    auditLogger.info('complaints.escalate.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'complaints:escalate',
      complaintId,
    });

    const c = await this.complaintsService.escalateComplaint({
      complaintId,
      escalatedReason: escalatedReason.trim(),
      escalatedBy: actor?.userId || 'unknown',
      assignedTo: body?.assignedTo,
      audit: { correlationId, tenantId, actorUserId: actor?.userId },
    });

    if (!c) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Complaint not found' }, correlationId };
    }

    return { success: true, data: c, correlationId };
  }

  @Get('/complaints/:complaintId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('complaints:view')
  async get(@Req() req: any, @Headers() headers: Record<string, any>, @Param('complaintId') complaintId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('complaints.get.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'complaints:view',
      complaintId,
    });

    const c = await this.complaintsService.getComplaint(complaintId);
    if (!c) {
      auditLogger.warn('complaints.get.not_found', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'complaints:view',
        complaintId,
      });
      return { success: false, error: { code: 'NOT_FOUND', message: 'Complaint not found' }, correlationId };
    }

    const attachments = await this.complaintsService.listAttachments(complaintId);

    return { success: true, data: { complaint: c, attachments }, correlationId };
  }

  @Get('/complaints')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('complaints:list')
  async list(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('status') status?: string,
    @Query('complaintType') complaintType?: string,
    @Query('policyNumber') policyNumber?: string,
    @Query('claimId') claimId?: string,
    @Query('complainantNationalId') complainantNationalId?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('complaints.list.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'complaints:list',
    });

    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10);

    const { rows, total } = await this.complaintsService.listComplaints({
      status,
      complaintType,
      policyNumber,
      claimId,
      complainantNationalId,
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

  @Get('/complaints/dashboard')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('complaints:dashboard')
  async dashboard(@Req() req: any, @Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('complaints.dashboard.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'complaints:dashboard',
    });

    try {
      const data = await this.complaintsService.getDashboard({ now: new Date() });
      return { success: true, data, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('complaints.dashboard.failed', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'complaints:dashboard',
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to load complaints dashboard' }, correlationId };
    }
  }

  @Post('/complaints/:complaintId/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('complaints:update_status')
  async updateStatus(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('complaintId') complaintId: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    const status = body?.status as ComplaintStatus | undefined;
    if (!status || typeof status !== 'string') {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'status is required' },
        correlationId,
      };
    }

    auditLogger.info('complaints.update_status.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'complaints:update_status',
      complaintId,
      status,
    });

    const c = await this.complaintsService.updateStatus({
      complaintId,
      status,
      resolutionSummary: body?.resolutionSummary,
      audit: { correlationId, tenantId, actorUserId: actor?.userId },
    });

    if (!c) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Complaint not found' }, correlationId };
    }

    return { success: true, data: c, correlationId };
  }

  @Post('/complaints/:complaintId/attachments')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('complaints:attach_document')
  async attach(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('complaintId') complaintId: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    const documentId = body?.documentId as string | undefined;
    if (!documentId || typeof documentId !== 'string' || documentId.length === 0) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'documentId is required' },
        correlationId,
      };
    }

    auditLogger.info('complaints.attach_document.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'complaints:attach_document',
      complaintId,
      documentId,
    });

    const c = await this.complaintsService.getComplaint(complaintId);
    if (!c) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Complaint not found' }, correlationId };
    }

    const a = await this.complaintsService.attachDocument({
      complaintId,
      documentId,
      notes: body?.notes,
      createdBy: actor?.userId,
      audit: { correlationId, tenantId, actorUserId: actor?.userId },
    });

    return { success: true, data: a, correlationId };
  }

  @Post('/complaints/:complaintId/mobile/otp/request')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('complaints:otp_request')
  async requestMobileOtp(@Req() req: any, @Headers() headers: Record<string, any>, @Param('complaintId') complaintId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('complaints.mobile_otp.request.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'complaints:otp_request',
      complaintId,
    });

    try {
      const r = await this.complaintsService.requestComplaintMobileOtp({
        complaintId,
        requestedBy: actor?.userId ?? null,
        audit: { correlationId, tenantId, actorUserId: actor?.userId },
      });
      return { success: true, data: r, correlationId };
    } catch (e: any) {
      const code = e?.code || 'INTERNAL_ERROR';
      const msg = e?.message || 'Failed to request OTP';
      return { success: false, error: { code, message: msg }, correlationId };
    }
  }

  @Post('/complaints/:complaintId/mobile/otp/verify')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('complaints:otp_verify')
  async verifyMobileOtp(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('complaintId') complaintId: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;
    const code = body?.code;

    if (typeof code !== 'string' || code.trim().length === 0) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'code is required' }, correlationId };
    }

    auditLogger.info('complaints.mobile_otp.verify.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'complaints:otp_verify',
      complaintId,
    });

    try {
      const c = await this.complaintsService.verifyComplaintMobileOtp({
        complaintId,
        code: code.trim(),
        verifiedBy: actor?.userId ?? null,
        audit: { correlationId, tenantId, actorUserId: actor?.userId },
      });
      return { success: true, data: { complaintId: c.complaintId, complainantMobileVerified: c.complainantMobileVerified, complainantMobileVerifiedAt: c.complainantMobileVerifiedAt }, correlationId };
    } catch (e: any) {
      const errCode = e?.code || 'INTERNAL_ERROR';
      const msg = e?.message || 'Failed to verify OTP';
      return { success: false, error: { code: errCode, message: msg }, correlationId };
    }
  }

  @Get('/complaints/:complaintId/export/central-insurance')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('complaints:export')
  async exportCentralInsurance(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('complaintId') complaintId: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('complaints.export_central_insurance.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'complaints:export',
      complaintId,
    });

    const c = await this.complaintsService.getComplaint(complaintId);
    if (!c) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Complaint not found' }, correlationId };
    }

    if (!c.complainantMobileVerified) {
      auditLogger.warn('complaints.export_central_insurance.mobile_not_verified', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'complaints:export',
        complaintId,
      });
      return {
        success: false,
        error: { code: 'MOBILE_NOT_VERIFIED', message: 'complainantMobile must be verified for central insurance export' },
        correlationId,
      };
    }

    const missingFields: string[] = [];
    // Required fields per roadmap (Phase 2 / central insurance path)
    if (!c.complaintType) missingFields.push('complaintType');
    if (!c.description || c.description.trim().length === 0) missingFields.push('description');
    if (!c.policyCompanyName || c.policyCompanyName.trim().length === 0) missingFields.push('policyCompanyName');
    if (!c.policyNumber || c.policyNumber.trim().length === 0) missingFields.push('policyNumber');
    if (!c.policyTitle || c.policyTitle.trim().length === 0) missingFields.push('policyTitle');
    if (!c.complainantNationalId || c.complainantNationalId.trim().length === 0) missingFields.push('complainantNationalId');
    if (!c.complainantBirthDate || String(c.complainantBirthDate).trim().length === 0) missingFields.push('complainantBirthDate');
    if (!c.complainantMobile || c.complainantMobile.trim().length === 0) missingFields.push('complainantMobile');
    if (!c.complainantAddress || c.complainantAddress.trim().length === 0) missingFields.push('complainantAddress');
    if (!c.complainantRepresentativeStatus || c.complainantRepresentativeStatus.trim().length === 0)
      missingFields.push('complainantRepresentativeStatus');

    if (missingFields.length > 0) {
      auditLogger.warn('complaints.export_central_insurance.validation_failed', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'complaints:export',
        complaintId,
        missingFields,
      });
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Missing required fields for central insurance export', missingFields },
        correlationId,
      };
    }

    const attachments = await this.complaintsService.listAttachments(complaintId);

    const payload = {
      schemaVersion: 'central-insurance-complaint-v1',
      complaint: {
        complaintId: c.complaintId,
        type: c.complaintType,
        status: c.status,
        createdAt: c.createdAt,
        description: c.description,
      },
      policy: {
        companyName: c.policyCompanyName,
        policyNumber: c.policyNumber,
        policyTitle: c.policyTitle,
        policyId: c.policyId,
      },
      claim: {
        claimId: c.claimId,
      },
      complainant: {
        nationalId: c.complainantNationalId,
        birthDate: c.complainantBirthDate,
        mobile: c.complainantMobile,
        mobileVerified: c.complainantMobileVerified,
        mobileVerifiedAt: c.complainantMobileVerifiedAt,
        address: c.complainantAddress,
        representativeStatus: c.complainantRepresentativeStatus,
      },
      evidence: {
        attachments: attachments.map((a) => ({
          documentId: a.documentId,
          notes: a.notes,
          createdAt: a.createdAt,
        })),
      },
      internal: {
        assignedTo: c.assignedTo,
        firstResponseAt: c.firstResponseAt,
        resolvedAt: c.resolvedAt,
        escalatedAt: c.escalatedAt,
        resolutionSummary: c.resolutionSummary,
        createdBy: c.createdBy,
        tenantId,
        exportedBy: actor?.userId || null,
        exportedAt: new Date(),
      },
    };

    return { success: true, data: payload, correlationId };
  }

  // Recurring causes analysis endpoints
  @Get('/complaints/analysis/recurring-causes')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('complaints:view')
  async analyzeRecurringCauses(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('complaintType') complaintType?: string,
    @Query('minOccurrences') minOccurrences?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('complaints.analysis.recurring_causes.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'complaints:view',
    });

    try {
      const result = await this.complaintsService.analyzeRecurringCauses({
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        complaintType: complaintType as any,
        minOccurrences: minOccurrences ? parseInt(minOccurrences, 10) : undefined,
      });

      auditLogger.info('complaints.analysis.recurring_causes.success', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'complaints:view',
        causesFound: result.causes.length,
      });

      return { success: true, data: result, correlationId };
    } catch (e: any) {
      auditLogger.warn('complaints.analysis.recurring_causes.error', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'complaints:view',
        error: e?.message,
      });
      return { success: false, error: { code: e?.code || 'INTERNAL_ERROR', message: e?.message || 'Analysis failed' }, correlationId };
    }
  }

  @Get('/complaints/analysis/cause-trends')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('complaints:view')
  async getCauseTrends(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('cause') cause: string,
    @Query('days') days?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('complaints.analysis.cause_trends.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'complaints:view',
      cause,
    });

    if (!cause || cause.trim().length === 0) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'cause parameter is required' }, correlationId };
    }

    try {
      const result = await this.complaintsService.getCauseTrends({
        cause,
        days: days ? parseInt(days, 10) : undefined,
      });

      auditLogger.info('complaints.analysis.cause_trends.success', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'complaints:view',
        cause,
      });

      return { success: true, data: result, correlationId };
    } catch (e: any) {
      auditLogger.warn('complaints.analysis.cause_trends.error', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'complaints:view',
        cause,
        error: e?.message,
      });
      return { success: false, error: { code: e?.code || 'INTERNAL_ERROR', message: e?.message || 'Trend analysis failed' }, correlationId };
    }
  }

  // Central Insurance endpoints
  @Post('/complaints/:complaintId/central-insurance/send')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('complaints:manage')
  async sendToCentralInsurance(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('complaintId') complaintId: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('complaints.central_insurance.send.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'complaints:manage',
      complaintId,
    });

    try {
      const result = await this.complaintsService.sendToCentralInsurance({
        complaintId,
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
      });

      auditLogger.info('complaints.central_insurance.send.result', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'complaints:manage',
        complaintId,
        success: result.success,
      });

      return { success: result.success, data: result, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('complaints.central_insurance.send.error', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'complaints:manage',
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to send to Central Insurance' }, correlationId };
    }
  }

  @Get('/complaints/:complaintId/central-insurance/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('complaints:view')
  async getCentralInsuranceStatus(
    @Headers() headers: Record<string, any>,
    @Param('complaintId') complaintId: string
  ) {
    const correlationId = this.getCorrelationId(headers);

    auditLogger.info('complaints.central_insurance.status.request', {
      correlationId,
      action: 'complaints:view',
      complaintId,
    });

    const status = await this.complaintsService.getCentralInsuranceStatus({ complaintId });

    return { success: true, data: status, correlationId };
  }

  @Post('/complaints/:complaintId/central-insurance/retry')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('complaints:manage')
  async retryCentralInsuranceSend(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('complaintId') complaintId: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('complaints.central_insurance.retry.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'complaints:manage',
      complaintId,
    });

    try {
      const result = await this.complaintsService.retryFailedCentralInsuranceSend({
        complaintId,
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
      });

      auditLogger.info('complaints.central_insurance.retry.result', {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'complaints:manage',
        complaintId,
        success: result.success,
      });

      return { success: result.success, data: result, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('complaints.central_insurance.retry.error', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'complaints:manage',
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to retry send to Central Insurance' }, correlationId };
    }
  }
}
