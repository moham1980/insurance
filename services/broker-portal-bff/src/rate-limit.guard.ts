import { CanActivate, ExecutionContext, Injectable, HttpStatus, HttpException, Logger } from '@nestjs/common';

interface RateBucket {
  count: number;
  windowStart: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly buckets = new Map<string, RateBucket>();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.maxRequests = parseInt(process.env.BFF_RATE_LIMIT_MAX || '500', 10);
    this.windowMs = parseInt(process.env.BFF_RATE_LIMIT_WINDOW_MS || String(60 * 1000), 10);
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private getKey(request: any): string {
    const user = request?.user;
    if (user?.sub || user?.userId) {
      return `user:${user.sub || user.userId}`;
    }
    const ip = request?.ip || request?.headers?.['x-forwarded-for'] || request?.socket?.remoteAddress || 'unknown';
    return `ip:${ip}`;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.windowStart > this.windowMs * 2) {
        this.buckets.delete(key);
      }
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = this.getKey(request);
    const now = Date.now();

    let bucket = this.buckets.get(key);
    if (!bucket || now - bucket.windowStart > this.windowMs) {
      bucket = { count: 0, windowStart: now };
      this.buckets.set(key, bucket);
    }

    bucket.count++;

    if (bucket.count > this.maxRequests) {
      const retryAfter = Math.ceil((bucket.windowStart + this.windowMs - now) / 1000);
      this.logger.warn(`Rate limit exceeded for ${key}: ${bucket.count}/${this.maxRequests} requests in window`);
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded. Max ${this.maxRequests} requests per ${this.windowMs / 1000}s window.`,
            retryAfter,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
