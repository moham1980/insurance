'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, RefreshCw, Search, Send, AlertCircle, FileText, Clock, CheckCircle, XCircle, Wrench } from 'lucide-react';
import { apiFetch, getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';
import { Button, Card, StatCard } from '@insurance/design-system';
import { MOCK_CLAIMS } from '@/lib/mock-data';

type AdjusterCase = {
  claimId: string;
  claimNumber: string;
  policyId: string;
  lossDate: string;
  lossType: string;
  status: string;
  assessedAmount: number | null;
  adjusterId: string | null;
  referralReason: string | null;
  referralAt: string | null;
  referralBy: string | null;
  createdAt: string;
};

export default function LossAdjusterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AdjusterCase[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [adjusterId, setAdjusterId] = useState('');
  const [reason, setReason] = useState('');
  const [selectedClaimId, setSelectedClaimId] = useState('');

  useEffect(() => {
    const authUser = getAuthUser();
    if (!authUser) { router.push('/login'); return; }
    const perms = enterprisePermissionsForRoles(authUser.roles || []);
    if (!hasEnterprisePermission(perms, 'claims:assess')) { router.push('/forbidden'); return; }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = statusFilter ? `/claims?status=${statusFilter}` : '/claims';
      const json: any = await apiFetch(url);
      if (json?.success) {
        const allClaims: AdjusterCase[] = (json.data || []).map((c: any) => ({
          claimId: c.claimId,
          claimNumber: c.claimNumber,
          policyId: c.policyId,
          lossDate: c.lossDate,
          lossType: c.lossType,
          status: c.status,
          assessedAmount: c.assessedAmount,
          adjusterId: c.metadata?.adjusterId || null,
          referralReason: c.metadata?.adjusterReferralReason || null,
          referralAt: c.metadata?.adjusterReferralAt || null,
          referralBy: c.metadata?.adjusterReferralBy || null,
          createdAt: c.createdAt,
        }));
        setRows(allClaims);
      } else {
        setRows(MOCK_CLAIMS as unknown as AdjusterCase[]);
      }
    } catch (e: any) { setError(e?.message || 'خطا'); }
    finally { setLoading(false); }
  };

  const referToAdjuster = async () => {
    if (!selectedClaimId || !adjusterId || !reason) { alert('همه فیلدها را پر کنید'); return; }
    try {
      const json: any = await apiFetch(`/claims/${selectedClaimId}/refer-to-adjuster`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ adjusterId, reason }),
      });
      if (json?.success) { setSelectedClaimId(''); setAdjusterId(''); setReason(''); await fetchData(); }
      else alert(json?.error?.message || 'خطا');
    } catch (e: any) { alert(e?.message || 'خطا'); }
  };

  const filteredRows = rows.filter(r => {
    const s = search.trim();
    if (!s) return true;
    return r.claimNumber.includes(s) || r.claimId.includes(s) || r.policyId.includes(s);
  });

  const statusBadge = (s: string) => {
    const cfg: Record<string, { bg: string; text: string; icon: any }> = {
      registered: { bg: 'bg-brand-primary-subtle', text: 'text-brand-primary', icon: FileText },
      adjuster_review: { bg: 'bg-feedback-warning-subtle', text: 'text-feedback-warning', icon: Clock },
      assessed: { bg: 'bg-feedback-info-subtle', text: 'text-feedback-info', icon: ClipboardCheck },
      approved: { bg: 'bg-feedback-success-subtle', text: 'text-feedback-success', icon: CheckCircle },
      rejected: { bg: 'bg-feedback-error-subtle', text: 'text-feedback-error', icon: XCircle },
      paid: { bg: 'bg-feedback-success-subtle', text: 'text-feedback-success', icon: CheckCircle },
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
    <main className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">ارزیابان خسارت</h1>
            <p className="mt-1 text-sm text-text-muted">مدیریت ارجاع و بررسی خسارت‌ها توسط ارزیابان</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading} isLoading={loading}>
          <RefreshCw className="h-4 w-4 ml-1" />
          بروزرسانی
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="کل پرونده‌ها" value={rows.length} icon={FileText} />
        <StatCard title="در حال بررسی ارزیاب" value={rows.filter((r) => r.status === 'adjuster_review').length} changeType="warning" change="در انتظار" icon={Clock} />
        <StatCard title="بررسی‌شده" value={rows.filter((r) => r.status === 'assessed' || r.status === 'approved').length} changeType="positive" change="تکمیل" icon={CheckCircle} />
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Wrench className="h-4 w-4 text-brand-primary" />
          ارجاع به ارزیاب خسارت
        </div>
        <div className="flex flex-col gap-3 md:flex-row">
          <select value={selectedClaimId} onChange={e => setSelectedClaimId(e.target.value)} className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary flex-1">
            <option value="">انتخاب خسارت...</option>
            {rows.filter(r => r.status === 'registered').map(r => <option key={r.claimId} value={r.claimId}>{r.claimNumber} - {r.lossType}</option>)}
          </select>
          <input value={adjusterId} onChange={e => setAdjusterId(e.target.value)} placeholder="شناسه ارزیاب" className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary" />
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="دلیل ارجاع" className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary flex-1" />
          <Button onClick={referToAdjuster} disabled={!selectedClaimId || !adjusterId || !reason}>
            <Send className="h-4 w-4 ml-1" />
            ارجاع
          </Button>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو..." className="w-full rounded-xl border border-border-default bg-bg-raised pr-10 px-3 py-2 text-sm text-text-primary" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setTimeout(fetchData, 0); }} className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary">
          <option value="">همه وضعیت‌ها</option>
          <option value="registered">ثبت‌شده</option>
          <option value="adjuster_review">در حال بررسی ارزیاب</option>
          <option value="assessed">بررسی‌شده</option>
          <option value="approved">تأییدشده</option>
          <option value="rejected">ردشده</option>
          <option value="paid">پرداخت‌شده</option>
        </select>
      </div>

      {error && <div className="rounded-xl border border-feedback-error/30 bg-feedback-error-subtle p-3 text-sm text-feedback-error flex items-start gap-2"><AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />{error}</div>}

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-bg-base"><tr className="text-right"><th className="px-3 py-2 font-medium">شماره</th><th className="px-3 py-2 font-medium">نوع خسارت</th><th className="px-3 py-2 font-medium">وضعیت</th><th className="px-3 py-2 font-medium">مبلغ برآورد</th><th className="px-3 py-2 font-medium">ارجاع‌شده به</th><th className="px-3 py-2 font-medium">دلیل</th><th className="px-3 py-2 font-medium">تاریخ</th></tr></thead>
          <tbody>
            {loading ? (<tr><td colSpan={7} className="px-3 py-6 text-center text-text-muted">در حال بارگذاری...</td></tr>) : filteredRows.length === 0 ? (<tr><td colSpan={7} className="px-3 py-6 text-center text-text-muted">موردی یافت نشد</td></tr>) : filteredRows.map(r => (
              <tr key={r.claimId} className="border-t border-border-default">
                <td className="px-3 py-2 font-mono text-xs">{r.claimNumber}</td>
                <td className="px-3 py-2">{r.lossType}</td>
                <td className="px-3 py-2">{statusBadge(r.status)}</td>
                <td className="px-3 py-2">{r.assessedAmount !== null ? r.assessedAmount.toLocaleString() : '—'}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.adjusterId || '—'}</td>
                <td className="px-3 py-2 text-xs">{r.referralReason || '—'}</td>
                <td className="px-3 py-2 text-xs text-text-muted">{new Date(r.createdAt).toLocaleDateString('fa-IR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </main>
  );
}
