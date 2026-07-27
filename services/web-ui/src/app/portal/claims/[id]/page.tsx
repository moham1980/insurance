'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface ClaimDetail {
  id: string;
  claimNumber: string;
  policyNumber: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID';
  submittedDate: string;
  claimType: string;
  amount: number;
  approvedAmount?: number;
  incidentDate: string;
  incidentTime: string;
  location: string;
  description: string;
  contactPhone: string;
  documents: Array<{
    id: string;
    name: string;
    uploadDate: string;
  }>;
  timeline: Array<{
    date: string;
    status: string;
    description: string;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    paymentDate: string;
    reference: string;
  }>;
}

export default function ClaimDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params?.id) {
      loadClaimDetail();
    }
  }, [params?.id]);

  const loadClaimDetail = async () => {
    try {
      setLoading(true);
      // In a real implementation, fetch from API
      const mockClaim: ClaimDetail = {
        id: Array.isArray(params?.id) ? params.id[0] : params?.id || 'unknown',
        claimNumber: 'CLM-2024-001',
        policyNumber: 'POL-2024-001',
        status: 'UNDER_REVIEW',
        submittedDate: '2024-03-10',
        claimType: 'آتش‌سوزی',
        amount: 2000000,
        incidentDate: '2024-03-09',
        incidentTime: '14:30',
        location: 'تهران، خیابان ولیعصر، پلاک ۱۲۳',
        description: 'آتش‌سوزی ناشی از اتصال برق در موتور خودرو',
        contactPhone: '09121234567',
        documents: [
          { id: '1', name: 'عکس خودرو.jpg', uploadDate: '2024-03-10' },
          { id: '2', name: 'گزارش آتش‌نشانی.pdf', uploadDate: '2024-03-10' },
        ],
        timeline: [
          { date: '2024-03-10', status: 'ثبت شده', description: 'ثبت اولیه خسارت' },
          { date: '2024-03-11', status: 'در حال بررسی', description: 'ارسال به کارشناس' },
          { date: '2024-03-12', status: 'در حال بررسی', description: 'در انتظار تأیید مدیر' },
        ],
        payments: [],
      };

      setClaim(mockClaim);
    } catch (error) {
      console.error('Failed to load claim detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      SUBMITTED: 'bg-blue-100 text-blue-800',
      UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      PAID: 'bg-green-100 text-green-800',
    };
    const labels = {
      SUBMITTED: 'ثبت شده',
      UNDER_REVIEW: 'در حال بررسی',
      APPROVED: 'تأیید شده',
      REJECTED: 'رد شده',
      PAID: 'پرداخت شده',
    };
    return (
      <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
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

  if (!claim) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-gray-500 text-center">خسارت یافت نشد</p>
          <button
            onClick={() => router.push('/portal/claims')}
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
                onClick={() => router.push('/portal/claims')}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">جزئیات خسارت</h1>
            </div>
            {getStatusBadge(claim.status)}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Claim Information */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">اطلاعات خسارت</h2>
              </div>
              <div className="p-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">شماره خسارت</dt>
                    <dd className="mt-1 text-sm text-gray-900">{claim.claimNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">شماره بیمه‌نامه</dt>
                    <dd className="mt-1 text-sm text-gray-900">{claim.policyNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">نوع خسارت</dt>
                    <dd className="mt-1 text-sm text-gray-900">{claim.claimType}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">تاریخ ثبت</dt>
                    <dd className="mt-1 text-sm text-gray-900">{claim.submittedDate}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">مبلغ درخواست</dt>
                    <dd className="mt-1 text-sm text-gray-900">{claim.amount.toLocaleString('fa-IR')} ریال</dd>
                  </div>
                  {claim.approvedAmount && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">مبلغ تأیید شده</dt>
                      <dd className="mt-1 text-sm text-gray-900">{claim.approvedAmount.toLocaleString('fa-IR')} ریال</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Incident Details */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">جزئیات وقوع</h2>
              </div>
              <div className="p-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">تاریخ وقوع</dt>
                    <dd className="mt-1 text-sm text-gray-900">{claim.incidentDate}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">ساعت وقوع</dt>
                    <dd className="mt-1 text-sm text-gray-900">{claim.incidentTime}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">مکان وقوع</dt>
                    <dd className="mt-1 text-sm text-gray-900">{claim.location}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">شرح خسارت</dt>
                    <dd className="mt-1 text-sm text-gray-900">{claim.description}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">شماره تماس</dt>
                    <dd className="mt-1 text-sm text-gray-900">{claim.contactPhone}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">مدارک پیوست</h2>
              </div>
              <div className="p-6">
                {claim.documents.length === 0 ? (
                  <p className="text-gray-500 text-sm">مدرکی پیوست نشده است</p>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {claim.documents.map((doc) => (
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

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">تاریخچه</h2>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  {claim.timeline.map((item, index) => (
                    <div key={index} className="flex">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                      </div>
                      <div className="mr-4">
                        <p className="text-sm font-medium text-gray-900">{item.status}</p>
                        <p className="text-xs text-gray-500">{item.date}</p>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Payments */}
            {claim.payments.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">پرداخت‌ها</h2>
                </div>
                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            مبلغ
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            تاریخ پرداخت
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            کد پیگیری
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {claim.payments.map((payment) => (
                          <tr key={payment.id}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                              {payment.amount.toLocaleString('fa-IR')}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                              {payment.paymentDate}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                              {payment.reference}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">وضعیت فعلی</h2>
              </div>
              <div className="p-6">
                <div className="text-center">
                  {getStatusBadge(claim.status)}
                  <p className="mt-2 text-sm text-gray-500">
                    {claim.status === 'UNDER_REVIEW' && 'خسارت شما در حال بررسی است'}
                    {claim.status === 'APPROVED' && 'خسارت تأیید شده است'}
                    {claim.status === 'REJECTED' && 'خسارت رد شده است'}
                    {claim.status === 'PAID' && 'خسارت پرداخت شده است'}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">عملیات</h2>
              </div>
              <div className="p-6 space-y-3">
                <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                  دانلود گزارش
                </button>
                <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                  پرینت
                </button>
                {claim.status === 'UNDER_REVIEW' && (
                  <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                    پیگیری
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
