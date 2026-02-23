import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ClaimsService } from './claims.service';

@Controller()
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  @Get('/health')
  health() {
    return { status: 'ok', service: 'claims-service' };
  }

  @Post('/claims')
  async createClaim(
    @Headers() headers: Record<string, any>,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);

    if (!body?.policyId || !body?.claimantPartyId || !body?.lossDate || !body?.lossType) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: policyId, claimantPartyId, lossDate, lossType',
        },
        correlationId,
      };
    }

    const claim = await this.claimsService.createClaim({
      correlationId,
      policyId: body.policyId,
      claimantPartyId: body.claimantPartyId,
      lossDate: body.lossDate,
      lossType: body.lossType,
      description: body.description,
    });

    return {
      success: true,
      data: {
        claimId: claim.claimId,
        claimNumber: claim.claimNumber,
        status: claim.status,
        createdAt: claim.createdAt,
      },
      correlationId,
    };
  }

  @Post('/claims/:claimId/assess')
  async assess(@Headers() headers: Record<string, any>, @Param('claimId') claimId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    if (typeof body?.assessedAmount !== 'number') {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'assessedAmount is required (number)' }, correlationId };
    }

    const claim = await this.claimsService.assessClaim({ correlationId, claimId, assessedAmount: body.assessedAmount });
    if (!claim) {
      return { success: false, error: { code: 'NOT_FOUND', message: `Claim with ID ${claimId} not found` }, correlationId };
    }

    return { success: true, data: { claimId, status: claim.status }, correlationId };
  }

  @Post('/claims/:claimId/approve')
  async approve(@Headers() headers: Record<string, any>, @Param('claimId') claimId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    if (typeof body?.approvedAmount !== 'number') {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'approvedAmount is required (number)' }, correlationId };
    }

    const claim = await this.claimsService.approveClaim({ correlationId, claimId, approvedAmount: body.approvedAmount });
    if (!claim) {
      return { success: false, error: { code: 'NOT_FOUND', message: `Claim with ID ${claimId} not found` }, correlationId };
    }

    return { success: true, data: { claimId, status: claim.status }, correlationId };
  }

  @Post('/claims/:claimId/reject')
  async reject(@Headers() headers: Record<string, any>, @Param('claimId') claimId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    if (!body?.reason) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'reason is required (string)' }, correlationId };
    }

    const claim = await this.claimsService.rejectClaim({ correlationId, claimId, reason: body.reason });
    if (!claim) {
      return { success: false, error: { code: 'NOT_FOUND', message: `Claim with ID ${claimId} not found` }, correlationId };
    }

    return { success: true, data: { claimId, status: claim.status }, correlationId };
  }

  @Post('/claims/:claimId/pay')
  async pay(@Headers() headers: Record<string, any>, @Param('claimId') claimId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    if (typeof body?.paidAmount !== 'number') {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'paidAmount is required (number)' }, correlationId };
    }

    const claim = await this.claimsService.payClaim({ correlationId, claimId, paidAmount: body.paidAmount });
    if (!claim) {
      return { success: false, error: { code: 'NOT_FOUND', message: `Claim with ID ${claimId} not found` }, correlationId };
    }

    return { success: true, data: { claimId, status: claim.status }, correlationId };
  }

  @Post('/claims/:claimId/close')
  async close(@Headers() headers: Record<string, any>, @Param('claimId') claimId: string) {
    const correlationId = this.getCorrelationId(headers);

    const claim = await this.claimsService.closeClaim({ correlationId, claimId });
    if (!claim) {
      return { success: false, error: { code: 'NOT_FOUND', message: `Claim with ID ${claimId} not found` }, correlationId };
    }

    return { success: true, data: { claimId, status: claim.status }, correlationId };
  }

  @Get('/claims/:claimId')
  async get(@Headers() headers: Record<string, any>, @Param('claimId') claimId: string) {
    const correlationId = this.getCorrelationId(headers);
    const claim = await this.claimsService.getClaim(claimId);
    if (!claim) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: `Claim with ID ${claimId} not found` },
        correlationId,
      };
    }

    return { success: true, data: claim, correlationId };
  }

  @Get('/claims')
  async list(
    @Headers() headers: Record<string, any>,
    @Query('policyId') policyId?: string,
    @Query('status') status?: string,
    @Query('limit') limit: string = '20',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);

    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);

    const { rows, total } = await this.claimsService.listClaims({
      policyId,
      status,
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
