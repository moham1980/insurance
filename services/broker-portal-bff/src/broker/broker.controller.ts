import { Body, Controller, Get, Headers, Param, Post, Query, Req } from '@nestjs/common';
import { BrokerBffService } from './broker-bff.service';

function extractToken(req: any): string {
  const auth = req?.headers?.authorization || '';
  return auth.startsWith('Bearer ') ? auth : '';
}

@Controller('broker')
export class BrokerController {
  constructor(private readonly bff: BrokerBffService) {}

  private cid(headers?: Record<string, any>): string {
    return headers?.['x-correlation-id'] || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  @Get('dashboard')
  async dashboard(@Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.getDashboard(extractToken(req));
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('agreements')
  async listAgreements(
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Req() req?: any,
    @Headers() headers?: Record<string, any>,
  ) {
    const data = await this.bff.listAgreements(extractToken(req), { limit: +limit, offset: +offset });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('offerings')
  async listOfferings(
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Req() req?: any,
    @Headers() headers?: Record<string, any>,
  ) {
    const data = await this.bff.listOfferings(extractToken(req), { limit: +limit, offset: +offset });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('submissions')
  async listSubmissions(
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Req() req?: any,
    @Headers() headers?: Record<string, any>,
  ) {
    const data = await this.bff.listSubmissions(extractToken(req), { limit: +limit, offset: +offset });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('submissions/:submissionId')
  async getSubmission(@Param('submissionId') id: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.getSubmission(extractToken(req), id);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('quotes/:submissionId')
  async getQuotes(@Param('submissionId') id: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.getQuotes(extractToken(req), id);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('placements')
  async createPlacement(@Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.createPlacement(extractToken(req), body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('placements')
  async listPlacements(
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Query('status') status?: string,
    @Query('submissionId') submissionId?: string,
    @Req() req?: any,
    @Headers() headers?: Record<string, any>,
  ) {
    const data = await this.bff.listPlacements(extractToken(req), { limit: +limit, offset: +offset, status, submissionId });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('placements/:placementId')
  async getPlacement(@Param('placementId') id: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.getPlacement(extractToken(req), id);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('placements/:placementId/bind')
  async bindPlacement(@Param('placementId') id: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.bindPlacement(extractToken(req), id);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('placements/:placementId/retry')
  async retryPlacement(@Param('placementId') id: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.retryPlacement(extractToken(req), id);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('placements/:placementId/cancel')
  async cancelPlacement(@Param('placementId') id: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.cancelPlacement(extractToken(req), id);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('claims')
  async listClaims(
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Req() req?: any,
    @Headers() headers?: Record<string, any>,
  ) {
    const data = await this.bff.listClaims(extractToken(req), { limit: +limit, offset: +offset });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('claims/:claimId')
  async getClaim(@Param('claimId') id: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.getClaim(extractToken(req), id);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('claims/fnol')
  async createFnolClaim(@Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.createFnolClaim(extractToken(req), body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('claims/:claimId/assess')
  async assessClaim(@Param('claimId') id: string, @Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.assessClaim(extractToken(req), id, body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('claims/:claimId/approve')
  async approveClaim(@Param('claimId') id: string, @Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.approveClaim(extractToken(req), id, body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('claims/:claimId/reject')
  async rejectClaim(@Param('claimId') id: string, @Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.rejectClaim(extractToken(req), id, body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('claims/:claimId/communications')
  async addCommunication(@Param('claimId') id: string, @Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.addClaimCommunication(extractToken(req), id, body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('claims/:claimId/advocacy')
  async getClaimAdvocacy(@Param('claimId') id: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.getClaimAdvocacy(extractToken(req), id);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('claims/:claimId/advocacy-cases')
  async openAdvocacyCase(@Param('claimId') id: string, @Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.openAdvocacyCase(extractToken(req), id, body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('commissions')
  async listCommissions(
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Req() req?: any,
    @Headers() headers?: Record<string, any>,
  ) {
    const data = await this.bff.listCommissions(extractToken(req), { limit: +limit, offset: +offset });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('sub-agents')
  async listSubAgents(
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Req() req?: any,
    @Headers() headers?: Record<string, any>,
  ) {
    const data = await this.bff.listSubAgents(extractToken(req), { limit: +limit, offset: +offset });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('reports/broker-transactions')
  async brokerTransactionReports(
    @Query('periodId') periodId: string,
    @Req() req: any,
    @Headers() headers: Record<string, any>,
  ) {
    const data = await this.bff.getBrokerTransactionReport(extractToken(req), periodId);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // Issue 4.1: KYC proxy endpoints
  @Get('kyc/:partyId/status')
  async getKycStatus(@Param('partyId') partyId: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.getPartyKycStatus(extractToken(req), partyId);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('kyc/:partyId/history')
  async getKycHistory(
    @Param('partyId') partyId: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Req() req?: any,
    @Headers() headers?: Record<string, any>,
  ) {
    const data = await this.bff.getPartyKycHistory(extractToken(req), partyId, +limit, +offset);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('kyc/:partyId/broker-kyc/initiate')
  async initiateBrokerKyc(@Param('partyId') partyId: string, @Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.initiateBrokerKyc(extractToken(req), partyId, body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('kyc/:partyId/broker-kyc/check')
  async updateBrokerKycCheck(@Param('partyId') partyId: string, @Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.updateBrokerKycCheck(extractToken(req), partyId, body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('kyc/bulk-review')
  async bulkReviewKyc(@Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.bulkReviewKyc(extractToken(req), body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('kyc/:partyId/aml/commission-screening')
  async screenCommissionTransaction(@Param('partyId') partyId: string, @Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.screenCommissionTransaction(extractToken(req), partyId, body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('kyc/aml/settlement-batch-screening')
  async screenSettlementBatch(@Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.screenSettlementBatch(extractToken(req), body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('kyc/:partyId/cross-org-consent/grant')
  async grantCrossOrgConsent(@Param('partyId') partyId: string, @Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.grantCrossOrgConsent(extractToken(req), partyId, body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('kyc/:partyId/cross-org-consent/revoke')
  async revokeCrossOrgConsent(@Param('partyId') partyId: string, @Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.revokeCrossOrgConsent(extractToken(req), partyId, body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('kyc/:partyId/cross-org-consent/check')
  async checkCrossOrgConsent(
    @Param('partyId') partyId: string,
    @Query('targetOrganizationId') targetOrganizationId: string,
    @Query('consentType') consentType: string,
    @Req() req: any,
    @Headers() headers: Record<string, any>,
  ) {
    const data = await this.bff.checkCrossOrgConsent(extractToken(req), partyId, targetOrganizationId, consentType);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('kyc-exception/:exceptionId/escalate')
  async escalateKycException(@Param('exceptionId') exceptionId: string, @Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.escalateKycException(extractToken(req), exceptionId, body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('organizations/:organizationId/parties')
  async getPartiesByOrganization(
    @Param('organizationId') organizationId: string,
    @Query('roleType') roleType: string,
    @Query('status') status: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Req() req?: any,
    @Headers() headers?: Record<string, any>,
  ) {
    const data = await this.bff.getPartiesByOrganization(extractToken(req), organizationId, { roleType, status, limit: +limit, offset: +offset });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('parties')
  async createParty(@Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.createParty(extractToken(req), body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('parties/:partyId/link-organization')
  async linkPartyToOrganization(@Param('partyId') partyId: string, @Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.linkPartyToOrganization(extractToken(req), partyId, body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // Policy endpoints - broker access to policy-service
  @Get('policies')
  async listPolicies(
    @Query('distributionOrganizationId') distributionOrganizationId?: string,
    @Query('partyId') partyId?: string,
    @Query('uniqueCode') uniqueCode?: string,
    @Query('status') status?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Req() req?: any,
    @Headers() headers?: Record<string, any>,
  ) {
    const data = await this.bff.listPolicies(extractToken(req), { distributionOrganizationId, partyId, uniqueCode, status, limit: +limit, offset: +offset });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('policies/:policyId')
  async getPolicy(@Param('policyId') policyId: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.getPolicy(extractToken(req), policyId);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('policies/:policyId/details')
  async getPolicyDetails(@Param('policyId') policyId: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.getPolicyDetails(extractToken(req), policyId);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('policies/projections')
  async listPolicyProjections(
    @Query('brokerOrganizationId') brokerOrganizationId?: string,
    @Query('placementId') placementId?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Req() req?: any,
    @Headers() headers?: Record<string, any>,
  ) {
    const data = await this.bff.listPolicyProjections(extractToken(req), { brokerOrganizationId, placementId, limit: +limit, offset: +offset });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('policies/projections/:policyId')
  async getPolicyProjection(@Param('policyId') policyId: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.getPolicyProjection(extractToken(req), policyId);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('policies/quote')
  async requestQuote(@Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.requestQuote(extractToken(req), body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('policies/convert-quote')
  async convertQuote(@Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.convertQuote(extractToken(req), body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('policies/:policyId/endorse')
  async endorsePolicy(@Param('policyId') policyId: string, @Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.endorsePolicy(extractToken(req), policyId, body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('policies/:policyId/renew')
  async renewPolicy(@Param('policyId') policyId: string, @Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.renewPolicy(extractToken(req), policyId, body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('policies/:policyId/endorsements')
  async listPolicyEndorsements(
    @Param('policyId') policyId: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Req() req?: any,
    @Headers() headers?: Record<string, any>,
  ) {
    const data = await this.bff.listPolicyEndorsements(extractToken(req), policyId, +limit, +offset);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('policies/:policyId/history')
  async getPolicyHistory(
    @Param('policyId') policyId: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Req() req?: any,
    @Headers() headers?: Record<string, any>,
  ) {
    const data = await this.bff.getPolicyHistory(extractToken(req), policyId, +limit, +offset);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // Broker license validation proxy endpoints to regulatory-gateway-service
  @Post('regulatory/broker-license/validate')
  async validateBrokerLicense(@Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.validateBrokerLicense(extractToken(req), body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('regulatory/broker-license/validate-batch')
  async validateBrokerLicenseBatch(@Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.validateBrokerLicenseBatch(extractToken(req), body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('regulatory/broker-license/status-changes')
  async getLicenseStatusChanges(
    @Query('brokerCentralCode') brokerCentralCode?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Req() req?: any,
    @Headers() headers?: Record<string, any>,
  ) {
    const data = await this.bff.getLicenseStatusChanges(extractToken(req), brokerCentralCode, +limit, +offset);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('regulatory/sanhab/inquiry')
  async sanhabInquiry(@Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.sanhabInquiry(extractToken(req), body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('regulatory/warehouse-fire/inquire')
  async warehouseFireInquiry(@Body() body: any, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.warehouseFireInquiry(extractToken(req), body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('regulatory/warehouse-fire/history')
  async getWarehouseFireHistory(
    @Query('nationalId') nationalId?: string,
    @Query('licenseNumber') licenseNumber?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('inquiryType') inquiryType?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Req() req?: any,
    @Headers() headers?: Record<string, any>,
  ) {
    const data = await this.bff.getWarehouseFireHistory(extractToken(req), { nationalId, licenseNumber, warehouseId, inquiryType, limit: +limit, offset: +offset });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // Collections proxy endpoints
  @Get('collections/plans')
  async listCollectionsPlans(
    @Query('policyId') policyId?: string,
    @Query('status') status?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Req() req?: any,
    @Headers() headers?: Record<string, any>,
  ) {
    const data = await this.bff.listCollectionsPlans(extractToken(req), { policyId, status, limit: +limit, offset: +offset });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('collections/plans/:planId')
  async getCollectionsPlan(@Param('planId') planId: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.getCollectionsPlan(extractToken(req), planId);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('collections/plans/:planId/installments')
  async listCollectionsInstallments(@Param('planId') planId: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.listCollectionsInstallments(extractToken(req), planId);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('collections/installments/:installmentId')
  async getCollectionsInstallment(@Param('installmentId') installmentId: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.getCollectionsInstallment(extractToken(req), installmentId);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // Payments proxy endpoints
  @Get('payments')
  async listPayments(
    @Query('policyId') policyId?: string,
    @Query('claimId') claimId?: string,
    @Query('status') status?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Req() req?: any,
    @Headers() headers?: Record<string, any>,
  ) {
    const data = await this.bff.listPayments(extractToken(req), { policyId, claimId, status, limit: +limit, offset: +offset });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('payments/:paymentId')
  async getPayment(@Param('paymentId') paymentId: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.getPayment(extractToken(req), paymentId);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('payments/intents/:paymentIntentId')
  async getPaymentIntent(@Param('paymentIntentId') paymentIntentId: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.getPaymentIntent(extractToken(req), paymentIntentId);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // Underwriting proxy endpoints
  @Get('underwriting/requests')
  async listUnderwritingRequests(
    @Query('status') status?: string,
    @Query('policyId') policyId?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Req() req?: any,
    @Headers() headers?: Record<string, any>,
  ) {
    const data = await this.bff.listUnderwritingRequests(extractToken(req), { status, policyId, limit: +limit, offset: +offset });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('underwriting/requests/:id')
  async getUnderwritingRequest(@Param('id') id: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.getUnderwritingRequest(extractToken(req), id);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('underwriting/requests/:id/appeal')
  async appealUnderwritingDecision(
    @Param('id') id: string,
    @Body() body: { reason: string; additionalData?: Record<string, any> },
    @Req() req: any,
    @Headers() headers: Record<string, any>,
  ) {
    const data = await this.bff.appealUnderwritingDecision(extractToken(req), id, body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('underwriting/sla/metrics')
  async getUnderwritingSlaMetrics(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Req() req?: any,
    @Headers() headers?: Record<string, any>,
  ) {
    const data = await this.bff.getUnderwritingSlaMetrics(extractToken(req), { from, to });
    return { success: true, data, correlationId: this.cid(headers) };
  }
}
