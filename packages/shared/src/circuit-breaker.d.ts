/**
 * Circuit Breaker Implementation
 *
 * Prevents cascading failures by breaking the circuit when a service
 * fails repeatedly, allowing time for recovery before retrying.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is broken, requests fail fast
 * - HALF_OPEN: Testing if service has recovered
 */
export declare enum CircuitState {
    CLOSED = "CLOSED",
    OPEN = "OPEN",
    HALF_OPEN = "HALF_OPEN"
}
export interface CircuitBreakerConfig {
    failureThreshold: number;
    successThreshold: number;
    timeoutMs: number;
    resetTimeoutMs: number;
}
export interface CircuitBreakerStats {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime?: Date;
    lastSuccessTime?: Date;
    nextAttemptTime?: Date;
}
export declare class CircuitBreaker {
    private config;
    private state;
    private failureCount;
    private successCount;
    private lastFailureTime?;
    private lastSuccessTime?;
    private nextAttemptTime?;
    constructor(config: CircuitBreakerConfig);
    execute<T>(fn: () => Promise<T>): Promise<T>;
    private onSuccess;
    private onFailure;
    getStats(): CircuitBreakerStats;
    reset(): void;
}
export declare class CircuitBreakerRegistry {
    private circuits;
    get(name: string, config?: CircuitBreakerConfig): CircuitBreaker;
    getAllStats(): Map<string, CircuitBreakerStats>;
    reset(name: string): void;
    resetAll(): void;
}
export declare const circuitBreakerRegistry: CircuitBreakerRegistry;
