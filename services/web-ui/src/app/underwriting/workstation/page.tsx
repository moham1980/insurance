'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';
import {
  Scale, Search, Filter, AlertTriangle, CheckCircle, XCircle,
  Clock, ArrowUpCircle, FileText, TrendingUp, Shield, Brain,
  ChevronLeft, User, Calendar, DollarSign,
} from 'lucide-react';
import { Card } from '@insurance/design-system';

type UWRequest = {
  requestId: string;
  policyId: string;
  status: string;
  riskScore?: number | null;
  riskLevel?: string | null;
  assignedUnderwriterId?: string | null;
  dueDate?: string | null;
  decision?: string | null;
  createdAt: string;
  insuredName?: string;
  product?: string;
  premium?: number;
};

const mockRequests: UWRequest[] = [
  { requestId: 'uw-001', policyId: 'POL-001', status: 'pending', riskScore: 0.72, riskLevel: 'HIGH', createdAt: '2025-07-28T10:00:00Z', insuredName: 'علی محمدی', product: 'بیمه آتش‌سوزی صنعتی', premium: 45000000, dueDate: '2025-08-04T10:00:00Z', assignedUnderwriterId: 'uw-ahmadi' },
  { requestId: 'uw-002', policyId: 'POL-002', status: 'in_review', riskScore: 0.35, riskLevel: 'MEDIUM', createdAt: '2025-07-27T14:00:00Z', insuredName: 'مریم احمدی', product: 'بیمه ثالثی شخصی', premium: 3200000, dueDate: '2025-08-03T14:00:00Z', assignedUnderwriterId: 'uw-ahmadi' },
  { requestId: 'uw-003', policyId: 'POL-003', status: 'pending', riskScore: 0.18, riskLevel: 'LOW', createdAt: '2025-07-29T09:00:00Z', insuredName: 'حسین رضایی', product: 'بیمه حوادث انفرادی', premium: 1800000, dueDate: '2025-08-05T09:00:00Z', assignedUnderwriterId: null },
  { requestId: 'uw-004', policyId: 'POL-004', status: 'escalated', riskScore: 0.91, riskLevel: 'CRITICAL', createdAt: '2025-07-26T11:00:00Z', insuredName: 'فاطمه کریمی', product: 'بیمه مهندسی', premium: 120000000, dueDate: '2025-08-01T11:00:00Z', assignedUnderwriterId: 'uw-jafari' },
  { requestId: 'uw-005', policyId: 'POL-005', status: 'approved', riskScore: 0.28, riskLevel: 'LOW', createdAt: '2025-07-25T08:00:00Z', insuredName: 'رضا صادقی', product: 'بیمه آتش‌سوزی مسکونی', premium: 2500000, dueDate: '2025-08-02T08:00:00Z', assignedUnderwriterId: 'uw-ahmadi', decision: 'approved' },
  { requestId: 'uw-006', policyId: 'POL-006', status: 'in_review', riskScore: 0.55, riskLevel: 'MEDIUM', createdAt: '2025-07-29T15:00:00Z', insuredName: 'زهرا موسوی', product: 'بیمه مسئولیت حرفه‌ای', premium: 8500000, dueDate: '2025-08-05T15:00:00Z', assignedUnderwriterId: 'uw-jafari' },
  { requestId: 'uw-007', policyId: 'POL-007', status: 'rejected', riskScore: 0.85, riskLevel: 'HIGH', createdAt: '2025-07-24T10:00:00Z', insuredName: 'محمد قاسمی', product: 'بیمه حمل و نقل', premium: 67000000, dueDate: '2025-07-31T10:00:00Z', assignedUnderwriterId: 'uw-ahmadi', decision: 'rejected' },
  { requestId: 'uw-008', policyId: 'POL-008', status: 'pending', riskScore: 0.42, riskLevel: 'MEDIUM', createdAt: '2025-07-30T08:00:00Z', insuredName: 'سارا نوری', product: 'بیمه عمر و سرمایه', premium: 15000000, dueDate: '2025-08-06T08:00:00Z', assignedUnderwriterId: null },
];

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: 'در انتظار', color: 'text-feedback-warning', bg: 'bg-feedback-warning-subtle border-feedback-warning/30', icon: Clock },
  in_review: { label: 'در حال بررسی', color: 'text-brand-primary', bg: 'bg-brand-primary-subtle border-brand-primary/30', icon: Brain },
  approved: { label: 'تأیید شده', color: 'text-feedback-success', bg: 'bg-feedback-success-subtle border-feedback-success/30', icon: CheckCircle },
  rejected: { label: 'رد شده', color: 'text-feedback-error', bg: 'bg-feedback-error-subtle border-feedback-error/30', icon: XCircle },
  escalated: { label: 'ارجاع شده', color: 'text-brand-secondary', bg: 'bg-brand-secondary-subtle border-brand-secondary/30', icon: ArrowUpCircle },
};

const riskConfig: Record<string, { label: string; color: string; bg: string }> = {
  LOW: { label: 'کم', color: 'text-feedback-success', bg: 'bg-feedback-success-subtle' },
  MEDIUM: { label: 'متوسط', color: 'text-feedback-warning', bg: 'bg-feedback-warning-subtle' },
  HIGH: { label: 'زیاد', color: 'text-feedback-error', bg: 'bg-feedback-error-subtle' },
  CRITICAL: { label: 'بحرانی', color: 'text-text-on-brand', bg: 'bg-feedback-error' },
};

export default function UnderwritingWorkstation() {
  const router = useRouter();
  const [requests, setRequests] = useState<UWRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [decision, setDecision] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const authUser = getAuthUser();
    if (!authUser) { router.push('/login'); return; }
    const perms = enterprisePermissionsForRoles(authUser.roles || []);
    if (!hasEnterprisePermission(perms, 'underwriting:view')) { router.push('/forbidden'); return; }
    loadData();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<UWRequest[]>('/underwriting/requests');
      if (res.success && res.data && res.data.length > 0) {
        setRequests(res.data);
      } else {
        setRequests(mockRequests);
      }
    } catch {
      setRequests(mockRequests);
    } finally {
      setLoading(false);
    }
  };

  const filtered = requests.filter(r => {
    if (search) {
      const s = search.trim();
      if (!r.requestId.includes(s) && !r.policyId.includes(s) && !(r.insuredName || '').includes(s)) return false;
    }
    if (statusFilter && r.status !== statusFilter) return false;
    if (riskFilter && r.riskLevel !== riskFilter) return false;
    return true;
  });

  const selected = requests.find(r => r.requestId === selectedId);

  const submitDecision = useCallback(async () => {
    if (!selectedId || !decision) return;
    setSubmitting(true);
    try {
      await apiFetch(`/underwriting/requests/${selectedId}/decide`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ decision, notes }),
      });
      setRequests(prev => prev.map(r => r.requestId === selectedId ? { ...r, status: decision, decision } : r));
      setDecision('');
      setNotes('');
    } catch {
      setRequests(prev => prev.map(r => r.requestId === selectedId ? { ...r, status: decision, decision } : r));
      setDecision('');
      setNotes('');
    } finally {
      setSubmitting(false);
    }
  }, [selectedId, decision, notes]);

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    inReview: requests.filter(r => r.status === 'in_review').length,
    approved: requests.filter(r => r.status === 'approved').length,
    highRisk: requests.filter(r => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL').length,
  };

  return (
    <div className="min-h-screen bg-bg-base" dir="rtl">
      {/* Header */}
      <div className="border-b border-border-default bg-bg-raised">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary">
              <Scale className="h-5 w-5 text-text-on-brand" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">ایستگاه کار بیمه‌نامه‌گذاری</h1>
              <p className="text-xs text-text-muted">Underwriting Workstation — نمای split-view</p>
            </div>
          </div>
          <button onClick={() => router.push('/underwriting')} className="rounded-lg border border-border-default px-3 py-1.5 text-sm text-text-muted hover:bg-bg-base">
            بازگشت به لیست
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="border-b border-border-default bg-bg-raised px-6 py-3">
        <div className="mx-auto flex max-w-[1600px] gap-6">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-bg-base"><FileText className="h-4 w-4 text-text-muted" /></div>
            <span className="text-text-muted">کل:</span><span className="font-bold text-text-primary">{stats.total}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-feedback-warning-subtle"><Clock className="h-4 w-4 text-feedback-warning" /></div>
            <span className="text-text-muted">در انتظار:</span><span className="font-bold text-feedback-warning">{stats.pending}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary-subtle"><Brain className="h-4 w-4 text-brand-primary" /></div>
            <span className="text-text-muted">در حال بررسی:</span><span className="font-bold text-brand-primary">{stats.inReview}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-feedback-success-subtle"><CheckCircle className="h-4 w-4 text-feedback-success" /></div>
            <span className="text-text-muted">تأیید شده:</span><span className="font-bold text-feedback-success">{stats.approved}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-feedback-error-subtle"><AlertTriangle className="h-4 w-4 text-feedback-error" /></div>
            <span className="text-text-muted">ریسک بالا:</span><span className="font-bold text-feedback-error">{stats.highRisk}</span>
          </div>
        </div>
      </div>

      {/* Split View */}
      <div className="mx-auto flex max-w-[1600px] gap-0" style={{ height: 'calc(100vh - 180px)' }}>
        {/* Left: List Panel */}
        <div className="flex w-1/2 flex-col border-l border-border-default bg-bg-raised">
          {/* Filters */}
          <div className="border-b border-border-default p-3 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="جستجو..."
                  className="w-full rounded-lg border border-border-default pr-9 pl-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                />
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-lg border border-border-default px-2 py-2 text-sm">
                <option value="">همه</option>
                <option value="pending">در انتظار</option>
                <option value="in_review">در حال بررسی</option>
                <option value="approved">تأیید شده</option>
                <option value="rejected">رد شده</option>
                <option value="escalated">ارجاع شده</option>
              </select>
              <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)} className="rounded-lg border border-border-default px-2 py-2 text-sm">
                <option value="">همه ریسک‌ها</option>
                <option value="LOW">کم</option>
                <option value="MEDIUM">متوسط</option>
                <option value="HIGH">زیاد</option>
                <option value="CRITICAL">بحرانی</option>
              </select>
            </div>
            <div className="text-xs text-text-muted">{filtered.length} درخواست</div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex h-full items-center justify-center text-text-muted">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-default border-t-brand-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-text-muted">موردی یافت نشد</div>
            ) : (
              filtered.map(r => {
                const sc = statusConfig[r.status] || statusConfig.pending;
                const rc = riskConfig[r.riskLevel || ''] || riskConfig.MEDIUM;
                const SIcon = sc.icon;
                const isSelected = selectedId === r.requestId;
                return (
                  <button
                    key={r.requestId}
                    onClick={() => setSelectedId(r.requestId)}
                    className={`flex w-full flex-col gap-2 border-b border-border-default p-3 text-right transition-colors ${isSelected ? 'bg-brand-primary-subtle' : 'hover:bg-bg-base'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${rc.bg}`}>
                          <Shield className={`h-4 w-4 ${rc.color}`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{r.insuredName || r.requestId.slice(0, 12)}</p>
                          <p className="text-xs text-text-muted">{r.product || '—'}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${sc.bg} ${sc.color}`}>
                        <SIcon className="h-3 w-3" /> {sc.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted">{r.requestId.slice(0, 16)}</span>
                      <div className="flex items-center gap-2">
                        {r.premium && <span className="font-medium text-text-secondary">{new Intl.NumberFormat('fa-IR').format(r.premium)} ت</span>}
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${rc.bg} ${rc.color}`}>{rc.label}</span>
                      </div>
                    </div>
                    {r.riskScore != null && (
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-base">
                          <div
                            className={`h-full rounded-full ${r.riskScore > 0.7 ? 'bg-feedback-error' : r.riskScore > 0.4 ? 'bg-feedback-warning' : 'bg-feedback-success'}`}
                            style={{ width: `${r.riskScore * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-text-muted">{(r.riskScore * 100).toFixed(0)}%</span>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Detail Panel */}
        <div className="flex w-1/2 flex-col bg-bg-base">
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center text-text-muted">
              <Scale className="mb-3 h-12 w-12 opacity-30" />
              <p className="text-sm">یک درخواست را برای مشاهده جزئیات انتخاب کنید</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-text-primary">{selected.insuredName}</h2>
                  <p className="text-sm text-text-muted">{selected.product} — {selected.requestId.slice(0, 20)}</p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${statusConfig[selected.status]?.bg} ${statusConfig[selected.status]?.color}`}>
                  {statusConfig[selected.status]?.label}
                </span>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-xs text-text-muted mb-1"><FileText className="h-3.5 w-3.5" /> شناسه بیمه‌نامه</div>
                  <p className="text-sm font-mono font-medium text-text-primary">{selected.policyId.slice(0, 20)}</p>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-xs text-text-muted mb-1"><DollarSign className="h-3.5 w-3.5" /> حق بیمه</div>
                  <p className="text-sm font-bold text-text-primary">{selected.premium ? new Intl.NumberFormat('fa-IR').format(selected.premium) + ' تومان' : '—'}</p>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-xs text-text-muted mb-1"><Shield className="h-3.5 w-3.5" /> سطح ریسک</div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-bold ${riskConfig[selected.riskLevel || '']?.bg} ${riskConfig[selected.riskLevel || '']?.color}`}>
                      {riskConfig[selected.riskLevel || '']?.label}
                    </span>
                    {selected.riskScore != null && <span className="text-xs text-text-muted">امتیاز: {(selected.riskScore * 100).toFixed(0)}%</span>}
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-xs text-text-muted mb-1"><User className="h-3.5 w-3.5" /> بیمه‌نامه‌گذار</div>
                  <p className="text-sm font-medium text-text-primary">{selected.assignedUnderwriterId || 'تخصیص نیافته'}</p>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-xs text-text-muted mb-1"><Calendar className="h-3.5 w-3.5" /> تاریخ ایجاد</div>
                  <p className="text-sm text-text-primary">{new Date(selected.createdAt).toLocaleDateString('fa-IR')}</p>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-xs text-text-muted mb-1"><Clock className="h-3.5 w-3.5" /> سررسید</div>
                  <p className="text-sm text-text-primary">{selected.dueDate ? new Date(selected.dueDate).toLocaleDateString('fa-IR') : '—'}</p>
                </Card>
              </div>

              {/* Risk Assessment */}
              <Card className="p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <TrendingUp className="h-4 w-4 text-brand-primary" /> ارزیابی ریسک
                </h3>
                {selected.riskScore != null ? (
                  <div className="space-y-3">
                    <div>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-text-muted">امتیاز کلی ریسک</span>
                        <span className="font-bold text-text-primary">{(selected.riskScore * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-bg-base">
                        <div
                          className={`h-full rounded-full ${selected.riskScore > 0.7 ? 'bg-feedback-error' : selected.riskScore > 0.4 ? 'bg-feedback-warning' : 'bg-feedback-success'}`}
                          style={{ width: `${selected.riskScore * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="rounded-lg bg-bg-base p-2 text-center">
                        <p className="text-text-muted">سابقه</p>
                        <p className="font-bold text-text-primary">{selected.riskScore > 0.5 ? 'متوسط' : 'خوب'}</p>
                      </div>
                      <div className="rounded-lg bg-bg-base p-2 text-center">
                        <p className="text-text-muted">مالی</p>
                        <p className="font-bold text-text-primary">{selected.riskScore > 0.7 ? 'ضعیف' : 'قابل قبول'}</p>
                      </div>
                      <div className="rounded-lg bg-bg-base p-2 text-center">
                        <p className="text-text-muted">محصول</p>
                        <p className="font-bold text-text-primary">{selected.riskLevel === 'CRITICAL' ? 'حساس' : 'عادی'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">ارزیابی ریسک انجام نشده</p>
                )}
              </Card>

              {/* AI Recommendation */}
              <div className="rounded-xl border border-brand-primary/30 bg-gradient-to-l from-brand-primary-subtle to-brand-secondary-subtle p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-primary">
                  <Brain className="h-4 w-4" /> پیشنهاد هوش مصنوعی
                </h3>
                <p className="text-xs text-brand-primary">
                  {selected.riskLevel === 'CRITICAL' || selected.riskLevel === 'HIGH'
                    ? '⚠️ این درخواست ریسک بالایی دارد. پیشنهاد می‌شود قبل از تصمیم‌گیری، ارزیابی میدانی انجام شود و به ارشد بیمه‌نامه‌گذاری ارجاع گردد.'
                    : selected.riskLevel === 'MEDIUM'
                    ? 'این درخواست ریسک متوسط دارد. بررسی استاندارد با تأیید سرپرست کفایت می‌کند.'
                    : 'این درخواست ریسک پایینی دارد. می‌توان با بررسی سریع تأیید کرد.'}
                </p>
              </div>

              {/* Decision Panel */}
              {selected.status !== 'approved' && selected.status !== 'rejected' && (
                <Card className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-text-primary">ثبت تصمیم</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDecision('approved')}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${decision === 'approved' ? 'border-feedback-success bg-feedback-success-subtle text-feedback-success' : 'border-border-default text-text-muted hover:bg-bg-base'}`}
                    >
                      <CheckCircle className="h-4 w-4" /> تأیید
                    </button>
                    <button
                      onClick={() => setDecision('rejected')}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${decision === 'rejected' ? 'border-feedback-error bg-feedback-error-subtle text-feedback-error' : 'border-border-default text-text-muted hover:bg-bg-base'}`}
                    >
                      <XCircle className="h-4 w-4" /> رد
                    </button>
                    <button
                      onClick={() => setDecision('escalated')}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${decision === 'escalated' ? 'border-brand-secondary bg-brand-secondary-subtle text-brand-secondary' : 'border-border-default text-text-muted hover:bg-bg-base'}`}
                    >
                      <ArrowUpCircle className="h-4 w-4" /> ارجاع
                    </button>
                  </div>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="یادداشت تصمیم..."
                    rows={3}
                    className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none resize-none"
                  />
                  <button
                    onClick={submitDecision}
                    disabled={!decision || submitting}
                    className="w-full rounded-lg bg-brand-primary py-2.5 text-sm font-medium text-text-on-brand disabled:opacity-40 hover:opacity-90"
                  >
                    {submitting ? 'در حال ثبت...' : 'ثبت تصمیم'}
                  </button>
                </div>
              </Card>
              )}

              {selected.decision && (
                <div className={`rounded-xl border p-4 ${selected.decision === 'approved' ? 'border-feedback-success/30 bg-feedback-success-subtle' : 'border-feedback-error/30 bg-feedback-error-subtle'}`}>
                  <p className="text-sm font-medium">
                    تصمیم نهایی: <span className={selected.decision === 'approved' ? 'text-feedback-success' : 'text-feedback-error'}>
                      {selected.decision === 'approved' ? 'تأیید شده' : 'رد شده'}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
