/**
 * Idempotency Middleware for Commands
 * Ensures that sensitive commands (policy issuance, cancellation, endorsements) are executed only once
 * even if the request is retried multiple times.
 */
/**
 * Simple in-memory cache for idempotency results
 * In production, this should be replaced with Redis or a database
 */
class IdempotencyCache {
    cache = new Map();
    set(key, data, ttl) {
        const expiresAt = Date.now() + ttl * 1000;
        this.cache.set(key, { data, expiresAt });
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    has(key) {
        return this.get(key) !== null;
    }
    clear() {
        this.cache.clear();
    }
    // Clean up expired entries
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }
}
const globalCache = new IdempotencyCache();
// Clean up expired entries every 5 minutes
setInterval(() => {
    globalCache.cleanup();
}, 5 * 60 * 1000);
/**
 * Default key generator: extracts idempotency key from header
 */
function defaultKeyGenerator(req) {
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
function generateCompositeKey(req, idempotencyKey) {
    const method = req.method.toLowerCase();
    const path = req.path;
    const userId = req?.user?.userId || 'anonymous';
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
export function idempotencyMiddleware(options = {}) {
    const { headerName = 'idempotency-key', ttl = 86400, // 24 hours
    persistent = true, keyGenerator = defaultKeyGenerator, } = options;
    return (req, res, next) => {
        const idempotencyKey = keyGenerator(req);
        if (!idempotencyKey) {
            // No idempotency key provided, proceed without idempotency
            return next();
        }
        const compositeKey = generateCompositeKey(req, idempotencyKey);
        // Check if this request was already processed
        const cachedResult = globalCache.get(compositeKey);
        if (cachedResult) {
            // Return cached result with 208 Already Reported status
            res.status(208);
            res.setHeader('X-Idempotency-Key', idempotencyKey);
            res.setHeader('X-Idempotency-Replayed', 'true');
            return res.json(cachedResult);
        }
        // Store original res.json to intercept the response
        const originalJson = res.json;
        const responseCache = [];
        res.json = function (data) {
            responseCache.push(data);
            return originalJson.call(this, data);
        };
        // Hook into response finish to cache the result
        res.on('finish', () => {
            if (res.statusCode >= 200 && res.statusCode < 300 && responseCache.length > 0) {
                // Cache successful response
                globalCache.set(compositeKey, responseCache[0], ttl);
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
export function Idempotent(options = {}) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            // Extract request from args (first argument for NestJS controllers)
            const req = args[0];
            const res = args[1];
            const next = args[2];
            const { headerName = 'idempotency-key', ttl = 86400, keyGenerator = defaultKeyGenerator, } = options;
            const idempotencyKey = keyGenerator(req);
            if (!idempotencyKey) {
                return originalMethod.apply(this, args);
            }
            const compositeKey = generateCompositeKey(req, idempotencyKey);
            const cachedResult = globalCache.get(compositeKey);
            if (cachedResult) {
                return cachedResult;
            }
            // Execute original method
            const result = await originalMethod.apply(this, args);
            // Cache successful result
            if (result) {
                globalCache.set(compositeKey, result, ttl);
            }
            return result;
        };
        return descriptor;
    };
}
/**
 * Utility to check if a request is a replay
 */
export function isReplayRequest(req) {
    return req.headers['x-idempotency-replayed'] === 'true';
}
/**
 * Utility to extract idempotency key from request
 */
export function getIdempotencyKey(req, headerName = 'idempotency-key') {
    const key = req.headers[headerName.toLowerCase()] || req.headers[headerName];
    return typeof key === 'string' && key.length > 0 ? key : null;
}
/**
 * Clear idempotency cache (useful for testing or manual invalidation)
 */
export function clearIdempotencyCache() {
    globalCache.clear();
}
/**
 * Get idempotency cache statistics
 */
export function getIdempotencyCacheStats() {
    return {
        size: globalCache['cache'].size,
        keys: Array.from(globalCache['cache'].keys()),
    };
}
//# sourceMappingURL=idempotency-middleware.js.map