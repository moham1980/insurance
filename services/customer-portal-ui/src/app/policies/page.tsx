'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Search, Filter, ChevronLeft, Download, Shield } from 'lucide-react'
import { policiesApi } from '@/lib/api'
import { useBrandTheme } from '@/config/brand-provider'

interface Policy {
  policyId: string
  policyNumber: string
  productName: string
  insurerName: string
  status: 'active' | 'expired' | 'cancelled' | 'pending'
  startDate: string
  endDate: string
  premiumAmount: number
  coverageAmount: number
  currency: string
}

const statusLabels: Record<string, string> = {
  active: 'فعال',
  expired: 'منقضی',
  cancelled: 'لغو شده',
  pending: 'در انتظار',
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  expired: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
}

export default function PoliciesPage() {
  const router = useRouter()
  const brand = useBrandTheme()
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    const tokenMatch = document.cookie.match(new RegExp('(^| )auth-token=([^;]+)'))
    if (!tokenMatch) {
      router.push('/')
      return
    }
    loadPolicies()
  }, [router])

  const loadPolicies = async () => {
    setLoading(true)
    try {
      const res = await policiesApi.list()
      setPolicies(res?.data || [])
    } catch (err: any) {
      setError(err.message || 'خطا در بارگذاری بیمه‌نامه‌ها')
    } finally {
      setLoading(false)
    }
  }

  const filtered = policies.filter((p) => {
    const matchesSearch =
      !search ||
      p.policyNumber?.includes(search) ||
      p.productName?.includes(search) ||
      p.insurerName?.includes(search)
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleDateString('fa-IR')
    } catch {
      return dateStr
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'IRR') {
      return new Intl.NumberFormat('fa-IR').format(amount) + ' ریال'
    }
    return new Intl.NumberFormat('fa-IR').format(amount) + ' ' + (currency || 'IRR')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => router.push('/dashboard')}
          className="p-2 rounded-lg hover:bg-bg-raised transition-colors"
          aria-label="بازگشت"
        >
          <ChevronLeft className="h-5 w-5 rotate-180" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">بیمه‌نامه‌ها</h1>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="جستجوی بیمه‌نامه..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border-default bg-bg-base pr-10 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border-default bg-bg-base px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
        >
          <option value="all">همه</option>
          <option value="active">فعال</option>
          <option value="expired">منقضی</option>
          <option value="cancelled">لغو شده</option>
          <option value="pending">در انتظار</option>
        </select>
      </div>

      {/* Policy List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <FileText className="mx-auto h-12 w-12 mb-3 opacity-50" />
          <p>بیمه‌نامه‌ای یافت نشد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((policy) => (
            <div
              key={policy.policyId}
              className="rounded-xl border border-border-default bg-bg-raised p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/policies/${policy.policyId}`)}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-text-primary">{policy.productName}</p>
                  <p className="text-sm text-text-muted">{policy.insurerName}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[policy.status] || 'bg-gray-100 text-gray-800'}`}
                >
                  {statusLabels[policy.status] || policy.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-text-muted">شماره بیمه‌نامه</p>
                  <p className="font-medium text-text-primary">{policy.policyNumber}</p>
                </div>
                <div>
                  <p className="text-text-muted">حق بیمه</p>
                  <p className="font-medium text-text-primary">{formatCurrency(policy.premiumAmount, policy.currency)}</p>
                </div>
                <div>
                  <p className="text-text-muted">تاریخ شروع</p>
                  <p className="font-medium text-text-primary">{formatDate(policy.startDate)}</p>
                </div>
                <div>
                  <p className="text-text-muted">تاریخ پایان</p>
                  <p className="font-medium text-text-primary">{formatDate(policy.endDate)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {brand.legalTextFa && (
        <p className="text-xs text-text-muted text-center mt-4">{brand.legalTextFa}</p>
      )}
    </div>
  )
}
