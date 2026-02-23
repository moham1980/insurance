import { Controller, Get, Headers, Param, Query } from '@nestjs/common';
import { ReadModelService } from './readmodel.service';

@Controller()
export class ReadModelController {
  constructor(private readonly readModelService: ReadModelService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  @Get('/health')
  health() {
    return { status: 'ok', service: 'claims-readmodel-service' };
  }

  @Get('/rm/claims')
  async list(
    @Headers() headers: Record<string, any>,
    @Query('policyId') policyId?: string,
    @Query('status') status?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);

    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);

    const { rows, total } = await this.readModelService.listClaims({
      policyId,
      status,
      limit: Number.isFinite(lim) ? lim : 50,
      offset: Number.isFinite(off) ? off : 0,
    });

    return {
      success: true,
      data: rows,
      pagination: {
        total,
        limit: Number.isFinite(lim) ? lim : 50,
        offset: Number.isFinite(off) ? off : 0,
      },
      correlationId,
    };
  }

  @Get('/rm/claims/:claimId')
  async get(@Headers() headers: Record<string, any>, @Param('claimId') claimId: string) {
    const correlationId = this.getCorrelationId(headers);

    const row = await this.readModelService.getClaim(claimId);
    if (!row) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Not found' }, correlationId };
    }

    return { success: true, data: row, correlationId };
  }

  @Get('/rm/claims/summary')
  async summary(@Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);

    const data = await this.readModelService.getSummary();
    return { success: true, data, correlationId };
  }
}
