'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, AlertCircle, FileText, MapPin, Car, Shield, X, Upload } from 'lucide-react'
import { Card } from '@insurance/design-system'
import { policiesApi } from '@/lib/api'

const MOCK_ACTIVE_POLICIES: Policy[] = [
  { id: 'pol-001', policyNumber: 'INS-1403-7845129', product: 'بیمه شخص ثالث خودرو', status: 'active', vehiclePlate: '۱۲۳-ب-۴۵' },
  { id: 'pol-002', policyNumber: 'INS-1403-8821456', product: 'بیمه آتش‌سوزی منزل', status: 'active', propertyAddress: 'تهران، ولیعصر' },
  { id: 'pol-003', policyNumber: 'INS-1403-9933887', product: 'بیمه درمان تکمیلی', status: 'active' },
]

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
      setPolicies(activePolicies.length > 0 ? activePolicies : MOCK_ACTIVE_POLICIES)
    } catch {
      setPolicies(MOCK_ACTIVE_POLICIES)
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
      <div className="py-20 flex items-center justify-center">
        <Card className="shadow-3 p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-feedback-success-subtle rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-feedback-success" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">درخواست اصلاح ثبت شد</h2>
          <p className="text-text-secondary mb-4">درخواست اصلاح بیمه‌نامه شما با موفقیت ثبت شد</p>
          <p className="text-text-muted text-sm mb-6">کد پیگیری به زودی ارسال خواهد شد</p>
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
      <h1 className="text-lg font-bold text-text-primary">درخواست اصلاح بیمه‌نامه</h1>
      <Card className="shadow-1 p-4">
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                    step >= s
                      ? 'bg-brand-primary text-text-on-brand'
                      : 'bg-border-default text-text-secondary'
                  }`}
                >
                  {s}
                </div>
                {s < 4 && (
                  <div
                    className={`w-full h-1 mx-2 ${
                      step > s ? 'bg-brand-primary' : 'bg-border-default'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-feedback-error-subtle border border-feedback-error/30 rounded-lg text-feedback-error text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    انتخاب بیمه‌نامه <span className="text-feedback-error">*</span>
                  </label>
                  {policies.length === 0 ? (
                    <div className="text-center py-4 text-text-muted">
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
                              ? 'border-brand-primary bg-brand-primary/5'
                              : 'border-border-default hover:border-border-default'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-text-primary">{policy.policyNumber}</p>
                              <p className="text-sm text-text-secondary">{policy.product}</p>
                            </div>
                            {formData.policyId === policy.id && (
                              <CheckCircle className="w-5 h-5 text-brand-primary" />
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
                  className="w-full bg-brand-primary text-text-on-brand py-3 px-4 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ادامه
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-3">
                    نوع اصلاح <span className="text-feedback-error">*</span>
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
                              ? 'border-brand-primary bg-brand-primary/5'
                              : 'border-border-default hover:border-border-default'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Icon className={`w-6 h-6 mt-1 ${
                              formData.endorsementType === type.value ? 'text-brand-primary' : 'text-text-muted'
                            }`} />
                            <div className="flex-1">
                              <p className="font-medium text-text-primary">{type.label}</p>
                              <p className="text-sm text-text-secondary mt-1">{type.description}</p>
                            </div>
                            {formData.endorsementType === type.value && (
                              <CheckCircle className="w-5 h-5 text-brand-primary flex-shrink-0" />
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
                    className="flex-1 bg-border-default text-text-secondary py-3 px-4 rounded-lg font-medium hover:bg-border-default transition-colors"
                  >
                    بازگشت
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={!formData.endorsementType}
                    className="flex-1 bg-brand-primary text-text-on-brand py-3 px-4 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ادامه
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    مقدار فعلی
                  </label>
                  <input
                    type="text"
                    value={formData.currentValue}
                    onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                    placeholder="مقدار فعلی مورد نظر"
                    className="w-full px-4 py-3 border border-border-default rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    مقدار جدید <span className="text-feedback-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.newValue}
                    onChange={(e) => setFormData({ ...formData, newValue: e.target.value })}
                    placeholder="مقدار جدید مورد نظر"
                    className="w-full px-4 py-3 border border-border-default rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    تاریخ موثر <span className="text-feedback-error">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                    className="w-full px-4 py-3 border border-border-default rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    دلیل درخواست <span className="text-feedback-error">*</span>
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="دلیل درخواست اصلاح را توضیح دهید..."
                    rows={4}
                    className="w-full px-4 py-3 border border-border-default rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent resize-none"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 bg-border-default text-text-secondary py-3 px-4 rounded-lg font-medium hover:bg-border-default transition-colors"
                  >
                    بازگشت
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    disabled={!formData.newValue || !formData.effectiveDate || !formData.reason}
                    className="flex-1 bg-brand-primary text-text-on-brand py-3 px-4 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ادامه
                  </button>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    مستندات پشتیبان (اختیاری)
                  </label>
                  <div className="border-2 border-dashed border-border-default rounded-lg p-6 text-center hover:border-brand-primary transition-colors">
                    <input
                      type="file"
                      id="documents"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <label htmlFor="documents" className="cursor-pointer">
                      <Upload className="w-12 h-12 text-text-muted mx-auto mb-2" />
                      <p className="text-text-secondary mb-1">برای آپلود کلیک کنید</p>
                      <p className="text-text-muted text-sm">تصاویر، PDF (حداکثر ۵MB)</p>
                    </label>
                  </div>
                </div>

                {formData.documents.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-text-secondary">فایل‌های انتخاب شده:</h4>
                    {formData.documents.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-bg-subtle rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-text-muted" />
                          <span className="text-sm text-text-secondary">{file.name}</span>
                          <span className="text-xs text-text-muted">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDocument(index)}
                          className="text-feedback-error hover:text-feedback-error"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-brand-primary/10 border border-brand-primary/30 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-brand-primary">
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
                    className="flex-1 bg-border-default text-text-secondary py-3 px-4 rounded-lg font-medium hover:bg-border-default transition-colors"
                  >
                    بازگشت
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-brand-primary text-text-on-brand py-3 px-4 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'در حال ثبت...' : 'ثبت درخواست اصلاح'}
                  </button>
                </div>
              </>
            )}
          </form>
      </Card>
    </div>
  )
}
