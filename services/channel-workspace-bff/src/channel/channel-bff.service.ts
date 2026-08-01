import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ChannelBffService {
  private readonly logger = new Logger(ChannelBffService.name);

  private readonly authUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:18001';
  private readonly policyUrl = process.env.POLICY_SERVICE_URL || 'http://localhost:18007';
  private readonly claimUrl = process.env.CLAIM_SERVICE_URL || 'http://localhost:18002';
  private readonly billingUrl = process.env.BILLING_SERVICE_URL || 'http://localhost:18039';
  private readonly salesNetworkUrl = process.env.SALES_NETWORK_SERVICE_URL || 'http://localhost:18022';
  private readonly productUrl = process.env.PRODUCT_SERVICE_URL || 'http://localhost:18018';
  private readonly submissionPlacementUrl = process.env.SUBMISSION_PLACEMENT_SERVICE_URL || 'http://localhost:18005';

  constructor(private readonly http: HttpService) {}

  private authHeaders(authToken: string): Record<string, string> {
    return {
      Authorization: authToken,
      'Content-Type': 'application/json',
      'x-correlation-id': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  // --- Channel workspace ---

  async listWorkspaces(authToken: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.authUrl}/api/v1/workspaces`, { headers: this.authHeaders(authToken) }),
    );
    return data;
  }

  async getWorkspace(authToken: string, workspaceId: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.authUrl}/api/v1/workspaces/${workspaceId}`, { headers: this.authHeaders(authToken) }),
    );
    return data;
  }

  async getMyWorkspaces(authToken: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.authUrl}/api/v1/me/workspaces`, { headers: this.authHeaders(authToken) }),
    );
    return data;
  }

  // --- Offerings & products ---

  async listOfferings(authToken: string, params?: { limit?: number; offset?: number }) {
    const query: Record<string, string> = {};
    if (params?.limit) query.limit = String(params.limit);
    if (params?.offset) query.offset = String(params.offset);
    const { data } = await firstValueFrom(
      this.http.get(`${this.productUrl}/api/v1/broker-product-offerings`, {
        headers: this.authHeaders(authToken),
        params: query,
      }),
    );
    return data;
  }

  // --- Submissions & RFQ ---

  async listSubmissions(authToken: string, params?: { limit?: number; offset?: number }) {
    const query: Record<string, string> = {};
    if (params?.limit) query.limit = String(params.limit);
    if (params?.offset) query.offset = String(params.offset);
    const { data } = await firstValueFrom(
      this.http.get(`${this.policyUrl}/api/v1/submissions`, {
        headers: this.authHeaders(authToken),
        params: query,
      }),
    );
    return data;
  }

  async createSubmission(authToken: string, body: any) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.policyUrl}/api/v1/submissions`, body, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async compareQuotes(authToken: string, submissionId: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.submissionPlacementUrl}/api/v1/submissions/${submissionId}/quotes`, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  // --- Commissions & statements ---

  async listCommissions(authToken: string, params?: { limit?: number; offset?: number }) {
    const query: Record<string, string> = {};
    if (params?.limit) query.limit = String(params.limit);
    if (params?.offset) query.offset = String(params.offset);
    const { data } = await firstValueFrom(
      this.http.get(`${this.billingUrl}/api/v1/commissions`, {
        headers: this.authHeaders(authToken),
        params: query,
      }),
    );
    return data;
  }

  // --- Customers & leads ---

  async listCustomers(authToken: string, params?: { limit?: number; offset?: number }) {
    const query: Record<string, string> = {};
    if (params?.limit) query.limit = String(params.limit);
    if (params?.offset) query.offset = String(params.offset);
    const { data } = await firstValueFrom(
      this.http.get(`${this.authUrl}/api/v1/parties`, {
        headers: this.authHeaders(authToken),
        params: query,
      }),
    );
    return data;
  }

  // --- Broker operations ---

  async listCarrierAgreements(authToken: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.policyUrl}/api/v1/carrier-agreements`, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async listBrokerOfferings(authToken: string, params?: { limit?: number; offset?: number; status?: string }) {
    const query: Record<string, string> = {};
    if (params?.limit) query.limit = String(params.limit);
    if (params?.offset) query.offset = String(params.offset);
    query.status = params?.status || 'active';
    const { data } = await firstValueFrom(
      this.http.get(`${this.productUrl}/api/v1/broker-product-offerings`, {
        headers: this.authHeaders(authToken),
        params: query,
      }),
    );
    return data;
  }

  async listPlacements(authToken: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.policyUrl}/api/v1/placements`, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async listSettlements(authToken: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.billingUrl}/api/v1/settlements`, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async listClaimAdvocacyCases(authToken: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.claimUrl}/api/v1/claim-advocacy-cases`, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  // --- Sales Network: Partner & Contract Management ---

  async listPartners(authToken: string, params?: { kind?: string; status?: string; organizationId?: string; limit?: number; offset?: number }) {
    const query: Record<string, string> = {};
    if (params?.kind) query.kind = params.kind;
    if (params?.status) query.status = params.status;
    if (params?.organizationId) query.organizationId = params.organizationId;
    if (params?.limit) query.limit = String(params.limit);
    if (params?.offset) query.offset = String(params.offset);
    const { data } = await firstValueFrom(
      this.http.get(`${this.salesNetworkUrl}/sales-network/partners`, {
        headers: this.authHeaders(authToken),
        params: query,
      }),
    );
    return data;
  }

  async upsertPartner(authToken: string, body: any) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.salesNetworkUrl}/sales-network/partners`, body, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async listContracts(authToken: string, params?: { status?: string; limit?: number; offset?: number }) {
    const query: Record<string, string> = {};
    if (params?.status) query.status = params.status;
    if (params?.limit) query.limit = String(params.limit);
    if (params?.offset) query.offset = String(params.offset);
    const { data } = await firstValueFrom(
      this.http.get(`${this.salesNetworkUrl}/sales-network/contracts`, {
        headers: this.authHeaders(authToken),
        params: query,
      }),
    );
    return data;
  }

  async createContract(authToken: string, body: any) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.salesNetworkUrl}/sales-network/contracts`, body, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async getContract(authToken: string, contractId: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.salesNetworkUrl}/sales-network/contracts/${contractId}`, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async terminateContract(authToken: string, contractId: string, reason: string) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.salesNetworkUrl}/sales-network/contracts/${contractId}/terminate`, { reason }, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async listLedger(authToken: string, params?: { status?: string; limit?: number; offset?: number }) {
    const query: Record<string, string> = {};
    if (params?.status) query.status = params.status;
    if (params?.limit) query.limit = String(params.limit);
    if (params?.offset) query.offset = String(params.offset);
    const { data } = await firstValueFrom(
      this.http.get(`${this.salesNetworkUrl}/sales-network/ledger`, {
        headers: this.authHeaders(authToken),
        params: query,
      }),
    );
    return data;
  }

  async getLedgerReconciliation(authToken: string, params?: { orgUnitId?: string; fromDate?: string; toDate?: string }) {
    const query: Record<string, string> = {};
    if (params?.orgUnitId) query.orgUnitId = params.orgUnitId;
    if (params?.fromDate) query.fromDate = params.fromDate;
    if (params?.toDate) query.toDate = params.toDate;
    const { data } = await firstValueFrom(
      this.http.get(`${this.salesNetworkUrl}/sales-network/ledger/reconciliation`, {
        headers: this.authHeaders(authToken),
        params: query,
      }),
    );
    return data;
  }

  // --- Sales Network: Broker Sub-Agent Management ---

  async listSubAgents(authToken: string, brokerPartnerId: string, params?: { status?: string; limit?: number; offset?: number }) {
    const query: Record<string, string> = {};
    if (params?.status) query.status = params.status;
    if (params?.limit) query.limit = String(params.limit);
    if (params?.offset) query.offset = String(params.offset);
    const { data } = await firstValueFrom(
      this.http.get(`${this.salesNetworkUrl}/sales-network/broker/${brokerPartnerId}/sub-agents`, {
        headers: this.authHeaders(authToken),
        params: query,
      }),
    );
    return data;
  }

  async createSubAgent(authToken: string, brokerPartnerId: string, body: any) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.salesNetworkUrl}/sales-network/broker/${brokerPartnerId}/sub-agents`, body, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async suspendSubAgent(authToken: string, brokerPartnerId: string, subAgentPartnerId: string) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.salesNetworkUrl}/sales-network/broker/${brokerPartnerId}/sub-agents/${subAgentPartnerId}/suspend`, {}, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async terminateSubAgent(authToken: string, brokerPartnerId: string, subAgentPartnerId: string) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.salesNetworkUrl}/sales-network/broker/${brokerPartnerId}/sub-agents/${subAgentPartnerId}/terminate`, {}, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  // --- Dashboard ---

  async getChannelDashboard(authToken: string) {
    const stats: Record<string, any> = {};
    try {
      const ws = await this.listWorkspaces(authToken);
      stats.workspaces = Array.isArray(ws) ? ws.length : ws?.total ?? 0;
    } catch { stats.workspaces = 0; }
    try {
      const offerings = await this.listOfferings(authToken, { limit: 1, offset: 0 });
      stats.offerings = offerings?.total ?? offerings?.length ?? 0;
    } catch { stats.offerings = 0; }
    try {
      const submissions = await this.listSubmissions(authToken, { limit: 1, offset: 0 });
      stats.submissions = submissions?.total ?? submissions?.length ?? 0;
    } catch { stats.submissions = 0; }
    try {
      const commissions = await this.listCommissions(authToken, { limit: 1, offset: 0 });
      stats.commissions = commissions?.total ?? commissions?.length ?? 0;
    } catch { stats.commissions = 0; }
    try {
      const customers = await this.listCustomers(authToken, { limit: 1, offset: 0 });
      stats.customers = customers?.total ?? customers?.length ?? 0;
    } catch { stats.customers = 0; }
    return { stats };
  }

  async getBrokerOpsDashboard(authToken: string) {
    const stats: Record<string, any> = {};
    try {
      const agreements = await this.listCarrierAgreements(authToken);
      stats.activeAgreements = Array.isArray(agreements) ? agreements.length : agreements?.total ?? 0;
    } catch { stats.activeAgreements = 0; }
    try {
      const offerings = await this.listBrokerOfferings(authToken, { limit: 1, offset: 0 });
      stats.offerings = offerings?.total ?? offerings?.length ?? 0;
    } catch { stats.offerings = 0; }
    try {
      const placements = await this.listPlacements(authToken);
      stats.placements = Array.isArray(placements) ? placements.length : placements?.total ?? 0;
    } catch { stats.placements = 0; }
    try {
      const settlements = await this.listSettlements(authToken);
      stats.settlements = Array.isArray(settlements) ? settlements.length : settlements?.total ?? 0;
    } catch { stats.settlements = 0; }
    try {
      const claims = await this.listClaimAdvocacyCases(authToken);
      stats.claimAdvocacyCases = Array.isArray(claims) ? claims.length : claims?.total ?? 0;
    } catch { stats.claimAdvocacyCases = 0; }
    return { stats };
  }

  // --- Sales Network: Broker Dashboard ---

  async getBrokerDashboard(authToken: string, brokerPartnerId: string, params?: { fromDate?: string; toDate?: string }) {
    const query: Record<string, string> = {};
    if (params?.fromDate) query.fromDate = params.fromDate;
    if (params?.toDate) query.toDate = params.toDate;
    const { data } = await firstValueFrom(
      this.http.get(`${this.salesNetworkUrl}/sales-network/broker/${brokerPartnerId}/dashboard`, {
        headers: this.authHeaders(authToken),
        params: query,
      }),
    );
    return data;
  }

  // --- Sales Network: Distribution Agreement Management ---

  async listDistributionAgreements(authToken: string, params?: { carrierOrganizationId?: string; distributorOrganizationId?: string; status?: string; agreementType?: string; limit?: number; offset?: number }) {
    const query: Record<string, string> = {};
    if (params?.carrierOrganizationId) query.carrierOrganizationId = params.carrierOrganizationId;
    if (params?.distributorOrganizationId) query.distributorOrganizationId = params.distributorOrganizationId;
    if (params?.status) query.status = params.status;
    if (params?.agreementType) query.agreementType = params.agreementType;
    if (params?.limit) query.limit = String(params.limit);
    if (params?.offset) query.offset = String(params.offset);
    const { data } = await firstValueFrom(
      this.http.get(`${this.salesNetworkUrl}/sales-network/agreements`, {
        headers: this.authHeaders(authToken),
        params: query,
      }),
    );
    return data;
  }

  async getDistributionAgreement(authToken: string, agreementId: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.salesNetworkUrl}/sales-network/agreements/${agreementId}`, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async createDistributionAgreement(authToken: string, body: any) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.salesNetworkUrl}/sales-network/agreements`, body, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async activateDistributionAgreement(authToken: string, agreementId: string) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.salesNetworkUrl}/sales-network/agreements/${agreementId}/activate`, {}, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async terminateDistributionAgreement(authToken: string, agreementId: string, reason: string) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.salesNetworkUrl}/sales-network/agreements/${agreementId}/terminate`, { reason }, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  // --- Sales Network: Commission Tier Management ---

  async listCommissionTiers(authToken: string, agreementId: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.salesNetworkUrl}/sales-network/agreements/${agreementId}/tiers`, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async createCommissionTier(authToken: string, agreementId: string, body: any) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.salesNetworkUrl}/sales-network/agreements/${agreementId}/tiers`, body, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async deleteCommissionTier(authToken: string, tierId: string) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.salesNetworkUrl}/sales-network/tiers/${tierId}/delete`, {}, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  // --- Sales Network: Clawback Rule Management ---

  async listClawbackRules(authToken: string, agreementId: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.salesNetworkUrl}/sales-network/agreements/${agreementId}/clawback-rules`, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async createClawbackRule(authToken: string, agreementId: string, body: any) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.salesNetworkUrl}/sales-network/agreements/${agreementId}/clawback-rules`, body, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  async deleteClawbackRule(authToken: string, ruleId: string) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.salesNetworkUrl}/sales-network/clawback-rules/${ruleId}/delete`, {}, {
        headers: this.authHeaders(authToken),
      }),
    );
    return data;
  }

  // --- Copilot proxy ---
  private readonly copilotUrl = process.env.COPILOT_SERVICE_URL || 'http://localhost:18030';

  async copilotChat(authToken: string, message: string, conversationHistory?: { role: 'user' | 'assistant'; content: string }[]) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.copilotUrl}/copilot/chat`, { message, conversationHistory }, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken,
          'X-AI-Enabled': 'true',
        },
      }),
    );
    return data;
  }
}
