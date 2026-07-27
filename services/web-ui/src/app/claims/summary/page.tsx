'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';

type ClaimsSummary = {
  total: number;
  byStatus: Array<{ status: string; count: number }>;
};

export default function ClaimsSummaryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ClaimsSummary | null>(null);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const perms = enterprisePermissionsForRoles(getAuthUser()?.roles);
  const canViewSummary = hasEnterprisePermission(perms, 'rm:claims:summary');

  useEffect(() => {
    if (!canViewSummary) {
      router.replace('/forbidden');
      return;
    }
    loadSummary();
  }, []);

  async function loadSummary() {
    setLoading(true);
    setError(null);
    const res = await apiFetch<ClaimsSummary>('/rm/claims/summary');
    if (res.success) {
      setSummary(res.data);
    } else {
      setError({ message: res.error.message, correlationId: res.correlationId });
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="p-6">
        <div className="text-sm text-neutral-600">در حال بارگذاری...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <div>خطا: {error.message}</div>
          {error.correlationId ? <div className="mt-1 text-xs">correlationId: {error.correlationId}</div> : null}
        </div>
      </main>
    );
  }

  if (!summary) {
    return (
      <main className="p-6">
        <div className="text-sm text-neutral-600">اطلاعات یافت نشد.</div>
      </main>
    );
  }

  const statusColor: Record<string, string> = {
    registered: 'bg-blue-100 text-blue-700',
    assessed: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-rose-100 text-rose-700',
    paid: 'bg-emerald-100 text-emerald-700',
    closed: 'bg-neutral-100 text-neutral-700',
  };

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">داشبورد خسارت‌ها</h1>
          <p className="mt-1 text-sm text-neutral-600">خلاصه آمار و وضعیت خسارت‌ها</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={loadSummary} className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" disabled={loading}>
            بروزرسانی
          </button>
          <button
            type="button"
            onClick={() => router.push('/claims')}
            className="rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-800"
          >
            لیست خسارت‌ها
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-neutral-600">تعداد کل خسارت‌ها</div>
          <div className="mt-2 text-2xl font-semibold">{summary.total.toLocaleString('fa-IR')}</div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border p-4">
        <h3 className="font-semibold text-sm mb-4">توزیع بر اساس وضعیت</h3>
        {summary.byStatus.length === 0 ? (
          <div className="text-sm text-neutral-600">داده‌ای موجود نیست.</div>
        ) : (
          <div className="space-y-2">
            {summary.byStatus.map((item) => (
              <div key={item.status} className="flex items-center justify-between rounded-xl border p-3">
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[item.status] || 'bg-neutral-100 text-neutral-700'}`}>
                    {item.status}
                  </span>
                </div>
                <div className="text-sm font-semibold">{item.count.toLocaleString('fa-IR')}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
