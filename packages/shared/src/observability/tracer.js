import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
export class Tracer {
    sdk = null;
    serviceName;
    constructor(config) {
        this.serviceName = config.serviceName;
        if (config.otlpEndpoint) {
            this.sdk = new NodeSDK({
                resource: new Resource({
                    [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
                }),
                traceExporter: new OTLPTraceExporter({
                    url: config.otlpEndpoint,
                }),
            });
        }
        else if (config.jaegerEndpoint) {
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
    start() {
        this.sdk?.start();
    }
    stop() {
        return this.sdk?.shutdown() || Promise.resolve();
    }
    createSpan(name, attributes) {
        const tracer = trace.getTracer(this.serviceName);
        return tracer.startSpan(name, { attributes });
    }
    withSpan(name, fn, attributes) {
        const span = this.createSpan(name, attributes);
        const ctx = trace.setSpan(context.active(), span);
        try {
            return context.with(ctx, fn);
        }
        catch (error) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
        finally {
            span.end();
        }
    }
}
export const createTracer = (config) => new Tracer(config);
//# sourceMappingURL=tracer.js.map