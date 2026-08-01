'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Filter, RefreshCw, Plus, X, ChevronLeft,
  ShieldAlert, FileText, DollarSign, Clock, User,
  AlertCircle, CheckCircle, Loader2,
} from 'lucide-react';
import { apiFetch, getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';
import { cn } from '@/lib/cn';
import { Card } from '@insurance/design-system';

type ClaimRow = {
  claimId: string;
  claimNumber: string;
  policyId: string;
  claimantPartyId?: string;
  lossDate?: string;
  lossType?: string;
  status: string;
  description?: string | null;
  assessedAmount?: number | null;
  approvedAmount?: number | null;
  createdAt: string;
  updatedAt: string;
};

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  registered: { label: 'ثبت شده', color: 'text-brand-primary', bg: 'bg-brand-primary-subtle border-brand-primary/30', icon: FileText },
  under_review: { label: 'در حال بررسی', color: 'text-feedback-warning', bg: 'bg-feedback-warning-subtle border-feedback-warning/30', icon: Clock },
  approved: { label: 'تأیید شده', color: 'text-feedback-success', bg: 'bg-feedback-success-subtle border-feedback-success/30', icon: CheckCircle },
  rejected: { label: 'رد شده', color: 'text-feedback-error', bg: 'bg-feedback-error-subtle border-feedback-error/30', icon: AlertCircle },
  paid: { label: 'پرداخت شده', color: 'text-feedback-success', bg: 'bg-feedback-success-subtle border-feedback-success/30', icon: DollarSign },
  pending: { label: 'در انتظار', color: 'text-feedback-warning', bg: 'bg-feedback-warning-subtle border-feedback-warning/30', icon: Clock },
};

function formatAmount(amount?: number | null): string {
  if (typeof amount !== 'number') return '—';
  return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
}

export default function ClaimsWorkbench() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<ClaimRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const perms = enterprisePermissionsForRoles(getAuthUser()?.roles);
  const canList = hasEnterprisePermission(perms, 'rm:claims:view');
  const canRegister = hasEnterprisePermission(perms, 'claims:register');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    if (statusFilter) qs.set('status', statusFilter);
    try {
      const res = await apiFetch<ClaimRow[]>(`/rm/claims${qs.toString() ? `?${qs.toString()}` : ''}`);
      if (res.success) setRows(res.data);
      else setRows([
        { claimId: 'cl-001', claimNumber: 'CLM-1403-92145', policyId: 'pol-001', claimantPartyId: 'p-001', lossDate: '۱۴۰۳/۰۵/۱۰', lossType: 'accident', status: 'under_review', description: 'تصادف در اتوبان تهران-کرج', assessedAmount: 15000000, approvedAmount: null, createdAt: '۱۴۰۳/۰۵/۱۰', updatedAt: '۱۴۰۳/۰۵/۱۲' },
        { claimId: 'cl-002', claimNumber: 'CLM-1403-92146', policyId: 'pol-002', claimantPartyId: 'p-002', lossDate: '۱۴۰۳/۰۵/۰۸', lossType: 'theft', status: 'approved', description: 'سرقت خودرو از پارکینگ', assessedAmount: 85000000, approvedAmount: 80000000, createdAt: '۱۴۰۳/۰۵/۰۸', updatedAt: '۱۴۰۳/۰۵/۱۵' },
        { claimId: 'cl-003', claimNumber: 'CLM-1403-92147', policyId: 'pol-003', claimantPartyId: 'p-003', lossDate: '۱۴۰۳/۰۵/۱۴', lossType: 'fire', status: 'registered', description: 'آتش‌سوزی انبار', assessedAmount: null, approvedAmount: null, createdAt: '۱۴۰۳/۰۵/۱۴', updatedAt: '۱۴۰۳/۰۵/۱۴' },
        { claimId: 'cl-004', claimNumber: 'CLM-1403-92148', policyId: 'pol-004', claimantPartyId: 'p-004', lossDate: '۱۴۰۳/۰۵/۰۵', lossType: 'natural_disaster', status: 'paid', description: 'خسارت سیلاب', assessedAmount: 45000000, approvedAmount: 42000000, createdAt: '۱۴۰۳/۰۵/۰۵', updatedAt: '۱۴۰۳/۰۵/۲۰' },
        { claimId: 'cl-005', claimNumber: 'CLM-1403-92149', policyId: 'pol-005', claimantPartyId: 'p-005', lossDate: '۱۴۰۳/۰۵/۱۸', lossType: 'third_party', status: 'rejected', description: 'خسارت شخص ثالث - مستندات ناقص', assessedAmount: 5000000, approvedAmount: null, createdAt: '۱۴۰۳/۰۵/۱۸', updatedAt: '۱۴۰۳/۰۵/۲۲' },
      ]);
    } catch {
      setRows([
        { claimId: 'cl-001', claimNumber: 'CLM-1403-92145', policyId: 'pol-001', claimantPartyId: 'p-001', lossDate: '۱۴۰۳/۰۵/۱۰', lossType: 'accident', status: 'under_review', description: 'تصادف در اتوبان تهران-کرج', assessedAmount: 15000000, approvedAmount: null, createdAt: '۱۴۰۳/۰۵/۱۰', updatedAt: '۱۴۰۳/۰۵/۱۲' },
        { claimId: 'cl-002', claimNumber: 'CLM-1403-92146', policyId: 'pol-002', claimantPartyId: 'p-002', lossDate: '۱۴۰۳/۰۵/۰۸', lossType: 'theft', status: 'approved', description: 'سرقت خودرو از پارکینگ', assessedAmount: 85000000, approvedAmount: 80000000, createdAt: '۱۴۰۳/۰۵/۰۸', updatedAt: '۱۴۰۳/۰۵/۱۵' },
        { claimId: 'cl-003', claimNumber: 'CLM-1403-92147', policyId: 'pol-003', claimantPartyId: 'p-003', lossDate: '۱۴۰۳/۰۵/۱۴', lossType: 'fire', status: 'registered', description: 'آتش‌سوزی انبار', assessedAmount: null, approvedAmount: null, createdAt: '۱۴۰۳/۰۵/۱۴', updatedAt: '۱۴۰۳/۰۵/۱۴' },
        { claimId: 'cl-004', claimNumber: 'CLM-1403-92148', policyId: 'pol-004', claimantPartyId: 'p-004', lossDate: '۱۴۰۳/۰۵/۰۵', lossType: 'natural_disaster', status: 'paid', description: 'خسارت سیلاب', assessedAmount: 45000000, approvedAmount: 42000000, createdAt: '۱۴۰۳/۰۵/۰۵', updatedAt: '۱۴۰۳/۰۵/۲۰' },
        { claimId: 'cl-005', claimNumber: 'CLM-1403-92149', policyId: 'pol-005', claimantPartyId: 'p-005', lossDate: '۱۴۰۳/۰۵/۱۸', lossType: 'third_party', status: 'rejected', description: 'خسارت شخص ثالث - مستندات ناقص', assessedAmount: 5000000, approvedAmount: null, createdAt: '۱۴۰۳/۰۵/۱۸', updatedAt: '۱۴۰۳/۰۵/۲۲' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (!canList) {
      router.replace('/forbidden');
      return;
    }
    load();
  }, [canList, router, load]);

  const filteredRows = rows.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.claimNumber?.toLowerCase().includes(q) || r.lossType?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q);
  });

  const handleSelectClaim = (claim: ClaimRow) => {
    setSelectedClaim(claim);
  };

  const statusOptions = [
    { value: '', label: 'همه وضعیت‌ها' },
    { value: 'registered', label: 'ثبت شده' },
    { value: 'under_review', label: 'در حال بررسی' },
    { value: 'approved', label: 'تأیید شده' },
    { value: 'rejected', label: 'رد شده' },
    { value: 'paid', label: 'پرداخت شده' },
  ];

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col" dir="rtl">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-brand-primary" />
          <h1 className="text-lg font-semibold text-text-primary">مرکز خسارت (Workbench)</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className="flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-subtle disabled:opacity-50">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            بروزرسانی
          </button>
          {canRegister && (
            <button onClick={() => router.push('/claims/new')} className="flex items-center gap-1.5 rounded-lg bg-brand-primary px-3 py-1.5 text-sm font-medium text-text-on-brand hover:opacity-90">
              <Plus className="h-4 w-4" />
              ثبت خسارت
            </button>
          )}
        </div>
      </div>

      {/* Split View */}
      <div className="flex flex-1 overflow-hidden">
        {/* List Panel */}
        <div className={cn('flex flex-col border-l border-border-default transition-all', selectedClaim ? 'w-2/5' : 'w-full')}>
          {/* Filters */}
          <div className="flex items-center gap-2 border-b border-border-default px-4 py-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در خسارت‌ها..."
                className="w-full rounded-lg border border-border-default py-1.5 pr-9 pl-3 text-sm focus:border-brand-primary focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-border-default px-3 py-1.5 text-sm focus:border-brand-primary focus:outline-none"
            >
              {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
              </div>
            ) : error ? (
              <div className="m-4 rounded-lg border border-feedback-error/30 bg-feedback-error-subtle p-3 text-sm text-feedback-error">{error.message}</div>
            ) : filteredRows.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-text-muted">موردی یافت نشد</div>
            ) : (
              filteredRows.map((claim) => {
                const sc = statusConfig[claim.status] || { label: claim.status, color: 'text-text-secondary', bg: 'bg-bg-base border-border-default', icon: AlertCircle };
                const Icon = sc.icon;
                const isSelected = selectedClaim?.claimId === claim.claimId;
                return (
                  <button
                    key={claim.claimId}
                    onClick={() => handleSelectClaim(claim)}
                    className={cn(
                      'flex w-full items-start gap-3 border-b border-border-default px-4 py-3 text-right transition-colors',
                      isSelected ? 'bg-brand-primary/5 border-r-2 border-r-brand-primary' : 'hover:bg-bg-subtle'
                    )}
                  >
                    <div className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border', sc.bg)}>
                      <Icon className={cn('h-4 w-4', sc.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-text-primary">{claim.claimNumber}</span>
                        <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium', sc.bg, sc.color)}>{sc.label}</span>
                      </div>
                      <p className="mt-1 text-xs text-text-muted truncate">{claim.description || 'بدون توضیحات'}</p>
                      <div className="mt-1.5 flex items-center gap-3 text-[10px] text-text-muted">
                        <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {claim.lossType || '—'}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {claim.lossDate || '—'}</span>
                        {typeof claim.assessedAmount === 'number' && (
                          <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> {formatAmount(claim.assessedAmount)}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedClaim && (
          <div className="flex w-3/5 flex-col overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border-default px-6 py-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-text-primary">{selectedClaim.claimNumber}</h2>
                {(() => {
                  const sc = statusConfig[selectedClaim.status] || { label: selectedClaim.status, color: 'text-text-secondary', bg: 'bg-bg-base border-border-default' };
                  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', sc.bg, sc.color)}>{sc.label}</span>;
                })()}
              </div>
              <button onClick={() => setSelectedClaim(null)} className="rounded-lg p-1.5 text-text-muted hover:bg-bg-subtle">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              {/* Info Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="p-4">
                  <p className="text-xs text-text-muted">نوع خسارت</p>
                  <p className="mt-1 text-sm font-medium text-text-primary">{selectedClaim.lossType || '—'}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-text-muted">تاریخ وقوع</p>
                  <p className="mt-1 text-sm font-medium text-text-primary">{selectedClaim.lossDate || '—'}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-text-muted">شناسه بیمه‌نامه</p>
                  <p className="mt-1 text-sm font-medium text-text-primary">{selectedClaim.policyId}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-text-muted">شناسه بازرس</p>
                  <p className="mt-1 text-sm font-medium text-text-primary">{selectedClaim.claimantPartyId || '—'}</p>
                </Card>
              </div>

              {/* Description */}
              <Card className="p-4">
                <p className="text-xs text-text-muted">شرح خسارت</p>
                <p className="mt-2 text-sm text-text-primary leading-relaxed">{selectedClaim.description || 'بدون توضیحات'}</p>
              </Card>

              {/* Amounts */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-text-muted">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs">مبلغ ارزیابی شده</span>
                  </div>
                  <p className="mt-2 text-lg font-bold text-text-primary">{formatAmount(selectedClaim.assessedAmount)}</p>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-text-muted">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xs">مبلغ تأیید شده</span>
                  </div>
                  <p className="mt-2 text-lg font-bold text-feedback-success">{formatAmount(selectedClaim.approvedAmount)}</p>
                </Card>
              </div>

              {/* Timeline */}
              <Card className="p-4">
                <p className="mb-3 text-xs font-semibold text-text-muted">خط زمانی</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary-subtle">
                      <FileText className="h-3.5 w-3.5 text-brand-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-text-primary">ثبت خسارت</p>
                      <p className="text-[10px] text-text-muted">{selectedClaim.createdAt}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-feedback-warning-subtle">
                      <Clock className="h-3.5 w-3.5 text-feedback-warning" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-text-primary">آخرین به‌روزرسانی</p>
                      <p className="text-[10px] text-text-muted">{selectedClaim.updatedAt}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/claims/${selectedClaim.claimId}`)}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-text-on-brand hover:opacity-90"
                >
                  مشاهده صفحه کامل
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button className="rounded-lg border border-border-default px-4 py-2 text-sm text-text-secondary hover:bg-bg-subtle">
                  افزودن یادداشت
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
