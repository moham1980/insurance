import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ErrorReporter } from '../../common/src/error-reporter';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: any, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = request?.headers?.['x-correlation-id'] || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: any;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      body = typeof res === 'string' ? { success: false, error: { code: 'HTTP_ERROR', message: res } } : res;
    } else if (exception?.response?.status && exception?.response?.data) {
      status = exception.response.status;
      const downstreamData = exception.response.data;
      body = downstreamData?.success === false
        ? downstreamData
        : { success: false, error: { code: 'DOWNSTREAM_ERROR', message: downstreamData?.message || downstreamData?.error?.message || `Downstream service returned ${status}` } };
    } else {
      // Do NOT leak exception.message to the API consumer — it may contain
      // internal driver error strings, stack details, or sensitive info.
      const message = exception?.message || 'Internal server error';
      this.logger.error(`Unhandled exception: ${message}`, exception?.stack);
      body = { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } };
    }

    if (!body?.success) {
      // Spread body first so our safe defaults are not overwritten by any
      // leaked fields from the original body.
      body = { ...body, success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } };
    }

    body.correlationId = body.correlationId || correlationId;

    // Report a structured error event for central ingestion (Kafka when
    // available, otherwise a structured log line picked up by log
    // aggregation). Fire-and-forget; ErrorReporter swallows its own errors.
    const errorCode = body?.error?.code || 'INTERNAL_ERROR';
    const safeMessage = body?.error?.message || 'Internal server error';
    ErrorReporter.report({
      sourceApp: 'insurance-legacy',
      service: 'broker-portal-bff',
      severity: 'ERROR',
      category: status >= 500 ? 'BUG' : 'UNKNOWN',
      errorCode,
      httpStatus: status,
      retryable: status >= 500,
      safeMessage,
      correlationId,
    }).catch(() => {
      /* ErrorReporter already logs internally; ignore rejection */
    });

    response.status(status).json(body);
  }
}
