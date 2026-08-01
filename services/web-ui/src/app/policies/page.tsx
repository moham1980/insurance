'use client';

import { useEffect, useState } from 'react';
import { FileText, RefreshCw, Search, Send, ShieldCheck, AlertCircle, CheckCircle, Clock, XCircle, FileCheck, Wrench, ChevronRight, ChevronLeft } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { hasPolicyPermission, policyPermissionsForRoles } from '@/lib/policy-rbac';
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog';
import { Button, Card, StatCard } from '@insurance/design-system';
import { MOCK_POLICIES } from '@/lib/mock-data';

type PolicyRow = {
  policyId: string;
  policyNumber: string;
  uniqueCode: string | null;
  partyId: string;
  lineOfBusiness: string;
  status: string;
  startDate: string;
  endDate: string;
  premiumAmount: number;
  createdAt: string;
  updatedAt: string;
};

type PolicyInquiryRow = {
  inquiryId: string;
  policyId: string;
  method: string;
  query: any;
  resultCode: string;
  payload: any;
  workItemId: string | null;
  workItemSagaId: string | null;
  correlationId: string | null;
  createdAt: string;
};

type PolicyChangeRow = {
  changeId: string;
  policyId: string;
  type: string;
  actorUserId: string | null;
  payload: any;
  createdAt: string;
};

function Drawer(props: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-bg-overlay" onClick={props.onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-auto rounded-t-3xl border border-border-default bg-bg-raised p-4 shadow-2xl md:inset-y-0 md:right-0 md:left-auto md:bottom-auto md:h-full md:max-h-none md:w-[680px] md:rounded-none md:border-l">
        <div className="flex items-center justify-between gap-3 border-b border-border-default pb-3">
          <div className="text-sm font-semibold">{props.title}</div>
          <Button variant="ghost" size="sm" onClick={props.onClose}>
            بستن
          </Button>
        </div>
        <div className="pt-4">{props.children}</div>
      </div>
    </div>
  );
}

export default function PoliciesPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PolicyRow[]>([]);

  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const [partyId, setPartyId] = useState('');
  const [uniqueCode, setUniqueCodeFilter] = useState('');

  const [creating, setCreating] = useState(false);
  const [createPartyId, setCreatePartyId] = useState('');
  const [createLineOfBusiness, setCreateLineOfBusiness] = useState('car_third_party');
  const [createStartDate, setCreateStartDate] = useState('');
  const [createEndDate, setCreateEndDate] = useState('');
  const [createPremiumAmount, setCreatePremiumAmount] = useState('');

  const [activePolicy, setActivePolicy] = useState<PolicyRow | null>(null);
  const [policyDrawerOpen, setPolicyDrawerOpen] = useState(false);

  const [docsJson, setDocsJson] = useState('');
  const [riskJson, setRiskJson] = useState('');
  const [issuePaid, setIssuePaid] = useState(true);
  const [uniqueCodeValue, setUniqueCodeValue] = useState('');

  const [inquiryNationalId, setInquiryNationalId] = useState('');
  const [inquiryUniqueCode, setInquiryUniqueCode] = useState('');
  const [inquiryPolicyNumber, setInquiryPolicyNumber] = useState('');
  const [inquiryVin, setInquiryVin] = useState('');

  const [busyAction, setBusyAction] = useState<string>('');
  const [actionError, setActionError] = useState<{ code: string; message: string; details?: any; correlationId?: string } | null>(null);

  const [inquiriesLoading, setInquiriesLoading] = useState(false);
  const [inquiries, setInquiries] = useState<PolicyInquiryRow[]>([]);
  const [inquiriesTotal, setInquiriesTotal] = useState(0);
  const [inquiriesLimit, setInquiriesLimit] = useState(20);
  const [inquiriesOffset, setInquiriesOffset] = useState(0);

  const [changesLoading, setChangesLoading] = useState(false);
  const [changes, setChanges] = useState<PolicyChangeRow[]>([]);
  const [changesTotal, setChangesTotal] = useState(0);
  const [changesLimit, setChangesLimit] = useState(20);
  const [changesOffset, setChangesOffset] = useState(0);

  const [overrideAction, setOverrideAction] = useState<'issue' | 'set_unique_code'>('issue');
  const [overrideReason, setOverrideReason] = useState('');

  const { isOpen: confirmOpen, config: confirmConfig, confirm, handleConfirm: handleConfirmDialog, handleCancel: handleCancelDialog } = useConfirmDialog();

  const perms = policyPermissionsForRoles(getAuthUser()?.roles);
  const canList = hasPolicyPermission(perms, 'policy:list');
  const canView = hasPolicyPermission(perms, 'policy:view');
  const canQuote = hasPolicyPermission(perms, 'policy:quote');
  const canSubmitDocs = hasPolicyPermission(perms, 'policy:submit_docs');
  const canRiskAssess = hasPolicyPermission(perms, 'policy:risk_assess');
  const canUnderwritingDecide = hasPolicyPermission(perms, 'policy:underwriting_decide');
  const canIssue = hasPolicyPermission(perms, 'policy:issue');
  const canSetUniqueCode = hasPolicyPermission(perms, 'policy:set_unique_code');
  const canSanhabInquiry = hasPolicyPermission(perms, 'policy:sanhab_inquiry');
  const canViewInquiries = hasPolicyPermission(perms, 'policy:sanhab_inquiries_view');
  const canViewChanges = hasPolicyPermission(perms, 'policy:changes_view');
  const canQualityGateOverride = hasPolicyPermission(perms, 'policy:quality_gate_override');

  const [uwDecision, setUwDecision] = useState<'approved' | 'rejected' | 'escalated'>('approved');
  const [uwNotes, setUwNotes] = useState('');

  async function load() {
    setLoading(true);
    if (!canList) {
      setRows([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    const qs = new URLSearchParams();
    if (partyId) qs.set('partyId', partyId);
    if (uniqueCode) qs.set('uniqueCode', uniqueCode);

    qs.set('limit', String(limit));
    qs.set('offset', String(offset));

    const res = await apiFetch<PolicyRow[]>(`/policies${qs.toString() ? `?${qs.toString()}` : ''}`);
    if (res.success) {
      setRows(res.data);
      setTotal(res.pagination?.total || 0);
    } else {
      setRows(MOCK_POLICIES as unknown as PolicyRow[]);
      setTotal(MOCK_POLICIES.length);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, offset]);

  async function loadInquiries(policyId: string) {
    setInquiriesLoading(true);
    const qs = new URLSearchParams();
    qs.set('limit', String(inquiriesLimit));
    qs.set('offset', String(inquiriesOffset));
    const res = await apiFetch<PolicyInquiryRow[]>(`/policies/${policyId}/sanhab/inquiries?${qs.toString()}`);
    if (res.success) {
      setInquiries(res.data);
      setInquiriesTotal(res.pagination?.total || 0);
    }
    setInquiriesLoading(false);
  }

  async function loadChanges(policyId: string) {
    setChangesLoading(true);
    const qs = new URLSearchParams();
    qs.set('limit', String(changesLimit));
    qs.set('offset', String(changesOffset));
    const res = await apiFetch<PolicyChangeRow[]>(`/policies/${policyId}/changes?${qs.toString()}`);
    if (res.success) {
      setChanges(res.data);
      setChangesTotal(res.pagination?.total || 0);
    }
    setChangesLoading(false);
  }

  useEffect(() => {
    if (!activePolicy?.policyId) return;
    if (!canViewInquiries) {
      setInquiries([]);
      setInquiriesTotal(0);
      return;
    }
    loadInquiries(activePolicy.policyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePolicy?.policyId, inquiriesLimit, inquiriesOffset]);

  useEffect(() => {
    if (!activePolicy?.policyId) return;
    if (!canViewChanges) {
      setChanges([]);
      setChangesTotal(0);
      return;
    }
    loadChanges(activePolicy.policyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePolicy?.policyId, changesLimit, changesOffset]);

  function openPolicy(p: PolicyRow) {
    if (!canView) {
      setActionError({ code: 'FORBIDDEN', message: 'دسترسی مشاهده بیمه‌نامه را ندارید' });
      return;
    }
    setActivePolicy(p);
    setPolicyDrawerOpen(true);
    setActionError(null);
    setBusyAction('');
    setDocsJson('');
    setRiskJson('');
    setUniqueCodeValue(p.uniqueCode || '');
    setInquiryPolicyNumber(p.policyNumber || '');
    setInquiryNationalId('');
    setInquiryUniqueCode('');
    setInquiryVin('');
    setInquiriesOffset(0);
    setChangesOffset(0);
    setOverrideAction('issue');
    setOverrideReason('');
    setUwDecision('approved');
    setUwNotes('');
  }

  async function runAction(name: string, fn: () => Promise<void>) {
    setBusyAction(name);
    setActionError(null);
    try {
      await fn();
    } catch (e: any) {
      setActionError({ code: e?.code || 'UNKNOWN', message: e?.message || String(e) });
    } finally {
      setBusyAction('');
    }
  }

  async function runApiAction<T>(name: string, fn: () => Promise<any>) {
    await runAction(name, async () => {
      const res = (await fn()) as any;
      if (res && typeof res === 'object' && res.success === false) {
        setActionError({
          code: res.error?.code || 'ERROR',
          message: res.error?.message || 'خطا',
          details: res.error?.details,
          correlationId: res.correlationId,
        });
        return;
      }
      await load();
      if (activePolicy?.policyId) {
        const updated = await apiFetch<PolicyRow>(`/policies/${activePolicy.policyId}`);
        if (updated.success) {
          setActivePolicy(updated.data);
          setUniqueCodeValue(updated.data.uniqueCode || '');
        }
        if (canViewInquiries) await loadInquiries(activePolicy.policyId);
        if (canViewChanges) await loadChanges(activePolicy.policyId);
      }
    });
  }

  async function quote() {
    if (!canQuote) {
      setActionError({ code: 'FORBIDDEN', message: 'دسترسی به Quote ندارید' });
      return;
    }
    setCreating(true);
    await apiFetch('/policies/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        partyId: createPartyId,
        lineOfBusiness: createLineOfBusiness,
        startDate: createStartDate,
        endDate: createEndDate,
        premiumAmount: Number(createPremiumAmount),
      }),
    });
    setCreating(false);
    await load();
  }

  async function submitDocs(policyId: string) {
    if (!canSubmitDocs) {
      setActionError({ code: 'FORBIDDEN', message: 'دسترسی به ارسال مدارک ندارید' });
      return;
    }
    let parsed: any = {};
    if (docsJson && docsJson.trim().length > 0) {
      try {
        parsed = JSON.parse(docsJson);
      } catch {
        setActionError({ code: 'VALIDATION_ERROR', message: 'JSON مدارک معتبر نیست' });
        return;
      }
    }

    await runApiAction('submit-docs', () =>
      apiFetch(`/policies/${policyId}/submit-docs`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ applicationData: parsed }),
      })
    );
  }

  async function riskAssess(policyId: string) {
    if (!canRiskAssess) {
      setActionError({ code: 'FORBIDDEN', message: 'دسترسی به ارزیابی ریسک ندارید' });
      return;
    }
    let parsed: any = {};
    if (riskJson && riskJson.trim().length > 0) {
      try {
        parsed = JSON.parse(riskJson);
      } catch {
        setActionError({ code: 'VALIDATION_ERROR', message: 'JSON ارزیابی ریسک معتبر نیست' });
        return;
      }
    }

    await runApiAction('risk-assess', () =>
      apiFetch(`/policies/${policyId}/risk-assess`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ riskAssessment: parsed }),
      })
    );
  }

  async function underwritingDecision(policyId: string) {
    if (!canUnderwritingDecide) {
      setActionError({ code: 'FORBIDDEN', message: 'دسترسی تصمیمگیری کارشناسی را ندارید' });
      return;
    }
    await runApiAction('underwriting-decision', () =>
      apiFetch(`/policies/${policyId}/underwriting/decision`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ decision: uwDecision, notes: uwNotes || null }),
      })
    );
  }

  async function sanhabInquiry(policyId: string) {
    if (!canSanhabInquiry) {
      setActionError({ code: 'FORBIDDEN', message: 'دسترسی به استعلام سنهاب ندارید' });
      return;
    }
    await runApiAction('sanhab-inquiry', () =>
      apiFetch(`/policies/${policyId}/sanhab/inquiry`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nationalId: inquiryNationalId || undefined,
          uniqueCode: inquiryUniqueCode || undefined,
          policyNumber: inquiryPolicyNumber || undefined,
          vin: inquiryVin || undefined,
        }),
      })
    );
  }

  async function issue(policyId: string) {
    if (!canIssue) {
      setActionError({ code: 'FORBIDDEN', message: 'دسترسی به صدور ندارید' });
      return;
    }
    await runApiAction('issue', () =>
      apiFetch(`/policies/${policyId}/issue`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ paid: issuePaid }),
      })
    );
  }

  async function setUniqueCodeAction(policyId: string) {
    if (!canSetUniqueCode) {
      setActionError({ code: 'FORBIDDEN', message: 'دسترسی به ثبت کد یکتا ندارید' });
      return;
    }
    await runApiAction('unique-code', () =>
      apiFetch(`/policies/${policyId}/unique-code`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ uniqueCode: uniqueCodeValue }),
      })
    );
  }

  async function qualityGateOverride(policyId: string) {
    if (!canQualityGateOverride) {
      setActionError({ code: 'FORBIDDEN', message: 'دسترسی به override ندارید' });
      return;
    }
    if (overrideReason.trim().length < 3) {
      setActionError({ code: 'VALIDATION_ERROR', message: 'Reason باید حداقل ۳ کاراکتر باشد' });
      return;
    }
    confirm({
      title: 'تأیید Quality Gate Override',
      message: 'آیا مطمئن هستید که می‌خواهید این override را ثبت کنید؟ این عملیات در لاگ audit ثبت می‌شود.',
      confirmText: 'ثبت Override',
      cancelText: 'انصراف',
      danger: true,
      onConfirm: async () => {
        await runApiAction('quality-gate-override', () =>
          apiFetch(`/policies/${policyId}/quality-gate/override`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ action: overrideAction, reason: overrideReason }),
          })
        );
      },
    });
  }

  const statusBadge = (s: string) => {
    const cfg: Record<string, { bg: string; text: string; icon: any }> = {
      quoted: { bg: 'bg-brand-primary-subtle', text: 'text-brand-primary', icon: FileText },
      docs_pending: { bg: 'bg-feedback-warning-subtle', text: 'text-feedback-warning', icon: Clock },
      risk_assessed: { bg: 'bg-feedback-info-subtle', text: 'text-feedback-info', icon: FileCheck },
      uw_pending: { bg: 'bg-feedback-warning-subtle', text: 'text-feedback-warning', icon: Clock },
      uw_approved: { bg: 'bg-feedback-success-subtle', text: 'text-feedback-success', icon: CheckCircle },
      uw_rejected: { bg: 'bg-feedback-error-subtle', text: 'text-feedback-error', icon: XCircle },
      issued: { bg: 'bg-feedback-success-subtle', text: 'text-feedback-success', icon: CheckCircle },
      active: { bg: 'bg-feedback-success-subtle', text: 'text-feedback-success', icon: CheckCircle },
      expired: { bg: 'bg-feedback-error-subtle', text: 'text-feedback-error', icon: XCircle },
    };
    const c = cfg[s] || { bg: 'bg-bg-base', text: 'text-text-secondary', icon: AlertCircle };
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
        <Icon className="w-3 h-3" />
        {s}
      </span>
    );
  };

  return (
    <main className="p-6 max-w-7xl mx-auto" dir="rtl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">بیمه‌نامه‌ها</h1>
            <p className="mt-1 text-sm text-text-muted">مدیریت چرخه صدور/تمدید/الحاقیه و کد یکتا</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading} isLoading={loading}>
          <RefreshCw className="h-4 w-4 ml-1" />
          بروزرسانی
        </Button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard title="کل بیمه‌نامه‌ها" value={total} icon={FileText} />
        <StatCard title="صدورشده" value={rows.filter((r) => r.status === 'issued' || r.status === 'active').length} changeType="positive" change="فعال" icon={CheckCircle} />
        <StatCard title="در انتظار کارشناسی" value={rows.filter((r) => r.status === 'uw_pending' || r.status === 'docs_pending').length} changeType="warning" change="در انتظار" icon={Clock} />
      </div>

      <Card className="mt-6 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4 text-brand-primary" />
          استعلام / Quote (مرحله ۱)
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-6">
          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="text-xs text-text-muted">Party ID</span>
            <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={createPartyId} onChange={(e) => setCreatePartyId(e.target.value)} />
          </label>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="text-xs text-text-muted">رشته</span>
            <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={createLineOfBusiness} onChange={(e) => setCreateLineOfBusiness(e.target.value)} />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-xs text-text-muted">تاریخ شروع</span>
            <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={createStartDate} onChange={(e) => setCreateStartDate(e.target.value)} placeholder="YYYY-MM-DD" />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-xs text-text-muted">تاریخ پایان</span>
            <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={createEndDate} onChange={(e) => setCreateEndDate(e.target.value)} placeholder="YYYY-MM-DD" />
          </label>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="text-xs text-text-muted">حق بیمه</span>
            <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={createPremiumAmount} onChange={(e) => setCreatePremiumAmount(e.target.value)} />
          </label>

          <div className="flex items-end md:col-span-2">
            <Button
              fullWidth
              onClick={quote}
              disabled={!canQuote || creating || !createPartyId || !createStartDate || !createEndDate || !createPremiumAmount}
              isLoading={creating}
            >
              {creating ? 'در حال ثبت…' : 'ثبت Quote'}
            </Button>
          </div>
        </div>
      </Card>

      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-end">
        <label className="grid flex-1 gap-1 text-sm">
          <span className="text-xs text-text-muted">فیلتر: Party ID</span>
          <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={partyId} onChange={(e) => setPartyId(e.target.value)} />
        </label>
        <label className="grid flex-1 gap-1 text-sm">
          <span className="text-xs text-text-muted">فیلتر: کد یکتا (سنهاب)</span>
          <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={uniqueCode} onChange={(e) => setUniqueCodeFilter(e.target.value)} />
        </label>
        <Button variant="secondary" onClick={load} disabled={loading || !canList}>
          <Search className="h-4 w-4 ml-1" />
          اعمال فیلتر
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {rows.map((p) => (
          <Card key={p.policyId} className="p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold">{p.policyNumber || p.policyId}</div>
                  {statusBadge(p.status)}
                </div>
                <div className="mt-1 text-xs text-text-muted">
                  رشته: {p.lineOfBusiness} | کد یکتا: {p.uniqueCode || '—'}
                </div>
                <div className="mt-1 text-xs text-text-muted">Party: {p.partyId}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-text-muted">حق بیمه: {p.premiumAmount}</div>
                <Button variant="secondary" size="sm" disabled={!canView} onClick={() => openPolicy(p)}>
                  مدیریت مراحل
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {!loading && rows.length === 0 ? <div className="text-sm text-text-muted text-center py-8">موردی یافت نشد.</div> : null}
      </div>

      <Card className="mt-6 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-xs text-text-muted">نمایش {rows.length ? offset + 1 : 0} تا {Math.min(offset + limit, total)} از {total}</div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-xs text-text-muted">Limit</span>
              <input
                className="w-20 rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary"
                value={String(limit)}
                onChange={(e) => setLimit(Math.max(1, Math.min(200, parseInt(e.target.value || '20', 10) || 20)))}
              />
            </label>
            <Button variant="ghost" size="sm" disabled={loading || offset <= 0} onClick={() => setOffset(Math.max(0, offset - limit))}>
              <ChevronRight className="h-4 w-4 ml-1" />
              قبلی
            </Button>
            <Button variant="ghost" size="sm" disabled={loading || offset + limit >= total} onClick={() => setOffset(offset + limit)}>
              بعدی
              <ChevronLeft className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      <Drawer
        open={policyDrawerOpen && !!activePolicy}
        title={activePolicy ? `Policy: ${activePolicy.policyNumber || activePolicy.policyId}` : 'Policy'}
        onClose={() => setPolicyDrawerOpen(false)}
      >
        {!activePolicy ? null : (
          <div className="space-y-4">
            {actionError ? (
              <div className="rounded-xl border border-feedback-error/30 bg-feedback-error-subtle p-4 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-feedback-error" />
                <div>
                  <div className="text-sm font-semibold text-feedback-error">خطا: {actionError.code}</div>
                  <div className="mt-1 text-sm text-feedback-error">{actionError.message}</div>
                  {actionError.correlationId ? <div className="mt-1 text-xs text-feedback-error">Correlation: {actionError.correlationId}</div> : null}
                  {actionError.details ? <pre className="mt-3 overflow-auto rounded-xl border border-border-default bg-bg-raised p-3 text-xs">{JSON.stringify(actionError.details, null, 2)}</pre> : null}
                </div>
              </div>
            ) : null}

            <Card className="p-4">
              <div className="text-sm font-semibold">مشخصات</div>
              <div className="mt-2 flex items-center gap-2">{statusBadge(activePolicy.status)}</div>
              <div className="mt-1 text-xs text-text-muted">UniqueCode: {activePolicy.uniqueCode || '—'}</div>
              <div className="mt-1 text-xs text-text-muted">PartyId: {activePolicy.partyId}</div>
              {activePolicy.status === 'uw_pending' ? <div className="mt-2 text-xs text-text-muted">این بیمه‌نامه در صف کارشناسی (Underwriting) است.</div> : null}
              {activePolicy.status === 'uw_rejected' ? <div className="mt-2 text-xs text-text-muted">این بیمه‌نامه در مرحله کارشناسی رد شده است.</div> : null}
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FileCheck className="h-4 w-4 text-brand-primary" />
                مرحله ۲: ارسال مدارک (submit-docs)
              </div>
              <div className="mt-2 grid gap-2">
                <textarea
                  className="min-h-[120px] rounded-xl border border-border-default bg-bg-raised p-3 text-xs text-text-primary"
                  value={docsJson}
                  onChange={(e) => setDocsJson(e.target.value)}
                  placeholder='مثال: {"nationalId":"...","vehicle":{...}}'
                />
                <Button
                  disabled={busyAction.length > 0 || !canSubmitDocs}
                  isLoading={busyAction === 'submit-docs'}
                  onClick={() => submitDocs(activePolicy.policyId)}
                  fullWidth
                >
                  {busyAction === 'submit-docs' ? 'در حال ارسال…' : 'ارسال مدارک'}
                </Button>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-brand-primary" />
                مرحله ۳: ارزیابی ریسک (risk-assess)
              </div>
              <div className="mt-2 grid gap-2">
                <textarea
                  className="min-h-[120px] rounded-xl border border-border-default bg-bg-raised p-3 text-xs text-text-primary"
                  value={riskJson}
                  onChange={(e) => setRiskJson(e.target.value)}
                  placeholder='مثال: {"score":12,"notes":"..."}'
                />
                <Button
                  disabled={busyAction.length > 0 || !canRiskAssess || activePolicy.status !== 'docs_pending'}
                  isLoading={busyAction === 'risk-assess'}
                  onClick={() => riskAssess(activePolicy.policyId)}
                  fullWidth
                >
                  {busyAction === 'risk-assess' ? 'در حال ثبت…' : 'ثبت ارزیابی ریسک'}
                </Button>
              </div>
              {activePolicy.status !== 'docs_pending' ? <div className="mt-2 text-xs text-text-muted">اجرای این مرحله فقط در وضعیت docs_pending مجاز است.</div> : null}
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Wrench className="h-4 w-4 text-brand-primary" />
                مرحله ۳.۱: تصمیم کارشناسی (Underwriting)
              </div>
              <div className="mt-2 grid gap-3 md:grid-cols-3 md:items-end">
                <label className="grid gap-1 text-sm">
                  <span className="text-xs text-text-muted">Decision</span>
                  <select className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={uwDecision} onChange={(e) => setUwDecision(e.target.value as any)}>
                    <option value="approved">approved</option>
                    <option value="rejected">rejected</option>
                    <option value="escalated">escalated</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm md:col-span-2">
                  <span className="text-xs text-text-muted">Notes</span>
                  <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={uwNotes} onChange={(e) => setUwNotes(e.target.value)} placeholder="یادداشت تصمیم" />
                </label>
              </div>
              <div className="mt-3">
                <Button
                  fullWidth
                  disabled={busyAction.length > 0 || !canUnderwritingDecide || activePolicy.status !== 'uw_pending'}
                  isLoading={busyAction === 'underwriting-decision'}
                  onClick={() => underwritingDecision(activePolicy.policyId)}
                >
                  {busyAction === 'underwriting-decision' ? 'در حال ثبت تصمیم…' : 'ثبت تصمیم کارشناسی'}
                </Button>
              </div>
              {!canUnderwritingDecide ? <div className="mt-2 text-xs text-text-muted">این بخش فقط برای نقش‌های مجاز فعال است.</div> : null}
              {activePolicy.status !== 'uw_pending' ? <div className="mt-2 text-xs text-text-muted">ثبت تصمیم فقط در وضعیت uw_pending مجاز است.</div> : null}
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-brand-primary" />
                Quality Gate: استعلام سنهاب
              </div>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="text-xs text-text-muted">کدملی</span>
                  <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={inquiryNationalId} onChange={(e) => setInquiryNationalId(e.target.value)} />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-xs text-text-muted">کد یکتا</span>
                  <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={inquiryUniqueCode} onChange={(e) => setInquiryUniqueCode(e.target.value)} />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-xs text-text-muted">شماره بیمه‌نامه</span>
                  <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={inquiryPolicyNumber} onChange={(e) => setInquiryPolicyNumber(e.target.value)} />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-xs text-text-muted">VIN</span>
                  <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={inquiryVin} onChange={(e) => setInquiryVin(e.target.value)} />
                </label>
              </div>
              <div className="mt-3">
                <Button
                  fullWidth
                  disabled={busyAction.length > 0 || !canSanhabInquiry}
                  isLoading={busyAction === 'sanhab-inquiry'}
                  onClick={() => sanhabInquiry(activePolicy.policyId)}
                >
                  {busyAction === 'sanhab-inquiry' ? 'در حال استعلام…' : 'استعلام سنهاب'}
                </Button>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <AlertCircle className="h-4 w-4 text-feedback-warning" />
                HITL Override (Quality Gate)
              </div>
              <div className="mt-2 grid gap-3 md:grid-cols-3 md:items-end">
                <label className="grid gap-1 text-sm">
                  <span className="text-xs text-text-muted">Action</span>
                  <select className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={overrideAction} onChange={(e) => setOverrideAction(e.target.value as any)}>
                    <option value="issue">issue</option>
                    <option value="set_unique_code">set_unique_code</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm md:col-span-2">
                  <span className="text-xs text-text-muted">Reason (Audit)</span>
                  <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="مثال: تایید دستی توسط کارشناس" />
                </label>
              </div>
              <div className="mt-3">
                <Button
                  variant="danger"
                  fullWidth
                  disabled={busyAction.length > 0 || overrideReason.trim().length < 3 || !canQualityGateOverride}
                  isLoading={busyAction === 'quality-gate-override'}
                  onClick={() => qualityGateOverride(activePolicy.policyId)}
                >
                  {busyAction === 'quality-gate-override' ? 'در حال ثبت override…' : 'ثبت Override'}
                </Button>
              </div>
              <div className="mt-2 text-xs text-text-muted">Override فقط برای نقش‌های مجاز فعال است و بعد از آخرین inquiry معتبر می‌شود.</div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="h-4 w-4 text-brand-primary" />
                  سوابق استعلام سنهاب
                </div>
                <Button variant="ghost" size="sm" disabled={inquiriesLoading || !canViewInquiries} onClick={() => loadInquiries(activePolicy.policyId)}>
                  <RefreshCw className="h-4 w-4 ml-1" />
                  بروزرسانی
                </Button>
              </div>

              <div className="mt-3 space-y-2">
                {!canViewInquiries ? <div className="text-sm text-text-muted">دسترسی مشاهده سوابق استعلام را ندارید.</div> : null}
                {inquiries.map((i) => (
                  <div key={i.inquiryId} className="rounded-xl border border-border-default bg-bg-base p-3">
                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <div className="text-xs text-text-muted">{new Date(i.createdAt).toLocaleString()}</div>
                      <div className="text-xs font-semibold">{i.method} | {i.resultCode}</div>
                    </div>
                    {i.workItemId ? (
                      <div className="mt-2 text-xs">
                        WorkItem: <a className="underline text-brand-primary" href={`/work-items?workItemId=${i.workItemId}`}>{i.workItemId}</a>
                      </div>
                    ) : null}
                  </div>
                ))}

                {!inquiriesLoading && inquiries.length === 0 ? <div className="text-sm text-text-muted text-center py-4">موردی ثبت نشده است.</div> : null}
                {inquiriesLoading ? <div className="text-sm text-text-muted">در حال بارگذاری…</div> : null}
              </div>

              <div className="mt-3 flex flex-col gap-3 rounded-xl border border-border-default bg-bg-base p-3 md:flex-row md:items-center md:justify-between">
                <div className="text-xs text-text-muted">نمایش {inquiries.length ? inquiriesOffset + 1 : 0} تا {Math.min(inquiriesOffset + inquiriesLimit, inquiriesTotal)} از {inquiriesTotal}</div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <span className="text-xs text-text-muted">Limit</span>
                    <input
                      className="w-20 rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary"
                      value={String(inquiriesLimit)}
                      onChange={(e) => {
                        setInquiriesLimit(Math.max(1, Math.min(200, parseInt(e.target.value || '20', 10) || 20)));
                        setInquiriesOffset(0);
                      }}
                    />
                  </label>
                  <Button variant="ghost" size="sm" disabled={inquiriesLoading || inquiriesOffset <= 0} onClick={() => setInquiriesOffset(Math.max(0, inquiriesOffset - inquiriesLimit))}>
                    <ChevronRight className="h-4 w-4 ml-1" />
                    قبلی
                  </Button>
                  <Button variant="ghost" size="sm" disabled={inquiriesLoading || inquiriesOffset + inquiriesLimit >= inquiriesTotal} onClick={() => setInquiriesOffset(inquiriesOffset + inquiriesLimit)}>
                    بعدی
                    <ChevronLeft className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="h-4 w-4 text-brand-primary" />
                  Audit Timeline (Policy Changes)
                </div>
                <Button variant="ghost" size="sm" disabled={changesLoading || !canViewChanges} onClick={() => loadChanges(activePolicy.policyId)}>
                  <RefreshCw className="h-4 w-4 ml-1" />
                  بروزرسانی
                </Button>
              </div>

              <div className="mt-3 space-y-2">
                {!canViewChanges ? <div className="text-sm text-text-muted">دسترسی مشاهده تغییرات را ندارید.</div> : null}
                {changes.map((c) => (
                  <div key={c.changeId} className="rounded-xl border border-border-default bg-bg-base p-3">
                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <div className="text-xs text-text-muted">{new Date(c.createdAt).toLocaleString()}</div>
                      <div className="text-xs font-semibold">{c.type}</div>
                    </div>
                    {c.actorUserId ? <div className="mt-1 text-xs text-text-muted">Actor: {c.actorUserId}</div> : null}
                    {c.payload ? <pre className="mt-2 overflow-auto rounded-lg border border-border-default bg-bg-raised p-2 text-xs">{JSON.stringify(c.payload, null, 2)}</pre> : null}
                  </div>
                ))}

                {!changesLoading && changes.length === 0 ? <div className="text-sm text-text-muted text-center py-4">موردی ثبت نشده است.</div> : null}
                {changesLoading ? <div className="text-sm text-text-muted">در حال بارگذاری…</div> : null}
              </div>

              <div className="mt-3 flex flex-col gap-3 rounded-xl border border-border-default bg-bg-base p-3 md:flex-row md:items-center md:justify-between">
                <div className="text-xs text-text-muted">نمایش {changes.length ? changesOffset + 1 : 0} تا {Math.min(changesOffset + changesLimit, changesTotal)} از {changesTotal}</div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <span className="text-xs text-text-muted">Limit</span>
                    <input
                      className="w-20 rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary"
                      value={String(changesLimit)}
                      onChange={(e) => {
                        setChangesLimit(Math.max(1, Math.min(200, parseInt(e.target.value || '20', 10) || 20)));
                        setChangesOffset(0);
                      }}
                    />
                  </label>
                  <Button variant="ghost" size="sm" disabled={changesLoading || changesOffset <= 0} onClick={() => setChangesOffset(Math.max(0, changesOffset - changesLimit))}>
                    <ChevronRight className="h-4 w-4 ml-1" />
                    قبلی
                  </Button>
                  <Button variant="ghost" size="sm" disabled={changesLoading || changesOffset + changesLimit >= changesTotal} onClick={() => setChangesOffset(changesOffset + changesLimit)}>
                    بعدی
                    <ChevronLeft className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle className="h-4 w-4 text-brand-primary" />
                مرحله ۴: صدور (issue)
              </div>
              <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={issuePaid} onChange={(e) => setIssuePaid(e.target.checked)} />
                  <span>پرداخت انجام شده</span>
                </label>
                <Button
                  disabled={busyAction.length > 0 || !canIssue || activePolicy.status !== 'risk_assessed'}
                  isLoading={busyAction === 'issue'}
                  onClick={() => issue(activePolicy.policyId)}
                >
                  {busyAction === 'issue' ? 'در حال صدور…' : 'صدور بیمه‌نامه'}
                </Button>
              </div>
              {activePolicy.status !== 'risk_assessed' ? <div className="mt-2 text-xs text-text-muted">صدور فقط بعد از تکمیل مرحله کارشناسی و وضعیت risk_assessed مجاز است.</div> : null}
              <div className="mt-2 text-xs text-text-muted">صدور نیازمند پرداخت + Quality Gate سنهاب (آخرین inquiry باید OK باشد).</div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FileCheck className="h-4 w-4 text-brand-primary" />
                مرحله ۵: ثبت کد یکتا (unique-code)
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-3 md:items-end">
                <label className="grid gap-1 text-sm md:col-span-2">
                  <span className="text-xs text-text-muted">Unique Code</span>
                  <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={uniqueCodeValue} onChange={(e) => setUniqueCodeValue(e.target.value)} />
                </label>
                <Button
                  disabled={busyAction.length > 0 || !uniqueCodeValue || !canSetUniqueCode}
                  isLoading={busyAction === 'unique-code'}
                  onClick={() => setUniqueCodeAction(activePolicy.policyId)}
                >
                  {busyAction === 'unique-code' ? 'در حال ثبت…' : 'ثبت کد یکتا'}
                </Button>
              </div>
              <div className="mt-2 text-xs text-text-muted">این مرحله نیز تحت Quality Gate سنهاب است (inquiry باید OK باشد).</div>
            </Card>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirmOpen}
        title={confirmConfig?.title || ''}
        message={confirmConfig?.message || ''}
        confirmText={confirmConfig?.confirmText}
        cancelText={confirmConfig?.cancelText}
        danger={confirmConfig?.danger}
        onConfirm={handleConfirmDialog}
        onCancel={handleCancelDialog}
      />
    </main>
  );
}
