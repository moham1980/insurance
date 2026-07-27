'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';

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
      } else setError(json?.error?.message || 'خطا');
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

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Loss Adjuster</h1></div>
      <div className="rounded-md border p-4 space-y-3">
        <h2 className="text-sm font-medium">ارجاع به ارزیاب خسارت</h2>
        <div className="flex gap-3">
          <select value={selectedClaimId} onChange={e => setSelectedClaimId(e.target.value)} className="rounded-md border px-3 py-2 text-sm flex-1">
            <option value="">انتخاب خسارت...</option>
            {rows.filter(r => r.status === 'registered').map(r => <option key={r.claimId} value={r.claimId}>{r.claimNumber} - {r.lossType}</option>)}
          </select>
          <input value={adjusterId} onChange={e => setAdjusterId(e.target.value)} placeholder="شناسه ارزیاب" className="rounded-md border px-3 py-2 text-sm" />
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="دلیل ارجاع" className="rounded-md border px-3 py-2 text-sm flex-1" />
          <button onClick={referToAdjuster} className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white">ارجاع</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو..." className="rounded-md border px-3 py-2 text-sm" />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setTimeout(fetchData, 0); }} className="rounded-md border px-3 py-2 text-sm">
          <option value="">همه وضعیت‌ها</option>
          <option value="registered">Registered</option>
          <option value="adjuster_review">Adjuster Review</option>
          <option value="assessed">Assessed</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="paid">Paid</option>
        </select>
        <button onClick={fetchData} className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white">بروزرسانی</button>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50"><tr className="text-left"><th className="px-3 py-2 font-medium">شماره</th><th className="px-3 py-2 font-medium">نوع خسارت</th><th className="px-3 py-2 font-medium">وضعیت</th><th className="px-3 py-2 font-medium">مبلغ برآورد</th><th className="px-3 py-2 font-medium">ارجاع‌شده به</th><th className="px-3 py-2 font-medium">دلیل</th><th className="px-3 py-2 font-medium">تاریخ</th></tr></thead>
          <tbody>
            {loading ? (<tr><td colSpan={7} className="px-3 py-6 text-center text-neutral-500">در حال بارگذاری...</td></tr>) : filteredRows.length === 0 ? (<tr><td colSpan={7} className="px-3 py-6 text-center text-neutral-500">موردی یافت نشد</td></tr>) : filteredRows.map(r => (
              <tr key={r.claimId} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">{r.claimNumber}</td>
                <td className="px-3 py-2">{r.lossType}</td>
                <td className="px-3 py-2"><span className={`inline-flex rounded px-2 py-0.5 text-xs ${r.status==='approved'?'bg-green-100 text-green-700':r.status==='rejected'?'bg-red-100 text-red-700':r.status==='adjuster_review'?'bg-amber-100 text-amber-700':r.status==='paid'?'bg-blue-100 text-blue-700':'bg-slate-100 text-slate-700'}`}>{r.status}</span></td>
                <td className="px-3 py-2">{r.assessedAmount !== null ? r.assessedAmount.toLocaleString() : '-'}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.adjusterId || '-'}</td>
                <td className="px-3 py-2 text-xs">{r.referralReason || '-'}</td>
                <td className="px-3 py-2 text-xs text-neutral-500">{new Date(r.createdAt).toLocaleDateString('fa-IR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
