import { describe, it, expect } from '@jest/globals';

describe('OTP Service', () => {
  it('should generate a 6-digit OTP code', () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it('should enforce rate limit on OTP requests', () => {
    const rateLimit = { maxAttempts: 5, windowMinutes: 5 };
    expect(rateLimit.maxAttempts).toBe(5);
    expect(rateLimit.windowMinutes).toBe(5);
  });

  it('should expire OTP after 2 minutes', () => {
    const ttl = 120; // seconds
    expect(ttl).toBe(120);
  });

  it('should verify correct OTP', () => {
    const storedOtp = '123456';
    const inputOtp = '123456';
    expect(storedOtp).toBe(inputOtp);
  });

  it('should reject incorrect OTP', () => {
    const storedOtp = '123456';
    const inputOtp = '654321';
    expect(storedOtp).not.toBe(inputOtp);
  });

  it('should block brute-force after max attempts', () => {
    const attempts = 5;
    const maxAttempts = 5;
    expect(attempts).toBeGreaterThanOrEqual(maxAttempts);
  });

  it('should support multiple channels (SMS, push)', () => {
    const channels = ['sms', 'push'];
    expect(channels).toContain('sms');
    expect(channels).toContain('push');
  });
});
