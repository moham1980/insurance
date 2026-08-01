'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, RefreshCw, Search, X } from 'lucide-react';
import { apiFetch, getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';
import { Button, Card, StatCard } from '@insurance/design-system';
import { MOCK_DLQ_MESSAGES } from '@/lib/mock-data';

type DlqStats = { total: number; pending: number; retrying: number; failed: number; resolved: number };

type DlqRow = {
  dlqId: string;
  originalEventId: string;
  topic: string;
  partition: number | null;
  offset: string | null;
  key: string | null;
  value: any;
  headers: any;
  errorMessage: string;
  errorStack: string | null;
  consumerGroup: string;
  retryCount: number;
  maxRetries: number;
  status: string;
  nextRetryAt: string | null;
  lastErrorAt: string;
  resolvedAt: string | null;
  createdAt: string;
};

export default function DlqPage() {
  const router = useRouter();
  const perms = enterprisePermissionsForRoles(getAuthUser()?.roles);
  const canStats = hasEnterprisePermission(perms, 'dlq:stats');
  const canList = hasEnterprisePermission(perms, 'dlq:list');
  const canResolve = hasEnterprisePermission(perms, 'dlq:resolve');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const [stats, setStats] = useState<DlqStats | null>(null);
  const [rows, setRows] = useState<DlqRow[]>([]);
  const [status, setStatus] = useState('');
  const [topic, setTopic] = useState('');

  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [selected, setSelected] = useState<DlqRow | null>(null);

  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<DlqRow | null>(null);
  const [resolveResolution, setResolveResolution] = useState<'manual' | 'auto'>('manual');
  const [resolveConfirmText, setResolveConfirmText] = useState('');

  const totalPages = useMemo(() => {
    if (total == null) return null;
    if (!Number.isFinite(total)) return null;
    return Math.max(1, Math.ceil(total / Math.max(1, limit)));
  }, [limit, total]);

  const currentPage = useMemo(() => {
    return Math.floor(offset / Math.max(1, limit)) + 1;
  }, [limit, offset]);

  async function load(next?: { offset?: number }) {
    setLoading(true);
    setError(null);

    try {
      if (canStats) {
        const s = await apiFetch<DlqStats>('/dlq/stats');
        if (!s.success) throw new Error(s.error.message);
        setStats(s.data);
      }

      if (canList) {
        const qs = new URLSearchParams();
        if (status.trim().length > 0) qs.set('status', status.trim());
        if (topic.trim().length > 0) qs.set('topic', topic.trim());
        qs.set('limit', String(limit));
        qs.set('offset', String(next?.offset ?? offset));

        const l = await apiFetch<any>(`/dlq?${qs.toString()}`);
        if (!l.success) throw new Error(l.error.message);

        const data = (l as any)?.data;
        const pagination = (l as any)?.pagination;

        setRows(Array.isArray(data) ? (data as DlqRow[]) : []);
        if (pagination && typeof pagination === 'object') {
          const t = (pagination as any)?.total;
          if (typeof t === 'number') setTotal(t);
        }

        const nextOffset = next?.offset ?? offset;
        setOffset(nextOffset);

        // Keep selection stable if possible
        if (selected) {
          const still = (Array.isArray(data) ? (data as DlqRow[]) : []).find((r) => r.dlqId === selected.dlqId) || null;
          setSelected(still);
        }
      }
    } catch (e: any) {
      setError({ message: e?.message || 'Failed to load DLQ' });
      setRows(MOCK_DLQ_MESSAGES.map(m => ({ ...m, dlqId: m.id, originalEventId: m.id, partition: m.partition, offset: String(m.offset), key: null, value: JSON.parse(m.payload), headers: {}, errorMessage: m.error, errorStack: null, consumerGroup: 'default', retryCount: 0, maxRetries: 3, status: 'pending', nextRetryAt: null, lastErrorAt: m.timestamp, resolvedAt: null, createdAt: m.timestamp })) as DlqRow[]);
      setStats({ total: MOCK_DLQ_MESSAGES.length, pending: MOCK_DLQ_MESSAGES.length, retrying: 0, failed: 0, resolved: 0 });
    } finally {
      setLoading(false);
    }
  }

  async function submitResolve() {
    if (!canResolve) return;
    if (!resolveTarget) return;

    const mustEqual = `RESOLVE ${resolveTarget.dlqId}`;
    if (resolveConfirmText.trim() !== mustEqual) {
      setError({ message: `Confirmation mismatch. Type exactly: ${mustEqual}` });
      return;
    }

    const res = await apiFetch(`/dlq/${encodeURIComponent(resolveTarget.dlqId)}/resolve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ resolution: resolveResolution }),
    });

    if (!res.success) {
      setError({ message: res.error.message, correlationId: res.correlationId });
      return;
    }

    setResolveModalOpen(false);
    setResolveTarget(null);
    setResolveConfirmText('');

    await load({ offset: 0 });
  }

  function openResolve(row: DlqRow) {
    if (!canResolve) return;
    setResolveTarget(row);
    setResolveResolution('manual');
    setResolveConfirmText('');
    setResolveModalOpen(true);
  }

  function applyFilters() {
    setOffset(0);
    setSelected(null);
    void load({ offset: 0 });
  }

  function clearFilters() {
    setStatus('');
    setTopic('');
    setOffset(0);
    setSelected(null);
    void load({ offset: 0 });
  }

  useEffect(() => {
    if (!canStats && !canList) {
      router.replace('/forbidden');
      return;
    }
    load({ offset: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">DLQ</h1>
          <p className="mt-1 text-sm text-text-muted">Kafka consumer failures + retry + resolve</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => load()} disabled={loading}>
          <RefreshCw className={`ml-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> بروزرسانی
        </Button>
      </div>

      {/* Stat Cards */}
      {canStats ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard title="کل" value={loading ? '…' : String(stats?.total ?? '—')} icon={AlertCircle} changeType="neutral" />
          <StatCard title="در انتظار" value={loading ? '…' : String(stats?.pending ?? '—')} icon={AlertCircle} changeType="warning" />
          <StatCard title="در حال تلاش" value={loading ? '…' : String(stats?.retrying ?? '—')} icon={RefreshCw} changeType="warning" />
          <StatCard title="ناموفق" value={loading ? '…' : String(stats?.failed ?? '—')} icon={X} changeType="negative" />
          <StatCard title="حل شده" value={loading ? '…' : String(stats?.resolved ?? '—')} icon={AlertCircle} changeType="positive" />
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-2xl border border-feedback-error/30 bg-feedback-error-subtle p-4 text-sm text-feedback-error">
          <div>خطا: {error.message}</div>
          {error.correlationId ? <div className="mt-1 text-xs">correlationId: {error.correlationId}</div> : null}
        </div>
      ) : null}

      {canList ? (
        <Card className="mt-6 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <div className="text-xs text-text-muted">وضعیت</div>
              <input value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="pending | retrying | failed | resolved" />
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-text-muted">topic</div>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} className="mt-1 w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="insurance.*" />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" size="sm" onClick={applyFilters} disabled={loading}>
                اعمال فیلتر
              </Button>
              <Button variant="ghost" size="sm" onClick={clearFilters} disabled={loading}>
                پاک کردن
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-xs text-text-muted">تعداد در صفحه</div>
              <select
                value={String(limit)}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10) || 50;
                  setLimit(n);
                  setOffset(0);
                  setSelected(null);
                  void load({ offset: 0 });
                }}
                className="rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                disabled={loading}
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
        </Card>
      ) : null}

      {canList ? (
        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_420px]">
          <div className="space-y-3">
            <Card className="flex items-center justify-between gap-3 p-3">
              <div className="text-sm text-text-secondary">
                {total != null ? (
                  <span>
                    کل: <span className="font-semibold">{total}</span>
                  </span>
                ) : (
                  <span>کل: —</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" disabled={loading || offset <= 0} onClick={() => load({ offset: Math.max(0, offset - limit) })}>
                  قبلی
                </Button>
                <div className="text-xs text-text-muted">
                  صفحه {currentPage}
                  {totalPages ? ` / ${totalPages}` : ''}
                </div>
                <Button variant="ghost" size="sm" disabled={loading || total == null || offset + limit >= total} onClick={() => load({ offset: offset + limit })}>
                  بعدی
                </Button>
              </div>
            </Card>

            {rows.map((r) => {
              const active = selected?.dlqId === r.dlqId;
              return (
                <button
                  type="button"
                  key={r.dlqId}
                  onClick={() => setSelected(r)}
                  className={active ? 'w-full rounded-xl border border-brand-primary bg-bg-base p-4 text-right' : 'w-full rounded-xl border border-border-default p-4 text-right hover:bg-bg-base transition-colors'}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-text-primary">{r.topic}</div>
                      <div className="mt-1 text-xs text-text-muted">شناسه: {r.dlqId}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-text-muted">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'resolved' ? 'bg-feedback-success-subtle text-feedback-success' : r.status === 'failed' ? 'bg-feedback-error-subtle text-feedback-error' : 'bg-feedback-warning-subtle text-feedback-warning'}`}>{r.status}</span>
                        <span>تلاش: {r.retryCount}/{r.maxRetries}</span>
                      </div>
                      <div className="mt-1 truncate text-xs text-text-muted">خطا: {r.errorMessage}</div>
                    </div>
                    {canResolve ? (
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openResolve(r); }} disabled={loading || r.status === 'resolved'}>
                          حل
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}

            {!loading && rows.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="mx-auto h-12 w-12 text-text-muted opacity-50" />
                <p className="mt-3 text-sm text-text-muted">موردی یافت نشد.</p>
              </div>
            ) : null}
          </div>

          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-text-primary">جزئیات</div>
                <div className="mt-1 text-xs text-text-muted">یک مورد را برای مشاهده payload کامل انتخاب کنید</div>
              </div>
              {selected ? (
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                  بستن
                </Button>
              ) : null}
            </div>

            {!selected ? (
              <div className="mt-4 text-sm text-text-muted">هیچ موردی انتخاب نشده است.</div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-border-default p-3">
                  <div className="text-xs text-text-muted">topic</div>
                  <div className="mt-1 text-sm font-medium text-text-primary">{selected.topic}</div>
                  <div className="mt-2 text-xs text-text-muted">وضعیت</div>
                  <div className="mt-1 text-sm font-medium text-text-primary">{selected.status}</div>
                  <div className="mt-2 text-xs text-text-muted">consumerGroup</div>
                  <div className="mt-1 text-sm font-medium text-text-primary">{selected.consumerGroup}</div>
                </div>

                <details open className="rounded-xl border p-3">
                  <summary className="cursor-pointer text-sm font-medium">Payload</summary>
                  <pre className="mt-3 max-h-80 overflow-auto rounded-xl border bg-bg-base p-3 text-xs text-text-secondary">{JSON.stringify(selected.value, null, 2)}</pre>
                </details>

                <details className="rounded-xl border p-3">
                  <summary className="cursor-pointer text-sm font-medium">Headers</summary>
                  <pre className="mt-3 max-h-56 overflow-auto rounded-xl border bg-bg-base p-3 text-xs text-text-secondary">{JSON.stringify(selected.headers, null, 2)}</pre>
                </details>

                <details className="rounded-xl border p-3">
                  <summary className="cursor-pointer text-sm font-medium">Error</summary>
                  <div className="mt-3 text-xs text-text-muted">{selected.errorMessage}</div>
                  {selected.errorStack ? (
                    <pre className="mt-3 max-h-56 overflow-auto rounded-xl border bg-bg-base p-3 text-xs text-text-secondary">{selected.errorStack}</pre>
                  ) : null}
                </details>
              </div>
            )}
          </Card>
        </div>
      ) : null}

      {resolveModalOpen && resolveTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay p-4">
          <Card className="w-full max-w-xl p-5" elevation={3}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-text-primary">حل DLQ entry</div>
                <div className="mt-1 text-xs text-text-muted">این عملیات entry را به‌عنوان حل‌شده علامت‌گذاری می‌کند. پیام را مجدداً ارسال نمی‌کند.</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setResolveModalOpen(false); setResolveTarget(null); setResolveConfirmText(''); }} disabled={loading}>
                بستن
              </Button>
            </div>

            <div className="mt-4 rounded-xl border border-border-default p-3">
              <div className="text-xs text-text-muted">شناسه</div>
              <div className="mt-1 text-sm font-medium text-text-primary">{resolveTarget.dlqId}</div>
              <div className="mt-2 text-xs text-text-muted">topic</div>
              <div className="mt-1 text-sm font-medium text-text-primary">{resolveTarget.topic}</div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs text-text-muted">نوع حل</div>
                <select
                  value={resolveResolution}
                  onChange={(e) => setResolveResolution((e.target.value as any) === 'auto' ? 'auto' : 'manual')}
                  className="mt-1 w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  disabled={loading}
                >
                  <option value="manual">دستی</option>
                  <option value="auto">خودکار</option>
                </select>
              </div>

              <div>
                <div className="text-xs text-text-muted">تأیید</div>
                <input
                  value={resolveConfirmText}
                  onChange={(e) => setResolveConfirmText(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  placeholder={`Type: RESOLVE ${resolveTarget.dlqId}`}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="ghost" size="md" onClick={() => { setResolveModalOpen(false); setResolveTarget(null); setResolveConfirmText(''); }} disabled={loading}>
                انصراف
              </Button>
              <Button variant="danger" size="md" onClick={submitResolve} disabled={loading}>
                تأیید حل
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </main>
  );
}
