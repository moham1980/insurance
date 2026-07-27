import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { trace, metrics, context, SpanKind, SpanStatusCode, Attributes } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { SimpleSpanProcessor, BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { KafkaInstrumentation } from '@opentelemetry/instrumentation-kafkajs';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

@Injectable()
export class OtelService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OtelService.name);
  private tracerProvider: NodeTracerProvider | null = null;
  private meterProvider: MeterProvider | null = null;
  private prometheusExporter: PrometheusExporter | null = null;
  private jaegerExporter: JaegerExporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeTracing();
    await this.initializeMetrics();
    this.initializeInstrumentations();
    this.logger.log('OpenTelemetry initialized successfully');
  }

  async onModuleDestroy() {
    await this.shutdown();
  }

  private async initializeTracing() {
    const serviceName = this.configService.get('OTEL_SERVICE_NAME') || 'insurance-service';
    const enableJaeger = this.configService.get('OTEL_JAEGER_ENABLED') === 'true';

    // Create resource
    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: this.configService.get('SERVICE_VERSION') || '1.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.configService.get('NODE_ENV') || 'production',
      })
    );

    // Create tracer provider
    this.tracerProvider = new NodeTracerProvider({ resource });

    // Add Jaeger exporter if enabled
    if (enableJaeger) {
      this.jaegerExporter = new JaegerExporter({
        endpoint: this.configService.get('OTEL_JAEGER_ENDPOINT') || 'http://localhost:14268/api/traces',
      });

      this.tracerProvider.addSpanProcessor(
        new BatchSpanProcessor(this.jaegerExporter)
      );

      this.logger.log('Jaeger exporter initialized');
    }

    // Register tracer provider
    this.tracerProvider.register();

    this.logger.log('Tracing initialized');
  }

  private async initializeMetrics() {
    const enablePrometheus = this.configService.get('OTEL_PROMETHEUS_ENABLED') !== 'false';

    if (enablePrometheus) {
      this.prometheusExporter = new PrometheusExporter({
        port: parseInt(this.configService.get('OTEL_PROMETHEUS_PORT') || '9464'),
        endpoint: this.configService.get('OTEL_PROMETHEUS_ENDPOINT') || '/metrics',
      });

      this.meterProvider = new MeterProvider({
        resource: Resource.default().merge(
          new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: this.configService.get('OTEL_SERVICE_NAME') || 'insurance-service',
          })
        ),
      });

      this.meterProvider.addMetricReader(
        new PeriodicExportingMetricReader({
          exporter: this.prometheusExporter,
          exportIntervalMillis: 60000,
        })
      );

      metrics.setGlobalMeterProvider(this.meterProvider);

      this.logger.log('Prometheus metrics initialized');
    }
  }

  private initializeInstrumentations() {
    registerInstrumentations({
      instrumentations: [
        new HttpInstrumentation(),
        new ExpressInstrumentation(),
        new NestInstrumentation(),
        new PgInstrumentation(),
        new KafkaInstrumentation(),
      ],
    });

    this.logger.log('Auto-instrumentations registered');
  }

  // Public API methods for manual instrumentation

  startSpan(name: string, options?: { kind?: SpanKind; attributes?: Attributes }) {
    const tracer = trace.getTracer('insurance-tracer');
    return tracer.startSpan(name, options);
  }

  recordMetric(name: string, value: number, attributes?: Attributes) {
    const meter = metrics.getMeter('insurance-meter');
    const counter = meter.createCounter(name, {
      description: `Counter metric for ${name}`,
    });
    counter.add(value, attributes);
  }

  recordHistogram(name: string, value: number, attributes?: Attributes) {
    const meter = metrics.getMeter('insurance-meter');
    const histogram = meter.createHistogram(name, {
      description: `Histogram metric for ${name}`,
    });
    histogram.record(value, attributes);
  }

  recordGauge(name: string, value: number, attributes?: Attributes) {
    const meter = metrics.getMeter('insurance-meter');
    const gauge = meter.createUpDownCounter(name, {
      description: `Gauge metric for ${name}`,
    });
    gauge.add(value, attributes);
  }

  async withSpan<T>(name: string, fn: () => Promise<T>, options?: { kind?: SpanKind; attributes?: Attributes }): Promise<T> {
    const span = this.startSpan(name, options);
    const ctx = trace.setSpan(context.active(), span);

    try {
      const result = await context.with(ctx, fn);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      span.end();
    }
  }

  addAttributes(attributes: Attributes) {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes(attributes);
    }
  }

  addEvent(name: string, attributes?: Attributes) {
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  }

  recordException(error: Error) {
    const span = trace.getActiveSpan();
    if (span) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
    }
  }

  async shutdown() {
    if (this.tracerProvider) {
      await this.tracerProvider.shutdown();
      this.logger.log('Tracer provider shut down');
    }

    if (this.meterProvider) {
      await this.meterProvider.shutdown();
      this.logger.log('Meter provider shut down');
    }

    if (this.prometheusExporter) {
      await this.prometheusExporter.stopServer();
      this.logger.log('Prometheus exporter stopped');
    }

    if (this.jaegerExporter) {
      await this.jaegerExporter.shutdown();
      this.logger.log('Jaeger exporter shut down');
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; tracing: boolean; metrics: boolean }> {
    return {
      healthy: this.tracerProvider !== null || this.meterProvider !== null,
      tracing: this.tracerProvider !== null,
      metrics: this.meterProvider !== null,
    };
  }
}
