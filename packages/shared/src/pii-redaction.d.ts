/**
 * PII Redaction Utility
 * Masks sensitive PII data in outputs and logs
 */
export interface PiiRedactionOptions {
    maskChar?: string;
    preserveLength?: boolean;
    visibleChars?: number;
}
/**
 * Redact Iranian National ID (کد ملی)
 * Format: 10 digits
 */
export declare function redactNationalId(nationalId: string, options?: PiiRedactionOptions): string;
/**
 * Redact IBAN
 * Format: IR followed by 24 digits
 */
export declare function redactIban(iban: string, options?: PiiRedactionOptions): string;
/**
 * Redact Credit Card Number
 * Format: 16 digits, optionally with dashes
 */
export declare function redactCardNumber(cardNumber: string, options?: PiiRedactionOptions): string;
/**
 * Redact Phone Number
 * Format: Iranian mobile: +989XXXXXXXXX or 09XXXXXXXXX
 */
export declare function redactPhoneNumber(phoneNumber: string, options?: PiiRedactionOptions): string;
/**
 * Redact Email Address
 */
export declare function redactEmail(email: string, options?: PiiRedactionOptions): string;
/**
 * Redact generic string
 */
export declare function redactString(value: string, options?: PiiRedactionOptions): string;
/**
 * Detect and redact PII in an object
 */
export declare function redactPiiInObject(obj: any, options?: PiiRedactionOptions): any;
/**
 * Data Minimization: Remove unnecessary fields from object
 */
export declare function minimizeData(obj: any, allowedFields: string[]): any;
