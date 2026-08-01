'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, RefreshCw, Search, CheckCircle, XCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';
import { Button, Card, StatCard } from '@insurance/design-system';
import { MOCK_FRAUD_ALERTS } from '@/lib/mock-data';

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

    try {
      const res = await apiFetch<FraudAlertRow[]>(`/rm/fraud/cases${qs.toString() ? `?${qs.toString()}` : ''}`);
      if (res.success) setRows(res.data);
      else {
        setError({ message: res.error.message, correlationId: res.correlationId });
        setRows(MOCK_FRAUD_ALERTS.map(a => ({ ...a, fraudCaseId: a.alertId, score: a.riskScore, signals: [a.reason], assignedTo: null, notes: null })) as FraudAlertRow[]);
      }
    } catch {
      setRows(MOCK_FRAUD_ALERTS.map(a => ({ ...a, fraudCaseId: a.alertId, score: a.riskScore, signals: [a.reason], assignedTo: null, notes: null })) as FraudAlertRow[]);
    } finally {
      setLoading(false);
    }
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
    open: 'bg-feedback-warning-subtle text-feedback-warning',
    confirmed: 'bg-feedback-error-subtle text-feedback-error',
    cleared: 'bg-feedback-success-subtle text-feedback-success',
  };

  const stats = {
    total: rows.length,
    open: rows.filter(r => r.status === 'open').length,
    confirmed: rows.filter(r => r.status === 'confirmed').length,
    avgScore: rows.length > 0 ? (rows.reduce((s, r) => s + r.score, 0) / rows.length).toFixed(2) : '0',
  };

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Fraud Detection (تشخیص تقلب)</h1>
          <p className="mt-1 text-sm text-text-muted">بررسی و مدیریت هشدارهای تقلب</p>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`ml-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> بروزرسانی
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="کل هشدارها" value={stats.total} icon={ShieldAlert} changeType="neutral" />
        <StatCard title="باز" value={stats.open} icon={AlertTriangle} changeType="warning" />
        <StatCard title="تأیید شده" value={stats.confirmed} icon={XCircle} changeType="negative" />
        <StatCard title="میانگین امتیاز" value={stats.avgScore} icon={TrendingUp} changeType="neutral" />
      </div>

      {/* Filters */}
      <Card className="mt-6 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input className="w-full rounded-lg border border-border-default pr-10 pl-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="وضعیت (open/confirmed/cleared)" value={status} onChange={(e) => setStatus(e.target.value)} />
          </div>
          <div />
          <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="شناسه خسارت" value={claimId} onChange={(e) => setClaimId(e.target.value)} />
          <Button variant="ghost" size="md" onClick={load} disabled={loading} fullWidth>
            اعمال فیلتر
          </Button>
        </div>
      </Card>

      {/* Review Notes & Escalation */}
      <Card className="mt-6 p-4" elevation={2}>
        <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="یادداشت بازبینی (اختیاری)" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />
        <div className="mt-2 text-xs text-text-muted">یادداشت بازبینی برای اکشن‌های زیر استفاده می‌شود.</div>

        {canEscalate ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="md:col-span-1">
              <div className="text-xs text-text-muted">ارتقا به واحد</div>
              <select value={escalateToUnit} onChange={(e) => setEscalateToUnit(e.target.value as any)} className="mt-1 w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" disabled={loading}>
                <option value="siu">SIU (واحد ویژه)</option>
                <option value="legal">حقوقی</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-text-muted">تأیید</div>
              <input
                className="mt-1 w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                placeholder="Type: ESCALATE {fraudCaseId}"
                value={escalateConfirmText}
                onChange={(e) => setEscalateConfirmText(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        ) : null}
      </Card>

      {error ? (
        <div className="mt-6 rounded-2xl border border-feedback-error/30 bg-feedback-error-subtle p-4 text-sm text-feedback-error">
          <div>خطا: {error.message}</div>
          {error.correlationId ? <div className="mt-1 text-xs">correlationId: {error.correlationId}</div> : null}
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {rows.map((a) => (
          <Card key={a.fraudCaseId} className="p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-text-primary">{a.claimNumber}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[a.status] || 'bg-bg-base text-text-secondary'}`}>{a.status}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${a.holdClaim ? 'bg-feedback-error-subtle text-feedback-error' : 'bg-feedback-success-subtle text-feedback-success'}`}>
                    {a.holdClaim ? 'HOLD' : 'CLEAR'}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                  <span>امتیاز: <span className={`font-medium ${a.score > 0.7 ? 'text-feedback-error' : a.score > 0.4 ? 'text-feedback-warning' : 'text-feedback-success'}`}>{a.score}</span></span>
                  <span>سیگنال‌ها: {(a.signals || []).join('، ') || '—'}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                  <span>شناسه پرونده: {a.fraudCaseId}</span>
                  <span>خسارت: {a.claimId}</span>
                  <span>مسئول: {a.assignedTo || '—'}</span>
                </div>
                {a.notes ? <div className="mt-1 text-xs text-text-secondary">یادداشت: {a.notes}</div> : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" onClick={() => closeCase(a.fraudCaseId, 'cleared')} disabled={!canInvestigate || busy === a.fraudCaseId}>
                  <CheckCircle className="ml-1 h-4 w-4" /> رفع
                </Button>
                <Button variant="danger" size="sm" onClick={() => closeCase(a.fraudCaseId, 'confirmed')} disabled={!canInvestigate || busy === a.fraudCaseId}>
                  <XCircle className="ml-1 h-4 w-4" /> تأیید تقلب
                </Button>
                <Button variant="secondary" size="sm" onClick={() => escalateCase(a.fraudCaseId)} disabled={!canEscalate || busy === a.fraudCaseId}>
                  <AlertTriangle className="ml-1 h-4 w-4" /> ارتقا
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {!loading && rows.length === 0 ? (
          <div className="text-center py-12">
            <ShieldAlert className="mx-auto h-12 w-12 text-text-muted opacity-50" />
            <p className="mt-3 text-sm text-text-muted">موردی یافت نشد.</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
