import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

interface CachedResponse {
  statusCode: number;
  body: any;
  expiresAt: number;
}

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);
  private readonly ttlSeconds: number;
  private readonly memory = new Map<string, CachedResponse>();
  private readonly redis?: Redis;

  constructor() {
    this.ttlSeconds = Math.max(1, parseInt(process.env.IDEMPOTENCY_TTL_SECONDS || '86400', 10));
    const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST;
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
      } catch (err: any) {
        this.logger.warn(`Redis idempotency store unavailable, falling back to memory: ${err.message}`);
      }
    }
    const cleanupTimer = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    if (typeof cleanupTimer.unref === 'function') {
      cleanupTimer.unref();
    }
  }

  buildKey(scope: string, tenantId: string, userId: string, idempotencyKey: string, path: string): string {
    return `idempotency:${scope}:${tenantId}:${userId}:${path}:${idempotencyKey}`;
  }

  async get(key: string): Promise<CachedResponse | null> {
    let cached: CachedResponse | null = null;
    if (this.redis) {
      const value = await this.redis.get(key).catch((err: any) => {
        this.logger.warn(`Redis get failed, falling back to memory: ${err.message}`);
        return null;
      });
      if (value) {
        try {
          cached = JSON.parse(value);
        } catch {
          return null;
        }
      }
    } else {
      cached = this.memory.get(key) ?? null;
    }

    if (!cached) return null;
    if (Date.now() > cached.expiresAt) {
      await this.delete(key);
      return null;
    }
    return cached;
  }

  async set(key: string, statusCode: number, body: any): Promise<void> {
    const record: CachedResponse = {
      statusCode,
      body,
      expiresAt: Date.now() + this.ttlSeconds * 1000,
    };

    if (this.redis) {
      try {
        await this.redis.setex(key, this.ttlSeconds, JSON.stringify(record));
        return;
      } catch (err: any) {
        this.logger.warn(`Redis set failed, falling back to memory: ${err.message}`);
      }
    }
    this.memory.set(key, record);
  }

  private async delete(key: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(key).catch(() => {});
    } else {
      this.memory.delete(key);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.memory.entries()) {
      if (now > value.expiresAt) {
        this.memory.delete(key);
      }
    }
  }
}
