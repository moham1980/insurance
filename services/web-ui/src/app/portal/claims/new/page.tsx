'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
      // In a real implementation, submit to API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('خسارت با موفقیت ثبت شد');
      router.push('/portal/claims');
    } catch (error) {
      console.error('Failed to submit claim:', error);
      alert('خطا در ثبت خسارت. لطفاً مجدداً تلاش کنید.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/portal/claims')}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">ثبت خسارت جدید</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
          <div className="space-y-6">
            {/* Policy Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">اطلاعات بیمه‌نامه</h2>
              <div>
                <label htmlFor="policyNumber" className="block text-sm font-medium text-gray-700">
                  شماره بیمه‌نامه *
                </label>
                <input
                  type="text"
                  id="policyNumber"
                  name="policyNumber"
                  value={formData.policyNumber}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    errors.policyNumber ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                  } border px-3 py-2`}
                  placeholder="مثال: POL-2024-001"
                />
                {errors.policyNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.policyNumber}</p>
                )}
              </div>
            </div>

            {/* Claim Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">اطلاعات خسارت</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="claimType" className="block text-sm font-medium text-gray-700">
                    نوع خسارت *
                  </label>
                  <select
                    id="claimType"
                    name="claimType"
                    value={formData.claimType}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                      errors.claimType ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
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
                    <p className="mt-1 text-sm text-red-600">{errors.claimType}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="incidentDate" className="block text-sm font-medium text-gray-700">
                      تاریخ وقوع *
                    </label>
                    <input
                      type="date"
                      id="incidentDate"
                      name="incidentDate"
                      value={formData.incidentDate}
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                        errors.incidentDate ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                      } border px-3 py-2`}
                    />
                    {errors.incidentDate && (
                      <p className="mt-1 text-sm text-red-600">{errors.incidentDate}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="incidentTime" className="block text-sm font-medium text-gray-700">
                      ساعت وقوع *
                    </label>
                    <input
                      type="time"
                      id="incidentTime"
                      name="incidentTime"
                      value={formData.incidentTime}
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                        errors.incidentTime ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                      } border px-3 py-2`}
                    />
                    {errors.incidentTime && (
                      <p className="mt-1 text-sm text-red-600">{errors.incidentTime}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                    مکان وقوع *
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                      errors.location ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                    } border px-3 py-2`}
                    placeholder="آدرس دقیق مکان وقوع خسارت"
                  />
                  {errors.location && (
                    <p className="mt-1 text-sm text-red-600">{errors.location}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    شرح خسارت *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                      errors.description ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                    } border px-3 py-2`}
                    placeholder="شرح کامل وقوع خسارت"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="estimatedAmount" className="block text-sm font-medium text-gray-700">
                    مبلغ تخمینی (ریال) *
                  </label>
                  <input
                    type="number"
                    id="estimatedAmount"
                    name="estimatedAmount"
                    value={formData.estimatedAmount}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                      errors.estimatedAmount ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                    } border px-3 py-2`}
                    placeholder="مبلغ تخمینی خسارت"
                  />
                  {errors.estimatedAmount && (
                    <p className="mt-1 text-sm text-red-600">{errors.estimatedAmount}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">اطلاعات تماس</h2>
              <div>
                <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700">
                  شماره تماس *
                </label>
                <input
                  type="tel"
                  id="contactPhone"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    errors.contactPhone ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                  } border px-3 py-2`}
                  placeholder="09xxxxxxxxx"
                />
                {errors.contactPhone && (
                  <p className="mt-1 text-sm text-red-600">{errors.contactPhone}</p>
                )}
              </div>
            </div>

            {/* Document Upload */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">مدارک (اختیاری)</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  آپلود مدارک
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                      >
                        <span>انتخاب فایل</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple />
                      </label>
                      <p className="pr-1">یا کشیدن و رها کردن</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, PDF تا 10MB</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.push('/portal/claims')}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-green-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'در حال ثبت...' : 'ثبت خسارت'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
