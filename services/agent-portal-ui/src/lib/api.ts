// API Client for Agent Portal UI

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
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

  async getDashboardStats(): Promise<DashboardStats> {
    if (!this.agentId || !this.partnerId) {
      throw new Error('Not authenticated');
    }

    const response = await this.request<{ success: boolean; data: DashboardStats }>(
      `/agent-portal/dashboard/stats?agentId=${this.agentId}&partnerId=${this.partnerId}`
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
      `/agent-portal/policies?agentId=${this.agentId}&partnerId=${this.partnerId}&${params.toString()}`
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
      `/agent-portal/commissions?agentId=${this.agentId}&partnerId=${this.partnerId}&${params.toString()}`
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
