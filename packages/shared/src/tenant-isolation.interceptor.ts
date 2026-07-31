import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * NestJS interceptor that propagates the request tenant into PostgreSQL
 * `app.current_tenant` configuration so that Row-Level Security (RLS) policies
 * can enforce tenant isolation at the database level.
 *
 * IMPORTANT: This assumes the DataSource has already been created and that the
 * database user is not the table owner (or FORCE ROW LEVEL SECURITY has been
 * enabled), otherwise RLS policies are bypassed.
 */
@Injectable()
export class TenantIsolationInterceptor implements NestInterceptor {
  constructor(private readonly dataSource: DataSource) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request?.tenantId;
    let runner: ReturnType<DataSource['createQueryRunner']> | undefined;

    if (tenantId && this.dataSource.isInitialized) {
      runner = this.dataSource.createQueryRunner();
      await runner.connect();
      await runner.query('SELECT set_current_tenant($1)', [tenantId]);
    }

    return next.handle().pipe(
      tap({
        next: async () => {
          if (runner) {
            try {
              await runner.query("SELECT set_current_tenant('')");
              await runner.release();
            } catch {
              /* release only once */
            }
          }
        },
        error: async () => {
          if (runner) {
            try {
              await runner.query("SELECT set_current_tenant('')");
              await runner.release();
            } catch {
              /* release only once */
            }
          }
        },
      })
    );
  }
}
