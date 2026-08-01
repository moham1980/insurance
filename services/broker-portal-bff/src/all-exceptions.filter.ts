import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

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
      const message = exception?.message || 'Internal server error';
      this.logger.error(`Unhandled exception: ${message}`, exception?.stack);
      body = { success: false, error: { code: 'INTERNAL_ERROR', message } };
    }

    if (!body?.success) {
      body = { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }, ...body };
    }

    body.correlationId = body.correlationId || correlationId;

    response.status(status).json(body);
  }
}
