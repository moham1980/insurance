'use client';

import { useEffect, useState } from 'react';
import { Umbrella, RefreshCw, Download, Search, AlertCircle, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Button, Card, StatCard } from '@insurance/design-system';
import { MOCK_REINSURANCE_CONTRACTS } from '@/lib/mock-data';

type TreatyRow = {
  treatyId: string;
  treatyNumber: string;
  reinsurerName: string;
  treatyType: string;
  status: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  currency: string;
};

export default function ReinsurancePage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TreatyRow[]>([]);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');

  const [exporting, setExporting] = useState(false);
  const [exportJson, setExportJson] = useState<string>('');

  async function load() {
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    if (q) qs.set('q', q);

    const res = await apiFetch<{ rows: TreatyRow[]; total: number }>(`/re/treaties${qs.toString() ? `?${qs.toString()}` : ''}`);
    if (res.success) setRows(res.data.rows || []);
    else setRows(MOCK_REINSURANCE_CONTRACTS as unknown as TreatyRow[]);

    setLoading(false);
  }

  async function doExport() {
    setExporting(true);
    setError(null);
    setExportJson('');

    const res = await apiFetch<any>('/re/export');
    if (res.success) setExportJson(JSON.stringify(res.data, null, 2));
    else setError({ message: res.error.message, correlationId: res.correlationId });

    setExporting(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusBadge = (s: string) => {
    const cfg: Record<string, { bg: string; text: string; icon: any }> = {
      active: { bg: 'bg-feedback-success-subtle', text: 'text-feedback-success', icon: CheckCircle },
      pending: { bg: 'bg-feedback-warning-subtle', text: 'text-feedback-warning', icon: Clock },
      expired: { bg: 'bg-feedback-error-subtle', text: 'text-feedback-error', icon: XCircle },
    };
    const c = cfg[s] || { bg: 'bg-bg-base', text: 'text-text-secondary', icon: AlertCircle };
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
        <Icon className="w-3 h-3" />
        {s}
      </span>
    );
  };

  const treatyTypeLabel = (t: string) => {
    const labels: Record<string, string> = {
      quota_share: 'سهمی',
      surplus: 'مازاد',
      excess_of_loss: 'مازاد خسارت',
    };
    return labels[t] || t;
  };

  return (
    <main className="p-6 max-w-7xl mx-auto" dir="rtl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
            <Umbrella className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">اتکایی (Reinsurance)</h1>
            <p className="mt-1 text-sm text-text-muted">مدیریت قراردادهای اتکایی و خروجی</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={load} disabled={loading} isLoading={loading}>
            <RefreshCw className="h-4 w-4 ml-1" />
            بروزرسانی
          </Button>
          <Button variant="secondary" size="sm" onClick={doExport} disabled={exporting} isLoading={exporting}>
            <Download className="h-4 w-4 ml-1" />
            {exporting ? 'در حال خروجی...' : 'خروجی'}
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard title="کل قراردادها" value={rows.length} icon={FileText} />
        <StatCard title="فعال" value={rows.filter((r) => r.status === 'active').length} changeType="positive" change="فعال" icon={CheckCircle} />
        <StatCard title="در انتظار" value={rows.filter((r) => r.status === 'pending').length} changeType="warning" change="در انتظار" icon={Clock} />
      </div>

      <Card className="mt-6 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" placeholder="وضعیت" value={status} onChange={(e) => setStatus(e.target.value)} />
          <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" placeholder="جستجو (شماره / نام اتکایی‌گر)" value={q} onChange={(e) => setQ(e.target.value)} />
          <div />
          <Button variant="secondary" onClick={load} disabled={loading}>
            <Search className="h-4 w-4 ml-1" />
            اعمال فیلتر
          </Button>
        </div>
      </Card>

      {error ? (
        <div className="mt-6 rounded-xl border border-feedback-error/30 bg-feedback-error-subtle p-4 text-sm text-feedback-error flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <div>خطا: {error.message}</div>
            {error.correlationId ? <div className="mt-1 text-xs">correlationId: {error.correlationId}</div> : null}
          </div>
        </div>
      ) : null}

      {exportJson ? (
        <Card className="mt-6 p-4">
          <div className="text-sm font-semibold">Export snapshot</div>
          <pre className="mt-3 max-h-[420px] overflow-auto rounded-xl bg-bg-base p-3 text-xs">{exportJson}</pre>
        </Card>
      ) : null}

      <div className="mt-6 space-y-3">
        {rows.map((t) => (
          <Card key={t.treatyId} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold">{t.treatyNumber}</div>
                  {statusBadge(t.status)}
                </div>
                <div className="mt-1 text-xs text-text-muted">اتکایی‌گر: {t.reinsurerName} | نوع: {treatyTypeLabel(t.treatyType)}</div>
                <div className="mt-1 text-xs text-text-muted">treatyId: {t.treatyId}</div>
                <div className="mt-1 text-xs text-text-muted">اعتبار: {t.effectiveFrom} → {t.effectiveTo || '—'} | ارز: {t.currency}</div>
              </div>
            </div>
          </Card>
        ))}
        {!loading && rows.length === 0 ? <div className="text-sm text-text-muted text-center py-8">موردی یافت نشد.</div> : null}
      </div>
    </main>
  );
}
