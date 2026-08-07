/**
 * PII Redactor Utility
 *
 * Detects and redacts sensitive personally identifiable information (PII) from
 * text before it is sent to external AI providers. This prevents leakage of
 * customer data to third-party LLM services.
 *
 * Supported patterns:
 * - Iranian national ID (10 digits) → [REDACTED_NATIONAL_ID]
 * - Iranian mobile number (09XXXXXXXXX or +989XXXXXXXXX) → [REDACTED_PHONE]
 * - Email addresses → [REDACTED_EMAIL]
 * - Bank card numbers (16 digits, grouped or contiguous) → [REDACTED_CARD]
 * - Insurance policy numbers (IRN-XXXXXXXX or POL-XXXXXXXX) → [REDACTED_POLICY_NUMBER]
 * - IBAN (IR + 24 digits) → [REDACTED_IBAN]
 *
 * Environment flag:
 * - COPILOT_PII_REDACTION: 'true' to enable (default: true in production, false in test)
 */

export interface PiiRedactionResult {
  /** The redacted text with PII replaced by placeholders. */
  text: string;
  /** Whether any PII was redacted. */
  redacted: boolean;
  /** Total number of PII items redacted. */
  count: number;
  /** Breakdown of redacted items by type. */
  byType: Record<string, number>;
}

interface PiiPattern {
  type: string;
  regex: RegExp;
  replacement: string;
}

const PATTERNS: PiiPattern[] = [
  // Iranian national ID — exactly 10 digits (word-boundary guarded)
  { type: 'NATIONAL_ID', regex: /\b\d{10}\b/g, replacement: '[REDACTED_NATIONAL_ID]' },
  // Bank card number — 16 digits, optionally grouped with spaces or dashes
  {
    type: 'CARD_NUMBER',
    regex: /\b(?:\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4})\b|\b\d{16}\b/g,
    replacement: '[REDACTED_CARD]',
  },
  // IBAN — IR followed by 24 digits
  { type: 'IBAN', regex: /\bIR\d{24}\b/gi, replacement: '[REDACTED_IBAN]' },
  // Iranian mobile — 09XXXXXXXXX or +989XXXXXXXXX
  { type: 'PHONE', regex: /\b09\d{9}\b|\b\+989\d{9}\b/g, replacement: '[REDACTED_PHONE]' },
  // Email — standard email pattern
  {
    type: 'EMAIL',
    regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    replacement: '[REDACTED_EMAIL]',
  },
  // Insurance policy number — common prefixes IRN- or POL- followed by 6-12 alphanumeric chars
  {
    type: 'POLICY_NUMBER',
    regex: /\b(?:IRN|POL)-[A-Za-z0-9]{6,12}\b/g,
    replacement: '[REDACTED_POLICY_NUMBER]',
  },
];

/**
 * Determine whether PII redaction is enabled based on the COPILOT_PII_REDACTION
 * environment variable. Defaults to true in production, false in test environments.
 */
export function isPiiRedactionEnabled(): boolean {
  const flag = process.env.COPILOT_PII_REDACTION;
  if (flag !== undefined) {
    return flag === 'true';
  }
  // Default: enabled in production, disabled in test
  const nodeEnv = process.env.NODE_ENV || '';
  return nodeEnv !== 'test';
}

/**
 * Redact all detected PII patterns from the given text.
 *
 * Returns the redacted text along with a count of items redacted (by type and total).
 * The original sensitive content is never included in the result or logs.
 *
 * @param text - The input text that may contain PII.
 * @returns PiiRedactionResult with redacted text and metadata.
 */
export function redactPii(text: string): PiiRedactionResult {
  if (!text || typeof text !== 'string') {
    return { text: text ?? '', redacted: false, count: 0, byType: {} };
  }

  let out = text;
  let count = 0;
  const byType: Record<string, number> = {};

  for (const pattern of PATTERNS) {
    // Create a fresh global regex to avoid state issues across calls
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags.includes('g') ? pattern.regex.flags : pattern.regex.flags + 'g');
    const matches = out.match(regex);
    if (matches && matches.length > 0) {
      const typeCount = matches.length;
      count += typeCount;
      byType[pattern.type] = (byType[pattern.type] || 0) + typeCount;
      out = out.replace(regex, pattern.replacement);
    }
  }

  return {
    text: out,
    redacted: count > 0,
    count,
    byType,
  };
}

/**
 * Redact PII from text only if redaction is enabled (per COPILOT_PII_REDACTION env).
 * Convenience wrapper that respects the environment flag.
 */
export function redactPiiIfEnabled(text: string): PiiRedactionResult {
  if (!isPiiRedactionEnabled()) {
    return { text: text ?? '', redacted: false, count: 0, byType: {} };
  }
  return redactPii(text);
}
