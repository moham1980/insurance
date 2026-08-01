'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, ChevronLeft, Plus, Pencil } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';
import { Button, Card } from '@insurance/design-system';
import { cn } from '@/lib/cn';

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

const statusStyles: Record<string, string> = {
  active: 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success',
  expired: 'border-feedback-error/30 bg-feedback-error-subtle text-feedback-error',
  pending: 'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning',
  cancelled: 'border-border-default bg-bg-base text-text-muted',
};

const statusLabels: Record<string, string> = {
  active: 'فعال',
  expired: 'منقضی',
  pending: 'در انتظار',
  cancelled: 'لغو شده',
};

const typeStyles: Record<string, string> = {
  quota_share: 'border-brand-primary/30 bg-brand-primary-subtle text-brand-primary',
  excess_of_loss: 'border-brand-secondary/30 bg-brand-secondary-subtle text-brand-secondary',
  stop_loss: 'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning',
  facultative: 'border-brand-accent/30 bg-brand-accent-subtle text-brand-accent',
};

const typeLabels: Record<string, string> = {
  quota_share: 'سهمی (Quota Share)',
  excess_of_loss: 'فراتر از زیان (Excess of Loss)',
  stop_loss: 'توقف زیان (Stop Loss)',
  facultative: 'اختیاری (Facultative)',
};

const mockContracts: ReinsuranceContractRow[] = [
  {
    contractId: 'rc-001', contractNumber: 'RC-1403-001', contractType: 'quota_share',
    reinsurerName: 'بیمه اتکایی مرکزی', reinsurerCode: 'RE-1001', status: 'active',
    effectiveDate: '2024-03-21', expiryDate: '2025-03-21', retentionLimit: 5000000000,
    retentionLimitCurrency: 'IRR', sharePercentage: 40, premiumRate: 15.5, deductible: 200000000,
    deductibleCurrency: 'IRR', coverageLines: ['خودرو', 'آتش‌سوزی'], territories: ['ایران'],
    brokerName: 'کارگزاری بیمه ایران', brokerCommission: 5, createdAt: '2024-03-15', updatedAt: '2024-03-15',
  },
  {
    contractId: 'rc-002', contractNumber: 'RC-1403-002', contractType: 'excess_of_loss',
    reinsurerName: 'بیمه اتکازی آسیا', reinsurerCode: 'RE-1002', status: 'active',
    effectiveDate: '2024-04-01', expiryDate: '2025-04-01', retentionLimit: 3000000000,
    retentionLimitCurrency: 'IRR', sharePercentage: 30, premiumRate: 12.0, deductible: 150000000,
    deductibleCurrency: 'IRR', coverageLines: ['حوادث', 'درمان'], territories: ['ایران'],
    brokerName: null, brokerCommission: 0, createdAt: '2024-03-20', updatedAt: '2024-03-20',
  },
  {
    contractId: 'rc-003', contractNumber: 'RC-1403-003', contractType: 'facultative',
    reinsurerName: 'مونیخ ری', reinsurerCode: 'RE-2001', status: 'pending',
    effectiveDate: '2024-06-01', expiryDate: '2025-06-01', retentionLimit: 10000000000,
    retentionLimitCurrency: 'IRR', sharePercentage: 25, premiumRate: 18.0, deductible: 500000000,
    deductibleCurrency: 'IRR', coverageLines: ['مهندسی', 'پروژه‌های بزرگ'], territories: ['ایران', 'جهانی'],
    brokerName: 'کارگزاری بین‌المللی', brokerCommission: 8, createdAt: '2024-05-15', updatedAt: '2024-05-15',
  },
];

function Drawer(props: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-bg-overlay" onClick={props.onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-auto rounded-t-3xl border border-border-default bg-bg-raised p-4 shadow-2xl md:inset-y-0 md:right-0 md:left-auto md:bottom-auto md:h-full md:max-h-none md:w-[520px] md:rounded-none md:border-l">
        <div className="flex items-center justify-between gap-3 border-b border-border-default pb-3">
          <div className="text-body-sm font-semibold text-text-primary">{props.title}</div>
          <button type="button" className="rounded-xl border border-border-default px-3 py-2 text-sm text-text-secondary hover:bg-bg-base" onClick={props.onClose}>
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
    else { setError({ message: res.error.message, correlationId: res.correlationId }); setRows(mockContracts); }
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

  const filteredRows = rows.filter(c => {
    if (status && c.status !== status) return false;
    if (contractType && c.contractType !== contractType) return false;
    if (q) {
      const ql = q.toLowerCase();
      if (!c.contractNumber.toLowerCase().includes(ql) && !c.reinsurerName.toLowerCase().includes(ql) && !c.reinsurerCode.toLowerCase().includes(ql)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-bg-base" dir="rtl">
      <header className="sticky top-0 z-10 border-b border-border-default bg-bg-raised shadow-1">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
              <ChevronLeft className="h-5 w-5" />
              بازگشت
            </Button>
            <h1 className="text-h3 font-bold text-text-primary">قراردادهای اتکایی</h1>
          </div>
          <div className="flex gap-2">
            {canCreate && (
              <Button size="sm" onClick={openCreateContract}>
                <Plus className="h-4 w-4" />
                ایجاد قرارداد جدید
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={load} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              بروزرسانی
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        {error && (
          <div className="rounded-lg border border-feedback-warning/30 bg-feedback-warning-subtle p-3 text-body-sm text-feedback-warning">
            در حال نمایش داده‌های نمونه — ارتباط با سرور برقرار نشد
          </div>
        )}

        <Card className="p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <select className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">همه وضعیت‌ها</option>
              <option value="active">فعال</option>
              <option value="expired">منقضی</option>
              <option value="pending">در انتظار</option>
              <option value="cancelled">لغو شده</option>
            </select>
            <select className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary" value={contractType} onChange={(e) => setContractType(e.target.value)}>
              <option value="">همه انواع</option>
              <option value="quota_share">سهمی (Quota Share)</option>
              <option value="excess_of_loss">فراتر از زیان (Excess of Loss)</option>
              <option value="stop_loss">توقف زیان (Stop Loss)</option>
              <option value="facultative">اختیاری (Facultative)</option>
            </select>
            <input className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary placeholder:text-text-muted" placeholder="جستجو (شماره، اتکایی)" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button size="sm" variant="secondary" onClick={load} disabled={loading}>اعمال فیلتر</Button>
          </div>
        </Card>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-primary" />
          </div>
        ) : filteredRows.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-text-muted">موردی یافت نشد.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredRows.map((contract) => (
              <Card key={contract.contractId} className="p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-body-sm font-semibold text-text-primary">{contract.contractNumber}</span>
                      <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', typeStyles[contract.contractType])}>
                        {typeLabels[contract.contractType]}
                      </span>
                      <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', statusStyles[contract.status] || 'border-border-default bg-bg-base text-text-muted')}>
                        {statusLabels[contract.status] || contract.status}
                      </span>
                    </div>
                    <div className="text-body-xs text-text-muted">
                      اتکایی: {contract.reinsurerName} ({contract.reinsurerCode})
                    </div>
                    <div className="text-body-xs text-text-muted">
                      سهم: {contract.sharePercentage}% | نرخ پریمیوم: {contract.premiumRate}%
                    </div>
                    <div className="text-body-xs text-text-muted">
                      حد نگهداری: {contract.retentionLimit.toLocaleString('fa-IR')} {contract.retentionLimitCurrency}
                    </div>
                    <div className="text-body-xs text-text-muted">
                      اعتبار: {new Date(contract.effectiveDate).toLocaleDateString('fa-IR')} تا {new Date(contract.expiryDate).toLocaleDateString('fa-IR')}
                    </div>
                    {contract.brokerName && (
                      <div className="text-body-xs text-text-muted">
                        کارگزار: {contract.brokerName} | کمیسیون: {contract.brokerCommission}%
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canEdit && (
                      <Button size="sm" variant="secondary" onClick={() => openEditContract(contract)}>
                        <Pencil className="h-4 w-4" />
                        ویرایش
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Drawer open={contractDrawerOpen} title={contractFormMode === 'create' ? 'ایجاد قرارداد جدید' : 'ویرایش قرارداد'} onClose={() => setContractDrawerOpen(false)}>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="text-body-xs text-text-muted">شماره قرارداد *</span>
              <input className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary" value={contractForm.contractNumber} onChange={(e) => setContractForm({ ...contractForm, contractNumber: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-body-xs text-text-muted">نوع قرارداد *</span>
              <select
                className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary"
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
              <span className="text-body-xs text-text-muted">نام اتکایی *</span>
              <input className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary" value={contractForm.reinsurerName} onChange={(e) => setContractForm({ ...contractForm, reinsurerName: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-body-xs text-text-muted">کد اتکایی *</span>
              <input className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary" value={contractForm.reinsurerCode} onChange={(e) => setContractForm({ ...contractForm, reinsurerCode: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-body-xs text-text-muted">وضعیت *</span>
              <select
                className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary"
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
              <span className="text-body-xs text-text-muted">نام کارگزار</span>
              <input className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary" value={contractForm.brokerName} onChange={(e) => setContractForm({ ...contractForm, brokerName: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-body-xs text-text-muted">تاریخ شروع *</span>
              <input className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary" type="date" value={contractForm.effectiveDate} onChange={(e) => setContractForm({ ...contractForm, effectiveDate: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-body-xs text-text-muted">تاریخ پایان *</span>
              <input className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary" type="date" value={contractForm.expiryDate} onChange={(e) => setContractForm({ ...contractForm, expiryDate: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-body-xs text-text-muted">حد نگهداری</span>
              <input className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary" type="number" value={contractForm.retentionLimit} onChange={(e) => setContractForm({ ...contractForm, retentionLimit: parseFloat(e.target.value) || 0 })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-body-xs text-text-muted">ارز نگهداری</span>
              <select className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary" value={contractForm.retentionLimitCurrency} onChange={(e) => setContractForm({ ...contractForm, retentionLimitCurrency: e.target.value })}>
                <option value="IRR">ریال</option>
                <option value="USD">دلار</option>
                <option value="EUR">یورو</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-body-xs text-text-muted">درصد سهم (%)</span>
              <input className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary" type="number" step="0.01" value={contractForm.sharePercentage} onChange={(e) => setContractForm({ ...contractForm, sharePercentage: parseFloat(e.target.value) || 0 })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-body-xs text-text-muted">نرخ پریمیوم (%)</span>
              <input className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary" type="number" step="0.01" value={contractForm.premiumRate} onChange={(e) => setContractForm({ ...contractForm, premiumRate: parseFloat(e.target.value) || 0 })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-body-xs text-text-muted">فرانشیز</span>
              <input className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary" type="number" value={contractForm.deductible} onChange={(e) => setContractForm({ ...contractForm, deductible: parseFloat(e.target.value) || 0 })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-body-xs text-text-muted">ارز فرانشیز</span>
              <select className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary" value={contractForm.deductibleCurrency} onChange={(e) => setContractForm({ ...contractForm, deductibleCurrency: e.target.value })}>
                <option value="IRR">ریال</option>
                <option value="USD">دلار</option>
                <option value="EUR">یورو</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-body-xs text-text-muted">کمیسیون کارگزار (%)</span>
              <input className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary" type="number" step="0.01" value={contractForm.brokerCommission} onChange={(e) => setContractForm({ ...contractForm, brokerCommission: parseFloat(e.target.value) || 0 })} />
            </label>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={saveContract}
              disabled={contractSaving || !contractForm.contractNumber || !contractForm.reinsurerName || !contractForm.reinsurerCode || !contractForm.effectiveDate || !contractForm.expiryDate}
            >
              {contractSaving ? 'در حال ذخیره...' : contractFormMode === 'create' ? 'ایجاد قرارداد' : 'ذخیره تغییرات'}
            </Button>
            <Button variant="secondary" onClick={() => setContractDrawerOpen(false)}>انصراف</Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
