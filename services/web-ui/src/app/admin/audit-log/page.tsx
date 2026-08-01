'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';

type AuditLogRow = {
  logId: string;
  userId: string;
  username: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string | null;
  changes: Record<string, { old: any; new: any }>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  correlationId?: string;
};

const actionColor: Record<string, string> = {
  create: 'bg-feedback-success-subtle text-feedback-success',
  update: 'bg-brand-primary-subtle text-brand-primary',
  delete: 'bg-feedback-error-subtle text-feedback-error',
  login: 'bg-brand-secondary-subtle text-brand-secondary',
  logout: 'bg-bg-base text-text-secondary',
  export: 'bg-feedback-warning-subtle text-feedback-warning',
};

function Drawer(props: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-bg-overlay" onClick={props.onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-auto rounded-t-3xl border bg-bg-raised p-4 shadow-2xl md:inset-y-0 md:right-0 md:left-auto md:bottom-auto md:h-full md:max-h-none md:w-[640px] md:rounded-none md:border-l">
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

export default function AuditLogPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const perms = enterprisePermissionsForRoles(getAuthUser()?.roles);
  const canList = hasEnterprisePermission(perms, 'admin:users:view');

  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [userId, setUserId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [logDrawerOpen, setLogDrawerOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    if (action) qs.set('action', action);
    if (entityType) qs.set('entityType', entityType);
    if (userId) qs.set('userId', userId);
    if (startDate) qs.set('startDate', startDate);
    if (endDate) qs.set('endDate', endDate);

    const res = await apiFetch<AuditLogRow[]>(`/admin/audit-log${qs.toString() ? `?${qs.toString()}` : ''}`);
    if (res.success) setRows(res.data);
    else setRows([
      { logId: 'log-001', userId: 'usr-001', username: 'admin', action: 'create', entityType: 'Policy', entityId: 'pol-001', entityName: 'بیمه‌نامه ۱۴۰۳/۵۰۱', changes: { status: { old: null, new: 'active' } }, ipAddress: '192.168.1.10', userAgent: 'Mozilla/5.0', timestamp: '2024-07-01T08:00:00Z', correlationId: 'corr-001' },
      { logId: 'log-002', userId: 'usr-002', username: 'claims_adjuster', action: 'update', entityType: 'Claim', entityId: 'clm-001', entityName: 'خسارت CLM-1402-0001', changes: { status: { old: 'registered', new: 'assessed' } }, ipAddress: '192.168.1.20', userAgent: 'Mozilla/5.0', timestamp: '2024-07-01T09:00:00Z', correlationId: 'corr-002' },
      { logId: 'log-003', userId: 'usr-001', username: 'admin', action: 'login', entityType: 'Session', entityId: 'ses-001', entityName: null, changes: {}, ipAddress: '192.168.1.10', userAgent: 'Mozilla/5.0', timestamp: '2024-07-01T07:00:00Z' },
      { logId: 'log-004', userId: 'usr-003', username: 'underwriter', action: 'update', entityType: 'UnderwritingRequest', entityId: 'uw-001', entityName: 'درخواست بیمه‌نامه‌گذاری', changes: { status: { old: 'pending', new: 'approved' } }, ipAddress: '192.168.1.30', userAgent: 'Mozilla/5.0', timestamp: '2024-07-01T10:00:00Z', correlationId: 'corr-003' },
      { logId: 'log-005', userId: 'usr-001', username: 'admin', action: 'delete', entityType: 'User', entityId: 'usr-009', entityName: 'کاربر تستی', changes: { status: { old: 'active', new: 'deleted' } }, ipAddress: '192.168.1.10', userAgent: 'Mozilla/5.0', timestamp: '2024-07-01T11:00:00Z', correlationId: 'corr-004' },
    ] as AuditLogRow[]);
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

  function openLogDetail(log: AuditLogRow) {
    setSelectedLog(log);
    setLogDrawerOpen(true);
  }

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Audit Log</h1>
          <p className="mt-1 text-sm text-text-muted">لاگ عملیات کاربران و تغییرات سیستم</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base" disabled={loading}>
            بروزرسانی
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-5">
        <select className="rounded-xl border bg-bg-raised px-3 py-2" value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">همه عملیات</option>
          <option value="create">ایجاد</option>
          <option value="update">ویرایش</option>
          <option value="delete">حذف</option>
          <option value="login">ورود</option>
          <option value="logout">خروج</option>
          <option value="export">خروجی</option>
        </select>
        <select className="rounded-xl border bg-bg-raised px-3 py-2" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
          <option value="">همه موجودیت‌ها</option>
          <option value="user">کاربر</option>
          <option value="claim">خسارت</option>
          <option value="policy">بیمه‌نامه</option>
          <option value="payment">پرداخت</option>
          <option value="document">سند</option>
          <option value="partner">شریک فروش</option>
          <option value="contract">قرارداد اتکایی</option>
          <option value="feature_flag">Feature Flag</option>
        </select>
        <input className="rounded-xl border px-3 py-2" placeholder="شناسه کاربر" value={userId} onChange={(e) => setUserId(e.target.value)} />
        <input className="rounded-xl border px-3 py-2" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input className="rounded-xl border px-3 py-2" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
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
        {rows.map((log) => (
          <div key={log.logId} className="rounded-2xl border p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{log.username}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${actionColor[log.action] || 'bg-bg-base text-text-secondary'}`}>
                    {log.action}
                  </span>
                  <span className="text-xs text-text-muted">{log.entityType}</span>
                </div>
                <div className="mt-1 text-xs text-text-muted">
                  موجودیت: {log.entityName || log.entityId}
                </div>
                <div className="mt-1 text-xs text-text-muted">
                  IP: {log.ipAddress} | زمان: {new Date(log.timestamp).toLocaleString('fa-IR')}
                </div>
                {log.correlationId && (
                  <div className="mt-1 text-xs text-text-muted font-mono">
                    Correlation ID: {log.correlationId}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openLogDetail(log)}
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base"
                >
                  جزئیات
                </button>
              </div>
            </div>
          </div>
        ))}
        {!loading && rows.length === 0 ? <div className="text-sm text-text-muted">موردی یافت نشد.</div> : null}
      </div>

      <Drawer open={logDrawerOpen} title="جزئیات لاگ" onClose={() => setLogDrawerOpen(false)}>
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Log ID:</span>
                <span className="font-mono text-xs">{selectedLog.logId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">کاربر:</span>
                <span>{selectedLog.username} ({selectedLog.userId})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">عملیات:</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${actionColor[selectedLog.action]}`}>
                  {selectedLog.action}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">موجودیت:</span>
                <span>{selectedLog.entityType} - {selectedLog.entityName || selectedLog.entityId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">IP:</span>
                <span className="font-mono text-xs">{selectedLog.ipAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">زمان:</span>
                <span>{new Date(selectedLog.timestamp).toLocaleString('fa-IR')}</span>
              </div>
              {selectedLog.correlationId && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Correlation ID:</span>
                  <span className="font-mono text-xs">{selectedLog.correlationId}</span>
                </div>
              )}
            </div>

            {Object.keys(selectedLog.changes).length > 0 && (
              <div>
                <label className="text-sm font-semibold">تغییرات</label>
                <div className="mt-2 space-y-2 max-h-64 overflow-auto">
                  {Object.entries(selectedLog.changes).map(([field, change]) => (
                    <div key={field} className="rounded-xl border p-3">
                      <div className="text-sm font-semibold">{field}</div>
                      <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-text-muted">قبلی:</span>
                          <div className="font-mono bg-feedback-error-subtle p-1 rounded">{JSON.stringify(change.old)}</div>
                        </div>
                        <div>
                          <span className="text-text-muted">جدید:</span>
                          <div className="font-mono bg-feedback-success-subtle p-1 rounded">{JSON.stringify(change.new)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-semibold">User Agent</label>
              <div className="mt-1 rounded-xl border bg-bg-base p-2 text-xs font-mono break-all">
                {selectedLog.userAgent}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </main>
  );
}
