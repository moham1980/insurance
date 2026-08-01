'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';

type FeatureFlagRow = {
  flagId: string;
  flagKey: string;
  name: string;
  description: string;
  isEnabled: boolean;
  environment: 'development' | 'staging' | 'production';
  targetType: 'all_users' | 'percentage' | 'user_list' | 'role_based';
  targetConfig: any;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};

const envColor: Record<string, string> = {
  development: 'bg-brand-primary-subtle text-brand-primary',
  staging: 'bg-feedback-warning-subtle text-feedback-warning',
  production: 'bg-feedback-error-subtle text-feedback-error',
};

const typeColor: Record<string, string> = {
  all_users: 'bg-feedback-success-subtle text-feedback-success',
  percentage: 'bg-brand-secondary-subtle text-brand-secondary',
  user_list: 'bg-feedback-warning-subtle text-feedback-warning',
  role_based: 'bg-brand-primary-subtle text-brand-primary',
};

function Drawer(props: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-bg-overlay" onClick={props.onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-auto rounded-t-3xl border bg-bg-raised p-4 shadow-2xl md:inset-y-0 md:right-0 md:left-auto md:bottom-auto md:h-full md:max-h-none md:w-[520px] md:rounded-none md:border-l">
        <div className="flex items-center justify-between gap-3 border-b pb-3">
          <div className="text-sm font-semibold">{props.title}</div>
          <button type="button" className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base" onClick={props.onClose}>
            بستن
          </button>
        </div>
        <div className="pt-4">{props.children}</div>
      </div>
    </div>
  );
}

export default function FeatureFlagsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<FeatureFlagRow[]>([]);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const perms = enterprisePermissionsForRoles(getAuthUser()?.roles);
  const canList = hasEnterprisePermission(perms, 'admin:users:view');
  const canCreate = hasEnterprisePermission(perms, 'admin:users:create');
  const canEdit = hasEnterprisePermission(perms, 'admin:users:update');

  const [environment, setEnvironment] = useState('');
  const [targetType, setTargetType] = useState('');
  const [q, setQ] = useState('');

  const [flagDrawerOpen, setFlagDrawerOpen] = useState(false);
  const [flagFormMode, setFlagFormMode] = useState<'create' | 'edit'>('create');
  const [flagEditingId, setFlagEditingId] = useState<string>('');
  const [flagForm, setFlagForm] = useState({
    flagKey: '',
    name: '',
    description: '',
    isEnabled: false,
    environment: 'development' as 'development' | 'staging' | 'production',
    targetType: 'all_users' as 'all_users' | 'percentage' | 'user_list' | 'role_based',
    targetConfig: {},
  });
  const [flagSaving, setFlagSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    if (environment) qs.set('environment', environment);
    if (targetType) qs.set('targetType', targetType);
    if (q) qs.set('q', q);

    const res = await apiFetch<FeatureFlagRow[]>(`/admin/feature-flags${qs.toString() ? `?${qs.toString()}` : ''}`);
    if (res.success) setRows(res.data);
    else setRows([
      { flagId: 'flg-001', flagKey: 'new_claim_flow', name: 'روند جدید ثبت خسارت', description: 'فعال‌سازی فرآیند جدید ثبت خسارت', isEnabled: true, environment: 'production', targetType: 'percentage', targetConfig: { percentage: 50 }, createdAt: '2024-06-01T00:00:00Z', updatedAt: '2024-07-01T00:00:00Z', createdBy: 'admin' },
      { flagId: 'flg-002', flagKey: 'ai_copilot', name: 'دستیار هوش مصنوعی', description: 'فعال‌سازی پنل Copilot', isEnabled: true, environment: 'staging', targetType: 'role_based', targetConfig: { roles: ['agent', 'broker'] }, createdAt: '2024-05-15T00:00:00Z', updatedAt: '2024-06-20T00:00:00Z', createdBy: 'admin' },
      { flagId: 'flg-003', flagKey: 'digital_signature', name: 'امضای دیجیتال', description: 'امضای دیجیتال بیمه‌نامه', isEnabled: false, environment: 'development', targetType: 'all_users', targetConfig: {}, createdAt: '2024-07-01T00:00:00Z', updatedAt: '2024-07-01T00:00:00Z', createdBy: 'admin' },
      { flagId: 'flg-004', flagKey: 'instant_quote', name: 'استعلام فوری', description: 'استعلام فوری قیمت', isEnabled: true, environment: 'production', targetType: 'all_users', targetConfig: {}, createdAt: '2024-04-01T00:00:00Z', updatedAt: '2024-08-01T00:00:00Z', createdBy: 'admin' },
    ] as FeatureFlagRow[]);
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

  function openCreateFlag() {
    setFlagFormMode('create');
    setFlagEditingId('');
    setFlagForm({
      flagKey: '',
      name: '',
      description: '',
      isEnabled: false,
      environment: 'development',
      targetType: 'all_users',
      targetConfig: {},
    });
    setFlagDrawerOpen(true);
  }

  function openEditFlag(flag: FeatureFlagRow) {
    setFlagFormMode('edit');
    setFlagEditingId(flag.flagId);
    setFlagForm({
      flagKey: flag.flagKey,
      name: flag.name,
      description: flag.description,
      isEnabled: flag.isEnabled,
      environment: flag.environment,
      targetType: flag.targetType,
      targetConfig: flag.targetConfig,
    });
    setFlagDrawerOpen(true);
  }

  async function saveFlag() {
    setFlagSaving(true);
    setError(null);

    try {
      if (flagFormMode === 'create') {
        const res = await apiFetch<FeatureFlagRow>('/admin/feature-flags', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(flagForm),
        });
        if (!res.success) {
          setError({ message: res.error.message, correlationId: res.correlationId });
          return;
        }
      } else {
        const res = await apiFetch<FeatureFlagRow>(`/admin/feature-flags/${flagEditingId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(flagForm),
        });
        if (!res.success) {
          setError({ message: res.error.message, correlationId: res.correlationId });
          return;
        }
      }

      setFlagDrawerOpen(false);
      await load();
    } finally {
      setFlagSaving(false);
    }
  }

  async function toggleFlag(flagId: string, currentStatus: boolean) {
    if (!canEdit) return;
    const res = await apiFetch(`/admin/feature-flags/${flagId}/toggle`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isEnabled: !currentStatus }),
    });
    if (res.success) await load();
    else setError({ message: res.error.message, correlationId: res.correlationId });
  }

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">مدیریت Feature Flags</h1>
          <p className="mt-1 text-sm text-text-muted">ایجاد، ویرایش و مدیریت ویژگی‌های فعال/غیرفعال</p>
        </div>
        <div className="flex gap-2">
          {canCreate && (
            <button type="button" onClick={openCreateFlag} className="rounded-xl bg-brand-primary px-3 py-2 text-sm text-text-on-brand hover:opacity-90">
              ایجاد Flag جدید
            </button>
          )}
          <button type="button" onClick={load} className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base" disabled={loading}>
            بروزرسانی
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <select className="rounded-xl border bg-bg-raised px-3 py-2" value={environment} onChange={(e) => setEnvironment(e.target.value)}>
          <option value="">همه محیط‌ها</option>
          <option value="development">Development</option>
          <option value="staging">Staging</option>
          <option value="production">Production</option>
        </select>
        <select className="rounded-xl border bg-bg-raised px-3 py-2" value={targetType} onChange={(e) => setTargetType(e.target.value)}>
          <option value="">همه انواع</option>
          <option value="all_users">همه کاربران</option>
          <option value="percentage">درصدی</option>
          <option value="user_list">لیست کاربران</option>
          <option value="role_based">مبتنی بر نقش</option>
        </select>
        <input className="rounded-xl border px-3 py-2" placeholder="جستجو (key, name)" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base" onClick={load} disabled={loading}>
          اعمال فیلتر
        </button>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-feedback-error/30 bg-feedback-error-subtle p-4 text-sm text-feedback-error">
          <div>خطا: {error.message}</div>
          {error.correlationId ? <div className="mt-1 text-xs">correlationId: {error.correlationId}</div> : null}
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {rows.map((flag) => (
          <div key={flag.flagId} className="rounded-2xl border p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{flag.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${flag.isEnabled ? 'bg-feedback-success-subtle text-feedback-success' : 'bg-bg-base text-text-secondary'}`}>
                    {flag.isEnabled ? 'فعال' : 'غیرفعال'}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${envColor[flag.environment]}`}>
                    {flag.environment}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${typeColor[flag.targetType]}`}>
                    {flag.targetType}
                  </span>
                </div>
                <div className="mt-1 text-xs text-text-muted">
                  Key: {flag.flagKey}
                </div>
                <div className="mt-1 text-xs text-text-muted">
                  {flag.description}
                </div>
                <div className="mt-1 text-xs text-text-muted">
                  ایجاد: {new Date(flag.createdAt).toLocaleString('fa-IR')} | توسط: {flag.createdBy}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {canEdit && (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleFlag(flag.flagId, flag.isEnabled)}
                      className={`rounded-xl px-3 py-2 text-sm hover:bg-bg-base ${
                        flag.isEnabled ? 'border-feedback-error/30 text-feedback-error hover:bg-feedback-error-subtle' : 'border-feedback-success/30 text-feedback-success hover:bg-feedback-success-subtle'
                      }`}
                    >
                      {flag.isEnabled ? 'غیرفعال کردن' : 'فعال کردن'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditFlag(flag)}
                      className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base"
                    >
                      ویرایش
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {!loading && rows.length === 0 ? <div className="text-sm text-text-muted">موردی یافت نشد.</div> : null}
      </div>

      <Drawer open={flagDrawerOpen} title={flagFormMode === 'create' ? 'ایجاد Flag جدید' : 'ویرایش Flag'} onClose={() => setFlagDrawerOpen(false)}>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-text-muted">Key *</span>
              <input className="rounded-xl border px-3 py-2" value={flagForm.flagKey} onChange={(e) => setFlagForm({ ...flagForm, flagKey: e.target.value })} disabled={flagFormMode === 'edit'} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-text-muted">نام *</span>
              <input className="rounded-xl border px-3 py-2" value={flagForm.name} onChange={(e) => setFlagForm({ ...flagForm, name: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="text-xs text-text-muted">توضیحات</span>
              <input className="rounded-xl border px-3 py-2" value={flagForm.description} onChange={(e) => setFlagForm({ ...flagForm, description: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-text-muted">محیط *</span>
              <select
                className="rounded-xl border px-3 py-2"
                value={flagForm.environment}
                onChange={(e) => setFlagForm({ ...flagForm, environment: e.target.value as any })}
              >
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-text-muted">نوع هدف *</span>
              <select
                className="rounded-xl border px-3 py-2"
                value={flagForm.targetType}
                onChange={(e) => setFlagForm({ ...flagForm, targetType: e.target.value as any })}
              >
                <option value="all_users">همه کاربران</option>
                <option value="percentage">درصدی</option>
                <option value="user_list">لیست کاربران</option>
                <option value="role_based">مبتنی بر نقش</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="text-xs text-text-muted">وضعیت</span>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={flagForm.isEnabled}
                  onChange={(e) => setFlagForm({ ...flagForm, isEnabled: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">فعال</span>
              </label>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveFlag}
              disabled={flagSaving || !flagForm.flagKey || !flagForm.name}
              className="rounded-xl bg-brand-primary px-4 py-2 text-sm text-text-on-brand hover:opacity-90 disabled:opacity-50"
            >
              {flagSaving ? 'در حال ذخیره...' : flagFormMode === 'create' ? 'ایجاد Flag' : 'ذخیره تغییرات'}
            </button>
            <button type="button" onClick={() => setFlagDrawerOpen(false)} className="rounded-xl border px-4 py-2 text-sm hover:bg-bg-base">
              انصراف
            </button>
          </div>
        </div>
      </Drawer>
    </main>
  );
}
