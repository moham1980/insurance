'use client'

import { useState } from 'react'
import { Shield, Lock, Phone } from 'lucide-react'
import { Card } from '@insurance/design-system'

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || 'default-tenant'

export default function Home() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3030'}/customer-portal/otp/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error?.message || 'خطا در ارسال کد OTP')
        return
      }

      if (data.data?.reference) {
        setSessionId(data.data.reference)
      } else {
        setSessionId(phoneNumber)
      }
      setStep('otp')
    } catch (err) {
      setError('خطا در ارتباط با سرور')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3030'}/customer-portal/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: sessionId, code: otpCode, tenantId: TENANT_ID }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error?.message || 'کد OTP نامعتبر است')
        return
      }

      if (data.success && data.data?.token) {
        document.cookie = `auth-token=${encodeURIComponent(data.data.token)}; path=/; max-age=86400; sameSite=lax`
        if (data.data.user) {
          document.cookie = `auth-user=${encodeURIComponent(JSON.stringify(data.data.user))}; path=/; max-age=86400; sameSite=lax`
        }
        window.location.href = '/dashboard'
      } else if (data.data?.success && data.data?.data?.token) {
        document.cookie = `auth-token=${encodeURIComponent(data.data.data.token)}; path=/; max-age=86400; sameSite=lax`
        if (data.data.data.user) {
          document.cookie = `auth-user=${encodeURIComponent(JSON.stringify(data.data.data.user))}; path=/; max-age=86400; sameSite=lax`
        }
        window.location.href = '/dashboard'
      }
    } catch (err) {
      setError('خطا در ارتباط با سرور')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-3 p-8 animate-scale-in">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-primary rounded-2xl mb-4 shadow-2">
              <Shield className="w-8 h-8 text-text-on-brand" />
            </div>
            <h1 className="text-xl font-bold text-text-primary mb-2">پرتال مشتری بیمه</h1>
            <p className="text-sm text-text-muted">ورود به حساب کاربری</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-feedback-error-subtle border border-feedback-error/30 rounded-lg text-feedback-error text-sm">
              {error}
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={handleRequestOtp} className="space-y-6">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-text-secondary mb-2">
                  شماره موبایل
                </label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted w-5 h-5" />
                  <input
                    type="tel"
                    id="phone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="09123456789"
                    className="w-full pr-10 pl-4 py-3 border border-border-default rounded-lg bg-bg-base text-text-primary focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-colors"
                    required
                    pattern="[0-9]{11}"
                  />
                </div>
                <p className="mt-1 text-xs text-text-muted">فرمت: 09123456789</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-primary text-text-on-brand py-3 px-4 rounded-lg font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {loading ? 'در حال ارسال...' : 'دریافت کد OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-text-secondary mb-2">
                  کد تأیید
                </label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted w-5 h-5" />
                  <input
                    type="text"
                    id="otp"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="کد ۶ رقمی"
                    className="w-full pr-10 pl-4 py-3 border border-border-default rounded-lg bg-bg-base text-text-primary focus:ring-2 focus:ring-brand-primary focus:border-transparent text-center text-2xl tracking-widest transition-colors"
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                  />
                </div>
                <p className="mt-2 text-xs text-text-muted">کد به شماره {phoneNumber} ارسال شد</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-primary text-text-on-brand py-3 px-4 rounded-lg font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {loading ? 'در حال بررسی...' : 'تأیید و ورود'}
              </button>

              <button
                type="button"
                onClick={() => setStep('phone')}
                className="w-full text-brand-primary py-2 px-4 rounded-lg font-medium hover:bg-brand-primary/5 transition-colors"
              >
                تغییر شماره موبایل
              </button>
            </form>
          )}

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-text-muted">
            <p>© ۱۴۰۵ شرکت بیمه - تمامی حقوق محفوظ است</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
