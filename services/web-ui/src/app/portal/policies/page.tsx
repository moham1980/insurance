'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Policy {
  id: string;
  policyNumber: string;
  product: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  issueDate: string;
  expiryDate: string;
  premium: number;
  vehiclePlate?: string;
  vehicleVin?: string;
}

export default function CustomerPortalPolicies() {
  const router = useRouter();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPolicies();
  }, [filter]);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      // In a real implementation, fetch from API
      const mockPolicies: Policy[] = [
        {
          id: '1',
          policyNumber: 'POL-2024-001',
          product: 'بدنه خودرو',
          status: 'ACTIVE',
          issueDate: '2024-03-21',
          expiryDate: '2025-03-21',
          premium: 5000000,
          vehiclePlate: '۱۲-ب-۴۵۶-۷۸',
          vehicleVin: 'VIN1234567890',
        },
        {
          id: '2',
          policyNumber: 'POL-2024-002',
          product: 'شخص ثالث',
          status: 'ACTIVE',
          issueDate: '2024-03-15',
          expiryDate: '2024-12-15',
          premium: 3000000,
          vehiclePlate: '۱۲-ب-۴۵۶-۷۸',
          vehicleVin: 'VIN1234567890',
        },
        {
          id: '3',
          policyNumber: 'POL-2023-003',
          product: 'بدنه خودرو',
          status: 'EXPIRED',
          issueDate: '2023-03-21',
          expiryDate: '2024-03-21',
          premium: 4500000,
          vehiclePlate: '۱۲-ب-۱۲۳-۴۵',
          vehicleVin: 'VIN0987654321',
        },
      ];

      const filteredPolicies = filter === 'ALL' 
        ? mockPolicies 
        : mockPolicies.filter(p => p.status === filter);

      setPolicies(filteredPolicies);
    } catch (error) {
      console.error('Failed to load policies:', error);
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
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
        {status === 'ACTIVE' ? 'فعال' : status === 'EXPIRED' ? 'منقضی' : 'ابطال شده'}
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
              <h1 className="text-2xl font-bold text-gray-900">بیمه‌نامه‌ها</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/portal')}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                بازگشت به داشبورد
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 space-x-reverse" aria-label="Tabs">
              {(['ALL', 'ACTIVE', 'EXPIRED', 'CANCELLED'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`${
                    filter === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  {tab === 'ALL' ? 'همه' : tab === 'ACTIVE' ? 'فعال' : tab === 'EXPIRED' ? 'منقضی' : 'ابطال شده'}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Policies List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : policies.length === 0 ? (
              <p className="text-gray-500 text-center py-12">بیمه‌نامه‌ای یافت نشد</p>
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
                        تاریخ صدور
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        تاریخ انقضا
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        حق بیمه
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        پلاک خودرو
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {policies.map((policy) => (
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
                          {getStatusBadge(policy.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {policy.issueDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {policy.expiryDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {policy.premium.toLocaleString('fa-IR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {policy.vehiclePlate || '-'}
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
