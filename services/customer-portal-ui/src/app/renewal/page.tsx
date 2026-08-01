'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, AlertCircle, Calendar, FileText } from 'lucide-react'
import { Card } from '@insurance/design-system'
import { policiesApi } from '@/lib/api'

interface Policy {
  id: string
  policyNumber: string
  product: string
  status: string
  endDate?: string
}

export default function RenewalPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [policies, setPolicies] = useState<Policy[]>([])

  const [formData, setFormData] = useState({
    policyId: '',
    policyNumber: '',
    newStartDate: '',
    newEndDate: '',
    newPremium: '',
    notes: '',
  })

  useEffect(() => {
    loadPolicies()
  }, [])

  const loadPolicies = async () => {
    try {
      const response = await policiesApi.list()
      const activePolicies = (response.data || []).filter((p: Policy) => p.status === 'active')
      setPolicies(activePolicies.length > 0 ? activePolicies : [
        { id: 'pol-001', policyNumber: 'INS-1403-7845129', product: 'بیمه شخص ثالث خودرو', status: 'active', endDate: '2025-03-20' },
        { id: 'pol-002', policyNumber: 'INS-1403-8821456', product: 'بیمه آتش‌سوزی منزل', status: 'active', endDate: '2025-05-31' },
        { id: 'pol-003', policyNumber: 'INS-1403-9933887', product: 'بیمه درمان تکمیلی', status: 'active', endDate: '2024-12-31' },
      ])
    } catch {
      setPolicies([
        { id: 'pol-001', policyNumber: 'INS-1403-7845129', product: 'بیمه شخص ثالث خودرو', status: 'active', endDate: '2025-03-20' },
        { id: 'pol-002', policyNumber: 'INS-1403-8821456', product: 'بیمه آتش‌سوزی منزل', status: 'active', endDate: '2025-05-31' },
        { id: 'pol-003', policyNumber: 'INS-1403-9933887', product: 'بیمه درمان تکمیلی', status: 'active', endDate: '2024-12-31' },
      ])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await policiesApi.scheduleRenewal(formData.policyId, {
        newStartDate: formData.newStartDate,
        newEndDate: formData.newEndDate,
        newPremium: formData.newPremium ? parseFloat(formData.newPremium) : undefined,
        type: 'manual',
        notes: formData.notes,
      })

      if (response.success) {
        setSuccess(true)
      } else {
        setError(response.error?.message || 'خطا در ثبت درخواست تمدید')
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'خطا در ثبت درخواست تمدید')
    } finally {
      setLoading(false)
    }
  }

  const handlePolicySelect = (policyId: string) => {
    const policy = policies.find(p => p.id === policyId)
    setFormData({
      ...formData,
      policyId,
      policyNumber: policy?.policyNumber || '',
      newStartDate: policy?.endDate ? new Date(new Date(policy.endDate).getTime() + 86400000).toISOString().split('T')[0] : '',
      newEndDate: policy?.endDate ? new Date(new Date(policy.endDate).getTime() + 365 * 86400000).toISOString().split('T')[0] : '',
    })
  }

  if (success) {
    return (
      <div className="py-20 flex items-center justify-center">
        <Card className="shadow-3 p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-feedback-success-subtle rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-feedback-success" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">درخواست تمدید ثبت شد</h2>
          <p className="text-text-secondary mb-4">درخواست تمدید بیمه‌نامه شما با موفقیت ثبت شد</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-brand-primary text-text-on-brand py-3 px-4 rounded-lg font-medium hover:opacity-90 transition-colors"
          >
            بازگشت به داشبورد
          </button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-lg font-bold text-text-primary">درخواست تمدید بیمه‌نامه</h1>
      <Card className="shadow-1 p-4">
          <div className="flex items-center justify-between mb-8">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${step >= s ? 'bg-brand-primary text-text-on-brand' : 'bg-border-default text-text-secondary'}`}>
                  {s}
                </div>
                {s < 2 && <div className={`w-16 h-1 mx-2 ${step > s ? 'bg-brand-primary' : 'bg-border-default'}`} />}
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-feedback-error-subtle border border-feedback-error/30 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-feedback-error mt-0.5 flex-shrink-0" />
              <p className="text-feedback-error text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-text-primary mb-4">انتخاب بیمه‌نامه</h2>
                {policies.length === 0 ? (
                  <p className="text-text-muted text-sm">هیچ بیمه‌نامه فعالی یافت نشد</p>
                ) : (
                  <div className="space-y-3">
                    {policies.map((policy) => (
                      <div
                        key={policy.id}
                        onClick={() => handlePolicySelect(policy.id)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          formData.policyId === policy.id
                            ? 'border-brand-primary bg-brand-primary/5'
                            : 'border-border-default hover:border-brand-primary/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-text-primary">{policy.policyNumber}</p>
                            <p className="text-sm text-text-muted">{policy.product}</p>
                          </div>
                          <FileText className="w-5 h-5 text-text-muted" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => formData.policyId && setStep(2)}
                  disabled={!formData.policyId}
                  className="w-full bg-brand-primary text-text-on-brand py-3 px-4 rounded-lg font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                >
                  ادامه
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-text-primary mb-4">جزئیات تمدید</h2>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">تاریخ شروع جدید</label>
                  <div className="relative">
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type="date"
                      value={formData.newStartDate}
                      onChange={(e) => setFormData({ ...formData, newStartDate: e.target.value })}
                      className="w-full pr-10 pl-3 py-2 border border-border-default rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">تاریخ پایان جدید</label>
                  <div className="relative">
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type="date"
                      value={formData.newEndDate}
                      onChange={(e) => setFormData({ ...formData, newEndDate: e.target.value })}
                      className="w-full pr-10 pl-3 py-2 border border-border-default rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">حق بیمه جدید (تومان)</label>
                  <input
                    type="number"
                    value={formData.newPremium}
                    onChange={(e) => setFormData({ ...formData, newPremium: e.target.value })}
                    placeholder="اختیاری"
                    className="w-full px-3 py-2 border border-border-default rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">توضیحات</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-border-default rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 bg-border-default text-text-primary py-3 px-4 rounded-lg font-medium hover:bg-border-default transition-colors"
                  >
                    بازگشت
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-brand-primary text-text-on-brand py-3 px-4 rounded-lg font-medium hover:opacity-90 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'در حال ثبت...' : 'ثبت درخواست تمدید'}
                  </button>
                </div>
              </div>
            )}
          </form>
      </Card>
    </div>
  )
}
