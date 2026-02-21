import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

export interface TracerConfig {
  serviceName: string;
  jaegerEndpoint?: string;
}

export class Tracer {
  private sdk: NodeSDK | null = null;
  private serviceName: string;

  constructor(config: TracerConfig) {
    this.serviceName = config.serviceName;
    
    if (config.jaegerEndpoint) {
      this.sdk = new NodeSDK({
        resource: new Resource({
          [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
        }),
        traceExporter: new JaegerExporter({
          endpoint: config.jaegerEndpoint,
        }),
      });
    }
  }

  start(): void {
    this.sdk?.start();
  }

  stop(): Promise<void> {
    return this.sdk?.shutdown() || Promise.resolve();
  }

  createSpan(name: string, attributes?: Record<string, string>) {
    const tracer = trace.getTracer(this.serviceName);
    return tracer.startSpan(name, { attributes });
  }

  withSpan<T>(name: string, fn: () => T, attributes?: Record<string, string>): T {
    const span = this.createSpan(name, attributes);
    const ctx = trace.setSpan(context.active(), span);
    
    try {
      return context.with(ctx, fn);
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      span.end();
    }
  }
}

export const createTracer = (config: TracerConfig): Tracer => new Tracer(config);
