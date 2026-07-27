'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';

type PartyRow = {
  partyId: string;
  type: 'natural' | 'legal';
  fullName: string;
  nationalId: string;
  mobile: string | null;
  status: string;
  createdAt: string;
};

export default function PartyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PartyRow[]>([]);

  const perms = enterprisePermissionsForRoles(getAuthUser()?.roles);
  const canList = hasEnterprisePermission(perms, 'party:list');
  const canCreate = hasEnterprisePermission(perms, 'party:create');

  const [creating, setCreating] = useState(false);
  const [createType, setCreateType] = useState<'natural' | 'legal'>('natural');
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [mobile, setMobile] = useState('');

  const [filterNationalId, setFilterNationalId] = useState('');

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filterNationalId) qs.set('nationalId', filterNationalId);

    const res = await apiFetch<PartyRow[]>(`/party${qs.toString() ? `?${qs.toString()}` : ''}`);
    if (res.success) setRows(res.data);
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
    await apiFetch('/party', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: createType,
        fullName,
        nationalId,
        mobile: mobile || undefined,
      }),
    });
    setCreating(false);
    setFullName('');
    setNationalId('');
    setMobile('');
    await load();
  }

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">اشخاص / KYC</h1>
          <p className="mt-1 text-sm text-neutral-600">ثبت و جستجوی اشخاص حقیقی/حقوقی و وضعیت KYC</p>
        </div>

        <button type="button" onClick={load} className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" disabled={loading}>
          بروزرسانی
        </button>
      </div>

      <div className="mt-6 grid gap-4 rounded-2xl border p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="grid gap-1 text-sm">
            <span className="text-xs text-neutral-600">نوع</span>
            <select className="rounded-xl border px-3 py-2" value={createType} onChange={(e) => setCreateType(e.target.value as any)}>
              <option value="natural">حقیقی</option>
              <option value="legal">حقوقی</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="text-xs text-neutral-600">نام/عنوان</span>
            <input className="rounded-xl border px-3 py-2" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-xs text-neutral-600">کدملی/شناسه</span>
            <input className="rounded-xl border px-3 py-2" value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
          </label>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="text-xs text-neutral-600">موبایل (اختیاری)</span>
            <input className="rounded-xl border px-3 py-2" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          </label>

          <div className="flex items-end md:col-span-2">
            <button
              type="button"
              onClick={create}
              disabled={!canCreate || creating || !fullName || !nationalId}
              className="w-full rounded-xl bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {creating ? 'در حال ثبت…' : 'ثبت شخص'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-end">
        <label className="grid flex-1 gap-1 text-sm">
          <span className="text-xs text-neutral-600">فیلتر: کدملی/شناسه</span>
          <input className="rounded-xl border px-3 py-2" value={filterNationalId} onChange={(e) => setFilterNationalId(e.target.value)} />
        </label>
        <button
          type="button"
          className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
          onClick={load}
          disabled={loading}
        >
          اعمال فیلتر
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {rows.map((p) => (
          <div key={p.partyId} className="rounded-2xl border p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold">{p.fullName}</div>
                <div className="mt-1 text-xs text-neutral-600">
                  {p.type} | {p.nationalId} | {p.mobile || '—'}
                </div>
              </div>
              <div className="text-xs text-neutral-600">وضعیت: {p.status}</div>
            </div>
          </div>
        ))}

        {!loading && rows.length === 0 ? <div className="text-sm text-neutral-600">موردی یافت نشد.</div> : null}
      </div>
    </main>
  );
}
