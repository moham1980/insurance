import { Redis } from 'ioredis';

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

interface PersistedState {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureAt: string | null;
  lastSuccessAt: string | null;
  openedAt: string | null;
  halfOpenCalls: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureAt: Date | null = null;
  private lastSuccessAt: Date | null = null;
  private openedAt: Date | null = null;
  private halfOpenCalls: number = 0;
  private redis: Redis | null = null;
  private readonly redisKey: string;

  constructor(private readonly config: CircuitBreakerConfig, name = 'sanhab') {
    this.redisKey = `circuit-breaker:${name}`;
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, { maxRetriesPerRequest: 3, lazyConnect: true });
      } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error(`Failed to initialize Redis for circuit breaker: ${error.message}`);
      }
    }
    // Load persisted state asynchronously (best-effort)
    this.loadState().catch(() => {});
  }

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
    this.saveState().catch(() => {});
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.successCount++;
    this.lastSuccessAt = new Date();

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenCalls++;
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        this.transitionToClosed();
      } else {
        this.saveState().catch(() => {});
      }
    } else {
      this.saveState().catch(() => {});
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureAt = new Date();

    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionToOpen();
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.transitionToOpen();
    } else {
      this.saveState().catch(() => {});
    }
  }

  private transitionToOpen(): void {
    this.state = CircuitState.OPEN;
    this.openedAt = new Date();
    this.halfOpenCalls = 0;
    this.saveState().catch(() => {});
  }

  private transitionToClosed(): void {
    this.state = CircuitState.CLOSED;
    this.openedAt = null;
    this.failureCount = 0;
    this.halfOpenCalls = 0;
    this.saveState().catch(() => {});
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureAt = null;
    this.lastSuccessAt = null;
    this.openedAt = null;
    this.halfOpenCalls = 0;
    this.saveState().catch(() => {});
  }

  private async saveState(): Promise<void> {
    if (!this.redis) return;
    const state: PersistedState = {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureAt: this.lastFailureAt?.toISOString() || null,
      lastSuccessAt: this.lastSuccessAt?.toISOString() || null,
      openedAt: this.openedAt?.toISOString() || null,
      halfOpenCalls: this.halfOpenCalls,
    };
    try {
      await this.redis.set(this.redisKey, JSON.stringify(state), 'EX', 60 * 60 * 24);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error(`Failed to persist circuit breaker state: ${error.message}`);
    }
  }

  private async loadState(): Promise<void> {
    if (!this.redis) return;
    try {
      const raw = await this.redis.get(this.redisKey);
      if (!raw) return;
      const state = JSON.parse(raw) as PersistedState;
      this.state = state.state ?? CircuitState.CLOSED;
      this.failureCount = state.failureCount ?? 0;
      this.successCount = state.successCount ?? 0;
      this.lastFailureAt = state.lastFailureAt ? new Date(state.lastFailureAt) : null;
      this.lastSuccessAt = state.lastSuccessAt ? new Date(state.lastSuccessAt) : null;
      this.openedAt = state.openedAt ? new Date(state.openedAt) : null;
      this.halfOpenCalls = state.halfOpenCalls ?? 0;
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error(`Failed to load circuit breaker state: ${error.message}`);
    }
  }
}
