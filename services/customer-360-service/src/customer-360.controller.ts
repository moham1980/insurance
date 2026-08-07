import { Body, Controller, Get, Headers, Param, Post, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { Customer360Service } from './customer-360.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { isValidUUID } from './validation.utils'; // P2 #14: UUID validation

@Controller('customer-360')
@UseGuards(JwtAuthGuard, AbacGuard, TenantGuard)
export class Customer360Controller {
  constructor(private readonly customer360Service: Customer360Service) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  @Get('search')
  async searchCustomers(
    @Query() query: any,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
  ) {
    const correlationId = this.getCorrelationId(headers);

    try {
      const results = await this.customer360Service.searchCustomers({
        nationalId: query.nationalId,
        phone: query.phone,
        email: query.email,
        policyNumber: query.policyNumber,
      });
      return { success: true, data: results, correlationId };
    } catch (error: any) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message }, correlationId };
    }
  }

  @Get(':customerId')
  async getCustomerProfile(
    @Param('customerId') customerId: string,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    // P2 #14: validate customerId format
    if (!isValidUUID(customerId)) {
      throw new BadRequestException({ success: false, error: { code: 'BAD_REQUEST', message: 'customerId must be a valid UUID' }, correlationId });
    }
    const authToken = req.headers['authorization'] || '';

    try {
      const profile = await this.customer360Service.getCustomer360Profile(customerId, authToken);
      return {
        success: true,
        data: profile,
        correlationId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
        correlationId,
      };
    }
  }

  @Get(':customerId/portfolio')
  async getPortfolioSummary(
    @Param('customerId') customerId: string,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    // P2 #14: validate customerId format
    if (!isValidUUID(customerId)) {
      throw new BadRequestException({ success: false, error: { code: 'BAD_REQUEST', message: 'customerId must be a valid UUID' }, correlationId });
    }
    const authToken = req.headers['authorization'] || '';

    try {
      const summary = await this.customer360Service.getPortfolioSummary(customerId, authToken);
      return { success: true, data: summary, correlationId };
    } catch (error: any) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message }, correlationId };
    }
  }

  @Get(':customerId/journey')
  async getCustomerJourneyTimeline(
    @Param('customerId') customerId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Headers() headers: Record<string, any> = {},
  ) {
    const correlationId = this.getCorrelationId(headers);
    // P2 #14: validate customerId format
    if (!isValidUUID(customerId)) {
      throw new BadRequestException({ success: false, error: { code: 'BAD_REQUEST', message: 'customerId must be a valid UUID' }, correlationId });
    }

    try {
      const journey = await this.customer360Service.getCustomerJourneyTimeline(
        customerId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      );
      return { success: true, data: journey, correlationId };
    } catch (error: any) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message }, correlationId };
    }
  }

  @Get(':customerId/summary')
  async getCustomerSummary(
    @Param('customerId') customerId: string,
    @Headers() headers: Record<string, any> = {},
  ) {
    const correlationId = this.getCorrelationId(headers);
    // P2 #14: validate customerId format
    if (!isValidUUID(customerId)) {
      throw new BadRequestException({ success: false, error: { code: 'BAD_REQUEST', message: 'customerId must be a valid UUID' }, correlationId });
    }

    try {
      const summary = await this.customer360Service.getCustomerSummary(customerId);
      return { success: true, data: summary, correlationId };
    } catch (error: any) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message }, correlationId };
    }
  }

  @Get(':customerId/consents')
  async listConsents(
    @Param('customerId') customerId: string,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Query('cursor') cursor?: string, // P1 #8: cursor-based pagination
    @Query('limit') limit?: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    // P2 #14: validate customerId format
    if (!isValidUUID(customerId)) {
      throw new BadRequestException({ success: false, error: { code: 'BAD_REQUEST', message: 'customerId must be a valid UUID' }, correlationId });
    }
    const tenantId = req?.user?.tenantId as string | undefined;
    try {
      const result = await this.customer360Service.listConsents(customerId, tenantId, cursor, limit ? parseInt(limit, 10) : undefined);
      // P1 #8: return cursor-based pagination info when cursor is used
      if (cursor && result && typeof (result as any).hasNext !== 'undefined') {
        return { success: true, data: (result as any).items, pagination: { hasNext: (result as any).hasNext, nextCursor: (result as any).nextCursor }, correlationId };
      }
      return { success: true, data: result, correlationId };
    } catch (error: any) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message }, correlationId };
    }
  }

  @Post(':customerId/consents')
  async recordConsent(
    @Param('customerId') customerId: string,
    @Body() body: { purpose: string; status?: 'granted' | 'denied'; expiresAt?: string; source?: string; channel?: string; version?: string },
    @Headers() headers: Record<string, any>,
    @Req() req: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    // P2 #14: validate customerId format
    if (!isValidUUID(customerId)) {
      throw new BadRequestException({ success: false, error: { code: 'BAD_REQUEST', message: 'customerId must be a valid UUID' }, correlationId });
    }
    const actorUserId = req?.user?.userId as string | undefined;
    const tenantId = req?.user?.tenantId as string | undefined;

    try {
      const record = await this.customer360Service.recordConsent({
        customerId,
        purpose: body.purpose,
        status: body.status,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        source: body.source,
        channel: body.channel,
        actorUserId,
        tenantId,
        version: body.version,
      });
      return { success: true, data: record, correlationId };
    } catch (error: any) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message }, correlationId };
    }
  }

  @Post(':customerId/consents/:consentId/revoke')
  async revokeConsent(
    @Param('customerId') customerId: string,
    @Param('consentId') consentId: string,
    @Body() body: { reason?: string },
    @Headers() headers: Record<string, any>,
    @Req() req: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    // P2 #14: validate customerId and consentId format
    if (!isValidUUID(customerId)) {
      throw new BadRequestException({ success: false, error: { code: 'BAD_REQUEST', message: 'customerId must be a valid UUID' }, correlationId });
    }
    if (!isValidUUID(consentId)) {
      throw new BadRequestException({ success: false, error: { code: 'BAD_REQUEST', message: 'consentId must be a valid UUID' }, correlationId });
    }
    const tenantId = req?.user?.tenantId as string | undefined;

    try {
      const record = await this.customer360Service.revokeConsent(customerId, consentId, body?.reason, tenantId);
      if (!record) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Consent not found' }, correlationId };
      }
      return { success: true, data: record, correlationId };
    } catch (error: any) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message }, correlationId };
    }
  }

  @Get(':customerId/consents/check')
  async checkConsent(
    @Param('customerId') customerId: string,
    @Query('purpose') purpose: string,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    // P2 #14: validate customerId format
    if (!isValidUUID(customerId)) {
      throw new BadRequestException({ success: false, error: { code: 'BAD_REQUEST', message: 'customerId must be a valid UUID' }, correlationId });
    }
    const tenantId = req?.user?.tenantId as string | undefined;

    try {
      const result = await this.customer360Service.checkConsent(customerId, purpose, tenantId);
      return { success: true, data: result, correlationId };
    } catch (error: any) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message }, correlationId };
    }
  }
}
