'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch, getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';

type RequestDetail = {
  requestId: string;
  policyId: string;
  applicantData: Record<string, any>;
  status: string;
  riskScore?: number | null;
  riskLevel?: string | null;
  assignedUnderwriterId?: string | null;
  dueDate?: string | null;
  decision?: string | null;
  decisionNotes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function UnderwritingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const requestId = params?.requestId as string;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RequestDetail | null>(null);
  const [riskResult, setRiskResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const authUser = getAuthUser();
    if (!authUser) { router.push('/login'); return; }
    fetchDetail();
  }, [router, requestId]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const json: any = await apiFetch(`/underwriting/requests/${requestId}`);
      if (json?.success) setData(json.data);
      else setError(json?.error?.message || 'خطا');
    } catch (e: any) { setError(e?.message || 'خطا'); }
    finally { setLoading(false); }
  };

  const assessRisk = async () => {
    try {
      const json: any = await apiFetch(`/underwriting/requests/${requestId}/assess-risk`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ factors: data?.applicantData || {} }),
      });
      if (json?.success) { setRiskResult(json.data); await fetchDetail(); }
      else alert(json?.error?.message || 'خطا در ارزیابی');
    } catch (e: any) { alert(e?.message || 'خطا'); }
  };

  const submitDecision = async () => {
    if (!decision) { alert('لطفاً تصمیم را انتخاب کنید'); return; }
    try {
      const json: any = await apiFetch(`/underwriting/requests/${requestId}/decide`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ decision, notes }),
      });
      if (json?.success) { setDecision(''); setNotes(''); await fetchDetail(); }
      else alert(json?.error?.message || 'خطا');
    } catch (e: any) { alert(e?.message || 'خطا'); }
  };

  if (loading) return <main className="p-6"><div className="text-neutral-500">در حال بارگذاری...</div></main>;
  if (error) return <main className="p-6"><div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div></main>;
  if (!data) return <main className="p-6"><div className="text-neutral-500">موردی یافت نشد</div></main>;

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">جزئیات Underwriting</h1><button onClick={() => router.push('/underwriting')} className="text-sm text-neutral-600">بازگشت</button></div>
      <div className="rounded-md border p-4 space-y-2">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-neutral-500">شناسه:</span> <span className="font-mono">{data.requestId}</span></div>
          <div><span className="text-neutral-500">بیمه‌نامه:</span> <span className="font-mono">{data.policyId}</span></div>
          <div><span className="text-neutral-500">وضعیت:</span> <span className={`inline-flex rounded px-2 py-0.5 text-xs ${data.status==='approved'?'bg-green-100 text-green-700':data.status==='rejected'?'bg-red-100 text-red-700':data.status==='escalated'?'bg-amber-100 text-amber-700':'bg-slate-100 text-slate-700'}`}>{data.status}</span></div>
          <div><span className="text-neutral-500">ریسک:</span> {data.riskScore ? `${data.riskScore} (${data.riskLevel || ''})` : '-'}</div>
          {data.dueDate && <div><span className="text-neutral-500">تاریخ سررسید:</span> {new Date(data.dueDate).toLocaleDateString('fa-IR')}</div>}
          <div><span className="text-neutral-500">تاریخ ایجاد:</span> {new Date(data.createdAt).toLocaleDateString('fa-IR')}</div>
        </div>
        {data.applicantData && (
          <div className="mt-2 pt-2 border-t"><p className="text-sm font-medium">اطلاعات متقاضی</p><pre className="mt-1 rounded bg-neutral-50 p-2 text-xs overflow-auto">{JSON.stringify(data.applicantData, null, 2)}</pre></div>
        )}
        {data.decision && <div className="mt-2 pt-2 border-t"><p className="text-sm font-medium">تصمیم: <span className={data.decision==='approved'?'text-green-600':data.decision==='rejected'?'text-red-600':'text-amber-600'}>{data.decision}</span></p>{data.decisionNotes && <p className="mt-1 text-xs text-neutral-600">{data.decisionNotes}</p>}</div>}
      </div>

      <div className="rounded-md border p-4 space-y-3">
        <h2 className="text-sm font-medium">ارزیابی ریسک</h2>
        <button onClick={assessRisk} className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white">اجرای ارزیابی ریسک</button>
        {riskResult && (
          <div className="rounded bg-neutral-50 p-3 text-sm space-y-1">
            <p>امتیاز: <strong>{riskResult.riskScore}</strong> | سطح: <strong>{riskResult.riskLevel}</strong></p>
            {riskResult.recommendations && <p>توصیه‌ها: {riskResult.recommendations.join(', ')}</p>}
          </div>
        )}
      </div>

      <div className="rounded-md border p-4 space-y-3">
        <h2 className="text-sm font-medium">ثبت تصمیم</h2>
        <div className="flex gap-3">
          <select value={decision} onChange={e => setDecision(e.target.value)} className="rounded-md border px-3 py-2 text-sm">
            <option value="">انتخاب تصمیم...</option>
            <option value="approved">تأیید</option>
            <option value="rejected">رد</option>
            <option value="escalated">ارجاع</option>
          </select>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="یادداشت..." className="flex-1 rounded-md border px-3 py-2 text-sm" />
          <button onClick={submitDecision} className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white">ثبت</button>
        </div>
      </div>
    </main>
  );
}
