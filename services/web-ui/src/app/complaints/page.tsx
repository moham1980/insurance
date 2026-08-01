'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, RefreshCw, Plus, Search, AlertCircle, CheckCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';
import { Button, Card, StatCard } from '@insurance/design-system';
import { MOCK_COMPLAINTS } from '@/lib/mock-data';

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

    try {
      const res = await apiFetch<ComplaintRow[]>(`/rm/complaints${qs.toString() ? `?${qs.toString()}` : ''}`);
      if (res.success) setRows(res.data);
      else {
        setError({ message: res.error.message, correlationId: res.correlationId });
        setRows(MOCK_COMPLAINTS.map(c => ({ ...c, complaintType: c.subject, description: c.description, createdAt: c.createdAt, updatedAt: c.createdAt })) as ComplaintRow[]);
      }
    } catch {
      setRows(MOCK_COMPLAINTS.map(c => ({ ...c, complaintType: c.subject, description: c.description, createdAt: c.createdAt, updatedAt: c.createdAt })) as ComplaintRow[]);
    } finally {
      setLoading(false);
    }
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
    if (!form.description.trim()) {
      setError({ message: 'توضیحات شکایت الزامی است' });
      return;
    }
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

  const stats = {
    total: rows.length,
    open: rows.filter(r => r.status === 'open').length,
    resolved: rows.filter(r => r.status === 'resolved' || r.status === 'closed').length,
    escalated: rows.filter(r => r.status === 'escalated').length,
  };

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Complaints (شکایات)</h1>
          <p className="mt-1 text-sm text-text-muted">ثبت و پیگیری شکایات داخلی (آماده‌سازی مسیر بیمه مرکزی)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`ml-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> بروزرسانی
          </Button>
          {canCreate ? (
            <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="ml-1 h-4 w-4" /> ثبت شکایت
            </Button>
          ) : null}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="کل شکایات" value={stats.total} icon={MessageSquare} changeType="neutral" />
        <StatCard title="باز" value={stats.open} icon={AlertCircle} changeType="warning" />
        <StatCard title="حل شده" value={stats.resolved} icon={CheckCircle} changeType="positive" />
        <StatCard title="ارتقا یافته" value={stats.escalated} icon={AlertCircle} changeType="negative" />
      </div>

      {/* Filters */}
      <Card className="mt-6 p-4">
        <div className="grid gap-3 md:grid-cols-6">
          <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="وضعیت" value={status} onChange={(e) => setStatus(e.target.value)} />
          <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="نوع شکایت" value={complaintType} onChange={(e) => setComplaintType(e.target.value)} />
          <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="شماره بیمه‌نامه" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} />
          <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="شناسه خسارت" value={claimId} onChange={(e) => setClaimId(e.target.value)} />
          <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="کدملی شاکی" value={complainantNationalId} onChange={(e) => setComplainantNationalId(e.target.value)} />
          <Button variant="ghost" size="md" onClick={load} disabled={loading} fullWidth>
            اعمال فیلتر
          </Button>
        </div>
      </Card>

      {error ? (
        <div className="mt-6 rounded-2xl border border-feedback-error/30 bg-feedback-error-subtle p-4 text-sm text-feedback-error">
          <div>خطا: {error.message}</div>
          {error.correlationId ? <div className="mt-1 text-xs">correlationId: {error.correlationId}</div> : null}
        </div>
      ) : null}

      {showCreate && canCreate ? (
        <Card className="mt-6 p-4" elevation={2}>
          <h3 className="font-semibold text-text-primary">ثبت شکایت جدید</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <select className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" value={form.complaintType} onChange={(e) => setForm({ ...form, complaintType: e.target.value })}>
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
            <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="مسئول پیگیری (اختیاری)" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} />

            <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="نام شرکت بیمه" value={form.policyCompanyName} onChange={(e) => setForm({ ...form, policyCompanyName: e.target.value })} />
            <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="شماره بیمه‌نامه" value={form.policyNumber} onChange={(e) => setForm({ ...form, policyNumber: e.target.value })} />
            <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="عنوان بیمه‌نامه" value={form.policyTitle} onChange={(e) => setForm({ ...form, policyTitle: e.target.value })} />
            <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="شناسه بیمه‌نامه" value={form.policyId} onChange={(e) => setForm({ ...form, policyId: e.target.value })} />
            <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="شناسه خسارت" value={form.claimId} onChange={(e) => setForm({ ...form, claimId: e.target.value })} />

            <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="کدملی شاکی" value={form.complainantNationalId} onChange={(e) => setForm({ ...form, complainantNationalId: e.target.value })} />
            <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" type="date" placeholder="تاریخ تولد شاکی" value={form.complainantBirthDate} onChange={(e) => setForm({ ...form, complainantBirthDate: e.target.value })} />
            <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="موبایل شاکی" value={form.complainantMobile} onChange={(e) => setForm({ ...form, complainantMobile: e.target.value })} />
            <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="آدرس شاکی" value={form.complainantAddress} onChange={(e) => setForm({ ...form, complainantAddress: e.target.value })} />
            <input
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm md:col-span-2 focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              placeholder="وضعیت نمایندگی (اختیاری)"
              value={form.complainantRepresentativeStatus}
              onChange={(e) => setForm({ ...form, complainantRepresentativeStatus: e.target.value })}
            />

            <textarea
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm md:col-span-2 focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              placeholder="توضیحات (الزامی)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              rows={3}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="primary" size="md" onClick={create} disabled={creating || !form.description.trim()} isLoading={creating}>
              ثبت
            </Button>
            <Button variant="ghost" size="md" onClick={() => setShowCreate(false)}>
              انصراف
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="mt-6 space-y-3">
        {rows.map((c) => (
          <Card key={c.complaintId} className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-text-primary">{c.complaintType}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.status === 'resolved' || c.status === 'closed' ? 'bg-feedback-success-subtle text-feedback-success' : c.status === 'escalated' ? 'bg-feedback-error-subtle text-feedback-error' : 'bg-feedback-warning-subtle text-feedback-warning'}`}>{c.status}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                  <span>شناسه: {c.complaintId}</span>
                  {c.policyNumber ? <span>بیمه‌نامه: {c.policyNumber}</span> : null}
                  {c.claimId ? <span>خسارت: {c.claimId}</span> : null}
                  {c.complainantNationalId ? <span>کدملی: {c.complainantNationalId}</span> : null}
                </div>
                {c.complainantMobile ? (
                  <div className="mt-1 text-xs text-text-muted">
                    موبایل: {c.complainantMobile}{' '}
                    {c.complainantMobileVerified ? (
                      <span className="ml-2 inline-flex items-center rounded-full bg-feedback-success-subtle px-2 py-0.5 text-[10px] text-feedback-success">تأیید شده</span>
                    ) : (
                      <span className="ml-2 inline-flex items-center rounded-full bg-feedback-warning-subtle px-2 py-0.5 text-[10px] text-feedback-warning">تأیید نشده</span>
                    )}
                  </div>
                ) : null}
                {c.slaResolutionDueAt ? (
                  <div className={`mt-1 text-xs ${isOverdue(c.slaResolutionDueAt) ? 'text-feedback-error font-medium' : 'text-text-muted'}`}>
                    SLA: {c.slaResolutionDueAt} {isOverdue(c.slaResolutionDueAt) ? '(گذشته)' : ''}
                  </div>
                ) : null}
                <div className="mt-2 text-sm text-text-primary whitespace-pre-wrap">{c.description}</div>
                {c.resolutionSummary ? <div className="mt-2 text-xs text-text-muted">نتیجه: {c.resolutionSummary}</div> : null}
              </div>

              <div className="min-w-[260px] rounded-xl border border-border-default p-3 bg-bg-base">
                <div className="text-xs font-semibold text-text-secondary">اقدامات</div>

                <div className="mt-2 grid gap-2">
                  <select className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" value={statusUpdate} onChange={(e) => setStatusUpdate(e.target.value as any)}>
                    <option value="open">باز</option>
                    <option value="in_review">در بررسی</option>
                    <option value="resolved">حل شده</option>
                    <option value="closed">بسته شده</option>
                    <option value="escalated">ارتقا یافته</option>
                  </select>
                  <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="خلاصه نتیجه (اختیاری)" value={resolutionSummary} onChange={(e) => setResolutionSummary(e.target.value)} />
                  <Button variant="primary" size="sm" onClick={() => updateComplaintStatus(c.complaintId)} disabled={!canUpdateStatus || busyId === c.complaintId} fullWidth>
                    {busyId === c.complaintId ? 'در حال اعمال...' : 'تغییر وضعیت'}
                  </Button>

                  <div className="h-px bg-border-default" />

                  <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="شناسه سند (الزامی)" value={attachDocumentId} onChange={(e) => setAttachDocumentId(e.target.value)} />
                  <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" placeholder="یادداشت (اختیاری)" value={attachNotes} onChange={(e) => setAttachNotes(e.target.value)} />
                  <Button variant="ghost" size="sm" onClick={() => attachDocument(c.complaintId)} disabled={!canAttachDocument || busyId === c.complaintId} fullWidth>
                    {busyId === c.complaintId ? 'در حال اتصال...' : 'اتصال سند'}
                  </Button>

                  <div className="h-px bg-border-default" />

                  <div className="text-xs font-semibold text-text-secondary">تأیید موبایل (OTP)</div>
                  <Button variant="ghost" size="sm" onClick={() => requestOtp(c.complaintId)} disabled={!canOtpRequest || otpBusyId === c.complaintId || c.complainantMobileVerified === true} fullWidth>
                    {otpBusyId === c.complaintId ? 'در حال ارسال...' : 'ارسال OTP'}
                  </Button>
                  <input
                    className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    placeholder="کد OTP"
                    value={otpCodeByComplaintId[c.complaintId] || ''}
                    onChange={(e) => setOtpCodeByComplaintId((m) => ({ ...m, [c.complaintId]: e.target.value }))}
                    disabled={c.complainantMobileVerified === true}
                  />
                  <Button variant="primary" size="sm" onClick={() => verifyOtp(c.complaintId)} disabled={!canOtpVerify || otpBusyId === c.complaintId || c.complainantMobileVerified === true} fullWidth>
                    {otpBusyId === c.complaintId ? 'در حال تأیید...' : 'تأیید OTP'}
                  </Button>

                  <div className="h-px bg-border-default" />

                  <Button variant="ghost" size="sm" onClick={() => exportCentralInsurance(c.complaintId)} disabled={!canExport || exportingId === c.complaintId} fullWidth>
                    {exportingId === c.complaintId ? 'در حال خروجی...' : 'خروجی بیمه مرکزی (JSON)'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {!loading && rows.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="mx-auto h-12 w-12 text-text-muted opacity-50" />
            <p className="mt-3 text-sm text-text-muted">موردی یافت نشد.</p>
          </div>
        ) : null}
      </div>

      {exportJson ? (
        <Card className="mt-6 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-text-primary">خروجی بیمه مرکزی</div>
            <Button variant="ghost" size="sm" onClick={() => { try { navigator.clipboard.writeText(exportJson); } catch {} }}>
              کپی
            </Button>
          </div>
          <pre className="mt-3 max-h-[420px] overflow-auto rounded-xl bg-bg-base p-3 text-xs">{exportJson}</pre>
        </Card>
      ) : null}
    </main>
  );
}
