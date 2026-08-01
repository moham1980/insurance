import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18027'

const api = axios.create({
  baseURL: `${API_BASE_URL}/customer-portal`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const tokenMatch = typeof document !== 'undefined' ? document.cookie.match(new RegExp('(^| )auth-token=([^;]+)')) : null
  const token = tokenMatch ? decodeURIComponent(tokenMatch[2]) : null
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

// Response interceptor to handle errors
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: unknown) => {
    const axiosError = error as { response?: { status?: number } }
    if (axios.isAxiosError(error) && axiosError.response?.status === 401) {
      // Token expired or invalid, redirect to login
      if (typeof window !== 'undefined') {
        document.cookie = 'auth-token=; Max-Age=0; path=/'
        window.location.href = '/'
      }
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  initiateOtp: async (tenantId: string, phoneNumber: string) => {
    const response = await api.post('/otp/initiate', { tenantId, phoneNumber })
    return response.data
  },

  verifyOtp: async (sessionId: string, otp: string) => {
    const response = await api.post('/otp/verify', { sessionId, otp })
    return response.data
  },

  getSession: async (sessionId: string) => {
    const response = await api.get(`/session/${sessionId}`)
    return response.data
  },

  revokeSession: async (sessionId: string) => {
    const response = await api.post(`/session/${sessionId}/revoke`)
    return response.data
  },
}

export const policiesApi = {
  list: async () => {
    const response = await api.get('/policies')
    return response.data
  },

  getById: async (policyId: string) => {
    const response = await api.get(`/policies/${policyId}`)
    return response.data
  },

  endorse: async (policyId: string, data: {
    endorsementType: string
    payload: Record<string, any>
    effectiveDate?: string
    reason?: string
  }) => {
    const response = await api.post(`/policies/${policyId}/endorsement`, data)
    return response.data
  },

  listEndorsements: async (policyId: string) => {
    const response = await api.get(`/policies/${policyId}/endorsements`)
    return response.data
  },

  getEndorsementById: async (policyId: string, endorsementId: string) => {
    const response = await api.get(`/policies/${policyId}/endorsements/${endorsementId}`)
    return response.data
  },

  trackEndorsement: async (policyId: string, endorsementId: string) => {
    const response = await api.get(`/policies/${policyId}/endorsements/${endorsementId}/track`)
    return response.data
  },

  getRenewalQuotes: async (policyId: string) => {
    const response = await api.get(`/policies/${policyId}/renewal/quotes`)
    return response.data
  },

  compareRenewalQuotes: async (policyId: string, productIds?: string[], effectiveDate?: string) => {
    const response = await api.post(`/policies/${policyId}/renewal/compare-quotes`, { productIds, effectiveDate })
    return response.data
  },

  acceptRenewalQuote: async (policyId: string, quoteId: string) => {
    const response = await api.post(`/policies/${policyId}/renewal/quotes/${quoteId}/accept`)
    return response.data
  },

  scheduleRenewal: async (policyId: string, data: {
    newStartDate: string
    newEndDate: string
    newPremium?: number
    type?: string
    notes?: string
  }) => {
    const response = await api.post(`/policies/${policyId}/renewal`, {
      newStartDate: data.newStartDate,
      newEndDate: data.newEndDate,
      newPremium: data.newPremium,
      type: data.type,
      notes: data.notes,
    })
    return response.data
  },
}

export const claimsApi = {
  list: async () => {
    const response = await api.get('/claims')
    return response.data
  },

  getById: async (claimId: string) => {
    const response = await api.get(`/claims/${claimId}`)
    return response.data
  },

  submitFnol: async (data: any) => {
    const response = await api.post('/claims/fnol', data)
    return response.data
  },

  getAdvocacyCases: async (claimId: string) => {
    const response = await api.get(`/claims/${claimId}/advocacy`)
    return response.data
  },

  openAdvocacyCase: async (claimId: string, data: { description: string; priority?: string }) => {
    const response = await api.post(`/claims/${claimId}/advocacy`, data)
    return response.data
  },

  getAdvocacyCommunications: async (claimId: string, caseId: string) => {
    const response = await api.get(`/claims/${claimId}/advocacy/${caseId}/communications`)
    return response.data
  },

  addAdvocacyCommunication: async (claimId: string, caseId: string, data: { message: string; type?: string }) => {
    const response = await api.post(`/claims/${claimId}/advocacy/${caseId}/communications`, data)
    return response.data
  },

  getAdjusterCommunications: async (claimId: string) => {
    const response = await api.get(`/claims/${claimId}/adjuster-communications`)
    return response.data
  },

  sendAdjusterMessage: async (claimId: string, data: { message: string; attachments?: string[] }) => {
    const response = await api.post(`/claims/${claimId}/adjuster-communications`, data)
    return response.data
  },
}

export const paymentsApi = {
  list: async () => {
    const response = await api.get('/payments')
    return response.data
  },

  getById: async (paymentId: string) => {
    const response = await api.get(`/payments/${paymentId}`)
    return response.data
  },
}

export const offeringsApi = {
  list: async () => {
    const response = await api.get('/offerings')
    return response.data
  },

  requestQuote: async (data: {
    offeringId: string
    customerInfo: {
      nationalId?: string
      phone?: string
      vehicleType?: string
      vehicleYear?: string
      propertyType?: string
      propertySize?: string
      age?: string
      familySize?: string
    }
  }) => {
    const response = await api.post('/offerings/request-quote', data)
    return response.data
  },

  compareQuotes: async (rfqId: string) => {
    const response = await api.get(`/rfq/${rfqId}/compare-quotes`)
    return response.data
  },

  acceptQuote: async (rfqId: string, quoteId: string) => {
    const response = await api.post(`/rfq/${rfqId}/quotes/${quoteId}/accept`)
    return response.data
  },
}

export const complaintsApi = {
  list: async () => {
    const response = await api.get('/complaints')
    return response.data
  },

  getById: async (complaintId: string) => {
    const response = await api.get(`/complaints/${complaintId}`)
    return response.data
  },

  create: async (data: any) => {
    const response = await api.post('/complaints', data)
    return response.data
  },
}

const CUSTOMER_360_BASE_URL = process.env.NEXT_PUBLIC_CUSTOMER_360_URL || 'http://localhost:18026'

const customer360Client = axios.create({
  baseURL: `${CUSTOMER_360_BASE_URL}/customer-360`,
  headers: { 'Content-Type': 'application/json' },
})

customer360Client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const tokenMatch = typeof document !== 'undefined' ? document.cookie.match(new RegExp('(^| )auth-token=([^;]+)')) : null
  const token = tokenMatch ? decodeURIComponent(tokenMatch[2]) : null
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

export const customer360Api = {
  getProfile: async (customerId: string) => {
    const response = await customer360Client.get(`/${customerId}`)
    return response.data
  },

  getPortfolio: async (customerId: string) => {
    const response = await customer360Client.get(`/${customerId}/portfolio`)
    return response.data
  },

  listConsents: async (customerId: string) => {
    const response = await customer360Client.get(`/${customerId}/consents`)
    return response.data
  },

  recordConsent: async (customerId: string, data: { purpose: string; status?: 'granted' | 'denied'; expiresAt?: string }) => {
    const response = await customer360Client.post(`/${customerId}/consents`, data)
    return response.data
  },

  revokeConsent: async (customerId: string, consentId: string, reason?: string) => {
    const response = await customer360Client.post(`/${customerId}/consents/${consentId}/revoke`, { reason })
    return response.data
  },

  checkConsent: async (customerId: string, purpose: string) => {
    const response = await customer360Client.get(`/${customerId}/consents/check`, { params: { purpose } })
    return response.data
  },
}

export default api
