import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ClientRegistry } from './client.registry';

@Injectable()
export class ProductServiceClient {
  private readonly http: AxiosInstance;

  constructor(private readonly registry: ClientRegistry) {
    const endpoint = this.registry.product();
    this.http = axios.create({ baseURL: endpoint.baseUrl, timeout: endpoint.timeoutMs });
  }

  async getProductVersion(tenantId: string, productId: string, version: number, authHeader?: string): Promise<any> {
    const headers: any = { 'X-Tenant-Id': tenantId };
    if (authHeader) headers.Authorization = authHeader;
    const res = await this.http.get(`/api/v1/products/${productId}/versions/${version}`, { headers });
    return res.data?.data;
  }

  async checkProductVisibility(tenantId: string, productId: string, productVersion: number, brokerOrganizationId: string, authHeader?: string): Promise<{ visible: boolean; reason?: string }> {
    const headers: any = { 'X-Tenant-Id': tenantId };
    if (authHeader) headers.Authorization = authHeader;
    try {
      const res = await this.http.get(
        `/api/v1/distributors/${brokerOrganizationId}/visible-products?productVersion=${productVersion}&limit=200`,
        { headers },
      );
      const rows = res.data?.data || [];
      const visible = rows.some((v: any) => v.productId === productId && v.status === 'active');
      return { visible, reason: visible ? undefined : 'Product is not visible to this broker organization' };
    } catch (err: any) {
      return { visible: false, reason: err?.message || 'Failed to check product visibility' };
    }
  }

  async computeQuote(tenantId: string, body: any, authHeader?: string): Promise<any> {
    const headers: any = { 'X-Tenant-Id': tenantId };
    if (authHeader) headers.Authorization = authHeader;
    const res = await this.http.post('/api/v1/product/quote', { tenantId, ...body }, { headers });
    return res.data;
  }

  async listPricingRules(tenantId: string, productId: string, authHeader?: string): Promise<any[]> {
    const headers: any = { 'X-Tenant-Id': tenantId };
    if (authHeader) headers.Authorization = authHeader;
    const res = await this.http.get(`/api/v1/products/${productId}/pricing-rules`, { headers });
    return res.data?.data || [];
  }
}
