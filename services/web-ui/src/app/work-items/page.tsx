'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, UserPlus, CheckCircle2, XCircle, AlertTriangle, ChevronLeft } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';
import { Button, Card } from '@insurance/design-system';
import { cn } from '@/lib/cn';
import { MOCK_WORK_ITEMS } from '@/lib/mock-data';

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

const statusStyles: Record<string, string> = {
  pending: 'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning',
  assigned: 'border-brand-primary/30 bg-brand-primary-subtle text-brand-primary',
  in_progress: 'border-brand-primary/30 bg-brand-primary-subtle text-brand-primary',
  completed: 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success',
  failed: 'border-feedback-error/30 bg-feedback-error-subtle text-feedback-error',
};

const priorityStyles: Record<string, string> = {
  high: 'border-feedback-error/30 bg-feedback-error-subtle text-feedback-error',
  medium: 'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning',
  low: 'border-border-default bg-bg-base text-text-muted',
};

const statusLabels: Record<string, string> = {
  pending: 'در انتظار',
  assigned: 'اختصاص یافته',
  in_progress: 'در حال انجام',
  completed: 'تکمیل شده',
  failed: 'ناموفق',
};

const priorityLabels: Record<string, string> = {
  high: 'بالا',
  medium: 'متوسط',
  low: 'پایین',
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
    else setRows(MOCK_WORK_ITEMS as unknown as WorkItemRow[]);
    setLoading(false);
  }

  useEffect(() => {
    if (!canList) { router.replace('/forbidden'); return; }
    load();
  }, []);

  async function assign(workItemId: string) {
    setBusy(workItemId);
    setError(null);
    const res = await apiFetch(`/work-items/${encodeURIComponent(workItemId)}/assign`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    setBusy(null);
    await load();
  }

  async function complete(workItemId: string, decision: 'approved' | 'rejected' | 'escalated') {
    setBusy(workItemId);
    setError(null);
    const res = await apiFetch(`/work-items/${encodeURIComponent(workItemId)}/complete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decision, notes: decisionNotes || undefined }),
    });
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    setBusy(null);
    await load();
  }

  return (
    <div className="min-h-screen bg-bg-base" dir="rtl">
      <header className="sticky top-0 z-10 border-b border-border-default bg-bg-raised shadow-1">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
            <ChevronLeft className="h-5 w-5" />
            بازگشت
          </Button>
          <h1 className="text-h3 font-bold text-text-primary">کارهای عملیاتی (Work Items)</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-body-sm text-text-secondary">لیست و انجام کارهای انسانی/عملیاتی Sagaها (HITL)</p>
          <Button size="sm" variant="secondary" onClick={load} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            بروزرسانی
          </Button>
        </div>

        <Card className="p-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <input className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary placeholder:text-text-muted" placeholder="وضعیت" value={status} onChange={(e) => setStatus(e.target.value)} />
            <input className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary placeholder:text-text-muted" placeholder="اختصاص به" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} />
            <input className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary placeholder:text-text-muted" placeholder="اولویت" value={priority} onChange={(e) => setPriority(e.target.value)} />
            <Button size="sm" variant="secondary" onClick={load} disabled={loading}>اعمال فیلتر</Button>
          </div>
          <div className="border-t border-border-default pt-3">
            <input className="w-full rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary placeholder:text-text-muted" placeholder="یادداشت تصمیم (اختیاری)" value={decisionNotes} onChange={(e) => setDecisionNotes(e.target.value)} />
            <p className="mt-2 text-body-xs text-text-muted">یادداشت تصمیم برای Complete اختیاری است؛ actor از JWT توسط Gateway ارسال می‌شود.</p>
          </div>
        </Card>

        {error && (
          <div className="rounded-lg border border-feedback-error/30 bg-feedback-error-subtle p-4 text-body-sm text-feedback-error">
            <div>خطا: {error.message}</div>
            {error.correlationId && <div className="mt-1 text-body-xs">correlationId: {error.correlationId}</div>}
          </div>
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-primary" />
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-text-muted">موردی یافت نشد.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {rows.map((w) => (
              <Card key={w.workItemId} className="p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-body-sm font-semibold text-text-primary">{w.stepName}</span>
                      <span className="text-body-xs text-text-muted">({w.workItemType})</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', statusStyles[w.status] || 'border-border-default bg-bg-base text-text-muted')}>
                        {statusLabels[w.status] || w.status}
                      </span>
                      <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', priorityStyles[w.priority] || 'border-border-default bg-bg-base text-text-muted')}>
                        اولویت: {priorityLabels[w.priority] || w.priority}
                      </span>
                    </div>
                    <div className="text-body-xs text-text-muted">
                      <span>workItemId: {w.workItemId}</span>
                      <span className="mx-2">|</span>
                      <span>sagaId: {w.sagaId}</span>
                    </div>
                    <div className="text-body-xs text-text-muted">
                      <span>claimId: {w.claimId || '—'}</span>
                      <span className="mx-2">|</span>
                      <span>اختصاص به: {w.assignedTo || '—'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => assign(w.workItemId)} disabled={!canAssign || busy === w.workItemId}>
                      <UserPlus className="h-4 w-4" />
                      اختصاص به من
                    </Button>
                    <Button size="sm" variant="primary" onClick={() => complete(w.workItemId, 'approved')} disabled={!canComplete || busy === w.workItemId}
                      className="bg-feedback-success hover:opacity-90">
                      <CheckCircle2 className="h-4 w-4" />
                      تأیید
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => complete(w.workItemId, 'rejected')} disabled={!canComplete || busy === w.workItemId}
                      className="border-feedback-error/30 text-feedback-error hover:bg-feedback-error-subtle">
                      <XCircle className="h-4 w-4" />
                      رد
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => complete(w.workItemId, 'escalated')} disabled={!canComplete || busy === w.workItemId}
                      className="border-feedback-warning/30 text-feedback-warning hover:bg-feedback-warning-subtle">
                      <AlertTriangle className="h-4 w-4" />
                      ارجاع
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
