import { Injectable, CanActivate, ExecutionContext, HttpStatus, HttpException } from '@nestjs/common';

// P2 #1: Rate limiting guard for bulk operations — max 10 bulk requests per minute per client.
@Injectable()
export class BulkRateLimitGuard implements CanActivate {
  private requests = new Map<string, number[]>();
  private readonly maxRequests = 10;
  private readonly windowMs = 60_000;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = request?.user?.userId || request?.ip || 'anonymous';
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    const recent = timestamps.filter((t) => now - t < this.windowMs);
    if (recent.length >= this.maxRequests) {
      throw new HttpException(
        { success: false, error: { code: 'RATE_LIMITED', message: 'Bulk request rate limit exceeded (10/min)' } },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recent.push(now);
    this.requests.set(key, recent);
    return true;
  }
}
