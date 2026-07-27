import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { FastifyRequest } from 'fastify';
import { IdempotencyService } from './idempotency.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(private readonly idempotency: IdempotencyService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const idempotencyKey = this.extractKey(request);

    if (!idempotencyKey) {
      return next.handle();
    }

    const tenantId = (request as any).user?.tenantId || 'unknown';
    const userId = (request as any).user?.userId || 'anonymous';
    const method = request.method || 'UNKNOWN';
    const path = (request as any).routerPath || request.url || '/';
    const scope = `${method}:${path}`;
    const key = this.idempotency.buildKey(scope, tenantId, userId, idempotencyKey, path);

    // Check cache synchronously; if hit, return cached response and skip handler
    return this.fromPromise(
      this.idempotency.get(key).then((cached) => {
        if (cached) {
          request.headers['x-idempotency-replayed'] = 'true';
          return of(cached.body);
        }

        return next.handle().pipe(
          tap(async (response) => {
            if (response && typeof response === 'object' && response.success === true) {
              await this.idempotency.set(key, 200, response);
            }
          }),
        );
      }),
    );
  }

  private extractKey(request: FastifyRequest): string | null {
    const raw = request.headers['x-idempotency-key'] || request.headers['idempotency-key'];
    if (typeof raw === 'string' && raw.trim().length > 0) {
      return raw.trim();
    }
    if (Array.isArray(raw) && raw.length > 0 && raw[0].trim().length > 0) {
      return raw[0].trim();
    }
    return null;
  }

  private fromPromise<T>(promise: Promise<Observable<T>>): Observable<T> {
    return new Observable((subscriber) => {
      promise
        .then((observable) => {
          const subscription = observable.subscribe({
            next: (value) => subscriber.next(value),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
          });
          return () => subscription.unsubscribe();
        })
        .catch((err) => subscriber.error(err));
    });
  }
}
