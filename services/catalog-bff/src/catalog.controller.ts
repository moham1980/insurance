import { Controller, Get, Headers, Param, Query, Req, UseGuards } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { JwtAuthGuard } from './jwt-auth.guard';

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
  async listProducts(@Req() req: any, @Headers() headers: Record<string, any>, @Query() query: any) {
    const correlationId = getCorrelationId(headers);
    const user = toUser(req, headers);
    const data = await this.catalogService.listProducts(user, query);
    return { success: true, data, correlationId };
  }

  @Get('/products/:productId')
  async getProduct(@Req() req: any, @Headers() headers: Record<string, any>, @Param('productId') productId: string) {
    const correlationId = getCorrelationId(headers);
    const user = toUser(req, headers);
    const data = await this.catalogService.getProduct(user, productId);
    if (!data) return { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' }, correlationId };
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
    const data = await this.catalogService.listDistributorVisibleProducts(user, distributorOrganizationId, query);
    return { success: true, data, correlationId };
  }

  @Get('/offerings')
  async listBrokerOfferings(@Req() req: any, @Headers() headers: Record<string, any>, @Query() query: any) {
    const correlationId = getCorrelationId(headers);
    const user = toUser(req, headers);
    const data = await this.catalogService.listBrokerOfferings(user, query);
    return { success: true, data, correlationId };
  }

  @Get('/offerings/:offeringId/comparison-hint')
  async getOfferingComparisonHint(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('offeringId') offeringId: string,
  ) {
    const correlationId = getCorrelationId(headers);
    const user = toUser(req, headers);
    const data = await this.catalogService.getOfferingComparisonHint(user, offeringId);
    if (!data) return { success: false, error: { code: 'NOT_FOUND', message: 'Offering not found' }, correlationId };
    return { success: true, data, correlationId };
  }

  @Get('/customer-offerings')
  async listCustomerOfferings(@Req() req: any, @Headers() headers: Record<string, any>, @Query() query: any) {
    const correlationId = getCorrelationId(headers);
    const user = toUser(req, headers);
    const data = await this.catalogService.listCustomerOfferings(user, query);
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
    const data = await this.catalogService.getAgreementEligibility(user, agreementId, lineOfBusiness);
    return { success: true, data, correlationId };
  }
}
