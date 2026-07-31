import { Body, Controller, Get, Headers, Param, Post, Query, Req } from '@nestjs/common';
import { InsurerBffService } from './insurer-bff.service';

function extractToken(req: any): string {
  const auth = req?.headers?.authorization || '';
  return auth.startsWith('Bearer ') ? auth : '';
}

@Controller('insurer')
export class InsurerController {
  constructor(private readonly bff: InsurerBffService) {}

  private cid(headers: Record<string, any>): string {
    return headers['x-correlation-id'] || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // --- Products ---

  @Get('products')
  async listProducts(@Query('limit') limit: string = '50', @Query('offset') offset: string = '0', @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.listProducts(extractToken(req), { limit: +limit, offset: +offset });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('rate-tables')
  async listRateTables(@Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.listRateTables(extractToken(req));
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // --- Distribution agreements ---

  @Get('distribution-agreements')
  async listDistributionAgreements(@Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.listDistributionAgreements(extractToken(req));
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // --- RFQ ---

  @Get('rfqs')
  async listRfqs(@Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.listRfqs(extractToken(req));
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('rfqs/:rfqId/process')
  async processRfq(@Param('rfqId') rfqId: string, @Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.processRfq(extractToken(req), rfqId, body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // --- Claims ---

  @Get('claims')
  async listClaims(@Query('limit') limit: string = '50', @Query('offset') offset: string = '0', @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.listClaims(extractToken(req), { limit: +limit, offset: +offset });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('claims/:claimId/assign-loss-adjuster')
  async assignLossAdjuster(@Param('claimId') claimId: string, @Body() body: { lossAdjusterId: string }, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.assignLossAdjuster(extractToken(req), claimId, body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // --- Settlements ---

  @Get('settlements')
  async listSettlements(@Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.listSettlements(extractToken(req));
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // --- Broker performance ---

  @Get('broker-performance')
  async listBrokerPerformance(@Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.listBrokerPerformance(extractToken(req));
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // --- Regulatory reports ---

  @Get('regulatory-reports')
  async listRegulatoryReports(@Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.listRegulatoryReports(extractToken(req));
    return { success: true, data, correlationId: this.cid(headers) };
  }
}
