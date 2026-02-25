
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleAlert, RefreshCcw, ShieldCheck } from 'lucide-react';
import { apiFetch, getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';

export default function AmlPage() {
  const router = useRouter();
  const perms = enterprisePermissionsForRoles(getAuthUser()?.roles);
  const canDashboard = hasEnterprisePermission(perms, 'aml:dashboard');
  const canListAlerts = hasEnterprisePermission(perms, 'aml:alerts:list');
  const canAssignAlerts = hasEnterprisePermission(perms, 'aml:alerts:assign');
  const canUpdateAlertStatus = hasEnterprisePermission(perms, 'aml:alerts:update_status');
  const canListRules = hasEnterprisePermission(perms, 'aml:rules:list');
  const canManageRules = hasEnterprisePermission(perms, 'aml:rules:manage');
  const canListConsents = hasEnterprisePermission(perms, 'aml:consents:list');
  const canCreateConsents = hasEnterprisePermission(perms, 'aml:consents:create');
  const canRevokeConsents = hasEnterprisePermission(perms, 'aml:consents:revoke');
  const canExport = hasEnterprisePermission(perms, 'aml:export');

  const [tab, setTab] = useState<'dashboard' | 'alerts' | 'rules' | 'consents' | 'export'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [consents, setConsents] = useState<any[]>([]);
  const [exportSnapshot, setExportSnapshot] = useState<any>(null);

  async function loadDashboard() {
    const res = await apiFetch('/aml/dashboard');
    if (res.success) setDashboard(res.data);
    else setError({ message: res.error.message, correlationId: res.correlationId });
  }

  async function loadAlerts() {
    const res = await apiFetch('/aml/alerts?limit=50&offset=0');
    if (res.success) setAlerts((res.data as any)?.rows ?? []);
    else setError({ message: res.error.message, correlationId: res.correlationId });
  }

  async function loadRules() {
    const res = await apiFetch('/aml/rules?limit=50&offset=0');
    if (res.success) setRules((res.data as any)?.rows ?? []);
    else setError({ message: res.error.message, correlationId: res.correlationId });
  }

  async function loadConsents() {
    const res = await apiFetch('/aml/consents?limit=50&offset=0');
    if (res.success) setConsents((res.data as any)?.rows ?? []);
    else setError({ message: res.error.message, correlationId: res.correlationId });
  }

  async function loadExport() {
    const res = await apiFetch('/aml/export');
    if (res.success) setExportSnapshot(res.data);
    else setError({ message: res.error.message, correlationId: res.correlationId });
  }

  async function assignAlert(alertId: string) {
    if (!canAssignAlerts) return;
    const assignedTo = (window.prompt('assignedTo (خالی = حذف تخصیص):', '') ?? '').trim();
    setLoading(true);
    setError(null);
    const res = await apiFetch(`/aml/alerts/${encodeURIComponent(alertId)}/assign`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ assignedTo: assignedTo.length > 0 ? assignedTo : null }),
    });
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    await loadAlerts();
    setLoading(false);
  }

  async function updateAlertStatus(alertId: string) {
    if (!canUpdateAlertStatus) return;
    const status = (window.prompt('status: open | in_review | cleared | escalated | closed', 'in_review') ?? '').trim();
    const notes = (window.prompt('notes (اختیاری):', '') ?? '').trim();
    setLoading(true);
    setError(null);
    const res = await apiFetch(`/aml/alerts/${encodeURIComponent(alertId)}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status, notes: notes.length > 0 ? notes : null }),
    });
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    await loadAlerts();
    setLoading(false);
  }

  async function createRule() {
    if (!canManageRules) return;
    const ruleName = (window.prompt('ruleName:', '') ?? '').trim();
    const ruleType = (window.prompt('ruleType:', '') ?? '').trim();
    const expression = (window.prompt('expression:', '') ?? '').trim();
    const severity = (window.prompt('severity: low|medium|high|critical', 'medium') ?? '').trim();
    const status = (window.prompt('status: enabled|disabled', 'enabled') ?? '').trim();

    setLoading(true);
    setError(null);
    const res = await apiFetch('/aml/rules', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ruleName, ruleType, expression, severity, status }),
    });
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    await loadRules();
    setLoading(false);
  }

  async function updateRule(ruleId: string) {
    if (!canManageRules) return;
    const expression = window.prompt('expression (خالی = بدون تغییر):', '') ?? '';
    const status = window.prompt('status: enabled|disabled (خالی = بدون تغییر):', '') ?? '';
    const severity = window.prompt('severity: low|medium|high|critical (خالی = بدون تغییر):', '') ?? '';

    const body: any = {};
    if (expression.trim().length > 0) body.expression = expression.trim();
    if (status.trim().length > 0) body.status = status.trim();
    if (severity.trim().length > 0) body.severity = severity.trim();

    setLoading(true);
    setError(null);
    const res = await apiFetch(`/aml/rules/${encodeURIComponent(ruleId)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    await loadRules();
    setLoading(false);
  }

  async function createConsent() {
    if (!canCreateConsents) return;
    const subjectNationalId = (window.prompt('subjectNationalId:', '') ?? '').trim();
    const consentType = (window.prompt('consentType:', '') ?? '').trim();
    const notes = (window.prompt('notes (اختیاری):', '') ?? '').trim();
    setLoading(true);
    setError(null);
    const res = await apiFetch('/aml/consents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subjectNationalId, consentType, notes: notes.length > 0 ? notes : null }),
    });
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    await loadConsents();
    setLoading(false);
  }

  async function revokeConsent(consentId: string) {
    if (!canRevokeConsents) return;
    const reason = (window.prompt('reason (اختیاری):', '') ?? '').trim();
    setLoading(true);
    setError(null);
    const res = await apiFetch(`/aml/consents/${encodeURIComponent(consentId)}/revoke`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: reason.length > 0 ? reason : null }),
    });
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    await loadConsents();
    setLoading(false);
  }

  async function load() {
    setLoading(true);
    setError(null);
    if (tab === 'dashboard') await loadDashboard();
    else if (tab === 'alerts') await loadAlerts();
    else if (tab === 'rules') await loadRules();
    else if (tab === 'consents') await loadConsents();
    else await loadExport();
    setLoading(false);
  }

  useEffect(() => {
    if (tab === 'dashboard' && !canDashboard) {
      router.replace('/forbidden');
      return;
    }
    if (tab === 'alerts' && !canListAlerts) {
      router.replace('/forbidden');
      return;
    }
    if (tab === 'rules' && !canListRules) {
      router.replace('/forbidden');
      return;
    }
    if (tab === 'consents' && !canListConsents) {
      router.replace('/forbidden');
      return;
    }
    if (tab === 'export' && !canExport) {
      router.replace('/forbidden');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <main className="p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-2xl border bg-neutral-50 p-2">
            <ShieldCheck className="h-5 w-5 text-neutral-700" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">AML / CFT</h1>
            <p className="mt-1 text-sm text-neutral-600">KYC/Consent، قواعد مشکوک، گزارش داخلی و ردپا (مطابق سند ۱۴۰۴)</p>
          </div>
        </div>

        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
          disabled={loading}
        >
          <RefreshCcw className="h-4 w-4" />
          بروزرسانی
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('dashboard')}
          className={tab === 'dashboard' ? 'rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white' : 'rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50'}
        >
          داشبورد
        </button>
        <button
          type="button"
          onClick={() => setTab('alerts')}
          className={tab === 'alerts' ? 'rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white' : 'rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50'}
        >
          هشدارها
        </button>
        <button
          type="button"
          onClick={() => setTab('rules')}
          disabled={!canListRules}
          className={
            tab === 'rules'
              ? 'rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50'
              : 'rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50'
          }
        >
          قواعد
        </button>
        <button
          type="button"
          onClick={() => setTab('consents')}
          disabled={!canListConsents}
          className={
            tab === 'consents'
              ? 'rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50'
              : 'rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50'
          }
        >
          رضایت‌ها
        </button>
        <button
          type="button"
          onClick={() => setTab('export')}
          disabled={!canExport}
          className={
            tab === 'export'
              ? 'rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50'
              : 'rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50'
          }
        >
          خروجی
        </button>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <div>خطا: {error.message}</div>
          {error.correlationId ? <div className="mt-1 text-xs">correlationId: {error.correlationId}</div> : null}
        </div>
      ) : null}

      {tab === 'dashboard' ? (
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border p-4">
            <div className="text-xs text-neutral-600">هشدارهای بازِ بدون تخصیص</div>
            <div className="mt-2 text-xl font-semibold">{loading ? '…' : String(dashboard?.openUnassigned ?? '—')}</div>
          </div>
          <div className="rounded-2xl border p-4 md:col-span-2">
            <div className="text-xs text-neutral-600">جمع هشدارها بر اساس وضعیت</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(dashboard?.totalsByStatus || []).map((it: any) => (
                <span key={String(it?.status)} className="inline-flex items-center gap-2 rounded-full border bg-white px-2 py-0.5 text-xs text-neutral-700">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-100 text-[11px] text-neutral-700">{String(it?.total ?? 0)}</span>
                  {String(it?.status)}
                </span>
              ))}
              {!loading && (!dashboard?.totalsByStatus || dashboard.totalsByStatus.length === 0) ? (
                <span className="text-xs text-neutral-600">داده‌ای موجود نیست.</span>
              ) : null}
            </div>
          </div>
        </div>
      ) : tab === 'alerts' ? (
        <div className="mt-6 space-y-3">
          {alerts.map((a: any) => (
            <div key={String(a?.alertId)} className="rounded-2xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CircleAlert className="h-4 w-4 text-neutral-700" />
                    <div className="text-sm font-semibold">{String(a?.title ?? '')}</div>
                  </div>
                  <div className="mt-2 text-xs text-neutral-600">
                    status: {String(a?.status ?? '—')} | severity: {String(a?.severity ?? '—')} | subject: {String(a?.subjectNationalId ?? '—')}
                  </div>
                  <div className="mt-1 text-xs text-neutral-600">assignedTo: {String(a?.assignedTo ?? '—')}</div>
                </div>
                <div className="text-xs text-neutral-500">{a?.createdAt ? new Date(String(a.createdAt)).toLocaleDateString('fa-IR') : ''}</div>
              </div>

              {(canAssignAlerts || canUpdateAlertStatus) ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {canAssignAlerts ? (
                    <button
                      type="button"
                      onClick={() => assignAlert(String(a?.alertId))}
                      className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
                      disabled={loading}
                    >
                      تخصیص
                    </button>
                  ) : null}
                  {canUpdateAlertStatus ? (
                    <button
                      type="button"
                      onClick={() => updateAlertStatus(String(a?.alertId))}
                      className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
                      disabled={loading}
                    >
                      تغییر وضعیت
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
          {!loading && alerts.length === 0 ? <div className="text-sm text-neutral-600">هشداری یافت نشد.</div> : null}
        </div>
      ) : tab === 'rules' ? (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">قواعد</div>
            {canManageRules ? (
              <button
                type="button"
                onClick={createRule}
                className="rounded-xl bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                disabled={loading}
              >
                ایجاد
              </button>
            ) : null}
          </div>

          {rules.map((r: any) => (
            <div key={String(r?.ruleId)} className="rounded-2xl border p-4">
              <div className="text-sm font-semibold">{String(r?.ruleName ?? '')}</div>
              <div className="mt-1 text-xs text-neutral-600">
                type: {String(r?.ruleType ?? '—')} | status: {String(r?.status ?? '—')} | severity: {String(r?.severity ?? '—')}
              </div>
              <div className="mt-2 rounded-xl border bg-neutral-50 p-3 text-xs text-neutral-700">{String(r?.expression ?? '')}</div>
              {canManageRules ? (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => updateRule(String(r?.ruleId))}
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
                    disabled={loading}
                  >
                    ویرایش
                  </button>
                </div>
              ) : null}
            </div>
          ))}
          {!loading && rules.length === 0 ? <div className="text-sm text-neutral-600">قاعده‌ای یافت نشد.</div> : null}
        </div>
      ) : tab === 'consents' ? (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">رضایت‌ها</div>
            {canCreateConsents ? (
              <button
                type="button"
                onClick={createConsent}
                className="rounded-xl bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                disabled={loading}
              >
                ایجاد
              </button>
            ) : null}
          </div>

          {consents.map((c: any) => (
            <div key={String(c?.consentId)} className="rounded-2xl border p-4">
              <div className="text-sm font-semibold">{String(c?.subjectNationalId ?? '—')}</div>
              <div className="mt-1 text-xs text-neutral-600">type: {String(c?.consentType ?? '—')} | status: {String(c?.status ?? '—')}</div>
              {canRevokeConsents && String(c?.status) !== 'revoked' ? (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => revokeConsent(String(c?.consentId))}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    disabled={loading}
                  >
                    لغو
                  </button>
                </div>
              ) : null}
            </div>
          ))}
          {!loading && consents.length === 0 ? <div className="text-sm text-neutral-600">رضایتی یافت نشد.</div> : null}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <div className="text-sm font-medium">Export snapshot</div>
          <div className="rounded-2xl border bg-neutral-50 p-4 text-xs text-neutral-700">
            <pre className="whitespace-pre-wrap">{loading ? '…' : JSON.stringify(exportSnapshot ?? {}, null, 2)}</pre>
          </div>
        </div>
      )}
    </main>
  );
}
