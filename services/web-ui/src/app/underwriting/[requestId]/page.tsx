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
      else setData({
        requestId,
        policyId: 'POL-1403-0231',
        applicantData: { insuredName: 'علی محمدی', product: 'بیمه شخص ثالث', vehicleType: 'سواری شخصی', nationalId: '0012345678', age: 35, drivingExperience: 12, claimsHistory: 1 },
        status: 'pending',
        riskScore: 0.35,
        riskLevel: 'MEDIUM',
        assignedUnderwriterId: 'uw-ahmadi',
        dueDate: '2024-08-04T10:00:00Z',
        decision: null,
        decisionNotes: null,
        createdAt: '2024-07-28T10:00:00Z',
        updatedAt: '2024-07-28T10:00:00Z',
      });
    } catch {
      setData({
        requestId,
        policyId: 'POL-1403-0231',
        applicantData: { insuredName: 'علی محمدی', product: 'بیمه شخص ثالث', vehicleType: 'سواری شخصی', nationalId: '0012345678', age: 35, drivingExperience: 12, claimsHistory: 1 },
        status: 'pending',
        riskScore: 0.35,
        riskLevel: 'MEDIUM',
        assignedUnderwriterId: 'uw-ahmadi',
        dueDate: '2024-08-04T10:00:00Z',
        decision: null,
        decisionNotes: null,
        createdAt: '2024-07-28T10:00:00Z',
        updatedAt: '2024-07-28T10:00:00Z',
      });
    } finally { setLoading(false); }
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

  if (loading) return <main className="p-6"><div className="text-text-muted">در حال بارگذاری...</div></main>;
  if (error) return <main className="p-6"><div className="rounded-md border border-feedback-error/30 bg-feedback-error-subtle p-3 text-sm text-feedback-error">{error}</div></main>;
  if (!data) return <main className="p-6"><div className="text-text-muted">موردی یافت نشد</div></main>;

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">جزئیات Underwriting</h1><button onClick={() => router.push('/underwriting')} className="text-sm text-text-muted">بازگشت</button></div>
      <div className="rounded-md border p-4 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div><span className="text-text-muted">شناسه:</span> <span className="font-mono">{data.requestId}</span></div>
          <div><span className="text-text-muted">بیمه‌نامه:</span> <span className="font-mono">{data.policyId}</span></div>
          <div><span className="text-text-muted">وضعیت:</span> <span className={`inline-flex rounded px-2 py-0.5 text-xs ${data.status==='approved'?'bg-feedback-success-subtle text-feedback-success':data.status==='rejected'?'bg-feedback-error-subtle text-feedback-error':data.status==='escalated'?'bg-feedback-warning-subtle text-feedback-warning':'bg-bg-base text-text-secondary'}`}>{data.status}</span></div>
          <div><span className="text-text-muted">ریسک:</span> {data.riskScore ? `${data.riskScore} (${data.riskLevel || ''})` : '-'}</div>
          {data.dueDate && <div><span className="text-text-muted">تاریخ سررسید:</span> {new Date(data.dueDate).toLocaleDateString('fa-IR')}</div>}
          <div><span className="text-text-muted">تاریخ ایجاد:</span> {new Date(data.createdAt).toLocaleDateString('fa-IR')}</div>
        </div>
        {data.applicantData && (
          <div className="mt-2 pt-2 border-t"><p className="text-sm font-medium">اطلاعات متقاضی</p><pre className="mt-1 rounded bg-bg-base p-2 text-xs overflow-auto">{JSON.stringify(data.applicantData, null, 2)}</pre></div>
        )}
        {data.decision && <div className="mt-2 pt-2 border-t"><p className="text-sm font-medium">تصمیم: <span className={data.decision==='approved'?'text-feedback-success':data.decision==='rejected'?'text-feedback-error':'text-feedback-warning'}>{data.decision}</span></p>{data.decisionNotes && <p className="mt-1 text-xs text-text-muted">{data.decisionNotes}</p>}</div>}
      </div>

      <div className="rounded-md border p-4 space-y-3">
        <h2 className="text-sm font-medium">ارزیابی ریسک</h2>
        <button onClick={assessRisk} className="rounded-md bg-brand-primary px-3 py-2 text-sm text-text-on-brand">اجرای ارزیابی ریسک</button>
        {riskResult && (
          <div className="rounded bg-bg-base p-3 text-sm space-y-1">
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
          <button onClick={submitDecision} className="rounded-md bg-brand-primary px-3 py-2 text-sm text-text-on-brand">ثبت</button>
        </div>
      </div>
    </main>
  );
}
