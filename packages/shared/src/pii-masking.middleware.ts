import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { maskPii } from './data-classification';

/**
 * PII Masking Middleware
 * Automatically masks PII data in logs and responses based on sensitivity level
 */
@Injectable()
export class PiiMaskingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Intercept response to mask PII in the body
    const originalJson = res.json;
    
    res.json = function (body: any) {
      const maskedBody = maskPiiInObject(body);
      return originalJson.call(this, maskedBody);
    };

    // Intercept console.log to mask PII in logs
    const originalConsoleLog = console.log;
    console.log = function (...args: any[]) {
      const maskedArgs = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          return maskPiiInObject(arg);
        }
        return arg;
      });
      originalConsoleLog.apply(console, maskedArgs);
    };

    next();
  }
}

/**
 * Mask PII in an object recursively
 */
function maskPiiInObject(obj: any, depth = 0): any {
  if (depth > 10) return obj; // Prevent infinite recursion

  if (Array.isArray(obj)) {
    return obj.map(item => maskPiiInObject(item, depth + 1));
  }

  if (obj !== null && typeof obj === 'object') {
    const masked: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const piiField = getPiiFieldInfo(key);
        if (piiField) {
          masked[key] = maskPii(String(obj[key]), piiField.maskingStrategy || 'partial');
        } else {
          masked[key] = maskPiiInObject(obj[key], depth + 1);
        }
      }
    }
    return masked;
  }

  return obj;
}

/**
 * Get PII field information for a field name
 */
function getPiiFieldInfo(fieldName: string): { isPii: boolean; maskingStrategy: 'full' | 'partial' | 'hash' | 'tokenize' | null } | null {
  const piiFields: Record<string, { isPii: boolean; maskingStrategy: 'full' | 'partial' | 'hash' | 'tokenize' | null }> = {
    national_id: { isPii: true, maskingStrategy: 'partial' },
    first_name: { isPii: true, maskingStrategy: 'partial' },
    last_name: { isPii: true, maskingStrategy: 'partial' },
    phone_number: { isPii: true, maskingStrategy: 'partial' },
    mobile: { isPii: true, maskingStrategy: 'partial' },
    email: { isPii: true, maskingStrategy: 'partial' },
    address: { isPii: true, maskingStrategy: 'partial' },
    date_of_birth: { isPii: true, maskingStrategy: 'partial' },
    dob: { isPii: true, maskingStrategy: 'partial' },
    policy_number: { isPii: true, maskingStrategy: 'partial' },
    claim_number: { isPii: true, maskingStrategy: 'partial' },
    account_number: { isPii: true, maskingStrategy: 'partial' },
    card_number: { isPii: true, maskingStrategy: 'partial' },
    credit_card: { isPii: true, maskingStrategy: 'partial' },
    iban: { isPii: true, maskingStrategy: 'partial' },
    password: { isPii: true, maskingStrategy: 'full' },
    secret: { isPii: true, maskingStrategy: 'full' },
    token: { isPii: true, maskingStrategy: 'full' },
    api_key: { isPii: true, maskingStrategy: 'full' },
    incident_description: { isPii: true, maskingStrategy: 'partial' },
    payment_details: { isPii: true, maskingStrategy: 'full' },
    vehicle_info: { isPii: true, maskingStrategy: 'partial' },
  };

  return piiFields[fieldName.toLowerCase()] || null;
}

/**
 * PII Masking Decorator
 * Can be used on controller methods to selectively enable PII masking
 */
export const MaskPii = (options?: { strategy?: 'full' | 'partial' | 'hash' | 'tokenize' }) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const result = originalMethod.apply(this, args);
      
      // If result is a promise, mask after resolution
      if (result && typeof result.then === 'function') {
        return result.then((data: any) => maskPiiInObject(data));
      }
      
      // Otherwise mask immediately
      return maskPiiInObject(result);
    };

    return descriptor;
  };
};

/**
 * Log masking utility
 * Masks PII in log messages
 */
export function maskPiiInLog(message: string): string {
  // Mask national ID (10 digits)
  message = message.replace(/\b\d{10}\b/g, (match) => maskPii(match, 'partial'));
  
  // Mask phone numbers (Iranian format)
  message = message.replace(/\b0?9\d{9}\b/g, (match) => maskPii(match, 'partial'));
  
  // Mask email addresses
  message = message.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, (match) => maskPii(match, 'partial'));
  
  // Mask credit card numbers (16 digits)
  message = message.replace(/\b\d{16}\b/g, (match) => maskPii(match, 'partial'));
  
  return message;
}
