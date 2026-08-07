import { Injectable, Logger } from '@nestjs/common';

// P2 #11: DistributedCacheService — uses Redis if REDIS_URL is set, otherwise
// falls back to an in-memory cache (the existing pattern).
//
// TODO: When the `redis` (or `ioredis`) npm package is installed, uncomment the
// Redis-backed implementation below and remove the in-memory fallback. The
// interface (get/set/invalidate) remains the same so callers do not need
// changes.
//
// Install with:  npm install redis
// Then set env:   REDIS_URL=redis://localhost:6379

export interface ICacheService {
  get<T>(key: string): T | null;
  set(key: string, value: any, ttlMs?: number): void;
  invalidate(key?: string): void;
}

@Injectable()
export class DistributedCacheService implements ICacheService {
  private readonly logger = new Logger(DistributedCacheService.name);
  private readonly redisUrl = process.env.REDIS_URL || '';
  private readonly cache = new Map<string, { data: any; expiresAt: number }>();
  private readonly defaultTtlMs = parseInt(process.env.CATALOG_CACHE_TTL_MS || '60000', 10);

  // TODO: Redis integration — uncomment when `redis` package is installed:
  // private redisClient: any = null;
  //
  // async onModuleInit() {
  //   if (this.redisUrl) {
  //     const { createClient } = await import('redis');
  //     this.redisClient = createClient({ url: this.redisUrl });
  //     this.redisClient.on('error', (err: Error) => {
  //       this.logger.error('Redis cache error', err);
  //     });
  //     await this.redisClient.connect();
  //     this.logger.log('DistributedCacheService: connected to Redis');
  //   }
  // }
  //
  // async get<T>(key: string): Promise<T | null> {
  //   if (this.redisClient) {
  //     const raw = await this.redisClient.get(key);
  //     if (!raw) return null;
  //     try { return JSON.parse(raw) as T; } catch { return null; }
  //   }
  //   return this.getInMemory<T>(key);
  // }
  //
  // async set(key: string, value: any, ttlMs?: number): Promise<void> {
  //   if (this.redisClient) {
  //     const ttl = ttlMs ?? this.defaultTtlMs;
  //     await this.redisClient.setEx(key, Math.ceil(ttl / 1000), JSON.stringify(value));
  //     return;
  //   }
  //   this.setInMemory(key, value, ttlMs);
  // }
  //
  // async invalidate(key?: string): Promise<void> {
  //   if (this.redisClient) {
  //     if (key) { await this.redisClient.del(key); }
  //     else { /* flush namespace — requires key prefix strategy */ }
  //     return;
  //   }
  //   this.invalidateInMemory(key);
  // }

  get<T>(key: string): T | null {
    return this.getInMemory<T>(key);
  }

  set(key: string, value: any, ttlMs?: number): void {
    this.setInMemory(key, value, ttlMs);
  }

  invalidate(key?: string): void {
    this.invalidateInMemory(key);
  }

  // ── In-memory fallback (same logic as the original CatalogService cache) ──

  private getInMemory<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.data as T;
    }
    if (entry) this.cache.delete(key);
    return null;
  }

  private setInMemory(key: string, data: any, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTtlMs;
    this.cache.set(key, { data, expiresAt: Date.now() + ttl });
  }

  private invalidateInMemory(prefix?: string): void {
    if (!prefix) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) this.cache.delete(key);
    }
  }
}
