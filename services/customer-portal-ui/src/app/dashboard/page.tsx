'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText, ShieldAlert, CreditCard, TrendingUp, Clock,
  Bell, Loader2, ChevronLeft, RefreshCw, MessageSquare,
  Car, Home, Heart, Award, AlertCircle, CheckCircle, Zap, Headphones
} from 'lucide-react'
import { policiesApi, claimsApi, paymentsApi } from '@/lib/api'
import { StatCard, Card } from '@insurance/design-system'

interface DashboardStats {
  activePolicies: number
  pendingClaims: number
  duePayments: number
  totalPremium: number
}

interface ActivityItem {
  id: string
  type: 'policy' | 'claim' | 'payment' | 'renewal' | 'complaint'
  title: string
  description: string
  timestamp: string
  icon: any
  color: string
}

interface UpcomingRenewal {
  id: string
  policyNumber: string
  productName: string
  endDate: string
  daysLeft: number
  premium: number
}

const MOCK_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act-1',
    type: 'renewal',
    title: 'بیمه‌نامه خودرو تمدید شد',
    description: 'بیمه شخص ثالث - شماره INS-1403-7845129',
    timestamp: '۲ روز پیش',
    icon: RefreshCw,
    color: 'text-feedback-success',
  },
  {
    id: 'act-2',
    type: 'claim',
    title: 'خسارت جدید ثبت شد',
    description: 'خسارت CLM-1403-92145 - در حال بررسی',
    timestamp: '۵ روز پیش',
    icon: ShieldAlert,
    color: 'text-feedback-warning',
  },
  {
    id: 'act-3',
    type: 'payment',
    title: 'پرداخت حق بیمه موفق',
    description: 'مبلغ ۴،۸۵۰،۰۰۰ تومان - بیمه ایران',
    timestamp: '۱ هفته پیش',
    icon: CreditCard,
    color: 'text-feedback-success',
  },
  {
    id: 'act-4',
    type: 'policy',
    title: 'بیمه‌نامه جدید صادر شد',
    description: 'بیمه آتش‌سوزی منزل - شماره INS-1403-8821456',
    timestamp: '۲ هفته پیش',
    icon: FileText,
    color: 'text-brand-primary',
  },
  {
    id: 'act-5',
    type: 'complaint',
    title: 'پاسخ به شکایت دریافت شد',
    description: 'شکایت CMP-1403-1122 - بررسی و پاسخ داده شد',
    timestamp: '۳ هفته پیش',
    icon: MessageSquare,
    color: 'text-feedback-info',
  },
]

const MOCK_RENEWALS: UpcomingRenewal[] = [
  {
    id: 'pol-001',
    policyNumber: 'INS-1403-7845129',
    productName: 'بیمه شخص ثالث خودرو',
    endDate: '1404/01/14',
    daysLeft: 14,
    premium: 4_850_000,
  },
  {
    id: 'pol-002',
    policyNumber: 'INS-1403-8821456',
    productName: 'بیمه آتش‌سوزی منزل',
    endDate: '1404/02/20',
    daysLeft: 48,
    premium: 2_200_000,
  },
]

const MOCK_STATS: DashboardStats = {
  activePolicies: 3,
  pendingClaims: 1,
  duePayments: 1,
  totalPremium: 14_550_000,
}

const productIcons: Record<string, any> = {
  motor: Car,
  home: Home,
  health: Heart,
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fa-IR').format(amount)
}

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activities] = useState<ActivityItem[]>(MOCK_ACTIVITIES)
  const [renewals] = useState<UpcomingRenewal[]>(MOCK_RENEWALS)

  useEffect(() => {
    const tokenMatch = document.cookie.match(new RegExp('(^| )auth-token=([^;]+)'))
    if (!tokenMatch) {
      router.push('/')
      return
    }
    loadData()
  }, [router])

  const loadData = async () => {
    try {
      setLoading(true)
      const [policiesRes, claimsRes, paymentsRes] = await Promise.all([
        policiesApi.list(),
        claimsApi.list(),
        paymentsApi.list(),
      ])

      const policies = policiesRes?.data || []
      const claims = claimsRes?.data || []
      const payments = paymentsRes?.data || []

      if (policies.length > 0 || claims.length > 0 || payments.length > 0) {
        setStats({
          activePolicies: policies.filter((p: any) => p.status === 'active').length,
          pendingClaims: claims.filter((c: any) => c.status === 'pending' || c.status === 'registered' || c.status === 'under_review').length,
          duePayments: payments.filter((p: any) => p.status === 'due' || p.status === 'overdue').length,
          totalPremium: policies.reduce((sum: number, p: any) => sum + (p.premium || 0), 0),
        })
      } else {
        setStats(MOCK_STATS)
      }
    } catch {
      setStats(MOCK_STATS)
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

  if (!stats) return null

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Welcome Banner */}
      <Card className="overflow-hidden bg-gradient-to-br from-brand-primary to-brand-secondary p-5 text-text-on-brand shadow-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">به پرتال مشتری بیمه خوش آمدید</h1>
            <p className="mt-1 text-sm opacity-90">مدیریت بیمه‌نامه‌ها، خسارات و پرداخت‌های شما در یکجا</p>
          </div>
          <Award className="h-12 w-12 opacity-80" />
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <StatCard
          title="بیمه‌نامه‌های فعال"
          value={stats.activePolicies}
          change="مشاهده لیست"
          changeType="positive"
          icon={FileText}
          className="!p-3"
        />
        <StatCard
          title="خسارات در حال بررسی"
          value={stats.pendingClaims}
          change={stats.pendingClaims > 0 ? 'نیاز به پیگیری' : 'بدون خسارت فعال'}
          changeType={stats.pendingClaims > 0 ? 'warning' : 'positive'}
          icon={ShieldAlert}
          className="!p-3"
        />
        <StatCard
          title="پرداخت‌های سررسید"
          value={stats.duePayments}
          change={stats.duePayments > 0 ? 'پرداخت نشده' : 'همه پرداخت شده'}
          changeType={stats.duePayments > 0 ? 'negative' : 'positive'}
          icon={CreditCard}
          className="!p-3"
        />
        <StatCard
          title="کل حق بیمه سالانه"
          value={formatCurrency(stats.totalPremium)}
          change="تومان"
          icon={TrendingUp}
          className="!p-3"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          onClick={() => router.push('/policies')}
          className="flex flex-col items-center gap-2 rounded-xl border border-border-default bg-bg-raised p-4 transition-colors hover:border-border-focus hover:bg-bg-subtle"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
            <FileText className="h-5 w-5" />
          </div>
          <span className="text-xs font-medium text-text-primary">بیمه‌نامه‌ها</span>
        </button>
        <button
          onClick={() => router.push('/fnol')}
          className="flex flex-col items-center gap-2 rounded-xl border border-border-default bg-bg-raised p-4 transition-colors hover:border-border-focus hover:bg-bg-subtle"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-feedback-warning-subtle text-feedback-warning">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <span className="text-xs font-medium text-text-primary">ثبت خسارت</span>
        </button>
        <button
          onClick={() => router.push('/payments')}
          className="flex flex-col items-center gap-2 rounded-xl border border-border-default bg-bg-raised p-4 transition-colors hover:border-border-focus hover:bg-bg-subtle"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-feedback-success-subtle text-feedback-success">
            <CreditCard className="h-5 w-5" />
          </div>
          <span className="text-xs font-medium text-text-primary">پرداخت‌ها</span>
        </button>
      </div>

      {/* Next Best Action Widget */}
      <Card className="border-brand-primary/20 bg-gradient-to-br from-brand-primary/5 to-brand-secondary/5 p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/10">
            <Zap className="h-4 w-4 text-brand-primary" />
          </div>
          <h2 className="text-sm font-semibold text-text-primary">اقدامات پیشنهادی هوشمند</h2>
        </div>
        <div className="space-y-2">
          <button
            onClick={() => router.push('/renewal-comparison')}
            className="flex w-full items-center gap-3 rounded-lg border border-feedback-warning/30 bg-feedback-warning-subtle p-3 text-right transition-colors hover:bg-feedback-warning/10"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-feedback-warning/20 text-feedback-warning">
              <Clock className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">تمدید بیمه‌نامه خودرو</p>
              <p className="text-xs text-text-muted">۱۴ روز تا انقضا — مقایسه قیمت‌ها پیشنهاد می‌شود</p>
            </div>
            <ChevronLeft className="h-4 w-4 text-text-muted" />
          </button>
          <button
            onClick={() => router.push('/fnol')}
            className="flex w-full items-center gap-3 rounded-lg border border-feedback-error/30 bg-feedback-error-subtle p-3 text-right transition-colors hover:bg-feedback-error/10"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-feedback-error/20 text-feedback-error">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">پیگیری خسارت در حال بررسی</p>
              <p className="text-xs text-text-muted">خسارت CLM-1403-92145 — نیازمند تکمیل مدارک</p>
            </div>
            <ChevronLeft className="h-4 w-4 text-text-muted" />
          </button>
          <button
            onClick={() => router.push('/policies')}
            className="flex w-full items-center gap-3 rounded-lg border border-brand-primary/20 bg-brand-primary/5 p-3 text-right transition-colors hover:bg-brand-primary/10"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">پیشنهاد بیمه درمان تکمیلی</p>
              <p className="text-xs text-text-muted">بر اساس پروفایل شما، واجد شرایط بیمه تکمیلی هستید</p>
            </div>
            <ChevronLeft className="h-4 w-4 text-text-muted" />
          </button>
        </div>
      </Card>

      {/* Upcoming Renewals Alert */}
      {renewals.length > 0 && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">تمدیدهای نزدیک</h2>
            <button
              onClick={() => router.push('/renewal-comparison')}
              className="text-xs text-brand-primary hover:underline"
            >
              مقایسه قیمت‌ها
            </button>
          </div>
          <div className="space-y-2">
            {renewals.map((renewal) => (
              <div
                key={renewal.id}
                className="flex items-center justify-between rounded-lg bg-bg-subtle p-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    renewal.daysLeft <= 14
                      ? 'bg-feedback-warning-subtle text-feedback-warning'
                      : 'bg-brand-primary/10 text-brand-primary'
                  }`}>
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{renewal.productName}</p>
                    <p className="text-xs text-text-muted">{renewal.policyNumber}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className={`text-xs font-medium ${
                    renewal.daysLeft <= 14 ? 'text-feedback-warning' : 'text-text-muted'
                  }`}>
                    {renewal.daysLeft} روز مانده
                  </p>
                  <p className="text-xs text-text-muted">{renewal.endDate}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Activity */}
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">فعالیت‌های اخیر</h2>
        <div className="space-y-2">
          {activities.map((activity) => {
            const Icon = activity.icon
            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 rounded-lg bg-bg-subtle p-3 transition-colors hover:bg-bg-overlay"
              >
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-bg-raised ${activity.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">{activity.title}</p>
                  <p className="mt-0.5 text-xs text-text-muted truncate">{activity.description}</p>
                </div>
                <span className="text-xs text-text-muted whitespace-nowrap">{activity.timestamp}</span>
              </div>
            )
          })}
        </div>
      </Card>

      {/* AI Assistant + Support CTAs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => router.push('/chatbot')}
          className="flex items-center gap-2 rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-4 transition-colors hover:bg-brand-primary/10"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="flex-1 text-right">
            <p className="text-sm font-medium text-text-primary">دستیار هوشمند</p>
            <p className="text-xs text-text-muted">پرسش و پاسخ</p>
          </div>
          <ChevronLeft className="h-5 w-5 text-text-muted" />
        </button>
        <button
          onClick={() => router.push('/support')}
          className="flex items-center gap-2 rounded-xl border border-border-default bg-bg-raised p-4 transition-colors hover:border-brand-primary/30"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
            <Headphones className="h-5 w-5" />
          </div>
          <div className="flex-1 text-right">
            <p className="text-sm font-medium text-text-primary">پشتیبانی</p>
            <p className="text-xs text-text-muted">تیکت و چت زنده</p>
          </div>
          <ChevronLeft className="h-5 w-5 text-text-muted" />
        </button>
      </div>
    </div>
  )
}
