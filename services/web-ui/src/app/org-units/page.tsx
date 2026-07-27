'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

type OrgUnit = {
  orgUnitId: string;
  type: string;
  name: string;
  code: string;
  parentOrgUnitId?: string | null;
  isActive: boolean;
  createdAt: string;
};

type CatalogRole = { key: string; titleFa: string; descriptionFa: string };

const orgUnitTypes = [
  { key: 'insurer', label: 'شرکت بیمه' },
  { key: 'head_office', label: 'ستاد' },
  { key: 'branch', label: 'شعبه' },
  { key: 'agency', label: 'نمایندگی' },
  { key: 'brokerage', label: 'کارگزاری' },
  { key: 'repair_shop', label: 'تعمیرگاه' },
  { key: 'hospital', label: 'بیمارستان' },
  { key: 'expert', label: 'کارشناس' },
  { key: 'call_center', label: 'مرکز تماس' },
];

export default function OrgUnitsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<OrgUnit[]>([]);

  const [type, setType] = useState('agency');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [parentOrgUnitId, setParentOrgUnitId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const parentOptions = useMemo(() => items, [items]);

  async function load() {
    setLoading(true);
    const res = await apiFetch<OrgUnit[]>('/auth/org-units');
    if (res.success) setItems(res.data);
    setLoading(false);
  }

  async function create() {
    setSaving(true);
    await apiFetch('/auth/org-units', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type,
        name,
        code,
        parentOrgUnitId: parentOrgUnitId || null,
      }),
    });

    setName('');
    setCode('');
    setParentOrgUnitId('');

    await load();
    setSaving(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="p-6">
      <div>
        <h1 className="text-xl font-semibold">واحدهای سازمانی</h1>
        <p className="mt-1 text-sm text-neutral-600">ستاد/شعبه/نمایندگی/کارگزاری و سایر ذی‌نفعان عملیاتی</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border p-4">
          <div className="text-sm font-semibold">ایجاد واحد</div>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">نوع</span>
              <select className="rounded-xl border px-3 py-2" value={type} onChange={(e) => setType(e.target.value)}>
                {orgUnitTypes.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">نام</span>
              <input className="rounded-xl border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">کد</span>
              <input className="rounded-xl border px-3 py-2" value={code} onChange={(e) => setCode(e.target.value)} />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs text-neutral-600">واحد بالادست (اختیاری)</span>
              <select
                className="rounded-xl border px-3 py-2"
                value={parentOrgUnitId}
                onChange={(e) => setParentOrgUnitId(e.target.value)}
              >
                <option value="">—</option>
                {parentOptions.map((x) => (
                  <option key={x.orgUnitId} value={x.orgUnitId}>
                    {x.name} ({x.type})
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              disabled={saving || !type || !name || !code}
              onClick={create}
              className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? 'در حال ذخیره…' : 'ایجاد'}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">لیست واحدها</div>
            <button
              type="button"
              onClick={load}
              className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
              disabled={loading}
            >
              بروزرسانی
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {items.map((x) => (
              <div key={x.orgUnitId} className="rounded-xl border px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{x.name}</div>
                  <div className="text-xs text-neutral-600">{x.type}</div>
                </div>
                <div className="mt-1 text-xs text-neutral-600">کد: {x.code}</div>
                {x.parentOrgUnitId ? <div className="mt-1 text-xs text-neutral-600">بالادست: {x.parentOrgUnitId}</div> : null}
              </div>
            ))}
            {!loading && items.length === 0 ? <div className="text-sm text-neutral-600">موردی وجود ندارد.</div> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
