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
    const expiresAt = new Date(Date.now() + this.parseExpiresIn(params.expiresIn));

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

  async getDashboardStats(agentId: string, partnerId: string, tenantId?: string, authToken?: string): Promise<AgentDashboardStats> {
    this.logger.log(`Fetching dashboard stats for agent ${agentId}, partner ${partnerId}`);

    const salesNetworkUrl = process.env.SALES_NETWORK_URL || 'http://sales-network-service:3022';

    const headers: Record<string, string> = {
      'x-partner-id': partnerId,
    };
    if (tenantId) headers['x-tenant-id'] = tenantId;
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    try {
      // Fetch stats from sales network service with retry logic
      const statsResponse: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(
            `${salesNetworkUrl}/sales-network/agents/${agentId}/stats`,
            { headers },
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
    },
    tenantId?: string,
    authToken?: string
  ): Promise<AgentPolicy[]> {
    this.logger.log(`Fetching policies for agent ${agentId}, partner ${partnerId}`);

    const salesNetworkUrl = process.env.SALES_NETWORK_URL || 'http://sales-network-service:3022';

    const headers: Record<string, string> = {
      'x-partner-id': partnerId,
    };
    if (tenantId) headers['x-tenant-id'] = tenantId;
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

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
    },
    tenantId?: string,
    authToken?: string
  ): Promise<AgentClaim[]> {
    this.logger.log(`Fetching claims for agent ${agentId}, partner ${partnerId}`);

    const salesNetworkUrl = process.env.SALES_NETWORK_URL || 'http://sales-network-service:3022';

    const headers: Record<string, string> = {
      'x-partner-id': partnerId,
    };
    if (tenantId) headers['x-tenant-id'] = tenantId;
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

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
    authToken?: string
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
              params: { search },
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
    },
    tenantId?: string,
    authToken?: string
  ): Promise<AgentCommission[]> {
    this.logger.log(`Fetching commissions for agent ${agentId}, partner ${partnerId}`);

    const salesNetworkUrl = process.env.SALES_NETWORK_URL || 'http://sales-network-service:3022';

    const headers: Record<string, string> = {
      'x-partner-id': partnerId,
    };
    if (tenantId) headers['x-tenant-id'] = tenantId;
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

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
