'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';

type PartnerRow = {
  partnerId: string;
  partnerType: 'agency' | 'broker';
  partnerCode: string;
  legalName: string;
  tradeName: string;
  nationalId: string;
  registrationNumber: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  commissionRate: number;
  creditLimit: number;
  contractStartDate: string;
  contractEndDate: string;
  createdAt: string;
  updatedAt: string;
};

const statusColor: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-rose-100 text-rose-700',
  suspended: 'bg-amber-100 text-amber-700',
  pending: 'bg-neutral-100 text-neutral-700',
};

const typeColor: Record<string, string> = {
  agency: 'bg-blue-100 text-blue-700',
  broker: 'bg-purple-100 text-purple-700',
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

export default function PartnersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PartnerRow[]>([]);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const perms = enterprisePermissionsForRoles(getAuthUser()?.roles);
  const canList = hasEnterprisePermission(perms, 'sales_network:partners:view');
  const canCreate = hasEnterprisePermission(perms, 'sales_network:partners:manage');
  const canEdit = hasEnterprisePermission(perms, 'sales_network:partners:manage');

  const [status, setStatus] = useState('');
  const [partnerType, setPartnerType] = useState('');
  const [q, setQ] = useState('');

  const [partnerDrawerOpen, setPartnerDrawerOpen] = useState(false);
  const [partnerFormMode, setPartnerFormMode] = useState<'create' | 'edit'>('create');
  const [partnerEditingId, setPartnerEditingId] = useState<string>('');
  const [partnerForm, setPartnerForm] = useState({
    partnerType: 'agency' as 'agency' | 'broker',
    partnerCode: '',
    legalName: '',
    tradeName: '',
    nationalId: '',
    registrationNumber: '',
    status: 'active' as 'active' | 'inactive' | 'suspended' | 'pending',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    commissionRate: 0,
    creditLimit: 0,
    contractStartDate: '',
    contractEndDate: '',
  });
  const [partnerSaving, setPartnerSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    if (partnerType) qs.set('partnerType', partnerType);
    if (q) qs.set('q', q);

    const res = await apiFetch<PartnerRow[]>(`/sales-network/partners${qs.toString() ? `?${qs.toString()}` : ''}`);
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

  function openCreatePartner() {
    setPartnerFormMode('create');
    setPartnerEditingId('');
    setPartnerForm({
      partnerType: 'agency',
      partnerCode: '',
      legalName: '',
      tradeName: '',
      nationalId: '',
      registrationNumber: '',
      status: 'active',
      contactPerson: '',
      contactPhone: '',
      contactEmail: '',
      address: '',
      city: '',
      province: '',
      postalCode: '',
      commissionRate: 0,
      creditLimit: 0,
      contractStartDate: '',
      contractEndDate: '',
    });
    setPartnerDrawerOpen(true);
  }

  function openEditPartner(partner: PartnerRow) {
    setPartnerFormMode('edit');
    setPartnerEditingId(partner.partnerId);
    setPartnerForm({
      partnerType: partner.partnerType,
      partnerCode: partner.partnerCode,
      legalName: partner.legalName,
      tradeName: partner.tradeName,
      nationalId: partner.nationalId,
      registrationNumber: partner.registrationNumber,
      status: partner.status,
      contactPerson: partner.contactPerson,
      contactPhone: partner.contactPhone,
      contactEmail: partner.contactEmail,
      address: partner.address,
      city: partner.city,
      province: partner.province,
      postalCode: partner.postalCode,
      commissionRate: partner.commissionRate,
      creditLimit: partner.creditLimit,
      contractStartDate: partner.contractStartDate,
      contractEndDate: partner.contractEndDate,
    });
    setPartnerDrawerOpen(true);
  }

  async function savePartner() {
    setPartnerSaving(true);
    setError(null);

    try {
      if (partnerFormMode === 'create') {
        const res = await apiFetch<PartnerRow>('/sales-network/partners', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(partnerForm),
        });
        if (!res.success) {
          setError({ message: res.error.message, correlationId: res.correlationId });
          return;
        }
      } else {
        const res = await apiFetch<PartnerRow>(`/sales-network/partners/${partnerEditingId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(partnerForm),
        });
        if (!res.success) {
          setError({ message: res.error.message, correlationId: res.correlationId });
          return;
        }
      }

      setPartnerDrawerOpen(false);
      await load();
    } finally {
      setPartnerSaving(false);
    }
  }

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">مدیریت نمایندگی‌ها و کارگزاران</h1>
          <p className="mt-1 text-sm text-neutral-600">ایجاد، ویرایش و مدیریت شریک‌های فروش</p>
        </div>
        <div className="flex gap-2">
          {canCreate && (
            <button type="button" onClick={openCreatePartner} className="rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-800">
              ایجاد شریک جدید
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
          <option value="inactive">غیرفعال</option>
          <option value="suspended">معلق</option>
          <option value="pending">در انتظار</option>
        </select>
        <select className="rounded-xl border bg-white px-3 py-2" value={partnerType} onChange={(e) => setPartnerType(e.target.value)}>
          <option value="">همه انواع</option>
          <option value="agency">نمایندگی</option>
          <option value="broker">کارگزار</option>
        </select>
        <input className="rounded-xl border px-3 py-2" placeholder="جستجو (نام، کد، ملی)" value={q} onChange={(e) => setQ(e.target.value)} />
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
        {rows.map((partner) => (
          <div key={partner.partnerId} className="rounded-2xl border p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{partner.tradeName}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${typeColor[partner.partnerType]}`}>
                    {partner.partnerType === 'agency' ? 'نمایندگی' : 'کارگزار'}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[partner.status] || 'bg-neutral-100 text-neutral-700'}`}>
                    {partner.status}
                  </span>
                </div>
                <div className="mt-1 text-xs text-neutral-600">
                  کد: {partner.partnerCode} | نام حقوقی: {partner.legalName}
                </div>
                <div className="mt-1 text-xs text-neutral-600">
                  ملی: {partner.nationalId} | ثبت: {partner.registrationNumber}
                </div>
                <div className="mt-1 text-xs text-neutral-600">
                  تماس: {partner.contactPerson} ({partner.contactPhone})
                </div>
                <div className="mt-1 text-xs text-neutral-600">
                  شهر: {partner.city}, {partner.province}
                </div>
                <div className="mt-1 text-xs text-neutral-600">
                  کمیسیون: {partner.commissionRate}% | سقف اعتبار: {partner.creditLimit.toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-neutral-600">
                  قرارداد: {new Date(partner.contractStartDate).toLocaleDateString('fa-IR')} تا {new Date(partner.contractEndDate).toLocaleDateString('fa-IR')}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => openEditPartner(partner)}
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

      <Drawer open={partnerDrawerOpen} title={partnerFormMode === 'create' ? 'ایجاد شریک جدید' : 'ویرایش شریک'} onClose={() => setPartnerDrawerOpen(false)}>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">نوع شریک *</span>
              <select
                className="rounded-xl border px-3 py-2"
                value={partnerForm.partnerType}
                onChange={(e) => setPartnerForm({ ...partnerForm, partnerType: e.target.value as 'agency' | 'broker' })}
              >
                <option value="agency">نمایندگی</option>
                <option value="broker">کارگزار</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">کد شریک *</span>
              <input className="rounded-xl border px-3 py-2" value={partnerForm.partnerCode} onChange={(e) => setPartnerForm({ ...partnerForm, partnerCode: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">نام تجاری *</span>
              <input className="rounded-xl border px-3 py-2" value={partnerForm.tradeName} onChange={(e) => setPartnerForm({ ...partnerForm, tradeName: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">نام حقوقی *</span>
              <input className="rounded-xl border px-3 py-2" value={partnerForm.legalName} onChange={(e) => setPartnerForm({ ...partnerForm, legalName: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">کدملی *</span>
              <input className="rounded-xl border px-3 py-2" value={partnerForm.nationalId} onChange={(e) => setPartnerForm({ ...partnerForm, nationalId: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">شماره ثبت *</span>
              <input className="rounded-xl border px-3 py-2" value={partnerForm.registrationNumber} onChange={(e) => setPartnerForm({ ...partnerForm, registrationNumber: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">وضعیت *</span>
              <select
                className="rounded-xl border px-3 py-2"
                value={partnerForm.status}
                onChange={(e) => setPartnerForm({ ...partnerForm, status: e.target.value as 'active' | 'inactive' | 'suspended' | 'pending' })}
              >
                <option value="active">فعال</option>
                <option value="inactive">غیرفعال</option>
                <option value="suspended">معلق</option>
                <option value="pending">در انتظار</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">نام شخص تماس *</span>
              <input className="rounded-xl border px-3 py-2" value={partnerForm.contactPerson} onChange={(e) => setPartnerForm({ ...partnerForm, contactPerson: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">تلفن تماس *</span>
              <input className="rounded-xl border px-3 py-2" value={partnerForm.contactPhone} onChange={(e) => setPartnerForm({ ...partnerForm, contactPhone: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">ایمیل تماس</span>
              <input className="rounded-xl border px-3 py-2" type="email" value={partnerForm.contactEmail} onChange={(e) => setPartnerForm({ ...partnerForm, contactEmail: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">آدرس</span>
              <input className="rounded-xl border px-3 py-2" value={partnerForm.address} onChange={(e) => setPartnerForm({ ...partnerForm, address: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">شهر</span>
              <input className="rounded-xl border px-3 py-2" value={partnerForm.city} onChange={(e) => setPartnerForm({ ...partnerForm, city: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">استان</span>
              <input className="rounded-xl border px-3 py-2" value={partnerForm.province} onChange={(e) => setPartnerForm({ ...partnerForm, province: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">کد پستی</span>
              <input className="rounded-xl border px-3 py-2" value={partnerForm.postalCode} onChange={(e) => setPartnerForm({ ...partnerForm, postalCode: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">نرخ کمیسیون (%)</span>
              <input className="rounded-xl border px-3 py-2" type="number" step="0.01" value={partnerForm.commissionRate} onChange={(e) => setPartnerForm({ ...partnerForm, commissionRate: parseFloat(e.target.value) || 0 })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">سقف اعتبار</span>
              <input className="rounded-xl border px-3 py-2" type="number" value={partnerForm.creditLimit} onChange={(e) => setPartnerForm({ ...partnerForm, creditLimit: parseFloat(e.target.value) || 0 })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">تاریخ شروع قرارداد</span>
              <input className="rounded-xl border px-3 py-2" type="date" value={partnerForm.contractStartDate} onChange={(e) => setPartnerForm({ ...partnerForm, contractStartDate: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">تاریخ پایان قرارداد</span>
              <input className="rounded-xl border px-3 py-2" type="date" value={partnerForm.contractEndDate} onChange={(e) => setPartnerForm({ ...partnerForm, contractEndDate: e.target.value })} />
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={savePartner}
              disabled={partnerSaving || !partnerForm.partnerCode || !partnerForm.legalName || !partnerForm.tradeName || !partnerForm.nationalId || !partnerForm.registrationNumber || !partnerForm.contactPerson || !partnerForm.contactPhone}
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {partnerSaving ? 'در حال ذخیره...' : partnerFormMode === 'create' ? 'ایجاد شریک' : 'ذخیره تغییرات'}
            </button>
            <button type="button" onClick={() => setPartnerDrawerOpen(false)} className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50">
              انصراف
            </button>
          </div>
        </div>
      </Drawer>
    </main>
  );
}
