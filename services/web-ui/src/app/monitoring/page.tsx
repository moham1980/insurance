'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';

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
          <p className="mt-1 text-sm text-neutral-600">SLI/SLO + Alerts + Metrics (enterprise ops)</p>
        </div>
        <button type="button" onClick={load} className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" disabled={loading}>
          بروزرسانی
        </button>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <div>خطا: {error.message}</div>
          {error.correlationId ? <div className="mt-1 text-xs">correlationId: {error.correlationId}</div> : null}
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border p-4">
          <div className="text-xs text-neutral-600">SLO total</div>
          <div className="mt-2 text-xl font-semibold">{loading ? '…' : String(dashboard?.slos?.total ?? '—')}</div>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="text-xs text-neutral-600">Healthy</div>
          <div className="mt-2 text-xl font-semibold">{loading ? '…' : String(dashboard?.slos?.healthy ?? '—')}</div>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="text-xs text-neutral-600">Breached</div>
          <div className="mt-2 text-xl font-semibold">{loading ? '…' : String(dashboard?.slos?.breached ?? '—')}</div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <div className="text-sm font-semibold">SLOs</div>
          <div className="mt-2 space-y-2">
            {slos.map((s: any) => (
              <div key={String(s?.sloId)} className="rounded-2xl border p-3">
                <div className="text-sm font-medium">{String(s?.serviceName)} / {String(s?.sloName)}</div>
                <div className="mt-1 text-xs text-neutral-600">status: {String(s?.status)} | target: {String(s?.target)} | window: {String(s?.window)}</div>
                <div className="mt-1 text-xs text-neutral-600">current: {String(s?.currentValue ?? '—')}</div>
              </div>
            ))}
            {!loading && slos.length === 0 ? <div className="text-sm text-neutral-600">SLO ای یافت نشد.</div> : null}
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold">Alerts</div>
          <div className="mt-2 space-y-2">
            {alerts.map((a: any) => (
              <div key={String(a?.alertId)} className="rounded-2xl border p-3">
                <div className="text-sm font-medium">{String(a?.alertName ?? a?.alertId)}</div>
                <div className="mt-1 text-xs text-neutral-600">service: {String(a?.serviceName)} | severity: {String(a?.severity)} | status: {String(a?.status)}</div>
                <div className="mt-2 text-xs text-neutral-600">{String(a?.description ?? '')}</div>
                {canAck && String(a?.status) === 'firing' ? (
                  <div className="mt-3">
                    <button type="button" onClick={() => ack(String(a.alertId))} className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" disabled={loading}>
                      Ack
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
            {!loading && alerts.length === 0 ? <div className="text-sm text-neutral-600">Alert ای یافت نشد.</div> : null}
          </div>
        </div>
      </div>
    </main>
  );
}
