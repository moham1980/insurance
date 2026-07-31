import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class BrokerBffService {
  private readonly logger = new Logger(BrokerBffService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private serviceUrl(name: string): string {
    const envKey = `${name.toUpperCase().replace(/-/g, '_')}_URL`;
    return this.config.get<string>(envKey) || `http://localhost:8080`;
  }

  private async get(token: string, path: string) {
    try {
      const res = await firstValueFrom(
        this.http.get(path, {
          headers: token ? { Authorization: token } : undefined,
        }),
      );
      return res.data?.data ?? res.data;
    } catch (error: any) {
      this.logger.error(`GET ${path} failed: ${error.message}`);
      throw error;
    }
  }

  private async post(token: string, path: string, body: any) {
    try {
      const res = await firstValueFrom(
        this.http.post(path, body, {
          headers: token ? { Authorization: token } : undefined,
        }),
      );
      return res.data?.data ?? res.data;
    } catch (error: any) {
      this.logger.error(`POST ${path} failed: ${error.message}`);
      throw error;
    }
  }

  getDashboard(token: string) {
    return this.get(token, `${this.serviceUrl('submission-placement-service')}/api/v1/broker/dashboard`);
  }

  listAgreements(token: string, pagination: { limit: number; offset: number }) {
    return this.get(token, `${this.serviceUrl('sales-network-service')}/api/v1/distribution-agreements?limit=${pagination.limit}&offset=${pagination.offset}`);
  }

  listOfferings(token: string, pagination: { limit: number; offset: number }) {
    return this.get(token, `${this.serviceUrl('product-service')}/api/v1/broker-product-offerings?limit=${pagination.limit}&offset=${pagination.offset}&status=active`);
  }

  listSubmissions(token: string, pagination: { limit: number; offset: number }) {
    return this.get(token, `${this.serviceUrl('submission-placement-service')}/api/v1/submissions?limit=${pagination.limit}&offset=${pagination.offset}`);
  }

  getSubmission(token: string, id: string) {
    return this.get(token, `${this.serviceUrl('submission-placement-service')}/api/v1/submissions/${id}`);
  }

  getQuotes(token: string, submissionId: string) {
    return this.get(token, `${this.serviceUrl('submission-placement-service')}/api/v1/submissions/${submissionId}/quotes`);
  }

  createPlacement(token: string, body: any) {
    return this.post(token, `${this.serviceUrl('submission-placement-service')}/api/v1/placements`, body);
  }

  listPlacements(token: string, params: { limit: number; offset: number; status?: string; submissionId?: string }) {
    let query = `limit=${params.limit}&offset=${params.offset}`;
    if (params.status) query += `&status=${params.status}`;
    if (params.submissionId) query += `&submissionId=${params.submissionId}`;
    return this.get(token, `${this.serviceUrl('submission-placement-service')}/api/v1/placements?${query}`);
  }

  getPlacement(token: string, id: string) {
    return this.get(token, `${this.serviceUrl('submission-placement-service')}/api/v1/placements/${id}`);
  }

  bindPlacement(token: string, id: string) {
    return this.post(token, `${this.serviceUrl('submission-placement-service')}/api/v1/placements/${id}/bind`, {});
  }

  retryPlacement(token: string, id: string) {
    return this.post(token, `${this.serviceUrl('submission-placement-service')}/api/v1/placements/${id}/retry`, {});
  }

  cancelPlacement(token: string, id: string) {
    return this.post(token, `${this.serviceUrl('submission-placement-service')}/api/v1/placements/${id}/cancel`, {});
  }

  listClaims(token: string, pagination: { limit: number; offset: number }) {
    return this.get(token, `${this.serviceUrl('claims-service')}/api/v1/advocacy-cases?limit=${pagination.limit}&offset=${pagination.offset}`);
  }

  getClaim(token: string, id: string) {
    return this.get(token, `${this.serviceUrl('claims-service')}/api/v1/advocacy-cases/${id}`);
  }

  addClaimCommunication(token: string, id: string, body: any) {
    return this.post(token, `${this.serviceUrl('claims-service')}/api/v1/advocacy-cases/${id}/communications`, body);
  }

  createFnolClaim(token: string, body: any) {
    return this.post(token, `${this.serviceUrl('claims-service')}/api/v1/claims/fnol`, body);
  }

  assessClaim(token: string, id: string, body: any) {
    return this.post(token, `${this.serviceUrl('claims-service')}/api/v1/claims/${id}/assess`, body);
  }

  approveClaim(token: string, id: string, body: any) {
    return this.post(token, `${this.serviceUrl('claims-service')}/api/v1/claims/${id}/approve`, body);
  }

  rejectClaim(token: string, id: string, body: any) {
    return this.post(token, `${this.serviceUrl('claims-service')}/api/v1/claims/${id}/reject`, body);
  }

  getClaimAdvocacy(token: string, id: string) {
    return this.get(token, `${this.serviceUrl('claims-service')}/api/v1/claims/${id}/advocacy-cases`);
  }

  openAdvocacyCase(token: string, id: string, body: any) {
    return this.post(token, `${this.serviceUrl('claims-service')}/api/v1/claims/${id}/advocacy-cases`, body);
  }

  listCommissions(token: string, pagination: { limit: number; offset: number }) {
    return this.get(token, `${this.serviceUrl('billing-service')}/api/v1/commissions?limit=${pagination.limit}&offset=${pagination.offset}`);
  }

  listSubAgents(token: string, pagination: { limit: number; offset: number }) {
    return this.get(token, `${this.serviceUrl('sales-network-service')}/api/v1/parties?role=sub_agent&limit=${pagination.limit}&offset=${pagination.offset}`);
  }

  getBrokerTransactionReport(token: string, periodId: string) {
    return this.get(token, `${this.serviceUrl('reporting-service')}/api/v1/broker-reports?periodId=${periodId}`);
  }

  // Issue 4.1: KYC proxy endpoints to party-kyc-service
  private partyKycUrl(): string {
    return this.config.get<string>('PARTY_KYC_SERVICE_URL') || 'http://localhost:18006';
  }

  getPartyKycStatus(token: string, partyId: string) {
    return this.get(token, `${this.partyKycUrl()}/api/v1/party/${partyId}/kyc`);
  }

  getPartyKycHistory(token: string, partyId: string, limit: number, offset: number) {
    return this.get(token, `${this.partyKycUrl()}/api/v1/party/${partyId}/kyc-history?limit=${limit}&offset=${offset}`);
  }

  initiateBrokerKyc(token: string, partyId: string, body: any) {
    return this.post(token, `${this.partyKycUrl()}/api/v1/party/${partyId}/broker-kyc/initiate`, body);
  }

  updateBrokerKycCheck(token: string, partyId: string, body: any) {
    return this.post(token, `${this.partyKycUrl()}/api/v1/party/${partyId}/broker-kyc/check`, body);
  }

  bulkReviewKyc(token: string, body: any) {
    return this.post(token, `${this.partyKycUrl()}/api/v1/kyc/bulk-review`, body);
  }

  screenCommissionTransaction(token: string, partyId: string, body: any) {
    return this.post(token, `${this.partyKycUrl()}/api/v1/party/${partyId}/aml/commission-screening`, body);
  }

  screenSettlementBatch(token: string, body: any) {
    return this.post(token, `${this.partyKycUrl()}/api/v1/aml/settlement-batch-screening`, body);
  }

  grantCrossOrgConsent(token: string, partyId: string, body: any) {
    return this.post(token, `${this.partyKycUrl()}/api/v1/party/${partyId}/cross-org-consent/grant`, body);
  }

  revokeCrossOrgConsent(token: string, partyId: string, body: any) {
    return this.post(token, `${this.partyKycUrl()}/api/v1/party/${partyId}/cross-org-consent/revoke`, body);
  }

  checkCrossOrgConsent(token: string, partyId: string, targetOrganizationId: string, consentType?: string) {
    const params = consentType ? `&consentType=${consentType}` : '';
    return this.get(token, `${this.partyKycUrl()}/api/v1/party/${partyId}/cross-org-consent/check?targetOrganizationId=${targetOrganizationId}${params}`);
  }

  escalateKycException(token: string, exceptionId: string, body: any) {
    return this.post(token, `${this.partyKycUrl()}/api/v1/kyc-exception/${exceptionId}/escalate-to-organization`, body);
  }

  getPartiesByOrganization(token: string, organizationId: string, params: { roleType?: string; status?: string; limit?: number; offset?: number }) {
    let query = `limit=${params.limit || 50}&offset=${params.offset || 0}`;
    if (params.roleType) query += `&roleType=${params.roleType}`;
    if (params.status) query += `&status=${params.status}`;
    return this.get(token, `${this.partyKycUrl()}/api/v1/organizations/${organizationId}/parties?${query}`);
  }

  createParty(token: string, body: any) {
    return this.post(token, `${this.partyKycUrl()}/api/v1/parties`, body);
  }

  linkPartyToOrganization(token: string, partyId: string, body: any) {
    return this.post(token, `${this.partyKycUrl()}/api/v1/party/${partyId}/link-organization`, body);
  }

  // Policy endpoints - broker access to policy-service
  private policyServiceUrl(): string {
    return this.config.get<string>('POLICY_SERVICE_URL') || 'http://localhost:8086';
  }

  listPolicies(token: string, params: { distributionOrganizationId?: string; partyId?: string; uniqueCode?: string; status?: string; limit?: number; offset?: number }) {
    let query = `limit=${params.limit || 50}&offset=${params.offset || 0}`;
    if (params.distributionOrganizationId) query += `&distributionOrganizationId=${params.distributionOrganizationId}`;
    if (params.partyId) query += `&partyId=${params.partyId}`;
    if (params.uniqueCode) query += `&uniqueCode=${params.uniqueCode}`;
    if (params.status) query += `&status=${params.status}`;
    return this.get(token, `${this.policyServiceUrl()}/api/v1/policies?${query}`);
  }

  getPolicy(token: string, policyId: string) {
    return this.get(token, `${this.policyServiceUrl()}/api/v1/policies/${policyId}`);
  }

  getPolicyDetails(token: string, policyId: string) {
    return this.get(token, `${this.policyServiceUrl()}/api/v1/policies/${policyId}/details`);
  }

  listPolicyProjections(token: string, params: { brokerOrganizationId?: string; placementId?: string; limit?: number; offset?: number }) {
    let query = `limit=${params.limit || 50}&offset=${params.offset || 0}`;
    if (params.brokerOrganizationId) query += `&brokerOrganizationId=${params.brokerOrganizationId}`;
    if (params.placementId) query += `&placementId=${params.placementId}`;
    return this.get(token, `${this.policyServiceUrl()}/api/v1/policies/projections?${query}`);
  }

  getPolicyProjection(token: string, policyId: string) {
    return this.get(token, `${this.policyServiceUrl()}/api/v1/policies/projections/${policyId}`);
  }

  requestQuote(token: string, body: any) {
    return this.post(token, `${this.policyServiceUrl()}/api/v1/policies/quote`, body);
  }

  convertQuote(token: string, body: any) {
    return this.post(token, `${this.policyServiceUrl()}/api/v1/policies/convert-quote`, body);
  }

  endorsePolicy(token: string, policyId: string, body: any) {
    return this.post(token, `${this.policyServiceUrl()}/api/v1/policies/${policyId}/endorse`, body);
  }

  renewPolicy(token: string, policyId: string, body: any) {
    return this.post(token, `${this.policyServiceUrl()}/api/v1/policies/${policyId}/renew`, body);
  }

  listPolicyEndorsements(token: string, policyId: string, limit: number, offset: number) {
    return this.get(token, `${this.policyServiceUrl()}/api/v1/policies/${policyId}/endorsements?limit=${limit}&offset=${offset}`);
  }

  getPolicyHistory(token: string, policyId: string, limit: number, offset: number) {
    return this.get(token, `${this.policyServiceUrl()}/api/v1/policies/${policyId}/history?limit=${limit}&offset=${offset}`);
  }

  // Regulatory gateway proxy endpoints
  private regulatoryGatewayUrl(): string {
    return this.config.get<string>('REGULATORY_GATEWAY_SERVICE_URL') || 'http://localhost:8084';
  }

  validateBrokerLicense(token: string, body: any) {
    return this.post(token, `${this.regulatoryGatewayUrl()}/reg/broker-license/validate`, body);
  }

  validateBrokerLicenseBatch(token: string, body: any) {
    return this.post(token, `${this.regulatoryGatewayUrl()}/reg/broker-license/validate-batch`, body);
  }

  getLicenseStatusChanges(token: string, brokerCentralCode?: string, limit: number = 50, offset: number = 0) {
    let query = `limit=${limit}&offset=${offset}`;
    if (brokerCentralCode) query += `&brokerCentralCode=${brokerCentralCode}`;
    return this.get(token, `${this.regulatoryGatewayUrl()}/reg/broker-license/status-changes?${query}`);
  }

  sanhabInquiry(token: string, body: any) {
    return this.post(token, `${this.regulatoryGatewayUrl()}/reg/sanhab/inquiry`, body);
  }

  warehouseFireInquiry(token: string, body: any) {
    return this.post(token, `${this.regulatoryGatewayUrl()}/reg/warehouse-fire/inquire`, body);
  }

  getWarehouseFireHistory(token: string, params: { nationalId?: string; licenseNumber?: string; warehouseId?: string; inquiryType?: string; limit?: number; offset?: number }) {
    let query = `limit=${params.limit || 50}&offset=${params.offset || 0}`;
    if (params.nationalId) query += `&nationalId=${params.nationalId}`;
    if (params.licenseNumber) query += `&licenseNumber=${params.licenseNumber}`;
    if (params.warehouseId) query += `&warehouseId=${params.warehouseId}`;
    if (params.inquiryType) query += `&inquiryType=${params.inquiryType}`;
    return this.get(token, `${this.regulatoryGatewayUrl()}/reg/warehouse-fire/history?${query}`);
  }

  // Collections proxy endpoints
  private collectionsServiceUrl(): string {
    return this.config.get<string>('COLLECTIONS_SERVICE_URL') || 'http://localhost:8010';
  }

  listCollectionsPlans(token: string, params: { policyId?: string; status?: string; limit?: number; offset?: number }) {
    let query = `limit=${params.limit || 50}&offset=${params.offset || 0}`;
    if (params.policyId) query += `&policyId=${params.policyId}`;
    if (params.status) query += `&status=${params.status}`;
    return this.get(token, `${this.collectionsServiceUrl()}/collections/plans?${query}`);
  }

  getCollectionsPlan(token: string, planId: string) {
    return this.get(token, `${this.collectionsServiceUrl()}/collections/plans/${planId}`);
  }

  listCollectionsInstallments(token: string, planId: string) {
    return this.get(token, `${this.collectionsServiceUrl()}/collections/plans/${planId}/installments`);
  }

  getCollectionsInstallment(token: string, installmentId: string) {
    return this.get(token, `${this.collectionsServiceUrl()}/collections/installments/${installmentId}`);
  }

  // Payments proxy endpoints
  private paymentsServiceUrl(): string {
    return this.config.get<string>('PAYMENTS_SERVICE_URL') || 'http://localhost:8011';
  }

  listPayments(token: string, params: { policyId?: string; claimId?: string; status?: string; limit?: number; offset?: number }) {
    let query = `limit=${params.limit || 50}&offset=${params.offset || 0}`;
    if (params.policyId) query += `&policyId=${params.policyId}`;
    if (params.claimId) query += `&claimId=${params.claimId}`;
    if (params.status) query += `&status=${params.status}`;
    return this.get(token, `${this.paymentsServiceUrl()}/payments?${query}`);
  }

  getPayment(token: string, paymentId: string) {
    return this.get(token, `${this.paymentsServiceUrl()}/payments/${paymentId}`);
  }

  getPaymentIntent(token: string, paymentIntentId: string) {
    return this.get(token, `${this.paymentsServiceUrl()}/payments/intents/${paymentIntentId}`);
  }

  // Underwriting proxy endpoints
  private underwritingServiceUrl(): string {
    return this.config.get<string>('UNDERWRITING_SERVICE_URL') || 'http://localhost:8012';
  }

  listUnderwritingRequests(token: string, params: { status?: string; policyId?: string; limit?: number; offset?: number }) {
    let query = `limit=${params.limit || 50}&offset=${params.offset || 0}`;
    if (params.status) query += `&status=${params.status}`;
    if (params.policyId) query += `&policyId=${params.policyId}`;
    return this.get(token, `${this.underwritingServiceUrl()}/underwriting/requests?${query}`);
  }

  getUnderwritingRequest(token: string, id: string) {
    return this.get(token, `${this.underwritingServiceUrl()}/underwriting/requests/${id}`);
  }

  appealUnderwritingDecision(token: string, id: string, body: { reason: string; additionalData?: Record<string, any> }) {
    return this.post(token, `${this.underwritingServiceUrl()}/underwriting/requests/${id}/appeal`, body);
  }

  getUnderwritingSlaMetrics(token: string, params: { from?: string; to?: string }) {
    let query = '';
    if (params.from) query += `from=${params.from}`;
    if (params.to) query += `${query ? '&' : ''}to=${params.to}`;
    return this.get(token, `${this.underwritingServiceUrl()}/underwriting/sla/metrics${query ? '?' + query : ''}`);
  }
}
