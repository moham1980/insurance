import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const PII_FIELDS = new Set([
  'nationalId', 'mobile', 'contactPhone', 'contactEmail', 'iban',
  'subjectNationalId', 'subjectName', 'subjectPhone',
  'customerNationalId', 'customerPhone', 'customerEmail',
]);

function maskValue(val: any): any {
  if (typeof val !== 'string' || val.length <= 4) return '****';
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

@Injectable()
export class PiiMaskingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      if (body && typeof body === 'object') {
        body = maskPiiRecursive(body);
      }
      return originalJson(body);
    };
    next();
  }
}
