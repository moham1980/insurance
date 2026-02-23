import { Body, Controller, Get, Headers, Post, Query, Res } from '@nestjs/common';
import { RegulatoryService } from './regulatory.service';
import type { SanhabSimulateBody, SanhabWebhookBody } from './regulatory.service';

@Controller()
export class RegulatoryController {
  constructor(private readonly regulatoryService: RegulatoryService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  @Get('/health')
  health() {
    return { status: 'ok', service: 'regulatory-gateway-service' };
  }

  @Post('/reg/sanhab/webhook')
  async webhook(@Headers() headers: Record<string, any>, @Body() body: SanhabWebhookBody, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);

    const normalizedHeaders = Object.fromEntries(
      Object.entries(headers || {}).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : String(v)])
    ) as Record<string, string>;

    const { status, result } = await this.regulatoryService.handleWebhook({
      correlationId,
      body,
      headers: normalizedHeaders,
    });

    res.status(status).json(result);
  }

  @Post('/reg/sanhab/simulate')
  async simulate(@Headers() headers: Record<string, any>, @Body() body: SanhabSimulateBody, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);

    const { status, result } = await this.regulatoryService.simulate({ correlationId, body });
    res.status(status).json(result);
  }

  @Get('/reg/sanhab/events')
  async list(
    @Headers() headers: Record<string, any>,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Query('eventType') eventType?: string
  ) {
    const correlationId = this.getCorrelationId(headers);

    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);

    return this.regulatoryService.listEvents({
      correlationId,
      limit: Number.isFinite(lim) ? lim : 50,
      offset: Number.isFinite(off) ? off : 0,
      eventType,
    });
  }
}
