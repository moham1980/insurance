export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeoutMs: number;
  halfOpenMaxCalls: number;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureAt: Date | null;
  lastSuccessAt: Date | null;
  openedAt: Date | null;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureAt: Date | null = null;
  private lastSuccessAt: Date | null = null;
  private openedAt: Date | null = null;
  private halfOpenCalls: number = 0;

  constructor(private readonly config: CircuitBreakerConfig) {}

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureAt: this.lastFailureAt,
      lastSuccessAt: this.lastSuccessAt,
      openedAt: this.openedAt,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
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

  private shouldAttemptReset(): boolean {
    if (!this.openedAt) return false;
    const timeSinceOpen = Date.now() - this.openedAt.getTime();
    return timeSinceOpen >= this.config.timeoutMs;
  }

  private transitionToHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.halfOpenCalls = 0;
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.successCount++;
    this.lastSuccessAt = new Date();

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenCalls++;
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        this.transitionToClosed();
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureAt = new Date();

    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionToOpen();
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.transitionToOpen();
    }
  }

  private transitionToOpen(): void {
    this.state = CircuitState.OPEN;
    this.openedAt = new Date();
    this.halfOpenCalls = 0;
  }

  private transitionToClosed(): void {
    this.state = CircuitState.CLOSED;
    this.openedAt = null;
    this.failureCount = 0;
    this.halfOpenCalls = 0;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureAt = null;
    this.lastSuccessAt = null;
    this.openedAt = null;
    this.halfOpenCalls = 0;
  }
}
