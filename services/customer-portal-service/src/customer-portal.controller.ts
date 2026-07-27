import { Controller, Post, Body, Param, Headers, Get, UseGuards, Request } from '@nestjs/common';
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
  @Get('policies')
  async getPolicies(@Request() req, @Headers() headers: Record<string, any>) {
    const correlationId = headers['x-correlation-id'] || `cp-${Date.now()}`;
    const customerId = req.user?.customerId;
    const tenantId = req.user?.tenantId;

    const authToken = req.headers?.authorization?.replace('Bearer ', '');
    const result = await this.service.getPoliciesForCustomer(customerId, tenantId, authToken);
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
    });
    return {
      success: result.success,
      data: result.success ? result.data : null,
      error: result.error,
      correlationId,
    };
  }
}
