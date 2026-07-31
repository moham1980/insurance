const PII_PATTERNS: { pattern: RegExp; replacement: string }[] = [
  { pattern: /\b\d{10}\b/g, replacement: '[REDACTED_NATIONAL_ID]' },
  { pattern: /\b09\d{9}\b/g, replacement: '[REDACTED_MOBILE]' },
  { pattern: /\b\d{16,19}\b/g, replacement: '[REDACTED_CARD]' },
  { pattern: /[\w.+-]+@[\w-]+\.[\w.-]+/g, replacement: '[REDACTED_EMAIL]' },
  { pattern: /\bIR\d{24}\b/gi, replacement: '[REDACTED_IBAN]' },
];

const PII_KEYS = new Set([
  'nationalId',
  'national_id',
  'mobile',
  'phone',
  'email',
  'iban',
  'cardNumber',
  'card_number',
  'ssn',
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
]);

export function maskPiiValue(value: string): string {
  let result = value;
  for (const { pattern, replacement } of PII_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function maskPiiObject(obj: Record<string, any>): Record<string, any> {
  const masked: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (PII_KEYS.has(key)) {
      masked[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      masked[key] = maskPiiValue(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      masked[key] = maskPiiObject(value);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

export function safeLog(message: string, meta?: Record<string, any>): string {
  if (!meta) return maskPiiValue(message);
  return `${maskPiiValue(message)} ${JSON.stringify(maskPiiObject(meta))}`;
}
