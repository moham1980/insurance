'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Claim {
  id: string;
  claimNumber: string;
  policyNumber: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID';
  submittedDate: string;
  claimType: string;
  amount: number;
  approvedAmount?: number;
}

export default function CustomerPortalClaims() {
  const router = useRouter();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    try {
      setLoading(true);
      // In a real implementation, fetch from API
      const mockClaims: Claim[] = [
        {
          id: '1',
          claimNumber: 'CLM-2024-001',
          policyNumber: 'POL-2024-001',
          status: 'UNDER_REVIEW',
          submittedDate: '2024-03-10',
          claimType: 'آتش‌سوزی',
          amount: 2000000,
        },
        {
          id: '2',
          claimNumber: 'CLM-2023-002',
          policyNumber: 'POL-2023-003',
          status: 'PAID',
          submittedDate: '2023-11-15',
          claimType: 'سرقت',
          amount: 15000000,
          approvedAmount: 12000000,
        },
        {
          id: '3',
          claimNumber: 'CLM-2023-003',
          policyNumber: 'POL-2023-003',
          status: 'REJECTED',
          submittedDate: '2023-08-20',
          claimType: 'تصادف',
          amount: 5000000,
        },
      ];

      setClaims(mockClaims);
    } catch (error) {
      console.error('Failed to load claims:', error);
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
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/portal')}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">خسارت‌ها</h1>
            </div>
            <button
              onClick={() => router.push('/portal/claims/new')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              ثبت خسارت جدید
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Claims List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : claims.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">خسارتی یافت نشد</p>
                <button
                  onClick={() => router.push('/portal/claims/new')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  ثبت اولین خسارت
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        شماره خسارت
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        شماره بیمه‌نامه
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        نوع خسارت
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        وضعیت
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        تاریخ ثبت
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        مبلغ درخواست
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        مبلغ تأیید شده
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {claims.map((claim) => (
                      <tr
                        key={claim.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/portal/claims/${claim.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {claim.claimNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {claim.policyNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {claim.claimType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(claim.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {claim.submittedDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {claim.amount.toLocaleString('fa-IR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {claim.approvedAmount ? claim.approvedAmount.toLocaleString('fa-IR') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
