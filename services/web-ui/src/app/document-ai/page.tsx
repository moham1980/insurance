'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';

export default function DocumentAiPage() {
  const router = useRouter();
  const perms = enterprisePermissionsForRoles(getAuthUser()?.roles);

  const canJobs = hasEnterprisePermission(perms, 'document_ai:jobs:list');
  const canAudit = hasEnterprisePermission(perms, 'document_ai:audit:list');
  const canUsage = hasEnterprisePermission(perms, 'document_ai:usage:view');
  const canRetry = hasEnterprisePermission(perms, 'document_ai:jobs:retry');

  const canEvalCasesList = hasEnterprisePermission(perms, 'document_ai:eval:cases:list');
  const canEvalCasesManage = hasEnterprisePermission(perms, 'document_ai:eval:cases:manage');
  const canEvalRunsList = hasEnterprisePermission(perms, 'document_ai:eval:runs:list');
  const canEvalRunsStart = hasEnterprisePermission(perms, 'document_ai:eval:runs:start');
  const canEvalRunsView = hasEnterprisePermission(perms, 'document_ai:eval:runs:view');

  const [tab, setTab] = useState<'jobs' | 'audit' | 'usage' | 'eval'>('jobs');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const [jobs, setJobs] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [usage, setUsage] = useState<any[]>([]);

  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState<number | null>(null);

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  const [jobStatus, setJobStatus] = useState('');
  const [jobDocumentId, setJobDocumentId] = useState('');
  const [jobTenantId, setJobTenantId] = useState('');

  const [auditDocumentId, setAuditDocumentId] = useState('');
  const [auditDecision, setAuditDecision] = useState('');
  const [auditTenantId, setAuditTenantId] = useState('');

  const [usageTenantId, setUsageTenantId] = useState('');
  const [usageDate, setUsageDate] = useState('');

  const [retryModalOpen, setRetryModalOpen] = useState(false);
  const [retryTarget, setRetryTarget] = useState<any | null>(null);
  const [retryConfirmText, setRetryConfirmText] = useState('');

  const [evalMode, setEvalMode] = useState<'cases' | 'runs'>('cases');

  const [evalCases, setEvalCases] = useState<any[]>([]);
  const [evalCasesEnabled, setEvalCasesEnabled] = useState('');
  const [evalCasesTag, setEvalCasesTag] = useState('');
  const [selectedEvalCase, setSelectedEvalCase] = useState<any | null>(null);

  const [createCaseOpen, setCreateCaseOpen] = useState(false);
  const [createCaseName, setCreateCaseName] = useState('');
  const [createCaseDocumentId, setCreateCaseDocumentId] = useState('');
  const [createCaseTags, setCreateCaseTags] = useState('');
  const [createCaseEnabled, setCreateCaseEnabled] = useState(true);
  const [createCaseExpectedJson, setCreateCaseExpectedJson] = useState(
    JSON.stringify(
      {
        invoiceNumber: '',
        totalAmount: '',
        currency: 'IRR',
      },
      null,
      2
    )
  );
  const [createCaseConfirmText, setCreateCaseConfirmText] = useState('');

  const [editCaseOpen, setEditCaseOpen] = useState(false);
  const [editCaseExpectedJson, setEditCaseExpectedJson] = useState('');
  const [editCaseTags, setEditCaseTags] = useState('');
  const [editCaseEnabled, setEditCaseEnabled] = useState(true);
  const [editCaseConfirmText, setEditCaseConfirmText] = useState('');

  const [evalRuns, setEvalRuns] = useState<any[]>([]);
  const [evalRunsStatus, setEvalRunsStatus] = useState('');
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [evalResults, setEvalResults] = useState<any[]>([]);
  const [resultsLimit, setResultsLimit] = useState(50);
  const [resultsOffset, setResultsOffset] = useState(0);
  const [resultsTotal, setResultsTotal] = useState<number | null>(null);

  const [startRunOpen, setStartRunOpen] = useState(false);
  const [startRunOnlyEnabled, setStartRunOnlyEnabled] = useState(true);
  const [startRunMaxCases, setStartRunMaxCases] = useState('50');
  const [startRunConfirmText, setStartRunConfirmText] = useState('');

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
      if (tab === 'jobs') {
        if (!canJobs) throw new Error('FORBIDDEN');

        const qs = new URLSearchParams();
        qs.set('limit', String(limit));
        qs.set('offset', String(next?.offset ?? offset));
        if (jobStatus.trim().length > 0) qs.set('status', jobStatus.trim());
        if (jobDocumentId.trim().length > 0) qs.set('documentId', jobDocumentId.trim());
        if (jobTenantId.trim().length > 0) qs.set('tenantId', jobTenantId.trim());

        const res = await apiFetch<any>(`/document-ai/jobs?${qs.toString()}`);
        if (!res.success) throw new Error(res.error.message);

        const data = (res as any)?.data;
        const pagination = (res as any)?.pagination;
        setJobs(Array.isArray(data) ? data : []);
        if (pagination && typeof pagination === 'object') {
          const t = (pagination as any)?.total;
          if (typeof t === 'number') setTotal(t);
        }

        const nextOffset = next?.offset ?? offset;
        setOffset(nextOffset);

        if (selectedJobId) {
          const found = (Array.isArray(data) ? data : []).find((j: any) => String(j?.jobId) === String(selectedJobId));
          if (!found) {
            setSelectedJobId(null);
            setSelectedJob(null);
          }
        }
      }

      if (tab === 'audit') {
        if (!canAudit) throw new Error('FORBIDDEN');

        const qs = new URLSearchParams();
        qs.set('limit', String(limit));
        qs.set('offset', String(next?.offset ?? offset));
        if (auditDocumentId.trim().length > 0) qs.set('documentId', auditDocumentId.trim());
        if (auditDecision.trim().length > 0) qs.set('decision', auditDecision.trim());
        if (auditTenantId.trim().length > 0) qs.set('tenantId', auditTenantId.trim());

        const res = await apiFetch<any>(`/document-ai/audit?${qs.toString()}`);
        if (!res.success) throw new Error(res.error.message);
        const data = (res as any)?.data;
        const pagination = (res as any)?.pagination;
        setAudit(Array.isArray(data) ? data : []);
        if (pagination && typeof pagination === 'object') {
          const t = (pagination as any)?.total;
          if (typeof t === 'number') setTotal(t);
        }

        const nextOffset = next?.offset ?? offset;
        setOffset(nextOffset);
      }

      if (tab === 'usage') {
        if (!canUsage) throw new Error('FORBIDDEN');

        const qs = new URLSearchParams();
        qs.set('limit', String(limit));
        qs.set('offset', String(next?.offset ?? offset));
        if (usageTenantId.trim().length > 0) qs.set('tenantId', usageTenantId.trim());
        if (usageDate.trim().length > 0) qs.set('usageDate', usageDate.trim());

        const res = await apiFetch<any>(`/document-ai/usage/daily?${qs.toString()}`);
        if (!res.success) throw new Error(res.error.message);
        const data = (res as any)?.data;
        const pagination = (res as any)?.pagination;
        setUsage(Array.isArray(data) ? data : []);
        if (pagination && typeof pagination === 'object') {
          const t = (pagination as any)?.total;
          if (typeof t === 'number') setTotal(t);
        }

        const nextOffset = next?.offset ?? offset;
        setOffset(nextOffset);
      }

      if (tab === 'eval') {
        if (!canEvalCasesList && !canEvalRunsList && !canEvalRunsView) throw new Error('FORBIDDEN');

        if (evalMode === 'cases') {
          if (!canEvalCasesList) throw new Error('FORBIDDEN');
          const qs = new URLSearchParams();
          qs.set('limit', String(limit));
          qs.set('offset', String(next?.offset ?? offset));
          if (evalCasesEnabled === 'true' || evalCasesEnabled === 'false') qs.set('enabled', evalCasesEnabled);
          if (evalCasesTag.trim().length > 0) qs.set('tag', evalCasesTag.trim());

          const res = await apiFetch<any>(`/document-ai/eval/cases?${qs.toString()}`);
          if (!res.success) throw new Error(res.error.message);
          const data = (res as any)?.data;
          const pagination = (res as any)?.pagination;
          setEvalCases(Array.isArray(data) ? data : []);
          if (pagination && typeof pagination === 'object') {
            const t = (pagination as any)?.total;
            if (typeof t === 'number') setTotal(t);
          }
          const nextOffset = next?.offset ?? offset;
          setOffset(nextOffset);
          if (selectedEvalCase) {
            const found = (Array.isArray(data) ? data : []).find((c: any) => String(c?.caseId) === String(selectedEvalCase?.caseId)) || null;
            setSelectedEvalCase(found);
          }
        }

        if (evalMode === 'runs') {
          if (!canEvalRunsList) throw new Error('FORBIDDEN');
          const qs = new URLSearchParams();
          qs.set('limit', String(limit));
          qs.set('offset', String(next?.offset ?? offset));
          if (evalRunsStatus.trim().length > 0) qs.set('status', evalRunsStatus.trim());

          const res = await apiFetch<any>(`/document-ai/eval/runs?${qs.toString()}`);
          if (!res.success) throw new Error(res.error.message);
          const data = (res as any)?.data;
          const pagination = (res as any)?.pagination;
          setEvalRuns(Array.isArray(data) ? data : []);
          if (pagination && typeof pagination === 'object') {
            const t = (pagination as any)?.total;
            if (typeof t === 'number') setTotal(t);
          }
          const nextOffset = next?.offset ?? offset;
          setOffset(nextOffset);

          if (selectedRun) {
            const found = (Array.isArray(data) ? data : []).find((r: any) => String(r?.runId) === String(selectedRun?.runId)) || null;
            setSelectedRun(found);
            if (!found) {
              setEvalResults([]);
              setResultsOffset(0);
              setResultsTotal(null);
            }
          }
        }
      }

      // load() continues below...
    } catch (e: any) {
      if (String(e?.message || '').includes('FORBIDDEN')) {
        router.replace('/forbidden');
        return;
      }
      setError({ message: e?.message || 'Failed to load Document AI ops' });
    } finally {
      setLoading(false);
    }
  }

  async function loadRunResults(runId: string, next?: { offset?: number }) {
    if (!canEvalRunsView) {
      router.replace('/forbidden');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const qs = new URLSearchParams();
      qs.set('limit', String(resultsLimit));
      qs.set('offset', String(next?.offset ?? resultsOffset));
      const res = await apiFetch<any>(`/document-ai/eval/runs/${encodeURIComponent(runId)}/results?${qs.toString()}`);
      if (!res.success) throw new Error(res.error.message);
      const data = (res as any)?.data;
      const pagination = (res as any)?.pagination;
      setEvalResults(Array.isArray(data) ? data : []);
      if (pagination && typeof pagination === 'object') {
        const t = (pagination as any)?.total;
        if (typeof t === 'number') setResultsTotal(t);
      }
      const nextOffset = next?.offset ?? resultsOffset;
      setResultsOffset(nextOffset);
    } catch (e: any) {
      setError({ message: e?.message || 'Failed to load eval results' });
    } finally {
      setLoading(false);
    }
  }

  function openCreateCase() {
    if (!canEvalCasesManage) return;
    setCreateCaseOpen(true);
    setCreateCaseName('');
    setCreateCaseDocumentId('');
    setCreateCaseTags('');
    setCreateCaseEnabled(true);
    setCreateCaseConfirmText('');
  }

  async function submitCreateCase() {
    if (!canEvalCasesManage) return;
    const mustEqual = 'CREATE CASE';
    if (createCaseConfirmText.trim() !== mustEqual) {
      setError({ message: `Confirmation mismatch. Type exactly: ${mustEqual}` });
      return;
    }

    let expected: any;
    try {
      expected = JSON.parse(createCaseExpectedJson);
    } catch {
      setError({ message: 'expected JSON is invalid' });
      return;
    }

    const tags = createCaseTags
      .split(',')
      .map((x: string) => x.trim())
      .filter(Boolean);

    const res = await apiFetch<any>('/document-ai/eval/cases', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: createCaseName,
        documentId: createCaseDocumentId,
        expected,
        tags: tags.length > 0 ? tags : null,
        enabled: createCaseEnabled,
      }),
    });

    if (!res.success) {
      setError({ message: res.error.message, correlationId: res.correlationId });
      return;
    }

    setCreateCaseOpen(false);
    await load({ offset: 0 });
  }

  function openEditCase(row: any) {
    if (!canEvalCasesManage) return;
    setSelectedEvalCase(row);
    setEditCaseOpen(true);
    setEditCaseExpectedJson(JSON.stringify(row?.expected ?? {}, null, 2));
    setEditCaseTags(Array.isArray(row?.tags) ? row.tags.join(', ') : '');
    setEditCaseEnabled(Boolean(row?.enabled));
    setEditCaseConfirmText('');
  }

  async function submitEditCase() {
    if (!canEvalCasesManage) return;
    if (!selectedEvalCase) return;

    const mustEqual = `UPDATE ${String(selectedEvalCase.caseId)}`;
    if (editCaseConfirmText.trim() !== mustEqual) {
      setError({ message: `Confirmation mismatch. Type exactly: ${mustEqual}` });
      return;
    }

    let expected: any;
    try {
      expected = JSON.parse(editCaseExpectedJson);
    } catch {
      setError({ message: 'expected JSON is invalid' });
      return;
    }

    const tags = editCaseTags
      .split(',')
      .map((x: string) => x.trim())
      .filter(Boolean);

    const res = await apiFetch<any>(`/document-ai/eval/cases/${encodeURIComponent(String(selectedEvalCase.caseId))}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        expected,
        tags: tags.length > 0 ? tags : null,
        enabled: editCaseEnabled,
      }),
    });

    if (!res.success) {
      setError({ message: res.error.message, correlationId: res.correlationId });
      return;
    }

    setEditCaseOpen(false);
    await load();
  }

  function openStartRun() {
    if (!canEvalRunsStart) return;
    setStartRunOpen(true);
    setStartRunOnlyEnabled(true);
    setStartRunMaxCases('50');
    setStartRunConfirmText('');
  }

  async function submitStartRun() {
    if (!canEvalRunsStart) return;
    const mustEqual = 'START RUN';
    if (startRunConfirmText.trim() !== mustEqual) {
      setError({ message: `Confirmation mismatch. Type exactly: ${mustEqual}` });
      return;
    }

    const maxCases = parseInt(startRunMaxCases, 10);
    if (!Number.isFinite(maxCases) || maxCases <= 0) {
      setError({ message: 'maxCases must be a positive number' });
      return;
    }

    const res = await apiFetch<any>('/document-ai/eval/runs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        onlyEnabled: startRunOnlyEnabled,
        maxCases,
      }),
    });

    if (!res.success) {
      setError({ message: res.error.message, correlationId: res.correlationId });
      return;
    }

    setStartRunOpen(false);
    setSelectedRun(null);
    setEvalResults([]);
    setResultsOffset(0);
    setResultsTotal(null);
    await load({ offset: 0 });
  }

  async function loadJob(jobId: string) {
    const res = await apiFetch<any>(`/document-ai/jobs/${encodeURIComponent(jobId)}`);
    if (!res.success) {
      setError({ message: res.error.message, correlationId: res.correlationId });
      return;
    }
    setSelectedJob(res.data);
  }

  function openRetry(job: any) {
    if (!canRetry) return;
    setRetryTarget(job);
    setRetryConfirmText('');
    setRetryModalOpen(true);
  }

  async function submitRetry() {
    if (!canRetry) return;
    if (!retryTarget) return;

    const jobId = String(retryTarget?.jobId);
    const mustEqual = `RETRY ${jobId}`;
    if (retryConfirmText.trim() !== mustEqual) {
      setError({ message: `Confirmation mismatch. Type exactly: ${mustEqual}` });
      return;
    }

    const res = await apiFetch(`/document-ai/jobs/${encodeURIComponent(jobId)}/retry`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.success) {
      setError({ message: res.error.message, correlationId: res.correlationId });
      return;
    }

    setRetryModalOpen(false);
    setRetryTarget(null);
    setRetryConfirmText('');
    setSelectedJobId(null);
    setSelectedJob(null);

    await load({ offset: 0 });
  }

  function applyFilters() {
    setOffset(0);
    setSelectedJobId(null);
    setSelectedJob(null);
    void load({ offset: 0 });
  }

  function resetFilters() {
    if (tab === 'jobs') {
      setJobStatus('');
      setJobDocumentId('');
      setJobTenantId('');
    }
    if (tab === 'audit') {
      setAuditDocumentId('');
      setAuditDecision('');
      setAuditTenantId('');
    }
    if (tab === 'usage') {
      setUsageTenantId('');
      setUsageDate('');
    }
    setOffset(0);
    setSelectedJobId(null);
    setSelectedJob(null);
    void load({ offset: 0 });
  }

  useEffect(() => {
    if (!canJobs && !canAudit && !canUsage && !canEvalCasesList && !canEvalRunsList) {
      router.replace('/forbidden');
      return;
    }
    setOffset(0);
    setTotal(null);
    setSelectedJobId(null);
    setSelectedJob(null);
    load({ offset: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Document AI</h1>
          <p className="mt-1 text-sm text-text-muted">Jobs / Audit / Usage (enterprise ops)</p>
        </div>
        <button type="button" onClick={() => load()} className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base" disabled={loading}>
          بروزرسانی
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={() => setTab('jobs')} className={tab === 'jobs' ? 'rounded-xl bg-brand-primary px-3 py-2 text-sm text-text-on-brand' : 'rounded-xl border px-3 py-2 text-sm hover:bg-bg-base'}>
          Jobs
        </button>
        <button type="button" onClick={() => setTab('audit')} className={tab === 'audit' ? 'rounded-xl bg-brand-primary px-3 py-2 text-sm text-text-on-brand' : 'rounded-xl border px-3 py-2 text-sm hover:bg-bg-base'}>
          Audit
        </button>
        <button type="button" onClick={() => setTab('usage')} className={tab === 'usage' ? 'rounded-xl bg-brand-primary px-3 py-2 text-sm text-text-on-brand' : 'rounded-xl border px-3 py-2 text-sm hover:bg-bg-base'}>
          Usage
        </button>
        {(canEvalCasesList || canEvalRunsList || canEvalRunsView) ? (
          <button type="button" onClick={() => setTab('eval')} className={tab === 'eval' ? 'rounded-xl bg-brand-primary px-3 py-2 text-sm text-text-on-brand' : 'rounded-xl border px-3 py-2 text-sm hover:bg-bg-base'}>
            Eval
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-feedback-error/30 bg-feedback-error-subtle p-4 text-sm text-feedback-error">
          <div>خطا: {error.message}</div>
          {error.correlationId ? <div className="mt-1 text-xs">correlationId: {error.correlationId}</div> : null}
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-text-secondary">
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
              className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base"
              disabled={loading || offset <= 0}
              onClick={() => load({ offset: Math.max(0, offset - limit) })}
            >
              قبلی
            </button>
            <div className="text-xs text-text-muted">
              page {currentPage}
              {totalPages ? ` / ${totalPages}` : ''}
            </div>
            <button
              type="button"
              className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base"
              disabled={loading || total == null || offset + limit >= total}
              onClick={() => load({ offset: offset + limit })}
            >
              بعدی
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-text-muted">page size</div>
            <select
              value={String(limit)}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10) || 50;
                setLimit(n);
                setOffset(0);
                setSelectedJobId(null);
                setSelectedJob(null);
                void load({ offset: 0 });
              }}
              className="rounded-xl border px-3 py-2 text-sm"
              disabled={loading}
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {tab === 'jobs' ? (
            <>
              <div>
                <div className="text-xs text-text-muted">status</div>
                <input value={jobStatus} onChange={(e) => setJobStatus(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" placeholder="pending | processing | retry | completed | dead_letter" />
              </div>
              <div>
                <div className="text-xs text-text-muted">documentId</div>
                <input value={jobDocumentId} onChange={(e) => setJobDocumentId(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" placeholder="UUID" />
              </div>
              <div>
                <div className="text-xs text-text-muted">tenantId</div>
                <input value={jobTenantId} onChange={(e) => setJobTenantId(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" placeholder="default" />
              </div>
            </>
          ) : tab === 'audit' ? (
            <>
              <div>
                <div className="text-xs text-text-muted">documentId</div>
                <input value={auditDocumentId} onChange={(e) => setAuditDocumentId(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" placeholder="UUID" />
              </div>
              <div>
                <div className="text-xs text-text-muted">decision</div>
                <input value={auditDecision} onChange={(e) => setAuditDecision(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" placeholder="approved | rejected | needs_review" />
              </div>
              <div>
                <div className="text-xs text-text-muted">tenantId</div>
                <input value={auditTenantId} onChange={(e) => setAuditTenantId(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" placeholder="default" />
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="text-xs text-text-muted">tenantId</div>
                <input value={usageTenantId} onChange={(e) => setUsageTenantId(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" placeholder="default" />
              </div>
              <div>
                <div className="text-xs text-text-muted">usageDate</div>
                <input value={usageDate} onChange={(e) => setUsageDate(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" placeholder="YYYY-MM-DD" />
              </div>
              <div />
            </>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={applyFilters} className="rounded-xl bg-brand-primary px-3 py-2 text-sm font-medium text-text-on-brand hover:opacity-90" disabled={loading}>
            اعمال فیلتر
          </button>
          <button type="button" onClick={resetFilters} className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base" disabled={loading}>
            پاک کردن
          </button>
        </div>
      </div>

      {tab === 'jobs' ? (
        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_420px]">
          <div className="space-y-3">
            {jobs.map((j: any) => {
              const id = String(j?.jobId);
              const active = selectedJobId === id;
              return (
                <button
                  type="button"
                  key={id}
                  onClick={() => {
                    setSelectedJobId(id);
                    void loadJob(id);
                  }}
                  className={active ? 'w-full rounded-2xl border border-brand-primary bg-bg-base p-4 text-left' : 'w-full rounded-2xl border p-4 text-left hover:bg-bg-base'}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">jobId: {id}</div>
                      <div className="mt-1 text-xs text-text-muted">status: {String(j?.status)} | attempt: {String(j?.attempt)}/{String(j?.maxAttempts)}</div>
                      <div className="mt-1 text-xs text-text-muted">documentId: {String(j?.documentId)} | tenantId: {String(j?.tenantId ?? '—')}</div>
                      {j?.lastErrorMessage ? <div className="mt-1 truncate text-xs text-feedback-error">error: {String(j.lastErrorMessage)}</div> : null}
                    </div>

                    <div className="flex items-center gap-2">
                      {canRetry ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openRetry(j);
                          }}
                          className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base"
                          disabled={loading}
                        >
                          Retry
                        </button>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}

            {!loading && jobs.length === 0 ? <div className="text-sm text-text-muted">Job ای یافت نشد.</div> : null}
          </div>

          <div className="rounded-2xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Job details</div>
                <div className="mt-1 text-xs text-text-muted">GET /document-ai/jobs/:jobId</div>
              </div>
              {selectedJobId ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedJobId(null);
                    setSelectedJob(null);
                  }}
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base"
                >
                  بستن
                </button>
              ) : null}
            </div>

            {!selectedJob ? (
              <div className="mt-4 text-sm text-text-muted">هیچ job ای انتخاب نشده است.</div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-text-muted">status</div>
                  <div className="mt-1 text-sm font-medium">{String(selectedJob?.status)}</div>
                  <div className="mt-2 text-xs text-text-muted">attempt</div>
                  <div className="mt-1 text-sm font-medium">{String(selectedJob?.attempt)}/{String(selectedJob?.maxAttempts)}</div>
                </div>

                <details open className="rounded-xl border p-3">
                  <summary className="cursor-pointer text-sm font-medium">Input</summary>
                  <pre className="mt-3 max-h-64 overflow-auto rounded-xl border bg-bg-base p-3 text-xs text-text-secondary">{JSON.stringify(selectedJob?.input ?? {}, null, 2)}</pre>
                </details>

                <details className="rounded-xl border p-3">
                  <summary className="cursor-pointer text-sm font-medium">Result</summary>
                  <pre className="mt-3 max-h-64 overflow-auto rounded-xl border bg-bg-base p-3 text-xs text-text-secondary">{JSON.stringify(selectedJob?.result ?? {}, null, 2)}</pre>
                </details>

                <details className="rounded-xl border p-3">
                  <summary className="cursor-pointer text-sm font-medium">Error</summary>
                  <div className="mt-3 text-xs text-text-muted">{String(selectedJob?.lastErrorMessage ?? '—')}</div>
                  {selectedJob?.lastErrorStack ? (
                    <pre className="mt-3 max-h-56 overflow-auto rounded-xl border bg-bg-base p-3 text-xs text-text-secondary">{String(selectedJob.lastErrorStack)}</pre>
                  ) : null}
                </details>
              </div>
            )}
          </div>
        </div>
      ) : tab === 'audit' ? (
        <div className="mt-6 space-y-3">
          {audit.map((a: any) => (
            <div key={String(a?.auditId)} className="rounded-2xl border p-4">
              <div className="text-sm font-semibold">decision: {String(a?.decision)} | doc: {String(a?.documentId)}</div>
              <div className="mt-1 text-xs text-text-muted">tenant: {String(a?.tenantId ?? '—')} | correlationId: {String(a?.correlationId ?? '—')}</div>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-text-secondary">output</summary>
                <pre className="mt-2 max-h-64 overflow-auto rounded-xl border bg-bg-base p-3 text-xs text-text-secondary">{JSON.stringify(a?.output ?? {}, null, 2)}</pre>
              </details>
            </div>
          ))}
          {!loading && audit.length === 0 ? <div className="text-sm text-text-muted">Audit ای یافت نشد.</div> : null}
        </div>
      ) : tab === 'usage' ? (
        <div className="mt-6 space-y-3">
          {usage.map((u: any) => (
            <div key={String(u?.usageId)} className="rounded-2xl border p-4">
              <div className="text-sm font-semibold">{String(u?.tenantId)} / {String(u?.usageDate)}</div>
              <div className="mt-1 text-xs text-text-muted">jobsStarted: {String(u?.jobsStarted)} | jobsCompleted: {String(u?.jobsCompleted)} | jobsFailed: {String(u?.jobsFailed)}</div>
              <div className="mt-1 text-xs text-text-muted">aiRequests: {String(u?.aiRequests)}</div>
            </div>
          ))}
          {!loading && usage.length === 0 ? <div className="text-sm text-text-muted">Usage ای یافت نشد.</div> : null}
        </div>
      ) : (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEvalMode('cases');
                  setOffset(0);
                  setSelectedEvalCase(null);
                  setSelectedRun(null);
                  setEvalResults([]);
                  setResultsOffset(0);
                  setResultsTotal(null);
                  void load({ offset: 0 });
                }}
                className={evalMode === 'cases' ? 'rounded-xl bg-brand-primary px-3 py-2 text-sm text-text-on-brand' : 'rounded-xl border px-3 py-2 text-sm hover:bg-bg-base'}
                disabled={!canEvalCasesList}
              >
                Cases
              </button>
              <button
                type="button"
                onClick={() => {
                  setEvalMode('runs');
                  setOffset(0);
                  setSelectedEvalCase(null);
                  setSelectedRun(null);
                  setEvalResults([]);
                  setResultsOffset(0);
                  setResultsTotal(null);
                  void load({ offset: 0 });
                }}
                className={evalMode === 'runs' ? 'rounded-xl bg-brand-primary px-3 py-2 text-sm text-text-on-brand' : 'rounded-xl border px-3 py-2 text-sm hover:bg-bg-base'}
                disabled={!canEvalRunsList}
              >
                Runs
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {evalMode === 'cases' && canEvalCasesManage ? (
                <button type="button" onClick={openCreateCase} className="rounded-xl bg-brand-primary px-3 py-2 text-sm font-medium text-text-on-brand hover:opacity-90" disabled={loading}>
                  New Case
                </button>
              ) : null}
              {evalMode === 'runs' && canEvalRunsStart ? (
                <button type="button" onClick={openStartRun} className="rounded-xl bg-brand-primary px-3 py-2 text-sm font-medium text-text-on-brand hover:opacity-90" disabled={loading}>
                  Start Run
                </button>
              ) : null}
            </div>
          </div>

          {evalMode === 'cases' ? (
            <div className="mt-6 grid gap-6 md:grid-cols-[1fr_420px]">
              <div className="space-y-3">
                <div className="rounded-2xl border p-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <div className="text-xs text-text-muted">enabled</div>
                      <select value={evalCasesEnabled} onChange={(e) => setEvalCasesEnabled(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" disabled={loading}>
                        <option value="">(any)</option>
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-xs text-text-muted">tag</div>
                      <input value={evalCasesTag} onChange={(e) => setEvalCasesTag(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" placeholder="invoice, claim, ..." disabled={loading} />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => load({ offset: 0 })} className="rounded-xl bg-brand-primary px-3 py-2 text-sm font-medium text-text-on-brand hover:opacity-90" disabled={loading}>
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEvalCasesEnabled('');
                        setEvalCasesTag('');
                        setOffset(0);
                        setSelectedEvalCase(null);
                        void load({ offset: 0 });
                      }}
                      className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base"
                      disabled={loading}
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {evalCases.map((c: any) => {
                  const active = String(selectedEvalCase?.caseId) === String(c?.caseId);
                  return (
                    <button
                      type="button"
                      key={String(c?.caseId)}
                      onClick={() => setSelectedEvalCase(c)}
                      className={active ? 'w-full rounded-2xl border border-brand-primary bg-bg-base p-4 text-left' : 'w-full rounded-2xl border p-4 text-left hover:bg-bg-base'}
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">{String(c?.name)}</div>
                          <div className="mt-1 text-xs text-text-muted">caseId: {String(c?.caseId)}</div>
                          <div className="mt-1 text-xs text-text-muted">documentId: {String(c?.documentId)}</div>
                          <div className="mt-1 text-xs text-text-muted">enabled: {String(Boolean(c?.enabled))}</div>
                        </div>
                        {canEvalCasesManage ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditCase(c);
                            }}
                            className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base"
                            disabled={loading}
                          >
                            Edit
                          </button>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
                {!loading && evalCases.length === 0 ? <div className="text-sm text-text-muted">Case ای یافت نشد.</div> : null}
              </div>

              <div className="rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Case details</div>
                    <div className="mt-1 text-xs text-text-muted">Expected / tags / enabled</div>
                  </div>
                  {selectedEvalCase ? (
                    <button type="button" onClick={() => setSelectedEvalCase(null)} className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base">
                      بستن
                    </button>
                  ) : null}
                </div>

                {!selectedEvalCase ? (
                  <div className="mt-4 text-sm text-text-muted">هیچ case ای انتخاب نشده است.</div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-text-muted">name</div>
                      <div className="mt-1 text-sm font-medium">{String(selectedEvalCase?.name)}</div>
                      <div className="mt-2 text-xs text-text-muted">tags</div>
                      <div className="mt-1 text-sm font-medium">{Array.isArray(selectedEvalCase?.tags) ? selectedEvalCase.tags.join(', ') : '—'}</div>
                    </div>

                    <details open className="rounded-xl border p-3">
                      <summary className="cursor-pointer text-sm font-medium">Expected JSON</summary>
                      <pre className="mt-3 max-h-80 overflow-auto rounded-xl border bg-bg-base p-3 text-xs text-text-secondary">{JSON.stringify(selectedEvalCase?.expected ?? {}, null, 2)}</pre>
                    </details>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 md:grid-cols-[1fr_520px]">
              <div className="space-y-3">
                <div className="rounded-2xl border p-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="md:col-span-2">
                      <div className="text-xs text-text-muted">status</div>
                      <input value={evalRunsStatus} onChange={(e) => setEvalRunsStatus(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" placeholder="queued | running | completed | failed" disabled={loading} />
                    </div>
                    <div className="flex items-end">
                      <button type="button" onClick={() => load({ offset: 0 })} className="w-full rounded-xl bg-brand-primary px-3 py-2 text-sm font-medium text-text-on-brand hover:opacity-90" disabled={loading}>
                        Apply
                      </button>
                    </div>
                  </div>
                </div>

                {evalRuns.map((r: any) => {
                  const active = String(selectedRun?.runId) === String(r?.runId);
                  return (
                    <button
                      type="button"
                      key={String(r?.runId)}
                      onClick={() => {
                        setSelectedRun(r);
                        setEvalResults([]);
                        setResultsOffset(0);
                        setResultsTotal(null);
                        void loadRunResults(String(r.runId), { offset: 0 });
                      }}
                      className={active ? 'w-full rounded-2xl border border-brand-primary bg-bg-base p-4 text-left' : 'w-full rounded-2xl border p-4 text-left hover:bg-bg-base'}
                    >
                      <div className="text-sm font-semibold">runId: {String(r?.runId)}</div>
                      <div className="mt-1 text-xs text-text-muted">status: {String(r?.status)} | createdAt: {String(r?.createdAt)}</div>
                    </button>
                  );
                })}
                {!loading && evalRuns.length === 0 ? <div className="text-sm text-text-muted">Run ای یافت نشد.</div> : null}
              </div>

              <div className="rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Run results</div>
                    <div className="mt-1 text-xs text-text-muted">Select a run to view scored results</div>
                  </div>
                  {selectedRun ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRun(null);
                        setEvalResults([]);
                        setResultsOffset(0);
                        setResultsTotal(null);
                      }}
                      className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base"
                    >
                      بستن
                    </button>
                  ) : null}
                </div>

                {!selectedRun ? (
                  <div className="mt-4 text-sm text-text-muted">هیچ run ای انتخاب نشده است.</div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-text-muted">status</div>
                      <div className="mt-1 text-sm font-medium">{String(selectedRun?.status)}</div>
                      <div className="mt-2 text-xs text-text-muted">params</div>
                      <pre className="mt-2 max-h-32 overflow-auto rounded-xl border bg-bg-base p-3 text-xs text-text-secondary">{JSON.stringify(selectedRun?.params ?? {}, null, 2)}</pre>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3">
                      <div className="text-xs text-text-muted">total results: {resultsTotal != null ? String(resultsTotal) : '—'}</div>
                      <div className="flex items-center gap-2">
                        <button type="button" className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base" disabled={loading || resultsOffset <= 0} onClick={() => loadRunResults(String(selectedRun.runId), { offset: Math.max(0, resultsOffset - resultsLimit) })}>
                          قبلی
                        </button>
                        <button type="button" className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base" disabled={loading || resultsTotal == null || resultsOffset + resultsLimit >= resultsTotal} onClick={() => loadRunResults(String(selectedRun.runId), { offset: resultsOffset + resultsLimit })}>
                          بعدی
                        </button>
                      </div>
                    </div>

                    {evalResults.map((x: any) => (
                      <details key={String(x?.resultId)} className="rounded-xl border p-3">
                        <summary className="cursor-pointer text-sm font-medium">
                          score: {String(x?.score ?? '—')} | doc: {String(x?.documentId)}
                        </summary>
                        {x?.errorMessage ? <div className="mt-2 text-xs text-feedback-error">error: {String(x.errorMessage)}</div> : null}
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div>
                            <div className="text-xs text-text-muted">expected</div>
                            <pre className="mt-2 max-h-64 overflow-auto rounded-xl border bg-bg-base p-3 text-xs text-text-secondary">{JSON.stringify(x?.expected ?? {}, null, 2)}</pre>
                          </div>
                          <div>
                            <div className="text-xs text-text-muted">actual</div>
                            <pre className="mt-2 max-h-64 overflow-auto rounded-xl border bg-bg-base p-3 text-xs text-text-secondary">{JSON.stringify(x?.actual ?? {}, null, 2)}</pre>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="text-xs text-text-muted">diff</div>
                          <pre className="mt-2 max-h-56 overflow-auto rounded-xl border bg-bg-base p-3 text-xs text-text-secondary">{JSON.stringify(x?.diff ?? {}, null, 2)}</pre>
                        </div>
                      </details>
                    ))}

                    {!loading && evalResults.length === 0 ? <div className="text-sm text-text-muted">Result ای یافت نشد.</div> : null}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {retryModalOpen && retryTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay p-4">
          <div className="w-full max-w-xl rounded-2xl bg-bg-raised p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Retry job</div>
                <div className="mt-1 text-xs text-text-muted">This will re-queue the job according to backend policy.</div>
              </div>
              <button
                type="button"
                className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base"
                onClick={() => {
                  setRetryModalOpen(false);
                  setRetryTarget(null);
                  setRetryConfirmText('');
                }}
                disabled={loading}
              >
                بستن
              </button>
            </div>

            <div className="mt-4 rounded-xl border p-3">
              <div className="text-xs text-text-muted">jobId</div>
              <div className="mt-1 text-sm font-medium">{String(retryTarget?.jobId)}</div>
              <div className="mt-2 text-xs text-text-muted">status</div>
              <div className="mt-1 text-sm font-medium">{String(retryTarget?.status)}</div>
            </div>

            <div className="mt-4">
              <div className="text-xs text-text-muted">confirmation</div>
              <input
                value={retryConfirmText}
                onChange={(e) => setRetryConfirmText(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                placeholder={`Type: RETRY ${String(retryTarget?.jobId)}`}
                disabled={loading}
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base"
                onClick={() => {
                  setRetryModalOpen(false);
                  setRetryTarget(null);
                  setRetryConfirmText('');
                }}
                disabled={loading}
              >
                انصراف
              </button>
              <button
                type="button"
                className="rounded-xl bg-brand-primary px-3 py-2 text-sm font-medium text-text-on-brand hover:opacity-90"
                onClick={submitRetry}
                disabled={loading}
              >
                تایید Retry
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {createCaseOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-bg-raised p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Create eval case</div>
                <div className="mt-1 text-xs text-text-muted">Golden case stored in DB. Requires manage permission.</div>
              </div>
              <button type="button" className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base" onClick={() => setCreateCaseOpen(false)} disabled={loading}>
                بستن
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs text-text-muted">name</div>
                <input value={createCaseName} onChange={(e) => setCreateCaseName(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" placeholder="Invoice #1" disabled={loading} />
              </div>
              <div>
                <div className="text-xs text-text-muted">documentId</div>
                <input value={createCaseDocumentId} onChange={(e) => setCreateCaseDocumentId(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" placeholder="UUID" disabled={loading} />
              </div>
              <div>
                <div className="text-xs text-text-muted">tags (comma-separated)</div>
                <input value={createCaseTags} onChange={(e) => setCreateCaseTags(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" placeholder="invoice, ir" disabled={loading} />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={createCaseEnabled} onChange={(e) => setCreateCaseEnabled(e.target.checked)} disabled={loading} />
                  enabled
                </label>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs text-text-muted">expected (JSON)</div>
              <textarea value={createCaseExpectedJson} onChange={(e) => setCreateCaseExpectedJson(e.target.value)} className="mt-1 h-56 w-full rounded-xl border px-3 py-2 font-mono text-xs" disabled={loading} />
            </div>

            <div className="mt-4">
              <div className="text-xs text-text-muted">confirmation</div>
              <input value={createCaseConfirmText} onChange={(e) => setCreateCaseConfirmText(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" placeholder="Type: CREATE CASE" disabled={loading} />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base" onClick={() => setCreateCaseOpen(false)} disabled={loading}>
                انصراف
              </button>
              <button type="button" className="rounded-xl bg-brand-primary px-3 py-2 text-sm font-medium text-text-on-brand hover:opacity-90" onClick={submitCreateCase} disabled={loading}>
                Create
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editCaseOpen && selectedEvalCase ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-bg-raised p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Edit eval case</div>
                <div className="mt-1 text-xs text-text-muted">caseId: {String(selectedEvalCase.caseId)}</div>
              </div>
              <button type="button" className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base" onClick={() => setEditCaseOpen(false)} disabled={loading}>
                بستن
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs text-text-muted">tags (comma-separated)</div>
                <input value={editCaseTags} onChange={(e) => setEditCaseTags(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" disabled={loading} />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editCaseEnabled} onChange={(e) => setEditCaseEnabled(e.target.checked)} disabled={loading} />
                  enabled
                </label>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs text-text-muted">expected (JSON)</div>
              <textarea value={editCaseExpectedJson} onChange={(e) => setEditCaseExpectedJson(e.target.value)} className="mt-1 h-56 w-full rounded-xl border px-3 py-2 font-mono text-xs" disabled={loading} />
            </div>

            <div className="mt-4">
              <div className="text-xs text-text-muted">confirmation</div>
              <input value={editCaseConfirmText} onChange={(e) => setEditCaseConfirmText(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" placeholder={`Type: UPDATE ${String(selectedEvalCase.caseId)}`} disabled={loading} />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base" onClick={() => setEditCaseOpen(false)} disabled={loading}>
                انصراف
              </button>
              <button type="button" className="rounded-xl bg-brand-primary px-3 py-2 text-sm font-medium text-text-on-brand hover:opacity-90" onClick={submitEditCase} disabled={loading}>
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {startRunOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay p-4">
          <div className="w-full max-w-xl rounded-2xl bg-bg-raised p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Start eval run</div>
                <div className="mt-1 text-xs text-text-muted">Will enqueue a run; worker will execute it asynchronously.</div>
              </div>
              <button type="button" className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base" onClick={() => setStartRunOpen(false)} disabled={loading}>
                بستن
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={startRunOnlyEnabled} onChange={(e) => setStartRunOnlyEnabled(e.target.checked)} disabled={loading} />
                  onlyEnabled
                </label>
              </div>
              <div>
                <div className="text-xs text-text-muted">maxCases</div>
                <input value={startRunMaxCases} onChange={(e) => setStartRunMaxCases(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" disabled={loading} />
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs text-text-muted">confirmation</div>
              <input value={startRunConfirmText} onChange={(e) => setStartRunConfirmText(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" placeholder="Type: START RUN" disabled={loading} />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base" onClick={() => setStartRunOpen(false)} disabled={loading}>
                انصراف
              </button>
              <button type="button" className="rounded-xl bg-brand-primary px-3 py-2 text-sm font-medium text-text-on-brand hover:opacity-90" onClick={submitStartRun} disabled={loading}>
                Start
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
