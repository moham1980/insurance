import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TenantOrganizationService, ActorContext } from './tenant-organization.service';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { PermissionsGuard } from '../permissions.guard';
import { Permissions } from '../permissions.decorator';
import { AbacGuard } from '../abac.guard';
import { TenantGuard } from '../tenant.guard';
import { auditLogger } from '../audit.logger';
import { RegulatoryIntegrationService } from '../regulatory-integration.service';
import { RateLimitConfigService } from '../rate-limit-config.service';

function buildContext(req: any, correlationId: string): ActorContext {
  const user = req?.user || {};
  return {
    userId: user.userId || user.sub,
    tenantId: user.tenantId || user.tenant_id,
    organizationId: user.organizationId || user.organization_id,
    roles: Array.isArray(user.roles) ? user.roles : [],
    correlationId,
  };
}

@Controller('/api/v1/admin')
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class TenantOrganizationController {
  constructor(
    private readonly tenantOrgService: TenantOrganizationService,
    private readonly regulatoryService: RegulatoryIntegrationService,
    private readonly rateLimitService: RateLimitConfigService,
  ) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    return typeof cid === 'string' && cid.length > 0 ? cid : uuidv4();
  }

  @Post('/organizations')
  @Permissions('org_units:create')
  async createOrganization(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    auditLogger.info('organization.create.request', { correlationId, actorUserId: ctx.userId, tenantId: ctx.tenantId });
    try {
      const org = await this.tenantOrgService.createOrganization(ctx, body);
      return { success: true, data: org, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: e.name || 'INTERNAL_ERROR', message: e.message }, correlationId };
    }
  }

  @Get('/organizations/:organizationId')
  @Permissions('org_units:get')
  async getOrganization(@Req() req: any, @Headers() headers: Record<string, any>, @Param('organizationId') organizationId: string) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    const org = await this.tenantOrgService.getOrganization(ctx, organizationId);
    if (!org) return { success: false, error: { code: 'NOT_FOUND', message: 'Organization not found' }, correlationId };
    return { success: true, data: org, correlationId };
  }

  @Patch('/organizations/:organizationId')
  @Permissions('org_units:create')
  async updateOrganization(@Req() req: any, @Headers() headers: Record<string, any>, @Param('organizationId') organizationId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const org = await this.tenantOrgService.updateOrganization(ctx, organizationId, body);
      return { success: true, data: org, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: e.name || 'INTERNAL_ERROR', message: e.message }, correlationId };
    }
  }

  @Get('/organizations/:organizationId/capabilities')
  @Permissions('org_units:list')
  async listCapabilities(@Req() req: any, @Headers() headers: Record<string, any>, @Param('organizationId') organizationId: string, @Query('tenantId') tenantId?: string) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    const caps = await this.tenantOrgService.listCapabilities(ctx, organizationId, tenantId);
    return { success: true, data: caps, correlationId };
  }

  @Post('/organizations/:organizationId/capabilities')
  @Permissions('org_units:create')
  async createCapability(@Req() req: any, @Headers() headers: Record<string, any>, @Param('organizationId') organizationId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const cap = await this.tenantOrgService.createCapability(ctx, organizationId, body);
      return { success: true, data: cap, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: e.name || 'INTERNAL_ERROR', message: e.message }, correlationId };
    }
  }

  @Delete('/organizations/:organizationId/capabilities/:capabilityId')
  @Permissions('org_units:create')
  async deleteCapability(@Req() req: any, @Headers() headers: Record<string, any>, @Param('organizationId') organizationId: string, @Param('capabilityId') capabilityId: string) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      await this.tenantOrgService.deleteCapability(ctx, organizationId, capabilityId);
      return { success: true, data: { capabilityId, status: 'suspended' }, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: e.name || 'INTERNAL_ERROR', message: e.message }, correlationId };
    }
  }

  @Post('/organizations/:organizationId/relationships')
  @Permissions('federation:manage')
  async createRelationship(@Req() req: any, @Headers() headers: Record<string, any>, @Param('organizationId') organizationId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const rel = await this.tenantOrgService.createRelationship(ctx, organizationId, body);
      return { success: true, data: rel, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: e.name || 'INTERNAL_ERROR', message: e.message }, correlationId };
    }
  }

  @Get('/organizations/:organizationId/relationships')
  @Permissions('federation:read')
  async listRelationships(@Req() req: any, @Headers() headers: Record<string, any>, @Param('organizationId') organizationId: string) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const rels = await this.tenantOrgService.listRelationships(ctx, organizationId);
      return { success: true, data: rels, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: e.name || 'INTERNAL_ERROR', message: e.message }, correlationId };
    }
  }

  @Post('/organizations/:organizationId/sales-network/memberships')
  @Permissions('broker:sub_agents:manage')
  async createSalesNetworkMembership(@Req() req: any, @Headers() headers: Record<string, any>, @Param('organizationId') organizationId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const membership = await this.tenantOrgService.createSalesNetworkMembership(ctx, { ...body, organizationId });
      return { success: true, data: membership, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: e.name || 'INTERNAL_ERROR', message: e.message }, correlationId };
    }
  }

  @Get('/tenants')
  @Permissions('org_units:list')
  async listTenants(@Req() req: any, @Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    const tenants = await this.tenantOrgService.listTenants(ctx);
    return { success: true, data: tenants, correlationId };
  }

  @Post('/tenants')
  @Permissions('org_units:create')
  async createTenant(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const tenant = await this.tenantOrgService.createTenant(ctx, body);
      return { success: true, data: tenant, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: e.name || 'INTERNAL_ERROR', message: e.message }, correlationId };
    }
  }

  @Patch('/tenants/:tenantId/brand')
  @Permissions('org_units:create')
  async updateBrand(@Req() req: any, @Headers() headers: Record<string, any>, @Param('tenantId') tenantId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const brand = await this.tenantOrgService.updateBrand(ctx, tenantId, body);
      return { success: true, data: brand, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: e.name || 'INTERNAL_ERROR', message: e.message }, correlationId };
    }
  }

  @Get('/tenants/:tenantId/brand')
  @Permissions('org_units:list')
  async getBrand(@Req() req: any, @Headers() headers: Record<string, any>, @Param('tenantId') tenantId: string) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    const brand = await this.tenantOrgService.getBrandByTenant(ctx, tenantId);
    if (!brand) return { success: false, error: { code: 'NOT_FOUND', message: 'Brand not found' }, correlationId };
    return { success: true, data: brand, correlationId };
  }

  @Get('/brand/by-domain')
  async getBrandByDomain(@Headers() headers: Record<string, any>, @Query('domain') domain: string) {
    const correlationId = this.getCorrelationId(headers);
    const brand = await this.tenantOrgService.getBrandByDomain(domain);
    if (!brand) return { success: false, error: { code: 'NOT_FOUND', message: 'Brand not found for domain' }, correlationId };
    return { success: true, data: brand, correlationId };
  }

  @Post('/organizations/:organizationId/broker-license')
  @Permissions('broker:license:verify')
  async upsertBrokerLicense(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('organizationId') organizationId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const license = await this.regulatoryService.upsertLicenseStatus(organizationId, ctx.tenantId || '', body);
      return { success: true, data: license, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: e.name || 'INTERNAL_ERROR', message: e.message }, correlationId };
    }
  }

  @Get('/organizations/:organizationId/broker-license')
  @Permissions('broker:license:verify')
  async getBrokerLicense(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('organizationId') organizationId: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    try {
      const license = await this.regulatoryService.getLicenseStatus(organizationId);
      return { success: true, data: license, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: e.name || 'NOT_FOUND', message: e.message }, correlationId };
    }
  }

  @Post('/organizations/:organizationId/broker-license/validate')
  @Permissions('broker:license:verify')
  async validateBrokerLicense(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('organizationId') organizationId: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const result = await this.regulatoryService.validateBrokerLicense(organizationId, ctx.tenantId || '');
      return { success: true, data: result, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: e.name || 'INTERNAL_ERROR', message: e.message }, correlationId };
    }
  }

  @Post('/regulatory/sync')
  @Permissions('broker:license:verify')
  async syncRegulatoryStatus(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('organizationId') organizationId?: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const result = await this.regulatoryService.syncRegulatoryStatus(ctx.tenantId || '', { organizationId });
      return { success: true, data: result, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: e.name || 'INTERNAL_ERROR', message: e.message }, correlationId };
    }
  }

  @Put('/organizations/:organizationId/rate-limit')
  @Permissions('organization:manage')
  async upsertRateLimit(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('organizationId') organizationId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const config = await this.rateLimitService.upsertRateLimit(organizationId, ctx.tenantId || '', body);
      return { success: true, data: config, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: e.name || 'INTERNAL_ERROR', message: e.message }, correlationId };
    }
  }

  @Get('/organizations/:organizationId/rate-limit')
  @Permissions('organization:manage')
  async getRateLimit(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('organizationId') organizationId: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    try {
      const config = await this.rateLimitService.getRateLimit(organizationId);
      return { success: true, data: config, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: e.name || 'NOT_FOUND', message: e.message }, correlationId };
    }
  }
}
