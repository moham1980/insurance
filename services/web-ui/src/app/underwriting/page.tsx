'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';

type RequestRow = {
  requestId: string;
  policyId: string;
  status: string;
  riskScore?: number | null;
  riskLevel?: string | null;
  assignedUnderwriterId?: string | null;
  dueDate?: string | null;
  decision?: string | null;
  createdAt: string;
  insuredName?: string;
  product?: string;
  premium?: number;
};

type DashboardStats = {
  totalRequests: number;
  pending: number;
  inReview: number;
  approved: number;
  rejected: number;
  escalated: number;
  avgRiskScore: number;
  highRiskCount: number;
};

export default function UnderwritingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const authUser = getAuthUser();
    if (!authUser) { router.push('/login'); return; }
    const perms = enterprisePermissionsForRoles(authUser.roles || []);
    if (!hasEnterprisePermission(perms, 'underwriting:view')) { router.push('/forbidden'); return; }
    fetchData();
    fetchStats();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (riskFilter) params.append('riskLevel', riskFilter);
      const url = `/underwriting/requests${params.toString() ? '?' + params.toString() : ''}`;
      const res = await apiFetch<RequestRow[]>(url);
      if (res.success) setRows(res.data || []);
      else setError(res.error?.message || 'خطا در دریافت داده‌ها');
    } catch (e: any) {
      setError(e?.message || 'خطا در ارتباط با سرور');
    } finally { setLoading(false); }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await apiFetch<DashboardStats>('/underwriting/stats');
      if (res.success) setStats(res.data);
    } catch (e: any) {
      console.error('Failed to fetch stats:', e);
    } finally { setStatsLoading(false); }
  };

  const filteredRows = rows.filter(r => {
    const s = search.trim();
    if (!s) return true;
    return r.requestId.includes(s) || r.policyId.includes(s) || (r.insuredName && r.insuredName.includes(s));
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_review: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      escalated: 'bg-purple-100 text-purple-800',
    };
    const labels = {
      pending: 'در انتظار',
      in_review: 'در حال بررسی',
      approved: 'تأیید شده',
      rejected: 'رد شده',
      escalated: 'ارجاع شده',
    };
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const getRiskBadge = (riskLevel?: string | null) => {
    if (!riskLevel) return '-';
    const styles = {
      LOW: 'bg-green-100 text-green-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-red-100 text-red-800',
      CRITICAL: 'bg-red-900 text-white',
    };
    const labels = {
      LOW: 'کم',
      MEDIUM: 'متوسط',
      HIGH: 'زیاد',
      CRITICAL: 'بحرانی',
    };
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[riskLevel as keyof typeof styles]}`}>
        {labels[riskLevel as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Underwriting</h1>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                بازگشت به داشبورد
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Stats */}
        {!statsLoading && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-500">کل درخواست‌ها</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalRequests}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-500">در انتظار بررسی</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.pending + stats.inReview}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-500">تأیید شده</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.approved}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-500">ریسک بالا</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.highRiskCount}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="جستجو بر اساس شناسه، بیمه‌نامه یا نام بیمه‌گذار"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); fetchData(); }}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">همه وضعیت‌ها</option>
                  <option value="pending">در انتظار</option>
                  <option value="in_review">در حال بررسی</option>
                  <option value="approved">تأیید شده</option>
                  <option value="rejected">رد شده</option>
                  <option value="escalated">ارجاع شده</option>
                </select>
              </div>
              <div>
                <select
                  value={riskFilter}
                  onChange={e => { setRiskFilter(e.target.value); fetchData(); }}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">همه سطوح ریسک</option>
                  <option value="LOW">کم</option>
                  <option value="MEDIUM">متوسط</option>
                  <option value="HIGH">زیاد</option>
                  <option value="CRITICAL">بحرانی</option>
                </select>
              </div>
              <button
                onClick={fetchData}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                بروزرسانی
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Requests Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      شناسه درخواست
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      بیمه‌نامه
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      بیمه‌گذار
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      محصول
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      وضعیت
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      سطح ریسک
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      امتیاز ریسک
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      تاریخ ایجاد
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      عملیات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                        در حال بارگذاری...
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                        موردی یافت نشد
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map(r => (
                      <tr key={r.requestId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {r.requestId.slice(0, 12)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                          {r.policyId.slice(0, 12)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {r.insuredName || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {r.product || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(r.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getRiskBadge(r.riskLevel)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {r.riskScore ? r.riskScore.toFixed(2) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(r.createdAt).toLocaleDateString('fa-IR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => router.push(`/underwriting/${r.requestId}`)}
                            className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                          >
                            جزئیات
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
