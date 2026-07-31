import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ClientRegistry } from './client.registry';

@Injectable()
export class BillingServiceClient {
  private readonly http: AxiosInstance;

  constructor(private readonly registry: ClientRegistry) {
    const endpoint = this.registry.billing();
    this.http = axios.create({ baseURL: endpoint.baseUrl, timeout: endpoint.timeoutMs });
  }

  async reservePremium(tenantId: string, body: any, authHeader?: string): Promise<any> {
    const headers: any = { 'X-Tenant-Id': tenantId };
    if (authHeader) headers.Authorization = authHeader;
    const res = await this.http.post('/api/v1/premium-reservations', body, { headers });
    return res.data;
  }

  async releasePremium(tenantId: string, reservationId: string, authHeader?: string): Promise<any> {
    const headers: any = { 'X-Tenant-Id': tenantId };
    if (authHeader) headers.Authorization = authHeader;
    const res = await this.http.post(`/api/v1/premium-reservations/${reservationId}/release`, {}, { headers });
    return res.data;
  }
}
