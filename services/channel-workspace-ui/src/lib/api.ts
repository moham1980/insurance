const API_URL = process.env.NEXT_PUBLIC_CHANNEL_BFF_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3020';

export function getAuthHeaders(): Record<string, string> {
  if (typeof document === 'undefined') return {};
  const tokenMatch = document.cookie.match(new RegExp('(^| )auth-token=([^;]+)'));
  const token = tokenMatch ? decodeURIComponent(tokenMatch[2]) : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchBFF(path: string, init?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function postBFF(path: string, body: any) {
  return fetchBFF(path, { method: 'POST', body: JSON.stringify(body) });
}

export async function patchBFF(path: string, body: any) {
  return fetchBFF(path, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function loginBFF(username: string, password: string) {
  const res = await fetch(`${API_URL}/api/v1/channel/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export const channelApi = {
  getCapabilities: () => fetchBFF('/api/v1/channel/capabilities'),
  getDashboard: () => fetchBFF('/api/v1/channel/dashboard'),
  getWorkspaces: () => fetchBFF('/api/v1/channel/workspaces/mine'),
  getSubAgents: () => fetchBFF('/api/v1/channel/sub-agents'),
  createSubAgent: (data: any) => postBFF('/api/v1/channel/sub-agents', data),
  updateSubAgent: (id: string, data: any) => patchBFF(`/api/v1/channel/sub-agents/${id}`, data),
  getPartners: () => fetchBFF('/api/v1/channel/partners'),
  createPartner: (data: any) => postBFF('/api/v1/channel/partners', data),
  updatePartner: (id: string, data: any) => patchBFF(`/api/v1/channel/partners/${id}`, data),
};

export const brokerApi = {
  getCapabilities: () => fetchBFF('/api/v1/broker/capabilities'),
  getDashboard: () => fetchBFF('/api/v1/broker/dashboard'),
  getAgreements: () => fetchBFF('/api/v1/broker/carrier-agreements'),
  getAgreement: (id: string) => fetchBFF(`/api/v1/broker/carrier-agreements/${id}`),
  createAgreement: (data: any) => postBFF('/api/v1/broker/carrier-agreements', data),
  getOfferings: () => fetchBFF('/api/v1/broker/product-offerings'),
  getPlacements: () => fetchBFF('/api/v1/broker/placements'),
  getSettlements: () => fetchBFF('/api/v1/broker/settlements'),
  getClaims: () => fetchBFF('/api/v1/broker/claim-advocacy-cases'),
  getContracts: () => fetchBFF('/api/v1/broker/contracts'),
  getContract: (id: string) => fetchBFF(`/api/v1/broker/contracts/${id}`),
  createContract: (data: any) => postBFF('/api/v1/broker/contracts', data),
  getSubAgents: () => fetchBFF('/api/v1/broker/sub-agents'),
  createSubAgent: (data: any) => postBFF('/api/v1/broker/sub-agents', data),
  getPartners: () => fetchBFF('/api/v1/broker/partners'),
  createPartner: (data: any) => postBFF('/api/v1/broker/partners', data),
};
