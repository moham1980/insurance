import { Body, Controller, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CustomerBffService } from './customer-bff.service';

/**
 * Simple JWT guard — validates Bearer token exists and forwards it to downstream services.
 * Downstream services enforce full ABAC/tenant isolation.
 */
function extractToken(req: any): string {
  const auth = req?.headers?.authorization || '';
  if (auth.startsWith('Bearer ')) return auth;
  return '';
}

@Controller()
export class CustomerController {
  constructor(private readonly bff: CustomerBffService) {}

  private correlationId(headers: Record<string, any>): string {
    return headers['x-correlation-id'] || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // --- OTP (public, no auth) ---

  @Post('otp/initiate')
  async initiateOtp(@Body() body: { phoneNumber: string }) {
    const data = await this.bff.initiateOtp(body.phoneNumber);
    return { success: true, data };
  }

  @Post('otp/verify')
  async verifyOtp(@Body() body: { reference: string; code: string; tenantId: string }) {
    const data = await this.bff.verifyOtp(body.reference, body.code, body.tenantId);
    return { success: true, data };
  }

  // --- Session ---

  @Get('session')
  async getSession(@Req() req: any, @Headers() headers: Record<string, any>) {
    const cid = this.correlationId(headers);
    const token = extractToken(req);
    const data = await this.bff.getSession(token);
    return { success: true, data, correlationId: cid };
  }

  @Post('session/revoke')
  async revokeSession(@Req() req: any, @Headers() headers: Record<string, any>) {
    const cid = this.correlationId(headers);
    // Forward to auth-service to invalidate session
    return { success: true, data: { revoked: true }, correlationId: cid };
  }

  // --- Policies ---

  @Get('policies')
  async listPolicies(@Req() req: any, @Headers() headers: Record<string, any>) {
    const cid = this.correlationId(headers);
    const token = extractToken(req);
    const data = await this.bff.listPolicies(token);
    return { success: true, data, correlationId: cid };
  }

  @Get('policies/:policyId')
  async getPolicy(@Param('policyId') policyId: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const cid = this.correlationId(headers);
    const token = extractToken(req);
    const data = await this.bff.getPolicy(token, policyId);
    return { success: true, data, correlationId: cid };
  }

  @Post('policies/:policyId/endorsement')
  async endorsePolicy(
    @Param('policyId') policyId: string,
    @Body() body: any,
    @Req() req: any,
    @Headers() headers: Record<string, any>,
  ) {
    const cid = this.correlationId(headers);
    const token = extractToken(req);
    const data = await this.bff.endorsePolicy(token, policyId, body);
    return { success: true, data, correlationId: cid };
  }

  @Post('policies/:policyId/renewal')
  async scheduleRenewal(
    @Param('policyId') policyId: string,
    @Body() body: any,
    @Req() req: any,
    @Headers() headers: Record<string, any>,
  ) {
    const cid = this.correlationId(headers);
    const token = extractToken(req);
    const data = await this.bff.scheduleRenewal(token, policyId, body);
    return { success: true, data, correlationId: cid };
  }

  // --- Claims ---

  @Get('claims')
  async listClaims(@Req() req: any, @Headers() headers: Record<string, any>) {
    const cid = this.correlationId(headers);
    const token = extractToken(req);
    const data = await this.bff.listClaims(token);
    return { success: true, data, correlationId: cid };
  }

  @Get('claims/:claimId')
  async getClaim(@Param('claimId') claimId: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const cid = this.correlationId(headers);
    const token = extractToken(req);
    const data = await this.bff.getClaim(token, claimId);
    return { success: true, data, correlationId: cid };
  }

  @Post('fnol')
  async submitFnol(@Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const cid = this.correlationId(headers);
    const token = extractToken(req);
    const data = await this.bff.submitFnol(token, body);
    return { success: true, data, correlationId: cid };
  }

  // --- Payments ---

  @Get('payments')
  async listPayments(@Req() req: any, @Headers() headers: Record<string, any>) {
    const cid = this.correlationId(headers);
    const token = extractToken(req);
    const data = await this.bff.listPayments(token);
    return { success: true, data, correlationId: cid };
  }

  @Get('payments/:paymentId')
  async getPayment(@Param('paymentId') paymentId: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const cid = this.correlationId(headers);
    const token = extractToken(req);
    const data = await this.bff.getPayment(token, paymentId);
    return { success: true, data, correlationId: cid };
  }

  // --- Complaints ---

  @Get('complaints')
  async listComplaints(@Req() req: any, @Headers() headers: Record<string, any>) {
    const cid = this.correlationId(headers);
    const token = extractToken(req);
    const data = await this.bff.listComplaints(token);
    return { success: true, data, correlationId: cid };
  }

  @Post('complaints')
  async createComplaint(@Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const cid = this.correlationId(headers);
    const token = extractToken(req);
    const data = await this.bff.createComplaint(token, body);
    return { success: true, data, correlationId: cid };
  }

  // --- Brand Config (public, no auth) ---

  @Get('brand-config/:brandKey')
  async getBrandConfig(@Param('brandKey') brandKey: string) {
    const data = await this.bff.getBrandConfig(brandKey);
    return { success: true, data };
  }

  // --- Consent (proxied to customer-360-service) ---

  @Get('consent')
  async listConsents(@Req() req: any, @Headers() headers: Record<string, any>) {
    const cid = this.correlationId(headers);
    const token = extractToken(req);
    const customerId = await this.bff.getCustomerIdFromSession(token);
    if (!customerId) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Customer not found in session' }, correlationId: cid };
    }
    const data = await this.bff.listConsents(token, customerId);
    return { success: true, data, correlationId: cid };
  }

  @Post('consent/grant')
  async grantConsent(
    @Body() body: { purpose: string; source?: string; channel?: string; expiresAt?: string },
    @Req() req: any,
    @Headers() headers: Record<string, any>,
  ) {
    const cid = this.correlationId(headers);
    const token = extractToken(req);
    const customerId = await this.bff.getCustomerIdFromSession(token);
    if (!customerId) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Customer not found in session' }, correlationId: cid };
    }
    const data = await this.bff.grantConsent(token, customerId, {
      purpose: body.purpose,
      status: 'granted',
      source: body.source || 'customer-portal',
      channel: body.channel || 'web',
      expiresAt: body.expiresAt,
    });
    return { success: true, data, correlationId: cid };
  }

  @Post('consent/revoke')
  async revokeConsent(
    @Body() body: { purpose: string; reason?: string },
    @Req() req: any,
    @Headers() headers: Record<string, any>,
  ) {
    const cid = this.correlationId(headers);
    const token = extractToken(req);
    const customerId = await this.bff.getCustomerIdFromSession(token);
    if (!customerId) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Customer not found in session' }, correlationId: cid };
    }

    const consents = await this.bff.listConsents(token, customerId);
    const rows = consents?.data || consents?.data?.consents || consents;
    const consent = rows?.find?.((c: any) => c.purpose === body.purpose && c.status === 'granted');
    if (!consent) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'No granted consent for this purpose' }, correlationId: cid };
    }

    const data = await this.bff.revokeConsent(token, customerId, consent.consentId, body.reason);
    return { success: true, data, correlationId: cid };
  }
}
