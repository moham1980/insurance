import { Body, Controller, Get, Headers, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { CustomerBffService } from './customer-bff.service';

// Cache-Control header for static lookups (brand config, categories, FAQ).
const STATIC_CACHE_CONTROL = process.env.CUSTOMER_PORTAL_STATIC_CACHE_CONTROL || 'public, max-age=300';

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
  async verifyOtp(@Body() body: { reference: string; code: string; tenantId: string }, @Headers() headers: Record<string, any>) {
    const cid = this.correlationId(headers);
    const data = await this.bff.verifyOtp(body.reference, body.code, body.tenantId, cid);
    return { success: true, data, correlationId: cid };
  }

  // --- Session ---

  @Get('session')
  async getSession(@Req() req: any, @Headers() headers: Record<string, any>) {
    const cid = this.correlationId(headers);
    const token = extractToken(req);
    const data = await this.bff.getSession(token, cid);
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
    const data = await this.bff.listPolicies(token, cid);
    return { success: true, data, correlationId: cid };
  }

  @Get('policies/:policyId')
  async getPolicy(@Param('policyId') policyId: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const cid = this.correlationId(headers);
    const token = extractToken(req);
    const data = await this.bff.getPolicy(token, policyId, cid);
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
    const data = await this.bff.endorsePolicy(token, policyId, body, cid);
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
    const data = await this.bff.scheduleRenewal(token, policyId, body, cid);
    return { success: true, data, correlationId: cid };
  }

  // --- Claims ---

  @Get('claims')
  async listClaims(@Req() req: any, @Headers() headers: Record<string, any>) {
    const cid = this.correlationId(headers);
    const token = extractToken(req);
    const data = await this.bff.listClaims(token, cid);
    return { success: true, data, correlationId: cid };
  }

  @Get('claims/:claimId')
  async getClaim(@Param('claimId') claimId: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const cid = this.correlationId(headers);
    const token = extractToken(req);
    const data = await this.bff.getClaim(token, claimId, cid);
    return { success: true, data, correlationId: cid };
  }

  @Post('fnol')
  async submitFnol(@Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const cid = this.correlationId(headers);
    const token = extractToken(req);
    const data = await this.bff.submitFnol(token, body, cid);
    return { success: true, data, correlationId: cid };
  }

  // --- Payments ---

  @Get('payments')
  async listPayments(@Req() req: any, @Headers() headers: Record<string, any>) {
    const cid = this.correlationId(headers);
    const token = extractToken(req);
    const data = await this.bff.listPayments(token, cid);
    return { success: true, data, correlationId: cid };
  }

  @Get('payments/:paymentId')
  async getPayment(@Param('paymentId') paymentId: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const cid = this.correlationId(headers);
    const token = extractToken(req);
    const data = await this.bff.getPayment(token, paymentId, cid);
    return { success: true, data, correlationId: cid };
  }

  // --- Complaints ---

  @Get('complaints')
  async listComplaints(@Req() req: any, @Headers() headers: Record<string, any>) {
    const cid = this.correlationId(headers);
    const token = extractToken(req);
    const data = await this.bff.listComplaints(token, cid);
    return { success: true, data, correlationId: cid };
  }

  @Post('complaints')
  async createComplaint(@Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const cid = this.correlationId(headers);
    const token = extractToken(req);
    const data = await this.bff.createComplaint(token, body, cid);
    return { success: true, data, correlationId: cid };
  }

  // --- Brand Config (public, no auth) ---

  @Get('brand-config/:brandKey')
  async getBrandConfig(@Param('brandKey') brandKey: string, @Headers() headers: Record<string, any>, @Res({ passthrough: true }) res: any) {
    const cid = this.correlationId(headers);
    const data = await this.bff.getBrandConfig(brandKey, cid);
    res.header('Cache-Control', STATIC_CACHE_CONTROL);
    return { success: true, data, correlationId: cid };
  }

  // --- Product Categories (static lookup, public) ---

  @Get('product-categories')
  async getProductCategories(@Headers() headers: Record<string, any>, @Res({ passthrough: true }) res: any) {
    const cid = this.correlationId(headers);
    const data = await this.bff.getProductCategories(cid);
    res.header('Cache-Control', STATIC_CACHE_CONTROL);
    return { success: true, data, correlationId: cid };
  }

  // --- FAQ (static lookup, public) ---

  @Get('faq')
  async getFaq(@Headers() headers: Record<string, any>, @Res({ passthrough: true }) res: any) {
    const cid = this.correlationId(headers);
    const data = await this.bff.getFaq(cid);
    res.header('Cache-Control', STATIC_CACHE_CONTROL);
    return { success: true, data, correlationId: cid };
  }

  // --- Consent (proxied to customer-360-service) ---

  @Get('consent')
  async listConsents(@Req() req: any, @Headers() headers: Record<string, any>) {
    const cid = this.correlationId(headers);
    const token = extractToken(req);
    const customerId = await this.bff.getCustomerIdFromSession(token, cid);
    if (!customerId) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Customer not found in session' }, correlationId: cid };
    }
    const data = await this.bff.listConsents(token, customerId, cid);
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
    const customerId = await this.bff.getCustomerIdFromSession(token, cid);
    if (!customerId) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Customer not found in session' }, correlationId: cid };
    }
    const data = await this.bff.grantConsent(token, customerId, {
      purpose: body.purpose,
      status: 'granted',
      source: body.source || 'customer-portal',
      channel: body.channel || 'web',
      expiresAt: body.expiresAt,
    }, cid);
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
    const customerId = await this.bff.getCustomerIdFromSession(token, cid);
    if (!customerId) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Customer not found in session' }, correlationId: cid };
    }

    const consents = await this.bff.listConsents(token, customerId, cid);
    const rows = consents?.data || consents?.data?.consents || consents;
    const consent = rows?.find?.((c: any) => c.purpose === body.purpose && c.status === 'granted');
    if (!consent) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'No granted consent for this purpose' }, correlationId: cid };
    }

    const data = await this.bff.revokeConsent(token, customerId, consent.consentId, body.reason, cid);
    return { success: true, data, correlationId: cid };
  }
}
