import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface Trace {
  traceID: string;
  spans: Span[];
  processes: Record<string, Process>;
  warnings?: string[];
}

export interface Span {
  traceID: string;
  spanID: string;
  operationName: string;
  references: Reference[];
  startTime: number;
  duration: number;
  tags: Tag[];
  logs: Log[];
  processID: string;
  process: Process;
}

export interface Reference {
  refType: string;
  traceID: string;
  spanID: string;
}

export interface Tag {
  key: string;
  type: string;
  value: string | number | boolean;
}

export interface Log {
  timestamp: number;
  fields: Tag[];
}

export interface Process {
  serviceName: string;
  tags: Tag[];
}

export interface TraceQuery {
  service?: string;
  operation?: string;
  tags?: Record<string, string>;
  startTimeMin?: number;
  startTimeMax?: number;
  durationMin?: number;
  durationMax?: number;
  limit?: number;
}

export interface TraceSearchResponse {
  data: Trace[];
  total: number;
  limit: number;
  offset: number;
  errors: string[];
}

export interface Service {
  name: string;
}

export interface Operation {
  name: string;
  spanKind: string;
}

@Injectable()
export class JaegerClientService {
  private readonly logger = new Logger(JaegerClientService.name);
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get('JAEGER_QUERY_URL') || 'http://localhost:16686';
    this.client = axios.create({
      baseURL: `${this.baseUrl}/api`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`Jaeger client initialized with base URL: ${this.baseUrl}`);
  }

  async getTrace(traceId: string): Promise<Trace> {
    try {
      const response = await this.client.get<Trace>(`/traces/${traceId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get trace ${traceId}`, error);
      throw new Error(`Failed to get trace ${traceId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchTraces(query: TraceQuery): Promise<TraceSearchResponse> {
    try {
      const params: Record<string, any> = {
        limit: query.limit || 20,
      };

      if (query.service) {
        params.service = query.service;
      }

      if (query.operation) {
        params.operation = query.operation;
      }

      if (query.tags) {
        params.tags = JSON.stringify(query.tags);
      }

      if (query.startTimeMin) {
        params.start = query.startTimeMin;
      }

      if (query.startTimeMax) {
        params.end = query.startTimeMax;
      }

      if (query.durationMin) {
        params.minDuration = query.durationMin;
      }

      if (query.durationMax) {
        params.maxDuration = query.durationMax;
      }

      const response = await this.client.get<TraceSearchResponse>('/traces', { params });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to search traces', error);
      throw new Error(`Failed to search traces: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getServices(): Promise<Service[]> {
    try {
      const response = await this.client.get<{ data: Service[] }>('/services');
      return response.data.data;
    } catch (error) {
      this.logger.error('Failed to get services', error);
      throw new Error(`Failed to get services: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getOperations(service: string): Promise<Operation[]> {
    try {
      const response = await this.client.get<{ data: Operation[] }>(`/services/${service}/operations`);
      return response.data.data;
    } catch (error) {
      this.logger.error(`Failed to get operations for service ${service}`, error);
      throw new Error(`Failed to get operations for service ${service}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchTracesByCorrelationId(correlationId: string, limit: number = 10): Promise<Trace[]> {
    try {
      const response = await this.searchTraces({
        tags: {
          correlation_id: correlationId,
        },
        limit,
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to search traces by correlation ID ${correlationId}`, error);
      throw new Error(`Failed to search traces by correlation ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchTracesByRequestId(requestId: string, limit: number = 10): Promise<Trace[]> {
    try {
      const response = await this.searchTraces({
        tags: {
          request_id: requestId,
        },
        limit,
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to search traces by request ID ${requestId}`, error);
      throw new Error(`Failed to search traces by request ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchTracesByUserId(userId: string, limit: number = 20): Promise<Trace[]> {
    try {
      const response = await this.searchTraces({
        tags: {
          user_id: userId,
        },
        limit,
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to search traces by user ID ${userId}`, error);
      throw new Error(`Failed to search traces by user ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchTracesByError(errorType: string, limit: number = 20): Promise<Trace[]> {
    try {
      const response = await this.searchTraces({
        tags: {
          error: 'true',
          'error.type': errorType,
        },
        limit,
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to search traces by error type ${errorType}`, error);
      throw new Error(`Failed to search traces by error type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTraceMetrics(traceId: string): Promise<{
    totalDuration: number;
    spanCount: number;
    serviceCount: number;
    errorCount: number;
    services: string[];
    operations: string[];
  }> {
    try {
      const trace = await this.getTrace(traceId);
      
      const services = new Set<string>();
      const operations = new Set<string>();
      let errorCount = 0;

      for (const span of trace.spans) {
        services.add(span.process.serviceName);
        operations.add(span.operationName);
        
        const errorTag = span.tags.find(tag => tag.key === 'error');
        if (errorTag && errorTag.value === true) {
          errorCount++;
        }
      }

      const totalDuration = Math.max(...trace.spans.map(s => s.startTime + s.duration)) - 
                           Math.min(...trace.spans.map(s => s.startTime));

      return {
        totalDuration,
        spanCount: trace.spans.length,
        serviceCount: services.size,
        errorCount,
        services: Array.from(services),
        operations: Array.from(operations),
      };
    } catch (error) {
      this.logger.error(`Failed to get trace metrics for ${traceId}`, error);
      throw new Error(`Failed to get trace metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchSlowTraces(thresholdMs: number = 5000, limit: number = 20): Promise<Trace[]> {
    try {
      const response = await this.searchTraces({
        durationMin: thresholdMs,
        limit,
      });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to search slow traces', error);
      throw new Error(`Failed to search slow traces: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchErrorTraces(limit: number = 20): Promise<Trace[]> {
    try {
      const response = await this.searchTraces({
        tags: {
          error: 'true',
        },
        limit,
      });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to search error traces', error);
      throw new Error(`Failed to search error traces: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getServiceStats(service: string, startTimeMin?: number, startTimeMax?: number): Promise<{
    traceCount: number;
    avgDuration: number;
    maxDuration: number;
    errorRate: number;
  }> {
    try {
      const response = await this.searchTraces({
        service,
        startTimeMin,
        startTimeMax,
        limit: 1000,
      });

      const traces = response.data;
      if (traces.length === 0) {
        return {
          traceCount: 0,
          avgDuration: 0,
          maxDuration: 0,
          errorRate: 0,
        };
      }

      const durations = traces.map(trace => {
        const startTime = Math.min(...trace.spans.map(s => s.startTime));
        const endTime = Math.max(...trace.spans.map(s => s.startTime + s.duration));
        return endTime - startTime;
      });

      const errorCount = traces.filter(trace => 
        trace.spans.some(span => span.tags.some(tag => tag.key === 'error' && tag.value === true))
      ).length;

      return {
        traceCount: traces.length,
        avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
        maxDuration: Math.max(...durations),
        errorRate: errorCount / traces.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get service stats for ${service}`, error);
      throw new Error(`Failed to get service stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; url: string; error?: string }> {
    try {
      await this.client.get('/');
      return {
        healthy: true,
        url: this.baseUrl,
      };
    } catch (error) {
      return {
        healthy: false,
        url: this.baseUrl,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
