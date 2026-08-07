import { Controller, Get, Headers, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { JwtAuthGuard } from './jwt-auth.guard';

// Cache-Control header value for relatively static catalog responses.
// Sourced from env so operators can tune without code changes.
const CATALOG_CACHE_CONTROL = process.env.CATALOG_CACHE_CONTROL || 'public, max-age=60';

function toUser(req: any, headers: Record<string, any>) {
  const user = req?.user || {};
  return {
    tenantId: user.tenantId,
    organizationId: user.organizationId || user.oid || user.orgId,
    roles: Array.isArray(user.roles) ? user.roles : [],
    capabilities: Array.isArray(user.capabilities) ? user.capabilities : [],
    authorization: (headers.authorization as string) || '',
  };
}

function getCorrelationId(headers: Record<string, any>): string {
  const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
  if (typeof cid === 'string' && cid.length > 0) return cid;
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

@Controller('/api/v1/catalog')
@UseGuards(JwtAuthGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('/products')
  async listProducts(@Req() req: any, @Headers() headers: Record<string, any>, @Query() query: any, @Res({ passthrough: true }) res: any) {
    const correlationId = getCorrelationId(headers);
    const user = toUser(req, headers);
    const data = await this.catalogService.listProducts(user, query, correlationId);
    res.header('Cache-Control', CATALOG_CACHE_CONTROL);
    return { success: true, data, correlationId };
  }

  @Get('/products/:productId')
  async getProduct(@Req() req: any, @Headers() headers: Record<string, any>, @Param('productId') productId: string, @Res({ passthrough: true }) res: any) {
    const correlationId = getCorrelationId(headers);
    const user = toUser(req, headers);
    const data = await this.catalogService.getProduct(user, productId, correlationId);
    if (!data) return { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' }, correlationId };
    res.header('Cache-Control', CATALOG_CACHE_CONTROL);
    return { success: true, data, correlationId };
  }

  @Get('/distributors/:distributorOrganizationId/visible-products')
  async listDistributorVisibleProducts(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('distributorOrganizationId') distributorOrganizationId: string,
    @Query() query: any,
  ) {
    const correlationId = getCorrelationId(headers);
    const user = toUser(req, headers);
    const data = await this.catalogService.listDistributorVisibleProducts(user, distributorOrganizationId, query, correlationId);
    return { success: true, data, correlationId };
  }

  @Get('/offerings')
  async listBrokerOfferings(@Req() req: any, @Headers() headers: Record<string, any>, @Query() query: any) {
    const correlationId = getCorrelationId(headers);
    const user = toUser(req, headers);
    const data = await this.catalogService.listBrokerOfferings(user, query, correlationId);
    return { success: true, data, correlationId };
  }

  @Get('/offerings/:offeringId/comparison-hint')
  async getOfferingComparisonHint(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('offeringId') offeringId: string,
    @Res({ passthrough: true }) res: any,
  ) {
    const correlationId = getCorrelationId(headers);
    const user = toUser(req, headers);
    const data = await this.catalogService.getOfferingComparisonHint(user, offeringId, correlationId);
    if (!data) return { success: false, error: { code: 'NOT_FOUND', message: 'Offering not found' }, correlationId };
    res.header('Cache-Control', CATALOG_CACHE_CONTROL);
    return { success: true, data, correlationId };
  }

  @Get('/customer-offerings')
  async listCustomerOfferings(@Req() req: any, @Headers() headers: Record<string, any>, @Query() query: any) {
    const correlationId = getCorrelationId(headers);
    const user = toUser(req, headers);
    const data = await this.catalogService.listCustomerOfferings(user, query, correlationId);
    return { success: true, data, correlationId };
  }

  @Get('/distribution-agreements/:agreementId/eligibility')
  async getAgreementEligibility(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('agreementId') agreementId: string,
    @Query('lineOfBusiness') lineOfBusiness?: string,
  ) {
    const correlationId = getCorrelationId(headers);
    const user = toUser(req, headers);
    const data = await this.catalogService.getAgreementEligibility(user, agreementId, lineOfBusiness, correlationId);
    return { success: true, data, correlationId };
  }
}
