const API_URL = process.env.NEXT_PUBLIC_BROKER_BFF_URL || 'http://localhost:3030';
const API_PREFIX = '/api/v1';

export function getAuthHeaders(): Record<string, string> {
  if (typeof document === 'undefined') return {};
  const tokenMatch = document.cookie.match(new RegExp('(^| )auth-token=([^;]+)'));
  const token = tokenMatch ? decodeURIComponent(tokenMatch[2]) : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchBFF(path: string, init?: RequestInit) {
  const res = await fetch(`${API_URL}${API_PREFIX}${path}`, {
    ...init,
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function postBFF(path: string, body: any) {
  return fetchBFF(path, { method: 'POST', body: JSON.stringify(body) });
}

export const brokerApi = {
  // Dashboard
  getDashboard: () => fetchBFF('/broker/dashboard'),

  // Claims
  listClaims: (limit = 50, offset = 0) => fetchBFF(`/broker/claims?limit=${limit}&offset=${offset}`),
  getClaim: (id: string) => fetchBFF(`/broker/claims/${id}`),
  createFnol: (data: any) => postBFF('/broker/claims/fnol', data),
  assessClaim: (id: string, data: any) => postBFF(`/broker/claims/${id}/assess`, data),
  approveClaim: (id: string, data: any) => postBFF(`/broker/claims/${id}/approve`, data),
  rejectClaim: (id: string, data: any) => postBFF(`/broker/claims/${id}/reject`, data),
  addClaimCommunication: (id: string, data: any) => postBFF(`/broker/claims/${id}/communications`, data),
  getClaimAdvocacy: (id: string) => fetchBFF(`/broker/claims/${id}/advocacy`),
  openAdvocacyCase: (id: string, data: any) => postBFF(`/broker/claims/${id}/advocacy-cases`, data),

  // Policies
  listPolicies: (params?: { status?: string; partyId?: string; limit?: number; offset?: number }) => {
    let q = `limit=${params?.limit ?? 50}&offset=${params?.offset ?? 0}`;
    if (params?.status) q += `&status=${params.status}`;
    if (params?.partyId) q += `&partyId=${params.partyId}`;
    return fetchBFF(`/broker/policies?${q}`);
  },
  getPolicy: (id: string) => fetchBFF(`/broker/policies/${id}`),
  getPolicyDetails: (id: string) => fetchBFF(`/broker/policies/${id}/details`),
  listPolicyEndorsements: (id: string) => fetchBFF(`/broker/policies/${id}/endorsements`),
  getPolicyHistory: (id: string) => fetchBFF(`/broker/policies/${id}/history`),
  requestQuote: (data: any) => postBFF('/broker/policies/quote', data),
  convertQuote: (data: any) => postBFF('/broker/policies/convert-quote', data),
  endorsePolicy: (id: string, data: any) => postBFF(`/broker/policies/${id}/endorse`, data),
  renewPolicy: (id: string, data: any) => postBFF(`/broker/policies/${id}/renew`, data),

  // Payments
  listPayments: (params?: { policyId?: string; claimId?: string; status?: string; limit?: number; offset?: number }) => {
    let q = `limit=${params?.limit ?? 50}&offset=${params?.offset ?? 0}`;
    if (params?.policyId) q += `&policyId=${params.policyId}`;
    if (params?.claimId) q += `&claimId=${params.claimId}`;
    if (params?.status) q += `&status=${params.status}`;
    return fetchBFF(`/broker/payments?${q}`);
  },
  getPayment: (id: string) => fetchBFF(`/broker/payments/${id}`),
  getPaymentIntent: (id: string) => fetchBFF(`/broker/payments/intents/${id}`),

  // Underwriting
  listUnderwriting: (params?: { status?: string; policyId?: string; limit?: number; offset?: number }) => {
    let q = `limit=${params?.limit ?? 50}&offset=${params?.offset ?? 0}`;
    if (params?.status) q += `&status=${params.status}`;
    if (params?.policyId) q += `&policyId=${params.policyId}`;
    return fetchBFF(`/broker/underwriting/requests?${q}`);
  },
  getUnderwriting: (id: string) => fetchBFF(`/broker/underwriting/requests/${id}`),
  appealUnderwriting: (id: string, reason: string, additionalData?: Record<string, any>) =>
    postBFF(`/broker/underwriting/requests/${id}/appeal`, { reason, additionalData }),
  getUnderwritingSlaMetrics: (from?: string, to?: string) => {
    let q = '';
    if (from) q += `from=${from}`;
    if (to) q += `${q ? '&' : ''}to=${to}`;
    return fetchBFF(`/broker/underwriting/sla/metrics${q ? '?' + q : ''}`);
  },

  // Collections
  listCollectionsPlans: (params?: { policyId?: string; status?: string; limit?: number; offset?: number }) => {
    let q = `limit=${params?.limit ?? 50}&offset=${params?.offset ?? 0}`;
    if (params?.policyId) q += `&policyId=${params.policyId}`;
    if (params?.status) q += `&status=${params.status}`;
    return fetchBFF(`/broker/collections/plans?${q}`);
  },
  getCollectionsPlan: (id: string) => fetchBFF(`/broker/collections/plans/${id}`),
  listCollectionsInstallments: (planId: string) => fetchBFF(`/broker/collections/plans/${planId}/installments`),
  getCollectionsInstallment: (id: string) => fetchBFF(`/broker/collections/installments/${id}`),

  // Regulatory
  validateBrokerLicense: (data: any) => postBFF('/broker/regulatory/broker-license/validate', data),
  validateBrokerLicenseBatch: (data: any) => postBFF('/broker/regulatory/broker-license/validate-batch', data),
  getLicenseStatusChanges: (brokerCentralCode?: string) => {
    let q = '';
    if (brokerCentralCode) q += `brokerCentralCode=${brokerCentralCode}`;
    return fetchBFF(`/broker/regulatory/broker-license/status-changes${q ? '?' + q : ''}`);
  },
  sanhabInquiry: (data: any) => postBFF('/broker/regulatory/sanhab/inquiry', data),
  warehouseFireInquiry: (data: any) => postBFF('/broker/regulatory/warehouse-fire/inquire', data),

  // Agreements & Offerings
  listAgreements: (limit = 50, offset = 0) => fetchBFF(`/broker/agreements?limit=${limit}&offset=${offset}`),
  listOfferings: (limit = 50, offset = 0) => fetchBFF(`/broker/offerings?limit=${limit}&offset=${offset}`),

  // Submissions & Placements
  listSubmissions: (limit = 50, offset = 0) => fetchBFF(`/broker/submissions?limit=${limit}&offset=${offset}`),
  getSubmission: (id: string) => fetchBFF(`/broker/submissions/${id}`),
  getQuotes: (submissionId: string) => fetchBFF(`/broker/quotes/${submissionId}`),
  listPlacements: (params?: { status?: string; submissionId?: string; limit?: number; offset?: number }) => {
    let q = `limit=${params?.limit ?? 50}&offset=${params?.offset ?? 0}`;
    if (params?.status) q += `&status=${params.status}`;
    if (params?.submissionId) q += `&submissionId=${params.submissionId}`;
    return fetchBFF(`/broker/placements?${q}`);
  },
  getPlacement: (id: string) => fetchBFF(`/broker/placements/${id}`),
  createPlacement: (data: any) => postBFF('/broker/placements', data),
  bindPlacement: (id: string) => postBFF(`/broker/placements/${id}/bind`, {}),
  retryPlacement: (id: string) => postBFF(`/broker/placements/${id}/retry`, {}),
  cancelPlacement: (id: string) => postBFF(`/broker/placements/${id}/cancel`, {}),

  // Commissions & Sub-agents
  listCommissions: (limit = 50, offset = 0) => fetchBFF(`/broker/commissions?limit=${limit}&offset=${offset}`),
  listSubAgents: (limit = 50, offset = 0) => fetchBFF(`/broker/sub-agents?limit=${limit}&offset=${offset}`),
};
