import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ActorContext, requireContext, hasCapability, parseDate, moneyFromBody, moneyFields, normalizePaging } from './brokerage-product.utils';
import { Product, type ProductStatus } from './entities/Product';
import { ProductVersion, type ProductVersionStatus } from './entities/ProductVersion';
import { CoverageDefinition, type CoverageDefinitionStatus, type CoverageDefinitionType } from './entities/CoverageDefinition';
import { RateTableVersion, type RateTableVersionStatus, type RateTableAlgorithmType } from './entities/RateTableVersion';
import { ProductVisibility, type ProductVisibilityStatus, type ProductVisibilityType } from './entities/ProductVisibility';
import { BrokerProductOffering, type BrokerProductOfferingStatus } from './entities/BrokerProductOffering';
import { BundleRule } from './entities/BundleRule';
import { RecommendationRule } from './entities/RecommendationRule';
import { OutboxPublisher } from '@insurance/shared';
import { ProductService } from './product.service';

@Injectable()
export class BrokerageProductService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
    @InjectRepository(ProductVersion) private readonly versionsRepo: Repository<ProductVersion>,
    @InjectRepository(CoverageDefinition) private readonly coverageDefsRepo: Repository<CoverageDefinition>,
    @InjectRepository(RateTableVersion) private readonly rateTablesRepo: Repository<RateTableVersion>,
    @InjectRepository(ProductVisibility) private readonly visibilityRepo: Repository<ProductVisibility>,
    @InjectRepository(BrokerProductOffering) private readonly offeringsRepo: Repository<BrokerProductOffering>,
    @InjectRepository(BundleRule) private readonly bundleRulesRepo: Repository<BundleRule>,
    @InjectRepository(RecommendationRule) private readonly recommendationRulesRepo: Repository<RecommendationRule>,
    private readonly productService: ProductService,
  ) {}

  // --------------------------------------------------------------------------
  // P1-1 Product Versioning
  // --------------------------------------------------------------------------

  async createProduct(ctx: ActorContext, dto: any): Promise<Product> {
    const { tenantId, orgId } = requireContext(ctx);
    if (!hasCapability(ctx, 'CARRIER', 'MGA')) {
      throw new ForbiddenException({ success: false, error: { code: 'CAPABILITY_REQUIRED', message: 'Only CARRIER or MGA can create products' } });
    }

    const code = String(dto.productCode || dto.code || '').trim();
    const nameFa = String(dto.nameFa || '').trim();
    const nameEn = dto.nameEn ? String(dto.nameEn).trim() : null;
    const lineOfBusiness = String(dto.lineOfBusiness || '').trim();
    const effectiveFrom = parseDate(dto.effectiveFrom) || new Date();
    const effectiveTo = parseDate(dto.effectiveTo);

    if (!code || !nameFa || !lineOfBusiness) {
      throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'productCode/code, nameFa, lineOfBusiness are required' } });
    }

    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const existing = await manager.findOne(Product, { where: { tenantId, code } });
      if (existing) {
        throw new BadRequestException({ success: false, error: { code: 'DUPLICATE', message: 'Product code already exists for tenant' } });
      }

      const productId = uuidv4();
      const product = manager.create(Product, {
        productId,
        tenantId,
        ownerTenantId: tenantId,
        ownerOrganizationId: orgId,
        code,
        nameFa,
        nameEn,
        lineOfBusiness,
        status: 'draft',
        version: 1,
        currentVersion: 1,
        effectiveFrom,
        effectiveTo,
        metadata: dto.metadata ?? null,
        createdBy: ctx.userId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await manager.save(product);

      const version = manager.create(ProductVersion, {
        productVersionId: uuidv4(),
        tenantId,
        productId,
        code,
        nameFa,
        nameEn,
        lineOfBusiness,
        status: 'draft',
        version: 1,
        changeReason: 'Initial product version',
        changedBy: ctx.userId ?? null,
        effectiveFrom,
        effectiveTo,
        effectiveDate: null,
        publishedAt: null,
        formSchema: dto.formSchema ?? null,
        requiredDocuments: Array.isArray(dto.requiredDocuments) ? dto.requiredDocuments : null,
        approvedBy: null,
        approvedAt: null,
        snapshot: null,
        createdAt: new Date(),
      });
      await manager.save(version);

      await this.createCoverageDefinitions(manager, tenantId, version.productVersionId, dto.coverages, ctx.userId);
      await this.createRateTableVersions(manager, tenantId, version.productVersionId, dto.rateTables, ctx.userId);

      await outbox.publish({
        topic: 'insurance.product.events',
        eventType: 'ProductCreated',
        eventVersion: 1,
        correlationId: dto.correlationId || uuidv4(),
        tenantId,
        organizationId: orgId,
        dataClassification: 'INTERNAL',
        subject: { type: 'Product', id: productId },
        payload: {
          tenantId,
          organizationId: orgId,
          productId,
          productCode: code,
          nameFa,
          lineOfBusiness,
          status: product.status,
          currentVersion: product.currentVersion,
          effectiveFrom: effectiveFrom.toISOString(),
          effectiveTo: effectiveTo?.toISOString() ?? null,
        },
      });

      return product;
    });
  }

  async listProducts(ctx: ActorContext, filters: any): Promise<{ rows: Product[]; total: number }> {
    const { tenantId } = requireContext(ctx);
    const { limit, offset } = normalizePaging(filters.limit, filters.offset);
    const qb = this.productsRepo.createQueryBuilder('p');
    qb.andWhere('p.tenant_id = :tenantId', { tenantId });
    if (filters.ownerOrganizationId) qb.andWhere('p.owner_organization_id = :ownerOrganizationId', { ownerOrganizationId: filters.ownerOrganizationId });
    if (filters.lineOfBusiness) qb.andWhere('p.line_of_business = :lob', { lob: filters.lineOfBusiness });
    if (filters.status) qb.andWhere('p.status = :status', { status: filters.status });
    if (filters.q) qb.andWhere('(p.code ILIKE :q OR p.name_fa ILIKE :q OR p.name_en ILIKE :q)', { q: `%${filters.q}%` });
    qb.orderBy('p.created_at', 'DESC').limit(limit).offset(offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async getProduct(ctx: ActorContext, productId: string): Promise<Product | null> {
    const { tenantId } = requireContext(ctx);
    return this.productsRepo.findOne({ where: { tenantId, productId } });
  }

  async listProductVersions(ctx: ActorContext, productId: string, filters: any): Promise<{ rows: ProductVersion[]; total: number }> {
    const { tenantId } = requireContext(ctx);
    const { limit, offset } = normalizePaging(filters.limit, filters.offset);
    const qb = this.versionsRepo.createQueryBuilder('pv');
    qb.andWhere('pv.tenant_id = :tenantId', { tenantId });
    qb.andWhere('pv.product_id = :productId', { productId });
    if (filters.status) qb.andWhere('pv.status = :status', { status: filters.status });
    qb.orderBy('pv.version', 'DESC').limit(limit).offset(offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async getProductVersion(ctx: ActorContext, productId: string, version: number): Promise<ProductVersion | null> {
    const { tenantId } = requireContext(ctx);
    return this.versionsRepo.findOne({ where: { tenantId, productId, version } });
  }

  async createProductVersion(ctx: ActorContext, productId: string, dto: any): Promise<ProductVersion> {
    const { tenantId, orgId } = requireContext(ctx);
    if (!hasCapability(ctx, 'CARRIER', 'MGA', 'insurer:products:publish')) {
      throw new ForbiddenException({ success: false, error: { code: 'CAPABILITY_REQUIRED', message: 'Only CARRIER or MGA can create product versions' } });
    }

    return await this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, { where: { tenantId, productId } });
      if (!product) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
      if (product.status === 'retired' || product.status === 'archived') {
        throw new BadRequestException({ success: false, error: { code: 'INVALID_STATUS', message: 'Cannot version a retired product' } });
      }
      if (product.ownerOrganizationId && product.ownerOrganizationId !== orgId) {
        throw new ForbiddenException({ success: false, error: { code: 'ORGANIZATION_MISMATCH', message: 'Product belongs to another organization' } });
      }

      const latest = await manager.findOne(ProductVersion, {
        where: { tenantId, productId },
        order: { version: 'DESC' },
      });
      const nextVersion = (latest?.version ?? 0) + 1;
      const effectiveFrom = parseDate(dto.effectiveFrom) || new Date();
      const effectiveTo = parseDate(dto.effectiveTo);

      const version = manager.create(ProductVersion, {
        productVersionId: uuidv4(),
        tenantId,
        productId,
        code: product.code,
        nameFa: dto.nameFa ? String(dto.nameFa).trim() : product.nameFa,
        nameEn: dto.nameEn ? String(dto.nameEn).trim() : product.nameEn,
        lineOfBusiness: dto.lineOfBusiness ? String(dto.lineOfBusiness).trim() : product.lineOfBusiness,
        status: 'draft',
        version: nextVersion,
        changeReason: dto.changeReason || 'New version created',
        changedBy: ctx.userId ?? null,
        effectiveFrom,
        effectiveTo,
        effectiveDate: null,
        publishedAt: null,
        formSchema: dto.formSchema ?? null,
        requiredDocuments: Array.isArray(dto.requiredDocuments) ? dto.requiredDocuments : null,
        approvedBy: null,
        approvedAt: null,
        snapshot: null,
        createdAt: new Date(),
      });
      await manager.save(version);

      await this.createCoverageDefinitions(manager, tenantId, version.productVersionId, dto.coverages, ctx.userId);
      await this.createRateTableVersions(manager, tenantId, version.productVersionId, dto.rateTables, ctx.userId);

      product.version = nextVersion;
      product.currentVersion = product.version;
      product.updatedAt = new Date();
      await manager.save(product);

      return version;
    });
  }

  async activateProductVersion(ctx: ActorContext, productId: string, version: number, dto: any): Promise<ProductVersion> {
    const { tenantId, orgId } = requireContext(ctx);
    if (!hasCapability(ctx, 'CARRIER', 'MGA', 'insurer:products:publish')) {
      throw new ForbiddenException({ success: false, error: { code: 'CAPABILITY_REQUIRED', message: 'Only CARRIER or MGA can activate product versions' } });
    }

    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const product = await manager.findOne(Product, { where: { tenantId, productId } });
      if (!product) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
      if (product.ownerOrganizationId && product.ownerOrganizationId !== orgId) {
        throw new ForbiddenException({ success: false, error: { code: 'ORGANIZATION_MISMATCH', message: 'Product belongs to another organization' } });
      }

      const versionRow = await manager.findOne(ProductVersion, { where: { tenantId, productId, version } });
      if (!versionRow) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Version not found' } });
      if (versionRow.status !== 'draft') {
        throw new BadRequestException({ success: false, error: { code: 'INVALID_STATUS', message: 'Only draft versions can be activated' } });
      }

      const effectiveFrom = parseDate(dto.effectiveFrom) || new Date();
      const effectiveTo = parseDate(dto.effectiveTo) || versionRow.effectiveTo;

      // Supersede any previously active version
      await manager.update(
        ProductVersion,
        { tenantId, productId, status: 'active' },
        { status: 'superseded' } as any,
      );

      versionRow.status = 'active';
      versionRow.effectiveFrom = effectiveFrom;
      versionRow.effectiveTo = effectiveTo;
      versionRow.effectiveDate = effectiveFrom;
      versionRow.publishedAt = new Date();
      versionRow.approvedBy = ctx.userId ?? null;
      versionRow.approvedAt = new Date();
      versionRow.updatedAt = new Date();
      await manager.save(versionRow);

      product.status = product.status === 'draft' ? 'active' : product.status;
      product.currentVersion = version;
      product.effectiveFrom = effectiveFrom;
      product.effectiveTo = effectiveTo;
      product.updatedAt = new Date();
      await manager.save(product);

      await outbox.publish({
        topic: 'insurance.product.events',
        eventType: 'ProductVersionActivated',
        eventVersion: 1,
        correlationId: dto.correlationId || uuidv4(),
        tenantId,
        organizationId: orgId,
        dataClassification: 'INTERNAL',
        subject: { type: 'ProductVersion', id: versionRow.productVersionId },
        payload: {
          tenantId,
          organizationId: orgId,
          productId,
          productVersion: version,
          effectiveFrom: effectiveFrom.toISOString(),
          effectiveTo: effectiveTo?.toISOString() ?? null,
          approvedBy: versionRow.approvedBy,
          approvedAt: versionRow.approvedAt.toISOString(),
        },
      });

      return versionRow;
    });
  }

  async retireProductVersion(ctx: ActorContext, productId: string, version: number, dto: any): Promise<ProductVersion> {
    const { tenantId, orgId } = requireContext(ctx);
    if (!hasCapability(ctx, 'CARRIER', 'MGA', 'insurer:products:publish')) {
      throw new ForbiddenException({ success: false, error: { code: 'CAPABILITY_REQUIRED', message: 'Only CARRIER or MGA can retire product versions' } });
    }

    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const product = await manager.findOne(Product, { where: { tenantId, productId } });
      if (!product) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
      if (product.ownerOrganizationId && product.ownerOrganizationId !== orgId) {
        throw new ForbiddenException({ success: false, error: { code: 'ORGANIZATION_MISMATCH', message: 'Product belongs to another organization' } });
      }

      const versionRow = await manager.findOne(ProductVersion, { where: { tenantId, productId, version } });
      if (!versionRow) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Version not found' } });
      if (versionRow.status !== 'active' && versionRow.status !== 'draft' && versionRow.status !== 'superseded') {
        throw new BadRequestException({ success: false, error: { code: 'INVALID_STATUS', message: 'Version cannot be retired' } });
      }

      versionRow.status = 'retired';
      versionRow.effectiveTo = new Date();
      versionRow.updatedAt = new Date();
      await manager.save(versionRow);

      if (product.currentVersion === version) {
        product.status = 'retired';
        product.updatedAt = new Date();
        await manager.save(product);
      }

      await outbox.publish({
        topic: 'insurance.product.events',
        eventType: 'ProductVersionRetired',
        eventVersion: 1,
        correlationId: dto.correlationId || uuidv4(),
        tenantId,
        organizationId: orgId,
        dataClassification: 'INTERNAL',
        subject: { type: 'ProductVersion', id: versionRow.productVersionId },
        payload: { tenantId, organizationId: orgId, productId, productVersion: version },
      });

      return versionRow;
    });
  }

  async cloneProductVersion(ctx: ActorContext, productId: string, version: number, dto: any): Promise<ProductVersion> {
    const { tenantId } = requireContext(ctx);
    const source = await this.versionsRepo.findOne({ where: { tenantId: ctx.tenantId, productId, version } });
    if (!source) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Version not found' } });

    const cloneDto = {
      ...dto,
      nameFa: dto.nameFa ?? source.nameFa,
      nameEn: dto.nameEn ?? source.nameEn,
      lineOfBusiness: dto.lineOfBusiness ?? source.lineOfBusiness,
      formSchema: dto.formSchema ?? source.formSchema,
      requiredDocuments: dto.requiredDocuments ?? source.requiredDocuments,
      effectiveFrom: dto.effectiveFrom ?? source.effectiveFrom,
      effectiveTo: dto.effectiveTo ?? source.effectiveTo,
    };
    const clonedVersion = await this.createProductVersion(ctx, productId, cloneDto);

    // P1-1.5: Auto-migrate visibilities from source version to cloned version
    const sourceVisibilities = await this.visibilityRepo.find({
      where: { tenantId, productId, productVersion: version, status: 'active' },
    });
    if (sourceVisibilities.length > 0) {
      await this.dataSource.transaction(async (manager) => {
        const outbox = new OutboxPublisher(manager);
        for (const sv of sourceVisibilities) {
          const newVis = manager.create(ProductVisibility, {
            visibilityId: uuidv4(),
            tenantId,
            productId,
            productVersion: clonedVersion.version,
            distributorOrganizationId: sv.distributorOrganizationId,
            visibilityType: sv.visibilityType,
            distributionAgreementId: sv.distributionAgreementId,
            agreementVersionAtCreation: sv.agreementVersionAtCreation,
            markupRules: sv.markupRules,
            allowedTerritories: sv.allowedTerritories,
            allowedSalesChannels: sv.allowedSalesChannels,
            status: 'active',
            effectiveFrom: new Date(),
            effectiveTo: sv.effectiveTo,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          await manager.save(newVis);
          await outbox.publish({
            topic: 'insurance.product.events',
            eventType: 'ProductVisibilityMigrated',
            eventVersion: 1,
            correlationId: dto.correlationId || uuidv4(),
            tenantId,
            organizationId: ctx.organizationId || undefined,
            dataClassification: 'INTERNAL',
            subject: { type: 'ProductVisibility', id: newVis.visibilityId },
            payload: {
              tenantId,
              productId,
              sourceVersion: version,
              targetVersion: clonedVersion.version,
              distributorOrganizationId: sv.distributorOrganizationId,
              distributionAgreementId: sv.distributionAgreementId,
            },
          });
        }
      });
    }

    return clonedVersion;
  }

  private async createCoverageDefinitions(
    manager: any,
    tenantId: string,
    productVersionId: string,
    coverages: any[] | undefined,
    createdBy?: string | null,
  ): Promise<void> {
    if (!Array.isArray(coverages)) return;
    for (const c of coverages) {
      const type: CoverageDefinitionType = c.type === 'optional' ? 'optional' : 'mandatory';
      const min = moneyFields(c.minLimit);
      const max = moneyFields(c.maxLimit);
      const cd = manager.create(CoverageDefinition, {
        coverageDefinitionId: uuidv4(),
        tenantId,
        productVersionId,
        code: String(c.code || '').trim(),
        nameFa: String(c.nameFa || '').trim(),
        nameEn: c.nameEn ? String(c.nameEn).trim() : null,
        description: c.description ? String(c.description) : null,
        type,
        minLimitAmountMinor: min.amountMinor,
        minLimitCurrency: min.currency,
        maxLimitAmountMinor: max.amountMinor,
        maxLimitCurrency: max.currency,
        deductibleOptions: Array.isArray(c.deductibleOptions) ? c.deductibleOptions : null,
        defaultSelected: c.defaultSelected === true,
        status: (c.status as CoverageDefinitionStatus) || 'active',
        createdBy: createdBy ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await manager.save(cd);
    }
  }

  private async createRateTableVersions(
    manager: any,
    tenantId: string,
    productVersionId: string,
    rateTables: any[] | undefined,
    createdBy?: string | null,
  ): Promise<void> {
    if (!Array.isArray(rateTables)) return;
    let idx = 1;
    for (const r of rateTables) {
      const algorithmType: RateTableAlgorithmType = ['table', 'formula', 'ml_model'].includes(r.algorithmType) ? r.algorithmType : 'table';
      const rt = manager.create(RateTableVersion, {
        rateTableVersionId: uuidv4(),
        tenantId,
        productVersionId,
        version: typeof r.version === 'number' ? r.version : idx++,
        algorithmType,
        parametersSchema: r.parametersSchema ?? null,
        status: (r.status as RateTableVersionStatus) || 'active',
        createdBy: createdBy ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await manager.save(rt);
    }
  }

  // --------------------------------------------------------------------------
  // P1-2 Product Visibility
  // --------------------------------------------------------------------------

  async createProductVisibility(ctx: ActorContext, productId: string, dto: any): Promise<ProductVisibility> {
    const { tenantId, orgId } = requireContext(ctx);
    if (!hasCapability(ctx, 'CARRIER', 'MGA', 'insurer:products:publish')) {
      throw new ForbiddenException({ success: false, error: { code: 'CAPABILITY_REQUIRED', message: 'Only CARRIER or MGA can create visibility' } });
    }

    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const product = await manager.findOne(Product, { where: { tenantId, productId } });
      if (!product) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
      if (product.ownerOrganizationId && product.ownerOrganizationId !== orgId) {
        throw new ForbiddenException({ success: false, error: { code: 'ORGANIZATION_MISMATCH', message: 'Product belongs to another organization' } });
      }

      // P1-2.2: Support version-level visibility — allow specifying a specific version
      let targetVersion: ProductVersion | null;
      if (typeof dto.productVersion === 'number' || (dto.productVersionId && typeof dto.productVersionId === 'string')) {
        const versionWhere: any = { tenantId, productId };
        if (typeof dto.productVersion === 'number') {
          versionWhere.version = dto.productVersion;
        } else {
          versionWhere.productVersionId = dto.productVersionId;
        }
        targetVersion = await manager.findOne(ProductVersion, { where: versionWhere });
        if (!targetVersion) {
          throw new BadRequestException({ success: false, error: { code: 'VERSION_NOT_FOUND', message: 'Specified product version not found' } });
        }
        if (targetVersion.status === 'retired') {
          throw new BadRequestException({ success: false, error: { code: 'VERSION_RETIRED', message: 'Cannot create visibility for a retired version' } });
        }
      } else {
        targetVersion = await manager.findOne(ProductVersion, {
          where: { tenantId, productId, status: 'active' },
          order: { version: 'DESC' },
        });
        if (!targetVersion) {
          throw new BadRequestException({ success: false, error: { code: 'NO_ACTIVE_VERSION', message: 'Visibility can only be created for an active product version' } });
        }
      }

      const distributionAgreementId = String(dto.distributionAgreementId || '').trim();
      const distributorOrganizationId = dto.distributorOrganizationId ? String(dto.distributorOrganizationId).trim() : null;
      const agreementVersion = typeof dto.agreementVersionAtCreation === 'number' ? dto.agreementVersionAtCreation : 1;
      const visibilityType: ProductVisibilityType = ['private', 'exclusive', 'marketplace'].includes(dto.visibilityType) ? dto.visibilityType : 'private';
      const effectiveFrom = parseDate(dto.effectiveFrom) || new Date();
      const effectiveTo = parseDate(dto.effectiveTo);

      if (!distributionAgreementId) {
        throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'distributionAgreementId is required' } });
      }

      // P1-2.1: Validate agreement exists and distributor matches
      const agreementRows = await manager.query(
        `SELECT distributor_organization_id, effective_from, effective_to, status, settlement_terms
         FROM distribution_agreements WHERE agreement_id = $1 AND tenant_id = $2`,
        [distributionAgreementId, tenantId]
      );
      if (!agreementRows || agreementRows.length === 0) {
        throw new BadRequestException({ success: false, error: { code: 'AGREEMENT_NOT_FOUND', message: 'Distribution agreement not found' } });
      }
      const agreement = agreementRows[0];
      if (distributorOrganizationId && agreement.distributor_organization_id &&
          String(distributorOrganizationId) !== String(agreement.distributor_organization_id)) {
        throw new BadRequestException({ success: false, error: { code: 'DISTRIBUTOR_MISMATCH', message: 'distributorOrganizationId does not match agreement distributor' } });
      }

      // P1-2.1: Validate visibility effective period is within agreement effective period
      const agreementFrom = agreement.effective_from ? new Date(agreement.effective_from) : null;
      const agreementTo = agreement.effective_to ? new Date(agreement.effective_to) : null;
      if (agreementFrom && effectiveFrom < agreementFrom) {
        throw new BadRequestException({ success: false, error: { code: 'EFFECTIVE_PERIOD_OUTSIDE_AGREEMENT', message: 'Visibility effectiveFrom is before agreement effectiveFrom' } });
      }
      if (agreementTo && effectiveTo && effectiveTo > agreementTo) {
        throw new BadRequestException({ success: false, error: { code: 'EFFECTIVE_PERIOD_OUTSIDE_AGREEMENT', message: 'Visibility effectiveTo is after agreement effectiveTo' } });
      }

      // P1-2.1: Validate markupRules only if allowed by agreement
      if (Array.isArray(dto.markupRules) && dto.markupRules.length > 0) {
        const settlementTerms = agreement.settlement_terms || {};
        if (settlementTerms.allowMarkup === false) {
          throw new BadRequestException({ success: false, error: { code: 'MARKUP_NOT_ALLOWED', message: 'Markup rules are not allowed by this agreement' } });
        }
      }

      const visibility = manager.create(ProductVisibility, {
        visibilityId: uuidv4(),
        tenantId,
        productId,
        productVersion: targetVersion.version,
        distributorOrganizationId,
        visibilityType,
        distributionAgreementId,
        agreementVersionAtCreation: agreementVersion,
        markupRules: Array.isArray(dto.markupRules) ? dto.markupRules : null,
        allowedTerritories: Array.isArray(dto.allowedTerritories) ? dto.allowedTerritories : [],
        allowedSalesChannels: Array.isArray(dto.allowedSalesChannels) ? dto.allowedSalesChannels : [],
        status: 'active',
        effectiveFrom,
        effectiveTo,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await manager.save(visibility);

      await outbox.publish({
        topic: 'insurance.product.events',
        eventType: 'ProductVisibilityGranted',
        eventVersion: 1,
        correlationId: dto.correlationId || uuidv4(),
        tenantId,
        organizationId: orgId,
        dataClassification: 'INTERNAL',
        subject: { type: 'ProductVisibility', id: visibility.visibilityId },
        payload: {
          tenantId,
          organizationId: orgId,
          productId,
          productVersion: targetVersion.version,
          distributorOrganizationId,
          distributionAgreementId,
          visibilityType,
        },
      });

      return visibility;
    });
  }

  async bulkCreateProductVisibility(ctx: ActorContext, dto: any): Promise<{ created: ProductVisibility[]; errors: Array<{ productId: string; error: string }> }> {
    const items: Array<any> = Array.isArray(dto.items) ? dto.items : [];
    if (items.length === 0) {
      throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'items array is required and must not be empty' } });
    }

    const created: ProductVisibility[] = [];
    const errors: Array<{ productId: string; error: string }> = [];

    for (const item of items) {
      try {
        const vis = await this.createProductVisibility(ctx, item.productId, { ...item, correlationId: dto.correlationId });
        created.push(vis);
      } catch (err: any) {
        const msg = err?.response?.error?.message || err?.message || 'Unknown error';
        errors.push({ productId: item.productId || 'unknown', error: msg });
      }
    }

    return { created, errors };
  }

  async listProductVisibilities(ctx: ActorContext, productId: string, filters: any): Promise<{ rows: ProductVisibility[]; total: number }> {
    const { tenantId } = requireContext(ctx);
    const { limit, offset } = normalizePaging(filters.limit, filters.offset);
    const qb = this.visibilityRepo.createQueryBuilder('pv');
    qb.andWhere('pv.tenant_id = :tenantId', { tenantId });
    qb.andWhere('pv.product_id = :productId', { productId });
    if (filters.status) qb.andWhere('pv.status = :status', { status: filters.status });
    if (filters.distributorOrganizationId) qb.andWhere('pv.distributor_organization_id = :distributorOrganizationId', { distributorOrganizationId: filters.distributorOrganizationId });
    qb.orderBy('pv.created_at', 'DESC').limit(limit).offset(offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async getProductVisibility(ctx: ActorContext, productId: string, visibilityId: string): Promise<ProductVisibility | null> {
    const { tenantId } = requireContext(ctx);
    return this.visibilityRepo.findOne({ where: { tenantId, productId, visibilityId } });
  }

  async updateProductVisibility(ctx: ActorContext, productId: string, visibilityId: string, dto: any): Promise<ProductVisibility> {
    const { tenantId, orgId } = requireContext(ctx);
    if (!hasCapability(ctx, 'CARRIER', 'MGA', 'insurer:products:publish')) {
      throw new ForbiddenException({ success: false, error: { code: 'CAPABILITY_REQUIRED', message: 'Only CARRIER or MGA can update visibility' } });
    }
    return await this.dataSource.transaction(async (manager) => {
      const visibility = await manager.findOne(ProductVisibility, { where: { tenantId, productId, visibilityId } });
      if (!visibility) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Visibility not found' } });

      if (dto.allowedTerritories) visibility.allowedTerritories = Array.isArray(dto.allowedTerritories) ? dto.allowedTerritories : visibility.allowedTerritories;
      if (dto.allowedSalesChannels) visibility.allowedSalesChannels = Array.isArray(dto.allowedSalesChannels) ? dto.allowedSalesChannels : visibility.allowedSalesChannels;
      if (dto.markupRules !== undefined) visibility.markupRules = Array.isArray(dto.markupRules) ? dto.markupRules : null;
      if (dto.effectiveFrom) visibility.effectiveFrom = parseDate(dto.effectiveFrom) || visibility.effectiveFrom;
      if (dto.effectiveTo !== undefined) visibility.effectiveTo = parseDate(dto.effectiveTo);
      visibility.updatedAt = new Date();
      await manager.save(visibility);
      return visibility;
    });
  }

  async revokeProductVisibility(ctx: ActorContext, productId: string, visibilityId: string, dto: any): Promise<ProductVisibility> {
    const { tenantId, orgId } = requireContext(ctx);
    if (!hasCapability(ctx, 'CARRIER', 'MGA', 'insurer:products:publish')) {
      throw new ForbiddenException({ success: false, error: { code: 'CAPABILITY_REQUIRED', message: 'Only CARRIER or MGA can revoke visibility' } });
    }
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const visibility = await manager.findOne(ProductVisibility, { where: { tenantId, productId, visibilityId } });
      if (!visibility) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Visibility not found' } });

      visibility.status = 'revoked';
      visibility.effectiveTo = new Date();
      visibility.updatedAt = new Date();
      await manager.save(visibility);

      await outbox.publish({
        topic: 'insurance.product.events',
        eventType: 'ProductVisibilityRevoked',
        eventVersion: 1,
        correlationId: dto.correlationId || uuidv4(),
        tenantId,
        organizationId: orgId,
        dataClassification: 'INTERNAL',
        subject: { type: 'ProductVisibility', id: visibility.visibilityId },
        payload: { tenantId, organizationId: orgId, productId, visibilityId },
      });

      return visibility;
    });
  }

  async listDistributorVisibleProducts(ctx: ActorContext, distributorOrganizationId: string, filters: any): Promise<{ rows: ProductVisibility[]; total: number }> {
    const { tenantId } = requireContext(ctx);
    const { limit, offset } = normalizePaging(filters.limit, filters.offset);
    const now = new Date();
    const qb = this.visibilityRepo.createQueryBuilder('pv');
    qb.andWhere('pv.tenant_id = :tenantId', { tenantId });
    qb.andWhere('pv.distributor_organization_id = :distributorOrganizationId', { distributorOrganizationId });
    qb.andWhere('pv.status = :status', { status: 'active' });
    qb.andWhere('pv.effective_from <= :now', { now });
    qb.andWhere('(pv.effective_to IS NULL OR pv.effective_to >= :now)', { now });
    if (filters.productVersion) qb.andWhere('pv.product_version = :productVersion', { productVersion: filters.productVersion });
    if (filters.agreementId) qb.andWhere('pv.distribution_agreement_id = :agreementId', { agreementId: filters.agreementId });

    // Filter out visibilities whose distribution agreement is no longer active
    qb.andWhere(
      `EXISTS (
        SELECT 1 FROM distribution_agreements da
        WHERE da.agreement_id = pv.distribution_agreement_id
          AND da.tenant_id = pv.tenant_id
          AND da.status = 'active'
          AND (da.effective_to IS NULL OR da.effective_to >= :now)
      )`,
      { now },
    );

    qb.orderBy('pv.created_at', 'DESC').limit(limit).offset(offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  // --------------------------------------------------------------------------
  // P1-3 Broker Product Offering
  // --------------------------------------------------------------------------

  async createBrokerProductOffering(ctx: ActorContext, dto: any): Promise<BrokerProductOffering> {
    const { tenantId, orgId } = requireContext(ctx);
    if (!hasCapability(ctx, 'BROKER', 'MGA', 'broker:agreements:manage')) {
      throw new ForbiddenException({ success: false, error: { code: 'CAPABILITY_REQUIRED', message: 'Only BROKER or MGA can create offerings' } });
    }

    const brokerOrganizationId = String(dto.brokerOrganizationId || orgId).trim();
    const includedProductIds: string[] = Array.isArray(dto.includedProductIds) ? dto.includedProductIds : [];
    const distributionAgreementId = String(dto.distributionAgreementId || '').trim();
    const agreementVersionSnapshot = typeof dto.agreementVersionSnapshot === 'number' ? dto.agreementVersionSnapshot : 1;
    const name = String(dto.name || '').trim();
    const description = dto.description ? String(dto.description) : null;
    const effectiveFrom = parseDate(dto.effectiveFrom) || new Date();
    const effectiveTo = parseDate(dto.effectiveTo);

    if (!name) throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'name is required' } });
    if (!distributionAgreementId) throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'distributionAgreementId is required' } });
    if (includedProductIds.length === 0) throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'includedProductIds is required' } });

    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);

      // P1-3.2: Validate distribution agreement exists and is active
      const agreementRows = await manager.query(
        `SELECT status, distributor_organization_id, effective_from, effective_to FROM distribution_agreements WHERE agreement_id = $1 AND tenant_id = $2`,
        [distributionAgreementId, tenantId]
      );
      if (!agreementRows || agreementRows.length === 0) {
        throw new BadRequestException({ success: false, error: { code: 'AGREEMENT_NOT_FOUND', message: 'Distribution agreement not found' } });
      }
      const agreement = agreementRows[0];
      if (agreement.status !== 'active') {
        throw new BadRequestException({ success: false, error: { code: 'AGREEMENT_NOT_ACTIVE', message: `Distribution agreement status is '${agreement.status}', must be 'active'` } });
      }
      const now = new Date();
      if (agreement.effective_from && new Date(agreement.effective_from) > now) {
        throw new BadRequestException({ success: false, error: { code: 'AGREEMENT_NOT_YET_EFFECTIVE', message: 'Distribution agreement is not yet effective' } });
      }
      if (agreement.effective_to && new Date(agreement.effective_to) < now) {
        throw new BadRequestException({ success: false, error: { code: 'AGREEMENT_EXPIRED', message: 'Distribution agreement has expired' } });
      }
      if (agreement.distributor_organization_id && agreement.distributor_organization_id !== brokerOrganizationId) {
        throw new BadRequestException({ success: false, error: { code: 'AGREEMENT_BROKER_MISMATCH', message: 'Broker organization does not match the distribution agreement' } });
      }

      // P1-3.1: Validate markupRules against agreement settlement terms
      if (Array.isArray(dto.markupRules) && dto.markupRules.length > 0) {
        const settlementTermsRows = await manager.query(
          `SELECT settlement_terms FROM distribution_agreements WHERE agreement_id = $1 AND tenant_id = $2`,
          [distributionAgreementId, tenantId]
        );
        if (settlementTermsRows && settlementTermsRows.length > 0) {
          const settlementTerms = settlementTermsRows[0].settlement_terms || {};
          if (settlementTerms.allowMarkup === false) {
            throw new BadRequestException({ success: false, error: { code: 'MARKUP_NOT_ALLOWED', message: 'Markup rules are not allowed by this agreement' } });
          }
        }
      }

      // Verify each product has an active visibility for the broker organization
      for (const productId of includedProductIds) {
        const vis = await manager.findOne(ProductVisibility, {
          where: { tenantId, productId, distributorOrganizationId: brokerOrganizationId, status: 'active' },
          order: { createdAt: 'DESC' },
        });
        if (!vis) {
          throw new BadRequestException({ success: false, error: { code: 'NOT_VISIBLE', message: `Product ${productId} is not visible to this broker` } });
        }
      }

      const offering = manager.create(BrokerProductOffering, {
        offeringId: uuidv4(),
        tenantId,
        brokerTenantId: tenantId,
        brokerOrganizationId,
        name,
        description,
        includedProductIds,
        markupRules: Array.isArray(dto.markupRules) ? dto.markupRules : null,
        commissionTiers: Array.isArray(dto.commissionTiers) ? dto.commissionTiers : null,
        allowedSalesChannels: Array.isArray(dto.allowedSalesChannels) ? dto.allowedSalesChannels : [],
        effectiveFrom,
        effectiveTo,
        status: 'inactive',
        agreementVersionSnapshot,
        distributionAgreementId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await manager.save(offering);

      if (Array.isArray(dto.bundleRules)) {
        for (const br of dto.bundleRules) {
          const rule = manager.create(BundleRule, {
            ruleId: uuidv4(),
            tenantId,
            offeringId: offering.offeringId,
            productIds: Array.isArray(br.productIds) ? br.productIds : [],
            discountBps: br.discountBps ?? null,
            reasonCode: String(br.reasonCode || 'bundle_default'),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          await manager.save(rule);
        }
      }

      if (Array.isArray(dto.recommendationRules)) {
        for (const rr of dto.recommendationRules) {
          const rule = manager.create(RecommendationRule, {
            ruleId: uuidv4(),
            tenantId,
            offeringId: offering.offeringId,
            priority: typeof rr.priority === 'number' ? rr.priority : 0,
            criteria: rr.criteria ?? {},
            rankWeight: rr.rankWeight ?? {},
            reasonCode: String(rr.reasonCode || 'recommendation_default'),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          await manager.save(rule);
        }
      }

      await outbox.publish({
        topic: 'insurance.product.events',
        eventType: 'BrokerProductOfferingCreated',
        eventVersion: 1,
        correlationId: dto.correlationId || uuidv4(),
        tenantId,
        organizationId: brokerOrganizationId,
        dataClassification: 'INTERNAL',
        subject: { type: 'BrokerProductOffering', id: offering.offeringId },
        payload: {
          tenantId,
          brokerOrganizationId,
          offeringId: offering.offeringId,
          includedProductIds,
          distributionAgreementId,
          agreementVersionSnapshot,
          hasCommissionTiers: Array.isArray(dto.commissionTiers) && dto.commissionTiers.length > 0,
        },
      });

      return offering;
    });
  }

  async updateCommissionTiers(ctx: ActorContext, offeringId: string, dto: any): Promise<BrokerProductOffering> {
    const { tenantId, orgId } = requireContext(ctx);
    if (!hasCapability(ctx, 'BROKER', 'MGA', 'broker:agreements:manage')) {
      throw new ForbiddenException({ success: false, error: { code: 'CAPABILITY_REQUIRED', message: 'Only BROKER or MGA can manage commission tiers' } });
    }
    const tiers: Array<any> = Array.isArray(dto.commissionTiers) ? dto.commissionTiers : [];
    if (tiers.length === 0) {
      throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'commissionTiers array is required' } });
    }
    for (const tier of tiers) {
      if (!tier.name || typeof tier.rateBps !== 'number' || tier.rateBps < 0 || tier.rateBps > 10000) {
        throw new BadRequestException({ success: false, error: { code: 'INVALID_TIER', message: 'Each tier requires name and rateBps (0-10000)' } });
      }
    }
    return await this.dataSource.transaction(async (manager) => {
      const offering = await manager.findOne(BrokerProductOffering, { where: { tenantId, offeringId } });
      if (!offering) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Offering not found' } });
      if (offering.brokerOrganizationId !== orgId) {
        throw new ForbiddenException({ success: false, error: { code: 'ORGANIZATION_MISMATCH', message: 'Offering belongs to another organization' } });
      }
      offering.commissionTiers = tiers;
      offering.updatedAt = new Date();
      await manager.save(offering);
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.product.events',
        eventType: 'CommissionTiersUpdated',
        eventVersion: 1,
        correlationId: dto.correlationId || uuidv4(),
        tenantId,
        organizationId: orgId,
        dataClassification: 'INTERNAL',
        subject: { type: 'BrokerProductOffering', id: offeringId },
        payload: { tenantId, offeringId, commissionTiers: tiers },
      });
      return offering;
    });
  }

  async listBrokerProductOfferings(ctx: ActorContext, filters: any): Promise<{ rows: BrokerProductOffering[]; total: number }> {
    const { tenantId, orgId } = requireContext(ctx);
    const { limit, offset } = normalizePaging(filters.limit, filters.offset);
    const qb = this.offeringsRepo.createQueryBuilder('o');
    qb.andWhere('o.tenant_id = :tenantId', { tenantId });
    if (filters.brokerOrganizationId) {
      qb.andWhere('o.broker_organization_id = :brokerOrganizationId', { brokerOrganizationId: filters.brokerOrganizationId });
    } else if (orgId) {
      qb.andWhere('o.broker_organization_id = :orgId', { orgId });
    }
    if (filters.status) qb.andWhere('o.status = :status', { status: filters.status });
    if (filters.lineOfBusiness) {
      // product line-of-business not denormalized; rely on caller to filter or use includedProductIds
      qb.andWhere('o.included_product_ids && (SELECT array_agg(product_id) FROM products WHERE tenant_id = :tenantId AND line_of_business = :lob)::uuid[]', { tenantId, lob: filters.lineOfBusiness });
    }
    qb.orderBy('o.created_at', 'DESC').limit(limit).offset(offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async getBrokerProductOffering(ctx: ActorContext, offeringId: string): Promise<BrokerProductOffering | null> {
    const { tenantId } = requireContext(ctx);
    return this.offeringsRepo.findOne({ where: { tenantId, offeringId } });
  }

  async updateBrokerProductOffering(ctx: ActorContext, offeringId: string, dto: any): Promise<BrokerProductOffering> {
    const { tenantId, orgId } = requireContext(ctx);
    if (!hasCapability(ctx, 'BROKER', 'MGA', 'broker:agreements:manage')) {
      throw new ForbiddenException({ success: false, error: { code: 'CAPABILITY_REQUIRED', message: 'Only BROKER or MGA can update offerings' } });
    }
    return await this.dataSource.transaction(async (manager) => {
      const offering = await manager.findOne(BrokerProductOffering, { where: { tenantId, offeringId } });
      if (!offering) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Offering not found' } });
      if (offering.brokerOrganizationId !== orgId) {
        throw new ForbiddenException({ success: false, error: { code: 'ORGANIZATION_MISMATCH', message: 'Offering belongs to another broker' } });
      }

      if (dto.name) offering.name = String(dto.name).trim();
      if (dto.description !== undefined) offering.description = dto.description ? String(dto.description) : null;
      if (dto.allowedSalesChannels) offering.allowedSalesChannels = Array.isArray(dto.allowedSalesChannels) ? dto.allowedSalesChannels : offering.allowedSalesChannels;
      if (dto.markupRules !== undefined) offering.markupRules = Array.isArray(dto.markupRules) ? dto.markupRules : null;
      if (dto.effectiveFrom) offering.effectiveFrom = parseDate(dto.effectiveFrom) || offering.effectiveFrom;
      if (dto.effectiveTo !== undefined) offering.effectiveTo = parseDate(dto.effectiveTo);
      offering.updatedAt = new Date();
      await manager.save(offering);
      return offering;
    });
  }

  async setOfferingStatus(ctx: ActorContext, offeringId: string, status: BrokerProductOfferingStatus, dto: any): Promise<BrokerProductOffering> {
    const { tenantId, orgId } = requireContext(ctx);
    if (!hasCapability(ctx, 'BROKER', 'MGA', 'broker:agreements:manage')) {
      throw new ForbiddenException({ success: false, error: { code: 'CAPABILITY_REQUIRED', message: 'Only BROKER or MGA can manage offerings' } });
    }
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const offering = await manager.findOne(BrokerProductOffering, { where: { tenantId, offeringId } });
      if (!offering) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Offering not found' } });
      if (offering.brokerOrganizationId !== orgId) {
        throw new ForbiddenException({ success: false, error: { code: 'ORGANIZATION_MISMATCH', message: 'Offering belongs to another broker' } });
      }

      offering.status = status;
      offering.updatedAt = new Date();
      await manager.save(offering);

      await outbox.publish({
        topic: 'insurance.product.events',
        eventType: status === 'active' ? 'BrokerProductOfferingActivated' : 'BrokerProductOfferingInactivated',
        eventVersion: 1,
        correlationId: dto.correlationId || uuidv4(),
        tenantId,
        organizationId: offering.brokerOrganizationId,
        dataClassification: 'INTERNAL',
        subject: { type: 'BrokerProductOffering', id: offering.offeringId },
        payload: { tenantId, brokerOrganizationId: offering.brokerOrganizationId, offeringId, status },
      });

      return offering;
    });
  }

  async listCustomerOfferings(ctx: ActorContext, filters: any): Promise<{ rows: any[]; total: number }> {
    const { tenantId, orgId } = requireContext(ctx);
    const brokerOrganizationId = filters.brokerOrganizationId ? String(filters.brokerOrganizationId).trim() : orgId;
    const { limit, offset } = normalizePaging(filters.limit, filters.offset);
    const now = new Date();

    const qb = this.offeringsRepo.createQueryBuilder('o')
      .leftJoinAndMapMany(
        'o.rules',
        RecommendationRule,
        'rr',
        'rr.offering_id = o.offering_id',
      );
    qb.andWhere('o.tenant_id = :tenantId', { tenantId });
    qb.andWhere('o.broker_organization_id = :brokerOrganizationId', { brokerOrganizationId });
    qb.andWhere('o.status = :status', { status: 'active' });
    qb.andWhere('o.effective_from <= :now', { now });
    qb.andWhere('(o.effective_to IS NULL OR o.effective_to >= :now)', { now });
    qb.orderBy('o.created_at', 'DESC').limit(limit).offset(offset);
    const [rows, total] = await qb.getManyAndCount();

    const enriched = await Promise.all(rows.map(async (offering: BrokerProductOffering) => {
      // Compute quote for each included product so customer sees final pricing
      const productQuotes: Array<{ productId: string; quote: any | null; error?: string }> = [];
      for (const pid of offering.includedProductIds) {
        try {
          const quote = await this.productService.computeQuote({
            tenantId,
            productId: pid,
            currency: (filters.currency as any) || 'IRR',
            exposure: filters.exposure || {},
            region: filters.region,
            effectiveDate: new Date(),
          });
          productQuotes.push({ productId: pid, quote });
        } catch (err: any) {
          productQuotes.push({ productId: pid, quote: null, error: err?.message || 'Quote computation failed' });
        }
      }

      return {
        ...offering,
        conflictOfInterest: false,
        commissionDisclosure: {
          brokerServiceFee: this.aggregateBrokerServiceFee(offering),
          reasonCode: 'broker_fee_disclosure',
        },
        recommendationReasons: (offering as any).rules?.map((r: RecommendationRule) => r.reasonCode) ?? [],
        productQuotes,
      };
    }));

    return { rows: enriched, total };
  }

  private aggregateBrokerServiceFee(offering: BrokerProductOffering): { amountMinor: string; currency: string } | null {
    if (!Array.isArray(offering.markupRules) || offering.markupRules.length === 0) return null;
    // Simplified: return the first markup rule amount/currency for disclosure
    const first = offering.markupRules[0];
    if (!first || !first.amountMinor) return null;
    return { amountMinor: String(first.amountMinor), currency: String(first.currency || 'IRR') };
  }
}
