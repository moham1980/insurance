import { RateLimitService } from '../src/rate-limit.service';
import { ForbiddenException } from '@nestjs/common';

describe('RateLimitService', () => {
  let service: RateLimitService;

  beforeEach(() => {
    service = new RateLimitService();
  });

  describe('configurePartner', () => {
    it('should configure a partner with rps and burst', () => {
      service.configurePartner('partner-1', 10, 15);
      const status = service.getRateLimitStatus('partner-1');
      expect(status).toBeDefined();
      expect(status!.limit).toBe(15);
    });

    it('should use rps as limit when burst is 0', () => {
      service.configurePartner('partner-2', 5, 0);
      const status = service.getRateLimitStatus('partner-2');
      expect(status!.limit).toBe(5);
    });
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', () => {
      service.configurePartner('partner-1', 10, 10);
      for (let i = 0; i < 10; i++) {
        expect(() => service.checkRateLimit('partner-1')).not.toThrow();
      }
    });

    it('should throw ForbiddenException when limit exceeded', () => {
      service.configurePartner('partner-1', 2, 2);
      service.checkRateLimit('partner-1');
      service.checkRateLimit('partner-1');
      expect(() => service.checkRateLimit('partner-1')).toThrow(ForbiddenException);
    });

    it('should not enforce limit for unconfigured partner', () => {
      expect(() => service.checkRateLimit('unknown-partner')).not.toThrow();
    });

    it('should reset count after window expires', async () => {
      service.configurePartner('partner-1', 1, 1);
      service.checkRateLimit('partner-1');
      expect(() => service.checkRateLimit('partner-1')).toThrow(ForbiddenException);

      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(() => service.checkRateLimit('partner-1')).not.toThrow();
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return null for unconfigured partner', () => {
      expect(service.getRateLimitStatus('unknown')).toBeNull();
    });

    it('should return remaining count', () => {
      service.configurePartner('partner-1', 10, 10);
      service.checkRateLimit('partner-1');
      service.checkRateLimit('partner-1');
      const status = service.getRateLimitStatus('partner-1');
      expect(status!.count).toBe(2);
      expect(status!.remaining).toBe(8);
    });
  });

  describe('resetPartner', () => {
    it('should reset rate limit state for a partner', () => {
      service.configurePartner('partner-1', 1, 1);
      service.checkRateLimit('partner-1');
      expect(() => service.checkRateLimit('partner-1')).toThrow(ForbiddenException);

      service.resetPartner('partner-1');
      expect(() => service.checkRateLimit('partner-1')).not.toThrow();
    });
  });

  describe('cleanupStaleEntries', () => {
    it('should remove entries older than maxAge', async () => {
      service.configurePartner('partner-1', 100, 100);
      service.checkRateLimit('partner-1');

      await new Promise(resolve => setTimeout(resolve, 50));
      service.cleanupStaleEntries(30);

      const status = service.getRateLimitStatus('partner-1');
      expect(status!.count).toBe(0);
    });
  });
});
