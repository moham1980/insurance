import { Body, Controller, ForbiddenException, Get, Headers, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { auditLogger } from './audit.logger';
import { ProductService } from './product.service';
import type { ProductStatus } from './entities/Product';
import type { CoverageStatus } from './entities/Coverage';
import type { DeductibleStatus } from './entities/Deductible';
import type { PricingRuleStatus } from './entities/PricingRule';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';

@Controller()
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private requireTenant(req: any): string {
    const tenantId = req?.user?.tenantId;
    if (!tenantId) {
      throw new ForbiddenException({ success: false, error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required' } });
    }
    return String(tenantId).trim();
  }

  @Post('/product/products')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('product:products:create')
  async createProduct(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.requireTenant(req);
    const actor = req?.user as any;

    auditLogger.info('product.products.create.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'product:products:create',
    });

    const p = await this.productService.createProduct({
      tenantId,
      code: body?.code,
      nameFa: body?.nameFa,
      nameEn: body?.nameEn,
      lineOfBusiness: body?.lineOfBusiness,
      metadata: body?.metadata,
      createdBy: actor?.userId ?? null,
      correlationId,
    });

    auditLogger.info('product.products.create.success', { correlationId, tenantId, productId: p.productId });
    return { success: true, data: p, correlationId };
  }

  @Get('/product/products/:productId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('product:products:view')
  async getProduct(@Req() req: any, @Headers() headers: Record<string, any>, @Param('productId') productId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.requireTenant(req);
    const p = await this.productService.getProduct(tenantId, productId);
    if (!p) return { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' }, correlationId };
    return { success: true, data: p, correlationId };
  }

  @Get('/product/products')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('product:products:list')
  async listProducts(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('status') status?: ProductStatus,
    @Query('lineOfBusiness') lineOfBusiness?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.requireTenant(req);
    const paging = this.productService.normalizePaging(limit, offset);
    const out = await this.productService.listProducts({
      tenantId,
      status,
      lineOfBusiness,
      q,
      limit: paging.limit,
      offset: paging.offset,
    });
    return { success: true, data: out, correlationId };
  }

  @Patch('/product/products/:productId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('product:products:update')
  async updateProduct(@Req() req: any, @Headers() headers: Record<string, any>, @Param('productId') productId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.requireTenant(req);
    const p = await this.productService.updateProduct({
      tenantId,
      productId,
      nameFa: body?.nameFa,
      nameEn: body?.nameEn,
      lineOfBusiness: body?.lineOfBusiness,
      metadata: body?.metadata,
      status: body?.status,
      correlationId,
    });
    return { success: true, data: p, correlationId };
  }

  @Post('/product/products/:productId/archive')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('product:products:archive')
  async archiveProduct(@Req() req: any, @Headers() headers: Record<string, any>, @Param('productId') productId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.requireTenant(req);
    const p = await this.productService.archiveProduct({ tenantId, productId, correlationId });
    return { success: true, data: p, correlationId };
  }

  @Post('/product/coverages')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('product:coverages:create')
  async createCoverage(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.requireTenant(req);
    const actor = req?.user as any;

    auditLogger.info('product.coverages.create.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'product:coverages:create',
    });

    const c = await this.productService.createCoverage({
      tenantId,
      productId: body?.productId,
      code: body?.code,
      nameFa: body?.nameFa,
      terms: body?.terms,
      createdBy: actor?.userId ?? null,
      correlationId,
    });

    auditLogger.info('product.coverages.create.success', { correlationId, tenantId, coverageId: c.coverageId });
    return { success: true, data: c, correlationId };
  }

  @Get('/product/coverages/:coverageId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('product:coverages:view')
  async getCoverage(@Req() req: any, @Headers() headers: Record<string, any>, @Param('coverageId') coverageId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.requireTenant(req);
    const c = await this.productService.getCoverage(tenantId, coverageId);
    if (!c) return { success: false, error: { code: 'NOT_FOUND', message: 'Coverage not found' }, correlationId };
    return { success: true, data: c, correlationId };
  }

  @Get('/product/coverages')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('product:coverages:list')
  async listCoverages(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('productId') productId?: string,
    @Query('status') status?: CoverageStatus,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.requireTenant(req);
    const paging = this.productService.normalizePaging(limit, offset);
    const out = await this.productService.listCoverages({
      tenantId,
      productId,
      status,
      q,
      limit: paging.limit,
      offset: paging.offset,
    });
    return { success: true, data: out, correlationId };
  }

  @Patch('/product/coverages/:coverageId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('product:coverages:update')
  async updateCoverage(@Req() req: any, @Headers() headers: Record<string, any>, @Param('coverageId') coverageId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.requireTenant(req);
    const actor = req?.user as any;
    const c = await this.productService.updateCoverage({
      tenantId,
      coverageId,
      nameFa: body?.nameFa,
      terms: body?.terms,
      status: body?.status,
      changeReason: body?.changeReason,
      changedBy: actor?.userId ?? null,
      correlationId,
    });
    return { success: true, data: c, correlationId };
  }

  @Post('/product/coverages/:coverageId/archive')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('product:coverages:archive')
  async archiveCoverage(@Req() req: any, @Headers() headers: Record<string, any>, @Param('coverageId') coverageId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.requireTenant(req);
    const c = await this.productService.archiveCoverage({ tenantId, coverageId, correlationId });
    return { success: true, data: c, correlationId };
  }

  @Post('/product/deductibles')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('product:deductibles:create')
  async createDeductible(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.requireTenant(req);
    const actor = req?.user as any;

    auditLogger.info('product.deductibles.create.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'product:deductibles:create',
    });

    const d = await this.productService.createDeductible({
      tenantId,
      productId: body?.productId,
      code: body?.code,
      nameFa: body?.nameFa,
      kind: body?.kind,
      value: body?.value,
      createdBy: actor?.userId ?? null,
      correlationId,
    });

    auditLogger.info('product.deductibles.create.success', { correlationId, tenantId, deductibleId: d.deductibleId });
    return { success: true, data: d, correlationId };
  }

  @Get('/product/deductibles/:deductibleId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('product:deductibles:view')
  async getDeductible(@Req() req: any, @Headers() headers: Record<string, any>, @Param('deductibleId') deductibleId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.requireTenant(req);
    const d = await this.productService.getDeductible(tenantId, deductibleId);
    if (!d) return { success: false, error: { code: 'NOT_FOUND', message: 'Deductible not found' }, correlationId };
    return { success: true, data: d, correlationId };
  }

  @Get('/product/deductibles')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('product:deductibles:list')
  async listDeductibles(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('productId') productId?: string,
    @Query('status') status?: DeductibleStatus,
    @Query('kind') kind?: any,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.requireTenant(req);
    const paging = this.productService.normalizePaging(limit, offset);
    const out = await this.productService.listDeductibles({
      tenantId,
      productId,
      status,
      kind,
      q,
      limit: paging.limit,
      offset: paging.offset,
    });
    return { success: true, data: out, correlationId };
  }

  @Patch('/product/deductibles/:deductibleId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('product:deductibles:update')
  async updateDeductible(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('deductibleId') deductibleId: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.requireTenant(req);
    const actor = req?.user as any;
    const d = await this.productService.updateDeductible({
      tenantId,
      deductibleId,
      nameFa: body?.nameFa,
      kind: body?.kind,
      value: body?.value,
      status: body?.status,
      changeReason: body?.changeReason,
      changedBy: actor?.userId ?? null,
      correlationId,
    });
    return { success: true, data: d, correlationId };
  }

  @Post('/product/deductibles/:deductibleId/archive')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('product:deductibles:archive')
  async archiveDeductible(@Req() req: any, @Headers() headers: Record<string, any>, @Param('deductibleId') deductibleId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.requireTenant(req);
    const d = await this.productService.archiveDeductible({ tenantId, deductibleId, correlationId });
    return { success: true, data: d, correlationId };
  }

  @Post('/product/pricing-rules')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('product:pricing_rules:create')
  async createPricingRule(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.requireTenant(req);
    const actor = req?.user as any;

    auditLogger.info('product.pricing_rules.create.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'product:pricing_rules:create',
    });

    const r = await this.productService.createPricingRule({
      tenantId,
      productId: body?.productId,
      code: body?.code,
      nameFa: body?.nameFa,
      ruleType: body?.ruleType,
      priority: body?.priority,
      rule: body?.rule,
      conditions: body?.conditions,
      validFrom: body?.validFrom ? new Date(body.validFrom) : undefined,
      validTo: body?.validTo ? new Date(body.validTo) : undefined,
      regions: body?.regions,
      createdBy: actor?.userId ?? null,
      correlationId,
    });

    auditLogger.info('product.pricing_rules.create.success', { correlationId, tenantId, pricingRuleId: r.pricingRuleId });
    return { success: true, data: r, correlationId };
  }

  @Get('/product/pricing-rules/:pricingRuleId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('product:pricing_rules:view')
  async getPricingRule(@Req() req: any, @Headers() headers: Record<string, any>, @Param('pricingRuleId') pricingRuleId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.requireTenant(req);
    const r = await this.productService.getPricingRule(tenantId, pricingRuleId);
    if (!r) return { success: false, error: { code: 'NOT_FOUND', message: 'Pricing rule not found' }, correlationId };
    return { success: true, data: r, correlationId };
  }

  @Get('/product/pricing-rules')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('product:pricing_rules:list')
  async listPricingRules(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('productId') productId?: string,
    @Query('status') status?: PricingRuleStatus,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.requireTenant(req);
    const paging = this.productService.normalizePaging(limit, offset);
    const out = await this.productService.listPricingRules({
      tenantId,
      productId,
      status,
      q,
      limit: paging.limit,
      offset: paging.offset,
    });
    return { success: true, data: out, correlationId };
  }

  @Patch('/product/pricing-rules/:pricingRuleId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('product:pricing_rules:update')
  async updatePricingRule(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('pricingRuleId') pricingRuleId: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.requireTenant(req);
    const actor = req?.user as any;
    const r = await this.productService.updatePricingRule({
      tenantId,
      pricingRuleId,
      nameFa: body?.nameFa,
      ruleType: body?.ruleType,
      priority: body?.priority,
      rule: body?.rule,
      conditions: body?.conditions,
      validFrom: body?.validFrom ? new Date(body.validFrom) : undefined,
      validTo: body?.validTo ? new Date(body.validTo) : undefined,
      regions: body?.regions,
      status: body?.status,
      changeReason: body?.changeReason,
      changedBy: actor?.userId ?? null,
      correlationId,
    });
    return { success: true, data: r, correlationId };
  }

  @Post('/product/pricing-rules/:pricingRuleId/archive')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('product:pricing_rules:archive')
  async archivePricingRule(@Req() req: any, @Headers() headers: Record<string, any>, @Param('pricingRuleId') pricingRuleId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.requireTenant(req);
    const r = await this.productService.archivePricingRule({ tenantId, pricingRuleId, correlationId });
    return { success: true, data: r, correlationId };
  }

  @Get('/product/export')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('product:export')
  async export(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('productId') productId?: string,
    @Query('status') status?: ProductStatus,
    @Query('includeVersions') includeVersions?: string,
    @Query('limit') limit: string = '200',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.requireTenant(req);
    const actor = req?.user as any;

    auditLogger.info('product.export.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'product:export',
      productId,
      status,
    });

    const paging = this.productService.normalizePaging(limit, offset);
    const snap = await this.productService.exportSnapshot({
      tenantId,
      productId,
      status,
      includeVersions: includeVersions === 'true' || includeVersions === '1',
      limit: paging.limit,
      offset: paging.offset,
    });

    auditLogger.info('product.export.success', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'product:export',
      counts: {
        products: snap.products.length,
        coverages: snap.coverages.length,
        deductibles: snap.deductibles.length,
        pricingRules: snap.pricingRules.length,
        productVersions: snap.productVersions?.length ?? 0,
      },
    });

    return { success: true, data: snap, correlationId };
  }

  @Post('/product/quote')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('product:quote')
  async quote(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.requireTenant(req);
    const actor = req?.user as any;

    auditLogger.info('product.quote.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'product:quote',
      productId: body?.productId,
    });

    const out = await this.productService.computeQuote({
      tenantId,
      productId: body?.productId,
      currency: body?.currency,
      exposure: body?.exposure,
      region: body?.region,
      effectiveDate: body?.effectiveDate,
      version: body?.version !== undefined ? Number(body.version) : undefined,
    });

    auditLogger.info('product.quote.success', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      productId: out.productId,
      totalPremium: out.totalPremium,
    });

    return { success: true, data: out, correlationId };
  }

  // Product Versioning Endpoints
  @Get('/product/products/:productId/versions')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('product:products:view')
  async listProductVersions(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('productId') productId: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.requireTenant(req);
    const paging = this.productService.normalizePaging(limit, offset);
    const versions = await this.productService.listProductVersions({
      tenantId,
      productId,
      limit: paging.limit,
      offset: paging.offset,
    });
    return { success: true, data: versions, correlationId };
  }

  @Get('/product/products/:productId/versions/:version')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('product:products:view')
  async getProductVersion(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('productId') productId: string,
    @Param('version') version: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.requireTenant(req);
    const v = await this.productService.getProductVersion({ tenantId, productId, version: parseInt(version, 10) });
    if (!v) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Version not found' }, correlationId };
    }
    return { success: true, data: v, correlationId };
  }

  // Advanced Pricing Rules Endpoints
  @Post('/product/products/:productId/pricing-rules/evaluate')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('product:products:view')
  async evaluatePricingRules(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('productId') productId: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);

    if (!body?.exposure) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'exposure is required' }, correlationId };
    }

    const tenantId = this.requireTenant(req);
    const result = await this.productService.evaluatePricingRules({
      tenantId,
      productId,
      currency: body?.currency,
      exposure: body.exposure,
      region: body.region,
      effectiveDate: body.effectiveDate,
      version: body?.version !== undefined ? Number(body.version) : undefined,
    });

    return { success: true, data: result, correlationId };
  }
}
