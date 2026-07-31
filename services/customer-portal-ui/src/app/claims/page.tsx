'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldAlert, Search, ChevronLeft, Clock, FileText, AlertCircle } from 'lucide-react'
import { claimsApi } from '@/lib/api'
import { useBrandTheme } from '@/config/brand-provider'

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
  reported: 'bg-blue-100 text-blue-800',
  investigating: 'bg-yellow-100 text-yellow-800',
  assessing: 'bg-orange-100 text-orange-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  paid: 'bg-emerald-100 text-emerald-800',
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
      setClaims(res?.data || [])
    } catch (err: any) {
      setError(err.message || 'خطا در بارگذاری خسارات')
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
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => router.push('/dashboard')}
          className="p-2 rounded-lg hover:bg-bg-raised transition-colors"
          aria-label="بازگشت"
        >
          <ChevronLeft className="h-5 w-5 rotate-180" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">خسارات</h1>
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
        <div className="text-center py-12 text-text-muted">
          <ShieldAlert className="mx-auto h-12 w-12 mb-3 opacity-50" />
          <p>خسارتی یافت نشد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((claim) => (
            <div
              key={claim.claimId}
              className="rounded-xl border border-border-default bg-bg-raised p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/claims/${claim.claimId}`)}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-text-primary">{claim.productName}</p>
                  <p className="text-sm text-text-muted">{claim.claimNumber}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[claim.status] || 'bg-gray-100 text-gray-800'}`}
                >
                  {statusLabels[claim.status] || claim.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-text-muted">شماره بیمه‌نامه</p>
                  <p className="font-medium text-text-primary">{claim.policyNumber}</p>
                </div>
                <div>
                  <p className="text-text-muted">تاریخ ثبت</p>
                  <p className="font-medium text-text-primary">{formatDate(claim.reportedAt)}</p>
                </div>
                <div>
                  <p className="text-text-muted">مبلغ تخمینی</p>
                  <p className="font-medium text-text-primary">{formatCurrency(claim.estimatedAmount, claim.currency)}</p>
                </div>
                <div>
                  <p className="text-text-muted">مبلغ پرداخت شده</p>
                  <p className="font-medium text-text-primary">{formatCurrency(claim.paidAmount, claim.currency)}</p>
                </div>
              </div>
              {claim.description && (
                <p className="mt-2 text-sm text-text-muted line-clamp-2">{claim.description}</p>
              )}
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
