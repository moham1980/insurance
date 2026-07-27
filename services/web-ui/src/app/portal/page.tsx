'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  activePolicies: number;
  pendingClaims: number;
  overduePayments: number;
  totalPremium: number;
}

interface Policy {
  id: string;
  policyNumber: string;
  product: string;
  status: string;
  expiryDate: string;
  premium: number;
}

interface Claim {
  id: string;
  claimNumber: string;
  status: string;
  submittedDate: string;
  amount: number;
}

export default function CustomerPortalDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentPolicies, setRecentPolicies] = useState<Policy[]>([]);
  const [recentClaims, setRecentClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // In a real implementation, fetch from API
      const mockStats: DashboardStats = {
        activePolicies: 3,
        pendingClaims: 1,
        overduePayments: 0,
        totalPremium: 15000000,
      };
      
      const mockPolicies: Policy[] = [
        {
          id: '1',
          policyNumber: 'POL-2024-001',
          product: 'بدنه خودرو',
          status: 'ACTIVE',
          expiryDate: '2025-03-21',
          premium: 5000000,
        },
        {
          id: '2',
          policyNumber: 'POL-2024-002',
          product: 'شخص ثالث',
          status: 'ACTIVE',
          expiryDate: '2024-12-15',
          premium: 3000000,
        },
      ];

      const mockClaims: Claim[] = [
        {
          id: '1',
          claimNumber: 'CLM-2024-001',
          status: 'UNDER_REVIEW',
          submittedDate: '2024-03-10',
          amount: 2000000,
        },
      ];

      setStats(mockStats);
      setRecentPolicies(mockPolicies);
      setRecentClaims(mockClaims);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">پرتال مشتریان</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">خوش آمدید</span>
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-700"
              >
                خروج
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-500">بیمه‌نامه‌های فعال</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.activePolicies}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-500">خسارت‌های جاری</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.pendingClaims}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-500">اقساط سررسید</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.overduePayments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-500">کل حق بیمه</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats?.totalPremium?.toLocaleString('fa-IR')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => router.push('/portal/policies')}
            className="bg-blue-600 text-white rounded-lg p-4 hover:bg-blue-700 transition"
          >
            <div className="flex items-center justify-center">
              <svg className="w-6 h-6 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>بیمه‌نامه‌ها</span>
            </div>
          </button>

          <button
            onClick={() => router.push('/portal/claims/new')}
            className="bg-green-600 text-white rounded-lg p-4 hover:bg-green-700 transition"
          >
            <div className="flex items-center justify-center">
              <svg className="w-6 h-6 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>ثبت خسارت</span>
            </div>
          </button>

          <button
            onClick={() => router.push('/portal/payments')}
            className="bg-purple-600 text-white rounded-lg p-4 hover:bg-purple-700 transition"
          >
            <div className="flex items-center justify-center">
              <svg className="w-6 h-6 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span>پرداخت‌ها</span>
            </div>
          </button>

          <button
            onClick={() => router.push('/portal/complaints')}
            className="bg-orange-600 text-white rounded-lg p-4 hover:bg-orange-700 transition"
          >
            <div className="flex items-center justify-center">
              <svg className="w-6 h-6 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span>شکایات</span>
            </div>
          </button>
        </div>

        {/* Recent Policies */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">بیمه‌نامه‌های اخیر</h2>
          </div>
          <div className="p-6">
            {recentPolicies.length === 0 ? (
              <p className="text-gray-500 text-center py-4">بیمه‌نامه‌ای یافت نشد</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        شماره بیمه‌نامه
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        محصول
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        وضعیت
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        تاریخ انقضا
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        حق بیمه
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentPolicies.map((policy) => (
                      <tr
                        key={policy.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/portal/policies/${policy.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {policy.policyNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {policy.product}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {policy.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {policy.expiryDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {policy.premium.toLocaleString('fa-IR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Recent Claims */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">خسارت‌های اخیر</h2>
          </div>
          <div className="p-6">
            {recentClaims.length === 0 ? (
              <p className="text-gray-500 text-center py-4">خسارتی یافت نشد</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        شماره خسارت
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        وضعیت
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        تاریخ ثبت
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        مبلغ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentClaims.map((claim) => (
                      <tr
                        key={claim.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/portal/claims/${claim.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {claim.claimNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            {claim.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {claim.submittedDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {claim.amount.toLocaleString('fa-IR')}
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
