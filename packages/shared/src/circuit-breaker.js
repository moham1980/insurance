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
export var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "CLOSED";
    CircuitState["OPEN"] = "OPEN";
    CircuitState["HALF_OPEN"] = "HALF_OPEN";
})(CircuitState || (CircuitState = {}));
export class CircuitBreaker {
    config;
    state = CircuitState.CLOSED;
    failureCount = 0;
    successCount = 0;
    lastFailureTime;
    lastSuccessTime;
    nextAttemptTime;
    constructor(config) {
        this.config = config;
    }
    async execute(fn) {
        if (this.state === CircuitState.OPEN) {
            if (Date.now() < (this.nextAttemptTime?.getTime() || 0)) {
                throw new Error('CircuitBreaker: Circuit is OPEN - failing fast');
            }
            this.state = CircuitState.HALF_OPEN;
            this.successCount = 0;
        }
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    onSuccess() {
        this.successCount++;
        this.lastSuccessTime = new Date();
        if (this.state === CircuitState.HALF_OPEN) {
            if (this.successCount >= this.config.successThreshold) {
                this.state = CircuitState.CLOSED;
                this.failureCount = 0;
            }
        }
        else if (this.state === CircuitState.CLOSED) {
            this.failureCount = 0;
        }
    }
    onFailure() {
        this.failureCount++;
        this.lastFailureTime = new Date();
        if (this.state === CircuitState.HALF_OPEN) {
            this.state = CircuitState.OPEN;
            this.nextAttemptTime = new Date(Date.now() + this.config.resetTimeoutMs);
        }
        else if (this.state === CircuitState.CLOSED) {
            if (this.failureCount >= this.config.failureThreshold) {
                this.state = CircuitState.OPEN;
                this.nextAttemptTime = new Date(Date.now() + this.config.resetTimeoutMs);
            }
        }
    }
    getStats() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            lastFailureTime: this.lastFailureTime,
            lastSuccessTime: this.lastSuccessTime,
            nextAttemptTime: this.nextAttemptTime,
        };
    }
    reset() {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = undefined;
        this.lastSuccessTime = undefined;
        this.nextAttemptTime = undefined;
    }
}
// Circuit Breaker Registry for managing multiple circuits
export class CircuitBreakerRegistry {
    circuits = new Map();
    get(name, config) {
        if (!this.circuits.has(name)) {
            const defaultConfig = {
                failureThreshold: 5,
                successThreshold: 2,
                timeoutMs: 30000,
                resetTimeoutMs: 60000,
            };
            this.circuits.set(name, new CircuitBreaker(config || defaultConfig));
        }
        return this.circuits.get(name);
    }
    getAllStats() {
        const stats = new Map();
        for (const [name, circuit] of this.circuits.entries()) {
            stats.set(name, circuit.getStats());
        }
        return stats;
    }
    reset(name) {
        const circuit = this.circuits.get(name);
        if (circuit)
            circuit.reset();
    }
    resetAll() {
        for (const circuit of this.circuits.values()) {
            circuit.reset();
        }
    }
}
// Global registry instance
export const circuitBreakerRegistry = new CircuitBreakerRegistry();
//# sourceMappingURL=circuit-breaker.js.map