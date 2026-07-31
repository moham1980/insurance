import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { AgentSession, SessionStatus } from './entities/AgentSession';
import jwt from 'jsonwebtoken';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { retry, catchError, delay } from 'rxjs/operators';
import crypto from 'crypto';

export interface AgentDashboardStats {
  totalPolicies: number;
  activePolicies: number;
  pendingPolicies: number;
  totalClaims: number;
  pendingClaims: number;
  totalCommission: number;
  pendingCommission: number;
  monthlyPremium: number;
  monthlyIssuance: number;
}

export interface AgentPolicy {
  id: string;
  policyNumber: string;
  customerId: string;
  customerName: string;
  product: string;
  status: string;
  premium: number;
  issueDate: string;
  expiryDate: string;
  commissionRate: number;
  commissionAmount: number;
}

export interface AgentClaim {
  id: string;
  claimNumber: string;
  policyNumber: string;
  customerName: string;
  status: string;
  submittedDate: string;
  amount: number;
  approvedAmount?: number;
}

export interface AgentCustomer {
  id: string;
  nationalId: string;
  name: string;
  phone: string;
  email?: string;
  policiesCount: number;
  claimsCount: number;
  totalPremium: number;
}

export interface AgentCommission {
  id: string;
  policyId: string;
  policyNumber: string;
  contractId: string;
  commissionRate: number;
  commissionAmount: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  dueDate: string;
  paidDate?: string;
}

export interface AgentKPI {
  date: string;
  issuanceCount: number;
  issuancePremium: number;
  claimsCount: number;
  claimsAmount: number;
  commissionEarned: number;
  newCustomers: number;
}

@Injectable()
export class AgentPortalService {
  private readonly logger = new Logger(AgentPortalService.name);
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor(
    @InjectRepository(AgentSession)
    private sessionRepo: Repository<AgentSession>,
    private httpService: HttpService,
  ) {}

  /**
   * Make HTTP request with retry logic
   */
  private async fetchWithRetry<T>(
    requestFn: () => Promise<T>,
    operation: string,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        if (this.isRetryableError(error) && attempt < this.maxRetries) {
          this.logger.warn(
            `${operation} failed (attempt ${attempt}/${this.maxRetries}), retrying in ${this.retryDelay * attempt}ms...`,
            error instanceof AxiosError ? error.message : String(error),
          );
          await this.delay(this.retryDelay * attempt); // Exponential backoff
        } else {
          this.logger.error(
            `${operation} failed after ${attempt} attempts`,
            error instanceof AxiosError ? error.message : String(error),
          );
          throw error;
        }
      }
    }

    throw lastError;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const code = error.code as string | undefined;
      // Retry on: 5xx errors, 429 (Too Many Requests), network errors
      return (
        !status ||
        status >= 500 ||
        status === 429 ||
        code === 'ECONNREFUSED' ||
        code === 'ETIMEDOUT' ||
        code === 'ENOTFOUND'
      );
    }
    return false;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async createSession(params: {
    tenantId: string;
    agentId: string;
    jwtToken: string;
    expiresIn: string;
  }): Promise<AgentSession> {
    const serverMaxMs = this.parseExpiresIn(process.env.AGENT_SESSION_MAX_TTL || '8h');
    const requestedMs = this.parseExpiresIn(params.expiresIn || '8h');
    const effectiveMs = Math.min(requestedMs, serverMaxMs);
    const expiresAt = new Date(Date.now() + effectiveMs);

    // Revoke existing active sessions for this agent
    await this.sessionRepo.update(
      { agentId: params.agentId, status: SessionStatus.ACTIVE },
      { status: SessionStatus.REVOKED }
    );

    // Encrypt JWT token before storing in DB
    const encryptionKey = process.env.FIELD_ENCRYPTION_KEY || 'default-encryption-key-32b';
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey.padEnd(32, '0').substring(0, 32)), Buffer.alloc(16, 0));
    let encryptedToken = cipher.update(params.jwtToken, 'utf8', 'hex');
    encryptedToken += cipher.final('hex');

    const session = this.sessionRepo.create({
      tenantId: params.tenantId,
      agentId: params.agentId,
      jwtToken: encryptedToken,
      status: SessionStatus.ACTIVE,
      expiresAt,
      metadata: null,
    });

    return this.sessionRepo.save(session);
  }

  async validateSession(sessionId: string): Promise<{ valid: boolean; agentId?: string }> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      return { valid: false };
    }

    if (session.status !== SessionStatus.ACTIVE) {
      return { valid: false };
    }

    if (new Date() > session.expiresAt) {
      session.status = SessionStatus.EXPIRED;
      await this.sessionRepo.save(session);
      return { valid: false };
    }

    return { valid: true, agentId: session.agentId };
  }

  async refreshSession(sessionId: string): Promise<{ success: boolean; expiresAt?: Date; error?: string }> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    if (session.status !== SessionStatus.ACTIVE) {
      return { success: false, error: `Session is ${session.status}` };
    }

    if (new Date() > session.expiresAt) {
      session.status = SessionStatus.EXPIRED;
      await this.sessionRepo.save(session);
      return { success: false, error: 'Session already expired' };
    }

    const serverMaxMs = this.parseExpiresIn(process.env.AGENT_SESSION_MAX_TTL || '8h');
    const newExpiresAt = new Date(Date.now() + serverMaxMs);
    session.expiresAt = newExpiresAt;
    await this.sessionRepo.save(session);

    return { success: true, expiresAt: newExpiresAt };
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionRepo.update(
      { id: sessionId },
      { status: SessionStatus.REVOKED }
    );
  }

  async revokeAllAgentSessions(agentId: string): Promise<number> {
    const result = await this.sessionRepo.update(
      { agentId, status: SessionStatus.ACTIVE },
      { status: SessionStatus.REVOKED }
    );
    return result.affected || 0;
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.sessionRepo.update(
      { status: SessionStatus.ACTIVE, expiresAt: LessThan(new Date()) },
      { status: SessionStatus.EXPIRED }
    );
    return result.affected || 0;
  }

  private parseExpiresIn(expiresIn: string): number {
    // Parse JWT expiresIn format (e.g., "1h", "30m", "7d")
    const match = expiresIn.match(/^(\d+)([hmd])$/);
    if (!match) return 3600000; // Default 1 hour

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'h': return value * 3600000;
      case 'm': return value * 60000;
      case 'd': return value * 86400000;
      default: return 3600000;
    }
  }

  async getDashboardStats(agentId: string, partnerId: string, tenantId?: string, authToken?: string, organizationId?: string, userRole?: string, startDate?: string, endDate?: string, lineOfBusiness?: string): Promise<AgentDashboardStats> {
    this.logger.log(`Fetching dashboard stats for agent ${agentId}, partner ${partnerId}, role ${userRole || 'agent'}`);

    const salesNetworkUrl = process.env.SALES_NETWORK_URL || 'http://sales-network-service:3022';

    const headers: Record<string, string> = {
      'x-partner-id': partnerId,
    };
    if (tenantId) headers['x-tenant-id'] = tenantId;
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    if (userRole) headers['x-user-role'] = userRole;

    const params: Record<string, string> = {};
    if (organizationId) params.organizationId = organizationId;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (lineOfBusiness) params.lineOfBusiness = lineOfBusiness;

    try {
      // Fetch stats from sales network service with retry logic
      const statsResponse: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(
            `${salesNetworkUrl}/sales-network/agents/${agentId}/stats`,
            { headers, params },
          ),
        ),
        'Fetch dashboard stats',
      );

      return statsResponse.data?.data || {
        totalPolicies: 0,
        activePolicies: 0,
        pendingPolicies: 0,
        totalClaims: 0,
        pendingClaims: 0,
        totalCommission: 0,
        pendingCommission: 0,
        monthlyPremium: 0,
        monthlyIssuance: 0,
      };
    } catch (error) {
      this.logger.error('Failed to fetch dashboard stats after retries', error);
      // Return zero stats on error
      return {
        totalPolicies: 0,
        activePolicies: 0,
        pendingPolicies: 0,
        totalClaims: 0,
        pendingClaims: 0,
        totalCommission: 0,
        pendingCommission: 0,
        monthlyPremium: 0,
        monthlyIssuance: 0,
      };
    }
  }

  async getAgentPolicies(
    agentId: string,
    partnerId: string,
    filters?: {
      status?: string;
      fromDate?: string;
      toDate?: string;
      organizationId?: string;
    },
    tenantId?: string,
    authToken?: string,
    userRole?: string,
  ): Promise<AgentPolicy[]> {
    this.logger.log(`Fetching policies for agent ${agentId}, partner ${partnerId}, role ${userRole || 'agent'}`);

    const salesNetworkUrl = process.env.SALES_NETWORK_URL || 'http://sales-network-service:3022';

    const headers: Record<string, string> = {
      'x-partner-id': partnerId,
    };
    if (tenantId) headers['x-tenant-id'] = tenantId;
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    if (userRole) headers['x-user-role'] = userRole;

    try {
      const policiesResponse: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(
            `${salesNetworkUrl}/sales-network/agents/${agentId}/policies`,
            {
              params: filters,
              headers,
            },
          ),
        ),
        'Fetch agent policies',
      );

      return policiesResponse.data?.data || [];
    } catch (error) {
      this.logger.error('Failed to fetch agent policies after retries', error);
      throw new HttpException(
        'Failed to fetch policies',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAgentClaims(
    agentId: string,
    partnerId: string,
    filters?: {
      status?: string;
      fromDate?: string;
      toDate?: string;
      organizationId?: string;
    },
    tenantId?: string,
    authToken?: string,
    userRole?: string,
  ): Promise<AgentClaim[]> {
    this.logger.log(`Fetching claims for agent ${agentId}, partner ${partnerId}, role ${userRole || 'agent'}`);

    const salesNetworkUrl = process.env.SALES_NETWORK_URL || 'http://sales-network-service:3022';

    const headers: Record<string, string> = {
      'x-partner-id': partnerId,
    };
    if (tenantId) headers['x-tenant-id'] = tenantId;
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    if (userRole) headers['x-user-role'] = userRole;

    try {
      const claimsResponse: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(
            `${salesNetworkUrl}/sales-network/agents/${agentId}/claims`,
            {
              params: filters,
              headers,
            },
          ),
        ),
        'Fetch agent claims',
      );

      return claimsResponse.data?.data || [];
    } catch (error) {
      this.logger.error('Failed to fetch agent claims after retries', error);
      throw new HttpException(
        'Failed to fetch claims',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAgentCustomers(
    agentId: string,
    partnerId: string,
    search?: string,
    tenantId?: string,
    authToken?: string,
    organizationId?: string
  ): Promise<AgentCustomer[]> {
    this.logger.log(`Fetching customers for agent ${agentId}, partner ${partnerId}`);

    const salesNetworkUrl = process.env.SALES_NETWORK_URL || 'http://sales-network-service:3022';

    const headers: Record<string, string> = {
      'x-partner-id': partnerId,
    };
    if (tenantId) headers['x-tenant-id'] = tenantId;
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    try {
      const customersResponse: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(
            `${salesNetworkUrl}/sales-network/agents/${agentId}/customers`,
            {
              params: { search, organizationId },
              headers,
            },
          ),
        ),
        'Fetch agent customers',
      );

      return customersResponse.data?.data || [];
    } catch (error) {
      this.logger.error('Failed to fetch agent customers after retries', error);
      throw new HttpException(
        'Failed to fetch customers',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAgentCommissions(
    agentId: string,
    partnerId: string,
    filters?: {
      status?: string;
      fromDate?: string;
      toDate?: string;
      organizationId?: string;
    },
    tenantId?: string,
    authToken?: string,
    userRole?: string,
  ): Promise<AgentCommission[]> {
    this.logger.log(`Fetching commissions for agent ${agentId}, partner ${partnerId}, role ${userRole || 'agent'}`);

    const salesNetworkUrl = process.env.SALES_NETWORK_URL || 'http://sales-network-service:3022';

    const headers: Record<string, string> = {
      'x-partner-id': partnerId,
    };
    if (tenantId) headers['x-tenant-id'] = tenantId;
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    if (userRole) headers['x-user-role'] = userRole;

    try {
      const commissionsResponse: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(
            `${salesNetworkUrl}/sales-network/agents/${agentId}/commissions`,
            {
              params: filters,
              headers,
            },
          ),
        ),
        'Fetch agent commissions',
      );

      return commissionsResponse.data?.data || [];
    } catch (error) {
      this.logger.error('Failed to fetch agent commissions after retries', error);
      throw new HttpException(
        'Failed to fetch commissions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAgentKPI(
    agentId: string,
    partnerId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    tenantId?: string,
    authToken?: string
  ): Promise<AgentKPI[]> {
    this.logger.log(`Fetching KPI for agent ${agentId}, partner ${partnerId}, period ${period}`);

    const salesNetworkUrl = process.env.SALES_NETWORK_URL || 'http://sales-network-service:3022';

    const headers: Record<string, string> = {
      'x-partner-id': partnerId,
    };
    if (tenantId) headers['x-tenant-id'] = tenantId;
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const granularity = period === 'daily' ? 'daily' : 'monthly';

    try {
      const kpiResponse: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(
            `${salesNetworkUrl}/sales-network/agents/${agentId}/kpis`,
            {
              params: { granularity },
              headers,
            },
          ),
        ),
        'Fetch agent KPI',
      );

      return kpiResponse.data?.data || [];
    } catch (error) {
      this.logger.error('Failed to fetch agent KPI after retries', error);
      throw new HttpException(
        'Failed to fetch KPI',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getPremiumTrends(
    agentId: string,
    partnerId: string,
    months: number = 12,
    tenantId?: string,
    authToken?: string,
  ): Promise<Array<{ month: string; premium: number; policies: number }>> {
    this.logger.log(`Fetching premium trends for agent ${agentId}, partner ${partnerId}, months ${months}`);

    const salesNetworkUrl = process.env.SALES_NETWORK_URL || 'http://sales-network-service:3022';
    const headers: Record<string, string> = { 'x-partner-id': partnerId };
    if (tenantId) headers['x-tenant-id'] = tenantId;
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    try {
      const response: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(
            `${salesNetworkUrl}/sales-network/agents/${agentId}/premium-trends`,
            { params: { months }, headers },
          ),
        ),
        'Fetch premium trends',
      );
      return response.data?.data || [];
    } catch (error) {
      this.logger.error('Failed to fetch premium trends after retries', error);
      return [];
    }
  }

  async getCommissionHistory(
    agentId: string,
    partnerId: string,
    months: number = 12,
    tenantId?: string,
    authToken?: string,
  ): Promise<Array<{ month: string; commission: number; paid: number; pending: number }>> {
    this.logger.log(`Fetching commission history for agent ${agentId}, partner ${partnerId}, months ${months}`);

    const salesNetworkUrl = process.env.SALES_NETWORK_URL || 'http://sales-network-service:3022';
    const headers: Record<string, string> = { 'x-partner-id': partnerId };
    if (tenantId) headers['x-tenant-id'] = tenantId;
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    try {
      const response: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(
            `${salesNetworkUrl}/sales-network/agents/${agentId}/commission-history`,
            { params: { months }, headers },
          ),
        ),
        'Fetch commission history',
      );
      return response.data?.data || [];
    } catch (error) {
      this.logger.error('Failed to fetch commission history after retries', error);
      return [];
    }
  }

  async getPolicyPortfolio(
    agentId: string,
    partnerId: string,
    tenantId?: string,
    authToken?: string,
  ): Promise<Array<{ product: string; count: number; premium: number }>> {
    this.logger.log(`Fetching policy portfolio for agent ${agentId}, partner ${partnerId}`);

    const salesNetworkUrl = process.env.SALES_NETWORK_URL || 'http://sales-network-service:3022';
    const headers: Record<string, string> = { 'x-partner-id': partnerId };
    if (tenantId) headers['x-tenant-id'] = tenantId;
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    try {
      const response: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(
            `${salesNetworkUrl}/sales-network/agents/${agentId}/policy-portfolio`,
            { headers },
          ),
        ),
        'Fetch policy portfolio',
      );
      return response.data?.data || [];
    } catch (error) {
      this.logger.error('Failed to fetch policy portfolio after retries', error);
      return [];
    }
  }

  async getLeads(
    agentId: string,
    partnerId: string,
    tenantId?: string,
    authToken?: string,
  ): Promise<Array<{
    id: string;
    name: string;
    phone: string;
    email?: string;
    productInterest: string;
    status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
    priority: 'high' | 'medium' | 'low';
    createdAt: string;
    notes?: string;
  }>> {
    this.logger.log(`Fetching leads for agent ${agentId}, partner ${partnerId}`);

    const salesNetworkUrl = process.env.SALES_NETWORK_URL || 'http://sales-network-service:3022';
    const headers: Record<string, string> = { 'x-partner-id': partnerId };
    if (tenantId) headers['x-tenant-id'] = tenantId;
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    try {
      const response: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(
            `${salesNetworkUrl}/sales-network/agents/${agentId}/leads`,
            { headers },
          ),
        ),
        'Fetch leads',
      );
      return response.data?.data || [];
    } catch (error) {
      this.logger.error('Failed to fetch leads after retries', error);
      return [];
    }
  }

  private getClaimsServiceUrl(): string {
    return process.env.CLAIMS_SERVICE_URL || 'http://claims-service:18002';
  }

  private getClaimsHeaders(params: { tenantId?: string; authToken?: string; correlationId?: string }): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (params.tenantId) headers['x-tenant-id'] = params.tenantId;
    if (params.authToken) headers['Authorization'] = `Bearer ${params.authToken}`;
    if (params.correlationId) headers['x-correlation-id'] = params.correlationId;
    return headers;
  }

  private async claimsProxy<T>(
    requestFn: () => Promise<T>,
    operation: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response: any = await this.fetchWithRetry(requestFn, operation);
      return {
        success: (response.data as any)?.success ?? true,
        data: (response.data as any)?.data,
      };
    } catch (error) {
      this.logger.error(`${operation} failed`, error);
      return {
        success: false,
        error: error instanceof HttpException ? error.message : `Failed to ${operation}`,
      };
    }
  }

  async getClaimAdvocacy(params: {
    claimId: string;
    tenantId?: string;
    authToken?: string;
    correlationId?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const claimsServiceUrl = this.getClaimsServiceUrl();
    const headers = this.getClaimsHeaders(params);
    return this.claimsProxy(
      () => firstValueFrom(
        this.httpService.get(`${claimsServiceUrl}/advocacy-cases?claimId=${encodeURIComponent(params.claimId)}`, { headers })
      ),
      'Fetch claim advocacy',
    );
  }

  async openAdvocacyCase(params: {
    claimId: string;
    tenantId?: string;
    brokerOrganizationId: string;
    customerPartyId: string;
    carrierOrganizationId: string;
    priority?: string;
    authToken?: string;
    correlationId?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const claimsServiceUrl = this.getClaimsServiceUrl();
    const headers = this.getClaimsHeaders(params);
    return this.claimsProxy(
      () => firstValueFrom(
        this.httpService.post(
          `${claimsServiceUrl}/claims/${encodeURIComponent(params.claimId)}/advocacy-cases`,
          {
            brokerOrganizationId: params.brokerOrganizationId,
            customerPartyId: params.customerPartyId,
            carrierOrganizationId: params.carrierOrganizationId,
            priority: params.priority,
          },
          { headers },
        )
      ),
      'Open advocacy case',
    );
  }

  async addAdvocacyTask(params: {
    caseId: string;
    title: string;
    description?: string;
    assignedToPartyId: string;
    dueDate: string;
    authToken?: string;
    tenantId?: string;
    correlationId?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const claimsServiceUrl = this.getClaimsServiceUrl();
    const headers = this.getClaimsHeaders(params);
    return this.claimsProxy(
      () => firstValueFrom(
        this.httpService.post(
          `${claimsServiceUrl}/advocacy-cases/${encodeURIComponent(params.caseId)}/tasks`,
          {
            title: params.title,
            description: params.description,
            assignedToPartyId: params.assignedToPartyId,
            dueDate: params.dueDate,
          },
          { headers },
        )
      ),
      'Add advocacy task',
    );
  }

  async createAdjusterReferral(params: {
    claimId: string;
    caseId: string;
    adjusterOrganizationId: string;
    adjusterPartyId: string;
    estimatedFeeAmount?: number;
    estimatedFeeCurrency?: string;
    authToken?: string;
    tenantId?: string;
    correlationId?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const claimsServiceUrl = this.getClaimsServiceUrl();
    const headers = this.getClaimsHeaders(params);
    return this.claimsProxy(
      () => firstValueFrom(
        this.httpService.post(
          `${claimsServiceUrl}/claims/${encodeURIComponent(params.claimId)}/adjuster-referrals`,
          {
            caseId: params.caseId,
            adjusterOrganizationId: params.adjusterOrganizationId,
            adjusterPartyId: params.adjusterPartyId,
            estimatedFeeAmount: params.estimatedFeeAmount,
            estimatedFeeCurrency: params.estimatedFeeCurrency,
          },
          { headers },
        )
      ),
      'Create adjuster referral',
    );
  }

  async acceptAdjusterReferral(params: {
    referralId: string;
    tenantId?: string;
    authToken?: string;
  }): Promise<any> {
    const claimsServiceUrl = this.getClaimsServiceUrl();
    const headers = this.getClaimsHeaders(params);

    return this.claimsProxy(
      () => firstValueFrom(
        this.httpService.post(
          `${claimsServiceUrl}/adjuster-referrals/${encodeURIComponent(params.referralId)}/accept`,
          {},
          { headers },
        )
      ),
      'Accept adjuster referral',
    );
  }

  async rejectAdjusterReferral(params: {
    referralId: string;
    reason?: string;
    tenantId?: string;
    authToken?: string;
  }): Promise<any> {
    const claimsServiceUrl = this.getClaimsServiceUrl();
    const headers = this.getClaimsHeaders(params);

    return this.claimsProxy(
      () => firstValueFrom(
        this.httpService.post(
          `${claimsServiceUrl}/adjuster-referrals/${encodeURIComponent(params.referralId)}/reject`,
          { reason: params.reason },
          { headers },
        )
      ),
      'Reject adjuster referral',
    );
  }

  async submitAdjusterReport(params: {
    referralId: string;
    reportContent?: string;
    reportMetadata?: any;
    tenantId?: string;
    authToken?: string;
  }): Promise<any> {
    const claimsServiceUrl = this.getClaimsServiceUrl();
    const headers = this.getClaimsHeaders(params);

    return this.claimsProxy(
      () => firstValueFrom(
        this.httpService.post(
          `${claimsServiceUrl}/adjuster-referrals/${encodeURIComponent(params.referralId)}/submit-report`,
          {
            reportContent: params.reportContent,
            reportMetadata: params.reportMetadata,
          },
          { headers },
        )
      ),
      'Submit adjuster report',
    );
  }

  async getRecoveryCase(params: {
    recoveryId: string;
    tenantId?: string;
    authToken?: string;
  }): Promise<any> {
    const claimsServiceUrl = this.getClaimsServiceUrl();
    const headers = this.getClaimsHeaders(params);

    return this.claimsProxy(
      () => firstValueFrom(
        this.httpService.get(
          `${claimsServiceUrl}/recovery/${encodeURIComponent(params.recoveryId)}`,
          { headers },
        )
      ),
      'Get recovery case',
    );
  }

  async listRecoveryCases(params: {
    claimId: string;
    status?: string;
    tenantId?: string;
    authToken?: string;
  }): Promise<any> {
    const claimsServiceUrl = this.getClaimsServiceUrl();
    const headers = this.getClaimsHeaders(params);

    const queryParams: Record<string, string> = {};
    if (params.status) queryParams.status = params.status;

    return this.claimsProxy(
      () => firstValueFrom(
        this.httpService.get(
          `${claimsServiceUrl}/claims/${encodeURIComponent(params.claimId)}/recovery`,
          { headers, params: queryParams },
        )
      ),
      'List recovery cases',
    );
  }

  async updateRecoveryStatus(params: {
    recoveryId: string;
    status: string;
    tenantId?: string;
    authToken?: string;
  }): Promise<any> {
    const claimsServiceUrl = this.getClaimsServiceUrl();
    const headers = this.getClaimsHeaders(params);

    return this.claimsProxy(
      () => firstValueFrom(
        this.httpService.patch(
          `${claimsServiceUrl}/recovery/${encodeURIComponent(params.recoveryId)}/status`,
          { status: params.status },
          { headers },
        )
      ),
      'Update recovery status',
    );
  }

  async addClaimProjection(params: {
    claimId: string;
    brokerOrganizationId: string;
    carrierOrganizationId: string;
    externalClaimId: string;
    sourceSystemId: string;
    payload: Record<string, any>;
    authToken?: string;
    tenantId?: string;
    correlationId?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const claimsServiceUrl = this.getClaimsServiceUrl();
    const headers = this.getClaimsHeaders(params);
    return this.claimsProxy(
      () => firstValueFrom(
        this.httpService.post(
          `${claimsServiceUrl}/claims/${encodeURIComponent(params.claimId)}/projections`,
          {
            brokerOrganizationId: params.brokerOrganizationId,
            carrierOrganizationId: params.carrierOrganizationId,
            externalClaimId: params.externalClaimId,
            sourceSystemId: params.sourceSystemId,
            sourceVersion: 1,
            payload: params.payload,
          },
          { headers },
        )
      ),
      'Add claim projection',
    );
  }

  async createRecoveryCase(params: {
    claimId: string;
    responsiblePartyId?: string;
    expectedRecoveryAmount: number;
    expectedRecoveryCurrency?: string;
    authToken?: string;
    tenantId?: string;
    correlationId?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const claimsServiceUrl = this.getClaimsServiceUrl();
    const headers = this.getClaimsHeaders(params);
    return this.claimsProxy(
      () => firstValueFrom(
        this.httpService.post(
          `${claimsServiceUrl}/claims/${encodeURIComponent(params.claimId)}/recovery`,
          {
            responsiblePartyId: params.responsiblePartyId,
            expectedRecoveryAmount: params.expectedRecoveryAmount,
            expectedRecoveryCurrency: params.expectedRecoveryCurrency,
          },
          { headers },
        )
      ),
      'Create recovery case',
    );
  }

  async escalateCase(params: {
    caseId: string;
    reason: string;
    authToken?: string;
    tenantId?: string;
    correlationId?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const claimsServiceUrl = this.getClaimsServiceUrl();
    const headers = this.getClaimsHeaders(params);
    return this.claimsProxy(
      () => firstValueFrom(
        this.httpService.post(
          `${claimsServiceUrl}/advocacy-cases/${encodeURIComponent(params.caseId)}/escalate`,
          { reason: params.reason },
          { headers },
        )
      ),
      'Escalate advocacy case',
    );
  }

  async closeAdvocacyCase(params: {
    caseId: string;
    tenantId?: string;
    authToken?: string;
  }): Promise<any> {
    const claimsServiceUrl = this.getClaimsServiceUrl();
    const headers = this.getClaimsHeaders(params);

    return this.claimsProxy(
      () => firstValueFrom(
        this.httpService.post(
          `${claimsServiceUrl}/advocacy-cases/${encodeURIComponent(params.caseId)}/close`,
          {},
          { headers },
        )
      ),
      'Close advocacy case',
    );
  }

  async listAdvocacyTasks(params: {
    caseId: string;
    status?: string;
    tenantId?: string;
    authToken?: string;
  }): Promise<any> {
    const claimsServiceUrl = this.getClaimsServiceUrl();
    const headers = this.getClaimsHeaders(params);

    const queryParams: Record<string, string> = {};
    if (params.status) queryParams.status = params.status;

    return this.claimsProxy(
      () => firstValueFrom(
        this.httpService.get(
          `${claimsServiceUrl}/advocacy-cases/${encodeURIComponent(params.caseId)}/tasks`,
          { headers, params: queryParams },
        )
      ),
      'List advocacy tasks',
    );
  }

  async updateAdvocacyTaskStatus(params: {
    caseId: string;
    taskId: string;
    status: string;
    outcome?: string;
    tenantId?: string;
    authToken?: string;
  }): Promise<any> {
    const claimsServiceUrl = this.getClaimsServiceUrl();
    const headers = this.getClaimsHeaders(params);

    return this.claimsProxy(
      () => firstValueFrom(
        this.httpService.patch(
          `${claimsServiceUrl}/advocacy-cases/${encodeURIComponent(params.caseId)}/tasks/${encodeURIComponent(params.taskId)}`,
          { status: params.status, outcome: params.outcome },
          { headers },
        )
      ),
      'Update advocacy task status',
    );
  }

  async addAdvocacyCommunication(params: {
    caseId: string;
    channel: string;
    direction: string;
    contentRef: string;
    partyId?: string;
    subject?: string;
    summary?: string;
    isPii?: boolean;
    authToken?: string;
    tenantId?: string;
    correlationId?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const claimsServiceUrl = this.getClaimsServiceUrl();
    const headers = this.getClaimsHeaders(params);
    return this.claimsProxy(
      () => firstValueFrom(
        this.httpService.post(
          `${claimsServiceUrl}/advocacy-cases/${encodeURIComponent(params.caseId)}/communications`,
          {
            channel: params.channel,
            direction: params.direction,
            contentRef: params.contentRef,
            partyId: params.partyId,
            subject: params.subject,
            summary: params.summary,
            isPii: params.isPii || false,
          },
          { headers },
        )
      ),
      'Add advocacy communication',
    );
  }

  async getPolicyDetail(params: {
    agentId: string;
    policyId: string;
    tenantId?: string;
    authToken?: string;
  }): Promise<any> {
    const policyServiceUrl = process.env.POLICY_SERVICE_URL || 'http://policy-service:18003';
    const headers: Record<string, string> = {};
    if (params.tenantId) headers['x-tenant-id'] = params.tenantId;
    if (params.authToken) headers['Authorization'] = `Bearer ${params.authToken}`;

    try {
      const response: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(
            `${policyServiceUrl}/policies/${params.policyId}`,
            { headers },
          ),
        ),
        'Fetch policy detail',
      );

      const policy = (response.data as any)?.data;
      if (!policy) {
        throw new HttpException('Policy not found', HttpStatus.NOT_FOUND);
      }

      return policy;
    } catch (error) {
      this.logger.error('Failed to fetch policy detail', error);
      throw new HttpException(
        'Failed to fetch policy detail',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getClaimStatus(params: {
    agentId: string;
    claimId: string;
    tenantId?: string;
    authToken?: string;
  }): Promise<any> {
    const claimsServiceUrl = this.getClaimsServiceUrl();
    const headers = this.getClaimsHeaders(params);

    try {
      const response: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(
            `${claimsServiceUrl}/claims/${params.claimId}`,
            { headers },
          ),
        ),
        'Fetch claim status',
      );

      const claim = (response.data as any)?.data;
      if (!claim) {
        throw new HttpException('Claim not found', HttpStatus.NOT_FOUND);
      }

      return {
        claimId: claim.claimId,
        claimNumber: claim.claimNumber,
        status: claim.status,
        policyId: claim.policyId,
        lossDate: claim.lossDate,
        reportedAt: claim.reportedAt,
        updatedAt: claim.updatedAt,
        brokerOrganizationId: claim.brokerOrganizationId,
      };
    } catch (error) {
      this.logger.error('Failed to fetch claim status', error);
      throw new HttpException(
        'Failed to fetch claim status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getCustomerDetail(params: {
    agentId: string;
    customerId: string;
    tenantId?: string;
    authToken?: string;
  }): Promise<any> {
    const partyKycUrl = process.env.PARTY_KYC_SERVICE_URL || 'http://party-kyc-service:18004';
    const policyServiceUrl = process.env.POLICY_SERVICE_URL || 'http://policy-service:18003';
    const headers: Record<string, string> = {};
    if (params.tenantId) headers['x-tenant-id'] = params.tenantId;
    if (params.authToken) headers['Authorization'] = `Bearer ${params.authToken}`;

    try {
      // Fetch party details
      const partyResponse: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(`${partyKycUrl}/parties/${params.customerId}`, { headers }),
        ),
        'Fetch customer party details',
      );
      const party = (partyResponse.data as any)?.data;
      if (!party) {
        throw new HttpException('Customer not found', HttpStatus.NOT_FOUND);
      }

      // Fetch KYC status
      let kycStatus = 'unknown';
      try {
        const kycResponse: any = await this.fetchWithRetry(
          () => firstValueFrom(
            this.httpService.get(`${partyKycUrl}/party/${params.customerId}/kyc`, { headers }),
          ),
          'Fetch customer KYC status',
        );
        kycStatus = (kycResponse.data as any)?.data?.status || 'unknown';
      } catch (e) {
        this.logger.warn('Failed to fetch KYC status, continuing without it');
      }

      // Fetch policy history for this customer
      let policies: any[] = [];
      try {
        const policiesResponse: any = await this.fetchWithRetry(
          () => firstValueFrom(
            this.httpService.get(`${policyServiceUrl}/policies`, {
              params: { customerId: params.customerId },
              headers,
            }),
          ),
          'Fetch customer policy history',
        );
        policies = (policiesResponse.data as any)?.data || [];
      } catch (e) {
        this.logger.warn('Failed to fetch policy history, continuing without it');
      }

      return {
        customerId: party.partyId || params.customerId,
        displayName: party.displayName || party.fullName,
        phoneNumber: party.phoneNumber,
        email: party.email,
        kycStatus,
        policies: policies.map((p: any) => ({
          policyId: p.policyId,
          policyNumber: p.policyNumber,
          status: p.status,
          productCode: p.productCode,
          effectiveDate: p.effectiveDate,
          expiryDate: p.expiryDate,
        })),
      };
    } catch (error) {
      this.logger.error('Failed to fetch customer detail', error);
      throw new HttpException(
        'Failed to fetch customer detail',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getCommissionDetail(params: {
    agentId: string;
    commissionId: string;
    tenantId?: string;
    authToken?: string;
  }): Promise<any> {
    const billingServiceUrl = process.env.BILLING_SERVICE_URL || 'http://billing-service:18007';
    const headers: Record<string, string> = {};
    if (params.tenantId) headers['x-tenant-id'] = params.tenantId;
    if (params.authToken) headers['Authorization'] = `Bearer ${params.authToken}`;

    try {
      const response: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(
            `${billingServiceUrl}/brokerage/commissions/${params.commissionId}`,
            { headers },
          ),
        ),
        'Fetch commission detail',
      );

      const commission = (response.data as any)?.data;
      if (!commission) {
        throw new HttpException('Commission not found', HttpStatus.NOT_FOUND);
      }

      return {
        splitId: commission.splitId,
        sourceId: commission.sourceId,
        sourceType: commission.sourceType,
        role: commission.role,
        amount: commission.amount,
        currency: commission.currency,
        status: commission.status,
        organizationId: commission.organizationId,
        commissionScheduleSnapshot: commission.commissionScheduleSnapshot,
      };
    } catch (error) {
      this.logger.error('Failed to fetch commission detail', error);
      throw new HttpException(
        'Failed to fetch commission detail',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    message: string;
  }> {
    return {
      healthy: true,
      message: 'Agent Portal Service is operational',
    };
  }
}
