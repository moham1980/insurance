
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, RefreshCcw, ShieldCheck, Plus, Edit, Ban, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { apiFetch, getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';
import { Button, Card, StatCard } from '@insurance/design-system';
import { MOCK_AML_ALERTS, MOCK_AML_DASHBOARD, MOCK_AML_RULES, MOCK_AML_CONSENTS, MOCK_AML_EXPORT } from '@/lib/mock-data';

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
    else setDashboard(MOCK_AML_DASHBOARD);
  }

  async function loadAlerts() {
    const res = await apiFetch('/aml/alerts?limit=50&offset=0');
    if (res.success) setAlerts((res.data as any)?.rows ?? []);
    else setAlerts(MOCK_AML_ALERTS as any[]);
  }

  async function loadRules() {
    const res = await apiFetch('/aml/rules?limit=50&offset=0');
    if (res.success) setRules((res.data as any)?.rows ?? []);
    else setRules(MOCK_AML_RULES as any[]);
  }

  async function loadConsents() {
    const res = await apiFetch('/aml/consents?limit=50&offset=0');
    if (res.success) setConsents((res.data as any)?.rows ?? []);
    else setConsents(MOCK_AML_CONSENTS as any[]);
  }

  async function loadExport() {
    const res = await apiFetch('/aml/export');
    if (res.success) setExportSnapshot(res.data);
    else setExportSnapshot(MOCK_AML_EXPORT);
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
    <main className="p-6 max-w-7xl mx-auto" dir="rtl">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">AML / CFT</h1>
            <p className="mt-1 text-sm text-text-muted">KYC/Consent، قواعد مشکوک، گزارش داخلی و ردپا (مطابق سند ۱۴۰۴)</p>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={load} disabled={loading} isLoading={loading}>
          <RefreshCcw className="h-4 w-4 ml-1" />
          بروزرسانی
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant={tab === 'dashboard' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('dashboard')}>
          داشبورد
        </Button>
        <Button variant={tab === 'alerts' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('alerts')}>
          هشدارها
        </Button>
        <Button variant={tab === 'rules' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('rules')} disabled={!canListRules}>
          قواعد
        </Button>
        <Button variant={tab === 'consents' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('consents')} disabled={!canListConsents}>
          رضایت‌ها
        </Button>
        <Button variant={tab === 'export' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('export')} disabled={!canExport}>
          خروجی
        </Button>
      </div>

      {error ? (
        <div className="mt-6 rounded-xl border border-feedback-error/30 bg-feedback-error-subtle p-4 text-sm text-feedback-error flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <div>خطا: {error.message}</div>
            {error.correlationId ? <div className="mt-1 text-xs">correlationId: {error.correlationId}</div> : null}
          </div>
        </div>
      ) : null}

      {tab === 'dashboard' ? (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <StatCard title="هشدارهای باز بدون تخصیص" value={loading ? '…' : String(dashboard?.openUnassigned ?? '—')} icon={AlertTriangle} changeType="warning" />
          <StatCard title="کل هشدارها" value={alerts.length} icon={AlertCircle} />
          <StatCard title="هشدارهای تأییدشده" value={alerts.filter((a: any) => a?.status === 'confirmed' || a?.status === 'cleared').length} changeType="positive" change="بررسی‌شده" icon={CheckCircle} />
        </div>
      ) : tab === 'alerts' ? (
        <div className="mt-6 space-y-3">
          {alerts.map((a: any) => (
            <Card key={String(a?.alertId)} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-text-secondary" />
                    <div className="text-sm font-semibold">{String(a?.title ?? a?.description ?? '')}</div>
                  </div>
                  <div className="mt-2 text-xs text-text-muted">
                    status: {String(a?.status ?? '—')} | severity: {String(a?.severity ?? a?.risk ?? '—')} | subject: {String(a?.subjectNationalId ?? a?.partyId ?? '—')}
                  </div>
                  <div className="mt-1 text-xs text-text-muted">assignedTo: {String(a?.assignedTo ?? '—')}</div>
                </div>
                <div className="text-xs text-text-muted">{a?.createdAt ? new Date(String(a.createdAt)).toLocaleDateString('fa-IR') : ''}</div>
              </div>

              {(canAssignAlerts || canUpdateAlertStatus) ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {canAssignAlerts ? (
                    <Button variant="secondary" size="sm" onClick={() => assignAlert(String(a?.alertId))} disabled={loading}>
                      تخصیص
                    </Button>
                  ) : null}
                  {canUpdateAlertStatus ? (
                    <Button variant="ghost" size="sm" onClick={() => updateAlertStatus(String(a?.alertId))} disabled={loading}>
                      تغییر وضعیت
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </Card>
          ))}
          {!loading && alerts.length === 0 ? <div className="text-sm text-text-muted text-center py-8">هشداری یافت نشد.</div> : null}
        </div>
      ) : tab === 'rules' ? (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">قواعد</div>
            {canManageRules ? (
              <Button size="sm" onClick={createRule} disabled={loading}>
                <Plus className="h-4 w-4 ml-1" />
                ایجاد
              </Button>
            ) : null}
          </div>

          {rules.map((r: any) => (
            <Card key={String(r?.ruleId)} className="p-4">
              <div className="text-sm font-semibold">{String(r?.ruleName ?? '')}</div>
              <div className="mt-1 text-xs text-text-muted">
                type: {String(r?.ruleType ?? '—')} | status: {String(r?.status ?? '—')} | severity: {String(r?.severity ?? '—')}
              </div>
              <div className="mt-2 rounded-xl border border-border-default bg-bg-base p-3 text-xs text-text-secondary">{String(r?.expression ?? '')}</div>
              {canManageRules ? (
                <div className="mt-3">
                  <Button variant="ghost" size="sm" onClick={() => updateRule(String(r?.ruleId))} disabled={loading}>
                    <Edit className="h-4 w-4 ml-1" />
                    ویرایش
                  </Button>
                </div>
              ) : null}
            </Card>
          ))}
          {!loading && rules.length === 0 ? <div className="text-sm text-text-muted text-center py-8">قاعده‌ای یافت نشد.</div> : null}
        </div>
      ) : tab === 'consents' ? (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">رضایت‌ها</div>
            {canCreateConsents ? (
              <Button size="sm" onClick={createConsent} disabled={loading}>
                <Plus className="h-4 w-4 ml-1" />
                ایجاد
              </Button>
            ) : null}
          </div>

          {consents.map((c: any) => (
            <Card key={String(c?.consentId)} className="p-4">
              <div className="text-sm font-semibold">{String(c?.subjectNationalId ?? '—')}</div>
              <div className="mt-1 text-xs text-text-muted">type: {String(c?.consentType ?? '—')} | status: {String(c?.status ?? '—')}</div>
              {canRevokeConsents && String(c?.status) !== 'revoked' ? (
                <div className="mt-3">
                  <Button variant="danger" size="sm" onClick={() => revokeConsent(String(c?.consentId))} disabled={loading}>
                    <Ban className="h-4 w-4 ml-1" />
                    لغو
                  </Button>
                </div>
              ) : null}
            </Card>
          ))}
          {!loading && consents.length === 0 ? <div className="text-sm text-text-muted text-center py-8">رضایتی یافت نشد.</div> : null}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <div className="text-sm font-medium">Export snapshot</div>
          <Card className="p-4 text-xs text-text-secondary">
            <pre className="whitespace-pre-wrap">{loading ? '…' : JSON.stringify(exportSnapshot ?? {}, null, 2)}</pre>
          </Card>
        </div>
      )}
    </main>
  );
}
