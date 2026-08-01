'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Upload, Loader2 } from 'lucide-react';
import { Card } from '@insurance/design-system';
import { apiFetch } from '@/lib/api';

interface FormData {
  policyNumber: string;
  claimType: string;
  incidentDate: string;
  incidentTime: string;
  location: string;
  description: string;
  estimatedAmount: string;
  contactPhone: string;
}

export default function NewClaimPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    policyNumber: '',
    claimType: '',
    incidentDate: '',
    incidentTime: '',
    location: '',
    description: '',
    estimatedAmount: '',
    contactPhone: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.policyNumber) {
      newErrors.policyNumber = 'شماره بیمه‌نامه الزامی است';
    }
    if (!formData.claimType) {
      newErrors.claimType = 'نوع خسارت الزامی است';
    }
    if (!formData.incidentDate) {
      newErrors.incidentDate = 'تاریخ وقوع الزامی است';
    }
    if (!formData.incidentTime) {
      newErrors.incidentTime = 'ساعت وقوع الزامی است';
    }
    if (!formData.location) {
      newErrors.location = 'مکان وقوع الزامی است';
    }
    if (!formData.description) {
      newErrors.description = 'شرح خسارت الزامی است';
    }
    if (!formData.estimatedAmount) {
      newErrors.estimatedAmount = 'مبلغ تخمینی الزامی است';
    }
    if (!formData.contactPhone) {
      newErrors.contactPhone = 'شماره تماس الزامی است';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/portal/claims', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      if (res.success) {
        router.push('/portal/claims');
      } else {
        router.push('/portal/claims');
      }
    } catch {
      router.push('/portal/claims');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base" dir="rtl">
      <div className="border-b border-border-default bg-bg-raised">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 py-4">
            <button onClick={() => router.push('/portal/claims')} className="text-text-muted hover:text-text-primary">
              <ChevronRight className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold text-text-primary">ثبت خسارت جدید</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        <Card>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Policy Information */}
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-4">اطلاعات بیمه‌نامه</h2>
              <div>
                <label htmlFor="policyNumber" className="block text-sm font-medium text-text-secondary">
                  شماره بیمه‌نامه *
                </label>
                <input
                  type="text"
                  id="policyNumber"
                  name="policyNumber"
                  value={formData.policyNumber}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    errors.policyNumber ? 'border-feedback-error/30 focus:border-feedback-error' : 'border-border-default focus:border-brand-primary'
                  } border px-3 py-2`}
                  placeholder="مثال: POL-2024-001"
                />
                {errors.policyNumber && (
                  <p className="mt-1 text-sm text-feedback-error">{errors.policyNumber}</p>
                )}
              </div>
            </div>

            {/* Claim Information */}
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-4">اطلاعات خسارت</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="claimType" className="block text-sm font-medium text-text-secondary">
                    نوع خسارت *
                  </label>
                  <select
                    id="claimType"
                    name="claimType"
                    value={formData.claimType}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                      errors.claimType ? 'border-feedback-error/30 focus:border-feedback-error' : 'border-border-default focus:border-brand-primary'
                    } border px-3 py-2`}
                  >
                    <option value="">انتخاب کنید</option>
                    <option value="ACCIDENT">تصادف</option>
                    <option value="FIRE">آتش‌سوزی</option>
                    <option value="THEFT">سرقت</option>
                    <option value="GLASS">شکست شیشه</option>
                    <option value="OTHER">سایر</option>
                  </select>
                  {errors.claimType && (
                    <p className="mt-1 text-sm text-feedback-error">{errors.claimType}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="incidentDate" className="block text-sm font-medium text-text-secondary">
                      تاریخ وقوع *
                    </label>
                    <input
                      type="date"
                      id="incidentDate"
                      name="incidentDate"
                      value={formData.incidentDate}
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                        errors.incidentDate ? 'border-feedback-error/30 focus:border-feedback-error' : 'border-border-default focus:border-brand-primary'
                      } border px-3 py-2`}
                    />
                    {errors.incidentDate && (
                      <p className="mt-1 text-sm text-feedback-error">{errors.incidentDate}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="incidentTime" className="block text-sm font-medium text-text-secondary">
                      ساعت وقوع *
                    </label>
                    <input
                      type="time"
                      id="incidentTime"
                      name="incidentTime"
                      value={formData.incidentTime}
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                        errors.incidentTime ? 'border-feedback-error/30 focus:border-feedback-error' : 'border-border-default focus:border-brand-primary'
                      } border px-3 py-2`}
                    />
                    {errors.incidentTime && (
                      <p className="mt-1 text-sm text-feedback-error">{errors.incidentTime}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-text-secondary">
                    مکان وقوع *
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                      errors.location ? 'border-feedback-error/30 focus:border-feedback-error' : 'border-border-default focus:border-brand-primary'
                    } border px-3 py-2`}
                    placeholder="آدرس دقیق مکان وقوع خسارت"
                  />
                  {errors.location && (
                    <p className="mt-1 text-sm text-feedback-error">{errors.location}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-text-secondary">
                    شرح خسارت *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                      errors.description ? 'border-feedback-error/30 focus:border-feedback-error' : 'border-border-default focus:border-brand-primary'
                    } border px-3 py-2`}
                    placeholder="شرح کامل وقوع خسارت"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-feedback-error">{errors.description}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="estimatedAmount" className="block text-sm font-medium text-text-secondary">
                    مبلغ تخمینی (ریال) *
                  </label>
                  <input
                    type="number"
                    id="estimatedAmount"
                    name="estimatedAmount"
                    value={formData.estimatedAmount}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                      errors.estimatedAmount ? 'border-feedback-error/30 focus:border-feedback-error' : 'border-border-default focus:border-brand-primary'
                    } border px-3 py-2`}
                    placeholder="مبلغ تخمینی خسارت"
                  />
                  {errors.estimatedAmount && (
                    <p className="mt-1 text-sm text-feedback-error">{errors.estimatedAmount}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-4">اطلاعات تماس</h2>
              <div>
                <label htmlFor="contactPhone" className="block text-sm font-medium text-text-secondary">
                  شماره تماس *
                </label>
                <input
                  type="tel"
                  id="contactPhone"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    errors.contactPhone ? 'border-feedback-error/30 focus:border-feedback-error' : 'border-border-default focus:border-brand-primary'
                  } border px-3 py-2`}
                  placeholder="09xxxxxxxxx"
                />
                {errors.contactPhone && (
                  <p className="mt-1 text-sm text-feedback-error">{errors.contactPhone}</p>
                )}
              </div>
            </div>

            {/* Document Upload */}
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-4">مدارک (اختیاری)</h2>
              <div>
                <label className="block text-sm font-medium text-text-secondary">
                  آپلود مدارک
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-border-default border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-10 w-10 text-text-muted" />
                    <div className="flex text-sm text-text-muted">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-bg-raised rounded-md font-medium text-brand-primary hover:text-brand-primary focus-within:outline-none"
                      >
                        <span>انتخاب فایل</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple />
                      </label>
                      <p className="pr-1">یا کشیدن و رها کردن</p>
                    </div>
                    <p className="text-xs text-text-muted">PNG, JPG, PDF تا 10MB</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-6 border-t border-border-default">
              <button
                type="button"
                onClick={() => router.push('/portal/claims')}
                className="px-4 py-2 border border-border-default rounded-md text-sm font-medium text-text-secondary hover:bg-bg-base"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-feedback-success border border-transparent rounded-md text-sm font-medium text-text-on-brand hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'در حال ثبت...' : 'ثبت خسارت'}
              </button>
            </div>
          </div>
        </form>
        </Card>
      </div>
    </div>
  );
}
