import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const PII_FIELDS = new Set([
  'nationalId', 'mobile', 'contactPhone', 'contactEmail', 'iban',
  'destinationIban', 'beneficiaryPartyId', 'subjectNationalId',
  'claimantPhone', 'claimantEmail', 'insuredPhone', 'insuredEmail',
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
export class PiiMaskingInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((body) => maskPiiRecursive(body)));
  }
}
