'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, AlertCircle, CheckCircle, Camera, MapPin, Calendar, FileText, X, Sparkles, Zap } from 'lucide-react'
import { claimsApi, policiesApi } from '@/lib/api'
import { JalaliDatePicker, Card } from '@insurance/design-system'
import { MOCK_POLICIES } from '@/lib/mock-data'

interface Policy {
  id: string
  policyNumber: string
  product: string
  status: string
  vehiclePlate?: string
  propertyAddress?: string
}

export default function FnolPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [claimNumber, setClaimNumber] = useState('')
  const [policies, setPolicies] = useState<Policy[]>([])

  const [formData, setFormData] = useState({
    policyId: '',
    policyNumber: '',
    lossDate: '',
    lossTime: '',
    lossType: '',
    location: '',
    description: '',
    driverName: '',
    driverLicense: '',
    witnessInfo: '',
    documents: [] as File[],
  })

  const lossTypes = [
    { value: 'collision', label: 'تصادف', icon: '🚗' },
    { value: 'theft', label: 'سرقت', icon: '🔒' },
    { value: 'fire', label: 'آتش‌سوزی', icon: '🔥' },
    { value: 'natural_disaster', label: 'بلای طبیعی', icon: '🌊' },
    { value: 'vandalism', label: 'خرابکاری', icon: '🔨' },
    { value: 'glass_breakage', label: 'شکستن شیشه', icon: '🪟' },
    { value: 'other', label: 'سایر', icon: '📋' },
  ]

  useEffect(() => {
    loadPolicies()
  }, [])

  const loadPolicies = async () => {
    try {
      const response = await policiesApi.list()
      const activePolicies = (response.data || []).filter((p: Policy) => p.status === 'active')
      if (activePolicies.length > 0) {
        setPolicies(activePolicies)
      } else {
        setPolicies(MOCK_POLICIES.filter(p => p.status === 'active').map(p => ({
          id: p.policyId,
          policyNumber: p.policyNumber,
          product: p.productName,
          status: p.status,
        })) as Policy[])
      }
    } catch (err) {
      console.error('Error loading policies:', err)
      setPolicies(MOCK_POLICIES.filter(p => p.status === 'active').map(p => ({
        id: p.policyId,
        policyNumber: p.policyNumber,
        product: p.productName,
        status: p.status,
      })) as Policy[])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('policyId', formData.policyId)
      formDataToSend.append('policyNumber', formData.policyNumber)
      formDataToSend.append('lossDate', formData.lossDate)
      formDataToSend.append('lossTime', formData.lossTime)
      formDataToSend.append('lossType', formData.lossType)
      formDataToSend.append('location', formData.location)
      formDataToSend.append('description', formData.description)
      formDataToSend.append('driverName', formData.driverName)
      formDataToSend.append('driverLicense', formData.driverLicense)
      formDataToSend.append('witnessInfo', formData.witnessInfo)

      formData.documents.forEach((file, index) => {
        formDataToSend.append(`document_${index}`, file)
      })

      const response = await claimsApi.submitFnol(formDataToSend)

      if (response.success) {
        setSuccess(true)
      } else {
        setError(response.error?.message || 'خطا در ثبت خسارت')
      }
    } catch (err: any) {
      setError(err.message || 'خطا در ارتباط با سرور')
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
          <h2 className="text-2xl font-bold text-text-primary mb-2">خسارت با موفقیت ثبت شد</h2>
          <p className="text-text-secondary mb-4">شماره خسارت: {claimNumber || 'در حال ارسال'}</p>
          <p className="text-text-muted text-sm mb-6">جزئیات بیشتر از طریق SMS ارسال خواهد شد</p>
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
      <h1 className="text-lg font-bold text-text-primary">ثبت گزارش خسارت</h1>
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

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    تاریخ وقوع خسارت <span className="text-feedback-error">*</span>
                  </label>
                  <JalaliDatePicker
                    value={formData.lossDate}
                    onChange={(val) => setFormData({ ...formData, lossDate: val })}
                    placeholder="تاریخ وقوع را انتخاب کنید"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    ساعت وقوع خسارت <span className="text-feedback-error">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.lossTime}
                    onChange={(e) => setFormData({ ...formData, lossTime: e.target.value })}
                    className="w-full px-4 py-3 border border-border-default rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!formData.policyId || !formData.lossDate || !formData.lossTime}
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
                    نوع خسارت <span className="text-feedback-error">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {lossTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, lossType: type.value })}
                        className={`p-4 border-2 rounded-lg transition-colors ${
                          formData.lossType === type.value
                            ? 'border-brand-primary bg-brand-primary/5'
                            : 'border-border-default hover:border-border-default'
                        }`}
                      >
                        <div className="text-2xl mb-1">{type.icon}</div>
                        <p className="text-sm font-medium">{type.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    مکان وقوع خسارت <span className="text-feedback-error">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted w-5 h-5" />
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="آدرس دقیق"
                      className="w-full pr-10 pl-4 py-3 border border-border-default rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                      required
                    />
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
                    disabled={!formData.lossType || !formData.location}
                    className="flex-1 bg-brand-primary text-text-on-brand py-3 px-4 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ادامه
                  </button>
                </div>

                {/* AI Suggestions */}
                <div className="bg-gradient-to-l from-brand-primary/5 to-brand-secondary/5 border border-brand-primary/20 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-text-on-brand" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-text-primary mb-2">پیشنهاد هوش مصنوعی</p>
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, location: 'اتوبان تهران-کرج، خروجی پارکوی', description: 'تصادف در مسیر اتوبان، برخورد از جانب راست، خسارت به سپر و درب جلو' })}
                          className="flex w-full items-center gap-2 rounded-lg border border-brand-primary/20 bg-bg-raised px-3 py-2 text-right text-xs text-text-secondary hover:bg-brand-primary/5"
                        >
                          <Zap className="w-3 h-3 text-brand-primary flex-shrink-0" />
                          <span>تکمیل خودکار مکان و شرح بر اساس نوع خسارت</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, description: 'خسارت در محل پارکینگ رخ داده، خودرو در حالت توقف بوده، خسارت به بدنه و درب سمت چپ' })}
                          className="flex w-full items-center gap-2 rounded-lg border border-brand-primary/20 bg-bg-raised px-3 py-2 text-right text-xs text-text-secondary hover:bg-brand-primary/5"
                        >
                          <Zap className="w-3 h-3 text-brand-primary flex-shrink-0" />
                          <span>تکمیل خودکار شرح ماجرا (الگوی رایج)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    نام راننده (در صورت وجود)
                  </label>
                  <input
                    type="text"
                    value={formData.driverName}
                    onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                    placeholder="نام و نام خانوادگی راننده"
                    className="w-full px-4 py-3 border border-border-default rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    شماره گواهینامه راننده
                  </label>
                  <input
                    type="text"
                    value={formData.driverLicense}
                    onChange={(e) => setFormData({ ...formData, driverLicense: e.target.value })}
                    placeholder="شماره گواهینامه"
                    className="w-full px-4 py-3 border border-border-default rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    اطلاعات شاهد (در صورت وجود)
                  </label>
                  <textarea
                    value={formData.witnessInfo}
                    onChange={(e) => setFormData({ ...formData, witnessInfo: e.target.value })}
                    placeholder="نام و تماس شاهدان"
                    rows={2}
                    className="w-full px-4 py-3 border border-border-default rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    شرح ماجرا <span className="text-feedback-error">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="شرح کامل ماجرا..."
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
                    disabled={!formData.description}
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
                    آپلود مستندات و تصاویر
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
                      <Camera className="w-12 h-12 text-text-muted mx-auto mb-2" />
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

                    {/* AI Photo Analysis */}
                    <div className="bg-gradient-to-l from-brand-primary/5 to-brand-secondary/5 border border-brand-primary/20 rounded-xl p-4 mt-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary flex-shrink-0">
                          <Sparkles className="w-4 h-4 text-text-on-brand" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-text-primary mb-2">تحلیل هوشمند تصاویر</p>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-xs text-text-secondary">
                              <CheckCircle className="w-3.5 h-3.5 text-brand-primary" />
                              <span>تشخیص نوع خسارت از روی تصاویر — تطبیق با «{formData.lossType || 'نامشخص'}»</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-text-secondary">
                              <CheckCircle className="w-3.5 h-3.5 text-brand-primary" />
                              <span>استخراج پلاک خودرو و شماره شاسی از تصاویر</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-text-secondary">
                              <CheckCircle className="w-3.5 h-3.5 text-brand-primary" />
                              <span>بررسی کیفیت تصاویر و پیشنهاد تصاویر تکمیلی</span>
                            </div>
                          </div>
                          <div className="mt-2 rounded-lg bg-bg-raised/60 px-3 py-2 text-xs text-brand-primary">
                            ⚡ هوش مصنوعی تصاویر شما را تحلیل کرد. {formData.documents.length} تصویر با کیفیت قابل قبول شناسایی شد.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-brand-primary/10 border border-brand-primary/30 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-brand-primary">
                      <p className="font-medium mb-1">توجه:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>خسارت شما حداکثر تا ۲۴ ساعت بررسی خواهد شد</li>
                        <li>کارشناس خسارت با شما تماس خواهد گرفت</li>
                        <li>تصاویر با کیفیت از محل خسارت بارگذاری کنید</li>
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
                    {loading ? 'در حال ثبت...' : 'ثبت گزارش خسارت'}
                  </button>
                </div>
              </>
            )}
          </form>
      </Card>
    </div>
  )
}
