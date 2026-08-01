'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, AlertCircle, CheckCircle, Upload, X } from 'lucide-react'
import { Card } from '@insurance/design-system'
import { complaintsApi } from '@/lib/api'

export default function ComplaintFiling() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    subject: '',
    category: '',
    description: '',
    policyId: '',
    claimId: '',
    attachments: [] as File[],
  })

  const categories = [
    'خدمات مشتریان',
    'صدور بیمه‌نامه',
    'خسارت',
    'پرداخت',
    'تمدید',
    'اصلاح بیمه‌نامه',
    'سایر',
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('subject', formData.subject)
      formDataToSend.append('category', formData.category)
      formDataToSend.append('description', formData.description)
      if (formData.policyId) formDataToSend.append('policyId', formData.policyId)
      if (formData.claimId) formDataToSend.append('claimId', formData.claimId)
      
      formData.attachments.forEach((file, index) => {
        formDataToSend.append(`attachment_${index}`, file)
      })

      const response = await complaintsApi.create(formDataToSend)
      
      if (response.success) {
        setSuccess(true)
      } else {
        setError(response.message || 'خطا در ثبت شکایت')
      }
    } catch (err: any) {
      setError(err.message || 'خطا در ارتباط با سرور')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setFormData({ ...formData, attachments: [...formData.attachments, ...files] })
  }

  const removeAttachment = (index: number) => {
    setFormData({
      ...formData,
      attachments: formData.attachments.filter((_, i) => i !== index),
    })
  }

  if (success) {
    return (
      <div className="py-20 flex items-center justify-center">
        <Card className="shadow-3 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-feedback-success-subtle rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-feedback-success" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">شکایت ثبت شد</h2>
          <p className="text-text-secondary mb-6">شکایت شما با موفقیت ثبت شد. کد پیگیری به زودی ارسال خواهد شد.</p>
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
      <h1 className="text-lg font-bold text-text-primary">ثبت شکایت</h1>
      <Card className="shadow-1 p-4">
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3].map((s) => (
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
                {s < 3 && (
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
                    دسته‌بندی شکایت <span className="text-feedback-error">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-border-default rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    required
                  >
                    <option value="">انتخاب کنید</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    موضوع شکایت <span className="text-feedback-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="موضوع شکایت را وارد کنید"
                    className="w-full px-4 py-3 border border-border-default rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!formData.category || !formData.subject}
                  className="w-full bg-brand-primary text-text-on-brand py-3 px-4 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ادامه
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    شماره بیمه‌نامه (اختیاری)
                  </label>
                  <input
                    type="text"
                    value={formData.policyId}
                    onChange={(e) => setFormData({ ...formData, policyId: e.target.value })}
                    placeholder="شماره بیمه‌نامه مرتبط"
                    className="w-full px-4 py-3 border border-border-default rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    شماره خسارت (اختیاری)
                  </label>
                  <input
                    type="text"
                    value={formData.claimId}
                    onChange={(e) => setFormData({ ...formData, claimId: e.target.value })}
                    placeholder="شماره خسارت مرتبط"
                    className="w-full px-4 py-3 border border-border-default rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    شرح شکایت <span className="text-feedback-error">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="شرح کامل شکایت خود را بنویسید"
                    rows={5}
                    className="w-full px-4 py-3 border border-border-default rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent resize-none"
                    required
                  />
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
                    disabled={!formData.description}
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
                    پیوست‌ها (اختیاری)
                  </label>
                  <div className="border-2 border-dashed border-border-default rounded-lg p-6 text-center">
                    <input
                      type="file"
                      id="file-upload"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload className="w-8 h-8 text-text-muted mb-2" />
                      <span className="text-sm text-text-secondary">
                        کلیک کنید یا فایل را اینجا بکشید
                      </span>
                      <span className="text-xs text-text-muted mt-1">
                        PDF, JPG, PNG (حداکثر ۵MB)
                      </span>
                    </label>
                  </div>
                </div>

                {formData.attachments.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-text-secondary">فایل‌های انتخاب شده:</h4>
                    {formData.attachments.map((file, index) => (
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
                          onClick={() => removeAttachment(index)}
                          className="text-feedback-error hover:text-feedback-error"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-feedback-warning-subtle border border-feedback-warning/30 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-feedback-warning flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-feedback-warning">
                      <p className="font-medium mb-1">توجه:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>شکایت شما حداکثر تا ۵ روز کاری بررسی خواهد شد</li>
                        <li>نتیجه بررسی از طریق SMS به شما اطلاع داده می‌شود</li>
                        <li>در صورت نیاز، کارشناس با شما تماس خواهد گرفت</li>
                      </ul>
                    </div>
                  </div>
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
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-brand-primary text-text-on-brand py-3 px-4 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'در حال ثبت...' : 'ثبت شکایت'}
                  </button>
                </div>
              </>
            )}
          </form>
      </Card>
    </div>
  )
}
