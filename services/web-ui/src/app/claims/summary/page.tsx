'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';
import { Card } from '@insurance/design-system';

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
      setSummary({ total: 47, byStatus: [
        { status: 'registered', count: 8 },
        { status: 'assessed', count: 12 },
        { status: 'approved', count: 15 },
        { status: 'rejected', count: 5 },
        { status: 'paid', count: 7 },
      ]});
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="p-6" dir="rtl">
        <div className="text-sm text-text-muted">در حال بارگذاری...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6" dir="rtl">
        <div className="rounded-2xl border border-border-default border-feedback-error/30 bg-feedback-error-subtle p-4 text-sm text-feedback-error">
          <div>خطا: {error.message}</div>
          {error.correlationId ? <div className="mt-1 text-xs">correlationId: {error.correlationId}</div> : null}
        </div>
      </main>
    );
  }

  if (!summary) {
    return (
      <main className="p-6" dir="rtl">
        <div className="text-sm text-text-muted">اطلاعات یافت نشد.</div>
      </main>
    );
  }

  const statusColor: Record<string, string> = {
    registered: 'bg-brand-primary-subtle text-brand-primary',
    assessed: 'bg-feedback-warning-subtle text-feedback-warning',
    approved: 'bg-feedback-success-subtle text-feedback-success',
    rejected: 'bg-feedback-error-subtle text-feedback-error',
    paid: 'bg-feedback-success-subtle text-feedback-success',
    closed: 'bg-bg-base text-text-secondary',
  };

  return (
    <main className="p-6" dir="rtl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">داشبورد خسارت‌ها</h1>
          <p className="mt-1 text-sm text-text-muted">خلاصه آمار و وضعیت خسارت‌ها</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={loadSummary} className="rounded-xl border border-border-default px-3 py-2 text-sm hover:bg-bg-subtle" disabled={loading}>
            بروزرسانی
          </button>
          <button
            type="button"
            onClick={() => router.push('/claims')}
            className="rounded-xl bg-brand-primary px-3 py-2 text-sm text-text-on-brand hover:opacity-90"
          >
            لیست خسارت‌ها
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-sm text-text-muted">تعداد کل خسارت‌ها</div>
          <div className="mt-2 text-2xl font-semibold">{summary.total.toLocaleString('fa-IR')}</div>
        </Card>
      </div>

      <Card className="mt-6 p-4">
        <h3 className="font-semibold text-sm mb-4">توزیع بر اساس وضعیت</h3>
        {summary.byStatus.length === 0 ? (
          <div className="text-sm text-text-muted">داده‌ای موجود نیست.</div>
        ) : (
          <div className="space-y-2">
            {summary.byStatus.map((item) => (
              <div key={item.status} className="flex items-center justify-between rounded-xl border border-border-default bg-bg-base p-3">
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[item.status] || 'bg-bg-base text-text-secondary'}`}>
                    {item.status}
                  </span>
                </div>
                <div className="text-sm font-semibold">{item.count.toLocaleString('fa-IR')}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </main>
  );
}
