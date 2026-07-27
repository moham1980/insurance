'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';
import { BulkActions } from '@/components/bulk-actions';
import { LoadingOverlay } from '@/components/loading-spinner';

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

    // Use Read Model endpoint for list (avoids fan-out per Enterprise Blueprint)
    const res = await apiFetch<ClaimRow[]>(`/rm/claims${qs.toString() ? `?${qs.toString()}` : ''}`);
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

  async function create() {
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

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Claims (خسارت‌ها)</h1>
          <p className="mt-1 text-sm text-neutral-600">لیست و ثبت ادعای خسارت</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" disabled={loading}>
            بروزرسانی
          </button>
          {canRegister ? (
            <button type="button" onClick={() => setShowCreate(true)} className="rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-800">
              + ثبت خسارت
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <input className="rounded-xl border px-3 py-2" placeholder="status" value={status} onChange={(e) => setStatus(e.target.value)} />
        <input className="rounded-xl border px-3 py-2" placeholder="policyId" value={policyId} onChange={(e) => setPolicyId(e.target.value)} />
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

      {showCreate && canRegister ? (
        <div className="mt-6 rounded-2xl border p-4">
          <h3 className="font-semibold">ثبت خسارت جدید</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input className="rounded-xl border px-3 py-2" placeholder="policyId (required)" value={form.policyId} onChange={(e) => setForm({ ...form, policyId: e.target.value })} />
            <input className="rounded-xl border px-3 py-2" placeholder="claimantPartyId (required)" value={form.claimantPartyId} onChange={(e) => setForm({ ...form, claimantPartyId: e.target.value })} />
            <input className="rounded-xl border px-3 py-2" type="date" placeholder="lossDate" value={form.lossDate} onChange={(e) => setForm({ ...form, lossDate: e.target.value })} />
            <select className="rounded-xl border px-3 py-2" value={form.lossType} onChange={(e) => setForm({ ...form, lossType: e.target.value })}>
              <option value="accident">Accident</option>
              <option value="theft">Theft</option>
              <option value="fire">Fire</option>
              <option value="natural_disaster">Natural Disaster</option>
              <option value="third_party">Third Party</option>
              <option value="medical">Medical</option>
              <option value="other">Other</option>
            </select>
            <textarea className="rounded-xl border px-3 py-2 md:col-span-2" placeholder="description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={create} disabled={creating} className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50">
              {creating ? 'در حال ثبت...' : 'ثبت'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50">
              انصراف
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={selectedClaims.size === rows.length && rows.length > 0}
            onChange={handleSelectAll}
            className="rounded"
          />
          <span className="text-neutral-600">انتخاب همه</span>
        </div>
        {rows.map((c) => (
          <div key={c.claimId} className="rounded-2xl border p-4 hover:bg-neutral-50">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedClaims.has(c.claimId)}
                  onChange={() => handleSelectClaim(c.claimId)}
                  className="rounded mt-1"
                />
                <div className="flex-1 cursor-pointer" onClick={() => router.push(`/claims/${c.claimId}`)}>
                  <div className="text-sm font-semibold">{c.claimNumber}</div>
                  <div className="mt-1 text-xs text-neutral-600">lossType: {c.lossType || '—'} | status: {c.status}</div>
                  <div className="mt-1 text-xs text-neutral-600">claimId: {c.claimId}</div>
                  <div className="mt-1 text-xs text-neutral-600">claimantPartyId: {c.claimantPartyId || '—'} | policyId: {c.policyId}</div>
                  <div className="mt-1 text-xs text-neutral-600">lossDate: {c.lossDate || '—'}</div>
                  {typeof c.assessedAmount === 'number' ? <div className="mt-1 text-xs text-neutral-600">assessed: {c.assessedAmount}</div> : null}
                  {typeof c.approvedAmount === 'number' ? <div className="mt-1 text-xs text-neutral-600">approved: {c.approvedAmount}</div> : null}
                </div>
              </div>
              <div className="text-sm text-neutral-400 cursor-pointer" onClick={() => router.push(`/claims/${c.claimId}`)}>مشاهده جزئیات ←</div>
            </div>
          </div>
        ))}
        {!loading && rows.length === 0 ? <div className="text-sm text-neutral-600">موردی یافت نشد.</div> : null}
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
