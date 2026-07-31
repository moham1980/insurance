import { Controller, Post, Body, Param, Headers, Get, Query, UseGuards, Request } from '@nestjs/common';
import { CustomerPortalService } from './customer-portal.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { PermissionsGuard } from './permissions.guard';

@Controller('customer-portal')
export class CustomerPortalController {
  constructor(private readonly service: CustomerPortalService) {}

  @Post('otp/initiate')
  async initiateOtp(
    @Headers() headers: Record<string, any>,
    @Body() body: {
      tenantId: string;
      phoneNumber: string;
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const result = await this.service.initiateOtpLogin({
      tenantId: body.tenantId,
      phoneNumber: body.phoneNumber,
    });
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Post('otp/verify')
  async verifyOtp(
    @Headers() headers: Record<string, any>,
    @Body() body: {
      sessionId: string;
      otp: string;
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const result = await this.service.verifyOtp({
      sessionId: body.sessionId,
      otp: body.otp,
    });
    return {
      success: result.success,
      data: result.success ? { customerId: result.customerId, token: result.token } : null,
      error: result.error,
      correlationId,
    };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Get('session/:sessionId')
  async getSession(@Param('sessionId') sessionId: string) {
    const result = await this.service.getSession(sessionId);
    if (!result) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Session not found' },
      };
    }
    return {
      success: true,
      data: result,
    };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Post('session/:sessionId/revoke')
  async revokeSession(@Param('sessionId') sessionId: string) {
    await this.service.revokeSession(sessionId);
    return {
      success: true,
      data: { revoked: true },
    };
  }

  // BFF Endpoints for authenticated customers
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Get('kyc-status')
  async getKycStatus(@Request() req, @Headers() headers: Record<string, any>) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;

    const authToken = req.headers?.authorization?.replace('Bearer ', '');
    const result = await this.service.getKycStatus(customerId, tenantId, authToken);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Get('policies')
  async getPolicies(
    @Request() req,
    @Headers() headers: Record<string, any>,
    @Query('brokerOrganizationId') brokerOrganizationId?: string,
  ) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;

    const authToken = req.headers?.authorization?.replace('Bearer ', '');
    const result = await this.service.getPoliciesForCustomer(customerId, tenantId, authToken, brokerOrganizationId);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Get('policies/:policyId')
  async getPolicy(@Param('policyId') policyId: string, @Request() req, @Headers() headers: Record<string, any>) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;

    const authToken = req.headers?.authorization?.replace('Bearer ', '');
    const result = await this.service.getPolicyForCustomer(policyId, customerId, tenantId, authToken);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Get('claims')
  async getClaims(@Request() req, @Headers() headers: Record<string, any>) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;

    const authToken = req.headers?.authorization?.replace('Bearer ', '');
    const result = await this.service.getClaimsForCustomer(customerId, tenantId, authToken);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Get('claims/:claimId')
  async getClaim(@Param('claimId') claimId: string, @Request() req, @Headers() headers: Record<string, any>) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;

    const authToken = req.headers?.authorization?.replace('Bearer ', '');
    const result = await this.service.getClaimForCustomer(claimId, customerId, tenantId, authToken);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Get('payments')
  async getPayments(@Request() req, @Headers() headers: Record<string, any>) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;

    const authToken = req.headers?.authorization?.replace('Bearer ', '');
    const result = await this.service.getPaymentsForCustomer(customerId, tenantId, authToken);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Get('payments/:paymentId')
  async getPayment(@Param('paymentId') paymentId: string, @Request() req, @Headers() headers: Record<string, any>) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');
    const result = await this.service.getPaymentForCustomer(paymentId, customerId, tenantId, authToken);
    return { ...result, correlationId };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Get('complaints')
  async getComplaints(@Request() req, @Headers() headers: Record<string, any>) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;

    const authToken = req.headers?.authorization?.replace('Bearer ', '');
    const result = await this.service.getComplaintsForCustomer(customerId, tenantId, authToken);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Post('complaints')
  async createComplaint(@Request() req, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');

    const result = await this.service.createComplaint({
      customerId,
      tenantId,
      subject: body.subject,
      description: body.description,
      category: body.category,
      priority: body.priority,
      authToken,
    });
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Get('complaints/:complaintId')
  async getComplaintStatus(@Request() req, @Headers() headers: Record<string, any>, @Param('complaintId') complaintId: string) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');

    const result = await this.service.getComplaintStatus({
      complaintId,
      tenantId,
      authToken,
    });
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Get('offerings')
  async getOfferings(
    @Request() req,
    @Headers() headers: Record<string, any>,
    @Query('brokerOrganizationId') brokerOrganizationId?: string,
    @Query('currency') currency?: string,
    @Query('region') region?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');

    const result = await this.service.getOfferingsForCustomer(customerId, tenantId, authToken, {
      brokerOrganizationId,
      currency,
      region,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    return {
      success: true,
      data: result?.data ?? result,
      correlationId,
    };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Post('policies/:policyId/endorsement')
  async requestEndorsement(
    @Request() req,
    @Headers() headers: Record<string, any>,
    @Param('policyId') policyId: string,
    @Body() body: {
      endorsementType: string;
      payload: Record<string, any>;
      reason?: string;
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;

    const authToken = req.headers?.authorization?.replace('Bearer ', '');

    const result = await this.service.requestEndorsement({
      customerId,
      tenantId,
      policyId,
      endorsementType: body.endorsementType,
      payload: body.payload,
      reason: body.reason,
      correlationId,
      authToken,
    });
    return { success: result.success, data: result.data, error: result.error, correlationId };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Post('endorsements/:endorsementId/submit')
  async submitEndorsement(
    @Param('endorsementId') endorsementId: string,
    @Request() req,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');

    const result = await this.service.submitEndorsementForCustomer({
      endorsementId,
      customerId,
      tenantId,
      authToken,
      correlationId,
    });
    return { success: result.success, data: result.data, error: result.error, correlationId };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Get('endorsements/:endorsementId')
  async getEndorsementStatus(
    @Param('endorsementId') endorsementId: string,
    @Request() req,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');

    const result = await this.service.getEndorsementStatusForCustomer({
      endorsementId,
      customerId,
      tenantId,
      authToken,
      correlationId,
    });
    return { success: result.success, data: result.data, error: result.error, correlationId };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Post('policies/:policyId/renewal')
  async requestRenewal(
    @Request() req,
    @Headers() headers: Record<string, any>,
    @Param('policyId') policyId: string,
    @Body() body: { newEndDate?: string },
  ) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;

    const authToken = req.headers?.authorization?.replace('Bearer ', '');

    const result = await this.service.requestRenewal({
      customerId,
      tenantId,
      policyId,
      newEndDate: body.newEndDate,
      correlationId,
      authToken,
    });
    return { success: result.success, data: result.data, error: result.error, correlationId };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Post('policies/:policyId/renewal/compare-quotes')
  async compareRenewalQuotes(
    @Request() req,
    @Headers() headers: Record<string, any>,
    @Param('policyId') policyId: string,
    @Body() body: { productIds?: string[]; effectiveDate?: string },
  ) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');

    const result = await this.service.compareRenewalQuotes({
      customerId,
      tenantId,
      policyId,
      productIds: body?.productIds,
      effectiveDate: body?.effectiveDate,
      authToken,
      correlationId,
    });
    return { success: result.success, data: result.data, error: result.error, correlationId };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Post('claims/fnol')
  async submitFnol(
    @Request() req,
    @Headers() headers: Record<string, any>,
    @Body() body: {
      policyId: string;
      incidentDate: string;
      incidentDescription: string;
      incidentAmount?: number;
      documents?: Array<{ name: string; type: string; url: string }>;
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;

    const authToken = req.headers?.authorization?.replace('Bearer ', '');

    const result = await this.service.submitFnol({
      customerId,
      tenantId,
      policyId: body.policyId,
      incidentDate: body.incidentDate,
      incidentDescription: body.incidentDescription,
      incidentAmount: body.incidentAmount,
      documents: body.documents,
      authToken,
      correlationId,
    });
    return {
      success: result.success,
      data: result.success ? result.data : null,
      error: result.error,
      correlationId,
    };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Get('claims/:claimId/advocacy')
  async getClaimAdvocacy(
    @Param('claimId') claimId: string,
    @Request() req,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');

    const result = await this.service.getClaimAdvocacyForCustomer({
      claimId,
      customerId,
      tenantId,
      authToken,
      correlationId,
    });
    return { ...result, correlationId };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Post('claims/:claimId/advocacy')
  async createAdvocacyCase(
    @Param('claimId') claimId: string,
    @Request() req,
    @Headers() headers: Record<string, any>,
    @Body() body: {
      brokerOrganizationId?: string;
      caseType?: string;
      priority?: string;
      description?: string;
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');

    const result = await this.service.createAdvocacyCaseForCustomer({
      claimId,
      customerId,
      tenantId,
      brokerOrganizationId: body?.brokerOrganizationId,
      caseType: body?.caseType,
      priority: body?.priority,
      description: body?.description,
      authToken,
      correlationId,
    });
    return { ...result, correlationId };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Post('claims/:claimId/advocacy/:caseId/communications')
  async addAdvocacyCommunication(
    @Param('claimId') claimId: string,
    @Param('caseId') caseId: string,
    @Request() req,
    @Headers() headers: Record<string, any>,
    @Body() body: {
      channel: 'email' | 'sms' | 'call' | 'web' | 'mobile_app';
      contentRef: string;
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');

    const result = await this.service.addAdvocacyCommunicationForCustomer({
      caseId,
      claimId,
      customerId,
      tenantId,
      channel: body.channel,
      contentRef: body.contentRef,
      authToken,
      correlationId,
    });
    return { ...result, correlationId };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Get('claims/:claimId/advocacy/:caseId/communications')
  async getAdvocacyCommunications(
    @Param('claimId') claimId: string,
    @Param('caseId') caseId: string,
    @Request() req,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');
    const result = await this.service.getAdvocacyCommunicationsForCustomer({
      claimId,
      caseId,
      customerId,
      tenantId,
      authToken,
      correlationId,
    });
    return { ...result, correlationId };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Post('claims/:claimId/adjuster-referrals/:referralId/communications')
  async addAdjusterCommunication(
    @Param('claimId') claimId: string,
    @Param('referralId') referralId: string,
    @Request() req,
    @Headers() headers: Record<string, any>,
    @Body() body: {
      channel: 'email' | 'sms' | 'call' | 'web' | 'mobile_app';
      direction: 'inbound' | 'outbound';
      contentRef: string;
      subject?: string;
      summary?: string;
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');

    const result = await this.service.addAdjusterCommunicationForCustomer({
      claimId,
      referralId,
      customerId,
      tenantId,
      channel: body.channel,
      direction: body.direction,
      contentRef: body.contentRef,
      subject: body.subject,
      summary: body.summary,
      authToken,
      correlationId,
    });
    return { success: result.success, data: result.data, error: result.error, correlationId };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Get('claims/:claimId/status')
  async getClaimStatus(
    @Param('claimId') claimId: string,
    @Request() req,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');

    const result = await this.service.getClaimStatusForCustomer({
      claimId,
      customerId,
      tenantId,
      authToken,
      correlationId,
    });
    return { ...result, correlationId };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Post('claims/:claimId/documents')
  async uploadClaimDocument(
    @Param('claimId') claimId: string,
    @Request() req,
    @Headers() headers: Record<string, any>,
    @Body() body: {
      documentId: string;
      documentType: string;
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');

    const result = await this.service.uploadClaimDocumentForCustomer({
      claimId,
      customerId,
      tenantId,
      documentId: body.documentId,
      documentType: body.documentType,
      uploadedByPartyId: customerId,
      authToken,
      correlationId,
    });
    return { ...result, correlationId };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Get('claims/:claimId/documents/:documentId/download')
  async downloadClaimDocument(
    @Param('claimId') claimId: string,
    @Param('documentId') documentId: string,
    @Request() req,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');

    const result = await this.service.getClaimDocumentDownloadUrl({
      claimId,
      documentId,
      customerId,
      tenantId,
      authToken,
      correlationId,
    });
    return { ...result, correlationId };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Post('payments/initiate')
  async initiatePayment(
    @Request() req,
    @Headers() headers: Record<string, any>,
    @Body() body: { invoiceId: string },
  ) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');

    const result = await this.service.initiatePayment({
      customerId,
      tenantId,
      invoiceId: body.invoiceId,
      authToken,
      correlationId,
    });
    return { ...result, correlationId };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Get('broker-info')
  async getBrokerInfo(
    @Request() req,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');

    const result = await this.service.getBrokerInfo({
      customerId,
      tenantId,
      authToken,
      correlationId,
    });
    return { ...result, correlationId };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Get('installments/:installmentId')
  async getInstallmentDetails(
    @Param('installmentId') installmentId: string,
    @Request() req,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');

    const result = await this.service.getInstallmentDetails({
      customerId,
      tenantId,
      installmentId,
      authToken,
      correlationId,
    });
    return { ...result, correlationId };
  }

  // --- Consent Management ---

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Get('consent')
  async getConsents(@Request() req, @Headers() headers: Record<string, any>) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');
    const result = await this.service.getConsents(customerId, tenantId, authToken);
    return { ...result, correlationId };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Post('consent/grant')
  async grantConsent(@Request() req, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');
    const result = await this.service.grantConsent({
      customerId,
      tenantId,
      purpose: body.purpose,
      source: body.source,
      channel: body.channel,
      authToken,
    });
    return { ...result, correlationId };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Post('consent/revoke')
  async revokeConsent(@Request() req, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');
    const result = await this.service.revokeConsent({
      customerId,
      tenantId,
      purpose: body.purpose,
      reason: body.reason,
      authToken,
    });
    return { ...result, correlationId };
  }

  // --- Adjuster Communications ---

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Get('claims/:claimId/adjuster-communications')
  async getAdjusterCommunications(@Param('claimId') claimId: string, @Request() req, @Headers() headers: Record<string, any>) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');
    const result = await this.service.getAdjusterCommunications(claimId, customerId, tenantId, authToken);
    return { ...result, correlationId };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Post('claims/:claimId/adjuster-communications')
  async sendAdjusterMessage(@Param('claimId') claimId: string, @Request() req, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');
    const result = await this.service.sendAdjusterMessage({
      claimId,
      customerId,
      tenantId,
      message: body.message,
      attachments: body.attachments,
      authToken,
    });
    return { ...result, correlationId };
  }

  // --- Policy Endorsements List ---

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Get('policies/:policyId/endorsements')
  async listPolicyEndorsements(@Param('policyId') policyId: string, @Request() req, @Headers() headers: Record<string, any>) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');
    const result = await this.service.listPolicyEndorsements(policyId, customerId, tenantId, authToken);
    return { ...result, correlationId };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Get('policies/:policyId/endorsements/:endorsementId')
  async getPolicyEndorsement(@Param('policyId') policyId: string, @Param('endorsementId') endorsementId: string, @Request() req, @Headers() headers: Record<string, any>) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');
    const result = await this.service.getEndorsementStatusForCustomer({
      endorsementId,
      customerId,
      tenantId,
      authToken,
      correlationId,
    });
    return { ...result, correlationId };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Get('policies/:policyId/endorsements/:endorsementId/track')
  async trackPolicyEndorsement(@Param('policyId') policyId: string, @Param('endorsementId') endorsementId: string, @Request() req, @Headers() headers: Record<string, any>) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');
    const result = await this.service.getEndorsementStatusForCustomer({
      endorsementId,
      customerId,
      tenantId,
      authToken,
      correlationId,
    });
    return { ...result, correlationId };
  }

  // --- Renewal Quotes ---

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Get('policies/:policyId/renewal/quotes')
  async getRenewalQuotes(@Param('policyId') policyId: string, @Request() req, @Headers() headers: Record<string, any>) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');
    const result = await this.service.getRenewalQuotes(policyId, customerId, tenantId, authToken);
    return { ...result, correlationId };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Post('policies/:policyId/renewal/quotes/:quoteId/accept')
  async acceptRenewalQuote(@Param('policyId') policyId: string, @Param('quoteId') quoteId: string, @Request() req, @Headers() headers: Record<string, any>) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');
    const result = await this.service.acceptRenewalQuote({ policyId, quoteId, customerId, tenantId, authToken });
    return { ...result, correlationId };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Post('policies/:policyId/renewal/schedule')
  async scheduleRenewal(@Param('policyId') policyId: string, @Request() req, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;
    const authToken = req.headers?.authorization?.replace('Bearer ', '');
    const result = await this.service.scheduleRenewal({
      policyId,
      customerId,
      tenantId,
      newStartDate: body.newStartDate,
      newProductCode: body.newProductCode,
      authToken,
    });
    return { ...result, correlationId };
  }
}
