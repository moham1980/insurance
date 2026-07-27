'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';

type FraudAlertRow = {
  fraudCaseId: string;
  claimId: string;
  claimNumber: string;
  score: number;
  signals: string[];
  status: 'open' | 'confirmed' | 'cleared';
  holdClaim: boolean;
  assignedTo: string | null;
  notes: string | null;
  createdAt: string;
};

export default function FraudPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<FraudAlertRow[]>([]);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const perms = enterprisePermissionsForRoles(getAuthUser()?.roles);
  const canList = hasEnterprisePermission(perms, 'rm:fraud:view');
  const canInvestigate = hasEnterprisePermission(perms, 'fraud:investigate');
  const canEscalate = hasEnterprisePermission(perms, 'fraud:escalate');

  const [status, setStatus] = useState('');
  const [claimId, setClaimId] = useState('');

  const [busy, setBusy] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [escalateToUnit, setEscalateToUnit] = useState<'siu' | 'legal'>('siu');
  const [escalateConfirmText, setEscalateConfirmText] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    if (claimId) qs.set('claimId', claimId);

    // Use Read Model endpoint for list (avoids fan-out per Enterprise Blueprint)
    const res = await apiFetch<FraudAlertRow[]>(`/rm/fraud/cases${qs.toString() ? `?${qs.toString()}` : ''}`);
    if (res.success) setRows(res.data);
    else setError({ message: res.error.message, correlationId: res.correlationId });
    setLoading(false);
  }

  async function escalateCase(fraudCaseId: string) {
    if (!canEscalate) return;
    const mustEqual = `ESCALATE ${fraudCaseId}`;
    if (escalateConfirmText.trim() !== mustEqual) {
      setError({ message: `Confirmation mismatch. Type exactly: ${mustEqual}` });
      return;
    }

    setBusy(fraudCaseId);
    setError(null);
    const res = await apiFetch(`/fraud/cases/${encodeURIComponent(fraudCaseId)}/escalate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        toUnit: escalateToUnit,
        reasonCodes: [],
        notes: reviewNotes || undefined,
        requiresHumanApproval: true,
      }),
    });
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    setBusy(null);
    await load();
  }

  useEffect(() => {
    if (!canList) {
      router.replace('/forbidden');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function closeCase(fraudCaseId: string, resolution: 'confirmed' | 'cleared') {
    setBusy(fraudCaseId);
    setError(null);
    const res = await apiFetch(`/fraud/cases/${encodeURIComponent(fraudCaseId)}/close`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        resolution,
        notes: reviewNotes || undefined,
      }),
    });
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    setBusy(null);
    await load();
  }

  const statusColor: Record<string, string> = {
    open: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-rose-100 text-rose-700',
    cleared: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Fraud Detection (تشخیص تقلب)</h1>
          <p className="mt-1 text-sm text-neutral-600">بررسی و مدیریت هشدارهای تقلب</p>
        </div>
        <button type="button" onClick={load} className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" disabled={loading}>
          بروزرسانی
        </button>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <input className="rounded-xl border px-3 py-2" placeholder="status (open/confirmed/cleared)" value={status} onChange={(e) => setStatus(e.target.value)} />
        <div />
        <input className="rounded-xl border px-3 py-2" placeholder="claimId" value={claimId} onChange={(e) => setClaimId(e.target.value)} />
        <button type="button" className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" onClick={load} disabled={loading}>
          اعمال فیلتر
        </button>
      </div>

      <div className="mt-6 rounded-2xl border p-4">
        <input className="rounded-xl border px-3 py-2 w-full" placeholder="review notes (optional)" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />
        <div className="mt-2 text-xs text-neutral-600">یادداشت بازبینی برای اکشن‌های زیر استفاده می‌شود.</div>

        {canEscalate ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="md:col-span-1">
              <div className="text-xs text-neutral-600">escalate toUnit</div>
              <select value={escalateToUnit} onChange={(e) => setEscalateToUnit(e.target.value as any)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" disabled={loading}>
                <option value="siu">siu</option>
                <option value="legal">legal</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-neutral-600">confirmation</div>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                placeholder="Type: ESCALATE {fraudCaseId}"
                value={escalateConfirmText}
                onChange={(e) => setEscalateConfirmText(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <div>خطا: {error.message}</div>
          {error.correlationId ? <div className="mt-1 text-xs">correlationId: {error.correlationId}</div> : null}
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {rows.map((a) => (
          <div key={a.fraudCaseId} className="rounded-2xl border p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{a.claimNumber}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[a.status] || 'bg-neutral-100 text-neutral-700'}`}>{a.status}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${a.holdClaim ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {a.holdClaim ? 'HOLD' : 'CLEAR'}
                  </span>
                </div>
                <div className="mt-1 text-xs text-neutral-600">score: {a.score} | signals: {(a.signals || []).join(', ') || '—'}</div>
                <div className="mt-1 text-xs text-neutral-600">fraudCaseId: {a.fraudCaseId}</div>
                <div className="mt-1 text-xs text-neutral-600">claimId: {a.claimId}</div>
                <div className="mt-1 text-xs text-neutral-600">assignedTo: {a.assignedTo || '—'}</div>
                {a.notes ? <div className="mt-1 text-xs text-neutral-600">notes: {a.notes}</div> : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => closeCase(a.fraudCaseId, 'cleared')}
                  disabled={!canInvestigate || busy === a.fraudCaseId}
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => closeCase(a.fraudCaseId, 'confirmed')}
                  disabled={!canInvestigate || busy === a.fraudCaseId}
                  className="rounded-xl bg-rose-600 px-3 py-2 text-sm text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => escalateCase(a.fraudCaseId)}
                  disabled={!canEscalate || busy === a.fraudCaseId}
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
                >
                  Escalate
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
