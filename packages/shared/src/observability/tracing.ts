import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as crypto from 'crypto';
import { MetricsService } from './metrics';

export interface TraceContext {
  correlationId: string;
  traceId?: string;
  parentSpanId?: string;
  spanId: string;
  tenantId?: string;
  userId?: string;
}

export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

export function generateSpanId(): string {
  return crypto.randomBytes(8).toString('hex');
}

export function generateTraceId(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function extractTraceContext(headers: Record<string, any>): TraceContext {
  const correlationId =
    (headers['x-correlation-id'] as string) ||
    (headers['X-Correlation-Id'] as string) ||
    generateCorrelationId();

  let traceId: string | undefined;
  let parentSpanId: string | undefined;

  const traceparent = headers['traceparent'] as string;
  if (traceparent && typeof traceparent === 'string') {
    const parts = traceparent.split('-');
    if (parts.length >= 4) {
      traceId = parts[1];
      parentSpanId = parts[2];
    }
  }

  return {
    correlationId,
    traceId: traceId || generateTraceId(),
    parentSpanId,
    spanId: generateSpanId(),
  };
}

export function buildTraceparent(ctx: TraceContext): string {
  return `00-${ctx.traceId}-${ctx.spanId}-01`;
}

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const traceCtx = extractTraceContext(request.headers || {});

    request.traceContext = traceCtx;
    request.correlationId = traceCtx.correlationId;

    const response = context.switchToHttp().getResponse();
    response.header('X-Correlation-Id', traceCtx.correlationId);
    response.header('traceparent', buildTraceparent(traceCtx));

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          MetricsService.recordRequest(request.method, request.url, 200, duration, traceCtx);
        },
        error: (err: any) => {
          const duration = Date.now() - startTime;
          const status = err?.status || err?.statusCode || 500;
          MetricsService.recordRequest(request.method, request.url, status, duration, traceCtx);
        },
      })
    );
  }
}
