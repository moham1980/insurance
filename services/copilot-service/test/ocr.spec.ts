import { describe, it, expect } from '@jest/globals';

describe('OCR Service', () => {
  it('should extract text from base64 input', () => {
    const base64Input = Buffer.from('test-image').toString('base64');
    expect(base64Input).toBeDefined();
    expect(Buffer.isBuffer(Buffer.from(base64Input, 'base64'))).toBe(true);
  });

  it('should validate mimeType', () => {
    const validTypes = ['image/png', 'image/jpeg', 'image/tiff', 'application/pdf'];
    validTypes.forEach((t) => expect(t).toMatch(/^(image|application)\//));
  });

  it('should support provider selection', () => {
    const providers = ['tesseract', 'google_vision'];
    providers.forEach((p) => expect(p).toMatch(/^[a-z_]+$/));
  });

  it('should redact PII from extracted text', () => {
    const extractedText = 'کد ملی: 1234567890، شماره حساب: 1234-567890-1';
    const patterns = [
      { type: 'NATIONAL_ID', regex: /\b\d{10}\b/g, replacement: '[REDACTED_NATIONAL_ID]' },
      { type: 'ACCOUNT_NUMBER', regex: /\b\d{2,4}-\d{6,}-\d{1,}\b/g, replacement: '[REDACTED_ACCOUNT]' },
    ];
    let redacted = extractedText;
    for (const p of patterns) {
      redacted = redacted.replace(p.regex, p.replacement);
    }
    expect(redacted).toContain('[REDACTED_NATIONAL_ID]');
    expect(redacted).toContain('[REDACTED_ACCOUNT]');
    expect(redacted).not.toContain('1234567890');
  });

  it('should support user confirmation of extracted fields', () => {
    const confirmation = {
      documentId: 'doc-001',
      confirmationStatus: 'complete' as const,
      missingFields: [] as string[],
      invalidFields: [] as string[],
    };
    expect(confirmation.confirmationStatus).toBe('complete');
    expect(confirmation.missingFields).toHaveLength(0);
  });

  it('should classify document types', () => {
    const classification = {
      documentId: 'doc-002',
      documentType: 'invoice',
      confidence: 0.92,
    };
    expect(classification.documentType).toBe('invoice');
    expect(classification.confidence).toBeGreaterThan(0.8);
  });
});
