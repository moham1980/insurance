'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, AlertCircle, CreditCard, Wallet, FileText, PlusCircle, MessageSquare, LogOut, Loader2, ChevronLeft } from 'lucide-react';
import { Card, StatCard } from '@insurance/design-system';
import { apiFetch } from '@/lib/api';

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

const MOCK_STATS: DashboardStats = {
  activePolicies: 3,
  pendingClaims: 1,
  overduePayments: 0,
  totalPremium: 15000000,
};

const MOCK_POLICIES: Policy[] = [
  { id: '1', policyNumber: 'POL-2024-001', product: 'بدنه خودرو', status: 'ACTIVE', expiryDate: '2025-03-21', premium: 5000000 },
  { id: '2', policyNumber: 'POL-2024-002', product: 'شخص ثالث', status: 'ACTIVE', expiryDate: '2024-12-15', premium: 3000000 },
];

const MOCK_CLAIMS: Claim[] = [
  { id: '1', claimNumber: 'CLM-2024-001', status: 'UNDER_REVIEW', submittedDate: '2024-03-10', amount: 2000000 },
];

const statusBadgeClass: Record<string, string> = {
  ACTIVE: 'bg-feedback-success-subtle text-feedback-success',
  UNDER_REVIEW: 'bg-feedback-warning-subtle text-feedback-warning',
  PENDING: 'bg-feedback-warning-subtle text-feedback-warning',
  PAID: 'bg-feedback-success-subtle text-feedback-success',
  REJECTED: 'bg-feedback-error-subtle text-feedback-error',
};

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
      const [statsRes, policiesRes, claimsRes] = await Promise.all([
        apiFetch<DashboardStats>('/portal/dashboard'),
        apiFetch<Policy[]>('/portal/policies?limit=5'),
        apiFetch<Claim[]>('/portal/claims?limit=5'),
      ]);

      setStats(statsRes.success && statsRes.data ? statsRes.data : MOCK_STATS);
      setRecentPolicies(policiesRes.success && policiesRes.data ? policiesRes.data : MOCK_POLICIES);
      setRecentClaims(claimsRes.success && claimsRes.data ? claimsRes.data : MOCK_CLAIMS);
    } catch {
      setStats(MOCK_STATS);
      setRecentPolicies(MOCK_POLICIES);
      setRecentClaims(MOCK_CLAIMS);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-base">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base" dir="rtl">
      <div className="border-b border-border-default bg-bg-raised">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-xl font-bold text-text-primary">پورتال مشتریان</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-text-muted">خوش آمدید</span>
              <button
                onClick={() => router.push('/login')}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-feedback-error hover:bg-feedback-error-subtle"
              >
                <LogOut className="h-4 w-4" />
                خروج
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="بیمه‌نامه‌های فعال"
            value={stats?.activePolicies ?? 0}
            icon={ShieldCheck}
          />
          <StatCard
            title="خسارت‌های جاری"
            value={stats?.pendingClaims ?? 0}
            icon={AlertCircle}
          />
          <StatCard
            title="اقساط سررسید"
            value={stats?.overduePayments ?? 0}
            icon={CreditCard}
          />
          <StatCard
            title="کل حق بیمه"
            value={(stats?.totalPremium ?? 0).toLocaleString('fa-IR')}
            icon={Wallet}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => router.push('/portal/policies')}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-3 text-sm font-medium text-text-on-brand transition hover:opacity-90"
          >
            <FileText className="h-5 w-5" />
            بیمه‌نامه‌ها
          </button>
          <button
            onClick={() => router.push('/portal/claims/new')}
            className="flex items-center justify-center gap-2 rounded-xl bg-feedback-success px-4 py-3 text-sm font-medium text-text-on-brand transition hover:opacity-90"
          >
            <PlusCircle className="h-5 w-5" />
            ثبت خسارت
          </button>
          <button
            onClick={() => router.push('/portal/payments')}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-secondary px-4 py-3 text-sm font-medium text-text-on-brand transition hover:opacity-90"
          >
            <CreditCard className="h-5 w-5" />
            پرداخت‌ها
          </button>
          <button
            onClick={() => router.push('/portal/complaints')}
            className="flex items-center justify-center gap-2 rounded-xl bg-feedback-warning px-4 py-3 text-sm font-medium text-text-on-brand transition hover:opacity-90"
          >
            <MessageSquare className="h-5 w-5" />
            شکایات
          </button>
        </div>

        {/* Recent Policies */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border-default px-6 py-4">
            <h2 className="text-base font-semibold text-text-primary">بیمه‌نامه‌های اخیر</h2>
            <button onClick={() => router.push('/portal/policies')} className="flex items-center gap-1 text-sm text-brand-primary hover:underline">
              مشاهده همه <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
          <div className="p-6">
            {recentPolicies.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-muted">بیمه‌نامه‌ای یافت نشد</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border-default">
                  <thead className="bg-bg-base">
                    <tr>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">شماره بیمه‌نامه</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">محصول</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">وضعیت</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">تاریخ انقضا</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">حق بیمه</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {recentPolicies.map((policy) => (
                      <tr
                        key={policy.id}
                        className="cursor-pointer hover:bg-bg-base"
                        onClick={() => router.push(`/portal/policies/${policy.id}`)}
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-text-primary">{policy.policyNumber}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-text-secondary">{policy.product}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass[policy.status] || 'bg-bg-base text-text-secondary'}`}>
                            {policy.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-text-muted">{policy.expiryDate}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-text-muted">{policy.premium.toLocaleString('fa-IR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>

        {/* Recent Claims */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border-default px-6 py-4">
            <h2 className="text-base font-semibold text-text-primary">خسارت‌های اخیر</h2>
            <button onClick={() => router.push('/portal/claims')} className="flex items-center gap-1 text-sm text-brand-primary hover:underline">
              مشاهده همه <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
          <div className="p-6">
            {recentClaims.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-muted">خسارتی یافت نشد</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border-default">
                  <thead className="bg-bg-base">
                    <tr>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">شماره خسارت</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">وضعیت</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">تاریخ ثبت</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">مبلغ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {recentClaims.map((claim) => (
                      <tr
                        key={claim.id}
                        className="cursor-pointer hover:bg-bg-base"
                        onClick={() => router.push(`/portal/claims/${claim.id}`)}
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-text-primary">{claim.claimNumber}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass[claim.status] || 'bg-feedback-warning-subtle text-feedback-warning'}`}>
                            {claim.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-text-muted">{claim.submittedDate}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-text-muted">{claim.amount.toLocaleString('fa-IR')}</td>
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
