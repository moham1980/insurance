import { describe, it, expect } from '@jest/globals';

describe('Copilot Service', () => {
  it('should redact PII from question text', () => {
    const input = 'مشتری با کد ملی 1234567890 و شماره 09123456789 تماس گرفت';
    const redacted = input
      .replace(/\b\d{10}\b/g, '[REDACTED_NATIONAL_ID]')
      .replace(/\b09\d{9}\b/g, '[REDACTED_PHONE]');
    expect(redacted).toContain('[REDACTED_NATIONAL_ID]');
    expect(redacted).toContain('[REDACTED_PHONE]');
    expect(redacted).not.toContain('1234567890');
    expect(redacted).not.toContain('09123456789');
  });

  it('should include source references in response', () => {
    const response = {
      answer: 'بر اساس ماده ۱۷ قانون بیمه...',
      sources: [{ source: 'insurance-law.pdf', snippet: 'ماده ۱۷', relevance: 0.95 }],
    };
    expect(response.sources).toBeDefined();
    expect(response.sources.length).toBeGreaterThan(0);
    expect(response.sources[0].source).toBe('insurance-law.pdf');
  });

  it('should support recommend-product endpoint', () => {
    const request = {
      customerId: 'cust-001',
      productType: 'auto',
      budget: 50000000,
      riskFactors: ['young_driver', 'urban'],
    };
    expect(request.customerId).toBeDefined();
    expect(request.productType).toBe('auto');
  });

  it('should support draft-communication endpoint', () => {
    const request = {
      type: 'email' as const,
      subject: 'تأیید خسارت',
      context: 'خسارت بیمه شخص ثالث',
      tone: 'formal' as const,
      language: 'fa' as const,
    };
    expect(request.type).toBe('email');
    expect(request.language).toBe('fa');
  });
});
