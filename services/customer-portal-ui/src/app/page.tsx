'use client'

import { useState } from 'react'
import { Shield, Lock, Phone } from 'lucide-react'

export default function Home() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/portal/otp/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error?.message || 'خطا در ارسال کد OTP')
        return
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
      const response = await fetch('/api/portal/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, otpCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error?.message || 'کد OTP نامعتبر است')
        return
      }

      // Store JWT token as httpOnly cookie via API route
      if (data.data?.token) {
        await fetch('/api/auth/set-cookie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: data.data.token, user: data.data?.user }),
        })
        window.location.href = '/dashboard'
      }
    } catch (err) {
      setError('خطا در ارتباط با سرور')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">پرتال مشتری بیمه</h1>
            <p className="text-gray-600 text-sm">ورود به حساب کاربری</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={handleRequestOtp} className="space-y-6">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  شماره موبایل
                </label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="tel"
                    id="phone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="09123456789"
                    className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                    pattern="[0-9]{11}"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">فرمت: 09123456789</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'در حال ارسال...' : 'دریافت کد OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                  کد تأیید
                </label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    id="otp"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="کد ۶ رقمی"
                    className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-center text-2xl tracking-widest"
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">کد به شماره {phoneNumber} ارسال شد</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'در حال بررسی...' : 'تأیید و ورود'}
              </button>

              <button
                type="button"
                onClick={() => setStep('phone')}
                className="w-full text-primary-600 py-2 px-4 rounded-lg font-medium hover:bg-primary-50 transition-colors"
              >
                تغییر شماره موبایل
              </button>
            </form>
          )}

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-gray-500">
            <p>© ۱۴۰۵ شرکت بیمه - تمامی حقوق محفوظ است</p>
          </div>
        </div>
      </div>
    </div>
  )
}
