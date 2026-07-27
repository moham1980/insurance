'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';

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
          <p className="mt-1 text-sm text-neutral-600">Kafka consumer failures + retry + resolve</p>
        </div>
        <button type="button" onClick={() => load()} className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" disabled={loading}>
          بروزرسانی
        </button>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <div>خطا: {error.message}</div>
          {error.correlationId ? <div className="mt-1 text-xs">correlationId: {error.correlationId}</div> : null}
        </div>
      ) : null}

      {canStats ? (
        <div className="mt-6 grid gap-3 md:grid-cols-5">
          {['total', 'pending', 'retrying', 'failed', 'resolved'].map((k) => (
            <div key={k} className="rounded-2xl border p-4">
              <div className="text-xs text-neutral-600">{k}</div>
              <div className="mt-2 text-xl font-semibold">{loading ? '…' : String((stats as any)?.[k] ?? '—')}</div>
            </div>
          ))}
        </div>
      ) : null}

      {canList ? (
        <div className="mt-6 rounded-2xl border p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <div className="text-xs text-neutral-600">status</div>
              <input value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" placeholder="pending | retrying | failed | resolved" />
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-neutral-600">topic</div>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" placeholder="insurance.*" />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={applyFilters} className="rounded-xl bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800" disabled={loading}>
                اعمال فیلتر
              </button>
              <button type="button" onClick={clearFilters} className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" disabled={loading}>
                پاک کردن
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-xs text-neutral-600">page size</div>
              <select
                value={String(limit)}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10) || 50;
                  setLimit(n);
                  setOffset(0);
                  setSelected(null);
                  void load({ offset: 0 });
                }}
                className="rounded-xl border px-3 py-2 text-sm"
                disabled={loading}
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
        </div>
      ) : null}

      {canList ? (
        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_420px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-2xl border bg-white p-3">
              <div className="text-sm text-neutral-700">
                {total != null ? (
                  <span>
                    total: <span className="font-semibold">{total}</span>
                  </span>
                ) : (
                  <span>total: —</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
                  disabled={loading || offset <= 0}
                  onClick={() => load({ offset: Math.max(0, offset - limit) })}
                >
                  قبلی
                </button>
                <div className="text-xs text-neutral-600">
                  page {currentPage}
                  {totalPages ? ` / ${totalPages}` : ''}
                </div>
                <button
                  type="button"
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
                  disabled={loading || total == null || offset + limit >= total}
                  onClick={() => load({ offset: offset + limit })}
                >
                  بعدی
                </button>
              </div>
            </div>

            {rows.map((r) => {
              const active = selected?.dlqId === r.dlqId;
              return (
                <button
                  type="button"
                  key={r.dlqId}
                  onClick={() => setSelected(r)}
                  className={active ? 'w-full rounded-2xl border border-neutral-900 bg-neutral-50 p-4 text-left' : 'w-full rounded-2xl border p-4 text-left hover:bg-neutral-50'}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{r.topic}</div>
                      <div className="mt-1 text-xs text-neutral-600">dlqId: {r.dlqId}</div>
                      <div className="mt-1 text-xs text-neutral-600">status: {r.status} | retry: {r.retryCount}/{r.maxRetries}</div>
                      <div className="mt-1 truncate text-xs text-neutral-600">error: {r.errorMessage}</div>
                    </div>
                    {canResolve ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openResolve(r);
                          }}
                          className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
                          disabled={loading || r.status === 'resolved'}
                        >
                          Resolve
                        </button>
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}

            {!loading && rows.length === 0 ? <div className="text-sm text-neutral-600">موردی یافت نشد.</div> : null}
          </div>

          <div className="rounded-2xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Details</div>
                <div className="mt-1 text-xs text-neutral-600">Select an entry to view full payload</div>
              </div>
              {selected ? (
                <button type="button" onClick={() => setSelected(null)} className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50">
                  بستن
                </button>
              ) : null}
            </div>

            {!selected ? (
              <div className="mt-4 text-sm text-neutral-600">هیچ موردی انتخاب نشده است.</div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-neutral-600">topic</div>
                  <div className="mt-1 text-sm font-medium">{selected.topic}</div>
                  <div className="mt-2 text-xs text-neutral-600">status</div>
                  <div className="mt-1 text-sm font-medium">{selected.status}</div>
                  <div className="mt-2 text-xs text-neutral-600">consumerGroup</div>
                  <div className="mt-1 text-sm font-medium">{selected.consumerGroup}</div>
                </div>

                <details open className="rounded-xl border p-3">
                  <summary className="cursor-pointer text-sm font-medium">Payload</summary>
                  <pre className="mt-3 max-h-80 overflow-auto rounded-xl border bg-neutral-50 p-3 text-xs text-neutral-700">{JSON.stringify(selected.value, null, 2)}</pre>
                </details>

                <details className="rounded-xl border p-3">
                  <summary className="cursor-pointer text-sm font-medium">Headers</summary>
                  <pre className="mt-3 max-h-56 overflow-auto rounded-xl border bg-neutral-50 p-3 text-xs text-neutral-700">{JSON.stringify(selected.headers, null, 2)}</pre>
                </details>

                <details className="rounded-xl border p-3">
                  <summary className="cursor-pointer text-sm font-medium">Error</summary>
                  <div className="mt-3 text-xs text-neutral-600">{selected.errorMessage}</div>
                  {selected.errorStack ? (
                    <pre className="mt-3 max-h-56 overflow-auto rounded-xl border bg-neutral-50 p-3 text-xs text-neutral-700">{selected.errorStack}</pre>
                  ) : null}
                </details>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {resolveModalOpen && resolveTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Resolve DLQ entry</div>
                <div className="mt-1 text-xs text-neutral-600">This will mark the entry as resolved. It does not replay the message.</div>
              </div>
              <button
                type="button"
                className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
                onClick={() => {
                  setResolveModalOpen(false);
                  setResolveTarget(null);
                  setResolveConfirmText('');
                }}
                disabled={loading}
              >
                بستن
              </button>
            </div>

            <div className="mt-4 rounded-xl border p-3">
              <div className="text-xs text-neutral-600">dlqId</div>
              <div className="mt-1 text-sm font-medium">{resolveTarget.dlqId}</div>
              <div className="mt-2 text-xs text-neutral-600">topic</div>
              <div className="mt-1 text-sm font-medium">{resolveTarget.topic}</div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs text-neutral-600">resolution</div>
                <select
                  value={resolveResolution}
                  onChange={(e) => setResolveResolution((e.target.value as any) === 'auto' ? 'auto' : 'manual')}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  disabled={loading}
                >
                  <option value="manual">manual</option>
                  <option value="auto">auto</option>
                </select>
              </div>

              <div>
                <div className="text-xs text-neutral-600">confirmation</div>
                <input
                  value={resolveConfirmText}
                  onChange={(e) => setResolveConfirmText(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  placeholder={`Type: RESOLVE ${resolveTarget.dlqId}`}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
                onClick={() => {
                  setResolveModalOpen(false);
                  setResolveTarget(null);
                  setResolveConfirmText('');
                }}
                disabled={loading}
              >
                انصراف
              </button>
              <button
                type="button"
                className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
                onClick={submitResolve}
                disabled={loading}
              >
                تایید Resolve
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
