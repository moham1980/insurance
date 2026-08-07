import { Controller, Get, Post, Put, Body, Param, Headers, UseGuards, ForbiddenException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PartnerGatewayService, CreatePartnerDto } from './partner-gateway.service';
import { CertificateService } from './certificate.service';
import { ReplayProtectionService } from './replay-protection.service';
import { TokenExchangeProxyService } from './token-exchange-proxy.service';
import { FederationSignatureGuard } from './federation-signature.guard';
import { PartnerRateLimitGuard } from './partner-rate-limit.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AdminGuard } from './admin.guard';

@Controller('partner-gateway')
export class PartnerGatewayController {
  constructor(
    private readonly partnerService: PartnerGatewayService,
    private readonly certService: CertificateService,
    private readonly replayService: ReplayProtectionService,
    private readonly tokenExchangeService: TokenExchangeProxyService,
  ) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return uuidv4();
  }

  @Post('partners')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async registerPartner(@Body() body: CreatePartnerDto, @Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const partner = await this.partnerService.registerPartner(body);
    return { success: true, data: partner, correlationId };
  }

  @Get('partners')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async listPartners(@Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = headers['x-tenant-id'] || headers['X-Tenant-Id'];
    if (!tenantId) throw new BadRequestException('x-tenant-id header required');
    const partners = await this.partnerService.listPartners(tenantId);
    return { success: true, data: partners, correlationId };
  }

  @Get('partners/:partnerId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getPartner(@Param('partnerId') partnerId: string, @Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const partner = await this.partnerService.getPartner(partnerId);
    return { success: true, data: partner, correlationId };
  }

  @Put('partners/:partnerId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updatePartner(
    @Param('partnerId') partnerId: string,
    @Body() body: Partial<CreatePartnerDto>,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const partner = await this.partnerService.updatePartner(partnerId, body);
    return { success: true, data: partner, correlationId };
  }

  @Post('partners/:partnerId/revoke')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async revokePartner(
    @Param('partnerId') partnerId: string,
    @Body() body: { reason: string },
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const partner = await this.partnerService.revokePartner(partnerId, body.reason);
    return { success: true, data: partner, correlationId };
  }

  @Post('partners/:partnerId/suspend')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async suspendPartner(@Param('partnerId') partnerId: string, @Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const partner = await this.partnerService.suspendPartner(partnerId);
    return { success: true, data: partner, correlationId };
  }

  @Post('partners/:partnerId/activate')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async activatePartner(@Param('partnerId') partnerId: string, @Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const partner = await this.partnerService.activatePartner(partnerId);
    return { success: true, data: partner, correlationId };
  }

  @Post('partners/:partnerId/certificates')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async uploadCertificate(
    @Param('partnerId') partnerId: string,
    @Body() body: { certSubject: string; certSerial: string; publicCertPem: string; issuer: string; validFrom: string; expiresAt: string },
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const cert = await this.certService.registerCertificate({
      partnerId,
      certSubject: body.certSubject,
      certSerial: body.certSerial,
      publicCertPem: body.publicCertPem,
      issuer: body.issuer,
      validFrom: new Date(body.validFrom),
      expiresAt: new Date(body.expiresAt),
    });
    return { success: true, data: cert, correlationId };
  }

  @Get('partners/:partnerId/certificates')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async listCertificates(@Param('partnerId') partnerId: string, @Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const certs = await this.certService.listCertificates(partnerId);
    return { success: true, data: certs, correlationId };
  }

  @Post('partners/:partnerId/certificates/:certId/rotate')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async rotateCertificate(
    @Param('partnerId') partnerId: string,
    @Param('certId') certId: string,
    @Body() body: { publicCertPem: string; certSubject: string; certSerial: string; issuer: string; validFrom: string; expiresAt: string },
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const cert = await this.certService.rotateCertificate(certId, {
      partnerId,
      certSubject: body.certSubject,
      certSerial: body.certSerial,
      publicCertPem: body.publicCertPem,
      issuer: body.issuer,
      validFrom: new Date(body.validFrom),
      expiresAt: new Date(body.expiresAt),
    });
    return { success: true, data: cert, correlationId };
  }

  @Get('certificates/expiring')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getExpiringCertificates(@Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const daysAhead = parseInt(headers['x-days-ahead'] || '30', 10);
    const certs = await this.certService.getExpiringCertificates(daysAhead);
    return { success: true, data: certs, correlationId };
  }

  @Post('token-exchange')
  @UseGuards(FederationSignatureGuard, PartnerRateLimitGuard)
  async tokenExchange(
    @Body() body: { partnerId: string; subjectToken: string; subjectTokenType: string; audience: string; scope: string; requestedTokenType?: string },
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const nonce = headers['x-federation-nonce'] || headers['X-Federation-Nonce'];

    const result = await this.tokenExchangeService.exchangeToken({
      partnerId: body.partnerId,
      subjectToken: body.subjectToken,
      subjectTokenType: body.subjectTokenType,
      audience: body.audience,
      scope: body.scope,
      requestedTokenType: body.requestedTokenType || 'urn:ietf:params:oauth:token-type:access_token',
      nonce,
      requestHash: this.replayService.computeBodyHash(body),
      correlationId,
    });
    return { success: true, data: result, correlationId };
  }

  @Post('validate-access')
  @UseGuards(PartnerRateLimitGuard)
  async validateAccess(
    @Body() body: { certSubject: string; requestedApi: string; requestedScope: string },
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const partner = await this.partnerService.validateAccess(body.certSubject, body.requestedApi, body.requestedScope);
    return { success: true, data: { partnerId: partner.partnerId, allowed: true }, correlationId };
  }
}
