import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { BrokerLicenseService, PartyKycContext } from './broker-license.service';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { PermissionsGuard } from '../permissions.guard';
import { RequirePermissions } from '../permissions.decorator';
import { AbacGuard } from '../abac.guard';
import { TenantGuard } from '../tenant.guard';

function buildContext(req: any, correlationId: string): PartyKycContext {
  const user = req?.user || {};
  return {
    tenantId: user.tenantId || user.tenant_id,
    userId: user.userId || user.sub,
    roles: Array.isArray(user.roles) ? user.roles : [],
    organizationId: user.organizationId || user.organization_id,
    correlationId,
  };
}

function ok(data: any, correlationId: string) {
  return { success: true, data, correlationId };
}

function err(e: any, correlationId: string) {
  return { success: false, error: { code: e.name || 'INTERNAL_ERROR', message: e.message }, correlationId };
}

@Controller('/api/v1/broker-licenses')
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class BrokerLicenseController {
  constructor(private readonly brokerLicenseService: BrokerLicenseService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    return typeof cid === 'string' && cid.length > 0 ? cid : uuidv4();
  }

  @Post('/')
  @RequirePermissions('party:manage')
  async create(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const license = await this.brokerLicenseService.createLicense(ctx, body);
      return ok(license, correlationId);
    } catch (e: any) { return err(e, correlationId); }
  }

  @Get('/:licenseId')
  @RequirePermissions('party:view')
  async get(@Req() req: any, @Headers() headers: Record<string, any>, @Param('licenseId') licenseId: string) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const license = await this.brokerLicenseService.getLicense(ctx, licenseId);
      if (!license) return err({ name: 'NOT_FOUND', message: 'License not found' }, correlationId);
      return ok(license, correlationId);
    } catch (e: any) { return err(e, correlationId); }
  }

  @Post('/:licenseId/verify')
  @RequirePermissions('party:manage')
  async verify(@Req() req: any, @Headers() headers: Record<string, any>, @Param('licenseId') licenseId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const license = await this.brokerLicenseService.verifyLicense(ctx, licenseId, body);
      return ok(license, correlationId);
    } catch (e: any) { return err(e, correlationId); }
  }

  @Post('/:licenseId/validate')
  @RequirePermissions('party:view')
  async validate(@Headers() headers: Record<string, any>, @Param('licenseId') licenseId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    try {
      const result = await this.brokerLicenseService.validateLicense(licenseId, body?.lineOfBusiness);
      return ok(result, correlationId);
    } catch (e: any) { return err(e, correlationId); }
  }
}
