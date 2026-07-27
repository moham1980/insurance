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

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Number of successes to close circuit
  timeoutMs: number; // Time to stay in OPEN state
  resetTimeoutMs: number; // Time before attempting HALF_OPEN
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextAttemptTime?: Date;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private nextAttemptTime?: Date;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
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
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.successCount++;
    this.lastSuccessTime = new Date();

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
      }
    } else if (this.state === CircuitState.CLOSED) {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = new Date(Date.now() + this.config.resetTimeoutMs);
    } else if (this.state === CircuitState.CLOSED) {
      if (this.failureCount >= this.config.failureThreshold) {
        this.state = CircuitState.OPEN;
        this.nextAttemptTime = new Date(Date.now() + this.config.resetTimeoutMs);
      }
    }
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  reset(): void {
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
  private circuits: Map<string, CircuitBreaker> = new Map();

  get(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
    if (!this.circuits.has(name)) {
      const defaultConfig: CircuitBreakerConfig = {
        failureThreshold: 5,
        successThreshold: 2,
        timeoutMs: 30000,
        resetTimeoutMs: 60000,
      };
      this.circuits.set(name, new CircuitBreaker(config || defaultConfig));
    }
    return this.circuits.get(name)!;
  }

  getAllStats(): Map<string, CircuitBreakerStats> {
    const stats = new Map<string, CircuitBreakerStats>();
    for (const [name, circuit] of this.circuits.entries()) {
      stats.set(name, circuit.getStats());
    }
    return stats;
  }

  reset(name: string): void {
    const circuit = this.circuits.get(name);
    if (circuit) circuit.reset();
  }

  resetAll(): void {
    for (const circuit of this.circuits.values()) {
      circuit.reset();
    }
  }
}

// Global registry instance
export const circuitBreakerRegistry = new CircuitBreakerRegistry();
