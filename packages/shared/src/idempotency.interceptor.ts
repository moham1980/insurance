import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, of } from 'rxjs';
import { Request } from 'express';
import * as crypto from 'crypto';
import { IdempotencyRecord } from './entities/IdempotencyRecord';

export interface IdempotencyStore {
  get(key: string, tenantId?: string, payloadHash?: string): Promise<any>;
  set(key: string, value: any, ttlSeconds?: number, tenantId?: string, payloadHash?: string): Promise<void>;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private store: IdempotencyStore;
  private ttlSeconds: number;

  constructor(store: IdempotencyStore, ttlSeconds = 86400) {
    this.store = store;
    this.ttlSeconds = ttlSeconds;
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest<Request>();
    const key = this.extractKey(req);
    if (!key) {
      return next.handle();
    }

    const tenantId = (req.headers?.['x-tenant-id'] as string) || 'default';
    const payloadHash = this.extractPayloadHash(req);

    const cached = await this.store.get(key, tenantId, payloadHash);
    if (cached) {
      return of(cached);
    }

    const originalHandle = next.handle();
    return new Observable((subscriber) => {
      originalHandle.subscribe({
        next: async (value) => {
          await this.store.set(key, value, this.ttlSeconds, tenantId, payloadHash);
          subscriber.next(value);
          subscriber.complete();
        },
        error: (err) => subscriber.error(err),
      });
    });
  }

  private extractKey(req: Request): string | undefined {
    const key = req.headers['x-idempotency-key'] as string | undefined;
    const requestPath = req.url?.split('?')[0];
    const method = req.method;
    if (!key || !requestPath) return undefined;
    return `${method}:${requestPath}:${key}`;
  }

  private extractPayloadHash(req: Request): string {
    const raw = JSON.stringify(req.body || {});
    return crypto.createHash('sha256').update(raw).digest('hex');
  }
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly map = new Map<string, { value: any; expiresAt: number }>();

  async get(key: string, _tenantId?: string, _payloadHash?: string): Promise<any> {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    return entry.value;
  }

  async set(key: string, value: any, ttlSeconds = 86400, _tenantId?: string, _payloadHash?: string): Promise<void> {
    this.map.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}

/**
 * TypeORM-backed idempotency store that persists records and enforces
 * request hash + payload hash matching. If the same idempotency key is
 * reused with a different payload, it throws an HTTP 409.
 */
@Injectable()
export class TypeormIdempotencyStore implements IdempotencyStore {
  constructor(
    @InjectRepository(IdempotencyRecord) private readonly repo: Repository<IdempotencyRecord>,
  ) {}

  async get(key: string, tenantId: string, payloadHash: string): Promise<any> {
    const record = await this.repo.findOne({ where: { requestHash: `${tenantId}:${key}`, tenantId } });
    if (!record) return undefined;
    if (record.expiresAt && record.expiresAt < new Date()) {
      await this.repo.delete({ idempotencyId: record.idempotencyId });
      return undefined;
    }
    if (record.payloadHash !== payloadHash) {
      throw new HttpException(
        { success: false, error: { code: 'IDEMPOTENCY_PAYLOAD_MISMATCH', message: 'Idempotency key reused with a different payload' } },
        409
      );
    }
    return record.responsePayload;
  }

  async set(key: string, value: any, ttlSeconds?: number, tenantId?: string, payloadHash?: string): Promise<void> {
    const resolvedTenantId = tenantId || 'default';
    const resolvedPayloadHash = payloadHash || '';
    const resolvedTtl = ttlSeconds || 86400;
    const requestHash = `${resolvedTenantId}:${key}`;
    const existing = await this.repo.findOne({ where: { requestHash, tenantId: resolvedTenantId } });
    if (existing) {
      if (existing.expiresAt && existing.expiresAt < new Date()) {
        await this.repo.delete({ idempotencyId: existing.idempotencyId });
      } else if (existing.payloadHash !== resolvedPayloadHash) {
        throw new HttpException(
          { success: false, error: { code: 'IDEMPOTENCY_PAYLOAD_MISMATCH', message: 'Idempotency key reused with a different payload' } },
          409
        );
      } else {
        return;
      }
    }
    const record = this.repo.create({
      tenantId: resolvedTenantId,
      requestHash,
      payloadHash: resolvedPayloadHash,
      responsePayload: value,
      statusCode: 200,
      expiresAt: new Date(Date.now() + resolvedTtl * 1000),
    });
    await this.repo.save(record);
  }
}
