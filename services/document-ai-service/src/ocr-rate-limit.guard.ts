import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Rate limit guard for OCR extract endpoint.
 * Limits per-identity (userId or IP) requests within a sliding window.
 */
@Injectable()
export class OcrRateLimitGuard implements CanActivate {
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor() {
    this.maxRequests = parseInt(process.env.OCR_RATE_LIMIT_MAX || '10', 10);
    this.windowMs = parseInt(process.env.OCR_RATE_LIMIT_WINDOW_MS || '60000', 10);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userId = request?.user?.userId || request?.user?.sub;
    const tenantId = request?.user?.tenantId || 'unknown';
    const ip = request?.ip || request?.socket?.remoteAddress || 'unknown';
    const identity = userId ? `user:${userId}` : `ip:${ip}`;
    const key = `ocr:${tenantId}:${identity}`;

    const now = Date.now();
    this.cleanupExpired(now);

    const entry = this.store.get(key);
    if (!entry || now > entry.resetTime) {
      this.store.set(key, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    entry.count++;
    if (entry.count > this.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      throw new HttpException({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `OCR extract rate limit exceeded. Max ${this.maxRequests} requests per ${this.windowMs / 1000}s.`,
          retryAfter,
        },
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }

  private cleanupExpired(now: number): void {
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}
