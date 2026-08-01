'use client';

import { useEffect, useMemo, useState } from 'react';
import { Users as UsersIcon, RefreshCw, ShieldCheck, UserCheck, UserX, Building2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Button, Card, StatCard } from '@insurance/design-system';
import { MOCK_USERS, MOCK_ORG_UNITS } from '@/lib/mock-data';

type UserRow = {
  userId: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  roles: string[];
  department: string | null;
  orgUnitId: string | null;
  positionTitle: string | null;
  nationalId: string | null;
  lastLoginAt: string | null;
};

type OrgUnit = { orgUnitId: string; type: string; name: string; code: string };

type RoleCatalogItem = { key: string; titleFa: string; descriptionFa: string };

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [rolesCatalog, setRolesCatalog] = useState<RoleCatalogItem[]>([]);

  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    setLoading(true);

    const [u, ou, rc] = await Promise.all([
      apiFetch<UserRow[]>('/auth/users'),
      apiFetch<OrgUnit[]>('/auth/org-units'),
      apiFetch<RoleCatalogItem[]>('/auth/roles/catalog'),
    ]);

    if (u.success) setUsers(u.data);
    else setUsers(MOCK_USERS as unknown as UserRow[]);
    if (ou.success) setOrgUnits(ou.data);
    else setOrgUnits(MOCK_ORG_UNITS as unknown as OrgUnit[]);
    if (rc.success) setRolesCatalog(rc.data);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateRoles(userId: string, roles: string[]) {
    setSaving(userId);
    await apiFetch(`/auth/users/${encodeURIComponent(userId)}/roles`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ roles }),
    });
    await load();
    setSaving(null);
  }

  async function updateOrgUnit(userId: string, orgUnitId: string | null) {
    setSaving(userId);
    await apiFetch(`/auth/users/${encodeURIComponent(userId)}/org-unit`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orgUnitId }),
    });
    await load();
    setSaving(null);
  }

  const roleOptions = useMemo(() => rolesCatalog, [rolesCatalog]);

  const activeCount = users.filter((u) => (u as any).status === 'active').length;
  const inactiveCount = users.length - activeCount;

  const roleBadge = (role: string) => {
    const cfg: Record<string, { bg: string; text: string; label: string }> = {
      admin: { bg: 'bg-brand-primary-subtle', text: 'text-brand-primary', label: 'مدیر سیستم' },
      claims_handler: { bg: 'bg-feedback-warning-subtle', text: 'text-feedback-warning', label: 'کارشناس خسارت' },
      underwriter: { bg: 'bg-feedback-info-subtle', text: 'text-feedback-info', label: 'کارشناس صدور' },
      agent: { bg: 'bg-brand-secondary-subtle', text: 'text-brand-secondary', label: 'نماینده' },
    };
    const c = cfg[role] || { bg: 'bg-bg-base', text: 'text-text-secondary', label: role };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
        <ShieldCheck className="w-3 h-3" />
        {c.label}
      </span>
    );
  };

  return (
    <main className="p-6 max-w-7xl mx-auto" dir="rtl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
            <UsersIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">کاربران</h1>
            <p className="mt-1 text-sm text-text-muted">مدیریت کاربران و نقش‌ها برای ستاد/شعبه/نمایندگی/کارگزاری</p>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={load} disabled={loading} isLoading={loading}>
          <RefreshCw className="h-4 w-4 ml-1" />
          بروزرسانی
        </Button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard title="کل کاربران" value={users.length} icon={UsersIcon} />
        <StatCard title="کاربران فعال" value={activeCount} changeType="positive" change="فعال" icon={UserCheck} />
        <StatCard title="غیرفعال" value={inactiveCount} changeType="negative" change="غیرفعال" icon={UserX} />
      </div>

      <div className="mt-6 space-y-3">
        {users.map((u) => (
          <Card key={u.userId} className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold">
                    {u.firstName} {u.lastName}
                  </div>
                  {u.roles?.[0] ? roleBadge(u.roles[0]) : null}
                </div>
                <div className="mt-1 text-xs text-text-muted">
                  {u.username} | {u.email}
                </div>
                <div className="mt-1 text-xs text-text-muted">سمت: {u.positionTitle || '—'} | کدملی: {u.nationalId || '—'}</div>
              </div>

              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <label className="text-xs text-text-muted">
                  <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> واحد سازمانی</span>
                  <select
                    className="mt-1 w-full rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary"
                    value={u.orgUnitId || ''}
                    onChange={(e) => updateOrgUnit(u.userId, e.target.value ? e.target.value : null)}
                    disabled={saving === u.userId}
                  >
                    <option value="">—</option>
                    {orgUnits.map((x) => (
                      <option key={x.orgUnitId} value={x.orgUnitId}>
                        {x.name} ({x.type})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs text-text-muted">
                  <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> نقش اصلی</span>
                  <select
                    className="mt-1 w-full rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary"
                    value={u.roles?.[0] || 'user'}
                    onChange={(e) => updateRoles(u.userId, [e.target.value])}
                    disabled={saving === u.userId}
                  >
                    {roleOptions.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.titleFa}
                      </option>
                    ))}
                    {roleOptions.length === 0 ? <option value="user">user</option> : null}
                  </select>
                </label>
              </div>
            </div>
          </Card>
        ))}

        {!loading && users.length === 0 ? <div className="text-sm text-text-muted text-center py-8">کاربری وجود ندارد.</div> : null}
      </div>
    </main>
  );
}
