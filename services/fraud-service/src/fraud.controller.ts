import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { FraudService } from './fraud.service';

@Controller()
export class FraudController {
  constructor(private readonly fraudService: FraudService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  @Get('/health')
  health() {
    return { status: 'ok', service: 'fraud-service' };
  }

  @Post('/fraud/compute-score')
  async computeScore(@Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);

    if (!body?.claimId || !body?.claimNumber || !body?.lossType) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'claimId, claimNumber, lossType are required' },
        correlationId,
      };
    }

    const { score, signals, holdClaim, threshold } = await this.fraudService.computeScore({
      correlationId,
      claimId: body.claimId,
      claimNumber: body.claimNumber,
      lossType: body.lossType,
      policyId: body.policyId,
    });

    return {
      success: true,
      data: { claimId: body.claimId, score, signals, holdClaim, threshold },
      correlationId,
    };
  }

  @Post('/fraud/cases/:claimId/open')
  async openCase(@Headers() headers: Record<string, any>, @Param('claimId') claimId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);

    const fraudCase = await this.fraudService.openCase({
      correlationId,
      claimId,
      claimNumber: body?.claimNumber,
      score: body?.score,
      signals: body?.signals,
      notes: body?.notes,
      assignedTo: body?.assignedTo,
    });

    return {
      success: true,
      data: {
        fraudCaseId: fraudCase.fraudCaseId,
        claimId: fraudCase.claimId,
        status: fraudCase.status,
        holdClaim: fraudCase.holdClaim,
      },
      correlationId,
    };
  }

  @Post('/fraud/cases/:fraudCaseId/close')
  async closeCase(@Headers() headers: Record<string, any>, @Param('fraudCaseId') fraudCaseId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);

    if (!body?.resolution || !['confirmed', 'cleared'].includes(body.resolution)) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'resolution must be confirmed or cleared' },
        correlationId,
      };
    }

    const fraudCase = await this.fraudService.closeCase({
      correlationId,
      fraudCaseId,
      resolution: body.resolution,
      notes: body.notes,
    });

    if (!fraudCase) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: `Fraud case ${fraudCaseId} not found` },
        correlationId,
      };
    }

    return {
      success: true,
      data: {
        fraudCaseId: fraudCase.fraudCaseId,
        status: fraudCase.status,
        holdClaim: fraudCase.holdClaim,
      },
      correlationId,
    };
  }

  @Get('/fraud/cases')
  async listCases(
    @Headers() headers: Record<string, any>,
    @Query('status') status?: string,
    @Query('claimId') claimId?: string,
    @Query('limit') limit: string = '20',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);

    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);

    const { rows, total } = await this.fraudService.listCases({
      status,
      claimId,
      limit: Number.isFinite(lim) ? lim : 20,
      offset: Number.isFinite(off) ? off : 0,
    });

    return {
      success: true,
      data: rows,
      pagination: {
        total,
        limit: Number.isFinite(lim) ? lim : 20,
        offset: Number.isFinite(off) ? off : 0,
      },
      correlationId,
    };
  }
}
