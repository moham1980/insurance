'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, Plus, RefreshCw, Network } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Button, Card, StatCard } from '@insurance/design-system';
import { MOCK_ORG_UNITS } from '@/lib/mock-data';

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
    else setItems(MOCK_ORG_UNITS as unknown as OrgUnit[]);
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

  const typeLabel = (t: string) => orgUnitTypes.find((x) => x.key === t)?.label || t;

  const typeBadge = (t: string) => {
    const cfg: Record<string, { bg: string; text: string }> = {
      insurer: { bg: 'bg-brand-primary-subtle', text: 'text-brand-primary' },
      head_office: { bg: 'bg-feedback-info-subtle', text: 'text-feedback-info' },
      branch: { bg: 'bg-feedback-success-subtle', text: 'text-feedback-success' },
      agency: { bg: 'bg-feedback-warning-subtle', text: 'text-feedback-warning' },
      brokerage: { bg: 'bg-brand-secondary-subtle', text: 'text-brand-secondary' },
    };
    const c = cfg[t] || { bg: 'bg-bg-base', text: 'text-text-secondary' };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
        <Building2 className="w-3 h-3" />
        {typeLabel(t)}
      </span>
    );
  };

  return (
    <main className="p-6 max-w-7xl mx-auto" dir="rtl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">واحدهای سازمانی</h1>
            <p className="mt-1 text-sm text-text-muted">ستاد/شعبه/نمایندگی/کارگزاری و سایر ذی‌نفعان عملیاتی</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading} isLoading={loading}>
          <RefreshCw className="h-4 w-4 ml-1" />
          بروزرسانی
        </Button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard title="کل واحدها" value={items.length} icon={Network} />
        <StatCard title="شعبه‌ها" value={items.filter((x) => x.type === 'branch').length} icon={Building2} />
        <StatCard title="نمایندگی‌ها" value={items.filter((x) => x.type === 'agency').length} icon={Building2} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Plus className="h-4 w-4 text-brand-primary" />
            ایجاد واحد
          </div>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-text-muted">نوع</span>
              <select className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={type} onChange={(e) => setType(e.target.value)}>
                {orgUnitTypes.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs text-text-muted">نام</span>
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={name} onChange={(e) => setName(e.target.value)} />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs text-text-muted">کد</span>
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={code} onChange={(e) => setCode(e.target.value)} />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs text-text-muted">واحد بالادست (اختیاری)</span>
              <select
                className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary"
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

            <Button
              onClick={create}
              disabled={saving || !type || !name || !code}
              isLoading={saving}
              fullWidth
            >
              {saving ? 'در حال ذخیره…' : 'ایجاد'}
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">لیست واحدها</div>
            <Button variant="ghost" size="sm" onClick={load} disabled={loading} isLoading={loading}>
              بروزرسانی
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {items.map((x) => (
              <div key={x.orgUnitId} className="rounded-xl border border-border-default bg-bg-base px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{x.name}</div>
                  {typeBadge(x.type)}
                </div>
                <div className="mt-1 text-xs text-text-muted">کد: {x.code}</div>
                {x.parentOrgUnitId ? <div className="mt-1 text-xs text-text-muted">بالادست: {x.parentOrgUnitId}</div> : null}
              </div>
            ))}
            {!loading && items.length === 0 ? <div className="text-sm text-text-muted text-center py-8">موردی وجود ندارد.</div> : null}
          </div>
        </Card>
      </div>
    </main>
  );
}
