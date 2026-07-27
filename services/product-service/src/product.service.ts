import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Product, type ProductStatus } from './entities/Product';
import { ProductVersion } from './entities/ProductVersion';
import { Coverage, type CoverageStatus } from './entities/Coverage';
import { Deductible, type DeductibleStatus } from './entities/Deductible';
import { PricingRule, type PricingRuleStatus, type PricingRuleType } from './entities/PricingRule';
import { OutboxPublisher } from '@insurance/shared';
import { QuoteEngine } from './quote-engine';
import { Money, Currency, SUPPORTED_CURRENCIES, toFiniteNumber } from './money';

export function clampInt(v: any, def: number, min: number, max: number): number {
  const n = parseInt(String(v ?? def), 10);
  if (Number.isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

export function defaultPricingRule(): any {
  return { version: 1, basePremium: 0, adjustments: [] };
}

export function isPlainObject(v: any): v is Record<string, any> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const ALLOWED_RULE_TYPES: PricingRuleType[] = ['base', 'conditional', 'tiered', 'regional', 'discount', 'surcharge'];
const ALLOWED_CONDITION_OPS = ['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'in', 'not_in'];

export function validateCurrency(currency: any): Currency {
  const c = String(currency || 'IRR').toUpperCase();
  if (!SUPPORTED_CURRENCIES.includes(c as Currency)) {
    throw new BadRequestException({ success: false, error: { code: 'UNSUPPORTED_CURRENCY', message: `Currency ${currency} not supported` } });
  }
  return c as Currency;
}

export function validatePricingRuleSchema(rule: any): void {
  if (!isPlainObject(rule)) {
    throw new BadRequestException({ success: false, error: { code: 'INVALID_RULE', message: 'rule must be an object' } });
  }
  if (rule.version !== undefined && rule.version !== 1) {
    throw new BadRequestException({ success: false, error: { code: 'INVALID_RULE_VERSION', message: 'rule version must be 1' } });
  }
  if (rule.basePremium !== undefined) {
    const n = toFiniteNumber(rule.basePremium, NaN);
    if (!Number.isFinite(n) || n < 0) {
      throw new BadRequestException({ success: false, error: { code: 'INVALID_BASE_PREMIUM', message: 'basePremium must be a non-negative finite number' } });
    }
  }
  if (rule.adjustments !== undefined) {
    if (!Array.isArray(rule.adjustments)) {
      throw new BadRequestException({ success: false, error: { code: 'INVALID_ADJUSTMENTS', message: 'adjustments must be an array' } });
    }
    for (const adj of rule.adjustments) {
      if (!isPlainObject(adj)) {
        throw new BadRequestException({ success: false, error: { code: 'INVALID_ADJUSTMENT', message: 'each adjustment must be an object' } });
      }
      if (!String(adj.code || '').trim()) {
        throw new BadRequestException({ success: false, error: { code: 'INVALID_ADJUSTMENT_CODE', message: 'adjustment code is required' } });
      }
      if (adj.type !== 'add' && adj.type !== 'multiplier') {
        throw new BadRequestException({ success: false, error: { code: 'INVALID_ADJUSTMENT_TYPE', message: 'adjustment type must be add or multiplier' } });
      }
      const v = toFiniteNumber(adj.value, NaN);
      if (!Number.isFinite(v)) {
        throw new BadRequestException({ success: false, error: { code: 'INVALID_ADJUSTMENT_VALUE', message: 'adjustment value must be finite' } });
      }
      if (adj.type === 'add' && v < 0) {
        throw new BadRequestException({ success: false, error: { code: 'INVALID_ADD_VALUE', message: 'add adjustment value cannot be negative' } });
      }
      if (adj.type === 'multiplier' && v < 0) {
        throw new BadRequestException({ success: false, error: { code: 'INVALID_MULTIPLIER_VALUE', message: 'multiplier adjustment value cannot be negative' } });
      }
      if (isPlainObject(adj.when)) {
        const op = adj.when.op;
        if (!['eq', 'in', 'gte', 'lte'].includes(op)) {
          throw new BadRequestException({ success: false, error: { code: 'INVALID_WHEN_OP', message: 'when op must be eq, in, gte, or lte' } });
        }
        if (!String(adj.when.field || '').trim()) {
          throw new BadRequestException({ success: false, error: { code: 'INVALID_WHEN_FIELD', message: 'when field is required' } });
        }
      }
    }
  }
}

export function validateTypedRuleSchema(rule: any, ruleType: PricingRuleType): void {
  if (!isPlainObject(rule)) {
    throw new BadRequestException({ success: false, error: { code: 'INVALID_RULE', message: 'rule must be an object' } });
  }
  if (ruleType === 'base') {
    if (rule.basePremium === undefined) {
      throw new BadRequestException({ success: false, error: { code: 'BASE_PREMIUM_REQUIRED', message: 'base rule requires basePremium' } });
    }
    const n = toFiniteNumber(rule.basePremium, NaN);
    if (!Number.isFinite(n) || n < 0) {
      throw new BadRequestException({ success: false, error: { code: 'INVALID_BASE_PREMIUM', message: 'basePremium must be a non-negative finite number' } });
    }
    return;
  }
  if (['conditional', 'regional', 'surcharge'].includes(ruleType)) {
    if (rule.value !== undefined) {
      const n = toFiniteNumber(rule.value, NaN);
      if (!Number.isFinite(n)) {
        throw new BadRequestException({ success: false, error: { code: 'INVALID_RULE_VALUE', message: 'rule value must be finite' } });
      }
    }
  }
  if (ruleType === 'tiered') {
    if (!Array.isArray(rule.tiers)) {
      throw new BadRequestException({ success: false, error: { code: 'INVALID_TIERS', message: 'tiered rule requires tiers array' } });
    }
    if (!String(rule.field || '').trim()) {
      throw new BadRequestException({ success: false, error: { code: 'INVALID_TIER_FIELD', message: 'tiered rule requires field' } });
    }
    for (const tier of rule.tiers) {
      if (!isPlainObject(tier)) continue;
      const n = toFiniteNumber(tier.value, NaN);
      if (!Number.isFinite(n)) {
        throw new BadRequestException({ success: false, error: { code: 'INVALID_TIER_VALUE', message: 'tier value must be finite' } });
      }
      if (tier.type && tier.type !== 'add' && tier.type !== 'multiplier') {
        throw new BadRequestException({ success: false, error: { code: 'INVALID_TIER_TYPE', message: 'tier type must be add or multiplier' } });
      }
    }
  }
}

export function validateConditions(conditions: any): void {
  if (!isPlainObject(conditions)) return;
  for (const [key, condition] of Object.entries(conditions)) {
    if (!isPlainObject(condition)) {
      throw new BadRequestException({ success: false, error: { code: 'INVALID_CONDITION', message: `condition ${key} must be an object` } });
    }
    const op = (condition as any).operator || (condition as any).op;
    if (!ALLOWED_CONDITION_OPS.includes(op)) {
      throw new BadRequestException({ success: false, error: { code: 'INVALID_CONDITION_OP', message: `condition operator ${op} not allowed` } });
    }
  }
}

export function requireTenant(tenantId: string | undefined): string {
  const id = (tenantId || '').trim();
  if (!id) {
    throw new ForbiddenException({ success: false, error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required' } });
  }
  return id;
}

export function assertResourceTenant(resourceTenantId: string, callerTenantId: string): void {
  if (resourceTenantId !== callerTenantId) {
    throw new ForbiddenException({ success: false, error: { code: 'CROSS_TENANT_ACCESS_DENIED', message: 'Resource belongs to a different tenant' } });
  }
}

@Injectable()
export class ProductService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
    @InjectRepository(Coverage) private readonly coveragesRepo: Repository<Coverage>,
    @InjectRepository(Deductible) private readonly deductiblesRepo: Repository<Deductible>,
    @InjectRepository(PricingRule) private readonly pricingRulesRepo: Repository<PricingRule>,
    @InjectRepository(ProductVersion) private readonly productVersionsRepo: Repository<ProductVersion>
  ) {}

  normalizePaging(limit: any, offset: any): { limit: number; offset: number } {
    return { limit: clampInt(limit, 50, 1, 200), offset: clampInt(offset, 0, 0, 1000000) };
  }

  async createProduct(params: {
    tenantId: string;
    code: string;
    nameFa: string;
    nameEn?: string | null;
    lineOfBusiness: string;
    metadata?: any | null;
    createdBy?: string | null;
    correlationId?: string;
  }): Promise<Product> {
    const tenantId = requireTenant(params.tenantId);
    const code = (params.code || '').trim();
    const nameFa = (params.nameFa || '').trim();
    const lineOfBusiness = (params.lineOfBusiness || '').trim();

    if (!code || !nameFa || !lineOfBusiness) {
      throw new BadRequestException({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'code, nameFa, lineOfBusiness are required' },
      });
    }

    const existing = await this.productsRepo.findOne({ where: { tenantId, code } });
    if (existing) {
      throw new BadRequestException({
        success: false,
        error: { code: 'DUPLICATE', message: 'code already exists for tenant' },
      });
    }

    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const productId = uuidv4();
      const p = manager.create(Product, {
        productId,
        tenantId,
        code,
        nameFa,
        nameEn: params.nameEn ?? null,
        lineOfBusiness,
        status: 'draft',
        version: 1,
        metadata: params.metadata ?? null,
        createdBy: params.createdBy ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await manager.save(p);

      const version = manager.create(ProductVersion, {
        productVersionId: uuidv4(),
        tenantId,
        productId: p.productId,
        code: p.code,
        nameFa: p.nameFa,
        nameEn: p.nameEn,
        lineOfBusiness: p.lineOfBusiness,
        status: 'draft',
        version: 1,
        changeReason: 'Initial product creation',
        changedBy: params.createdBy ?? null,
        effectiveDate: null,
        publishedAt: null,
        snapshot: {
          product: { nameFa: p.nameFa, nameEn: p.nameEn, lineOfBusiness: p.lineOfBusiness, status: p.status, metadata: p.metadata },
          effectiveDate: null,
          publishedAt: null,
        },
        createdAt: new Date(),
      });
      await manager.save(version);

      await outbox.publish({
        topic: 'insurance.product.created',
        eventType: 'ProductCreated',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { productId: p.productId, tenantId },
        payload: {
          tenantId,
          productId: p.productId,
          code: p.code,
          nameFa: p.nameFa,
          lineOfBusiness: p.lineOfBusiness,
          status: p.status,
          version: p.version,
          createdBy: p.createdBy,
        },
      });

      return p;
    });
  }

  async getProduct(tenantId: string, productId: string): Promise<Product | null> {
    requireTenant(tenantId);
    return await this.productsRepo.findOne({ where: { tenantId, productId } });
  }

  async listProducts(params: {
    tenantId: string;
    status?: ProductStatus;
    lineOfBusiness?: string;
    q?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: Product[]; total: number }> {
    const tenantId = requireTenant(params.tenantId);
    const qb = this.productsRepo.createQueryBuilder('p');
    qb.andWhere('p.tenant_id = :tenantId', { tenantId });

    if (params.status) qb.andWhere('p.status = :status', { status: params.status });
    if (params.lineOfBusiness) qb.andWhere('p.line_of_business = :lob', { lob: params.lineOfBusiness });
    if (params.q) qb.andWhere('(p.code ILIKE :q OR p.name_fa ILIKE :q OR p.name_en ILIKE :q)', { q: `%${params.q}%` });

    qb.orderBy('p.created_at', 'DESC').limit(params.limit).offset(params.offset);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async updateProduct(params: {
    tenantId: string;
    productId: string;
    nameFa?: string;
    nameEn?: string | null;
    lineOfBusiness?: string;
    metadata?: any | null;
    status?: ProductStatus;
    changeReason?: string;
    changedBy?: string | null;
    correlationId?: string;
  }): Promise<Product> {
    const tenantId = requireTenant(params.tenantId);
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const p = await manager.findOne(Product, { where: { tenantId, productId: params.productId } });
      if (!p) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });

      if (p.status === 'archived') {
        throw new BadRequestException({ success: false, error: { code: 'ARCHIVED_PRODUCT', message: 'Cannot update archived product' } });
      }

      if (params.nameFa !== undefined) {
        const v = (params.nameFa || '').trim();
        if (!v) {
          throw new BadRequestException({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'nameFa cannot be empty' },
          });
        }
        p.nameFa = v;
      }
      if (params.nameEn !== undefined) p.nameEn = params.nameEn ?? null;
      if (params.lineOfBusiness !== undefined) {
        const lob = (params.lineOfBusiness || '').trim();
        if (!lob) {
          throw new BadRequestException({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'lineOfBusiness cannot be empty' },
          });
        }
        p.lineOfBusiness = lob;
      }
      if (params.metadata !== undefined) p.metadata = params.metadata ?? null;
      if (params.status !== undefined) {
        const allowed: ProductStatus[] = ['draft', 'active', 'archived'];
        if (!allowed.includes(params.status)) {
          throw new BadRequestException({ success: false, error: { code: 'INVALID_STATUS', message: 'Invalid product status' } });
        }
        // State machine: archived is terminal; draft may become active; active may become archived
        const transitions: Record<ProductStatus, ProductStatus[]> = {
          draft: ['draft', 'active'],
          active: ['active', 'archived'],
          archived: [],
        };
        if (!transitions[p.status].includes(params.status)) {
          throw new BadRequestException({
            success: false,
            error: { code: 'INVALID_STATUS_TRANSITION', message: `Cannot transition product from ${p.status} to ${params.status}` },
          });
        }
        p.status = params.status;
      }

      p.version = (p.version || 1) + 1;
      p.updatedAt = new Date();
      await manager.save(p);

      // Each edit creates a draft version snapshot; only publishVersion can promote to active
      const version = manager.create(ProductVersion, {
        productVersionId: uuidv4(),
        tenantId,
        productId: p.productId,
        code: p.code,
        nameFa: p.nameFa,
        nameEn: p.nameEn,
        lineOfBusiness: p.lineOfBusiness,
        status: 'draft',
        version: p.version,
        changeReason: params.changeReason || 'Product updated',
        changedBy: params.changedBy ?? null,
        effectiveDate: null,
        publishedAt: null,
        snapshot: {
          product: { nameFa: p.nameFa, nameEn: p.nameEn, lineOfBusiness: p.lineOfBusiness, status: p.status, metadata: p.metadata },
          effectiveDate: null,
          publishedAt: null,
        },
        createdAt: new Date(),
      });
      await manager.save(version);

      await outbox.publish({
        topic: 'insurance.product.updated',
        eventType: 'ProductUpdated',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { productId: p.productId, tenantId },
        payload: {
          tenantId,
          productId: p.productId,
          code: p.code,
          nameFa: p.nameFa,
          nameEn: p.nameEn,
          lineOfBusiness: p.lineOfBusiness,
          status: p.status,
          metadata: p.metadata,
          version: p.version,
          changeReason: params.changeReason,
          changedBy: params.changedBy,
        },
      });

      return p;
    });
  }

  async publishVersion(params: {
    tenantId: string;
    productId: string;
    effectiveDate?: Date | string;
    changeReason?: string;
    changedBy?: string | null;
    correlationId?: string;
  }): Promise<ProductVersion> {
    const tenantId = requireTenant(params.tenantId);
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const p = await manager.findOne(Product, { where: { tenantId, productId: params.productId } });
      if (!p) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
      if (p.status === 'archived') {
        throw new BadRequestException({ success: false, error: { code: 'ARCHIVED_PRODUCT', message: 'Cannot publish an archived product' } });
      }

      const effectiveDate = params.effectiveDate ? new Date(params.effectiveDate) : new Date();
      if (!Number.isFinite(effectiveDate.getTime())) {
        throw new BadRequestException({ success: false, error: { code: 'INVALID_DATE', message: 'effectiveDate is invalid' } });
      }

      // Activate the product on first publish; keep status active thereafter
      if (p.status === 'draft') {
        p.status = 'active';
      }

      // Supersede any previously active published version for this product
      await manager.update(
        ProductVersion,
        { tenantId, productId: p.productId, status: 'active' },
        { status: 'archived' } as any
      );

      // Snapshot active children at the moment of publish
      const [coverages, deductibles, pricingRules] = await Promise.all([
        manager.find(Coverage, { where: { tenantId, productId: p.productId, status: 'active' } }),
        manager.find(Deductible, { where: { tenantId, productId: p.productId, status: 'active' } }),
        manager.find(PricingRule, { where: { tenantId, productId: p.productId, status: 'active' } }),
      ]);

      const publishedAt = new Date();

      // Reuse an existing draft row for this working version if one exists; otherwise create a fresh row
      let version = await manager.findOne(ProductVersion, {
        where: { tenantId, productId: p.productId, version: p.version, status: 'draft' },
      });

      const snapshot = {
        product: { nameFa: p.nameFa, nameEn: p.nameEn, lineOfBusiness: p.lineOfBusiness, status: p.status, metadata: p.metadata },
        coverages: coverages.map((c) => ({ code: c.code, nameFa: c.nameFa, status: c.status, terms: c.terms })),
        deductibles: deductibles.map((d) => ({ code: d.code, nameFa: d.nameFa, kind: d.kind, value: d.value, status: d.status })),
        pricingRules: pricingRules.map((r) => ({
          code: r.code,
          nameFa: r.nameFa,
          ruleType: r.ruleType,
          priority: r.priority,
          rule: r.rule,
          conditions: r.conditions,
          validFrom: r.validFrom,
          validTo: r.validTo,
          regions: r.regions,
          status: r.status,
        })),
        effectiveDate: effectiveDate.toISOString(),
        publishedAt: publishedAt.toISOString(),
      };

      if (version) {
        version.status = 'active';
        version.effectiveDate = effectiveDate;
        version.publishedAt = publishedAt;
        version.snapshot = snapshot;
        version.changeReason = params.changeReason || 'Version published';
      } else {
        version = manager.create(ProductVersion, {
          productVersionId: uuidv4(),
          tenantId,
          productId: p.productId,
          code: p.code,
          nameFa: p.nameFa,
          nameEn: p.nameEn,
          lineOfBusiness: p.lineOfBusiness,
          status: 'active',
          version: p.version,
          changeReason: params.changeReason || 'Version published',
          changedBy: params.changedBy ?? null,
          effectiveDate,
          publishedAt,
          snapshot,
          createdAt: publishedAt,
        });
      }
      await manager.save(version);

      // Bump the working version number for the next cycle of edits
      p.version = (p.version || 1) + 1;
      p.updatedAt = publishedAt;
      await manager.save(p);

      await outbox.publish({
        topic: 'insurance.product.version_published',
        eventType: 'ProductVersionPublished',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { productId: p.productId, tenantId },
        payload: {
          tenantId,
          productId: p.productId,
          code: p.code,
          version: version.version,
          effectiveDate: effectiveDate.toISOString(),
          publishedAt: publishedAt.toISOString(),
          publishedBy: params.changedBy,
        },
      });

      return version;
    });
  }

  async archiveProduct(params: { tenantId: string; productId: string; correlationId?: string }): Promise<Product> {
    const tenantId = requireTenant(params.tenantId);
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const p = await manager.findOne(Product, { where: { tenantId, productId: params.productId } });
      if (!p) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
      if (p.status === 'archived') {
        throw new BadRequestException({ success: false, error: { code: 'ALREADY_ARCHIVED', message: 'Product is already archived' } });
      }

      p.status = 'archived';
      p.updatedAt = new Date();
      await manager.save(p);

      // Supersede any active published version and archive active children
      await manager.update(ProductVersion, { tenantId, productId: p.productId, status: 'active' }, { status: 'archived' } as any);
      await manager.update(Coverage, { tenantId, productId: p.productId, status: 'active' }, { status: 'archived', updatedAt: new Date() } as any);
      await manager.update(Deductible, { tenantId, productId: p.productId, status: 'active' }, { status: 'archived', updatedAt: new Date() } as any);
      await manager.update(PricingRule, { tenantId, productId: p.productId, status: 'active' }, { status: 'archived', updatedAt: new Date() } as any);

      await outbox.publish({
        topic: 'insurance.product.archived',
        eventType: 'ProductArchived',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { productId: p.productId, tenantId },
        payload: {
          tenantId,
          productId: p.productId,
          code: p.code,
          nameFa: p.nameFa,
          status: p.status,
        },
      });

      return p;
    });
  }

  async createCoverage(params: {
    tenantId: string;
    productId: string;
    code: string;
    nameFa: string;
    terms?: any | null;
    createdBy?: string | null;
    correlationId?: string;
  }): Promise<Coverage> {
    const tenantId = requireTenant(params.tenantId);
    const productId = (params.productId || '').trim();
    const code = (params.code || '').trim();
    const nameFa = (params.nameFa || '').trim();

    if (!productId || !code || !nameFa) {
      throw new BadRequestException({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'productId, code, nameFa are required' },
      });
    }

    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const p = await manager.findOne(Product, { where: { tenantId, productId } });
      if (!p) {
        throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'productId is invalid' } });
      }
      if (p.status === 'archived') {
        throw new BadRequestException({ success: false, error: { code: 'ARCHIVED_PRODUCT', message: 'Cannot add coverage to archived product' } });
      }

      const existing = await manager.findOne(Coverage, { where: { tenantId, productId, code } });
      if (existing) {
        throw new BadRequestException({
          success: false,
          error: { code: 'DUPLICATE', message: 'code already exists for product' },
        });
      }

      const c = manager.create(Coverage, {
        coverageId: uuidv4(),
        tenantId,
        productId,
        code,
        nameFa,
        status: 'draft',
        terms: params.terms ?? null,
        createdBy: params.createdBy ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await manager.save(c);

      await outbox.publish({
        topic: 'insurance.coverage.created',
        eventType: 'CoverageCreated',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { productId, coverageId: c.coverageId, tenantId },
        payload: { tenantId, productId, coverageId: c.coverageId, code, nameFa, status: c.status },
      });

      return c;
    });
  }

  async getCoverage(tenantId: string, coverageId: string): Promise<Coverage | null> {
    requireTenant(tenantId);
    return await this.coveragesRepo.findOne({ where: { tenantId, coverageId } });
  }

  async listCoverages(params: {
    tenantId: string;
    productId?: string;
    status?: CoverageStatus;
    q?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: Coverage[]; total: number }> {
    const tenantId = requireTenant(params.tenantId);
    const qb = this.coveragesRepo.createQueryBuilder('c');
    qb.andWhere('c.tenant_id = :tenantId', { tenantId });

    if (params.productId) qb.andWhere('c.product_id = :pid', { pid: params.productId });
    if (params.status) qb.andWhere('c.status = :status', { status: params.status });
    if (params.q) qb.andWhere('(c.code ILIKE :q OR c.name_fa ILIKE :q)', { q: `%${params.q}%` });

    qb.orderBy('c.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async updateCoverage(params: {
    tenantId: string;
    coverageId: string;
    nameFa?: string;
    terms?: any | null;
    status?: CoverageStatus;
    changeReason?: string;
    changedBy?: string | null;
    correlationId?: string;
  }): Promise<Coverage> {
    const tenantId = requireTenant(params.tenantId);
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const c = await manager.findOne(Coverage, { where: { tenantId, coverageId: params.coverageId } });
      if (!c) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Coverage not found' } });

      if (c.status === 'archived') {
        throw new BadRequestException({ success: false, error: { code: 'ARCHIVED_COVERAGE', message: 'Cannot update archived coverage' } });
      }

      if (params.nameFa !== undefined) {
        const v = (params.nameFa || '').trim();
        if (!v) {
          throw new BadRequestException({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'nameFa cannot be empty' },
          });
        }
        c.nameFa = v;
      }
      if (params.terms !== undefined) c.terms = params.terms ?? null;
      if (params.status !== undefined) {
        const allowed: CoverageStatus[] = ['draft', 'active', 'archived'];
        if (!allowed.includes(params.status)) {
          throw new BadRequestException({ success: false, error: { code: 'INVALID_STATUS', message: 'Invalid coverage status' } });
        }
        c.status = params.status;
      }

      c.updatedAt = new Date();
      await manager.save(c);

      await outbox.publish({
        topic: 'insurance.coverage.updated',
        eventType: 'CoverageUpdated',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { coverageId: c.coverageId, tenantId },
        payload: { tenantId, coverageId: c.coverageId, code: c.code, nameFa: c.nameFa, status: c.status, changeReason: params.changeReason },
      });

      return c;
    });
  }

  async archiveCoverage(params: { tenantId: string; coverageId: string; correlationId?: string }): Promise<Coverage> {
    const tenantId = requireTenant(params.tenantId);
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const c = await manager.findOne(Coverage, { where: { tenantId, coverageId: params.coverageId } });
      if (!c) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Coverage not found' } });
      if (c.status === 'archived') {
        throw new BadRequestException({ success: false, error: { code: 'ALREADY_ARCHIVED', message: 'Coverage is already archived' } });
      }
      c.status = 'archived';
      c.updatedAt = new Date();
      await manager.save(c);

      await outbox.publish({
        topic: 'insurance.coverage.archived',
        eventType: 'CoverageArchived',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { coverageId: c.coverageId, tenantId },
        payload: { tenantId, coverageId: c.coverageId, code: c.code, status: c.status },
      });

      return c;
    });
  }

  async createDeductible(params: {
    tenantId: string;
    productId: string;
    code: string;
    nameFa: string;
    kind: Deductible['kind'];
    value: string | number;
    createdBy?: string | null;
    correlationId?: string;
  }): Promise<Deductible> {
    const tenantId = requireTenant(params.tenantId);
    const productId = (params.productId || '').trim();
    const code = (params.code || '').trim();
    const nameFa = (params.nameFa || '').trim();

    if (!productId || !code || !nameFa || !params.kind || params.value === undefined || params.value === null) {
      throw new BadRequestException({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'productId, code, nameFa, kind, value are required' },
      });
    }

    if (params.kind !== 'fixed_amount' && params.kind !== 'percent') {
      throw new BadRequestException({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'kind must be fixed_amount or percent' },
      });
    }

    if (params.kind === 'percent') {
      const pct = toFiniteNumber(params.value, NaN);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        throw new BadRequestException({ success: false, error: { code: 'INVALID_PERCENT_DEDUCTIBLE', message: 'Percent deductible must be 0-100' } });
      }
    } else {
      const amt = toFiniteNumber(params.value, NaN);
      if (!Number.isFinite(amt) || amt < 0) {
        throw new BadRequestException({ success: false, error: { code: 'INVALID_DEDUCTIBLE_AMOUNT', message: 'Fixed deductible must be a non-negative finite amount' } });
      }
    }

    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const p = await manager.findOne(Product, { where: { tenantId, productId } });
      if (!p) {
        throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'productId is invalid' } });
      }
      if (p.status === 'archived') {
        throw new BadRequestException({ success: false, error: { code: 'ARCHIVED_PRODUCT', message: 'Cannot add deductible to archived product' } });
      }

      const existing = await manager.findOne(Deductible, { where: { tenantId, productId, code } });
      if (existing) {
        throw new BadRequestException({
          success: false,
          error: { code: 'DUPLICATE', message: 'code already exists for product' },
        });
      }

      const d = manager.create(Deductible, {
        deductibleId: uuidv4(),
        tenantId,
        productId,
        code,
        nameFa,
        kind: params.kind,
        value: String(params.value),
        status: 'draft',
        createdBy: params.createdBy ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await manager.save(d);

      await outbox.publish({
        topic: 'insurance.deductible.created',
        eventType: 'DeductibleCreated',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { productId, deductibleId: d.deductibleId, tenantId },
        payload: { tenantId, productId, deductibleId: d.deductibleId, code, nameFa, kind: d.kind, value: d.value, status: d.status },
      });

      return d;
    });
  }

  async getDeductible(tenantId: string, deductibleId: string): Promise<Deductible | null> {
    requireTenant(tenantId);
    return await this.deductiblesRepo.findOne({ where: { tenantId, deductibleId } });
  }

  async listDeductibles(params: {
    tenantId: string;
    productId?: string;
    status?: DeductibleStatus;
    kind?: Deductible['kind'];
    q?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: Deductible[]; total: number }> {
    const tenantId = requireTenant(params.tenantId);
    const qb = this.deductiblesRepo.createQueryBuilder('d');
    qb.andWhere('d.tenant_id = :tenantId', { tenantId });

    if (params.productId) qb.andWhere('d.product_id = :pid', { pid: params.productId });
    if (params.status) qb.andWhere('d.status = :status', { status: params.status });
    if (params.kind) qb.andWhere('d.kind = :kind', { kind: params.kind });
    if (params.q) qb.andWhere('(d.code ILIKE :q OR d.name_fa ILIKE :q)', { q: `%${params.q}%` });

    qb.orderBy('d.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async updateDeductible(params: {
    tenantId: string;
    deductibleId: string;
    nameFa?: string;
    kind?: Deductible['kind'];
    value?: string | number;
    status?: DeductibleStatus;
    changeReason?: string;
    changedBy?: string | null;
    correlationId?: string;
  }): Promise<Deductible> {
    const tenantId = requireTenant(params.tenantId);
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const d = await manager.findOne(Deductible, { where: { tenantId, deductibleId: params.deductibleId } });
      if (!d) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Deductible not found' } });

      if (d.status === 'archived') {
        throw new BadRequestException({ success: false, error: { code: 'ARCHIVED_DEDUCTIBLE', message: 'Cannot update archived deductible' } });
      }

      if (params.nameFa !== undefined) {
        const v = (params.nameFa || '').trim();
        if (!v) {
          throw new BadRequestException({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'nameFa cannot be empty' },
          });
        }
        d.nameFa = v;
      }
      if (params.kind !== undefined) {
        if (params.kind !== 'fixed_amount' && params.kind !== 'percent') {
          throw new BadRequestException({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'kind must be fixed_amount or percent' },
          });
        }
        d.kind = params.kind;
      }
      if (params.value !== undefined) {
        if (params.value === null as any) {
          throw new BadRequestException({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'value cannot be null' },
          });
        }
        if (d.kind === 'percent') {
          const pct = toFiniteNumber(params.value, NaN);
          if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
            throw new BadRequestException({ success: false, error: { code: 'INVALID_PERCENT_DEDUCTIBLE', message: 'Percent deductible must be 0-100' } });
          }
        } else {
          const amt = toFiniteNumber(params.value, NaN);
          if (!Number.isFinite(amt) || amt < 0) {
            throw new BadRequestException({ success: false, error: { code: 'INVALID_DEDUCTIBLE_AMOUNT', message: 'Fixed deductible must be a non-negative finite amount' } });
          }
        }
        d.value = String(params.value);
      }
      if (params.status !== undefined) {
        const allowed: DeductibleStatus[] = ['draft', 'active', 'archived'];
        if (!allowed.includes(params.status)) {
          throw new BadRequestException({ success: false, error: { code: 'INVALID_STATUS', message: 'Invalid deductible status' } });
        }
        d.status = params.status;
      }

      d.updatedAt = new Date();
      await manager.save(d);

      await outbox.publish({
        topic: 'insurance.deductible.updated',
        eventType: 'DeductibleUpdated',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { deductibleId: d.deductibleId, tenantId },
        payload: { tenantId, deductibleId: d.deductibleId, code: d.code, nameFa: d.nameFa, kind: d.kind, value: d.value, status: d.status, changeReason: params.changeReason },
      });

      return d;
    });
  }

  async archiveDeductible(params: { tenantId: string; deductibleId: string; correlationId?: string }): Promise<Deductible> {
    const tenantId = requireTenant(params.tenantId);
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const d = await manager.findOne(Deductible, { where: { tenantId, deductibleId: params.deductibleId } });
      if (!d) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Deductible not found' } });
      if (d.status === 'archived') {
        throw new BadRequestException({ success: false, error: { code: 'ALREADY_ARCHIVED', message: 'Deductible is already archived' } });
      }
      d.status = 'archived';
      d.updatedAt = new Date();
      await manager.save(d);

      await outbox.publish({
        topic: 'insurance.deductible.archived',
        eventType: 'DeductibleArchived',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { deductibleId: d.deductibleId, tenantId },
        payload: { tenantId, deductibleId: d.deductibleId, code: d.code, status: d.status },
      });

      return d;
    });
  }

  // Pricing rules
  async createPricingRule(params: {
    tenantId: string;
    productId: string;
    code: string;
    nameFa: string;
    ruleType?: PricingRuleType;
    priority?: number;
    rule?: any;
    conditions?: any;
    validFrom?: Date;
    validTo?: Date;
    regions?: string[];
    createdBy?: string | null;
    correlationId?: string;
  }): Promise<PricingRule> {
    const tenantId = requireTenant(params.tenantId);
    const productId = (params.productId || '').trim();
    const code = (params.code || '').trim();
    const nameFa = (params.nameFa || '').trim();

    if (!productId || !code || !nameFa) {
      throw new BadRequestException({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'productId, code, nameFa are required' },
      });
    }

    const ruleType: PricingRuleType = params.ruleType || 'base';
    if (!ALLOWED_RULE_TYPES.includes(ruleType)) {
      throw new BadRequestException({ success: false, error: { code: 'INVALID_RULE_TYPE', message: 'Invalid pricing rule type' } });
    }

    validatePricingRuleSchema(params.rule);
    validateTypedRuleSchema(params.rule, ruleType);
    validateConditions(params.conditions);

    if (params.validFrom && params.validTo && new Date(params.validFrom) > new Date(params.validTo)) {
      throw new BadRequestException({ success: false, error: { code: 'INVALID_VALIDITY', message: 'validFrom cannot be after validTo' } });
    }

    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const p = await manager.findOne(Product, { where: { tenantId, productId } });
      if (!p) {
        throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'productId is invalid' } });
      }
      if (p.status === 'archived') {
        throw new BadRequestException({ success: false, error: { code: 'ARCHIVED_PRODUCT', message: 'Cannot add pricing rule to archived product' } });
      }

      const existing = await manager.findOne(PricingRule, { where: { tenantId, productId, code } });
      if (existing) {
        throw new BadRequestException({
          success: false,
          error: { code: 'DUPLICATE', message: 'code already exists for product' },
        });
      }

      const r = manager.create(PricingRule, {
        pricingRuleId: uuidv4(),
        tenantId,
        productId,
        code,
        nameFa,
        ruleType,
        priority: params.priority ?? 0,
        status: 'draft',
        rule: params.rule ?? defaultPricingRule(),
        conditions: params.conditions ?? null,
        validFrom: params.validFrom ? new Date(params.validFrom) : null,
        validTo: params.validTo ? new Date(params.validTo) : null,
        regions: Array.isArray(params.regions) ? params.regions : null,
        createdBy: params.createdBy ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await manager.save(r);

      await outbox.publish({
        topic: 'insurance.pricing_rule.created',
        eventType: 'PricingRuleCreated',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { productId, pricingRuleId: r.pricingRuleId, tenantId },
        payload: { tenantId, productId, pricingRuleId: r.pricingRuleId, code, nameFa, ruleType, status: r.status },
      });

      return r;
    });
  }

  async getPricingRule(tenantId: string, pricingRuleId: string): Promise<PricingRule | null> {
    requireTenant(tenantId);
    return await this.pricingRulesRepo.findOne({ where: { tenantId, pricingRuleId } });
  }

  async listPricingRules(params: {
    tenantId: string;
    productId?: string;
    status?: PricingRuleStatus;
    q?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: PricingRule[]; total: number }> {
    const tenantId = requireTenant(params.tenantId);
    const qb = this.pricingRulesRepo.createQueryBuilder('r');
    qb.andWhere('r.tenant_id = :tenantId', { tenantId });

    if (params.productId) qb.andWhere('r.product_id = :pid', { pid: params.productId });
    if (params.status) qb.andWhere('r.status = :status', { status: params.status });
    if (params.q) qb.andWhere('(r.code ILIKE :q OR r.name_fa ILIKE :q)', { q: `%${params.q}%` });

    qb.orderBy('r.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async updatePricingRule(params: {
    tenantId: string;
    pricingRuleId: string;
    nameFa?: string;
    rule?: any;
    ruleType?: PricingRuleType;
    priority?: number;
    conditions?: any;
    validFrom?: Date;
    validTo?: Date;
    regions?: string[];
    status?: PricingRuleStatus;
    changeReason?: string;
    changedBy?: string | null;
    correlationId?: string;
  }): Promise<PricingRule> {
    const tenantId = requireTenant(params.tenantId);
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const r = await manager.findOne(PricingRule, { where: { tenantId, pricingRuleId: params.pricingRuleId } });
      if (!r) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Pricing rule not found' } });

      if (r.status === 'archived') {
        throw new BadRequestException({ success: false, error: { code: 'ARCHIVED_PRICING_RULE', message: 'Cannot update archived pricing rule' } });
      }

      if (params.nameFa !== undefined) {
        const v = (params.nameFa || '').trim();
        if (!v) {
          throw new BadRequestException({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'nameFa cannot be empty' },
          });
        }
        r.nameFa = v;
      }
      if (params.ruleType !== undefined) {
        if (!ALLOWED_RULE_TYPES.includes(params.ruleType)) {
          throw new BadRequestException({ success: false, error: { code: 'INVALID_RULE_TYPE', message: 'Invalid pricing rule type' } });
        }
        r.ruleType = params.ruleType;
      }
      if (params.priority !== undefined) r.priority = params.priority;
      if (params.rule !== undefined) {
        if (params.rule === null) {
          throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'rule cannot be null' } });
        }
        validatePricingRuleSchema(params.rule);
        validateTypedRuleSchema(params.rule, r.ruleType);
        r.rule = params.rule;
      }
      if (params.conditions !== undefined) {
        validateConditions(params.conditions);
        r.conditions = params.conditions;
      }
      if (params.validFrom !== undefined) r.validFrom = params.validFrom ? new Date(params.validFrom) : null;
      if (params.validTo !== undefined) r.validTo = params.validTo ? new Date(params.validTo) : null;
      if (params.regions !== undefined) r.regions = Array.isArray(params.regions) ? params.regions : null;
      if (params.status !== undefined) {
        const allowed: PricingRuleStatus[] = ['draft', 'active', 'archived'];
        if (!allowed.includes(params.status)) {
          throw new BadRequestException({ success: false, error: { code: 'INVALID_STATUS', message: 'Invalid pricing rule status' } });
        }
        r.status = params.status;
      }

      r.updatedAt = new Date();
      await manager.save(r);

      await outbox.publish({
        topic: 'insurance.pricing_rule.updated',
        eventType: 'PricingRuleUpdated',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { pricingRuleId: r.pricingRuleId, tenantId },
        payload: { tenantId, pricingRuleId: r.pricingRuleId, code: r.code, nameFa: r.nameFa, status: r.status, changeReason: params.changeReason },
      });

      return r;
    });
  }

  async archivePricingRule(params: { tenantId: string; pricingRuleId: string; correlationId?: string }): Promise<PricingRule> {
    const tenantId = requireTenant(params.tenantId);
    return await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const r = await manager.findOne(PricingRule, { where: { tenantId, pricingRuleId: params.pricingRuleId } });
      if (!r) throw new NotFoundException({ success: false, error: { code: 'NOT_FOUND', message: 'Pricing rule not found' } });
      if (r.status === 'archived') {
        throw new BadRequestException({ success: false, error: { code: 'ALREADY_ARCHIVED', message: 'Pricing rule is already archived' } });
      }
      r.status = 'archived';
      r.updatedAt = new Date();
      await manager.save(r);

      await outbox.publish({
        topic: 'insurance.pricing_rule.archived',
        eventType: 'PricingRuleArchived',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { pricingRuleId: r.pricingRuleId, tenantId },
        payload: { tenantId, pricingRuleId: r.pricingRuleId, code: r.code, status: r.status },
      });

      return r;
    });
  }

  async exportSnapshot(params: {
    tenantId: string;
    productId?: string;
    status?: ProductStatus;
    includeVersions?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{
    products: Product[];
    coverages: Coverage[];
    deductibles: Deductible[];
    pricingRules: PricingRule[];
    productVersions?: ProductVersion[];
  }> {
    const tenantId = requireTenant(params.tenantId);
    const paging = this.normalizePaging(params.limit, params.offset);

    const baseWhere: any = { tenantId };
    if (params.productId) baseWhere.productId = params.productId;
    if (params.status) baseWhere.status = params.status;

    const childWhere: any = { tenantId };
    if (params.productId) childWhere.productId = params.productId;
    if (params.status) childWhere.status = params.status;

    const [products, coverages, deductibles, pricingRules] = await Promise.all([
      this.productsRepo.find({ where: baseWhere, order: { createdAt: 'DESC' as any }, take: paging.limit, skip: paging.offset }),
      this.coveragesRepo.find({ where: childWhere, order: { createdAt: 'DESC' as any }, take: paging.limit, skip: paging.offset }),
      this.deductiblesRepo.find({ where: childWhere, order: { createdAt: 'DESC' as any }, take: paging.limit, skip: paging.offset }),
      this.pricingRulesRepo.find({ where: childWhere, order: { createdAt: 'DESC' as any }, take: paging.limit, skip: paging.offset }),
    ]);

    let productVersions: ProductVersion[] | undefined;
    if (params.includeVersions) {
      const versionWhere: any = { tenantId };
      if (params.productId) versionWhere.productId = params.productId;
      productVersions = await this.productVersionsRepo.find({
        where: versionWhere,
        order: { createdAt: 'DESC' as any },
        take: paging.limit,
        skip: paging.offset,
      });
    }

    return { products, coverages, deductibles, pricingRules, productVersions };
  }

  async computeQuote(params: {
    tenantId: string;
    productId: string;
    currency: Currency;
    exposure?: Record<string, any>;
    region?: string;
    effectiveDate?: Date | string;
    version?: number;
  }): Promise<any> {
    const tenantId = requireTenant(params.tenantId);
    const productId = (params.productId || '').trim();
    if (!productId) {
      throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'productId is required' } });
    }

    const currency = validateCurrency(params.currency);
    const p = await this.productsRepo.findOne({ where: { tenantId, productId } });
    if (!p) {
      throw new BadRequestException({ success: false, error: { code: 'VALIDATION_ERROR', message: 'productId is invalid' } });
    }

    const effectiveDate = params.effectiveDate ? new Date(params.effectiveDate) : new Date();
    if (!Number.isFinite(effectiveDate.getTime())) {
      throw new BadRequestException({ success: false, error: { code: 'INVALID_DATE', message: 'effectiveDate is invalid' } });
    }

    // Prefer the immutable active published version snapshot; fall back to live active rules
    let rules: any[];
    const publishedVersion = params.version !== undefined
      ? await this.productVersionsRepo.findOne({ where: { tenantId, productId, version: params.version } })
      : await this.productVersionsRepo.findOne({
          where: { tenantId, productId, status: 'active' },
          order: { version: 'DESC' },
        });

    if (publishedVersion && publishedVersion.snapshot && Array.isArray(publishedVersion.snapshot.pricingRules)) {
      if (publishedVersion.effectiveDate && effectiveDate < new Date(publishedVersion.effectiveDate)) {
        throw new BadRequestException({
          success: false,
          error: { code: 'VERSION_NOT_YET_EFFECTIVE', message: 'Requested version is not yet effective for the given date' },
        });
      }
      rules = publishedVersion.snapshot.pricingRules.map((r: any) => ({
        ...r,
        tenantId,
        productId,
        status: 'active',
        validFrom: r.validFrom ?? null,
        validTo: r.validTo ?? null,
      }));
    } else {
      rules = await this.pricingRulesRepo.find({ where: { tenantId, productId, status: 'active' } });
    }

    return QuoteEngine.compute(rules, {
      productId,
      tenantId,
      productStatus: p.status,
      currency,
      exposure: params.exposure,
      region: params.region,
      effectiveDate,
    });
  }

  // Canonical evaluation endpoint - delegates to QuoteEngine to avoid dual logic
  async evaluatePricingRules(params: {
    tenantId: string;
    productId: string;
    currency: Currency;
    exposure: Record<string, any>;
    region?: string;
    effectiveDate?: Date | string;
    version?: number;
  }): Promise<any> {
    return this.computeQuote(params);
  }

  // Product Versioning
  async listProductVersions(params: {
    tenantId: string;
    productId: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: ProductVersion[]; total: number }> {
    const tenantId = requireTenant(params.tenantId);
    const qb = this.productVersionsRepo.createQueryBuilder('pv');
    qb.andWhere('pv.tenant_id = :tenantId', { tenantId });
    qb.andWhere('pv.product_id = :pid', { pid: params.productId });
    qb.orderBy('pv.version', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async getProductVersion(params: {
    tenantId: string;
    productId: string;
    version: number;
  }): Promise<ProductVersion | null> {
    const tenantId = requireTenant(params.tenantId);
    return await this.productVersionsRepo.findOne({
      where: { tenantId, productId: params.productId, version: params.version },
    });
  }
}
