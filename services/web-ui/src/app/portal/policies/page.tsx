'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Loader2, FileText } from 'lucide-react';
import { Card } from '@insurance/design-system';
import { apiFetch } from '@/lib/api';

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

const MOCK_POLICIES: Policy[] = [
  { id: '1', policyNumber: 'POL-2024-001', product: 'بدنه خودرو', status: 'ACTIVE', issueDate: '2024-03-21', expiryDate: '2025-03-21', premium: 5000000, vehiclePlate: '۱۲-ب-۴۵۶-۷۸', vehicleVin: 'VIN1234567890' },
  { id: '2', policyNumber: 'POL-2024-002', product: 'شخص ثالث', status: 'ACTIVE', issueDate: '2024-03-15', expiryDate: '2024-12-15', premium: 3000000, vehiclePlate: '۱۲-ب-۴۵۶-۷۸', vehicleVin: 'VIN1234567890' },
  { id: '3', policyNumber: 'POL-2023-003', product: 'بدنه خودرو', status: 'EXPIRED', issueDate: '2023-03-21', expiryDate: '2024-03-21', premium: 4500000, vehiclePlate: '۱۲-ب-۱۲۳-۴۵', vehicleVin: 'VIN0987654321' },
];

export default function CustomerPortalPolicies() {
  const router = useRouter();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPolicies();
  }, [filter]);

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<Policy[]>('/portal/policies');
      const all = res.success && res.data ? res.data : MOCK_POLICIES;
      setPolicies(filter === 'ALL' ? all : all.filter(p => p.status === filter));
    } catch {
      setPolicies(filter === 'ALL' ? MOCK_POLICIES : MOCK_POLICIES.filter(p => p.status === filter));
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      ACTIVE: 'bg-feedback-success-subtle text-feedback-success',
      EXPIRED: 'bg-feedback-error-subtle text-feedback-error',
      CANCELLED: 'bg-bg-base text-text-primary',
    };
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
        {status === 'ACTIVE' ? 'فعال' : status === 'EXPIRED' ? 'منقضی' : 'ابطال شده'}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-bg-base" dir="rtl">
      <div className="border-b border-border-default bg-bg-raised">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/portal')} className="text-text-muted hover:text-text-primary">
                <ChevronRight className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-bold text-text-primary">بیمه‌نامه‌ها</h1>
            </div>
            <button onClick={() => router.push('/portal')} className="text-sm text-text-muted hover:text-text-primary">
              بازگشت به داشبورد
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Filter Tabs */}
        <Card>
          <div className="border-b border-border-default">
            <nav className="flex space-x-8 space-x-reverse" aria-label="Tabs">
              {(['ALL', 'ACTIVE', 'EXPIRED', 'CANCELLED'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`${
                    filter === tab
                      ? 'border-brand-primary text-brand-primary'
                      : 'border-transparent text-text-muted hover:text-text-secondary hover:border-border-default'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  {tab === 'ALL' ? 'همه' : tab === 'ACTIVE' ? 'فعال' : tab === 'EXPIRED' ? 'منقضی' : 'ابطال شده'}
                </button>
              ))}
            </nav>
          </div>
        </Card>

        {/* Policies List */}
        <Card className="overflow-hidden">
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
              </div>
            ) : policies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-10 w-10 text-text-muted" />
                <p className="mt-2 text-sm text-text-muted">بیمه‌نامه‌ای یافت نشد</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border-default">
                  <thead className="bg-bg-base">
                    <tr>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">شماره بیمه‌نامه</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">محصول</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">وضعیت</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">تاریخ صدور</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">تاریخ انقضا</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">حق بیمه</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">پلاک خودرو</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {policies.map((policy) => (
                      <tr
                        key={policy.id}
                        className="cursor-pointer hover:bg-bg-base"
                        onClick={() => router.push(`/portal/policies/${policy.id}`)}
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-text-primary">{policy.policyNumber}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-text-secondary">{policy.product}</td>
                        <td className="whitespace-nowrap px-4 py-3">{getStatusBadge(policy.status)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-text-muted">{policy.issueDate}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-text-muted">{policy.expiryDate}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-text-muted">{policy.premium.toLocaleString('fa-IR')}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-text-muted">{policy.vehiclePlate || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
