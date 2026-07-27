'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

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
    if (ou.success) setOrgUnits(ou.data);
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

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">کاربران</h1>
          <p className="mt-1 text-sm text-neutral-600">مدیریت کاربران و نقش‌ها برای ستاد/شعبه/نمایندگی/کارگزاری</p>
        </div>

        <button
          type="button"
          onClick={load}
          className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
          disabled={loading}
        >
          بروزرسانی
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {users.map((u) => (
          <div key={u.userId} className="rounded-2xl border p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold">
                  {u.firstName} {u.lastName}
                </div>
                <div className="mt-1 text-xs text-neutral-600">
                  {u.username} | {u.email}
                </div>
                <div className="mt-1 text-xs text-neutral-600">سمت: {u.positionTitle || '—'} | کدملی: {u.nationalId || '—'}</div>
              </div>

              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <label className="text-xs text-neutral-600">
                  واحد سازمانی
                  <select
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
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

                <label className="text-xs text-neutral-600">
                  نقش اصلی
                  <select
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
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
          </div>
        ))}

        {!loading && users.length === 0 ? <div className="text-sm text-neutral-600">کاربری وجود ندارد.</div> : null}
      </div>
    </main>
  );
}
