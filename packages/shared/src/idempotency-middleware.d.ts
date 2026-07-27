/**
 * Idempotency Middleware for Commands
 * Ensures that sensitive commands (policy issuance, cancellation, endorsements) are executed only once
 * even if the request is retried multiple times.
 */
import { Request, Response, NextFunction } from 'express';
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
export declare function idempotencyMiddleware(options?: IdempotencyOptions): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
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
export declare function Idempotent(options?: IdempotencyOptions): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
/**
 * Utility to check if a request is a replay
 */
export declare function isReplayRequest(req: Request): boolean;
/**
 * Utility to extract idempotency key from request
 */
export declare function getIdempotencyKey(req: Request, headerName?: string): string | null;
/**
 * Clear idempotency cache (useful for testing or manual invalidation)
 */
export declare function clearIdempotencyCache(): void;
/**
 * Get idempotency cache statistics
 */
export declare function getIdempotencyCacheStats(): {
    size: number;
    keys: string[];
};
