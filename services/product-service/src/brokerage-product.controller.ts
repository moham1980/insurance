import { Body, Controller, ForbiddenException, Get, Headers, Param, Post, Patch, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { BrokerageProductService } from './brokerage-product.service';
import { auditLogger } from './audit.logger';

function toActor(req: any) {
  const user = req?.user || {};
  return {
    tenantId: user.tenantId || req?.tenantId,
    organizationId: user.organizationId || user.oid || user.orgId,
    capabilities: Array.isArray(user.capabilities) ? user.capabilities : [],
    roles: Array.isArray(user.roles) ? user.roles : [],
    userId: user.userId || user.sub,
  };
}

function requireTenant(req: any): string {
  const id = req?.user?.tenantId;
  if (!id) throw new ForbiddenException({ success: false, error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required' } });
  return String(id).trim();
}

function getCorrelationId(headers: Record<string, any>): string {
  const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
  if (typeof cid === 'string' && cid.length > 0) return cid;
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

@Controller('/api/v1')
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class BrokerageProductController {
  constructor(private readonly service: BrokerageProductService) {}

  // ---- P1-1 Product Versioning --------------------------------------------

  @Post('/products')
  @RequirePermissions('product:products:create')
  async createProduct(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = getCorrelationId(headers);
    const actor = toActor(req);
    auditLogger.info('brokerage.product.create.request', { correlationId, tenantId: actor.tenantId, actorUserId: actor.userId });
    const product = await this.service.createProduct(actor, { ...body, correlationId });
    return { success: true, data: product, correlationId };
  }

  @Get('/products')
  @RequirePermissions('product:products:list')
  async listProducts(@Req() req: any, @Headers() headers: Record<string, any>, @Query() query: any) {
    const correlationId = getCorrelationId(headers);
    const actor = toActor(req);
    const { rows, total } = await this.service.listProducts(actor, {
      ownerOrganizationId: query.ownerOrganizationId,
      lineOfBusiness: query.lineOfBusiness,
      status: query.status,
      q: query.q,
      limit: query.limit,
      offset: query.offset,
    });
    return { success: true, data: rows, pagination: { total, limit: query.limit, offset: query.offset }, correlationId };
  }

  @Get('/products/:productId')
  @RequirePermissions('product:products:view')
  async getProduct(@Req() req: any, @Headers() headers: Record<string, any>, @Param('productId') productId: string) {
    const correlationId = getCorrelationId(headers);
    const actor = toActor(req);
    const product = await this.service.getProduct(actor, productId);
    if (!product) return { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' }, correlationId };
    return { success: true, data: product, correlationId };
  }

  @Post('/products/:productId/versions')
  @RequirePermissions('product:versions:create')
  async createProductVersion(@Req() req: any, @Headers() headers: Record<string, any>, @Param('productId') productId: string, @Body() body: any) {
    const correlationId = getCorrelationId(headers);
    const actor = toActor(req);
    const version = await this.service.createProductVersion(actor, productId, { ...body, correlationId });
    return { success: true, data: version, correlationId };
  }

  @Get('/products/:productId/versions')
  @RequirePermissions('product:products:view')
  async listProductVersions(@Req() req: any, @Headers() headers: Record<string, any>, @Param('productId') productId: string, @Query() query: any) {
    const correlationId = getCorrelationId(headers);
    const actor = toActor(req);
    const { rows, total } = await this.service.listProductVersions(actor, productId, { status: query.status, limit: query.limit, offset: query.offset });
    return { success: true, data: rows, pagination: { total, limit: query.limit, offset: query.offset }, correlationId };
  }

  @Get('/products/:productId/versions/:version')
  @RequirePermissions('product:products:view')
  async getProductVersion(@Req() req: any, @Headers() headers: Record<string, any>, @Param('productId') productId: string, @Param('version') version: string) {
    const correlationId = getCorrelationId(headers);
    const actor = toActor(req);
    const v = await this.service.getProductVersion(actor, productId, parseInt(version, 10));
    if (!v) return { success: false, error: { code: 'NOT_FOUND', message: 'Version not found' }, correlationId };
    return { success: true, data: v, correlationId };
  }

  @Post('/products/:productId/versions/:version/activate')
  @RequirePermissions('product:versions:activate')
  async activateProductVersion(@Req() req: any, @Headers() headers: Record<string, any>, @Param('productId') productId: string, @Param('version') version: string, @Body() body: any) {
    const correlationId = getCorrelationId(headers);
    const actor = toActor(req);
    const v = await this.service.activateProductVersion(actor, productId, parseInt(version, 10), { ...body, correlationId });
    return { success: true, data: v, correlationId };
  }

  @Post('/products/:productId/versions/:version/retire')
  @RequirePermissions('product:versions:retire')
  async retireProductVersion(@Req() req: any, @Headers() headers: Record<string, any>, @Param('productId') productId: string, @Param('version') version: string, @Body() body: any) {
    const correlationId = getCorrelationId(headers);
    const actor = toActor(req);
    const v = await this.service.retireProductVersion(actor, productId, parseInt(version, 10), { ...body, correlationId });
    return { success: true, data: v, correlationId };
  }

  @Post('/products/:productId/versions/:version/clone')
  @RequirePermissions('product:versions:create')
  async cloneProductVersion(@Req() req: any, @Headers() headers: Record<string, any>, @Param('productId') productId: string, @Param('version') version: string, @Body() body: any) {
    const correlationId = getCorrelationId(headers);
    const actor = toActor(req);
    const v = await this.service.cloneProductVersion(actor, productId, parseInt(version, 10), { ...body, correlationId });
    return { success: true, data: v, correlationId };
  }

  // ---- P1-2 Product Visibility --------------------------------------------

  @Post('/products/:productId/visibility')
  @RequirePermissions('product:visibility:create')
  async createProductVisibility(@Req() req: any, @Headers() headers: Record<string, any>, @Param('productId') productId: string, @Body() body: any) {
    const correlationId = getCorrelationId(headers);
    const actor = toActor(req);
    const v = await this.service.createProductVisibility(actor, productId, { ...body, correlationId });
    return { success: true, data: v, correlationId };
  }

  @Post('/products/visibility/bulk')
  @RequirePermissions('product:visibility:create')
  async bulkCreateProductVisibility(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = getCorrelationId(headers);
    const actor = toActor(req);
    const result = await this.service.bulkCreateProductVisibility(actor, { ...body, correlationId });
    return { success: true, data: result, correlationId };
  }

  @Get('/products/:productId/visibility')
  @RequirePermissions('product:visibility:view')
  async listProductVisibilities(@Req() req: any, @Headers() headers: Record<string, any>, @Param('productId') productId: string, @Query() query: any) {
    const correlationId = getCorrelationId(headers);
    const actor = toActor(req);
    const { rows, total } = await this.service.listProductVisibilities(actor, productId, { status: query.status, distributorOrganizationId: query.distributorOrganizationId, limit: query.limit, offset: query.offset });
    return { success: true, data: rows, pagination: { total, limit: query.limit, offset: query.offset }, correlationId };
  }

  @Get('/products/:productId/visibility/:visibilityId')
  @RequirePermissions('product:visibility:view')
  async getProductVisibility(@Req() req: any, @Headers() headers: Record<string, any>, @Param('productId') productId: string, @Param('visibilityId') visibilityId: string) {
    const correlationId = getCorrelationId(headers);
    const actor = toActor(req);
    const v = await this.service.getProductVisibility(actor, productId, visibilityId);
    if (!v) return { success: false, error: { code: 'NOT_FOUND', message: 'Visibility not found' }, correlationId };
    return { success: true, data: v, correlationId };
  }

  @Patch('/products/:productId/visibility/:visibilityId')
  @RequirePermissions('product:visibility:create')
  async updateProductVisibility(@Req() req: any, @Headers() headers: Record<string, any>, @Param('productId') productId: string, @Param('visibilityId') visibilityId: string, @Body() body: any) {
    const correlationId = getCorrelationId(headers);
    const actor = toActor(req);
    const v = await this.service.updateProductVisibility(actor, productId, visibilityId, { ...body, correlationId });
    return { success: true, data: v, correlationId };
  }

  @Post('/products/:productId/visibility/:visibilityId/revoke')
  @RequirePermissions('product:visibility:revoke')
  async revokeProductVisibility(@Req() req: any, @Headers() headers: Record<string, any>, @Param('productId') productId: string, @Param('visibilityId') visibilityId: string, @Body() body: any) {
    const correlationId = getCorrelationId(headers);
    const actor = toActor(req);
    const v = await this.service.revokeProductVisibility(actor, productId, visibilityId, { ...body, correlationId });
    return { success: true, data: v, correlationId };
  }

  @Get('/distributors/:distributorOrganizationId/visible-products')
  @RequirePermissions('product:visibility:view')
  async listDistributorVisibleProducts(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('distributorOrganizationId') distributorOrganizationId: string,
    @Query() query: any,
  ) {
    const correlationId = getCorrelationId(headers);
    const actor = toActor(req);
    const { rows, total } = await this.service.listDistributorVisibleProducts(actor, distributorOrganizationId, { productVersion: query.productVersion, agreementId: query.agreementId, limit: query.limit, offset: query.offset });
    return { success: true, data: rows, pagination: { total, limit: query.limit, offset: query.offset }, correlationId };
  }

  // ---- P1-3 Broker Product Offering ---------------------------------------

  @Post('/broker-offerings')
  @RequirePermissions('product:offerings:create')
  async createBrokerProductOffering(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = getCorrelationId(headers);
    const actor = toActor(req);
    const offering = await this.service.createBrokerProductOffering(actor, { ...body, correlationId });
    return { success: true, data: offering, correlationId };
  }

  @Get('/broker-offerings')
  @RequirePermissions('product:offerings:view')
  async listBrokerProductOfferings(@Req() req: any, @Headers() headers: Record<string, any>, @Query() query: any) {
    const correlationId = getCorrelationId(headers);
    const actor = toActor(req);
    const { rows, total } = await this.service.listBrokerProductOfferings(actor, {
      brokerOrganizationId: query.brokerOrganizationId,
      status: query.status,
      lineOfBusiness: query.lineOfBusiness,
      limit: query.limit,
      offset: query.offset,
    });
    return { success: true, data: rows, pagination: { total, limit: query.limit, offset: query.offset }, correlationId };
  }

  @Get('/broker-offerings/:offeringId')
  @RequirePermissions('product:offerings:view')
  async getBrokerProductOffering(@Req() req: any, @Headers() headers: Record<string, any>, @Param('offeringId') offeringId: string) {
    const correlationId = getCorrelationId(headers);
    const actor = toActor(req);
    const offering = await this.service.getBrokerProductOffering(actor, offeringId);
    if (!offering) return { success: false, error: { code: 'NOT_FOUND', message: 'Offering not found' }, correlationId };
    return { success: true, data: offering, correlationId };
  }

  @Patch('/broker-offerings/:offeringId')
  @RequirePermissions('product:offerings:create')
  async updateBrokerProductOffering(@Req() req: any, @Headers() headers: Record<string, any>, @Param('offeringId') offeringId: string, @Body() body: any) {
    const correlationId = getCorrelationId(headers);
    const actor = toActor(req);
    const offering = await this.service.updateBrokerProductOffering(actor, offeringId, { ...body, correlationId });
    return { success: true, data: offering, correlationId };
  }

  @Put('/broker-offerings/:offeringId/commission-tiers')
  @RequirePermissions('product:offerings:create')
  async updateCommissionTiers(@Req() req: any, @Headers() headers: Record<string, any>, @Param('offeringId') offeringId: string, @Body() body: any) {
    const correlationId = getCorrelationId(headers);
    const actor = toActor(req);
    const offering = await this.service.updateCommissionTiers(actor, offeringId, { ...body, correlationId });
    return { success: true, data: offering, correlationId };
  }

  @Post('/broker-offerings/:offeringId/activate')
  @RequirePermissions('product:offerings:activate')
  async activateBrokerProductOffering(@Req() req: any, @Headers() headers: Record<string, any>, @Param('offeringId') offeringId: string, @Body() body: any) {
    const correlationId = getCorrelationId(headers);
    const actor = toActor(req);
    const offering = await this.service.setOfferingStatus(actor, offeringId, 'active', { ...body, correlationId });
    return { success: true, data: offering, correlationId };
  }

  @Post('/broker-offerings/:offeringId/inactivate')
  @RequirePermissions('product:offerings:activate')
  async inactivateBrokerProductOffering(@Req() req: any, @Headers() headers: Record<string, any>, @Param('offeringId') offeringId: string, @Body() body: any) {
    const correlationId = getCorrelationId(headers);
    const actor = toActor(req);
    const offering = await this.service.setOfferingStatus(actor, offeringId, 'inactive', { ...body, correlationId });
    return { success: true, data: offering, correlationId };
  }

  @Get('/customers/offerings')
  @RequirePermissions('product:offerings:view')
  async listCustomerOfferings(@Req() req: any, @Headers() headers: Record<string, any>, @Query() query: any) {
    const correlationId = getCorrelationId(headers);
    const actor = toActor(req);
    const { rows, total } = await this.service.listCustomerOfferings(actor, {
      brokerOrganizationId: query.brokerOrganizationId,
      lineOfBusiness: query.lineOfBusiness,
      currency: query.currency,
      exposure: query.exposure,
      region: query.region,
      limit: query.limit,
      offset: query.offset,
    });
    return { success: true, data: rows, pagination: { total, limit: query.limit, offset: query.offset }, correlationId };
  }
}
