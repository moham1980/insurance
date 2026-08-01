'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Search, Filter, ChevronLeft, Download, Shield, Car, Home, Heart, Plus } from 'lucide-react'
import { policiesApi } from '@/lib/api'
import { useBrandTheme } from '@/config/brand-provider'
import { Card } from '@insurance/design-system'
import { MOCK_POLICIES } from '@/lib/mock-data'

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
  active: 'bg-feedback-success-subtle text-feedback-success',
  expired: 'bg-bg-overlay text-text-primary',
  cancelled: 'bg-feedback-error-subtle text-feedback-error',
  pending: 'bg-feedback-warning-subtle text-feedback-warning',
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
      setPolicies(res?.data || MOCK_POLICIES)
    } catch {
      setPolicies(MOCK_POLICIES)
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
    <div className="space-y-4 px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 rounded-lg hover:bg-bg-raised transition-colors"
            aria-label="بازگشت"
          >
            <ChevronLeft className="h-5 w-5 rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-text-primary">بیمه‌نامه‌ها</h1>
        </div>
        <button
          onClick={() => router.push('/renewal')}
          className="flex items-center gap-1.5 rounded-lg bg-brand-primary px-3 py-2 text-xs font-medium text-text-on-brand transition-colors hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          بیمه جدید
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-feedback-error-subtle border border-feedback-error/30 p-3 text-sm text-feedback-error">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <p className="text-xs text-text-muted">فعال</p>
          <p className="text-lg font-bold text-feedback-success">{policies.filter(p => p.status === 'active').length}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-text-muted">منقضی</p>
          <p className="text-lg font-bold text-text-secondary">{policies.filter(p => p.status === 'expired').length}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-text-muted">در انتظار</p>
          <p className="text-lg font-bold text-feedback-warning">{policies.filter(p => p.status === 'pending').length}</p>
        </Card>
      </div>

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
        <Card className="py-12 text-center text-text-muted">
          <FileText className="mx-auto h-12 w-12 mb-3 opacity-50" />
          <p>بیمه‌نامه‌ای یافت نشد</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((policy) => {
            const productIcon = policy.productName.includes('خودرو') ? Car : policy.productName.includes('منزل') ? Home : policy.productName.includes('درمان') ? Heart : Shield
            const ProductIcon = productIcon
            return (
            <Card
              key={policy.policyId}
              className="p-4 cursor-pointer hover:shadow-2 hover:border-brand-primary/30 transition-all"
              onClick={() => router.push(`/policies/${policy.policyId}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10">
                    <ProductIcon className="h-5 w-5 text-brand-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">{policy.productName}</p>
                    <p className="text-sm text-text-muted">{policy.insurerName}</p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[policy.status] || 'bg-bg-overlay text-text-primary'}`}
                >
                  {statusLabels[policy.status] || policy.status}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm border-t border-border-default pt-3">
                <div>
                  <p className="text-text-muted text-xs">شماره بیمه‌نامه</p>
                  <p className="font-medium text-text-primary" dir="ltr">{policy.policyNumber}</p>
                </div>
                <div>
                  <p className="text-text-muted text-xs">حق بیمه</p>
                  <p className="font-medium text-text-primary">{formatCurrency(policy.premiumAmount, policy.currency)}</p>
                </div>
                <div>
                  <p className="text-text-muted text-xs">تاریخ شروع</p>
                  <p className="font-medium text-text-primary">{formatDate(policy.startDate)}</p>
                </div>
                <div>
                  <p className="text-text-muted text-xs">تاریخ پایان</p>
                  <p className="font-medium text-text-primary">{formatDate(policy.endDate)}</p>
                </div>
              </div>
            </Card>
            )
          })}
        </div>
      )}

      {brand.legalTextFa && (
        <p className="text-xs text-text-muted text-center mt-4">{brand.legalTextFa}</p>
      )}
    </div>
  )
}
