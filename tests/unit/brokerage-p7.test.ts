import { describe, test, expect } from '@jest/globals';

describe('Unit: P7 AI & Experience Features', () => {
  describe('OCR Redaction', () => {
    const redactText = (text: string) => {
      const patterns: Record<string, RegExp> = {
        national_id: /\b\d{10}\b/g,
        phone: /\b09\d{9}\b/g,
        iban: /\bIR\d{24}\b/g,
        email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      };
      const spans: Array<{ type: string; start: number; end: number; replacement: string }> = [];
      let redactedText = text;
      Object.entries(patterns).forEach(([type, pattern]) => {
        redactedText = redactedText.replace(pattern, (match, offset) => {
          spans.push({ type, start: offset, end: offset + match.length, replacement: '[REDACTED]' });
          return '[REDACTED]';
        });
      });
      return { redactedText, spans, redacted: spans.length > 0 };
    };

    test('T-UNIT-P7-01: Should redact national ID, phone, email and IBAN', () => {
      const text = 'کد ملی 1234567890 و تلفن 09123456789 و ایمیل test@example.com و شبا IR123456789012345678901234';
      const result = redactText(text);
      expect(result.redacted).toBe(true);
      expect(result.spans.length).toBe(4);
      expect(result.redactedText).not.toContain('1234567890');
      expect(result.redactedText).not.toContain('09123456789');
      expect(result.redactedText).not.toContain('test@example.com');
      expect(result.redactedText).not.toContain('IR123456789012345678901234');
    });

    test('T-UNIT-P7-02: Should return original text when no PII present', () => {
      const text = 'این یک متن بدون اطلاعات حساس است.';
      const result = redactText(text);
      expect(result.redacted).toBe(false);
      expect(result.redactedText).toBe(text);
    });
  });

  describe('Document Classification', () => {
    const classifyDocument = (text: string, fileName?: string) => {
      const keywords: Record<string, string[]> = {
        national_id_card: ['کد ملی', 'شماره ملی', 'carte melli'],
        vehicle_document: ['پلاک', 'خودرو', 'وی ملک'],
        medical_report: ['پزشک', 'بیمارستان', 'آزمایش'],
        policy_document: ['بیمه‌نامه', 'حق بیمه', 'polic'],
      };
      const source = text + ' ' + (fileName || '');
      for (const [docType, words] of Object.entries(keywords)) {
        if (words.some((w) => source.toLowerCase().includes(w.toLowerCase()))) {
          return { documentType: docType, confidence: 0.85 };
        }
      }
      return { documentType: 'unknown', confidence: 0.3 };
    };

    test('T-UNIT-P7-03: Should classify national ID card', () => {
      const result = classifyDocument('تصویر کد ملی', 'id-card.pdf');
      expect(result.documentType).toBe('national_id_card');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('T-UNIT-P7-04: Should classify unknown documents with low confidence', () => {
      const result = classifyDocument('متن عمومی');
      expect(result.documentType).toBe('unknown');
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('Consent Store', () => {
    const maskCredential = (value: string) => {
      if (value.length <= 8) return '*'.repeat(value.length);
      return `${value.slice(0, 4)}...${value.slice(-4)}`;
    };

    test('T-UNIT-P7-05: Should mask API keys', () => {
      expect(maskCredential('abc1234567890xyz')).toBe('abc1...0xyz');
      expect(maskCredential('short')).toBe('*****');
    });
  });

  describe('Model Governance', () => {
    const governanceCheck = (card: { status: string; biasRiskLevel: string }) => {
      if (card.status === 'approved') return { allowed: true, reason: 'Governance checks passed' };
      if (['deprecated', 'archived'].includes(card.status)) return { allowed: false, reason: `Model status ${card.status}` };
      return { allowed: false, reason: `Model not approved (status=${card.status})` };
    };

    test('T-UNIT-P7-06: Should allow only approved models', () => {
      expect(governanceCheck({ status: 'approved', biasRiskLevel: 'low' }).allowed).toBe(true);
      expect(governanceCheck({ status: 'draft', biasRiskLevel: 'low' }).allowed).toBe(false);
      expect(governanceCheck({ status: 'deprecated', biasRiskLevel: 'high' }).allowed).toBe(false);
    });
  });
});
