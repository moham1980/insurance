import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ClientRegistry } from './client.registry';

@Injectable()
export class UnderwritingServiceClient {
  private readonly http: AxiosInstance;

  constructor(private readonly registry: ClientRegistry) {
    const endpoint = this.registry.underwriting();
    this.http = axios.create({ baseURL: endpoint.baseUrl, timeout: endpoint.timeoutMs });
  }

  async checkRiskAppetite(tenantId: string, body: any, authHeader?: string): Promise<any> {
    const headers: any = { 'X-Tenant-Id': tenantId };
    if (authHeader) headers.Authorization = authHeader;
    const res = await this.http.post('/api/v1/underwriting/risk-appetite', body, { headers });
    return res.data;
  }

  async createReferral(tenantId: string, body: any, authHeader?: string): Promise<any> {
    const headers: any = { 'X-Tenant-Id': tenantId };
    if (authHeader) headers.Authorization = authHeader;
    const res = await this.http.post('/api/v1/underwriting/requests', body, { headers });
    return res.data;
  }
}
