'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, RefreshCw, AlertTriangle, CheckCircle, XCircle, Server } from 'lucide-react';
import { apiFetch, getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';
import { Button, Card, StatCard } from '@insurance/design-system';
import { MOCK_MONITORING } from '@/lib/mock-data';

export default function MonitoringPage() {
  const router = useRouter();
  const perms = enterprisePermissionsForRoles(getAuthUser()?.roles);
  const canDashboard = hasEnterprisePermission(perms, 'monitoring:dashboard:view');
  const canListAlerts = hasEnterprisePermission(perms, 'monitoring:alerts:list');
  const canAck = hasEnterprisePermission(perms, 'monitoring:alerts:ack');
  const canListSLOs = hasEnterprisePermission(perms, 'monitoring:slos:list');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [slos, setSlos] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      if (canDashboard) {
        const d = await apiFetch('/monitoring/dashboard');
        if (!d.success) throw new Error(d.error.message);
        setDashboard(d.data);
      }

      if (canListSLOs) {
        const s = await apiFetch('/monitoring/slos');
        if (!s.success) throw new Error(s.error.message);
        setSlos(Array.isArray((s as any).data) ? ((s as any).data as any[]) : []);
      }

      if (canListAlerts) {
        const a = await apiFetch('/monitoring/alerts?limit=50&offset=0');
        if (!a.success) throw new Error(a.error.message);
        setAlerts(Array.isArray((a as any).data) ? ((a as any).data as any[]) : []);
      }
    } catch (e: any) {
      setError({ message: e?.message || 'Failed to load monitoring data' });
      setSlos(MOCK_MONITORING.map(m => ({ sloId: m.service, serviceName: m.service, sloName: 'availability', status: m.status === 'healthy' ? 'healthy' : 'breached', target: m.uptime, window: '30d', currentValue: m.latency + 'ms' })));
      setAlerts(MOCK_MONITORING.filter(m => m.status !== 'healthy').map(m => ({ alertId: m.service, alertName: m.service + ' degraded', serviceName: m.service, severity: 'warning', status: 'firing', description: `Latency: ${m.latency}ms` })));
    } finally {
      setLoading(false);
    }
  }

  async function ack(alertId: string) {
    if (!canAck) return;
    const acknowledgedBy = (window.prompt('acknowledgedBy:', '') ?? '').trim();
    const res = await apiFetch(`/monitoring/alerts/${encodeURIComponent(alertId)}/ack`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ acknowledgedBy: acknowledgedBy.length > 0 ? acknowledgedBy : null }),
    });
    if (!res.success) {
      setError({ message: res.error.message, correlationId: res.correlationId });
      return;
    }
    await load();
  }

  useEffect(() => {
    if (!canDashboard && !canListAlerts && !canListSLOs) {
      router.replace('/forbidden');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Monitoring / SLO</h1>
          <p className="mt-1 text-sm text-text-muted">SLI/SLO + Alerts + Metrics (enterprise ops)</p>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`ml-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> بروزرسانی
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard title="کل SLO" value={loading ? '…' : String(dashboard?.slos?.total ?? '—')} icon={Activity} changeType="neutral" />
        <StatCard title="سالم" value={loading ? '…' : String(dashboard?.slos?.healthy ?? '—')} icon={CheckCircle} changeType="positive" />
        <StatCard title="نقض شده" value={loading ? '…' : String(dashboard?.slos?.breached ?? '—')} icon={XCircle} changeType="negative" />
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-feedback-error/30 bg-feedback-error-subtle p-4 text-sm text-feedback-error">
          <div>خطا: {error.message}</div>
          {error.correlationId ? <div className="mt-1 text-xs">correlationId: {error.correlationId}</div> : null}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <div className="text-sm font-semibold text-text-primary">SLOها</div>
          <div className="mt-2 space-y-2">
            {slos.map((s: any) => (
              <Card key={String(s?.sloId)} className="p-3">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-text-muted" />
                  <span className="text-sm font-medium text-text-primary">{String(s?.serviceName)} / {String(s?.sloName)}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${String(s?.status) === 'healthy' ? 'bg-feedback-success-subtle text-feedback-success' : 'bg-feedback-error-subtle text-feedback-error'}`}>{String(s?.status)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                  <span>هدف: {String(s?.target)}</span>
                  <span>پنجره: {String(s?.window)}</span>
                  <span>فعلی: {String(s?.currentValue ?? '—')}</span>
                </div>
              </Card>
            ))}
            {!loading && slos.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="mx-auto h-10 w-10 text-text-muted opacity-50" />
                <p className="mt-2 text-sm text-text-muted">SLO ای یافت نشد.</p>
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold text-text-primary">هشدارها</div>
          <div className="mt-2 space-y-2">
            {alerts.map((a: any) => (
              <Card key={String(a?.alertId)} className="p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-feedback-warning" />
                  <span className="text-sm font-medium text-text-primary">{String(a?.alertName ?? a?.alertId)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                  <span>سرویس: {String(a?.serviceName)}</span>
                  <span>شدت: {String(a?.severity)}</span>
                  <span>وضعیت: {String(a?.status)}</span>
                </div>
                <div className="mt-2 text-xs text-text-secondary">{String(a?.description ?? '')}</div>
                {canAck && String(a?.status) === 'firing' ? (
                  <div className="mt-3">
                    <Button variant="ghost" size="sm" onClick={() => ack(String(a.alertId))} disabled={loading}>
                      تأیید
                    </Button>
                  </div>
                ) : null}
              </Card>
            ))}
            {!loading && alerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-10 w-10 text-text-muted opacity-50" />
                <p className="mt-2 text-sm text-text-muted">هشداری یافت نشد.</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
