'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  FileText, Calendar, Shield, Car, Home, Heart, User,
  Phone, Mail, MapPin, ChevronLeft, Download, RefreshCw,
  FileEdit, TrendingUp, Clock, CheckCircle, AlertCircle,
  Loader2, ShieldCheck
} from 'lucide-react'
import { policiesApi } from '@/lib/api'
import { Card, ProgressBar, StatCard } from '@insurance/design-system'

interface PolicyDetail {
  id: string
  policyNumber: string
  product: string
  productName: string
  status: string
  insurer: string
  startDate: string
  endDate: string
  premium: number
  sumInsured: number
  deductible: number
  policyHolder: {
    name: string
    nationalId: string
    phone: string
    email: string
    address: string
  }
  insuredItems: Array<{
    type: string
    label: string
    value: string
    details?: Record<string, string>
  }>
  coverages: Array<{
    name: string
    limit: number
    deductible: number
    covered: boolean
  }>
  documents: Array<{
    id: string
    name: string
    type: string
    uploadedAt: string
  }>
  timeline: Array<{
    status: string
    label: string
    date: string
    note?: string
  }>
  discounts: Array<{
    name: string
    amount: number
    percentage: number
  }>
}

const MOCK_POLICY: PolicyDetail = {
  id: 'pol-001',
  policyNumber: 'INS-1403-7845129',
  product: 'motor',
  productName: 'بیمه شخص ثالث خودرو',
  status: 'active',
  insurer: 'بیمه ایران',
  startDate: '1403/01/15',
  endDate: '1404/01/14',
  premium: 4_850_000,
  sumInsured: 50_000_000,
  deductible: 500_000,
  policyHolder: {
    name: 'علی محمدی',
    nationalId: '۰۰۱۲۳۴۵۶۷۸۹',
    phone: '09123456789',
    email: 'ali.mohammadi@example.com',
    address: 'تهران، خیابان ولیعصر، پلاک ۱۲۳',
  },
  insuredItems: [
    {
      type: 'vehicle',
      label: 'خودرو بیمه‌شده',
      value: 'پراید ۱۴۰۲',
      details: {
        'پلاک': '۱۲۳ ایران ۴۵ ۶۷',
        'شماره شاسی': 'NWPRD123456789012',
        'رنگ': 'سفید',
        'کلاس': 'سدان',
      },
    },
  ],
  coverages: [
    { name: 'خسارت جانی شخص ثالث', limit: 50_000_000, deductible: 0, covered: true },
    { name: 'خسارت مالی شخص ثالث', limit: 15_000_000, deductible: 500_000, covered: true },
    { name: 'خسارت سرنشین', limit: 10_000_000, deductible: 0, covered: true },
    { name: 'هزینه‌های درمانی', limit: 5_000_000, deductible: 0, covered: true },
    { name: 'خسارت راننده مقصر', limit: 8_000_000, deductible: 0, covered: false },
  ],
  documents: [
    { id: 'doc-1', name: 'بیمه‌نامه.pdf', type: 'policy', uploadedAt: '1403/01/15' },
    { id: 'doc-2', name: 'کارت ماشین.pdf', type: 'vehicle_card', uploadedAt: '1403/01/15' },
    { id: 'doc-3', name: 'مدارک هویتی.pdf', type: 'identity', uploadedAt: '1403/01/15' },
  ],
  timeline: [
    { status: 'issued', label: 'صدور بیمه‌نامه', date: '1403/01/15', note: 'بیمه‌نامه با موفقیت صادر شد' },
    { status: 'active', label: 'شروع اعتبار', date: '1403/01/15', note: 'بیمه‌نامه از این تاریخ فعال است' },
    { status: 'renewal_reminder', label: 'یادآوری تمدید', date: '1403/12/01', note: 'بیمه‌نامه ۱۴ روز دیگر منقضی می‌شود' },
  ],
  discounts: [
    { name: 'تخفیف عدم خسارت', amount: 485_000, percentage: 10 },
    { name: 'تخفیف خرید آنلاین', amount: 242_500, percentage: 5 },
  ],
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'فعال', color: 'text-feedback-success', bg: 'bg-feedback-success-subtle' },
  expired: { label: 'منقضی', color: 'text-feedback-error', bg: 'bg-feedback-error-subtle' },
  pending: { label: 'در انتظار', color: 'text-feedback-warning', bg: 'bg-feedback-warning-subtle' },
  cancelled: { label: 'لغو شده', color: 'text-text-muted', bg: 'bg-bg-subtle' },
}

const productIcons: Record<string, any> = {
  motor: Car,
  home: Home,
  health: Heart,
  life: ShieldCheck,
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان'
}

export default function PolicyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [policy, setPolicy] = useState<PolicyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'coverages' | 'documents' | 'timeline'>('overview')

  useEffect(() => {
    loadPolicy()
  }, [])

  const loadPolicy = async () => {
    try {
      setLoading(true)
      const response = await policiesApi.getById(params.id as string)
      if (response.data) {
        setPolicy(response.data)
      } else {
        setPolicy(MOCK_POLICY)
      }
    } catch {
      setPolicy(MOCK_POLICY)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        <span className="mr-2 text-sm text-text-secondary">در حال بارگذاری...</span>
      </div>
    )
  }

  if (!policy) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-12 w-12 text-text-muted mb-3" />
        <p className="text-sm text-text-secondary">بیمه‌نامه یافت نشد</p>
        <button onClick={() => router.push('/policies')} className="mt-4 text-sm text-brand-primary">
          بازگشت به لیست
        </button>
      </div>
    )
  }

  const status = statusConfig[policy.status] || statusConfig.active
  const ProductIcon = productIcons[policy.product] || FileText
  const daysToExpiry = Math.ceil((new Date(policy.endDate).getTime() - Date.now()) / 86400000)
  const totalDiscount = policy.discounts?.reduce((sum, d) => sum + d.amount, 0) || 0

  return (
    <div className="space-y-4 animate-fade-in">
      <button
        onClick={() => router.push('/policies')}
        className="flex items-center text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ChevronLeft className="h-4 w-4 ml-1" />
        بازگشت به لیست
      </button>

      {/* Policy Header Card */}
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
              <ProductIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-text-primary">{policy.productName}</h1>
              <p className="text-xs text-text-muted mt-0.5">{policy.policyNumber}</p>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.bg} ${status.color}`}>
            {status.label}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg bg-bg-subtle p-3">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <Calendar className="h-3.5 w-3.5" />
              شروع اعتبار
            </div>
            <p className="mt-1 text-sm font-medium text-text-primary">{policy.startDate}</p>
          </div>
          <div className="rounded-lg bg-bg-subtle p-3">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <Calendar className="h-3.5 w-3.5" />
              پایان اعتبار
            </div>
            <p className="mt-1 text-sm font-medium text-text-primary">{policy.endDate}</p>
          </div>
        </div>

        {daysToExpiry > 0 && daysToExpiry <= 30 && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-feedback-warning/30 bg-feedback-warning-subtle p-3 text-xs text-feedback-warning">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>بیمه‌نامه شما {daysToExpiry} روز دیگر منقضی می‌شود</span>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => router.push(`/renewal-comparison?policyId=${policy.id}`)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-primary px-3 py-2.5 text-xs font-medium text-text-on-brand transition-colors hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" />
            تمدید
          </button>
          <button
            onClick={() => router.push(`/endorsement?policyId=${policy.id}`)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border-default px-3 py-2.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-subtle"
          >
            <FileEdit className="h-4 w-4" />
            اصلاح
          </button>
          <button
            onClick={() => router.push(`/endorsement-tracking?policyId=${policy.id}`)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border-default px-3 py-2.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-subtle"
          >
            <Clock className="h-4 w-4" />
            پیگیری
          </button>
        </div>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <StatCard
          title="حق بیمه"
          value={formatCurrency(policy.premium).replace(' تومان', '')}
          icon={TrendingUp}
          className="!p-3"
        />
        <StatCard
          title="سقف پوشش"
          value={formatCurrency(policy.sumInsured).replace(' تومان', '')}
          icon={Shield}
          className="!p-3"
        />
        <StatCard
          title="فرانشیز"
          value={formatCurrency(policy.deductible).replace(' تومان', '')}
          icon={ShieldCheck}
          className="!p-3"
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-border-default">
        {[
          { id: 'overview', label: 'اطلاعات کلی' },
          { id: 'coverages', label: 'پوشش‌ها' },
          { id: 'documents', label: 'مدارک' },
          { id: 'timeline', label: 'تاریخچه' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-brand-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-brand-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-4 animate-fade-in">
          {/* Insurer Info */}
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-text-primary">بیمه‌گر</h2>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">{policy.insurer}</p>
                <p className="text-xs text-text-muted">شرکت بیمه</p>
              </div>
            </div>
          </Card>

          {/* Policy Holder Info */}
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-text-primary">بیمه‌گذار</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-text-muted" />
                <span className="text-text-secondary">{policy.policyHolder.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-text-muted" />
                <span className="text-text-secondary">{policy.policyHolder.nationalId}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-text-muted" />
                <span className="text-text-secondary">{policy.policyHolder.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-text-muted" />
                <span className="text-text-secondary">{policy.policyHolder.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-text-muted" />
                <span className="text-text-secondary">{policy.policyHolder.address}</span>
              </div>
            </div>
          </Card>

          {/* Insured Items */}
          {policy.insuredItems?.map((item, idx) => (
            <Card key={idx} className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-text-primary">{item.label}</h2>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                  {item.type === 'vehicle' ? <Car className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                </div>
                <p className="text-sm font-medium text-text-primary">{item.value}</p>
              </div>
              {item.details && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(item.details).map(([key, val]) => (
                    <div key={key} className="rounded-lg bg-bg-subtle p-2.5">
                      <p className="text-xs text-text-muted">{key}</p>
                      <p className="mt-0.5 text-sm font-medium text-text-primary">{val}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}

          {/* Discounts */}
          {policy.discounts && policy.discounts.length > 0 && (
            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-text-primary">تخفیف‌های اعمال شده</h2>
              <div className="space-y-2">
                {policy.discounts.map((discount, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg bg-bg-subtle p-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{discount.name}</p>
                      <p className="text-xs text-text-muted">{discount.percentage}% تخفیف</p>
                    </div>
                    <span className="text-sm font-bold text-feedback-success">
                      {formatCurrency(discount.amount)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-border-default pt-2">
                  <span className="text-sm font-medium text-text-secondary">مجموع تخفیف</span>
                  <span className="text-sm font-bold text-feedback-success">
                    {formatCurrency(totalDiscount)}
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'coverages' && (
        <div className="space-y-3 animate-fade-in">
          {policy.coverages?.map((coverage, idx) => (
            <Card
              key={idx}
              className={`p-4 ${
                coverage.covered
                  ? ''
                  : 'bg-bg-subtle opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {coverage.covered ? (
                    <CheckCircle className="h-5 w-5 text-feedback-success" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-text-muted" />
                  )}
                  <p className="text-sm font-medium text-text-primary">{coverage.name}</p>
                </div>
                <span className={`text-xs ${coverage.covered ? 'text-feedback-success' : 'text-text-muted'}`}>
                  {coverage.covered ? 'مشمول پوشش' : 'خارج از پوشش'}
                </span>
              </div>
              {coverage.covered && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-text-muted">سقف پوشش</p>
                    <p className="mt-0.5 text-sm font-medium text-text-primary">
                      {formatCurrency(coverage.limit)}
                    </p>
                  </div>
                  {coverage.deductible > 0 && (
                    <div>
                      <p className="text-xs text-text-muted">فرانشیز</p>
                      <p className="mt-0.5 text-sm font-medium text-text-primary">
                        {formatCurrency(coverage.deductible)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-3 animate-fade-in">
          {policy.documents?.map((doc) => (
            <Card
              key={doc.id}
              className="p-4 transition-colors hover:border-border-focus"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{doc.name}</p>
                  <p className="text-xs text-text-muted">{doc.uploadedAt}</p>
                </div>
              </div>
              <button className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-subtle hover:text-brand-primary">
                <Download className="h-4 w-4" />
              </button>
            </Card>
          ))}
          {(!policy.documents || policy.documents.length === 0) && (
            <Card className="p-8 text-center">
              <FileText className="mx-auto mb-2 h-10 w-10 text-text-muted" />
              <p className="text-sm text-text-muted">مدرکی برای این بیمه‌نامه ثبت نشده است</p>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="space-y-3 animate-fade-in">
          {policy.timeline?.map((event, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  idx === 0 ? 'bg-feedback-success-subtle text-feedback-success' : 'bg-bg-subtle text-text-muted'
                }`}>
                  <CheckCircle className="h-4 w-4" />
                </div>
                {idx < policy.timeline.length - 1 && (
                  <div className="h-full w-0.5 bg-border-default" style={{ minHeight: '24px' }} />
                )}
              </div>
              <Card className="flex-1 p-3">
                <p className="text-sm font-medium text-text-primary">{event.label}</p>
                <p className="mt-0.5 text-xs text-text-muted">{event.date}</p>
                {event.note && <p className="mt-1 text-xs text-text-secondary">{event.note}</p>}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
