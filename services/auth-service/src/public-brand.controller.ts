import { Controller, Get, Headers, Query, Param } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TenantOrganizationService } from './tenant-organization/tenant-organization.service';
import { BrandConfigService } from './brand-config.service';

@Controller('api/v1/brand')
export class PublicBrandController {
  constructor(
    private readonly tenantOrgService: TenantOrganizationService,
    private readonly brandConfigService: BrandConfigService,
  ) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    return typeof cid === 'string' && cid.length > 0 ? cid : uuidv4();
  }

  @Get('by-domain')
  async getBrandByDomain(
    @Headers() headers: Record<string, any>,
    @Query('domain') domain: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    if (!domain) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'domain query parameter is required' }, correlationId };
    }
    const brand = await this.tenantOrgService.getBrandByDomain(domain);
    if (!brand) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Brand not found for domain' }, correlationId };
    }
    return { success: true, data: brand, correlationId };
  }

  @Get(':brandKey')
  async getBrandByKey(
    @Headers() headers: Record<string, any>,
    @Param('brandKey') brandKey: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    if (!tenantId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'tenantId query parameter is required' }, correlationId };
    }
    try {
      const brand = await this.brandConfigService.getByKey(tenantId, brandKey);
      return { success: true, data: brand, correlationId };
    } catch {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Brand not found' }, correlationId };
    }
  }
}
