export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  correlationId: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheckResponse {
  status: ServiceStatus;
  service: string;
  version: string;
  timestamp: string;
  checks: {
    database: boolean;
    messaging?: boolean;
    external?: boolean;
  };
}
