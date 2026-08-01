'use client'

import { useState, useEffect } from 'react'
import {
  User, Phone, Mail, MapPin, Shield, FileText, ChevronLeft,
  CreditCard, Calendar, Award, TrendingUp, Edit2, CheckCircle,
  AlertCircle, Loader2, Bell, Lock, Settings
} from 'lucide-react'
import Link from 'next/link'
import { StatCard, Card } from '@insurance/design-system'

interface UserProfile {
  name: string
  nationalId: string
  phone: string
  email: string
  address: string
  birthDate: string
  joinDate: string
  customerLevel: string
  totalPolicies: number
  activePolicies: number
  totalClaims: number
  totalPremium: number
  loyaltyPoints: number
}

interface ConsentItem {
  id: string
  title: string
  description: string
  required: boolean
  enabled: boolean
}

const MOCK_PROFILE: UserProfile = {
  name: 'علی محمدی',
  nationalId: '۰۰۱۲۳۴۵۶۷۸۹',
  phone: '09123456789',
  email: 'ali.mohammadi@example.com',
  address: 'تهران، خیابان ولیعصر، کوچه گلستان، پلاک ۱۲۳، واحد ۴',
  birthDate: '1365/03/15',
  joinDate: '1401/08/01',
  customerLevel: 'طلایی',
  totalPolicies: 8,
  activePolicies: 3,
  totalClaims: 2,
  totalPremium: 14_550_000,
  loyaltyPoints: 1250,
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ phone: '', email: '', address: '' })
  const [consents, setConsents] = useState<ConsentItem[]>([
    {
      id: 'marketing',
      title: 'ارتباطات بازاریابی',
      description: 'دریافت پیشنهادهای ویژه و تخفیف‌ها از طریق پیامک و ایمیل',
      required: false,
      enabled: true,
    },
    {
      id: 'data-sharing',
      title: 'اشتراک‌گذاری داده با شبکه فروش',
      description: 'اجازه دسترسی نمایندگان فروش به اطلاعات بیمه‌نامه‌ها',
      required: false,
      enabled: false,
    },
    {
      id: 'analytics',
      title: 'تحلیل رفتار برای بهبود خدمات',
      description: 'استفاده از داده‌های ناشناس برای بهبود تجربه کاربری',
      required: true,
      enabled: true,
    },
    {
      id: 'third-party',
      title: 'اشتراک با بیمه‌گران همکار',
      description: 'اشتراک‌گذاری اطلاعات با شرکت‌های بیمه همکار برای تسهیل صدور',
      required: false,
      enabled: true,
    },
  ])

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      setProfile(MOCK_PROFILE)
      setEditForm({
        phone: MOCK_PROFILE.phone,
        email: MOCK_PROFILE.email,
        address: MOCK_PROFILE.address,
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleConsent = (id: string) => {
    setConsents((prev) =>
      prev.map((c) => (c.id === id && !c.required ? { ...c, enabled: !c.enabled } : c))
    )
  }

  const handleSave = () => {
    if (profile) {
      setProfile({
        ...profile,
        phone: editForm.phone,
        email: editForm.email,
        address: editForm.address,
      })
    }
    setEditing(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Profile Header Card */}
      <Card className="p-5 shadow-1">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary text-text-on-brand">
              <User className="h-8 w-8" />
            </div>
            <span className="absolute -bottom-1 -left-1 flex h-6 w-6 items-center justify-center rounded-full bg-feedback-warning text-text-on-brand text-xs font-bold">
              ★
            </span>
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-text-primary">{profile.name}</h1>
            <p className="text-xs text-text-muted mt-0.5">کد ملی: {profile.nationalId}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="rounded-full bg-feedback-warning-subtle px-2 py-0.5 text-xs font-medium text-feedback-warning">
                مشتری {profile.customerLevel}
              </span>
              <span className="text-xs text-text-muted">عضویت از {profile.joinDate}</span>
            </div>
          </div>
          <button
            onClick={() => editing ? handleSave() : setEditing(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-default text-text-secondary transition-colors hover:bg-bg-subtle hover:text-brand-primary"
          >
            {editing ? <CheckCircle className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
          </button>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <StatCard
          title="بیمه‌نامه‌های فعال"
          value={profile.activePolicies}
          change={`از ${profile.totalPolicies} بیمه‌نامه`}
          changeType="positive"
          icon={FileText}
          className="!p-3"
        />
        <StatCard
          title="خسارات ثبت شده"
          value={profile.totalClaims}
          icon={Shield}
          className="!p-3"
        />
        <StatCard
          title="حق بیمه کل"
          value={new Intl.NumberFormat('fa-IR').format(profile.totalPremium)}
          change="تومان / سال"
          icon={TrendingUp}
          className="!p-3"
        />
        <StatCard
          title="امتیاز وفاداری"
          value={profile.loyaltyPoints}
          change="امتیاد"
          changeType="warning"
          icon={Award}
          className="!p-3"
        />
      </div>

      {/* Contact Info */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">اطلاعات تماس</h2>
          {editing && (
            <span className="text-xs text-text-muted">در حال ویرایش</span>
          )}
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-subtle text-text-muted">
              <Phone className="h-4 w-4" />
            </div>
            {editing ? (
              <input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="flex-1 rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
              />
            ) : (
              <span className="text-sm text-text-secondary">{profile.phone}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-subtle text-text-muted">
              <Mail className="h-4 w-4" />
            </div>
            {editing ? (
              <input
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="flex-1 rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
              />
            ) : (
              <span className="text-sm text-text-secondary">{profile.email}</span>
            )}
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-subtle text-text-muted">
              <MapPin className="h-4 w-4" />
            </div>
            {editing ? (
              <textarea
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                rows={2}
                className="flex-1 rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
              />
            ) : (
              <span className="text-sm text-text-secondary leading-6">{profile.address}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-subtle text-text-muted">
              <Calendar className="h-4 w-4" />
            </div>
            <span className="text-sm text-text-secondary">تاریخ تولد: {profile.birthDate}</span>
          </div>
        </div>
      </Card>

      {/* Quick Links */}
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">دسترسی سریع</h2>
        <div className="space-y-1">
          {[
            { href: '/policies', label: 'بیمه‌نامه‌های من', icon: FileText, count: profile.activePolicies },
            { href: '/claims', label: 'خسارات', icon: Shield, count: profile.totalClaims },
            { href: '/payments', label: 'پرداخت‌ها', icon: CreditCard },
            { href: '/portfolio', label: 'سبد بیمه', icon: TrendingUp },
            { href: '/consent', label: 'مدیریت رضایت‌ها', icon: Lock },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-bg-subtle"
            >
              <span className="flex items-center gap-2.5">
                <item.icon className="h-4 w-4 text-text-muted" />
                {item.label}
              </span>
              <div className="flex items-center gap-2">
                {item.count !== undefined && (
                  <span className="rounded-full bg-bg-subtle px-2 py-0.5 text-xs font-medium text-text-muted">
                    {item.count}
                  </span>
                )}
                <ChevronLeft className="h-4 w-4 text-text-muted" />
              </div>
            </Link>
          ))}
        </div>
      </Card>

      {/* Consents */}
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">رضایت‌ها و مجوزها</h2>
        <div className="space-y-4">
          {consents.map((consent) => (
            <div key={consent.id} className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">{consent.title}</span>
                  {consent.required && (
                    <span className="rounded bg-feedback-error-subtle px-1.5 py-0.5 text-xs text-feedback-error">الزامی</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-text-muted leading-5">{consent.description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={consent.enabled}
                disabled={consent.required}
                onClick={() => toggleConsent(consent.id)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                  consent.enabled ? 'bg-brand-primary' : 'bg-border-default'
                } ${consent.required ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-bg-raised transition-transform ${
                    consent.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Settings */}
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">تنظیمات</h2>
        <div className="space-y-1">
          <button className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-bg-subtle">
            <span className="flex items-center gap-2.5">
              <Bell className="h-4 w-4 text-text-muted" />
              تنظیمات اطلاع‌رسانی
            </span>
            <ChevronLeft className="h-4 w-4 text-text-muted" />
          </button>
          <button className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-bg-subtle">
            <span className="flex items-center gap-2.5">
              <Lock className="h-4 w-4 text-text-muted" />
              تغییر رمز عبور
            </span>
            <ChevronLeft className="h-4 w-4 text-text-muted" />
          </button>
          <button className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-bg-subtle">
            <span className="flex items-center gap-2.5">
              <Settings className="h-4 w-4 text-text-muted" />
              تنظیمات برنامه
            </span>
            <ChevronLeft className="h-4 w-4 text-text-muted" />
          </button>
        </div>
      </Card>
    </div>
  )
}
