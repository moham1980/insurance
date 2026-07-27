/**
 * Idempotency Middleware for Commands
 * Ensures that sensitive commands (policy issuance, cancellation, endorsements) are executed only once
 * even if the request is retried multiple times.
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

export interface IdempotencyOptions {
  /** Header name for idempotency key (default: 'Idempotency-Key') */
  headerName?: string;
  /** How long to cache idempotency results in seconds (default: 86400 = 24 hours) */
  ttl?: number;
  /** Whether to use a persistent store (default: true) */
  persistent?: boolean;
  /** Custom key generator function */
  keyGenerator?: (req: Request) => string | null;
}

export interface IdempotencyResult {
  status: 'success' | 'conflict' | 'error';
  data?: any;
  cached?: boolean;
  key?: string;
}

interface IdempotencyStore {
  set(key: string, data: any, ttl: number): Promise<void> | void;
  get(key: string): Promise<any | null> | any | null;
  has(key: string): Promise<boolean> | boolean;
  clear(): Promise<void> | void;
}

/**
 * In-memory cache for idempotency results (fallback when Redis unavailable)
 */
class InMemoryIdempotencyStore implements IdempotencyStore {
  private cache: Map<string, { data: any; expiresAt: number }> = new Map();

  set(key: string, data: any, ttl: number): void {
    const expiresAt = Date.now() + ttl * 1000;
    this.cache.set(key, { data, expiresAt });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Redis-backed cache for idempotency results (production-ready)
 */
class RedisIdempotencyStore implements IdempotencyStore {
  private redis: Redis;
  private prefix: string;

  constructor(redisUrl: string, prefix = 'idempotency:') {
    this.redis = new Redis(redisUrl, { maxRetriesPerRequest: 3, lazyConnect: true });
    this.prefix = prefix;
  }

  async set(key: string, data: any, ttl: number): Promise<void> {
    await this.redis.setex(`${this.prefix}${key}`, ttl, JSON.stringify(data));
  }

  async get(key: string): Promise<any | null> {
    const value = await this.redis.get(`${this.prefix}${key}`);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  async has(key: string): Promise<boolean> {
    const result = await this.redis.exists(`${this.prefix}${key}`);
    return result === 1;
  }

  async clear(): Promise<void> {
    const keys = await this.redis.keys(`${this.prefix}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

function createIdempotencyStore(): IdempotencyStore {
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST;
  if (typeof redisUrl === 'string' && redisUrl.length > 0) {
    try {
      return new RedisIdempotencyStore(redisUrl);
    } catch {
      // Fallback to in-memory if Redis connection fails
    }
  }
  const memStore = new InMemoryIdempotencyStore();
  // Clean up expired entries every 5 minutes
  setInterval(() => {
    memStore.cleanup();
  }, 5 * 60 * 1000);
  return memStore;
}

const globalStore: IdempotencyStore = createIdempotencyStore();

/**
 * Default key generator: extracts idempotency key from header
 */
function defaultKeyGenerator(req: Request): string | null {
  const headerName = 'idempotency-key';
  const key = req.headers[headerName.toLowerCase()] || req.headers[headerName];
  
  if (typeof key === 'string' && key.length > 0) {
    return key;
  }
  
  return null;
}

/**
 * Generate a composite key from request method and path + idempotency key
 */
function generateCompositeKey(req: Request, idempotencyKey: string): string {
  const method = req.method.toLowerCase();
  const path = req.path;
  const userId = (req as any)?.user?.userId || 'anonymous';
  return `${method}:${path}:${userId}:${idempotencyKey}`;
}

/**
 * Idempotency middleware factory
 * 
 * Usage:
 * ```typescript
 * app.post('/policies', idempotencyMiddleware(), async (req, res) => {
 *   const result = await issuePolicy(req.body);
 *   res.json(result);
 * });
 * ```
 */
export function idempotencyMiddleware(options: IdempotencyOptions = {}) {
  const {
    headerName = 'idempotency-key',
    ttl = 86400, // 24 hours
    persistent = true,
    keyGenerator = defaultKeyGenerator,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    const idempotencyKey = keyGenerator(req);

    if (!idempotencyKey) {
      // No idempotency key provided, proceed without idempotency
      return next();
    }

    const compositeKey = generateCompositeKey(req, idempotencyKey);

    // Check if this request was already processed
    const cachedResult = await globalStore.get(compositeKey);
    if (cachedResult) {
      // Return cached result with 208 Already Reported status
      res.status(208);
      res.setHeader('X-Idempotency-Key', idempotencyKey);
      res.setHeader('X-Idempotency-Replayed', 'true');
      return res.json(cachedResult);
    }

    // Store original res.json to intercept the response
    const originalJson = res.json.bind(res);
    const responseCache: any[] = [];

    res.json = function (data: any) {
      responseCache.push(data);
      return originalJson(data);
    };

    // Hook into response finish to cache the result
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300 && responseCache.length > 0) {
        // Cache successful response
        Promise.resolve(globalStore.set(compositeKey, responseCache[0], ttl)).catch(() => {});
      }
    });

    next();
  };
}

/**
 * Decorator for NestJS controllers/methods to enable idempotency
 *
 * Usage:
 * ```typescript
 * @Post('/policies')
 * @Idempotent({ ttl: 3600 })
 * async createPolicy(@Body() dto: CreatePolicyDto) {
 *   return await this.policyService.create(dto);
 * }
 * ```
 */
export function Idempotent(options: IdempotencyOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Extract request from args (first argument for NestJS controllers)
      const req = args[0];

      const {
        ttl = 86400,
        keyGenerator = defaultKeyGenerator,
      } = options;

      const idempotencyKey = keyGenerator(req);

      if (!idempotencyKey) {
        return originalMethod.apply(this, args);
      }

      const compositeKey = generateCompositeKey(req, idempotencyKey);
      const cachedResult = await globalStore.get(compositeKey);

      if (cachedResult) {
        return cachedResult;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Cache successful result
      if (result) {
        await globalStore.set(compositeKey, result, ttl);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Utility to check if a request is a replay
 */
export function isReplayRequest(req: Request): boolean {
  return req.headers['x-idempotency-replayed'] === 'true';
}

/**
 * Utility to extract idempotency key from request
 */
export function getIdempotencyKey(req: Request, headerName: string = 'idempotency-key'): string | null {
  const key = req.headers[headerName.toLowerCase()] || req.headers[headerName];
  return typeof key === 'string' && key.length > 0 ? key : null;
}

/**
 * Clear idempotency cache (useful for testing or manual invalidation)
 */
export function clearIdempotencyCache(): void {
  globalStore.clear();
}

/**
 * Get idempotency cache statistics
 */
export function getIdempotencyCacheStats(): {
  size: number;
  keys: string[];
} {
  if (globalStore instanceof InMemoryIdempotencyStore) {
    return {
      size: (globalStore as any).cache?.size || 0,
      keys: Array.from((globalStore as any).cache?.keys() || []),
    };
  }
  return { size: -1, keys: [] };
}
