import { Controller, Get, Post, Body, Headers } from '@nestjs/common';
import { OtelService } from './otel.service';

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
  async addAttributes(@Body() body: { attributes: Record<string, any> }) {
    this.otelService.addAttributes(body.attributes);
    return {
      success: true,
      message: 'Attributes added to active span',
    };
  }

  @Post('event')
  async addEvent(@Body() body: { name: string; attributes?: Record<string, any> }) {
    this.otelService.addEvent(body.name, body.attributes);
    return {
      success: true,
      message: 'Event added to active span',
    };
  }

  @Post('exception')
  async recordException(@Body() body: { error: string; stack?: string }) {
    const error = new Error(body.error);
    if (body.stack) {
      error.stack = body.stack;
    }
    this.otelService.recordException(error);
    return {
      success: true,
      message: 'Exception recorded',
    };
  }
}
