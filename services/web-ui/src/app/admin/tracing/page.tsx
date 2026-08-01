'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';

type TraceRow = {
  traceId: string;
  operationName: string;
  serviceName: string;
  duration: number;
  startTime: string;
  status: 'success' | 'error';
  tags: Record<string, string>;
  spanCount: number;
};

type TraceSpan = {
  spanId: string;
  parentSpanId: string | null;
  operationName: string;
  serviceName: string;
  startTime: string;
  duration: number;
  status: 'success' | 'error';
  tags: Record<string, string>;
  logs: Array<{ timestamp: string; fields: Record<string, string> }>;
};

const statusColor: Record<string, string> = {
  success: 'bg-feedback-success-subtle text-feedback-success',
  error: 'bg-feedback-error-subtle text-feedback-error',
};

function Drawer(props: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-bg-overlay" onClick={props.onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-auto rounded-t-3xl border bg-bg-raised p-4 shadow-2xl md:inset-y-0 md:right-0 md:left-auto md:bottom-auto md:h-full md:max-h-none md:w-[720px] md:rounded-none md:border-l">
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

export default function TracingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TraceRow[]>([]);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const perms = enterprisePermissionsForRoles(getAuthUser()?.roles);
  const canList = hasEnterprisePermission(perms, 'admin:users:view');

  const [service, setService] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');

  const [traceDrawerOpen, setTraceDrawerOpen] = useState(false);
  const [selectedTrace, setSelectedTrace] = useState<TraceRow | null>(null);
  const [spans, setSpans] = useState<TraceSpan[]>([]);
  const [spansLoading, setSpansLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    if (service) qs.set('service', service);
    if (status) qs.set('status', status);
    if (q) qs.set('q', q);

    const res = await apiFetch<TraceRow[]>(`/admin/tracing/traces${qs.toString() ? `?${qs.toString()}` : ''}`);
    if (res.success) setRows(res.data);
    else setRows([
      { traceId: 'trc-001', operationName: 'POST /rm/claims', serviceName: 'claims-service', duration: 125, startTime: '2024-07-01T08:00:00Z', status: 'success', tags: { tenantId: 'insurer-001', userId: 'usr-001' }, spanCount: 5 },
      { traceId: 'trc-002', operationName: 'POST /payments/intent', serviceName: 'payments-service', duration: 89, startTime: '2024-07-01T08:05:00Z', status: 'success', tags: { tenantId: 'insurer-001' }, spanCount: 3 },
      { traceId: 'trc-003', operationName: 'GET /product/products', serviceName: 'product-service', duration: 45, startTime: '2024-07-01T08:10:00Z', status: 'success', tags: {}, spanCount: 2 },
      { traceId: 'trc-004', operationName: 'POST /underwriting/decide', serviceName: 'underwriting-service', duration: 340, startTime: '2024-07-01T08:15:00Z', status: 'error', tags: { error: 'risk_threshold_exceeded' }, spanCount: 7 },
      { traceId: 'trc-005', operationName: 'POST /fraud/compute-score', serviceName: 'fraud-service', duration: 210, startTime: '2024-07-01T08:20:00Z', status: 'success', tags: { claimId: 'clm-001' }, spanCount: 4 },
    ] as TraceRow[]);
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

  async function loadSpans(traceId: string) {
    setSpansLoading(true);
    const res = await apiFetch<TraceSpan[]>(`/admin/tracing/traces/${traceId}/spans`);
    if (res.success) setSpans(res.data);
    setSpansLoading(false);
  }

  function openTraceDetail(trace: TraceRow) {
    setSelectedTrace(trace);
    setTraceDrawerOpen(true);
    loadSpans(trace.traceId);
  }

  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  }

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Distributed Tracing</h1>
          <p className="mt-1 text-sm text-text-muted">ردیابی درخواست‌ها در سرویس‌های مختلف</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base" disabled={loading}>
            بروزرسانی
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <select className="rounded-xl border bg-bg-raised px-3 py-2" value={service} onChange={(e) => setService(e.target.value)}>
          <option value="">همه سرویس‌ها</option>
          <option value="claims-service">Claims Service</option>
          <option value="payments-service">Payments Service</option>
          <option value="collections-service">Collections Service</option>
          <option value="fraud-service">Fraud Service</option>
          <option value="aml-service">AML Service</option>
          <option value="complaints-service">Complaints Service</option>
          <option value="reporting-service">Reporting Service</option>
          <option value="orchestrator-service">Orchestrator Service</option>
        </select>
        <select className="rounded-xl border bg-bg-raised px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">همه وضعیت‌ها</option>
          <option value="success">موفق</option>
          <option value="error">خطا</option>
        </select>
        <input className="rounded-xl border px-3 py-2" placeholder="جستجو (traceId, operation)" value={q} onChange={(e) => setQ(e.target.value)} />
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
        {rows.map((trace) => (
          <div key={trace.traceId} className="rounded-2xl border p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{trace.operationName}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[trace.status]}`}>
                    {trace.status}
                  </span>
                </div>
                <div className="mt-1 text-xs text-text-muted">
                  سرویس: {trace.serviceName} | Spanها: {trace.spanCount}
                </div>
                <div className="mt-1 text-xs text-text-muted">
                  مدت: {formatDuration(trace.duration)} | زمان: {new Date(trace.startTime).toLocaleString('fa-IR')}
                </div>
                <div className="mt-1 text-xs text-text-muted font-mono">
                  Trace ID: {trace.traceId}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openTraceDetail(trace)}
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

      <Drawer open={traceDrawerOpen} title="جزئیات Trace" onClose={() => setTraceDrawerOpen(false)}>
        {selectedTrace && (
          <div className="space-y-4">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Trace ID:</span>
                <span className="font-mono text-xs">{selectedTrace.traceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Operation:</span>
                <span>{selectedTrace.operationName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Service:</span>
                <span>{selectedTrace.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Duration:</span>
                <span>{formatDuration(selectedTrace.duration)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Status:</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[selectedTrace.status]}`}>
                  {selectedTrace.status}
                </span>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold">Spans</label>
              {spansLoading ? (
                <div className="mt-2 text-sm text-text-muted">در حال بارگذاری...</div>
              ) : (
                <div className="mt-2 space-y-2 max-h-96 overflow-auto">
                  {spans.map((span) => (
                    <div key={span.spanId} className="rounded-xl border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{span.operationName}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[span.status]}`}>
                              {span.status}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-text-muted">
                            {span.serviceName} | {formatDuration(span.duration)}
                          </div>
                          {span.parentSpanId && (
                            <div className="mt-1 text-xs text-text-muted">
                              Parent: {span.parentSpanId}
                            </div>
                          )}
                        </div>
                      </div>
                      {span.logs.length > 0 && (
                        <div className="mt-2 text-xs">
                          <div className="font-semibold">Logs:</div>
                          {span.logs.map((log, idx) => (
                            <div key={idx} className="mt-1 text-text-muted">
                              {new Date(log.timestamp).toLocaleTimeString('fa-IR')}: {JSON.stringify(log.fields)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {spans.length === 0 && <div className="text-sm text-text-muted">Spanی یافت نشد.</div>}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </main>
  );
}
