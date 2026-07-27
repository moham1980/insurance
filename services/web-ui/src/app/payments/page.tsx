'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';

type Row = {
  paymentIntentId: string;
  claimId: string;
  amount: number;
  currency: string;
  status: string;
};

export default function PaymentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const [claimId, setClaimId] = useState('');
  const [status, setStatus] = useState('');

  const [prepareClaimId, setPrepareClaimId] = useState('');
  const [prepareAmount, setPrepareAmount] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');

  const [busy, setBusy] = useState<string | null>(null);

  const perms = enterprisePermissionsForRoles(getAuthUser()?.roles);
  const canList = hasEnterprisePermission(perms, 'payments:list');
  const canPrepare = hasEnterprisePermission(perms, 'payments:prepare');
  const canApprove = hasEnterprisePermission(perms, 'payments:approve');
  const canExecute = hasEnterprisePermission(perms, 'payments:execute');
  const canFail = hasEnterprisePermission(perms, 'payments:fail');
  const canNotify = hasEnterprisePermission(perms, 'payments:notify');

  async function load() {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    if (claimId) qs.set('claimId', claimId);
    if (status) qs.set('status', status);
    const res = await apiFetch<Row[]>(`/payments${qs.toString() ? `?${qs.toString()}` : ''}`);
    if (res.success) setRows(res.data);
    else setError({ message: res.error.message, correlationId: res.correlationId });
    setLoading(false);
  }

  useEffect(() => {
    if (!canList) {
      router.replace('/forbidden');
      return;
    }
    if (!idempotencyKey) setIdempotencyKey(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function prepare() {
    setBusy('prepare');
    setError(null);
    const res = await apiFetch('/payments/prepare', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idempotencyKey, claimId: prepareClaimId, amount: Number(prepareAmount) }),
    });
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    setBusy(null);
    await load();
  }

  async function act(paymentIntentId: string, action: 'approve' | 'execute' | 'notify') {
    setBusy(paymentIntentId);
    setError(null);
    const res = await apiFetch(`/payments/${encodeURIComponent(paymentIntentId)}/${action}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(
        action === 'execute'
          ? { provider: 'manual', providerRef: String(Date.now()) }
          : action === 'notify'
            ? { channel: 'sms', details: { by: 'console' } }
            : { decisionNotes: 'Approved via console' }
      ),
    });
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    setBusy(null);
    await load();
  }

  async function fail(paymentIntentId: string) {
    setBusy(paymentIntentId);
    setError(null);
    const res = await apiFetch(`/payments/${encodeURIComponent(paymentIntentId)}/fail`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reasonCode: 'MANUAL_FAIL', reasonMessage: 'Failed via console' }),
    });
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    setBusy(null);
    await load();
  }

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">پرداخت‌ها</h1>
          <p className="mt-1 text-sm text-neutral-600">لیست و آماده‌سازی پرداخت خسارت</p>
        </div>
        <button type="button" onClick={load} className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" disabled={loading}>
          بروزرسانی
        </button>
      </div>

      <div className="mt-6 rounded-2xl border p-4">
        <div className="text-sm font-semibold">آماده‌سازی</div>
        <div className="mt-3 grid gap-3 md:grid-cols-6">
          <input className="rounded-xl border px-3 py-2 md:col-span-2" placeholder="Claim ID" value={prepareClaimId} onChange={(e) => setPrepareClaimId(e.target.value)} />
          <input className="rounded-xl border px-3 py-2" placeholder="Amount" value={prepareAmount} onChange={(e) => setPrepareAmount(e.target.value)} />
          <input className="rounded-xl border px-3 py-2 md:col-span-3" placeholder="Idempotency Key" value={idempotencyKey} onChange={(e) => setIdempotencyKey(e.target.value)} />
          <button
            type="button"
            onClick={prepare}
            className="rounded-xl bg-neutral-900 px-3 py-2 text-sm font-medium text-white md:col-span-2"
            disabled={!canPrepare || busy === 'prepare' || !prepareClaimId || !prepareAmount || !idempotencyKey}
          >
            {busy === 'prepare' ? 'در حال ثبت سازی' : 'ثبت آماده سازی'}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <input className="rounded-xl border px-3 py-2" placeholder="Filter claimId" value={claimId} onChange={(e) => setClaimId(e.target.value)} />
        <input className="rounded-xl border px-3 py-2" placeholder="Filter status" value={status} onChange={(e) => setStatus(e.target.value)} />
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

      <div className="mt-6 space-y-3">
        {rows.map((x) => (
          <div key={x.paymentIntentId} className="rounded-2xl border p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold">{x.paymentIntentId}</div>
                <div className="mt-1 text-xs text-neutral-600">Claim: {x.claimId}</div>
                <div className="mt-1 text-xs text-neutral-600">
                  {x.status} | {x.amount} {x.currency}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => act(x.paymentIntentId, 'approve')}
                  disabled={!canApprove || busy === x.paymentIntentId}
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
                >
                  تأیید مالی
                </button>
                <button
                  type="button"
                  onClick={() => act(x.paymentIntentId, 'execute')}
                  disabled={!canExecute || busy === x.paymentIntentId}
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
                >
                  واریز
                </button>
                <button
                  type="button"
                  onClick={() => fail(x.paymentIntentId)}
                  disabled={!canFail || busy === x.paymentIntentId}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  ناموفق
                </button>
                <button
                  type="button"
                  onClick={() => act(x.paymentIntentId, 'notify')}
                  disabled={!canNotify || busy === x.paymentIntentId}
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
                >
                  ابلاغ
                </button>
              </div>
            </div>
          </div>
        ))}
        {!loading && rows.length === 0 ? <div className="text-sm text-neutral-600">موردی یافت نشد.</div> : null}
      </div>
    </main>
  );
}
