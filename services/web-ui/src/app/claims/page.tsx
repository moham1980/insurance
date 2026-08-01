'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Plus, RefreshCw, Target, CheckCircle, Clock, XCircle, AlertTriangle, Search } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';
import { BulkActions } from '@/components/bulk-actions';
import { LoadingOverlay } from '@/components/loading-spinner';
import { Button, Card, StatCard } from '@insurance/design-system';
import { MOCK_CLAIMS } from '@/lib/mock-data';

type ClaimRow = {
  claimId: string;
  claimNumber: string;
  policyId: string;
  claimantPartyId?: string;
  lossDate?: string;
  lossType?: string;
  status: string;
  description?: string | null;
  assessedAmount?: number | null;
  approvedAmount?: number | null;
  createdAt: string;
  updatedAt: string;
};

export default function ClaimsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const perms = enterprisePermissionsForRoles(getAuthUser()?.roles);
  const canList = hasEnterprisePermission(perms, 'rm:claims:view');
  const canRegister = hasEnterprisePermission(perms, 'claims:register');

  const [status, setStatus] = useState('');
  const [policyId, setPolicyId] = useState('');

  const [selectedClaims, setSelectedClaims] = useState<Set<string>>(new Set());

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    policyId: '',
    claimantPartyId: '',
    lossDate: '',
    lossType: 'accident',
    description: '',
  });

  async function load() {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    if (policyId) qs.set('policyId', policyId);

    try {
      const res = await apiFetch<ClaimRow[]>(`/rm/claims${qs.toString() ? `?${qs.toString()}` : ''}`);
      if (res.success) setRows(res.data);
      else {
        setError({ message: res.error.message, correlationId: res.correlationId });
        setRows(MOCK_CLAIMS as ClaimRow[]);
      }
    } catch {
      setRows(MOCK_CLAIMS as ClaimRow[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canList) {
      router.replace('/forbidden');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function create() {
    if (!form.policyId.trim() || !form.claimantPartyId.trim()) {
      setError({ message: 'شناسه بیمه‌نامه و شناسه ذی‌نفع الزامی است' });
      return;
    }
    setCreating(true);
    setError(null);
    const res = await apiFetch<{ claimId: string }>('/claims', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...form,
      }),
    });
    if (res.success) {
      setShowCreate(false);
      setForm({ policyId: '', claimantPartyId: '', lossDate: '', lossType: 'accident', description: '' });
      await load();
    } else {
      setError({ message: res.error.message, correlationId: res.correlationId });
    }
    setCreating(false);
  }

  function handleSelectClaim(claimId: string) {
    setSelectedClaims((prev) => {
      const next = new Set(prev);
      if (next.has(claimId)) next.delete(claimId);
      else next.add(claimId);
      return next;
    });
  }

  function handleSelectAll() {
    if (selectedClaims.size === rows.length) {
      setSelectedClaims(new Set());
    } else {
      setSelectedClaims(new Set(rows.map((r) => r.claimId)));
    }
  }

  function handleClearSelection() {
    setSelectedClaims(new Set());
  }

  async function handleBulkAction(actionId: string) {
    const claimIds = Array.from(selectedClaims);
    if (actionId === 'export') {
      // Export selected claims
      console.log('Exporting claims:', claimIds);
    } else if (actionId === 'assign') {
      // Assign selected claims
      console.log('Assigning claims:', claimIds);
    } else if (actionId === 'close') {
      // Close selected claims
      console.log('Closing claims:', claimIds);
    }
    handleClearSelection();
  }

  const bulkActions = [
    { id: 'export', label: 'خروجی' },
    { id: 'assign', label: 'تخصیص' },
    { id: 'close', label: 'بستن', danger: true, confirm: true, confirmText: 'آیا مطمئن هستید که می‌خواهید این خسارت‌ها را ببندید؟' },
  ];

  const statusBadge = (s: string) => {
    const cfg: Record<string, { bg: string; text: string; icon: React.ComponentType<any> }> = {
      registered: { bg: 'bg-brand-primary-subtle', text: 'text-brand-primary', icon: FileText },
      assessed: { bg: 'bg-feedback-warning-subtle', text: 'text-feedback-warning', icon: Clock },
      approved: { bg: 'bg-feedback-success-subtle', text: 'text-feedback-success', icon: CheckCircle },
      paid: { bg: 'bg-feedback-success-subtle', text: 'text-feedback-success', icon: CheckCircle },
      rejected: { bg: 'bg-feedback-error-subtle', text: 'text-feedback-error', icon: XCircle },
    };
    const c = cfg[s] || { bg: 'bg-bg-base', text: 'text-text-secondary', icon: AlertTriangle };
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
        <Icon className="w-3 h-3" />
        {s}
      </span>
    );
  };

  const fmtAmount = (n: number | null | undefined) => n ? n.toLocaleString('fa-IR') + ' تومان' : '—';

  const stats = {
    total: rows.length,
    open: rows.filter(r => r.status === 'registered' || r.status === 'assessed').length,
    approved: rows.filter(r => r.status === 'approved' || r.status === 'paid').length,
    totalAssessed: rows.reduce((sum, r) => sum + (r.assessedAmount || 0), 0),
  };

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Claims (خسارت‌ها)</h1>
          <p className="mt-1 text-sm text-text-muted">لیست و ثبت ادعای خسارت</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => router.push('/claims/workbench')}>
            <Target className="ml-1 h-4 w-4" /> Workbench
          </Button>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`ml-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> بروزرسانی
          </Button>
          {canRegister ? (
            <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="ml-1 h-4 w-4" /> ثبت خسارت
            </Button>
          ) : null}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="کل خسارت‌ها" value={stats.total} icon={FileText} changeType="neutral" />
        <StatCard title="خسارت‌های باز" value={stats.open} icon={Clock} changeType="warning" />
        <StatCard title="تأیید شده" value={stats.approved} icon={CheckCircle} changeType="positive" />
        <StatCard title="مجموع ارزیابی" value={fmtAmount(stats.totalAssessed)} icon={AlertTriangle} changeType="neutral" />
      </div>

      {/* Filters */}
      <Card className="mt-6 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input className="w-full rounded-lg border border-border-default pr-10 pl-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="وضعیت" value={status} onChange={(e) => setStatus(e.target.value)} />
          </div>
          <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="شناسه بیمه‌نامه" value={policyId} onChange={(e) => setPolicyId(e.target.value)} />
          <div />
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

      {showCreate && canRegister ? (
        <Card className="mt-6 p-4" elevation={2}>
          <h3 className="font-semibold text-text-primary">ثبت خسارت جدید</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="شناسه بیمه‌نامه (الزامی)" value={form.policyId} onChange={(e) => setForm({ ...form, policyId: e.target.value })} />
            <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="شناسه ذی‌نفع (الزامی)" value={form.claimantPartyId} onChange={(e) => setForm({ ...form, claimantPartyId: e.target.value })} />
            <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" type="date" placeholder="تاریخ خسارت" value={form.lossDate} onChange={(e) => setForm({ ...form, lossDate: e.target.value })} />
            <select className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" value={form.lossType} onChange={(e) => setForm({ ...form, lossType: e.target.value })}>
              <option value="accident">تصادف</option>
              <option value="theft">سرقت</option>
              <option value="fire">آتش‌سوزی</option>
              <option value="natural_disaster">حادثه طبیعی</option>
              <option value="third_party">شخص ثالث</option>
              <option value="medical">پزشکی</option>
              <option value="other">سایر</option>
            </select>
            <textarea className="w-full rounded-lg border border-border-default px-3 py-2 text-sm md:col-span-2 focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="توضیحات (اختیاری)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="primary" size="md" onClick={create} disabled={creating || !form.policyId.trim() || !form.claimantPartyId.trim()} isLoading={creating}>
              ثبت
            </Button>
            <Button variant="ghost" size="md" onClick={() => setShowCreate(false)}>
              انصراف
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="mt-6 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={selectedClaims.size === rows.length && rows.length > 0}
            onChange={handleSelectAll}
            className="rounded border-border-default"
          />
          <span className="text-text-muted">انتخاب همه</span>
        </div>
        {rows.map((c) => (
          <Card key={c.claimId} className="p-4 hover:bg-bg-base transition-colors cursor-pointer" onClick={() => router.push(`/claims/${c.claimId}`)}>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedClaims.has(c.claimId)}
                  onChange={() => handleSelectClaim(c.claimId)}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded border-border-default mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text-primary">{c.claimNumber}</span>
                    {statusBadge(c.status)}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                    <span>نوع: {c.lossType || '—'}</span>
                    <span>بیمه‌نامه: {c.policyId}</span>
                    <span>تاریخ خسارت: {c.lossDate || '—'}</span>
                  </div>
                  {c.description && <p className="mt-1 text-xs text-text-secondary line-clamp-1">{c.description}</p>}
                  <div className="mt-2 flex gap-4 text-xs">
                    {typeof c.assessedAmount === 'number' && <span className="text-text-muted">ارزیابی: <span className="font-medium text-text-secondary">{fmtAmount(c.assessedAmount)}</span></span>}
                    {typeof c.approvedAmount === 'number' && <span className="text-text-muted">تأیید شده: <span className="font-medium text-feedback-success">{fmtAmount(c.approvedAmount)}</span></span>}
                  </div>
                </div>
              </div>
              <div className="text-sm text-brand-primary hover:underline shrink-0">مشاهده جزئیات ←</div>
            </div>
          </Card>
        ))}
        {!loading && rows.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-text-muted opacity-50" />
            <p className="mt-3 text-sm text-text-muted">موردی یافت نشد.</p>
          </div>
        ) : null}
      </div>

      <BulkActions
        selectedCount={selectedClaims.size}
        actions={bulkActions}
        onAction={handleBulkAction}
        onClear={handleClearSelection}
      />
      <LoadingOverlay loading={loading} text="در حال بارگذاری خسارت‌ها..." />
    </main>
  );
}
