'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface PolicyDetail {
  id: string;
  policyNumber: string;
  product: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  issueDate: string;
  expiryDate: string;
  premium: number;
  vehiclePlate?: string;
  vehicleVin?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  insuredName: string;
  insuredNationalId: string;
  insurer: string;
  coverage: string[];
  documents: Array<{
    id: string;
    name: string;
    uploadDate: string;
  }>;
  history: Array<{
    date: string;
    action: string;
    description: string;
  }>;
}

export default function PolicyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [policy, setPolicy] = useState<PolicyDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params?.id) loadPolicyDetail();
  }, [params?.id]);

  const loadPolicyDetail = async () => {
    try {
      setLoading(true);
      // In a real implementation, fetch from API
      const mockPolicy: PolicyDetail = {
        id: params?.id as string,
        policyNumber: 'POL-2024-001',
        product: 'بدنه خودرو',
        status: 'ACTIVE',
        issueDate: '2024-03-21',
        expiryDate: '2025-03-21',
        premium: 5000000,
        vehiclePlate: '۱۲-ب-۴۵۶-۷۸',
        vehicleVin: 'VIN1234567890',
        vehicleMake: 'پژو',
        vehicleModel: '206',
        vehicleYear: '2020',
        insuredName: 'علی احمدی',
        insuredNationalId: '0123456789',
        insurer: 'بیمه ایران',
        coverage: ['خسارت بدنه', 'خسارت مالی', 'سرقت کلی', 'شکست شیشه'],
        documents: [
          { id: '1', name: 'بیمه‌نامه.pdf', uploadDate: '2024-03-21' },
          { id: '2', name: 'کارشناسی خودرو.jpg', uploadDate: '2024-03-20' },
        ],
        history: [
          { date: '2024-03-21', action: 'صدور', description: 'صدور بیمه‌نامه' },
          { date: '2024-03-20', action: 'ثبت درخواست', description: 'ثبت درخواست بیمه' },
        ],
      };

      setPolicy(mockPolicy);
    } catch (error) {
      console.error('Failed to load policy detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      ACTIVE: 'bg-green-100 text-green-800',
      EXPIRED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
        {status === 'ACTIVE' ? 'فعال' : status === 'EXPIRED' ? 'منقضی' : 'ابطال شده'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-gray-500 text-center">بیمه‌نامه یافت نشد</p>
          <button
            onClick={() => router.push('/portal/policies')}
            className="mt-4 mx-auto block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            بازگشت به لیست
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/portal/policies')}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">جزئیات بیمه‌نامه</h1>
            </div>
            {getStatusBadge(policy.status)}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Policy Information */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">اطلاعات بیمه‌نامه</h2>
              </div>
              <div className="p-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">شماره بیمه‌نامه</dt>
                    <dd className="mt-1 text-sm text-gray-900">{policy.policyNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">محصول</dt>
                    <dd className="mt-1 text-sm text-gray-900">{policy.product}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">تاریخ صدور</dt>
                    <dd className="mt-1 text-sm text-gray-900">{policy.issueDate}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">تاریخ انقضا</dt>
                    <dd className="mt-1 text-sm text-gray-900">{policy.expiryDate}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">حق بیمه</dt>
                    <dd className="mt-1 text-sm text-gray-900">{policy.premium.toLocaleString('fa-IR')} ریال</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">بیمه‌گر</dt>
                    <dd className="mt-1 text-sm text-gray-900">{policy.insurer}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Vehicle Information */}
            {policy.vehiclePlate && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">اطلاعات خودرو</h2>
                </div>
                <div className="p-6">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">پلاک خودرو</dt>
                      <dd className="mt-1 text-sm text-gray-900">{policy.vehiclePlate}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">شماره VIN</dt>
                      <dd className="mt-1 text-sm text-gray-900">{policy.vehicleVin}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">مارک خودرو</dt>
                      <dd className="mt-1 text-sm text-gray-900">{policy.vehicleMake}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">مدل خودرو</dt>
                      <dd className="mt-1 text-sm text-gray-900">{policy.vehicleModel}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">سال ساخت</dt>
                      <dd className="mt-1 text-sm text-gray-900">{policy.vehicleYear}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}

            {/* Coverage */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">پوشش‌های بیمه‌ای</h2>
              </div>
              <div className="p-6">
                <ul className="space-y-2">
                  {policy.coverage.map((item, index) => (
                    <li key={index} className="flex items-center">
                      <svg className="w-5 h-5 text-green-500 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">مدارک پیوست</h2>
              </div>
              <div className="p-6">
                {policy.documents.length === 0 ? (
                  <p className="text-gray-500 text-sm">مدرکی پیوست نشده است</p>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {policy.documents.map((doc) => (
                      <li key={doc.id} className="py-3 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                          <p className="text-xs text-gray-500">{doc.uploadDate}</p>
                        </div>
                        <button className="text-blue-600 hover:text-blue-800 text-sm">
                          دانلود
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* History */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">تاریخچه تغییرات</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {policy.history.map((item, index) => (
                    <div key={index} className="flex">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                      </div>
                      <div className="mr-4">
                        <p className="text-sm font-medium text-gray-900">{item.action}</p>
                        <p className="text-xs text-gray-500">{item.date}</p>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Insured Information */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">اطلاعات بیمه‌گذار</h2>
              </div>
              <div className="p-6">
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">نام</dt>
                    <dd className="mt-1 text-sm text-gray-900">{policy.insuredName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">کد ملی</dt>
                    <dd className="mt-1 text-sm text-gray-900">{policy.insuredNationalId}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">عملیات</h2>
              </div>
              <div className="p-6 space-y-3">
                <button
                  onClick={() => router.push('/portal/claims/new')}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  ثبت خسارت
                </button>
                <button
                  onClick={() => router.push('/portal/payments')}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  پرداخت اقساط
                </button>
                <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                  دانلود بیمه‌نامه
                </button>
                <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                  پرینت
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
