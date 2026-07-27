import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export class ApiClient {
  private client: AxiosInstance;
  private correlationId: string;

  constructor(baseUrl: string, token?: string) {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    this.correlationId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Request interceptor to add correlation ID
    this.client.interceptors.request.use((config) => {
      config.headers['x-correlation-id'] = this.correlationId;
      return config;
    });
  }

  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  getCorrelationId(): string {
    return this.correlationId;
  }

  setToken(token: string): void {
    this.client.defaults.headers['Authorization'] = `Bearer ${token}`;
  }

  setTenantId(tenantId: string): void {
    this.client.defaults.headers['x-tenant-id'] = tenantId;
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    if (data === undefined) {
      const response = await this.client.post<T>(url, undefined, {
        ...config,
        headers: { ...config?.headers, 'Content-Type': undefined },
      });
      return response.data;
    }
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    if (data === undefined) {
      const response = await this.client.put<T>(url, undefined, {
        ...config,
        headers: { ...config?.headers, 'Content-Type': undefined },
      });
      return response.data;
    }
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }
}

export function createGatewayClient(token?: string): ApiClient {
  const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:18000';
  return new ApiClient(gatewayUrl, token);
}

export function createServiceClient(serviceUrl: string, token?: string): ApiClient {
  return new ApiClient(serviceUrl, token);
}
