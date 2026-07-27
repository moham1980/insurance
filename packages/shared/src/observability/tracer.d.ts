export interface TracerConfig {
    serviceName: string;
    jaegerEndpoint?: string;
}
export declare class Tracer {
    private sdk;
    private serviceName;
    constructor(config: TracerConfig);
    start(): void;
    stop(): Promise<void>;
    createSpan(name: string, attributes?: Record<string, string>): import("@opentelemetry/api").Span;
    withSpan<T>(name: string, fn: () => T, attributes?: Record<string, string>): T;
}
export declare const createTracer: (config: TracerConfig) => Tracer;
