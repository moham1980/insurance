import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Rate limit guard for OTP send endpoint.
 * Limits to max 3 OTP requests per phone number per hour.
 * Uses in-memory store with sliding window.
 */
@Injectable()
export class OtpRateLimitGuard implements CanActivate {
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor() {
    this.maxRequests = parseInt(process.env.OTP_RATE_LIMIT_MAX || '3', 10);
    this.windowMs = parseInt(process.env.OTP_RATE_LIMIT_WINDOW_MS || '3600000', 10); // 1 hour
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const body = request?.body || {};
    const recipient = body.recipient || body.phoneNumber;

    if (!recipient) {
      return true; // Let the controller handle missing recipient validation
    }

    const tenantId = request?.tenantId || request?.user?.tenantId || 'unknown';
    const key = `otp:${tenantId}:${recipient}`;

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
          code: 'OTP_RATE_LIMIT_EXCEEDED',
          message: `OTP rate limit exceeded for ${recipient}. Max ${this.maxRequests} OTP requests per hour.`,
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
