'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';

type ComplaintRow = {
  complaintId: string;
  complaintType: string;
  status: string;
  policyCompanyName?: string | null;
  policyNumber?: string | null;
  policyTitle?: string | null;
  policyId?: string | null;
  claimId?: string | null;
  complainantNationalId?: string | null;
  complainantBirthDate?: string | null;
  complainantMobile?: string | null;
  complainantMobileVerified?: boolean | null;
  complainantMobileVerifiedAt?: string | null;
  complainantAddress?: string | null;
  complainantRepresentativeStatus?: string | null;
  description: string;
  assignedTo?: string | null;
  firstResponseAt?: string | null;
  resolvedAt?: string | null;
  escalatedAt?: string | null;
  slaFirstResponseDueAt?: string | null;
  slaResolutionDueAt?: string | null;
  resolutionSummary?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function ComplaintsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ComplaintRow[]>([]);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const perms = enterprisePermissionsForRoles(getAuthUser()?.roles);
  const canList = hasEnterprisePermission(perms, 'rm:complaints:view');
  const canCreate = hasEnterprisePermission(perms, 'complaints:create');
  const canUpdateStatus = hasEnterprisePermission(perms, 'complaints:update_status');
  const canAttachDocument = hasEnterprisePermission(perms, 'complaints:attach_document');
  const canExport = hasEnterprisePermission(perms, 'complaints:export');
  const canOtpRequest = hasEnterprisePermission(perms, 'complaints:otp_request');
  const canOtpVerify = hasEnterprisePermission(perms, 'complaints:otp_verify');

  const [status, setStatus] = useState('');
  const [complaintType, setComplaintType] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [claimId, setClaimId] = useState('');
  const [complainantNationalId, setComplainantNationalId] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    complaintType: 'issuance',
    description: '',
    policyCompanyName: '',
    policyNumber: '',
    policyTitle: '',
    policyId: '',
    claimId: '',
    complainantNationalId: '',
    complainantBirthDate: '',
    complainantMobile: '',
    complainantAddress: '',
    complainantRepresentativeStatus: '',
    assignedTo: '',
  });

  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusUpdate, setStatusUpdate] = useState<'open' | 'in_review' | 'resolved' | 'closed' | 'escalated'>('in_review');
  const [resolutionSummary, setResolutionSummary] = useState('');

  const [attachDocumentId, setAttachDocumentId] = useState('');
  const [attachNotes, setAttachNotes] = useState('');

  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportJson, setExportJson] = useState<string>('');

  const [otpBusyId, setOtpBusyId] = useState<string | null>(null);
  const [otpCodeByComplaintId, setOtpCodeByComplaintId] = useState<Record<string, string>>({});

  function isOverdue(iso: string | null | undefined): boolean {
    if (!iso) return false;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return false;
    return d.getTime() < Date.now();
  }

  async function load() {
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    if (complaintType) qs.set('complaintType', complaintType);
    if (policyNumber) qs.set('policyNumber', policyNumber);
    if (claimId) qs.set('claimId', claimId);
    if (complainantNationalId) qs.set('complainantNationalId', complainantNationalId);

    // Use Read Model endpoint for list (avoids fan-out per Enterprise Blueprint)
    const res = await apiFetch<ComplaintRow[]>(`/rm/complaints${qs.toString() ? `?${qs.toString()}` : ''}`);
    if (res.success) setRows(res.data);
    else setError({ message: res.error.message, correlationId: res.correlationId });

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

  async function create() {
    setCreating(true);
    setError(null);

    const payload: any = {
      complaintType: form.complaintType,
      description: form.description,
      policyCompanyName: form.policyCompanyName || undefined,
      policyNumber: form.policyNumber || undefined,
      policyTitle: form.policyTitle || undefined,
      policyId: form.policyId || undefined,
      claimId: form.claimId || undefined,
      complainantNationalId: form.complainantNationalId || undefined,
      complainantBirthDate: form.complainantBirthDate || undefined,
      complainantMobile: form.complainantMobile || undefined,
      complainantAddress: form.complainantAddress || undefined,
      complainantRepresentativeStatus: form.complainantRepresentativeStatus || undefined,
      assignedTo: form.assignedTo || undefined,
    };

    const res = await apiFetch<ComplaintRow>('/complaints', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.success) {
      setShowCreate(false);
      setForm({
        complaintType: 'issuance',
        description: '',
        policyCompanyName: '',
        policyNumber: '',
        policyTitle: '',
        policyId: '',
        claimId: '',
        complainantNationalId: '',
        complainantBirthDate: '',
        complainantMobile: '',
        complainantAddress: '',
        complainantRepresentativeStatus: '',
        assignedTo: '',
      });
      await load();
    } else {
      setError({ message: res.error.message, correlationId: res.correlationId });
    }

    setCreating(false);
  }

  async function updateComplaintStatus(complaintId: string) {
    setBusyId(complaintId);
    setError(null);

    const res = await apiFetch<ComplaintRow>(`/complaints/${encodeURIComponent(complaintId)}/status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        status: statusUpdate,
        resolutionSummary: resolutionSummary || undefined,
      }),
    });

    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });

    setBusyId(null);
    await load();
  }

  async function requestOtp(complaintId: string) {
    setOtpBusyId(complaintId);
    setError(null);
    const res = await apiFetch<any>(`/complaints/${encodeURIComponent(complaintId)}/mobile/otp/request`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    setOtpBusyId(null);
    await load();
  }

  async function verifyOtp(complaintId: string) {
    const code = String(otpCodeByComplaintId[complaintId] || '').trim();
    if (!code) {
      setError({ message: 'کد OTP اجباری است' });
      return;
    }

    setOtpBusyId(complaintId);
    setError(null);
    const res = await apiFetch<any>(`/complaints/${encodeURIComponent(complaintId)}/mobile/otp/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    setOtpBusyId(null);
    setOtpCodeByComplaintId((m) => ({ ...m, [complaintId]: '' }));
    await load();
  }

  async function exportCentralInsurance(complaintId: string) {
    setExportingId(complaintId);
    setError(null);
    setExportJson('');

    const res = await apiFetch<any>(`/complaints/${encodeURIComponent(complaintId)}/export/central-insurance`);
    if (!res.success) {
      setError({ message: res.error.message, correlationId: res.correlationId });
      setExportingId(null);
      return;
    }

    try {
      setExportJson(JSON.stringify(res.data, null, 2));
    } catch {
      setExportJson(String(res.data));
    }

    setExportingId(null);
  }

  async function attachDocument(complaintId: string) {
    if (!attachDocumentId) {
      setError({ message: 'documentId اجباری است' });
      return;
    }

    setBusyId(complaintId);
    setError(null);

    const res = await apiFetch<any>(`/complaints/${encodeURIComponent(complaintId)}/attachments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        documentId: attachDocumentId,
        notes: attachNotes || undefined,
      }),
    });

    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });

    setBusyId(null);
    setAttachDocumentId('');
    setAttachNotes('');
    await load();
  }

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Complaints (شکایات)</h1>
          <p className="mt-1 text-sm text-neutral-600">ثبت و پیگیری شکایات داخلی (آماده‌سازی مسیر بیمه مرکزی)</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" disabled={loading}>
            بروزرسانی
          </button>
          {canCreate ? (
            <button type="button" onClick={() => setShowCreate(true)} className="rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-800">
              + ثبت شکایت
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-6">
        <input className="rounded-xl border px-3 py-2" placeholder="status" value={status} onChange={(e) => setStatus(e.target.value)} />
        <input className="rounded-xl border px-3 py-2" placeholder="complaintType" value={complaintType} onChange={(e) => setComplaintType(e.target.value)} />
        <input className="rounded-xl border px-3 py-2" placeholder="policyNumber" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} />
        <input className="rounded-xl border px-3 py-2" placeholder="claimId" value={claimId} onChange={(e) => setClaimId(e.target.value)} />
        <input className="rounded-xl border px-3 py-2" placeholder="complainantNationalId" value={complainantNationalId} onChange={(e) => setComplainantNationalId(e.target.value)} />
        <button type="button" className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" onClick={load} disabled={loading}>
          اعمال فیلتر
        </button>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <div>خطا: {error.message}</div>
          {error.correlationId ? <div className="mt-1 text-xs">correlationId: {error.correlationId}</div> : null}
        </div>
      ) : null}

      {showCreate && canCreate ? (
        <div className="mt-6 rounded-2xl border p-4">
          <h3 className="font-semibold">ثبت شکایت جدید</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <select className="rounded-xl border px-3 py-2" value={form.complaintType} onChange={(e) => setForm({ ...form, complaintType: e.target.value })}>
              <option value="issuance">صدور</option>
              <option value="claims_with_case">خسارت (با پرونده)</option>
              <option value="claims_without_case">خسارت (بدون پرونده)</option>
              <option value="agent">نماینده</option>
              <option value="broker">کارگزار</option>
              <option value="loss_adjuster">ارزیاب</option>
              <option value="unauthorized_office">دفتر غیرمجاز</option>
              <option value="fund">صندوق</option>
              <option value="other">سایر</option>
            </select>
            <input className="rounded-xl border px-3 py-2" placeholder="assignedTo (optional)" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} />

            <input className="rounded-xl border px-3 py-2" placeholder="policyCompanyName" value={form.policyCompanyName} onChange={(e) => setForm({ ...form, policyCompanyName: e.target.value })} />
            <input className="rounded-xl border px-3 py-2" placeholder="policyNumber" value={form.policyNumber} onChange={(e) => setForm({ ...form, policyNumber: e.target.value })} />
            <input className="rounded-xl border px-3 py-2" placeholder="policyTitle" value={form.policyTitle} onChange={(e) => setForm({ ...form, policyTitle: e.target.value })} />
            <input className="rounded-xl border px-3 py-2" placeholder="policyId" value={form.policyId} onChange={(e) => setForm({ ...form, policyId: e.target.value })} />
            <input className="rounded-xl border px-3 py-2" placeholder="claimId" value={form.claimId} onChange={(e) => setForm({ ...form, claimId: e.target.value })} />

            <input className="rounded-xl border px-3 py-2" placeholder="complainantNationalId" value={form.complainantNationalId} onChange={(e) => setForm({ ...form, complainantNationalId: e.target.value })} />
            <input className="rounded-xl border px-3 py-2" type="date" placeholder="complainantBirthDate" value={form.complainantBirthDate} onChange={(e) => setForm({ ...form, complainantBirthDate: e.target.value })} />
            <input className="rounded-xl border px-3 py-2" placeholder="complainantMobile" value={form.complainantMobile} onChange={(e) => setForm({ ...form, complainantMobile: e.target.value })} />
            <input className="rounded-xl border px-3 py-2" placeholder="complainantAddress" value={form.complainantAddress} onChange={(e) => setForm({ ...form, complainantAddress: e.target.value })} />
            <input
              className="rounded-xl border px-3 py-2 md:col-span-2"
              placeholder="complainantRepresentativeStatus (optional)"
              value={form.complainantRepresentativeStatus}
              onChange={(e) => setForm({ ...form, complainantRepresentativeStatus: e.target.value })}
            />

            <textarea
              className="rounded-xl border px-3 py-2 md:col-span-2"
              placeholder="description (required)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={create} disabled={creating} className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50">
              {creating ? 'در حال ثبت...' : 'ثبت'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50">
              انصراف
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {rows.map((c) => (
          <div key={c.complaintId} className="rounded-2xl border p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-sm font-semibold">{c.complaintType} | {c.status}</div>
                <div className="mt-1 text-xs text-neutral-600">complaintId: {c.complaintId}</div>
                {c.policyNumber ? <div className="mt-1 text-xs text-neutral-600">policyNumber: {c.policyNumber}</div> : null}
                {c.claimId ? <div className="mt-1 text-xs text-neutral-600">claimId: {c.claimId}</div> : null}
                {c.complainantNationalId ? <div className="mt-1 text-xs text-neutral-600">nationalId: {c.complainantNationalId}</div> : null}
                {c.complainantMobile ? (
                  <div className="mt-1 text-xs text-neutral-600">
                    mobile: {c.complainantMobile}{' '}
                    {c.complainantMobileVerified ? (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-800">verified</span>
                    ) : (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800">not verified</span>
                    )}
                  </div>
                ) : null}
                {c.slaResolutionDueAt ? (
                  <div className={`mt-1 text-xs ${isOverdue(c.slaResolutionDueAt) ? 'text-rose-700' : 'text-neutral-600'}`}>
                    SLA resolution due: {c.slaResolutionDueAt} {isOverdue(c.slaResolutionDueAt) ? '(OVERDUE)' : ''}
                  </div>
                ) : null}
                <div className="mt-2 text-sm text-neutral-800 whitespace-pre-wrap">{c.description}</div>
                {c.resolutionSummary ? <div className="mt-2 text-xs text-neutral-600">resolution: {c.resolutionSummary}</div> : null}
              </div>

              <div className="min-w-[260px] rounded-xl border p-3">
                <div className="text-xs font-semibold text-neutral-700">اقدامات</div>

                <div className="mt-2 grid gap-2">
                  <select className="rounded-xl border px-3 py-2 text-sm" value={statusUpdate} onChange={(e) => setStatusUpdate(e.target.value as any)}>
                    <option value="open">open</option>
                    <option value="in_review">in_review</option>
                    <option value="resolved">resolved</option>
                    <option value="closed">closed</option>
                    <option value="escalated">escalated</option>
                  </select>
                  <input className="rounded-xl border px-3 py-2 text-sm" placeholder="resolutionSummary (optional)" value={resolutionSummary} onChange={(e) => setResolutionSummary(e.target.value)} />
                  <button
                    type="button"
                    onClick={() => updateComplaintStatus(c.complaintId)}
                    disabled={!canUpdateStatus || busyId === c.complaintId}
                    className="rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {busyId === c.complaintId ? 'در حال اعمال...' : 'تغییر وضعیت'}
                  </button>

                  <div className="h-px bg-neutral-200" />

                  <input className="rounded-xl border px-3 py-2 text-sm" placeholder="documentId (required)" value={attachDocumentId} onChange={(e) => setAttachDocumentId(e.target.value)} />
                  <input className="rounded-xl border px-3 py-2 text-sm" placeholder="notes (optional)" value={attachNotes} onChange={(e) => setAttachNotes(e.target.value)} />
                  <button
                    type="button"
                    onClick={() => attachDocument(c.complaintId)}
                    disabled={!canAttachDocument || busyId === c.complaintId}
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {busyId === c.complaintId ? 'در حال اتصال...' : 'اتصال سند'}
                  </button>

                  <div className="h-px bg-neutral-200" />

                  <div className="text-xs font-semibold text-neutral-700">تایید موبایل (OTP)</div>
                  <button
                    type="button"
                    onClick={() => requestOtp(c.complaintId)}
                    disabled={!canOtpRequest || otpBusyId === c.complaintId || c.complainantMobileVerified === true}
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {otpBusyId === c.complaintId ? 'در حال ارسال...' : 'ارسال OTP'}
                  </button>
                  <input
                    className="rounded-xl border px-3 py-2 text-sm"
                    placeholder="کد OTP"
                    value={otpCodeByComplaintId[c.complaintId] || ''}
                    onChange={(e) => setOtpCodeByComplaintId((m) => ({ ...m, [c.complaintId]: e.target.value }))}
                    disabled={c.complainantMobileVerified === true}
                  />
                  <button
                    type="button"
                    onClick={() => verifyOtp(c.complaintId)}
                    disabled={!canOtpVerify || otpBusyId === c.complaintId || c.complainantMobileVerified === true}
                    className="rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {otpBusyId === c.complaintId ? 'در حال تایید...' : 'تایید OTP'}
                  </button>

                  <div className="h-px bg-neutral-200" />

                  <button
                    type="button"
                    onClick={() => exportCentralInsurance(c.complaintId)}
                    disabled={!canExport || exportingId === c.complaintId}
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {exportingId === c.complaintId ? 'در حال خروجی...' : 'خروجی بیمه مرکزی (JSON)'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {!loading && rows.length === 0 ? <div className="text-sm text-neutral-600">موردی یافت نشد.</div> : null}
      </div>

      {exportJson ? (
        <div className="mt-6 rounded-2xl border p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">خروجی بیمه مرکزی</div>
            <button
              type="button"
              className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
              onClick={() => {
                try {
                  navigator.clipboard.writeText(exportJson);
                } catch {
                  // ignore
                }
              }}
            >
              کپی
            </button>
          </div>
          <pre className="mt-3 max-h-[420px] overflow-auto rounded-xl bg-neutral-50 p-3 text-xs">{exportJson}</pre>
        </div>
      ) : null}
    </main>
  );
}
