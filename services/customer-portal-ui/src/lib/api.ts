import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

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
  initiateOtp: async (phoneNumber: string) => {
    const response = await api.post('/otp/initiate', { phoneNumber })
    return response.data
  },

  verifyOtp: async (phoneNumber: string, otpCode: string) => {
    const response = await api.post('/otp/verify', { phoneNumber, otpCode })
    return response.data
  },

  getSession: async () => {
    const response = await api.get('/session')
    return response.data
  },

  revokeSession: async () => {
    const response = await api.post('/session/revoke')
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

  scheduleRenewal: async (policyId: string, data: {
    newStartDate: string
    newEndDate: string
    newPremium?: number
    type?: string
    notes?: string
  }) => {
    const response = await api.post(`/policies/${policyId}/renewal`, {
      newEndDate: data.newEndDate,
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
    const response = await api.post('/fnol', data)
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

export default api
