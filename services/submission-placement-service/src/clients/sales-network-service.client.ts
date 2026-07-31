import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ClientRegistry } from './client.registry';

@Injectable()
export class SalesNetworkServiceClient {
  private readonly http: AxiosInstance;

  constructor(private readonly registry: ClientRegistry) {
    const endpoint = this.registry.salesNetwork();
    this.http = axios.create({ baseURL: endpoint.baseUrl, timeout: endpoint.timeoutMs });
  }

  async getDistributionAgreement(tenantId: string, agreementId: string, authHeader?: string): Promise<any> {
    const headers: any = { 'X-Tenant-Id': tenantId };
    if (authHeader) headers.Authorization = authHeader;
    const res = await this.http.get(`/api/v1/distribution-agreements/${agreementId}`, { headers });
    return res.data?.data;
  }

  async checkEligibility(tenantId: string, agreementId: string, lineOfBusiness?: string, authHeader?: string): Promise<any> {
    const headers: any = { 'X-Tenant-Id': tenantId };
    if (authHeader) headers.Authorization = authHeader;
    const res = await this.http.get(`/api/v1/distribution-agreements/${agreementId}/eligibility`, {
      headers,
      params: lineOfBusiness ? { lineOfBusiness } : {},
    });
    return res.data?.data;
  }

  async listDistributionAgreements(tenantId: string, filters: any, authHeader?: string): Promise<any[]> {
    const headers: any = { 'X-Tenant-Id': tenantId };
    if (authHeader) headers.Authorization = authHeader;
    const res = await this.http.get('/api/v1/distribution-agreements', { headers, params: filters });
    return res.data?.data || [];
  }

  async getCommissionTiers(tenantId: string, agreementId: string, authHeader?: string): Promise<any[]> {
    const headers: any = { 'X-Tenant-Id': tenantId };
    if (authHeader) headers.Authorization = authHeader;
    const res = await this.http.get(`/api/v1/distribution-agreements/${agreementId}/commission-tiers`, { headers });
    return res.data?.data || [];
  }
}
