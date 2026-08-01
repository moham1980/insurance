'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Coins, CreditCard, Plus, RefreshCcw, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';
import { Button, Card, StatCard } from '@insurance/design-system';
import { MOCK_COLLECTIONS } from '@/lib/mock-data';

type Plan = {
  planId: string;
  policyId: string;
  premiumAmount: number;
  currency: string;
  status: 'active' | 'completed' | 'cancelled';
  idempotencyKey: string;
  meta: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  installments?: Installment[];
};

type Installment = {
  installmentId: string;
  planId: string;
  policyId: string;
  installmentNo: number;
  dueDate: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'cancelled';
  paidAt: string | null;
  provider: string | null;
  providerRef: string | null;
  paymentDetails: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
};

export default function CollectionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);

  const [showCreate, setShowCreate] = useState(false);

  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const [planPolicyId, setPlanPolicyId] = useState('');
  const [planPremiumAmount, setPlanPremiumAmount] = useState('');
  const [planCurrency, setPlanCurrency] = useState('IRR');
  const [planIdempotencyKey, setPlanIdempotencyKey] = useState('');
  const [planInstallments, setPlanInstallments] = useState([{ dueDate: '', amount: '' }]);

  const [filterPolicyId, setFilterPolicyId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [busy, setBusy] = useState<string | null>(null);

  const perms = enterprisePermissionsForRoles(getAuthUser()?.roles);
  const canListPlans = hasEnterprisePermission(perms, 'collections:plan_list');
  const canCreatePlan = hasEnterprisePermission(perms, 'collections:plan_create');
  const canViewPlan = hasEnterprisePermission(perms, 'collections:plan_view');
  const canListInstallments = hasEnterprisePermission(perms, 'collections:installment_list');
  const canPayInstallment = hasEnterprisePermission(perms, 'collections:installment_pay');

  function formatMoney(amount: number, currency: string) {
    try {
      const n = Number(amount);
      if (!Number.isFinite(n)) return `${amount} ${currency}`;
      return `${new Intl.NumberFormat('fa-IR').format(n)} ${currency}`;
    } catch {
      return `${amount} ${currency}`;
    }
  }

  function planBadgeClass(status: Plan['status']) {
    if (status === 'active') return 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success';
    if (status === 'completed') return 'border-brand-primary/30 bg-brand-primary-subtle text-brand-primary';
    return 'border-border-default bg-bg-base text-text-secondary';
  }

  function installmentBadgeClass(status: Installment['status']) {
    if (status === 'paid') return 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success';
    if (status === 'pending') return 'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning';
    return 'border-border-default bg-bg-base text-text-secondary';
  }

  async function loadPlans() {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    if (filterPolicyId) qs.set('policyId', filterPolicyId);
    if (filterStatus) qs.set('status', filterStatus);
    try {
      const res = await apiFetch<Plan[]>(`/collections/plans${qs.toString() ? `?${qs.toString()}` : ''}`);
      if (res.success) setPlans(res.data);
      else {
        setError({ message: res.error.message, correlationId: res.correlationId });
        setPlans(MOCK_COLLECTIONS.map(c => ({ ...c, planId: c.planId, premiumAmount: c.totalAmount, currency: 'IRR', status: c.status === 'completed' ? 'completed' : c.status === 'in_progress' ? 'active' : 'active', idempotencyKey: '', meta: null, createdAt: c.createdAt, updatedAt: c.createdAt, installments: [] })) as Plan[]);
      }
    } catch {
      setPlans(MOCK_COLLECTIONS.map(c => ({ ...c, planId: c.planId, premiumAmount: c.totalAmount, currency: 'IRR', status: c.status === 'completed' ? 'completed' : c.status === 'in_progress' ? 'active' : 'active', idempotencyKey: '', meta: null, createdAt: c.createdAt, updatedAt: c.createdAt, installments: [] })) as Plan[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canListPlans) {
      router.replace('/forbidden');
      return;
    }
    if (!planIdempotencyKey) setPlanIdempotencyKey(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
    loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createPlan() {
    setBusy('createPlan');
    setError(null);
    const res = await apiFetch('/collections/plans', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: planIdempotencyKey,
        policyId: planPolicyId,
        premiumAmount: Number(planPremiumAmount),
        currency: planCurrency,
        installments: planInstallments.map((it) => ({ dueDate: it.dueDate, amount: Number(it.amount) })),
        meta: null,
      }),
    });
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    setBusy(null);
    if (res.success) {
      setShowCreate(false);
      setPlanPolicyId('');
      setPlanPremiumAmount('');
      setPlanCurrency('IRR');
      setPlanIdempotencyKey(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
      setPlanInstallments([{ dueDate: '', amount: '' }]);
    }
    await loadPlans();
  }

  async function loadInstallments(planId: string) {
    const res = await apiFetch<Installment[]>(`/collections/installments?planId=${encodeURIComponent(planId)}`);
    if (res.success) setInstallments(res.data);
    else setError({ message: res.error.message, correlationId: res.correlationId });
  }

  async function selectPlan(plan: Plan) {
    setSelectedPlan(plan);
    setInstallments([]);
    if (canListInstallments) {
      await loadInstallments(plan.planId);
    }
  }

  async function payInstallment(installmentId: string) {
    setBusy(installmentId);
    setError(null);
    const res = await apiFetch(`/collections/installments/${encodeURIComponent(installmentId)}/pay`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        provider: 'manual',
        providerRef: String(Date.now()),
        paidAt: new Date().toISOString(),
        details: { by: 'console' },
      }),
    });
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    setBusy(null);
    if (selectedPlan) {
      await loadInstallments(selectedPlan.planId);
      await loadPlans(); // refresh plan status
    }
  }

  function addInstallmentRow() {
    setPlanInstallments([...planInstallments, { dueDate: '', amount: '' }]);
  }

  function updateInstallmentRow(idx: number, field: 'dueDate' | 'amount', value: string) {
    const updated = [...planInstallments];
    updated[idx][field] = value;
    setPlanInstallments(updated);
  }

  function removeInstallmentRow(idx: number) {
    setPlanInstallments(planInstallments.filter((_, i) => i !== idx));
  }

  return (
    <main className="p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-2xl border bg-bg-base p-2">
            <Coins className="h-5 w-5 text-text-secondary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">اقساط و وصول</h1>
            <p className="mt-1 text-sm text-text-muted">طرح‌های قسطی، وضعیت اقساط و ثبت وصول</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={loadPlans} disabled={loading}>
            <RefreshCcw className="h-4 w-4" /> بروزرسانی
          </Button>

          {canCreatePlan ? (
            <Button variant="primary" size="sm" onClick={() => setShowCreate(true)} disabled={loading}>
              <Plus className="h-4 w-4" /> ایجاد طرح
            </Button>
          ) : null}
        </div>
      </div>

      {canCreatePlan && (
        <div
          className={
            showCreate
              ? 'fixed inset-0 z-50 flex items-end justify-center bg-bg-overlay p-4 md:items-center'
              : 'mt-6'
          }
        >
          <div className={showCreate ? 'w-full max-w-3xl rounded-2xl border bg-bg-raised p-4 shadow-xl' : 'rounded-2xl border p-4'}>
            {showCreate ? (
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold">ایجاد طرح قسطی</div>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-bg-base"
                >
                  <X className="h-4 w-4" />
                  بستن
                </button>
              </div>
            ) : (
              <div className="text-sm font-semibold">ایجاد طرح قسطی</div>
            )}
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input className="rounded-xl border px-3 py-2" placeholder="Policy ID" value={planPolicyId} onChange={(e) => setPlanPolicyId(e.target.value)} />
            <input className="rounded-xl border px-3 py-2" placeholder="مبلغ حق بیمه" value={planPremiumAmount} onChange={(e) => setPlanPremiumAmount(e.target.value)} />
            <select className="rounded-xl border px-3 py-2" value={planCurrency} onChange={(e) => setPlanCurrency(e.target.value)}>
              <option value="IRR">IRR</option>
              <option value="USD">USD</option>
            </select>
            <input className="rounded-xl border px-3 py-2" placeholder="Idempotency Key" value={planIdempotencyKey} onChange={(e) => setPlanIdempotencyKey(e.target.value)} />
          </div>
          <div className="mt-3">
            <div className="mb-2 text-sm font-medium">اقساط</div>
            {planInstallments.map((it, idx) => (
              <div key={idx} className="mb-2 flex gap-2">
                <input
                  className="rounded-xl border px-3 py-2"
                  type="date"
                  placeholder="تاریخ سررسید"
                  value={it.dueDate}
                  onChange={(e) => updateInstallmentRow(idx, 'dueDate', e.target.value)}
                />
                <input
                  className="rounded-xl border px-3 py-2"
                  placeholder="مبلغ قسط"
                  value={it.amount}
                  onChange={(e) => updateInstallmentRow(idx, 'amount', e.target.value)}
                />
                <button type="button" onClick={() => removeInstallmentRow(idx)} className="rounded-xl border border-feedback-error/30 bg-feedback-error-subtle px-3 py-2 text-sm text-feedback-error hover:opacity-90">
                  حذف
                </button>
              </div>
            ))}
            <button type="button" onClick={addInstallmentRow} className="mt-2 rounded-xl border px-3 py-2 text-sm hover:bg-bg-base">
              افزودن قسط
            </button>
          </div>
          <button
            type="button"
            onClick={createPlan}
            className="mt-4 rounded-xl bg-brand-primary px-3 py-2 text-sm font-medium text-text-on-brand"
            disabled={!canCreatePlan || busy === 'createPlan' || !planPolicyId || !planPremiumAmount || !planIdempotencyKey || planInstallments.some((it) => !it.dueDate || !it.amount)}
          >
            {busy === 'createPlan' ? 'در حال ثبت' : 'ایجاد طرح'}
          </button>
          </div>
        </div>
      )}

      <Card className="mt-6 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="فیلتر شناسه بیمه‌نامه" value={filterPolicyId} onChange={(e) => setFilterPolicyId(e.target.value)} />
          <select className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">همه وضعیت‌ها</option>
            <option value="active">فعال</option>
            <option value="completed">تکمیل شده</option>
            <option value="cancelled">لغو شده</option>
          </select>
          <Button variant="ghost" size="md" onClick={loadPlans} disabled={loading} fullWidth>
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
        {plans.map((p) => (
          <Card key={p.planId} className="p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold text-text-primary">{p.planId}</div>
                <div className="mt-1 text-xs text-text-muted">بیمه‌نامه: {p.policyId}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${planBadgeClass(p.status)}`}>{p.status}</span>
                  <span className="inline-flex items-center gap-1 rounded-full border bg-bg-raised px-2 py-0.5 text-xs text-text-secondary">
                    <CreditCard className="h-3.5 w-3.5 text-text-muted" />
                    {formatMoney(p.premiumAmount, p.currency)}
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => selectPlan(p)} disabled={!canViewPlan}>
                {selectedPlan?.planId === p.planId ? 'بسته' : 'مشاهده اقساط'}
              </Button>
            </div>
            {selectedPlan?.planId === p.planId && (
              <div className="mt-4 space-y-2">
                <div className="text-sm font-medium">اقساط</div>
                {installments.map((inst) => (
                  <div key={inst.installmentId} className="rounded-xl border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                          <span className="font-medium">قسط {inst.installmentNo}</span>
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${installmentBadgeClass(inst.status)}`}>{inst.status}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            سررسید: {new Date(inst.dueDate).toLocaleDateString('fa-IR')}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <CreditCard className="h-3.5 w-3.5" />
                            مبلغ: {formatMoney(inst.amount, inst.currency)}
                          </span>
                          {inst.paidAt ? <span>پرداخت: {new Date(inst.paidAt).toLocaleDateString('fa-IR')}</span> : null}
                        </div>
                      </div>
                      {inst.status === 'pending' && canPayInstallment && (
                        <Button variant="primary" size="sm" onClick={() => payInstallment(inst.installmentId)} disabled={busy === inst.installmentId}>
                          {busy === inst.installmentId ? 'در حال ثبت' : 'ثبت وصول'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {installments.length === 0 && <div className="text-xs text-text-muted">موردی یافت نشد.</div>}
              </div>
            )}
          </Card>
        ))}
        {!loading && plans.length === 0 ? (
          <div className="text-center py-12">
            <Coins className="mx-auto h-12 w-12 text-text-muted opacity-50" />
            <p className="mt-3 text-sm text-text-muted">طرح قسطی یافت نشد.</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
