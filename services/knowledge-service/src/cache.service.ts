import { Injectable } from '@nestjs/common';

/**
 * Simple in-memory cache with per-entry TTL.
 * Used for knowledge articles to reduce database load.
 *
 * Pattern follows the existing catalog-bff cache implementation.
 */
@Injectable()
export class CacheService {
  private store = new Map<string, { data: any; expiresAt: number }>();

  /**
   * Retrieve a cached value if present and not expired.
   * Returns null on miss or expiry (expired entries are evicted lazily).
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.data as T;
    }
    if (entry) this.store.delete(key);
    return null;
  }

  /**
   * Store a value with a TTL (in milliseconds).
   * If ttl is omitted, defaults to 5 minutes (300000 ms).
   */
  set(key: string, value: any, ttlMs?: number): void {
    const ttl = ttlMs ?? parseInt(process.env.KNOWLEDGE_CACHE_TTL_MS || '300000', 10);
    this.store.set(key, { data: value, expiresAt: Date.now() + ttl });
  }

  /**
   * Invalidate a single cache entry, or all entries matching a prefix
   * (when prefix is provided), or the entire cache (when prefix is omitted).
   */
  invalidate(keyOrPrefix?: string): void {
    if (!keyOrPrefix) {
      this.store.clear();
      return;
    }
    // Exact match removal
    if (this.store.has(keyOrPrefix)) {
      this.store.delete(keyOrPrefix);
      return;
    }
    // Prefix-based removal
    for (const k of this.store.keys()) {
      if (k.startsWith(keyOrPrefix)) this.store.delete(k);
    }
  }
}
