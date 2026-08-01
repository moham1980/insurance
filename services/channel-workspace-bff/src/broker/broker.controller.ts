import { Body, Controller, Get, Headers, Param, Post, Query, Req } from '@nestjs/common';
import { ChannelBffService } from '../channel/channel-bff.service';

function extractToken(req: any): string {
  const auth = req?.headers?.authorization || '';
  return auth.startsWith('Bearer ') ? auth : '';
}

@Controller('broker')
export class BrokerController {
  constructor(private readonly bff: ChannelBffService) {}

  private cid(headers: Record<string, any>): string {
    return headers['x-correlation-id'] || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // --- Dashboard ---

  @Get('dashboard')
  async getDashboard(@Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.getBrokerOpsDashboard(extractToken(req));
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // --- Carrier agreements ---

  @Get('carrier-agreement')
  @Get('carrier-agreements')
  async listCarrierAgreements(@Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.listCarrierAgreements(extractToken(req));
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // --- Broker product offerings ---

  @Get('product-offerings')
  async listBrokerOfferings(
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Query('status') status?: string,
    @Req() req?: any,
    @Headers() headers?: Record<string, any>,
  ) {
    const data = await this.bff.listBrokerOfferings(extractToken(req), { limit: +limit, offset: +offset, status });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // --- Placements ---

  @Get('placements')
  async listPlacements(@Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.listPlacements(extractToken(req));
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // --- Settlements ---

  @Get('settlements')
  async listSettlements(@Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.listSettlements(extractToken(req));
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // --- Claim advocacy cases ---

  @Get('claim-advocacy-cases')
  async listClaimAdvocacyCases(@Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.listClaimAdvocacyCases(extractToken(req));
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // --- Sales Network: Partners ---

  @Get('partners')
  @Get('sales-network/partners')
  async listPartners(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('kind') kind?: string,
    @Query('status') status?: string,
    @Query('organizationId') organizationId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const data = await this.bff.listPartners(extractToken(req), {
      kind,
      status,
      organizationId,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('partners')
  @Post('sales-network/partners')
  async upsertPartner(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const data = await this.bff.upsertPartner(extractToken(req), body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // --- Sales Network: Contracts ---

  @Get('contracts')
  @Get('sales-network/contracts')
  async listContracts(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const data = await this.bff.listContracts(extractToken(req), {
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('contracts')
  @Post('sales-network/contracts')
  async createContract(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const data = await this.bff.createContract(extractToken(req), body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('contracts/:contractId')
  @Get('sales-network/contracts/:contractId')
  async getContract(@Req() req: any, @Headers() headers: Record<string, any>, @Param('contractId') contractId: string) {
    const data = await this.bff.getContract(extractToken(req), contractId);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('contracts/:contractId/terminate')
  @Post('sales-network/contracts/:contractId/terminate')
  async terminateContract(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('contractId') contractId: string,
    @Body() body: any,
  ) {
    const data = await this.bff.terminateContract(extractToken(req), contractId, body?.reason || '');
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // --- Sales Network: Ledger ---

  @Get('sales-network/ledger')
  async listLedger(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const data = await this.bff.listLedger(extractToken(req), {
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('sales-network/ledger/reconciliation')
  async getLedgerReconciliation(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('orgUnitId') orgUnitId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const data = await this.bff.getLedgerReconciliation(extractToken(req), { orgUnitId, fromDate, toDate });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // --- Sales Network: Sub-Agent Management ---

  @Get('sub-agents')
  async listSubAgentsTopLevel(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const brokerPartnerId = req?.user?.partnerId || req?.user?.orgUnitId || req?.user?.userId;
    const data = await this.bff.listSubAgents(extractToken(req), brokerPartnerId, {
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('sub-agents')
  async createSubAgentTopLevel(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Body() body: any,
  ) {
    const brokerPartnerId = req?.user?.partnerId || req?.user?.orgUnitId || req?.user?.userId;
    const data = await this.bff.createSubAgent(extractToken(req), brokerPartnerId, body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('sales-network/broker/:brokerPartnerId/sub-agents')
  async listSubAgents(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('brokerPartnerId') brokerPartnerId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const data = await this.bff.listSubAgents(extractToken(req), brokerPartnerId, {
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('sales-network/broker/:brokerPartnerId/sub-agents')
  async createSubAgent(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('brokerPartnerId') brokerPartnerId: string,
    @Body() body: any,
  ) {
    const data = await this.bff.createSubAgent(extractToken(req), brokerPartnerId, body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('sales-network/broker/:brokerPartnerId/sub-agents/:subAgentPartnerId/suspend')
  async suspendSubAgent(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('brokerPartnerId') brokerPartnerId: string,
    @Param('subAgentPartnerId') subAgentPartnerId: string,
  ) {
    const data = await this.bff.suspendSubAgent(extractToken(req), brokerPartnerId, subAgentPartnerId);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('sales-network/broker/:brokerPartnerId/sub-agents/:subAgentPartnerId/terminate')
  async terminateSubAgent(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('brokerPartnerId') brokerPartnerId: string,
    @Param('subAgentPartnerId') subAgentPartnerId: string,
  ) {
    const data = await this.bff.terminateSubAgent(extractToken(req), brokerPartnerId, subAgentPartnerId);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // --- Sales Network: Broker Dashboard ---

  @Get('sales-network/broker/:brokerPartnerId/dashboard')
  async getBrokerDashboard(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('brokerPartnerId') brokerPartnerId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const data = await this.bff.getBrokerDashboard(extractToken(req), brokerPartnerId, { fromDate, toDate });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // --- Sales Network: Distribution Agreements ---

  @Get('sales-network/agreements')
  async listDistributionAgreements(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('carrierOrganizationId') carrierOrganizationId?: string,
    @Query('distributorOrganizationId') distributorOrganizationId?: string,
    @Query('status') status?: string,
    @Query('agreementType') agreementType?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const data = await this.bff.listDistributionAgreements(extractToken(req), {
      carrierOrganizationId,
      distributorOrganizationId,
      status,
      agreementType,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('sales-network/agreements/:agreementId')
  async getDistributionAgreement(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('agreementId') agreementId: string,
  ) {
    const data = await this.bff.getDistributionAgreement(extractToken(req), agreementId);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('sales-network/agreements')
  async createDistributionAgreement(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const data = await this.bff.createDistributionAgreement(extractToken(req), body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('sales-network/agreements/:agreementId/activate')
  async activateDistributionAgreement(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('agreementId') agreementId: string,
  ) {
    const data = await this.bff.activateDistributionAgreement(extractToken(req), agreementId);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('sales-network/agreements/:agreementId/terminate')
  async terminateDistributionAgreement(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('agreementId') agreementId: string,
    @Body() body: any,
  ) {
    const data = await this.bff.terminateDistributionAgreement(extractToken(req), agreementId, body?.reason || '');
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // --- Sales Network: Commission Tiers ---

  @Get('sales-network/agreements/:agreementId/tiers')
  async listCommissionTiers(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('agreementId') agreementId: string,
  ) {
    const data = await this.bff.listCommissionTiers(extractToken(req), agreementId);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('sales-network/agreements/:agreementId/tiers')
  async createCommissionTier(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('agreementId') agreementId: string,
    @Body() body: any,
  ) {
    const data = await this.bff.createCommissionTier(extractToken(req), agreementId, body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('sales-network/tiers/:tierId/delete')
  async deleteCommissionTier(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('tierId') tierId: string,
  ) {
    const data = await this.bff.deleteCommissionTier(extractToken(req), tierId);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // --- Sales Network: Clawback Rules ---

  @Get('sales-network/agreements/:agreementId/clawback-rules')
  async listClawbackRules(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('agreementId') agreementId: string,
  ) {
    const data = await this.bff.listClawbackRules(extractToken(req), agreementId);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('sales-network/agreements/:agreementId/clawback-rules')
  async createClawbackRule(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('agreementId') agreementId: string,
    @Body() body: any,
  ) {
    const data = await this.bff.createClawbackRule(extractToken(req), agreementId, body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('sales-network/clawback-rules/:ruleId/delete')
  async deleteClawbackRule(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('ruleId') ruleId: string,
  ) {
    const data = await this.bff.deleteClawbackRule(extractToken(req), ruleId);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // --- Copilot chat proxy ---
  @Post('copilot/chat')
  async copilotChat(@Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.copilotChat(
      extractToken(req),
      body?.message,
      body?.conversationHistory,
    );
    return { success: true, data: data?.data ?? data, correlationId: this.cid(headers) };
  }
}
