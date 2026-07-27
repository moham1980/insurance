'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle, AlertCircle, Calendar, FileText } from 'lucide-react'
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
      setPolicies(activePolicies)
    } catch (err) {
      console.error('Error loading policies:', err)
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">درخواست تمدید ثبت شد</h2>
          <p className="text-gray-600 mb-4">درخواست تمدید بیمه‌نامه شما با موفقیت ثبت شد</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            بازگشت به داشبورد
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container-mobile">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowRight className="w-5 h-5" />
              <span>بازگشت</span>
            </button>
            <h1 className="text-xl font-bold text-gray-900">درخواست تمدید بیمه‌نامه</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      <div className="container-mobile py-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-8">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${step >= s ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  {s}
                </div>
                {s < 2 && <div className={`w-16 h-1 mx-2 ${step > s ? 'bg-primary-600' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">انتخاب بیمه‌نامه</h2>
                {policies.length === 0 ? (
                  <p className="text-gray-500 text-sm">هیچ بیمه‌نامه فعالی یافت نشد</p>
                ) : (
                  <div className="space-y-3">
                    {policies.map((policy) => (
                      <div
                        key={policy.id}
                        onClick={() => handlePolicySelect(policy.id)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          formData.policyId === policy.id
                            ? 'border-primary-600 bg-primary-50'
                            : 'border-gray-200 hover:border-primary-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{policy.policyNumber}</p>
                            <p className="text-sm text-gray-500">{policy.product}</p>
                          </div>
                          <FileText className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => formData.policyId && setStep(2)}
                  disabled={!formData.policyId}
                  className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                >
                  ادامه
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">جزئیات تمدید</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاریخ شروع جدید</label>
                  <div className="relative">
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="date"
                      value={formData.newStartDate}
                      onChange={(e) => setFormData({ ...formData, newStartDate: e.target.value })}
                      className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاریخ پایان جدید</label>
                  <div className="relative">
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="date"
                      value={formData.newEndDate}
                      onChange={(e) => setFormData({ ...formData, newEndDate: e.target.value })}
                      className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">حق بیمه جدید (تومان)</label>
                  <input
                    type="number"
                    value={formData.newPremium}
                    onChange={(e) => setFormData({ ...formData, newPremium: e.target.value })}
                    placeholder="اختیاری"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">توضیحات</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    بازگشت
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'در حال ثبت...' : 'ثبت درخواست تمدید'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
