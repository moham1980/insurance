import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const PII_KEYS = ['nationalId', 'mobile', 'contactPhone', 'contactEmail', 'iban', 'destinationIban', 'beneficiaryPartyId', 'subjectNationalId'];

function maskValue(value: string): string {
  if (!value || typeof value !== 'string') return value;
  if (value.length <= 4) return '****';
  return value.substring(0, 2) + '*'.repeat(Math.max(4, value.length - 4)) + value.substring(value.length - 2);
}

function maskPiiFields(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(maskPiiFields);
  if (data instanceof Date) return data.toISOString();

  const masked: Record<string, any> = {};
  for (const key of Object.keys(data)) {
    if (PII_KEYS.includes(key) && typeof data[key] === 'string') {
      masked[key] = maskValue(data[key]);
    } else if (typeof data[key] === 'object' && data[key] !== null) {
      masked[key] = maskPiiFields(data[key]);
    } else {
      masked[key] = data[key];
    }
  }
  return masked;
}

@Injectable()
export class PiiMaskingInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => maskPiiFields(data)));
  }
}
