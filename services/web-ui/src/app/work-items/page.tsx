'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';

type WorkItemRow = {
  workItemId: string;
  sagaId: string;
  stepName: string;
  workItemType: string;
  status: string;
  claimId: string | null;
  policyId: string | null;
  assignedTo: string | null;
  priority: string;
  context: any;
  decisionNotes: string | null;
  decidedBy: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export default function WorkItemsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<WorkItemRow[]>([]);

  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const [status, setStatus] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState('');

  const [busy, setBusy] = useState<string | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');

  const perms = enterprisePermissionsForRoles(getAuthUser()?.roles);
  const canList = hasEnterprisePermission(perms, 'work_items:list');
  const canAssign = hasEnterprisePermission(perms, 'work_items:assign');
  const canComplete = hasEnterprisePermission(perms, 'work_items:complete');

  async function load() {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    if (assignedTo) qs.set('assignedTo', assignedTo);
    if (priority) qs.set('priority', priority);

    const res = await apiFetch<WorkItemRow[]>(`/work-items${qs.toString() ? `?${qs.toString()}` : ''}`);
    if (res.success) setRows(res.data);
    else setError({ message: res.error.message, correlationId: res.correlationId });
    setLoading(false);
  }

  useEffect(() => {
    if (!canList) {
      router.replace('/forbidden');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function assign(workItemId: string) {
    setBusy(workItemId);
    setError(null);
    // Gateway injects x-user-id from JWT; backend uses header for assignedTo if body not provided
    const res = await apiFetch(`/work-items/${encodeURIComponent(workItemId)}/assign`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}), // assignedTo read from x-user-id header
    });
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    setBusy(null);
    await load();
  }

  async function complete(workItemId: string, decision: 'approved' | 'rejected' | 'escalated') {
    setBusy(workItemId);
    setError(null);
    // Gateway injects x-user-id from JWT; backend uses header for decidedBy if body not provided
    const res = await apiFetch(`/work-items/${encodeURIComponent(workItemId)}/complete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        decision,
        notes: decisionNotes || undefined,
        // decidedBy is now read from x-user-id header injected by API Gateway
      }),
    });
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    setBusy(null);
    await load();
  }

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">کارها (Work Items)</h1>
          <p className="mt-1 text-sm text-neutral-600">لیست و انجام کارهای انسانی/عملیاتی Sagaها (HITL)</p>
        </div>
        <button type="button" onClick={load} className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" disabled={loading}>
          بروزرسانی
        </button>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <input className="rounded-xl border px-3 py-2" placeholder="status" value={status} onChange={(e) => setStatus(e.target.value)} />
        <input className="rounded-xl border px-3 py-2" placeholder="assignedTo" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} />
        <input className="rounded-xl border px-3 py-2" placeholder="priority" value={priority} onChange={(e) => setPriority(e.target.value)} />
        <button type="button" className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" onClick={load} disabled={loading}>
          اعمال فیلتر
        </button>
      </div>

      <div className="mt-6 rounded-2xl border p-4">
        <div className="grid gap-3">
          <input className="rounded-xl border px-3 py-2" placeholder="decision notes (optional)" value={decisionNotes} onChange={(e) => setDecisionNotes(e.target.value)} />
        </div>
        <div className="mt-2 text-xs text-neutral-600">یادداشت تصمیم برای Complete اختیاری است؛ actor از JWT توسط Gateway ارسال می‌شود.</div>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <div>خطا: {error.message}</div>
          {error.correlationId ? <div className="mt-1 text-xs">correlationId: {error.correlationId}</div> : null}
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {rows.map((w) => (
          <div key={w.workItemId} className="rounded-2xl border p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold">{w.stepName} ({w.workItemType})</div>
                <div className="mt-1 text-xs text-neutral-600">status: {w.status} | priority: {w.priority}</div>
                <div className="mt-1 text-xs text-neutral-600">workItemId: {w.workItemId}</div>
                <div className="mt-1 text-xs text-neutral-600">sagaId: {w.sagaId}</div>
                <div className="mt-1 text-xs text-neutral-600">claimId: {w.claimId || '—'} | assignedTo: {w.assignedTo || '—'}</div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => assign(w.workItemId)}
                  disabled={!canAssign || busy === w.workItemId}
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
                >
                  Assign to me
                </button>
                <button
                  type="button"
                  onClick={() => complete(w.workItemId, 'approved')}
                  disabled={!canComplete || busy === w.workItemId}
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => complete(w.workItemId, 'rejected')}
                  disabled={!canComplete || busy === w.workItemId}
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => complete(w.workItemId, 'escalated')}
                  disabled={!canComplete || busy === w.workItemId}
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
