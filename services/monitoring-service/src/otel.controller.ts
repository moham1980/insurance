import { Controller, Get, Post, Body, Headers, UseGuards } from '@nestjs/common';
import { OtelService } from './otel.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ErrorReporter } from '../../common/src/error-reporter';

@Controller('otel')
export class OtelController {
  constructor(private readonly otelService: OtelService) {}

  @Get('health')
  async healthCheck() {
    const health = await this.otelService.healthCheck();
    return {
      success: true,
      data: health,
    };
  }

  @Post('span')
  @UseGuards(JwtAuthGuard)
  async createSpan(@Body() body: { name: string; kind?: string; attributes?: Record<string, any> }) {
    const span = this.otelService.startSpan(
      body.name,
      {
        kind: body.kind as any,
        attributes: body.attributes,
      }
    );
    span.end();
    return {
      success: true,
      message: 'Span created and ended',
    };
  }

  @Post('metric')
  @UseGuards(JwtAuthGuard)
  async recordMetric(@Body() body: { name: string; value: number; type: 'counter' | 'histogram' | 'gauge'; attributes?: Record<string, any> }) {
    switch (body.type) {
      case 'counter':
        this.otelService.recordMetric(body.name, body.value, body.attributes);
        break;
      case 'histogram':
        this.otelService.recordHistogram(body.name, body.value, body.attributes);
        break;
      case 'gauge':
        this.otelService.recordGauge(body.name, body.value, body.attributes);
        break;
    }
    return {
      success: true,
      message: 'Metric recorded',
    };
  }

  @Post('attributes')
  @UseGuards(JwtAuthGuard)
  async addAttributes(@Body() body: { attributes: Record<string, any> }) {
    this.otelService.addAttributes(body.attributes);
    return {
      success: true,
      message: 'Attributes added to active span',
    };
  }

  @Post('event')
  @UseGuards(JwtAuthGuard)
  async addEvent(@Body() body: { name: string; attributes?: Record<string, any> }) {
    this.otelService.addEvent(body.name, body.attributes);
    return {
      success: true,
      message: 'Event added to active span',
    };
  }

  @Post('exception')
  @UseGuards(JwtAuthGuard)
  async recordException(
    @Body() body: { error: string; stack?: string; service?: string; traceId?: string; correlationId?: string },
    @Headers() headers: Record<string, string>,
  ) {
    const error = new Error(body.error);
    if (body.stack) {
      error.stack = body.stack;
    }
    this.otelService.recordException(error);

    // Forward the exception to the central error pipeline (Kafka when
    // available, structured log otherwise) so it is visible alongside
    // exceptions captured by AllExceptionsFilter across all services.
    const traceId =
      body.traceId ||
      headers['x-trace-id'] ||
      headers['x-correlation-id'] ||
      undefined;
    const correlationId =
      body.correlationId ||
      headers['x-correlation-id'] ||
      traceId ||
      undefined;

    ErrorReporter.report({
      sourceType: 'BACKEND',
      sourceApp: 'insurance-legacy',
      service: body.service || 'monitoring',
      errorCode: 'OTEL_REPORTED_EXCEPTION',
      httpStatus: 500,
      safeMessage: body.error || 'Reported exception',
      traceId,
      correlationId,
      severity: 'ERROR',
      category: 'BUG',
      retryable: true,
    }).catch(() => {
      /* ErrorReporter logs internally; ignore rejection */
    });

    return {
      success: true,
      message: 'Exception recorded',
    };
  }
}
