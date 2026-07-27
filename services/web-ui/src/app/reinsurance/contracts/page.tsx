'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';

type ReinsuranceContractRow = {
  contractId: string;
  contractNumber: string;
  contractType: 'quota_share' | 'excess_of_loss' | 'stop_loss' | 'facultative';
  reinsurerName: string;
  reinsurerCode: string;
  status: 'active' | 'expired' | 'pending' | 'cancelled';
  effectiveDate: string;
  expiryDate: string;
  retentionLimit: number;
  retentionLimitCurrency: string;
  sharePercentage: number;
  premiumRate: number;
  deductible: number;
  deductibleCurrency: string;
  coverageLines: string[];
  territories: string[];
  brokerName: string | null;
  brokerCommission: number;
  createdAt: string;
  updatedAt: string;
};

const statusColor: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-rose-100 text-rose-700',
  pending: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-neutral-100 text-neutral-700',
};

const typeColor: Record<string, string> = {
  quota_share: 'bg-blue-100 text-blue-700',
  excess_of_loss: 'bg-purple-100 text-purple-700',
  stop_loss: 'bg-orange-100 text-orange-700',
  facultative: 'bg-teal-100 text-teal-700',
};

function Drawer(props: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={props.onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-auto rounded-t-3xl border bg-white p-4 shadow-2xl md:inset-y-0 md:right-0 md:left-auto md:bottom-auto md:h-full md:max-h-none md:w-[520px] md:rounded-none md:border-l">
        <div className="flex items-center justify-between gap-3 border-b pb-3">
          <div className="text-sm font-semibold">{props.title}</div>
          <button type="button" className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" onClick={props.onClose}>
            بستن
          </button>
        </div>
        <div className="pt-4">{props.children}</div>
      </div>
    </div>
  );
}

export default function ReinsuranceContractsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ReinsuranceContractRow[]>([]);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const perms = enterprisePermissionsForRoles(getAuthUser()?.roles);
  const canList = hasEnterprisePermission(perms, 'sales_network:contracts:view');
  const canCreate = hasEnterprisePermission(perms, 'sales_network:contracts:manage');
  const canEdit = hasEnterprisePermission(perms, 'sales_network:contracts:manage');

  const [status, setStatus] = useState('');
  const [contractType, setContractType] = useState('');
  const [q, setQ] = useState('');

  const [contractDrawerOpen, setContractDrawerOpen] = useState(false);
  const [contractFormMode, setContractFormMode] = useState<'create' | 'edit'>('create');
  const [contractEditingId, setContractEditingId] = useState<string>('');
  const [contractForm, setContractForm] = useState({
    contractNumber: '',
    contractType: 'quota_share' as 'quota_share' | 'excess_of_loss' | 'stop_loss' | 'facultative',
    reinsurerName: '',
    reinsurerCode: '',
    status: 'active' as 'active' | 'expired' | 'pending' | 'cancelled',
    effectiveDate: '',
    expiryDate: '',
    retentionLimit: 0,
    retentionLimitCurrency: 'IRR',
    sharePercentage: 0,
    premiumRate: 0,
    deductible: 0,
    deductibleCurrency: 'IRR',
    coverageLines: [] as string[],
    territories: [] as string[],
    brokerName: '',
    brokerCommission: 0,
  });
  const [contractSaving, setContractSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    if (contractType) qs.set('contractType', contractType);
    if (q) qs.set('q', q);

    const res = await apiFetch<ReinsuranceContractRow[]>(`/reinsurance/contracts${qs.toString() ? `?${qs.toString()}` : ''}`);
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

  function openCreateContract() {
    setContractFormMode('create');
    setContractEditingId('');
    setContractForm({
      contractNumber: '',
      contractType: 'quota_share',
      reinsurerName: '',
      reinsurerCode: '',
      status: 'active',
      effectiveDate: '',
      expiryDate: '',
      retentionLimit: 0,
      retentionLimitCurrency: 'IRR',
      sharePercentage: 0,
      premiumRate: 0,
      deductible: 0,
      deductibleCurrency: 'IRR',
      coverageLines: [],
      territories: [],
      brokerName: '',
      brokerCommission: 0,
    });
    setContractDrawerOpen(true);
  }

  function openEditContract(contract: ReinsuranceContractRow) {
    setContractFormMode('edit');
    setContractEditingId(contract.contractId);
    setContractForm({
      contractNumber: contract.contractNumber,
      contractType: contract.contractType,
      reinsurerName: contract.reinsurerName,
      reinsurerCode: contract.reinsurerCode,
      status: contract.status,
      effectiveDate: contract.effectiveDate,
      expiryDate: contract.expiryDate,
      retentionLimit: contract.retentionLimit,
      retentionLimitCurrency: contract.retentionLimitCurrency,
      sharePercentage: contract.sharePercentage,
      premiumRate: contract.premiumRate,
      deductible: contract.deductible,
      deductibleCurrency: contract.deductibleCurrency,
      coverageLines: contract.coverageLines,
      territories: contract.territories,
      brokerName: contract.brokerName || '',
      brokerCommission: contract.brokerCommission,
    });
    setContractDrawerOpen(true);
  }

  async function saveContract() {
    setContractSaving(true);
    setError(null);

    try {
      if (contractFormMode === 'create') {
        const res = await apiFetch<ReinsuranceContractRow>('/reinsurance/contracts', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(contractForm),
        });
        if (!res.success) {
          setError({ message: res.error.message, correlationId: res.correlationId });
          return;
        }
      } else {
        const res = await apiFetch<ReinsuranceContractRow>(`/reinsurance/contracts/${contractEditingId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(contractForm),
        });
        if (!res.success) {
          setError({ message: res.error.message, correlationId: res.correlationId });
          return;
        }
      }

      setContractDrawerOpen(false);
      await load();
    } finally {
      setContractSaving(false);
    }
  }

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">مدیریت قراردادهای اتکایی</h1>
          <p className="mt-1 text-sm text-neutral-600">ایجاد، ویرایش و مدیریت قراردادهای اتکایی و bordereaux</p>
        </div>
        <div className="flex gap-2">
          {canCreate && (
            <button type="button" onClick={openCreateContract} className="rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-800">
              ایجاد قرارداد جدید
            </button>
          )}
          <button type="button" onClick={load} className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" disabled={loading}>
            بروزرسانی
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <select className="rounded-xl border bg-white px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">همه وضعیت‌ها</option>
          <option value="active">فعال</option>
          <option value="expired">منقضی</option>
          <option value="pending">در انتظار</option>
          <option value="cancelled">لغو شده</option>
        </select>
        <select className="rounded-xl border bg-white px-3 py-2" value={contractType} onChange={(e) => setContractType(e.target.value)}>
          <option value="">همه انواع</option>
          <option value="quota_share">سهمی (Quota Share)</option>
          <option value="excess_of_loss">فراتر از زیان (Excess of Loss)</option>
          <option value="stop_loss">توقف زیان (Stop Loss)</option>
          <option value="facultative">اختیاری (Facultative)</option>
        </select>
        <input className="rounded-xl border px-3 py-2" placeholder="جستجو (شماره، اتکایی)" value={q} onChange={(e) => setQ(e.target.value)} />
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
        {rows.map((contract) => (
          <div key={contract.contractId} className="rounded-2xl border p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{contract.contractNumber}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${typeColor[contract.contractType]}`}>
                    {contract.contractType}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[contract.status] || 'bg-neutral-100 text-neutral-700'}`}>
                    {contract.status}
                  </span>
                </div>
                <div className="mt-1 text-xs text-neutral-600">
                  اتکایی: {contract.reinsurerName} ({contract.reinsurerCode})
                </div>
                <div className="mt-1 text-xs text-neutral-600">
                  سهم: {contract.sharePercentage}% | نرخ پریمیوم: {contract.premiumRate}%
                </div>
                <div className="mt-1 text-xs text-neutral-600">
                  حد نگهداری: {contract.retentionLimit.toLocaleString()} {contract.retentionLimitCurrency}
                </div>
                <div className="mt-1 text-xs text-neutral-600">
                  اعتبار: {new Date(contract.effectiveDate).toLocaleDateString('fa-IR')} تا {new Date(contract.expiryDate).toLocaleDateString('fa-IR')}
                </div>
                {contract.brokerName && (
                  <div className="mt-1 text-xs text-neutral-600">
                    کارگزار: {contract.brokerName} | کمیسیون: {contract.brokerCommission}%
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => openEditContract(contract)}
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
                  >
                    ویرایش
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {!loading && rows.length === 0 ? <div className="text-sm text-neutral-600">موردی یافت نشد.</div> : null}
      </div>

      <Drawer open={contractDrawerOpen} title={contractFormMode === 'create' ? 'ایجاد قرارداد جدید' : 'ویرایش قرارداد'} onClose={() => setContractDrawerOpen(false)}>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">شماره قرارداد *</span>
              <input className="rounded-xl border px-3 py-2" value={contractForm.contractNumber} onChange={(e) => setContractForm({ ...contractForm, contractNumber: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">نوع قرارداد *</span>
              <select
                className="rounded-xl border px-3 py-2"
                value={contractForm.contractType}
                onChange={(e) => setContractForm({ ...contractForm, contractType: e.target.value as any })}
              >
                <option value="quota_share">سهمی (Quota Share)</option>
                <option value="excess_of_loss">فراتر از زیان (Excess of Loss)</option>
                <option value="stop_loss">توقف زیان (Stop Loss)</option>
                <option value="facultative">اختیاری (Facultative)</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">نام اتکایی *</span>
              <input className="rounded-xl border px-3 py-2" value={contractForm.reinsurerName} onChange={(e) => setContractForm({ ...contractForm, reinsurerName: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">کد اتکایی *</span>
              <input className="rounded-xl border px-3 py-2" value={contractForm.reinsurerCode} onChange={(e) => setContractForm({ ...contractForm, reinsurerCode: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">وضعیت *</span>
              <select
                className="rounded-xl border px-3 py-2"
                value={contractForm.status}
                onChange={(e) => setContractForm({ ...contractForm, status: e.target.value as any })}
              >
                <option value="active">فعال</option>
                <option value="expired">منقضی</option>
                <option value="pending">در انتظار</option>
                <option value="cancelled">لغو شده</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">نام کارگزار</span>
              <input className="rounded-xl border px-3 py-2" value={contractForm.brokerName} onChange={(e) => setContractForm({ ...contractForm, brokerName: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">تاریخ شروع *</span>
              <input className="rounded-xl border px-3 py-2" type="date" value={contractForm.effectiveDate} onChange={(e) => setContractForm({ ...contractForm, effectiveDate: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">تاریخ پایان *</span>
              <input className="rounded-xl border px-3 py-2" type="date" value={contractForm.expiryDate} onChange={(e) => setContractForm({ ...contractForm, expiryDate: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">حد نگهداری</span>
              <input className="rounded-xl border px-3 py-2" type="number" value={contractForm.retentionLimit} onChange={(e) => setContractForm({ ...contractForm, retentionLimit: parseFloat(e.target.value) || 0 })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">ارز نگهداری</span>
              <select className="rounded-xl border px-3 py-2" value={contractForm.retentionLimitCurrency} onChange={(e) => setContractForm({ ...contractForm, retentionLimitCurrency: e.target.value })}>
                <option value="IRR">ریال</option>
                <option value="USD">دلار</option>
                <option value="EUR">یورو</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">درصد سهم (%)</span>
              <input className="rounded-xl border px-3 py-2" type="number" step="0.01" value={contractForm.sharePercentage} onChange={(e) => setContractForm({ ...contractForm, sharePercentage: parseFloat(e.target.value) || 0 })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">نرخ پریمیوم (%)</span>
              <input className="rounded-xl border px-3 py-2" type="number" step="0.01" value={contractForm.premiumRate} onChange={(e) => setContractForm({ ...contractForm, premiumRate: parseFloat(e.target.value) || 0 })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">فرانشیز</span>
              <input className="rounded-xl border px-3 py-2" type="number" value={contractForm.deductible} onChange={(e) => setContractForm({ ...contractForm, deductible: parseFloat(e.target.value) || 0 })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">ارز فرانشیز</span>
              <select className="rounded-xl border px-3 py-2" value={contractForm.deductibleCurrency} onChange={(e) => setContractForm({ ...contractForm, deductibleCurrency: e.target.value })}>
                <option value="IRR">ریال</option>
                <option value="USD">دلار</option>
                <option value="EUR">یورو</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">کمیسیون کارگزار (%)</span>
              <input className="rounded-xl border px-3 py-2" type="number" step="0.01" value={contractForm.brokerCommission} onChange={(e) => setContractForm({ ...contractForm, brokerCommission: parseFloat(e.target.value) || 0 })} />
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveContract}
              disabled={contractSaving || !contractForm.contractNumber || !contractForm.reinsurerName || !contractForm.reinsurerCode || !contractForm.effectiveDate || !contractForm.expiryDate}
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {contractSaving ? 'در حال ذخیره...' : contractFormMode === 'create' ? 'ایجاد قرارداد' : 'ذخیره تغییرات'}
            </button>
            <button type="button" onClick={() => setContractDrawerOpen(false)} className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50">
              انصراف
            </button>
          </div>
        </div>
      </Drawer>
    </main>
  );
}
