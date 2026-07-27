import { Injectable, NestMiddleware } from '@nestjs/common';

const PII_FIELDS = new Set([
  'nationalId', 'mobile', 'contactPhone', 'contactEmail', 'iban',
  'claimantPhone', 'claimantEmail', 'witnessPhone', 'driverNationalId',
  'insuredPhone', 'insuredEmail', 'insuredNationalId', 'phone', 'email',
]);

function maskValue(val: any): any {
  if (typeof val !== 'string' || val.length <= 4) return '****';
  return val.slice(0, 2) + '****' + val.slice(-2);
}

function maskPiiRecursive(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(maskPiiRecursive);
  if (typeof obj === 'object' && !Buffer.isBuffer(obj)) {
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
  use(req: any, res: any, next: () => void) {
    // Express exposes res.json; Fastify/Nest uses res.send for reply serialization
    const isExpress = typeof res.json === 'function';

    if (isExpress) {
      const originalJson = res.json.bind(res);
      res.json = function (body: any) {
        if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
          body = maskPiiRecursive(body);
        }
        return originalJson(body);
      };
    } else {
      const originalSend = res.send.bind(res);
      res.send = function (body: any) {
        if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
          body = maskPiiRecursive(body);
        }
        return originalSend(body);
      };
    }

    next();
  }
}
