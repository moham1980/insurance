import { Logger } from '@nestjs/common';

export type CircuitState = 'closed' | 'open' | 'half_open';

interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxCalls: number;
}

interface CircuitBreakerEntry {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  openedAt: number;
  halfOpenCalls: number;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5', 10),
  resetTimeoutMs: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT_MS || '60000', 10),
  halfOpenMaxCalls: parseInt(process.env.CIRCUIT_BREAKER_HALF_OPEN_MAX_CALLS || '3', 10),
};

/**
 * CircuitBreaker — Per-key circuit breaker for model endpoint calls.
 *
 * States:
 * - closed:   All calls pass through. Failures increment failureCount.
 * - open:     All calls fail immediately. After resetTimeoutMs, transitions to half_open.
 * - half_open: Limited calls allowed. If all succeed, closes. If any fail, re-opens.
 */
export class CircuitBreaker {
  private readonly logger: Logger;
  private readonly options: CircuitBreakerOptions;
  private readonly breakers = new Map<string, CircuitBreakerEntry>();

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.logger = new Logger('CircuitBreaker');
  }

  getState(key: string): CircuitState {
    const entry = this.breakers.get(key);
    if (!entry) return 'closed';
    this.checkTransition(key, entry);
    return entry.state;
  }

  canCall(key: string): boolean {
    let entry = this.breakers.get(key);
    if (!entry) {
      entry = { state: 'closed', failureCount: 0, successCount: 0, lastFailureTime: 0, openedAt: 0, halfOpenCalls: 0 };
      this.breakers.set(key, entry);
    }

    this.checkTransition(key, entry);

    if (entry.state === 'closed') return true;
    if (entry.state === 'open') return false;
    // half_open: allow limited calls
    if (entry.halfOpenCalls < this.options.halfOpenMaxCalls) {
      entry.halfOpenCalls++;
      return true;
    }
    return false;
  }

  recordSuccess(key: string): void {
    const entry = this.breakers.get(key);
    if (!entry) return;

    if (entry.state === 'half_open') {
      entry.successCount++;
      if (entry.successCount >= this.options.halfOpenMaxCalls) {
        entry.state = 'closed';
        entry.failureCount = 0;
        entry.successCount = 0;
        entry.halfOpenCalls = 0;
        this.logger.log(`Circuit CLOSED for ${key} — recovered after ${this.options.halfOpenMaxCalls} successful half-open calls`);
      }
    } else if (entry.state === 'closed') {
      entry.failureCount = 0;
    }
  }

  recordFailure(key: string): void {
    const entry = this.breakers.get(key);
    if (!entry) {
      this.breakers.set(key, {
        state: 'closed',
        failureCount: 1,
        successCount: 0,
        lastFailureTime: Date.now(),
        openedAt: 0,
        halfOpenCalls: 0,
      });
      return;
    }

    entry.lastFailureTime = Date.now();
    entry.failureCount++;

    if (entry.state === 'half_open') {
      entry.state = 'open';
      entry.openedAt = Date.now();
      entry.halfOpenCalls = 0;
      entry.successCount = 0;
      this.logger.warn(`Circuit re-OPENED for ${key} — failure during half-open state`);
    } else if (entry.state === 'closed' && entry.failureCount >= this.options.failureThreshold) {
      entry.state = 'open';
      entry.openedAt = Date.now();
      this.logger.warn(`Circuit OPENED for ${key} — ${entry.failureCount} failures exceeded threshold ${this.options.failureThreshold}`);
    }
  }

  private checkTransition(key: string, entry: CircuitBreakerEntry): void {
    if (entry.state === 'open') {
      const elapsed = Date.now() - entry.openedAt;
      if (elapsed >= this.options.resetTimeoutMs) {
        entry.state = 'half_open';
        entry.halfOpenCalls = 0;
        entry.successCount = 0;
        this.logger.log(`Circuit HALF-OPEN for ${key} — testing after ${this.options.resetTimeoutMs}ms cooldown`);
      }
    }
  }

  getStats(key: string): { state: CircuitState; failureCount: number; successCount: number } | null {
    const entry = this.breakers.get(key);
    if (!entry) return null;
    this.checkTransition(key, entry);
    return { state: entry.state, failureCount: entry.failureCount, successCount: entry.successCount };
  }

  reset(key: string): void {
    this.breakers.delete(key);
  }
}
