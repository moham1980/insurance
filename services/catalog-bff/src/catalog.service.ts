import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';

export interface CatalogContext {
  tenantId: string;
  organizationId?: string | null;
  authorization: string;
  roles?: string[];
  capabilities?: string[];
}

function requireTenant(user: any): string {
  const id = user?.tenantId;
  if (!id) throw new ForbiddenException({ success: false, error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required' } });
  return String(id).trim();
}

function normalizePaging(limit: any, offset: any): { limit: number; offset: number } {
  const lim = Math.min(Math.max(parseInt(String(limit ?? 50), 10) || 50, 1), 200);
  const off = Math.max(parseInt(String(offset ?? 0), 10) || 0, 0);
  return { limit: lim, offset: off };
}

@Injectable()
export class CatalogService {
  private productServiceUrl = process.env.PRODUCT_SERVICE_URL || 'http://localhost:18018';
  private salesNetworkServiceUrl = process.env.SALES_NETWORK_SERVICE_URL || 'http://localhost:3022';

  // Simple in-memory cache with TTL for catalog responses
  private cache = new Map<string, { data: any; expiresAt: number }>();
  private cacheTtlMs = parseInt(process.env.CATALOG_CACHE_TTL_MS || '60000', 10);

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.data as T;
    }
    if (entry) this.cache.delete(key);
    return null;
  }

  private setCached(key: string, data: any): void {
    this.cache.set(key, { data, expiresAt: Date.now() + this.cacheTtlMs });
  }

  invalidateCache(prefix?: string): void {
    if (!prefix) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) this.cache.delete(key);
    }
  }

  private async get(url: string, authorization: string): Promise<any> {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        authorization,
        'content-type': 'application/json',
      },
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      const text = await res.text();
      throw new BadRequestException({ success: false, error: { code: 'UPSTREAM_ERROR', message: text } });
    }
    return res.json();
  }

  private async post(url: string, authorization: string, body: any): Promise<any> {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        authorization,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new BadRequestException({ success: false, error: { code: 'UPSTREAM_ERROR', message: text } });
    }
    return res.json();
  }

  // --------------------------------------------------------------------------
  // Catalog queries
  // --------------------------------------------------------------------------

  async listProducts(user: any, query: any): Promise<any> {
    const tenantId = requireTenant(user);
    const { limit, offset } = normalizePaging(query.limit, query.offset);
    const owner = query.ownerOrganizationId ? `&ownerOrganizationId=${encodeURIComponent(query.ownerOrganizationId)}` : '';
    const lob = query.lineOfBusiness ? `&lineOfBusiness=${encodeURIComponent(query.lineOfBusiness)}` : '';
    const status = query.status ? `&status=${encodeURIComponent(query.status)}` : '';
    const cacheKey = `products:${tenantId}:${limit}:${offset}:${owner}:${lob}:${status}`;
    const cached = this.getCached<any>(cacheKey);
    if (cached) return cached;
    const url = `${this.productServiceUrl}/api/v1/products?tenantId=${encodeURIComponent(tenantId)}&limit=${limit}&offset=${offset}${owner}${lob}${status}`;
    const res = await this.get(url, user.authorization);
    const data = res?.data ?? res;
    this.setCached(cacheKey, data);
    return data;
  }

  async getProduct(user: any, productId: string): Promise<any> {
    requireTenant(user);
    const cacheKey = `product:${productId}`;
    const cached = this.getCached<any>(cacheKey);
    if (cached) return cached;
    const url = `${this.productServiceUrl}/api/v1/products/${encodeURIComponent(productId)}`;
    const res = await this.get(url, user.authorization);
    const data = res?.data ?? res;
    if (data) this.setCached(cacheKey, data);
    return data;
  }

  async listDistributorVisibleProducts(user: any, distributorOrganizationId: string, query: any): Promise<any> {
    requireTenant(user);
    const { limit, offset } = normalizePaging(query.limit, query.offset);
    const version = query.productVersion ? `&productVersion=${encodeURIComponent(query.productVersion)}` : '';
    const agreement = query.agreementId ? `&agreementId=${encodeURIComponent(query.agreementId)}` : '';
    const url = `${this.productServiceUrl}/api/v1/distributors/${encodeURIComponent(distributorOrganizationId)}/visible-products?limit=${limit}&offset=${offset}${version}${agreement}`;
    const res = await this.get(url, user.authorization);
    return res?.data ?? res;
  }

  async listBrokerOfferings(user: any, query: any): Promise<any> {
    requireTenant(user);
    const { limit, offset } = normalizePaging(query.limit, query.offset);
    const broker = query.brokerOrganizationId ? `&brokerOrganizationId=${encodeURIComponent(query.brokerOrganizationId)}` : '';
    const lob = query.lineOfBusiness ? `&lineOfBusiness=${encodeURIComponent(query.lineOfBusiness)}` : '';
    const status = query.status ? `&status=${encodeURIComponent(query.status)}` : '&status=active';
    const url = `${this.productServiceUrl}/api/v1/broker-offerings?limit=${limit}&offset=${offset}${broker}${lob}${status}`;
    const res = await this.get(url, user.authorization);
    return res?.data ?? res;
  }

  async listCustomerOfferings(user: any, query: any): Promise<any> {
    requireTenant(user);
    const { limit, offset } = normalizePaging(query.limit, query.offset);
    const broker = query.brokerOrganizationId ? `&brokerOrganizationId=${encodeURIComponent(query.brokerOrganizationId)}` : '';
    const lob = query.lineOfBusiness ? `&lineOfBusiness=${encodeURIComponent(query.lineOfBusiness)}` : '';
    const currency = query.currency ? `&currency=${encodeURIComponent(query.currency)}` : '';
    const region = query.region ? `&region=${encodeURIComponent(query.region)}` : '';
    const url = `${this.productServiceUrl}/api/v1/customers/offerings?limit=${limit}&offset=${offset}${broker}${lob}${currency}${region}`;
    const res = await this.get(url, user.authorization);
    return res?.data ?? res;
  }

  async getAgreementEligibility(user: any, agreementId: string, lineOfBusiness?: string): Promise<any> {
    requireTenant(user);
    const lob = lineOfBusiness ? `?lineOfBusiness=${encodeURIComponent(lineOfBusiness)}` : '';
    const url = `${this.salesNetworkServiceUrl}/api/v1/distribution-agreements/${encodeURIComponent(agreementId)}/eligibility${lob}`;
    const res = await this.get(url, user.authorization);
    return res?.data ?? res;
  }

  async getOfferingComparisonHint(user: any, offeringId: string): Promise<any> {
    requireTenant(user);
    const cacheKey = `comparison-hint:${offeringId}`;
    const cached = this.getCached<any>(cacheKey);
    if (cached) return cached;

    const url = `${this.productServiceUrl}/api/v1/broker-offerings/${encodeURIComponent(offeringId)}`;
    const res = await this.get(url, user.authorization);
    const offering = res?.data ?? res;
    if (!offering) return null;

    const hint = {
      offeringId: offering.offeringId,
      name: offering.name,
      includedProductIds: offering.includedProductIds || [],
      agreementVersionSnapshot: offering.agreementVersionSnapshot,
      distributionAgreementId: offering.distributionAgreementId,
      commissionTiers: offering.commissionTiers || null,
      comparisonFactors: [
        { factor: 'coverage', source: 'product_version' },
        { factor: 'price', source: 'rate_table', note: 'Rate table not exposed to broker' },
        { factor: 'deductible', source: 'coverage_definition' },
        { factor: 'commission', source: 'commission_tiers', note: 'Variable commission based on tiers' },
      ],
    };
    this.setCached(cacheKey, hint);
    return hint;
  }
}
