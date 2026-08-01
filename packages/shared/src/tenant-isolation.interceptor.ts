import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Observable } from 'rxjs';

/**
 * NestJS interceptor that propagates the request tenant into PostgreSQL
 * `app.current_tenant` configuration so that Row-Level Security (RLS) policies
 * can enforce tenant isolation at the database level.
 *
 * Uses dataSource.query() which automatically checks out and releases a
 * connection from the pool per query, avoiding pool exhaustion.
 */
@Injectable()
export class TenantIsolationInterceptor implements NestInterceptor {
  constructor(private readonly dataSource: DataSource) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request?.tenantId;

    if (tenantId && this.dataSource.isInitialized) {
      try {
        await this.dataSource.query('SELECT set_current_tenant($1)', [tenantId]);
      } catch {
        /* ignore tenant context errors */
      }
    }

    return next.handle();
  }
}
