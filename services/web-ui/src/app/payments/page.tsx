'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, RefreshCw, CheckCircle, Banknote, Bell, XCircle, Search, Wallet } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';
import { Button, Card, StatCard } from '@insurance/design-system';
import { MOCK_PAYMENTS } from '@/lib/mock-data';

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
    try {
      const res = await apiFetch<Row[]>(`/payments${qs.toString() ? `?${qs.toString()}` : ''}`);
      if (res.success) setRows(res.data);
      else {
        setError({ message: res.error.message, correlationId: res.correlationId });
        setRows(MOCK_PAYMENTS.map(p => ({ paymentIntentId: p.paymentId, claimId: p.policyId, amount: p.amount, currency: 'IRR', status: p.status })) as Row[]);
      }
    } catch {
      setRows(MOCK_PAYMENTS.map(p => ({ paymentIntentId: p.paymentId, claimId: p.policyId, amount: p.amount, currency: 'IRR', status: p.status })) as Row[]);
    } finally {
      setLoading(false);
    }
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

  const statusBadge = (s: string) => {
    const cfg: Record<string, { bg: string; text: string }> = {
      paid: { bg: 'bg-feedback-success-subtle', text: 'text-feedback-success' },
      pending: { bg: 'bg-feedback-warning-subtle', text: 'text-feedback-warning' },
      overdue: { bg: 'bg-feedback-error-subtle', text: 'text-feedback-error' },
      approved: { bg: 'bg-brand-primary-subtle', text: 'text-brand-primary' },
      prepared: { bg: 'bg-brand-primary-subtle', text: 'text-brand-primary' },
      failed: { bg: 'bg-feedback-error-subtle', text: 'text-feedback-error' },
    };
    const c = cfg[s] || { bg: 'bg-bg-base', text: 'text-text-secondary' };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>{s}</span>;
  };

  const fmtAmount = (n: number) => n.toLocaleString('fa-IR');

  const stats = {
    total: rows.length,
    paid: rows.filter(r => r.status === 'paid').length,
    pending: rows.filter(r => r.status === 'pending' || r.status === 'prepared' || r.status === 'approved').length,
    totalAmount: rows.reduce((sum, r) => sum + r.amount, 0),
  };

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">پرداخت‌ها</h1>
          <p className="mt-1 text-sm text-text-muted">لیست و آماده‌سازی پرداخت خسارت</p>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`ml-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> بروزرسانی
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="کل پرداخت‌ها" value={stats.total} icon={CreditCard} changeType="neutral" />
        <StatCard title="پرداخت شده" value={stats.paid} icon={CheckCircle} changeType="positive" />
        <StatCard title="در انتظار" value={stats.pending} icon={Wallet} changeType="warning" />
        <StatCard title="مجموع مبلغ" value={fmtAmount(stats.totalAmount) + ' تومان'} icon={Banknote} changeType="neutral" />
      </div>

      {/* Prepare Payment */}
      <Card className="mt-6 p-4" elevation={2}>
        <div className="text-sm font-semibold text-text-primary">آماده‌سازی پرداخت</div>
        <div className="mt-3 grid gap-3 md:grid-cols-6">
          <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent md:col-span-2" placeholder="شناسه خسارت" value={prepareClaimId} onChange={(e) => setPrepareClaimId(e.target.value)} />
          <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="مبلغ (تومان)" value={prepareAmount} onChange={(e) => setPrepareAmount(e.target.value)} />
          <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent md:col-span-3" placeholder="کلید Idempotency" value={idempotencyKey} onChange={(e) => setIdempotencyKey(e.target.value)} />
          <Button
            variant="primary"
            size="md"
            onClick={prepare}
            className="md:col-span-2"
            disabled={!canPrepare || busy === 'prepare' || !prepareClaimId || !prepareAmount || !idempotencyKey}
            isLoading={busy === 'prepare'}
          >
            ثبت آماده‌سازی
          </Button>
        </div>
      </Card>

      {/* Filters */}
      <Card className="mt-6 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input className="w-full rounded-lg border border-border-default pr-10 pl-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="فیلتر شناسه خسارت" value={claimId} onChange={(e) => setClaimId(e.target.value)} />
          </div>
          <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="فیلتر وضعیت" value={status} onChange={(e) => setStatus(e.target.value)} />
          <Button variant="ghost" size="md" onClick={load} disabled={loading} fullWidth>
            اعمال فیلتر
          </Button>
        </div>
      </Card>

      {error ? (
        <div className="mt-6 rounded-2xl border border-feedback-error/30 bg-feedback-error-subtle p-4 text-sm text-feedback-error">
          <div>خطا: {error.message}</div>
          {error.correlationId ? <div className="mt-1 text-xs">correlationId: {error.correlationId}</div> : null}
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {rows.map((x) => (
          <Card key={x.paymentIntentId} className="p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-text-primary">{x.paymentIntentId}</span>
                  {statusBadge(x.status)}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                  <span>خسارت: {x.claimId}</span>
                  <span>مبلغ: <span className="font-medium text-text-primary">{fmtAmount(x.amount)} {x.currency}</span></span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" onClick={() => act(x.paymentIntentId, 'approve')} disabled={!canApprove || busy === x.paymentIntentId}>
                  <CheckCircle className="ml-1 h-4 w-4" /> تأیید مالی
                </Button>
                <Button variant="primary" size="sm" onClick={() => act(x.paymentIntentId, 'execute')} disabled={!canExecute || busy === x.paymentIntentId}>
                  <Banknote className="ml-1 h-4 w-4" /> واریز
                </Button>
                <Button variant="danger" size="sm" onClick={() => fail(x.paymentIntentId)} disabled={!canFail || busy === x.paymentIntentId}>
                  <XCircle className="ml-1 h-4 w-4" /> ناموفق
                </Button>
                <Button variant="ghost" size="sm" onClick={() => act(x.paymentIntentId, 'notify')} disabled={!canNotify || busy === x.paymentIntentId}>
                  <Bell className="ml-1 h-4 w-4" /> ابلاغ
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {!loading && rows.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="mx-auto h-12 w-12 text-text-muted opacity-50" />
            <p className="mt-3 text-sm text-text-muted">موردی یافت نشد.</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
