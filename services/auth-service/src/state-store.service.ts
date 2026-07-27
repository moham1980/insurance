import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import * as crypto from 'crypto';

export interface AuthState {
  redirectUri?: string;
  nonce?: string;
  codeVerifier?: string;
  providerId?: string;
  flowType?: 'oidc' | 'saml' | 'oauth2';
  clientState?: string;
  createdAt: number;
}

@Injectable()
export class StateStoreService {
  private readonly logger = new Logger(StateStoreService.name);
  private readonly redis: Redis | null = null;
  private readonly memory = new Map<string, AuthState>();
  private readonly ttlMs: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.ttlMs = parseInt(process.env.OIDC_STATE_TTL_MS || '600000', 10);
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
      } catch (err) {
        this.logger.warn('Failed to create Redis client for state store, using in-memory fallback', (err as Error).message);
      }
    }

    // Clean up in-memory expired entries every 60 seconds
    this.cleanupInterval = setInterval(() => this.cleanupMemory(), 60000);
  }

  generatePkce(): { codeVerifier: string; codeChallenge: string; codeChallengeMethod: string } {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    return { codeVerifier, codeChallenge, codeChallengeMethod: 'S256' };
  }

  generateState(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  generateNonce(): string {
    return crypto.randomBytes(16).toString('base64url');
  }

  async save(state: string, data: Omit<AuthState, 'createdAt'>): Promise<void> {
    const payload: AuthState = { ...data, createdAt: Date.now() };
    if (this.redis) {
      await this.redis.setex(`oidc_state:${state}`, Math.ceil(this.ttlMs / 1000), JSON.stringify(payload));
    } else {
      this.memory.set(state, payload);
    }
  }

  async validate(state: string, redirectUri?: string, providerId?: string): Promise<AuthState | null> {
    let payload: AuthState | null = null;
    if (this.redis) {
      const raw = await this.redis.get(`oidc_state:${state}`);
      if (raw) {
        try {
          payload = JSON.parse(raw);
        } catch {
          payload = null;
        }
      }
    } else {
      payload = this.memory.get(state) || null;
    }

    if (!payload) return null;

    if (Date.now() - payload.createdAt > this.ttlMs) {
      await this.delete(state);
      return null;
    }

    if (redirectUri && payload.redirectUri !== redirectUri) {
      return null;
    }

    if (providerId && payload.providerId !== providerId) {
      return null;
    }

    // Single-use: delete on validation
    await this.delete(state);
    return payload;
  }

  async delete(state: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(`oidc_state:${state}`);
    } else {
      this.memory.delete(state);
    }
  }

  private cleanupMemory(): void {
    const now = Date.now();
    for (const [key, value] of this.memory.entries()) {
      if (now - value.createdAt > this.ttlMs) {
        this.memory.delete(key);
      }
    }
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
  }
}
