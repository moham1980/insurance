import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { redactPiiInObject } from '@insurance/shared';

@Injectable()
export class PiiRedactionInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((response) => {
        if (!response || typeof response !== 'object') {
          return response;
        }

        if (response.data !== undefined) {
          return { ...response, data: redactPiiInObject(response.data) };
        }

        if (Array.isArray(response) || response.rows !== undefined) {
          return response;
        }

        return redactPiiInObject(response);
      }),
    );
  }
}
