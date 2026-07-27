import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';

const PII_FIELDS = new Set([
  'nationalId', 'mobile', 'contactPhone', 'contactEmail', 'iban',
  'insuredPhone', 'insuredEmail', 'insuredNationalId',
  'beneficiaryNationalId', 'ownerNationalId', 'accountNumber', 'cardNumber',
]);

function maskValue(val: any): any {
  if (typeof val !== 'string') return val;
  if (val.length <= 4) return '****';
  return val.slice(0, 2) + '****' + val.slice(-2);
}

function maskPiiRecursive(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(maskPiiRecursive);
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (PII_FIELDS.has(key)) {
        result[key] = maskValue(value);
      } else {
        result[key] = maskPiiRecursive(value);
      }
    }
    return result;
  }
  return obj;
}

function shouldMask(req: any): boolean {
  const path = (req.originalUrl || req.url || '') as string;
  // Only mask response bodies for endpoints that may contain PII
  return !path.includes('/health') && !path.includes('/metrics');
}

@Injectable()
export class PiiMaskingMiddleware implements NestMiddleware {
  use(req: FastifyRequest, res: FastifyReply, next: () => void) {
    if (!shouldMask(req)) {
      return next();
    }

    const originalSend = (res as any).send?.bind(res);
    if (typeof originalSend === 'function') {
      (res as any).send = (payload: any) => {
        if (payload && typeof payload === 'object') {
          return originalSend(maskPiiRecursive(payload));
        }
        return originalSend(payload);
      };
    }

    next();
  }
}
