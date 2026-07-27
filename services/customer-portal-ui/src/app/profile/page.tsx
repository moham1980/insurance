'use client'

import { useState } from 'react'
import { User, Phone, Mail, MapPin, Shield, Bell, FileText, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

interface ConsentItem {
  id: string
  title: string
  description: string
  required: boolean
  enabled: boolean
}

export default function ProfilePage() {
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
  ])

  const toggleConsent = (id: string) => {
    setConsents((prev) =>
      prev.map((c) => (c.id === id && !c.required ? { ...c, enabled: !c.enabled } : c))
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
          <User className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-text-primary">علی محمدی</h1>
          <p className="text-sm text-text-muted">کد ملی: ۰۰۱۲۳۴۵۶۷۸۹</p>
        </div>
      </div>

      {/* Contact Info */}
      <div className="rounded-xl border border-border-default bg-bg-raised p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">اطلاعات تماس</h2>
        <ul className="space-y-3">
          <li className="flex items-center gap-2 text-sm text-text-secondary">
            <Phone className="h-4 w-4 text-text-muted" />
            <span>۰۹۱۲۳۴۵۶۷۸۹</span>
          </li>
          <li className="flex items-center gap-2 text-sm text-text-secondary">
            <Mail className="h-4 w-4 text-text-muted" />
            <span>ali.mohammadi@example.com</span>
          </li>
          <li className="flex items-center gap-2 text-sm text-text-secondary">
            <MapPin className="h-4 w-4 text-text-muted" />
            <span>تهران، خیابان ولیعصر</span>
          </li>
        </ul>
      </div>

      {/* Quick Links */}
      <div className="rounded-xl border border-border-default bg-bg-raised p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">دسترسی سریع</h2>
        <ul className="space-y-1">
          {[
            { href: '/policies', label: 'بیمه‌نامه‌های من', icon: FileText },
            { href: '/claims', label: 'خسارات', icon: Shield },
            { href: '/payments', label: 'پرداخت‌ها', icon: Bell },
          ].map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-bg-subtle"
              >
                <span className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </span>
                <ChevronLeft className="h-4 w-4 text-text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Consents */}
      <div className="rounded-xl border border-border-default bg-bg-raised p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">رضایت‌ها و مجوزها</h2>
        <ul className="space-y-4">
          {consents.map((consent) => (
            <li key={consent.id} className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">{consent.title}</span>
                  {consent.required && (
                    <span className="rounded bg-feedback-error-subtle px-1.5 py-0.5 text-xs text-feedback-error">الزامی</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-text-muted">{consent.description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={consent.enabled}
                disabled={consent.required}
                onClick={() => toggleConsent(consent.id)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  consent.enabled ? 'bg-brand-primary' : 'bg-border-default'
                } ${consent.required ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    consent.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
