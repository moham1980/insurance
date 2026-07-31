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
  private readonly configMap = new Map<string, PartnerRateLimitConfig>();
  private readonly WINDOW_MS = 1000;

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
  }
}
