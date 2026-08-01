'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';
import { LoadingOverlay } from '@/components/loading-spinner';
import { MOCK_USERS } from '@/lib/mock-data';

type UserRow = {
  userId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  department: string | null;
  orgUnitId: string | null;
  positionTitle: string | null;
  nationalId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

const ALL_ROLES = [
  'super_admin',
  'claims_adjuster',
  'complaints_officer',
  'fraud_analyst',
  'aml_officer',
  'product_manager',
  'collections_ops',
  'ops',
  'bi_analyst',
  'sales_agent',
  'underwriter',
  'loss_adjuster',
  'agency_admin',
  'broker',
  'reinsurance_ops',
  'regulatory_view',
];

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

export default function UsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const perms = enterprisePermissionsForRoles(getAuthUser()?.roles);
  const canList = hasEnterprisePermission(perms, 'admin:users:list');
  const canCreate = hasEnterprisePermission(perms, 'admin:users:create');
  const canEdit = hasEnterprisePermission(perms, 'admin:users:update');
  const canDeactivate = hasEnterprisePermission(perms, 'admin:users:deactivate');

  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');

  const [userDrawerOpen, setUserDrawerOpen] = useState(false);
  const [userFormMode, setUserFormMode] = useState<'create' | 'edit'>('create');
  const [userEditingId, setUserEditingId] = useState<string>('');
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    roles: [] as string[],
    department: '',
    orgUnitId: '',
    positionTitle: '',
    nationalId: '',
  });
  const [userSaving, setUserSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    if (role) qs.set('role', role);
    if (q) qs.set('q', q);

    const res = await apiFetch<UserRow[]>(`/admin/users${qs.toString() ? `?${qs.toString()}` : ''}`);
    if (res.success) setRows(res.data);
    else setRows(MOCK_USERS as unknown as UserRow[]);
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

  function openCreateUser() {
    setUserFormMode('create');
    setUserEditingId('');
    setUserForm({
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      roles: [],
      department: '',
      orgUnitId: '',
      positionTitle: '',
      nationalId: '',
    });
    setUserDrawerOpen(true);
  }

  function openEditUser(user: UserRow) {
    setUserFormMode('edit');
    setUserEditingId(user.userId);
    setUserForm({
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      password: '',
      roles: user.roles,
      department: user.department || '',
      orgUnitId: user.orgUnitId || '',
      positionTitle: user.positionTitle || '',
      nationalId: user.nationalId || '',
    });
    setUserDrawerOpen(true);
  }

  async function saveUser() {
    setUserSaving(true);
    setError(null);

    try {
      if (userFormMode === 'create') {
        const res = await apiFetch<UserRow>('/admin/users', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            username: userForm.username,
            email: userForm.email,
            firstName: userForm.firstName,
            lastName: userForm.lastName,
            password: userForm.password,
            roles: userForm.roles,
            department: userForm.department || null,
            orgUnitId: userForm.orgUnitId || null,
            positionTitle: userForm.positionTitle || null,
            nationalId: userForm.nationalId || null,
          }),
        });
        if (!res.success) {
          setError({ message: res.error.message, correlationId: res.correlationId });
          return;
        }
      } else {
        const updateData: any = {
          firstName: userForm.firstName,
          lastName: userForm.lastName,
          roles: userForm.roles,
          department: userForm.department || null,
          orgUnitId: userForm.orgUnitId || null,
          positionTitle: userForm.positionTitle || null,
          nationalId: userForm.nationalId || null,
        };
        if (userForm.password) updateData.password = userForm.password;

        const res = await apiFetch<UserRow>(`/admin/users/${userEditingId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(updateData),
        });
        if (!res.success) {
          setError({ message: res.error.message, correlationId: res.correlationId });
          return;
        }
      }

      setUserDrawerOpen(false);
      await load();
    } finally {
      setUserSaving(false);
    }
  }

  async function toggleUserStatus(userId: string, currentStatus: string) {
    if (!canDeactivate) return;
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const res = await apiFetch(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.success) await load();
    else setError({ message: res.error.message, correlationId: res.correlationId });
  }

  const statusColor: Record<string, string> = {
    active: 'bg-feedback-success-subtle text-feedback-success',
    inactive: 'bg-feedback-error-subtle text-feedback-error',
    pending: 'bg-feedback-warning-subtle text-feedback-warning',
  };

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">مدیریت کاربران</h1>
          <p className="mt-1 text-sm text-text-muted">ایجاد، ویرایش و مدیریت کاربران و نقش‌ها</p>
        </div>
        <div className="flex gap-2">
          {canCreate && (
            <button type="button" onClick={openCreateUser} className="rounded-xl bg-brand-primary px-3 py-2 text-sm text-text-on-brand hover:opacity-90">
              ایجاد کاربر جدید
            </button>
          )}
          <button type="button" onClick={() => router.push('/admin/rbac-matrix')} className="rounded-xl border border-brand-primary/30 bg-brand-primary-subtle px-3 py-2 text-sm text-brand-primary hover:bg-brand-primary-subtle">
            ماتریس دسترسی (RBAC)
          </button>
          <button type="button" onClick={load} className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base" disabled={loading}>
            بروزرسانی
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <select className="rounded-xl border bg-bg-raised px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">همه وضعیت‌ها</option>
          <option value="active">فعال</option>
          <option value="inactive">غیرفعال</option>
          <option value="pending">در انتظار</option>
        </select>
        <select className="rounded-xl border bg-bg-raised px-3 py-2" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">همه نقش‌ها</option>
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <input className="rounded-xl border px-3 py-2" placeholder="جستجو (نام، نام کاربری، ایمیل)" value={q} onChange={(e) => setQ(e.target.value)} />
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
        {rows.map((user) => (
          <div key={user.userId} className="rounded-2xl border p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{user.firstName} {user.lastName}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[user.status] || 'bg-bg-base text-text-secondary'}`}>
                    {user.status}
                  </span>
                </div>
                <div className="mt-1 text-xs text-text-muted">
                  نام کاربری: {user.username} | ایمیل: {user.email}
                </div>
                <div className="mt-1 text-xs text-text-muted">
                  نقش‌ها: {user.roles.join(', ') || '—'}
                </div>
                {user.department && (
                  <div className="mt-1 text-xs text-text-muted">
                    دپارتمان: {user.department} | سمت: {user.positionTitle || '—'}
                  </div>
                )}
                <div className="mt-1 text-xs text-text-muted">
                  ایجاد: {new Date(user.createdAt).toLocaleString('fa-IR')}
                  {user.lastLoginAt && ` | آخرین ورود: ${new Date(user.lastLoginAt).toLocaleString('fa-IR')}`}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => openEditUser(user)}
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base"
                  >
                    ویرایش
                  </button>
                )}
                {canDeactivate && (
                  <button
                    type="button"
                    onClick={() => toggleUserStatus(user.userId, user.status)}
                    className={`rounded-xl px-3 py-2 text-sm hover:bg-bg-base ${
                      user.status === 'active' ? 'border-feedback-error/30 text-feedback-error hover:bg-feedback-error-subtle' : 'border-feedback-success/30 text-feedback-success hover:bg-feedback-success-subtle'
                    }`}
                  >
                    {user.status === 'active' ? 'غیرفعال کردن' : 'فعال کردن'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {!loading && rows.length === 0 ? <div className="text-sm text-text-muted">موردی یافت نشد.</div> : null}
      </div>

      <Drawer open={userDrawerOpen} title={userFormMode === 'create' ? 'ایجاد کاربر جدید' : 'ویرایش کاربر'} onClose={() => setUserDrawerOpen(false)}>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-text-muted">نام کاربری *</span>
              <input
                className="rounded-xl border px-3 py-2"
                value={userForm.username}
                onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                disabled={userFormMode === 'edit'}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-text-muted">ایمیل *</span>
              <input
                className="rounded-xl border px-3 py-2"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                disabled={userFormMode === 'edit'}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-text-muted">نام *</span>
              <input className="rounded-xl border px-3 py-2" value={userForm.firstName} onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-text-muted">نام خانوادگی *</span>
              <input className="rounded-xl border px-3 py-2" value={userForm.lastName} onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-text-muted">رمز عبور {userFormMode === 'edit' ? '(برای تغییر)' : '*'}</span>
              <input
                className="rounded-xl border px-3 py-2"
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                placeholder={userFormMode === 'edit' ? 'خالی بگذارید برای عدم تغییر' : ''}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-text-muted">کدملی</span>
              <input className="rounded-xl border px-3 py-2" value={userForm.nationalId} onChange={(e) => setUserForm({ ...userForm, nationalId: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-text-muted">دپارتمان</span>
              <input className="rounded-xl border px-3 py-2" value={userForm.department} onChange={(e) => setUserForm({ ...userForm, department: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-text-muted">سمت</span>
              <input className="rounded-xl border px-3 py-2" value={userForm.positionTitle} onChange={(e) => setUserForm({ ...userForm, positionTitle: e.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-text-muted">واحد سازمانی</span>
              <input className="rounded-xl border px-3 py-2" value={userForm.orgUnitId} onChange={(e) => setUserForm({ ...userForm, orgUnitId: e.target.value })} />
            </label>
          </div>

          <div>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-text-muted">نقش‌ها *</span>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {ALL_ROLES.map((r) => (
                  <label key={r} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={userForm.roles.includes(r)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setUserForm({ ...userForm, roles: [...userForm.roles, r] });
                        } else {
                          setUserForm({ ...userForm, roles: userForm.roles.filter((role) => role !== r) });
                        }
                      }}
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveUser}
              disabled={userSaving || !userForm.username || !userForm.email || !userForm.firstName || !userForm.lastName || userForm.roles.length === 0}
              className="rounded-xl bg-brand-primary px-4 py-2 text-sm text-text-on-brand hover:opacity-90 disabled:opacity-50"
            >
              {userSaving ? 'در حال ذخیره...' : userFormMode === 'create' ? 'ایجاد کاربر' : 'ذخیره تغییرات'}
            </button>
            <button type="button" onClick={() => setUserDrawerOpen(false)} className="rounded-xl border px-4 py-2 text-sm hover:bg-bg-base">
              انصراف
            </button>
          </div>
        </div>
      </Drawer>
      <LoadingOverlay loading={loading} text="در حال بارگذاری کاربران..." />
    </main>
  );
}
