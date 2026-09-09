import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ErrorReporter } from './error-reporter';

/**
 * Shared global exception filter for all insurance-legacy NestJS services.
 *
 * Designed to work with both Fastify (reply.status().send()) and Express
 * (response.status().json()) by duck-typing the response object.
 *
 * Key safety guarantees:
 * - 5xx errors NEVER leak exception.message to the API consumer.
 * - 4xx HttpException messages are preserved only if they are safe
 *   (controller-authored strings), never raw driver/stack strings.
 * - Every exception is reported to the central error pipeline via
 *   ErrorReporter (Kafka when available, structured log otherwise).
 * - A correlation/trace ID is propagated in the response body.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response: any = ctx.getResponse();
    const request: any = ctx.getRequest();

    const traceId =
      request?.headers?.['x-trace-id'] ||
      request?.headers?.['x-correlation-id'] ||
      request?.correlationId ||
      crypto.randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (status < 500) {
        // For 4xx, the HttpException's message is controller-authored and safe.
        const msg =
          typeof res === 'string'
            ? res
            : (res as any)?.message || exception.message;
        errorCode = this.mapStatusToCode(status);
        message = msg || 'Request error';
      } else {
        // For 5xx HttpExceptions, do NOT leak the message — it may contain
        // internal driver/stack strings.
        errorCode = this.mapStatusToCode(status);
        message = 'Internal server error';
      }
    } else if (exception && typeof exception === 'object' && 'response' in exception) {
      // Axios/HttpAxion downstream error shape
      const downstream = (exception as any).response;
      if (downstream?.status) {
        status = downstream.status;
        errorCode = this.mapStatusToCode(status);
        message = status < 500
          ? (downstream.data?.message || downstream.data?.error?.message || 'Downstream request error')
          : 'Downstream service error';
      }
    }
    // else: leave as 500 INTERNAL_ERROR / "Internal server error"

    // Log the full exception (with stack) for debugging — never sent to client.
    this.logger.error(
      `TraceId: ${traceId}, Status: ${status}, ErrorCode: ${errorCode}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    // Derive service name from request URL path prefix (e.g. /policy/... -> policy)
    const path: string = request?.url || request?.path || '';
    const service = path.split('/')[1] || 'unknown';

    // Report to central error pipeline (fire-and-forget).
    ErrorReporter.report({
      sourceType: 'BACKEND',
      sourceApp: 'insurance-legacy',
      service,
      errorCode,
      httpStatus: status,
      safeMessage: message,
      traceId,
      correlationId: traceId,
      severity: status >= 500 ? 'ERROR' : 'WARN',
      category: status < 500 ? 'VALIDATION' : 'BUG',
      retryable: status >= 500,
    }).catch(() => {
      /* ErrorReporter logs internally; ignore rejection */
    });

    const body = {
      success: false,
      error: { code: errorCode, message },
      correlationId: traceId,
    };

    // Fastify uses reply.status().send(); Express uses response.status().json()
    if (response?.send && typeof response.send === 'function') {
      if (response.header) {
        response.header('X-Correlation-Id', traceId);
      }
      response.status(status).send(body);
    } else if (response?.json && typeof response.json === 'function') {
      response.status(status).json(body);
    }
  }

  private mapStatusToCode(status: number): string {
    switch (status) {
      case 400:
        return 'VALIDATION_ERROR';
      case 401:
        return 'UNAUTHENTICATED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'BUSINESS_RULE_VIOLATION';
      case 429:
        return 'RATE_LIMITED';
      case 502:
        return 'DOWNSTREAM_ERROR';
      case 503:
        return 'SERVICE_UNAVAILABLE';
      case 504:
        return 'TIMEOUT';
      default:
        return status < 500 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR';
    }
  }
}
