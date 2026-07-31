// API Client for Agent Portal UI

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3032';
// Enforce HTTPS in production
if (process.env.NODE_ENV === 'production' && API_BASE_URL.startsWith('http://') && !API_BASE_URL.includes('localhost')) {
  console.warn('WARNING: NEXT_PUBLIC_API_URL should use HTTPS in production');
}

interface DashboardStats {
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

interface PremiumTrendData {
  month: string;
  premium: number;
  policies: number;
}

interface CommissionHistoryData {
  month: string;
  commission: number;
  paid: number;
  pending: number;
}

interface PolicyPortfolioData {
  product: string;
  count: number;
  premium: number;
}

interface AgentPolicy {
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

interface AgentCommission {
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

class AgentPortalAPI {
  private baseUrl: string;
  private token: string | null = null;
  private agentId: string | null = null;
  private partnerId: string | null = null;
  private tenantId: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  setAuth(token: string, agentId: string, partnerId: string, tenantId?: string) {
    this.token = token;
    this.agentId = agentId;
    this.partnerId = partnerId;
    this.tenantId = tenantId || null;
  }

  clearAuth() {
    this.token = null;
    this.agentId = null;
    this.partnerId = null;
    this.tenantId = null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async login(username: string, password: string): Promise<{ token: string; agentId: string; partnerId: string; tenantId: string }> {
    const response = await this.request<{ success: boolean; data: { token: string; agentId: string; partnerId: string; tenantId: string } }>('/agent-portal/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (response.success && response.data) {
      this.setAuth(response.data.token, response.data.agentId, response.data.partnerId, response.data.tenantId);
      return response.data;
    }

    throw new Error('Login failed');
  }

  async createSession(tenantId: string, agentId: string, jwtToken: string): Promise<any> {
    const response = await this.request<{ success: boolean; data: any }>('/agent-portal/session', {
      method: 'POST',
      body: JSON.stringify({ tenantId, agentId, jwtToken }),
    });
    return response.data;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    if (!this.agentId || !this.partnerId) {
      throw new Error('Not authenticated');
    }

    const response = await this.request<{ success: boolean; data: DashboardStats }>(
      `/agent-portal/agent/${this.agentId}/dashboard?partnerId=${this.partnerId}`
    );

    return response.data;
  }

  async getPolicies(filters?: { status?: string; fromDate?: string; toDate?: string }): Promise<AgentPolicy[]> {
    if (!this.agentId || !this.partnerId) {
      throw new Error('Not authenticated');
    }

    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.fromDate) params.append('fromDate', filters.fromDate);
    if (filters?.toDate) params.append('toDate', filters.toDate);

    const response = await this.request<{ success: boolean; data: AgentPolicy[] }>(
      `/agent-portal/agent/${this.agentId}/policies?partnerId=${this.partnerId}&${params.toString()}`
    );

    return response.data;
  }

  async getCommissions(filters?: { status?: string; fromDate?: string; toDate?: string }): Promise<AgentCommission[]> {
    if (!this.agentId || !this.partnerId) {
      throw new Error('Not authenticated');
    }

    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.fromDate) params.append('fromDate', filters.fromDate);
    if (filters?.toDate) params.append('toDate', filters.toDate);

    const response = await this.request<{ success: boolean; data: AgentCommission[] }>(
      `/agent-portal/agent/${this.agentId}/commissions?partnerId=${this.partnerId}&${params.toString()}`
    );

    return response.data;
  }

  async getPremiumTrends(months: number = 12): Promise<PremiumTrendData[]> {
    if (!this.agentId || !this.partnerId) {
      throw new Error('Not authenticated');
    }

    const response = await this.request<{ success: boolean; data: PremiumTrendData[] }>(
      `/agent-portal/dashboard/premium-trends?agentId=${this.agentId}&partnerId=${this.partnerId}&months=${months}`
    );

    return response.data;
  }

  async getCommissionHistory(months: number = 12): Promise<CommissionHistoryData[]> {
    if (!this.agentId || !this.partnerId) {
      throw new Error('Not authenticated');
    }

    const response = await this.request<{ success: boolean; data: CommissionHistoryData[] }>(
      `/agent-portal/dashboard/commission-history?agentId=${this.agentId}&partnerId=${this.partnerId}&months=${months}`
    );

    return response.data;
  }

  async getPolicyPortfolio(): Promise<PolicyPortfolioData[]> {
    if (!this.agentId || !this.partnerId) {
      throw new Error('Not authenticated');
    }

    const response = await this.request<{ success: boolean; data: PolicyPortfolioData[] }>(
      `/agent-portal/dashboard/policy-portfolio?agentId=${this.agentId}&partnerId=${this.partnerId}`
    );

    return response.data;
  }

  // ── Claims & Advocacy ────────────────────────────────────────────────

  async getClaims(filters?: { status?: string; limit?: number; offset?: number }): Promise<any[]> {
    if (!this.agentId || !this.partnerId) throw new Error('Not authenticated');
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));
    const response = await this.request<{ success: boolean; data: any[] }>(
      `/agent-portal/agent/${this.agentId}/claims?partnerId=${this.partnerId}&${params.toString()}`
    );
    return response.data;
  }

  async getClaimDetails(claimId: string): Promise<any> {
    if (!this.agentId || !this.partnerId) throw new Error('Not authenticated');
    const response = await this.request<{ success: boolean; data: any }>(
      `/agent-portal/agent/${this.agentId}/claims/${claimId}/status?partnerId=${this.partnerId}`
    );
    return response.data;
  }

  async getClaimAdvocacy(claimId: string): Promise<any> {
    if (!this.agentId || !this.partnerId) throw new Error('Not authenticated');
    const response = await this.request<{ success: boolean; data: any }>(
      `/agent-portal/claims/${claimId}/advocacy?agentId=${this.agentId}&partnerId=${this.partnerId}`
    );
    return response.data;
  }

  async closeAdvocacyCase(caseId: string, reason: string): Promise<any> {
    if (!this.agentId || !this.partnerId) throw new Error('Not authenticated');
    const response = await this.request<{ success: boolean; data: any }>(
      `/agent-portal/advocacy-cases/${caseId}/close`,
      { method: 'POST', body: JSON.stringify({ reason }) }
    );
    return response.data;
  }

  async listAdvocacyTasks(caseId: string, status?: string): Promise<any[]> {
    if (!this.agentId || !this.partnerId) throw new Error('Not authenticated');
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    const response = await this.request<{ success: boolean; data: any[] }>(
      `/agent-portal/advocacy-cases/${caseId}/tasks?${params.toString()}`
    );
    return response.data;
  }

  async updateAdvocacyTaskStatus(caseId: string, taskId: string, status: string): Promise<any> {
    if (!this.agentId || !this.partnerId) throw new Error('Not authenticated');
    const response = await this.request<{ success: boolean; data: any }>(
      `/agent-portal/advocacy-cases/${caseId}/tasks/${taskId}`,
      { method: 'PATCH', body: JSON.stringify({ status }) }
    );
    return response.data;
  }

  // ── Adjuster Referrals ───────────────────────────────────────────────

  async createAdjusterReferral(claimId: string, body: any): Promise<any> {
    if (!this.agentId || !this.partnerId) throw new Error('Not authenticated');
    const response = await this.request<{ success: boolean; data: any }>(
      `/agent-portal/claims/${claimId}/adjuster-referrals`,
      { method: 'POST', body: JSON.stringify(body) }
    );
    return response.data;
  }

  async acceptAdjusterReferral(referralId: string): Promise<any> {
    if (!this.agentId || !this.partnerId) throw new Error('Not authenticated');
    const response = await this.request<{ success: boolean; data: any }>(
      `/agent-portal/adjuster-referrals/${referralId}/accept`,
      { method: 'POST' }
    );
    return response.data;
  }

  async rejectAdjusterReferral(referralId: string, reason: string): Promise<any> {
    if (!this.agentId || !this.partnerId) throw new Error('Not authenticated');
    const response = await this.request<{ success: boolean; data: any }>(
      `/agent-portal/adjuster-referrals/${referralId}/reject`,
      { method: 'POST', body: JSON.stringify({ reason }) }
    );
    return response.data;
  }

  async submitAdjusterReport(referralId: string, body: any): Promise<any> {
    if (!this.agentId || !this.partnerId) throw new Error('Not authenticated');
    const response = await this.request<{ success: boolean; data: any }>(
      `/agent-portal/adjuster-referrals/${referralId}/submit-report`,
      { method: 'POST', body: JSON.stringify(body) }
    );
    return response.data;
  }

  // ── Recovery Tracking ────────────────────────────────────────────────

  async createRecoveryCase(claimId: string, body: any): Promise<any> {
    if (!this.agentId || !this.partnerId) throw new Error('Not authenticated');
    const response = await this.request<{ success: boolean; data: any }>(
      `/agent-portal/claims/${claimId}/recovery`,
      { method: 'POST', body: JSON.stringify(body) }
    );
    return response.data;
  }

  async getRecoveryCase(recoveryId: string): Promise<any> {
    if (!this.agentId || !this.partnerId) throw new Error('Not authenticated');
    const response = await this.request<{ success: boolean; data: any }>(
      `/agent-portal/recovery/${recoveryId}`
    );
    return response.data;
  }

  async listRecoveryCases(claimId?: string): Promise<any[]> {
    if (!this.agentId || !this.partnerId) throw new Error('Not authenticated');
    if (!claimId) throw new Error('claimId is required');
    const response = await this.request<{ success: boolean; data: any[] }>(
      `/agent-portal/claims/${claimId}/recovery`
    );
    return response.data;
  }

  async updateRecoveryStatus(recoveryId: string, status: string): Promise<any> {
    if (!this.agentId || !this.partnerId) throw new Error('Not authenticated');
    const response = await this.request<{ success: boolean; data: any }>(
      `/agent-portal/recovery/${recoveryId}/status`,
      { method: 'PATCH', body: JSON.stringify({ status }) }
    );
    return response.data;
  }

  // ── Customer Detail ──────────────────────────────────────────────────

  async getCustomerDetail(customerId: string): Promise<any> {
    if (!this.agentId || !this.partnerId) throw new Error('Not authenticated');
    const response = await this.request<{ success: boolean; data: any }>(
      `/agent-portal/agent/${this.agentId}/customers/${customerId}?partnerId=${this.partnerId}`
    );
    return response.data;
  }

  async getCommissionDetail(commissionId: string): Promise<any> {
    if (!this.agentId || !this.partnerId) throw new Error('Not authenticated');
    const response = await this.request<{ success: boolean; data: any }>(
      `/agent-portal/agent/${this.agentId}/commissions/${commissionId}?partnerId=${this.partnerId}`
    );
    return response.data;
  }

  // ── Leads ────────────────────────────────────────────────────────────

  async generateNbaActions(params: { contextType: string; resourceId: string }): Promise<any> {
    const response = await this.request<{ success: boolean; data: any }>(
      `/copilot/nba/${encodeURIComponent(params.contextType)}/${encodeURIComponent(params.resourceId)}/actions`,
      { method: 'POST' },
    );
    return response.data;
  }

  async listNbaActions(params: { contextType: string; resourceId: string; limit?: number; offset?: number }): Promise<any> {
    const query = new URLSearchParams();
    query.set('contextType', params.contextType);
    query.set('resourceId', params.resourceId);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));
    const response = await this.request<{ success: boolean; data: any[]; pagination?: any }>(
      `/copilot/nba/actions?${query.toString()}`,
    );
    return response.data;
  }

  async executeNbaAction(logId: string): Promise<any> {
    const response = await this.request<{ success: boolean; data: any }>(`/copilot/nba/${encodeURIComponent(logId)}/execute`, {
      method: 'POST',
    });
    return response.data;
  }

  async optOutNbaAction(logId: string, reason?: string): Promise<any> {
    const response = await this.request<{ success: boolean; data: any }>(`/copilot/nba/${encodeURIComponent(logId)}/opt-out`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return response.data;
  }

  async getLeads(): Promise<Array<{
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
    if (!this.agentId || !this.partnerId) {
      throw new Error('Not authenticated');
    }

    const response = await this.request<{ success: boolean; data: Array<{
      id: string;
      name: string;
      phone: string;
      email?: string;
      productInterest: string;
      status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
      priority: 'high' | 'medium' | 'low';
      createdAt: string;
      notes?: string;
    }> }>(
      `/agent-portal/leads?agentId=${this.agentId}&partnerId=${this.partnerId}`
    );

    return response.data;
  }

  // WebSocket connection for real-time updates
  connectWebSocket(): WebSocket | null {
    if (!this.token || !this.agentId) {
      return null;
    }

    const wsUrl = `${this.baseUrl.replace('http', 'ws')}/agent-portal/ws?agentId=${this.agentId}`;
    const ws = new WebSocket(wsUrl, [`auth.${this.token}`]);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return ws;
  }

  // SSE connection for real-time updates
  connectEventSource(onMessage: (data: any) => void): EventSource | null {
    if (!this.token || !this.agentId) {
      return null;
    }

    // SSE doesn't support custom headers, so use EventSource with auth in URL
    // But we can mitigate by using a short-lived token or cookie-based auth
    const sseUrl = `${this.baseUrl}/agent-portal/sse?agentId=${this.agentId}`;
    const eventSource = new EventSource(sseUrl, { withCredentials: true });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      eventSource.close();
    };

    return eventSource;
  }
}

export const agentPortalAPI = new AgentPortalAPI();
