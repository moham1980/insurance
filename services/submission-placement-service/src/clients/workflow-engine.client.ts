import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ClientRegistry } from './client.registry';

@Injectable()
export class WorkflowEngineClient {
  private readonly http: AxiosInstance;

  constructor(private readonly registry: ClientRegistry) {
    const endpoint = this.registry.workflowEngine();
    this.http = axios.create({ baseURL: endpoint.baseUrl, timeout: endpoint.timeoutMs });
  }

  async startManualQuoteProcess(tenantId: string, body: any, authHeader?: string): Promise<any> {
    const headers: any = { 'X-Tenant-Id': tenantId };
    if (authHeader) headers.Authorization = authHeader;
    const res = await this.http.post('/api/v1/workflow/manual-quote/start', body, { headers });
    return res.data;
  }

  async getWorkItem(tenantId: string, workItemId: string, authHeader?: string): Promise<any> {
    const headers: any = { 'X-Tenant-Id': tenantId };
    if (authHeader) headers.Authorization = authHeader;
    const res = await this.http.get(`/api/v1/workflow/work-items/${workItemId}`, { headers });
    return res.data?.data;
  }
}
