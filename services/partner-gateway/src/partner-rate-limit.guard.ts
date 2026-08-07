import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';

/**
 * Guard that enforces per-partner rate limits on sensitive endpoints
 * (token-exchange, validate-access) using RateLimitService.
 *
 * The rate limit key is derived from the request body's `partnerId` (for
 * token-exchange) or `certSubject` (for validate-access), falling back to the
 * `x-partner-id` header and finally the client IP. Each endpoint is tracked
 * independently so that a limit on token-exchange does not affect
 * validate-access.
 *
 * Default limit: 10 requests per minute per partner (configurable via
 * PARTNER_RATE_LIMIT_PER_MINUTE env var).
 */
@Injectable()
export class PartnerRateLimitGuard implements CanActivate {
  private readonly defaultLimit: number;

  constructor(private readonly rateLimitService: RateLimitService) {
    this.defaultLimit = parseInt(process.env.PARTNER_RATE_LIMIT_PER_MINUTE || '10', 10);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const endpoint = (request.url || request.routerPath || '').split('?')[0];

    // Resolve a stable identity for the rate-limit key.
    const partnerId =
      request.body?.partnerId ||
      request.headers['x-partner-id'] ||
      request.body?.certSubject ||
      request.ip;

    if (!partnerId || typeof partnerId !== 'string') {
      return true;
    }

    const key = `${partnerId}:${endpoint}`;
    this.rateLimitService.checkRateLimitPerMinute(key, this.defaultLimit);
    return true;
  }
}
