'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

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
    else setError({ message: res.error.message, correlationId: res.correlationId });

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

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">اتکایی (Reinsurance)</h1>
          <p className="mt-1 text-sm text-neutral-600">Treaties + Export</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" disabled={loading}>
            بروزرسانی
          </button>
          <button type="button" onClick={doExport} className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" disabled={exporting}>
            {exporting ? 'در حال خروجی...' : 'Export'}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <input className="rounded-xl border px-3 py-2" placeholder="status" value={status} onChange={(e) => setStatus(e.target.value)} />
        <input className="rounded-xl border px-3 py-2" placeholder="q (treatyNumber / reinsurerName)" value={q} onChange={(e) => setQ(e.target.value)} />
        <div />
        <button type="button" className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" onClick={load} disabled={loading}>
          اعمال فیلتر
        </button>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <div>خطا: {error.message}</div>
          {error.correlationId ? <div className="mt-1 text-xs">correlationId: {error.correlationId}</div> : null}
        </div>
      ) : null}

      {exportJson ? (
        <div className="mt-6 rounded-2xl border bg-white p-4">
          <div className="text-sm font-semibold">Export snapshot</div>
          <pre className="mt-3 max-h-[420px] overflow-auto rounded-xl bg-neutral-900 p-3 text-xs text-neutral-100">{exportJson}</pre>
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {rows.map((t) => (
          <div key={t.treatyId} className="rounded-2xl border p-4">
            <div className="text-sm font-semibold">{t.treatyNumber}</div>
            <div className="mt-1 text-xs text-neutral-600">reinsurer: {t.reinsurerName} | type: {t.treatyType} | status: {t.status}</div>
            <div className="mt-1 text-xs text-neutral-600">treatyId: {t.treatyId}</div>
            <div className="mt-1 text-xs text-neutral-600">effective: {t.effectiveFrom} → {t.effectiveTo || '—'} | currency: {t.currency}</div>
          </div>
        ))}
        {!loading && rows.length === 0 ? <div className="text-sm text-neutral-600">موردی یافت نشد.</div> : null}
      </div>
    </main>
  );
}
