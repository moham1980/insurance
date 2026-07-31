import { Controller, Get, Post, Body, Param, Headers, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { FederationConsentService, GrantConsentDto } from './federation-consent.service';

@Controller('federation/consents')
export class FederationConsentController {
  constructor(private readonly consentService: FederationConsentService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return uuidv4();
  }

  @Post()
  async grantConsent(@Body() body: GrantConsentDto & { grantedBy: string }, @Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    if (!body.globalSubjectId || !body.sourceTenantId || !body.targetTenantId || !body.consentType || !body.purpose) {
      throw new BadRequestException('globalSubjectId, sourceTenantId, targetTenantId, consentType, and purpose are required');
    }
    const consent = await this.consentService.grantConsent(body, body.grantedBy || 'system');
    return { success: true, data: consent, correlationId };
  }

  @Post(':consentId/revoke')
  async revokeConsent(
    @Param('consentId') consentId: string,
    @Body() body: { revokedBy: string; reason: string },
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const consent = await this.consentService.revokeConsent(consentId, body.revokedBy || 'system', body.reason || 'revoked');
    return { success: true, data: consent, correlationId };
  }

  @Get('check')
  async checkConsent(
    @Body() body: { globalSubjectId: string; targetTenantId: string; consentType: string; dataCategory?: string },
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const hasConsent = await this.consentService.checkConsent(
      body.globalSubjectId,
      body.targetTenantId,
      body.consentType as any,
      body.dataCategory,
    );
    return { success: true, data: { hasConsent }, correlationId };
  }

  @Get('subject/:globalSubjectId')
  async listConsents(@Param('globalSubjectId') globalSubjectId: string, @Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const consents = await this.consentService.listConsents(globalSubjectId);
    return { success: true, data: consents, correlationId };
  }

  @Get(':consentId')
  async getConsent(@Param('consentId') consentId: string, @Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const consent = await this.consentService.getConsent(consentId);
    return { success: true, data: consent, correlationId };
  }
}
