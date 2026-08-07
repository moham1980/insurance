import { Injectable, Logger, ForbiddenException } from '@nestjs/common';

interface RateLimitEntry {
  count: number;
  windowStart: number;
  lastRequest: number;
}

interface PartnerRateLimitConfig {
  partnerId: string;
  rps: number;
  burst: number;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly limitMap = new Map<string, RateLimitEntry>();
  private readonly minuteLimitMap = new Map<string, RateLimitEntry>();
  private readonly configMap = new Map<string, PartnerRateLimitConfig>();
  private readonly WINDOW_MS = 1000;
  private readonly MINUTE_WINDOW_MS = 60_000;

  configurePartner(partnerId: string, rps: number, burst: number = 0): void {
    this.configMap.set(partnerId, { partnerId, rps, burst: burst || rps });
  }

  checkRateLimit(partnerId: string): void {
    const config = this.configMap.get(partnerId);
    if (!config) {
      return;
    }

    const now = Date.now();
    let entry = this.limitMap.get(partnerId);

    if (!entry) {
      entry = { count: 0, windowStart: now, lastRequest: now };
      this.limitMap.set(partnerId, entry);
    }

    if (now - entry.windowStart > this.WINDOW_MS) {
      entry.count = 0;
      entry.windowStart = now;
    }

    entry.count++;
    entry.lastRequest = now;

    const effectiveLimit = config.burst > 0 ? config.burst : config.rps;
    if (entry.count > effectiveLimit) {
      this.logger.warn(
        `Rate limit exceeded for partner ${partnerId}: ${entry.count} requests in window (limit: ${effectiveLimit})`,
      );
      throw new ForbiddenException(
        `Rate limit exceeded for partner ${partnerId}: ${entry.count}/${effectiveLimit} requests per second`,
      );
    }
  }

  getRateLimitStatus(partnerId: string): { count: number; limit: number; remaining: number } | null {
    const config = this.configMap.get(partnerId);
    if (!config) return null;

    const entry = this.limitMap.get(partnerId);
    const currentCount = entry ? entry.count : 0;
    const limit = config.burst > 0 ? config.burst : config.rps;

    return {
      count: currentCount,
      limit,
      remaining: Math.max(0, limit - currentCount),
    };
  }

  /**
   * Per-minute rate limit check. Used by endpoints such as token-exchange and
   * validate-access that should be capped at a small number of requests per
   * minute per partner (e.g. 10/min). The key is a composite of partnerId and
   * endpoint so that limits are tracked independently per endpoint.
   */
  checkRateLimitPerMinute(key: string, maxPerMinute: number): void {
    const now = Date.now();
    let entry = this.minuteLimitMap.get(key);

    if (!entry) {
      entry = { count: 0, windowStart: now, lastRequest: now };
      this.minuteLimitMap.set(key, entry);
    }

    if (now - entry.windowStart > this.MINUTE_WINDOW_MS) {
      entry.count = 0;
      entry.windowStart = now;
    }

    entry.count++;
    entry.lastRequest = now;

    if (entry.count > maxPerMinute) {
      this.logger.warn(
        `Rate limit exceeded for ${key}: ${entry.count} requests in 60s window (limit: ${maxPerMinute})`,
      );
      throw new ForbiddenException(
        `Rate limit exceeded for ${key}: ${entry.count}/${maxPerMinute} requests per minute`,
      );
    }
  }

  resetPartner(partnerId: string): void {
    this.limitMap.delete(partnerId);
  }

  cleanupStaleEntries(maxAgeMs: number = 5 * 60 * 1000): void {
    const now = Date.now();
    for (const [partnerId, entry] of this.limitMap.entries()) {
      if (now - entry.lastRequest > maxAgeMs) {
        this.limitMap.delete(partnerId);
      }
    }
    for (const [key, entry] of this.minuteLimitMap.entries()) {
      if (now - entry.lastRequest > maxAgeMs) {
        this.minuteLimitMap.delete(key);
      }
    }
  }
}
