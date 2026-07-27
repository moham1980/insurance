'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle, AlertCircle, FileText, MapPin, Car, Shield, X, Upload } from 'lucide-react'
import { policiesApi } from '@/lib/api'

interface Policy {
  id: string
  policyNumber: string
  product: string
  status: string
  vehiclePlate?: string
  propertyAddress?: string
}

export default function EndorsementPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [policies, setPolicies] = useState<Policy[]>([])

  const [formData, setFormData] = useState({
    policyId: '',
    policyNumber: '',
    endorsementType: '',
    currentValue: '',
    newValue: '',
    effectiveDate: '',
    reason: '',
    documents: [] as File[],
  })

  const endorsementTypes = [
    { value: 'address_change', label: 'تغییر آدرس', icon: MapPin, description: 'تغییر محل زندگی یا محل بیمه‌شده' },
    { value: 'vehicle_plate', label: 'تغییر پلاک خودرو', icon: Car, description: 'تغییر پلاک خودرو در بیمه شخص ثالث' },
    { value: 'coverage_change', label: 'تغییر پوشش', icon: Shield, description: 'افزودن یا کاهش پوشش‌های بیمه' },
    { value: 'other', label: 'سایر تغییرات', icon: FileText, description: 'درخواست تغییرات دیگر' },
  ]

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
      const payload: Record<string, any> = {}
      if (formData.endorsementType === 'address_change') {
        payload.address = formData.newValue
      } else if (formData.endorsementType === 'vehicle_plate') {
        payload.vehicle = { plateNumber: formData.newValue }
      } else if (formData.endorsementType === 'coverage_change') {
        payload.coverages = { additionalCoverage: formData.newValue }
      } else {
        payload.value = formData.newValue
      }

      const response = await policiesApi.endorse(formData.policyId, {
        endorsementType: formData.endorsementType,
        payload,
        effectiveDate: formData.effectiveDate,
        reason: formData.reason,
      })

      if (response.success) {
        setSuccess(true)
      } else {
        setError(response.error?.message || 'خطا در ثبت درخواست اصلاح')
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'خطا در ثبت درخواست اصلاح')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setFormData({ ...formData, documents: [...formData.documents, ...files] })
  }

  const removeDocument = (index: number) => {
    setFormData({
      ...formData,
      documents: formData.documents.filter((_, i) => i !== index),
    })
  }

  const handlePolicySelect = (policyId: string) => {
    const policy = policies.find(p => p.id === policyId)
    setFormData({
      ...formData,
      policyId,
      policyNumber: policy?.policyNumber || '',
    })
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">درخواست اصلاح ثبت شد</h2>
          <p className="text-gray-600 mb-4">درخواست اصلاح بیمه‌نامه شما با موفقیت ثبت شد</p>
          <p className="text-gray-500 text-sm mb-6">کد پیگیری به زودی ارسال خواهد شد</p>
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
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container-mobile">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowRight className="w-5 h-5" />
              <span>بازگشت</span>
            </button>
            <h1 className="text-xl font-bold text-gray-900">درخواست اصلاح بیمه‌نامه</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      <div className="container-mobile py-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                    step >= s
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {s}
                </div>
                {s < 4 && (
                  <div
                    className={`w-full h-1 mx-2 ${
                      step > s ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    انتخاب بیمه‌نامه <span className="text-red-500">*</span>
                  </label>
                  {policies.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      <p>بیمه‌نامه فعالی یافت نشد</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {policies.map((policy) => (
                        <button
                          key={policy.id}
                          type="button"
                          onClick={() => handlePolicySelect(policy.id)}
                          className={`w-full p-4 border-2 rounded-lg text-right transition-colors ${
                            formData.policyId === policy.id
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{policy.policyNumber}</p>
                              <p className="text-sm text-gray-600">{policy.product}</p>
                            </div>
                            {formData.policyId === policy.id && (
                              <CheckCircle className="w-5 h-5 text-primary-600" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!formData.policyId}
                  className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ادامه
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    نوع اصلاح <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    {endorsementTypes.map((type) => {
                      const Icon = type.icon
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, endorsementType: type.value })}
                          className={`w-full p-4 border-2 rounded-lg text-right transition-colors ${
                            formData.endorsementType === type.value
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Icon className={`w-6 h-6 mt-1 ${
                              formData.endorsementType === type.value ? 'text-primary-600' : 'text-gray-400'
                            }`} />
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{type.label}</p>
                              <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                            </div>
                            {formData.endorsementType === type.value && (
                              <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    بازگشت
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={!formData.endorsementType}
                    className="flex-1 bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ادامه
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    مقدار فعلی
                  </label>
                  <input
                    type="text"
                    value={formData.currentValue}
                    onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                    placeholder="مقدار فعلی مورد نظر"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    مقدار جدید <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.newValue}
                    onChange={(e) => setFormData({ ...formData, newValue: e.target.value })}
                    placeholder="مقدار جدید مورد نظر"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تاریخ موثر <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    دلیل درخواست <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="دلیل درخواست اصلاح را توضیح دهید..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    بازگشت
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    disabled={!formData.newValue || !formData.effectiveDate || !formData.reason}
                    className="flex-1 bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ادامه
                  </button>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    مستندات پشتیبان (اختیاری)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                    <input
                      type="file"
                      id="documents"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <label htmlFor="documents" className="cursor-pointer">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 mb-1">برای آپلود کلیک کنید</p>
                      <p className="text-gray-400 text-sm">تصاویر، PDF (حداکثر ۵MB)</p>
                    </label>
                  </div>
                </div>

                {formData.documents.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">فایل‌های انتخاب شده:</h4>
                    {formData.documents.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDocument(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">توجه:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>درخواست اصلاح حداکثر تا ۳ روز کاری بررسی خواهد شد</li>
                        <li>اصلاحات ممکن است منجر به تغییر حق بیمه شوند</li>
                        <li>در صورت نیاز، کارشناس با شما تماس خواهد گرفت</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    بازگشت
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'در حال ثبت...' : 'ثبت درخواست اصلاح'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
