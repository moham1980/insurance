'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Upload, AlertCircle, CheckCircle, Camera, MapPin, Calendar, FileText, X } from 'lucide-react'
import { claimsApi, policiesApi } from '@/lib/api'

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">خسارت با موفقیت ثبت شد</h2>
          <p className="text-gray-600 mb-4">شماره خسارت: {claimNumber || 'در حال ارسال'}</p>
          <p className="text-gray-500 text-sm mb-6">جزئیات بیشتر از طریق SMS ارسال خواهد شد</p>
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
            <h1 className="text-xl font-bold text-gray-900">ثبت گزارش خسارت</h1>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تاریخ وقوع خسارت <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="date"
                      value={formData.lossDate}
                      onChange={(e) => setFormData({ ...formData, lossDate: e.target.value })}
                      className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ساعت وقوع خسارت <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.lossTime}
                    onChange={(e) => setFormData({ ...formData, lossTime: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!formData.policyId || !formData.lossDate || !formData.lossTime}
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
                    نوع خسارت <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {lossTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, lossType: type.value })}
                        className={`p-4 border-2 rounded-lg transition-colors ${
                          formData.lossType === type.value
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">{type.icon}</div>
                        <p className="text-sm font-medium">{type.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    مکان وقوع خسارت <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="آدرس دقیق"
                      className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
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
                    disabled={!formData.lossType || !formData.location}
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
                    نام راننده (در صورت وجود)
                  </label>
                  <input
                    type="text"
                    value={formData.driverName}
                    onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                    placeholder="نام و نام خانوادگی راننده"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    شماره گواهینامه راننده
                  </label>
                  <input
                    type="text"
                    value={formData.driverLicense}
                    onChange={(e) => setFormData({ ...formData, driverLicense: e.target.value })}
                    placeholder="شماره گواهینامه"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اطلاعات شاهد (در صورت وجود)
                  </label>
                  <textarea
                    value={formData.witnessInfo}
                    onChange={(e) => setFormData({ ...formData, witnessInfo: e.target.value })}
                    placeholder="نام و تماس شاهدان"
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    شرح ماجرا <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="شرح کامل ماجرا..."
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
                    disabled={!formData.description}
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
                    آپلود مستندات و تصاویر
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
                      <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
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
                    className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    بازگشت
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'در حال ثبت...' : 'ثبت گزارش خسارت'}
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
