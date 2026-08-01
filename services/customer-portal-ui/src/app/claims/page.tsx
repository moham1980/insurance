'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldAlert, Search, ChevronLeft, Clock, FileText, AlertCircle, Car, Home, Heart, Plus, CheckCircle, XCircle } from 'lucide-react'
import { claimsApi } from '@/lib/api'
import { useBrandTheme } from '@/config/brand-provider'
import { Card } from '@insurance/design-system'
import { MOCK_CLAIMS } from '@/lib/mock-data'

interface Claim {
  claimId: string
  claimNumber: string
  policyNumber: string
  productName: string
  status: 'reported' | 'investigating' | 'assessing' | 'approved' | 'rejected' | 'paid'
  reportedAt: string
  estimatedAmount: number
  paidAmount: number
  currency: string
  description: string
}

const statusLabels: Record<string, string> = {
  reported: 'ثبت شده',
  investigating: 'در حال بررسی',
  assessing: 'در حال ارزیابی',
  approved: 'تأیید شده',
  rejected: 'رد شده',
  paid: 'پرداخت شده',
}

const statusColors: Record<string, string> = {
  reported: 'bg-brand-primary/10 text-brand-primary',
  investigating: 'bg-feedback-warning-subtle text-feedback-warning',
  assessing: 'bg-feedback-warning-subtle text-feedback-warning',
  approved: 'bg-feedback-success-subtle text-feedback-success',
  rejected: 'bg-feedback-error-subtle text-feedback-error',
  paid: 'bg-feedback-success-subtle text-feedback-success',
}

export default function ClaimsPage() {
  const router = useRouter()
  const brand = useBrandTheme()
  const [claims, setClaims] = useState<Claim[]>([])
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
    loadClaims()
  }, [router])

  const loadClaims = async () => {
    setLoading(true)
    try {
      const res = await claimsApi.list()
      setClaims(res?.data || MOCK_CLAIMS)
    } catch {
      setClaims(MOCK_CLAIMS)
    } finally {
      setLoading(false)
    }
  }

  const filtered = claims.filter((c) => {
    const matchesSearch =
      !search ||
      c.claimNumber?.includes(search) ||
      c.policyNumber?.includes(search) ||
      c.productName?.includes(search)
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
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
          <h1 className="text-xl font-bold text-text-primary">خسارات</h1>
        </div>
        <button
          onClick={() => router.push('/fnol')}
          className="flex items-center gap-1.5 rounded-lg bg-brand-primary px-3 py-2 text-xs font-medium text-text-on-brand transition-colors hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          ثبت خسارت
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-feedback-error-subtle border border-feedback-error/30 p-3 text-sm text-feedback-error">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card className="p-3 text-center">
          <p className="text-xs text-text-muted">ثبت شده</p>
          <p className="text-lg font-bold text-brand-primary">{claims.filter(c => c.status === 'reported').length}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-text-muted">در بررسی</p>
          <p className="text-lg font-bold text-feedback-warning">{claims.filter(c => c.status === 'investigating' || c.status === 'assessing').length}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-text-muted">تأیید شده</p>
          <p className="text-lg font-bold text-feedback-success">{claims.filter(c => c.status === 'approved').length}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-text-muted">پرداخت شده</p>
          <p className="text-lg font-bold text-feedback-success">{claims.filter(c => c.status === 'paid').length}</p>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="جستجوی خسارت..."
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
          <option value="reported">ثبت شده</option>
          <option value="investigating">در حال بررسی</option>
          <option value="assessing">در حال ارزیابی</option>
          <option value="approved">تأیید شده</option>
          <option value="rejected">رد شده</option>
          <option value="paid">پرداخت شده</option>
        </select>
      </div>

      {/* Claims List */}
      {filtered.length === 0 ? (
        <Card className="py-12 text-center text-text-muted">
          <ShieldAlert className="mx-auto h-12 w-12 mb-3 opacity-50" />
          <p>خسارتی یافت نشد</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((claim) => {
            const productIcon = claim.productName.includes('خودرو') ? Car : claim.productName.includes('منزل') ? Home : claim.productName.includes('درمان') ? Heart : FileText
            const ProductIcon = productIcon
            return (
            <Card
              key={claim.claimId}
              className="p-4 cursor-pointer hover:shadow-2 hover:border-brand-primary/30 transition-all"
              onClick={() => router.push(`/claims/${claim.claimId}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10">
                    <ProductIcon className="h-5 w-5 text-brand-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">{claim.productName}</p>
                    <p className="text-sm text-text-muted" dir="ltr">{claim.claimNumber}</p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[claim.status] || 'bg-bg-overlay text-text-primary'}`}
                >
                  {statusLabels[claim.status] || claim.status}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm border-t border-border-default pt-3">
                <div>
                  <p className="text-text-muted text-xs">شماره بیمه‌نامه</p>
                  <p className="font-medium text-text-primary" dir="ltr">{claim.policyNumber}</p>
                </div>
                <div>
                  <p className="text-text-muted text-xs">تاریخ ثبت</p>
                  <p className="font-medium text-text-primary">{formatDate(claim.reportedAt)}</p>
                </div>
                <div>
                  <p className="text-text-muted text-xs">مبلغ تخمینی</p>
                  <p className="font-medium text-text-primary">{formatCurrency(claim.estimatedAmount, claim.currency)}</p>
                </div>
                <div>
                  <p className="text-text-muted text-xs">مبلغ پرداخت شده</p>
                  <p className="font-medium text-text-primary">{formatCurrency(claim.paidAmount, claim.currency)}</p>
                </div>
              </div>
              {claim.description && (
                <p className="mt-2 text-sm text-text-muted line-clamp-2 bg-bg-base rounded-lg p-2">{claim.description}</p>
              )}
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
