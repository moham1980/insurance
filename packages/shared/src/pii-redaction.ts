// @ts-nocheck
/**
 * PII Redaction Utility
 * Masks sensitive PII data in outputs and logs
 */

export interface PiiRedactionOptions {
  maskChar?: string;
  preserveLength?: boolean;
  visibleChars?: number;
}

const defaultOptions: PiiRedactionOptions = {
  maskChar: '*',
  preserveLength: true,
  visibleChars: 2,
};

/**
 * Redact Iranian National ID (کد ملی)
 * Format: 10 digits
 */
export function redactNationalId(nationalId: string, options: PiiRedactionOptions = {}): string {
  const opts = { ...defaultOptions, ...options };
  if (!nationalId || nationalId.length !== 10) return nationalId;
  
  if (opts.preserveLength) {
    const visible = nationalId.substring(0, opts.visibleChars);
    const masked = opts.maskChar.repeat(10 - opts.visibleChars);
    return visible + masked;
  }
  return opts.maskChar.repeat(10);
}

/**
 * Redact IBAN
 * Format: IR followed by 24 digits
 */
export function redactIban(iban: string, options: PiiRedactionOptions = {}): string {
  const opts = { ...defaultOptions, ...options };
  if (!iban || !iban.startsWith('IR') || iban.length !== 26) return iban;
  
  if (opts.preserveLength) {
    const prefix = 'IR';
    const visible = iban.substring(2, 2 + opts.visibleChars);
    const masked = opts.maskChar.repeat(24 - opts.visibleChars);
    return prefix + visible + masked;
  }
  return 'IR' + opts.maskChar.repeat(24);
}

/**
 * Redact Credit Card Number
 * Format: 16 digits, optionally with dashes
 */
export function redactCardNumber(cardNumber: string, options: PiiRedactionOptions = {}): string {
  const opts = { ...defaultOptions, ...options };
  if (!cardNumber) return cardNumber;
  
  const cleaned = cardNumber.replace(/[^0-9]/g, '');
  if (cleaned.length !== 16) return cardNumber;
  
  if (opts.preserveLength) {
    const visible = cleaned.substring(0, opts.visibleChars);
    const masked = opts.maskChar.repeat(16 - opts.visibleChars);
    const result = visible + masked;
    
    // Preserve original formatting
    if (cardNumber.includes('-')) {
      return result.match(/.{1,4}/g)?.join('-') || result;
    }
    return result;
  }
  return opts.maskChar.repeat(16);
}

/**
 * Redact Phone Number
 * Format: Iranian mobile: +989XXXXXXXXX or 09XXXXXXXXX
 */
export function redactPhoneNumber(phoneNumber: string, options: PiiRedactionOptions = {}): string {
  const opts = { ...defaultOptions, ...options };
  if (!phoneNumber) return phoneNumber;
  
  const cleaned = phoneNumber.replace(/[^0-9+]/g, '');
  
  if (cleaned.startsWith('+98') && cleaned.length === 13) {
    if (opts.preserveLength) {
      const visible = cleaned.substring(0, 5); // +989
      const masked = opts.maskChar.repeat(8);
      return visible + masked;
    }
    return '+98' + opts.maskChar.repeat(10);
  } else if (cleaned.startsWith('09') && cleaned.length === 11) {
    if (opts.preserveLength) {
      const visible = cleaned.substring(0, 4); // 0912
      const masked = opts.maskChar.repeat(7);
      return visible + masked;
    }
    return opts.maskChar.repeat(11);
  }
  
  return phoneNumber;
}

/**
 * Redact Email Address
 */
export function redactEmail(email: string, options: PiiRedactionOptions = {}): string {
  const opts = { ...defaultOptions, ...options };
  if (!email || !email.includes('@')) return email;
  
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  
  if (opts.preserveLength) {
    const visible = local.substring(0, Math.min(opts.visibleChars, local.length));
    const masked = opts.maskChar.repeat(Math.max(0, local.length - opts.visibleChars));
    return visible + masked + '@' + domain;
  }
  return opts.maskChar.repeat(local.length) + '@' + domain;
}

/**
 * Redact generic string
 */
export function redactString(value: string, options: PiiRedactionOptions = {}): string {
  const opts = { ...defaultOptions, ...options };
  if (!value) return value;
  
  if (opts.preserveLength) {
    const visible = value.substring(0, Math.min(opts.visibleChars, value.length));
    const masked = opts.maskChar.repeat(Math.max(0, value.length - opts.visibleChars));
    return visible + masked;
  }
  return opts.maskChar.repeat(value.length);
}

/**
 * Detect and redact PII in an object
 */
export function redactPiiInObject(obj: any, options: PiiRedactionOptions = {}): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const piiFields = [
    'nationalId', 'national_id', 'کد_ملی',
    'iban', 'IBAN',
    'cardNumber', 'card_number', 'card',
    'phoneNumber', 'phone_number', 'mobile', 'phone',
    'email', 'ایمیل',
  ];
  
  const result = Array.isArray(obj) ? [...obj] : { ...obj };
  
  for (const key in result) {
    const value = result[key];
    const lowerKey = key.toLowerCase();
    
    if (typeof value === 'string') {
      if (lowerKey.includes('national') || lowerKey.includes('کد ملی')) {
        result[key] = redactNationalId(value, options);
      } else if (lowerKey.includes('iban')) {
        result[key] = redactIban(value, options);
      } else if (lowerKey.includes('card') || lowerKey.includes('credit')) {
        result[key] = redactCardNumber(value, options);
      } else if (lowerKey.includes('phone') || lowerKey.includes('mobile')) {
        result[key] = redactPhoneNumber(value, options);
      } else if (lowerKey.includes('email')) {
        result[key] = redactEmail(value, options);
      }
    } else if (typeof value === 'object') {
      result[key] = redactPiiInObject(value, options);
    }
  }
  
  return result;
}

/**
 * Data Minimization: Remove unnecessary fields from object
 */
export function minimizeData(obj: any, allowedFields: string[]): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result: any = {};
  for (const field of allowedFields) {
    if (field in obj) {
      result[field] = obj[field];
    }
  }
  
  return result;
}
