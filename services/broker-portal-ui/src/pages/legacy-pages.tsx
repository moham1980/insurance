import * as React from 'react';
import {
  ShieldAlert, FileText, CreditCard, Scale, RefreshCw,
  ChevronLeft, Check, X, AlertCircle, Loader2,
} from 'lucide-react';
import { brokerApi } from '../lib/api';
import {
  Loading, ErrorBanner, StatusBadge, Card,
} from '../components/ui';
import { PolicyTimeline, type TimelineEvent } from '@insurance/design-system';
import {
  mockClaims, mockPolicies, mockPayments, mockUnderwriting,
  mockCollectionsPlans, mockCollectionsInstallments, formatToman,
} from '../lib/mock-data';

export function ClaimsPage() {
  const [claims, setClaims] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [selectedClaim, setSelectedClaim] = React.useState<any>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  React.useEffect(() => {
    brokerApi.listClaims()
      .then(r => setClaims(r.data?.rows || r.data || []))
      .catch(() => { setClaims(mockClaims); })
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    try {
      await brokerApi.approveClaim(id, { approved: true });
      const r = await brokerApi.listClaims();
      setClaims(r.data?.rows || r.data || []);
      setSelectedClaim(null);
    } catch { setError('خطا در تأیید خسارت'); } finally { setActionLoading(false); }
  };

  const handleReject = async (id: string, reason: string) => {
    setActionLoading(true);
    try {
      await brokerApi.rejectClaim(id, { reason });
      const r = await brokerApi.listClaims();
      setClaims(r.data?.rows || r.data || []);
      setSelectedClaim(null);
    } catch { setError('خطا در رد خسارت'); } finally { setActionLoading(false); }
  };

  if (selectedClaim) {
    return (
      <div className="space-y-4" dir="rtl">
        <button onClick={() => setSelectedClaim(null)} className="flex items-center text-sm text-text-secondary hover:text-text-primary">
          <ChevronLeft className="h-4 w-4 ml-1" /> بازگشت
        </button>
        <ClaimDetail claim={selectedClaim} onApprove={handleApprove} onReject={handleReject} actionLoading={actionLoading} />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">خسارت‌ها</h1>
        <p className="mt-1 text-sm text-text-muted">مدیریت خسارت‌های ثبت شده</p>
      </div>
      {error && <ErrorBanner error={error} />}
      {loading ? <Loading /> : claims.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-2 border-dashed border-border-default bg-bg-subtle/50 py-16">
          <ShieldAlert className="h-10 w-10 text-text-muted" />
          <p className="mt-2 text-sm text-text-muted">خسارتی یافت نشد</p>
        </Card>
      ) : (
        <Card className="overflow-x-auto overflow-hidden">
          <table className="min-w-full divide-y divide-border-default">
            <thead className="bg-bg-subtle">
              <tr>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">شماره</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">مشتری</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">نوع</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">مبلغ</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">وضعیت</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">تاریخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle bg-bg-raised">
              {claims.map((c) => (
                <tr key={c.id} onClick={() => setSelectedClaim(c)} className="cursor-pointer transition-colors hover:bg-bg-subtle">
                  <td className="px-6 py-4 text-sm font-medium text-text-primary">{c.claimNumber || c.id}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{c.customerName || c.partyName || '-'}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{c.claimType || c.type || '-'}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{c.amount ? formatToman(Number(c.amount)) : '-'}</td>
                  <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                  <td className="px-6 py-4 text-sm text-text-muted">{c.createdAt || c.date || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function ClaimDetail({ claim, onApprove, onReject, actionLoading }: { claim: any; onApprove: (id: string) => void; onReject: (id: string, reason: string) => void; actionLoading: boolean }) {
  const [rejectReason, setRejectReason] = React.useState('');
  const [showReject, setShowReject] = React.useState(false);

  return (
    <div className="space-y-4" dir="rtl">
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-bold text-text-primary">جزئیات خسارت</h2>
        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div className="rounded-lg bg-bg-subtle px-3 py-2"><span className="text-text-muted">شماره:</span> <span className="font-medium text-text-primary">{claim.claimNumber || claim.id}</span></div>
          <div className="rounded-lg bg-bg-subtle px-3 py-2"><span className="text-text-muted">وضعیت:</span> <StatusBadge status={claim.status} /></div>
          <div className="rounded-lg bg-bg-subtle px-3 py-2"><span className="text-text-muted">نوع:</span> <span className="font-medium text-text-primary">{claim.claimType || claim.type || '-'}</span></div>
          <div className="rounded-lg bg-bg-subtle px-3 py-2"><span className="text-text-muted">مبلغ:</span> <span className="font-medium text-text-primary">{claim.amount ? formatToman(Number(claim.amount)) : '-'}</span></div>
          <div className="rounded-lg bg-bg-subtle px-3 py-2"><span className="text-text-muted">تاریخ:</span> <span className="font-medium text-text-primary">{claim.createdAt || claim.date || '-'}</span></div>
          <div className="rounded-lg bg-bg-subtle px-3 py-2"><span className="text-text-muted">شرح:</span> <span className="font-medium text-text-primary">{claim.description || '-'}</span></div>
        </div>
      </Card>
      {showReject ? (
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text-primary">دلیل رد</h3>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="w-full rounded-lg border border-border-default p-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20" rows={3} />
          <div className="flex gap-2">
            <button onClick={() => setShowReject(false)} className="rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-subtle">انصراف</button>
            <button onClick={() => onReject(claim.id, rejectReason)} disabled={actionLoading || !rejectReason} className="rounded-lg bg-feedback-error px-3 py-1.5 text-sm text-text-on-brand disabled:opacity-50 hover:opacity-90">
              {actionLoading ? 'در حال...' : 'رد خسارت'}
            </button>
          </div>
        </Card>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => onApprove(claim.id)} disabled={actionLoading} className="flex items-center gap-1 rounded-lg bg-feedback-success px-4 py-2 text-sm text-text-on-brand hover:opacity-90 disabled:opacity-50">
            <Check className="h-4 w-4" /> {actionLoading ? 'در حال...' : 'تأیید خسارت'}
          </button>
          <button onClick={() => setShowReject(true)} disabled={actionLoading} className="flex items-center gap-1 rounded-lg bg-feedback-error px-4 py-2 text-sm text-text-on-brand hover:opacity-90 disabled:opacity-50">
            <X className="h-4 w-4" /> رد خسارت
          </button>
        </div>
      )}
    </div>
  );
}

export function PoliciesPage() {
  const [policies, setPolicies] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [selectedPolicy, setSelectedPolicy] = React.useState<any>(null);
  const [endorsements, setEndorsements] = React.useState<any[]>([]);

  React.useEffect(() => {
    brokerApi.listPolicies()
      .then(r => setPolicies(r.data?.rows || r.data || []))
      .catch(() => { setPolicies(mockPolicies); })
      .finally(() => setLoading(false));
  }, []);

  const handleSelectPolicy = async (p: any) => {
    setSelectedPolicy(p);
    try {
      const r = await brokerApi.listPolicyEndorsements(p.id);
      setEndorsements(r.data?.rows || r.data || []);
    } catch { setEndorsements([]); }
  };

  if (selectedPolicy) {
    return (
      <div className="space-y-4" dir="rtl">
        <button onClick={() => setSelectedPolicy(null)} className="flex items-center text-sm text-text-secondary hover:text-text-primary">
          <ChevronLeft className="h-4 w-4 ml-1" /> بازگشت
        </button>
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-bold text-text-primary">جزئیات بیمه‌نامه</h2>
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div className="rounded-lg bg-bg-subtle px-3 py-2"><span className="text-text-muted">شماره:</span> <span className="font-medium text-text-primary">{selectedPolicy.policyNumber || selectedPolicy.id}</span></div>
            <div className="rounded-lg bg-bg-subtle px-3 py-2"><span className="text-text-muted">وضعیت:</span> <StatusBadge status={selectedPolicy.status} /></div>
            <div className="rounded-lg bg-bg-subtle px-3 py-2"><span className="text-text-muted">محصول:</span> <span className="font-medium text-text-primary">{selectedPolicy.product || selectedPolicy.type || '-'}</span></div>
            <div className="rounded-lg bg-bg-subtle px-3 py-2"><span className="text-text-muted">حق بیمه:</span> <span className="font-medium text-text-primary">{selectedPolicy.premium ? formatToman(Number(selectedPolicy.premium)) : '-'}</span></div>
            <div className="rounded-lg bg-bg-subtle px-3 py-2"><span className="text-text-muted">شروع:</span> <span className="font-medium text-text-primary">{selectedPolicy.startDate || '-'}</span></div>
            <div className="rounded-lg bg-bg-subtle px-3 py-2"><span className="text-text-muted">پایان:</span> <span className="font-medium text-text-primary">{selectedPolicy.endDate || '-'}</span></div>
          </div>
        </Card>
        {endorsements.length > 0 && (
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-text-primary">الحاقیه‌ها</h3>
            <div className="space-y-2">
              {endorsements.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg border border-border-subtle px-3 py-2">
                  <span className="text-sm text-text-primary">{e.endorsementType || e.type || '-'}</span>
                  <StatusBadge status={e.status} />
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-6">
          <h3 className="mb-4 text-sm font-semibold text-text-primary">چرخه عمر بیمه‌نامه</h3>
          <PolicyTimeline events={[
            { id: 'ev-1', title: 'صدور بیمه‌نامه', description: `بیمه‌نامه ${selectedPolicy.policyNumber || selectedPolicy.id} صادر شد`, timestamp: selectedPolicy.startDate || '2024-01-01', status: 'completed', actor: 'سیستم صدور' },
            { id: 'ev-2', title: 'تأیید بیمه‌گر', description: `تأیید توسط ${selectedPolicy.carrierName || 'بیمه‌گر'}`, timestamp: selectedPolicy.startDate || '2024-01-01', status: 'completed', actor: selectedPolicy.carrierName || 'بیمه‌گر' },
            { id: 'ev-3', title: 'فعالیت جاری', description: 'بیمه‌نامه در حال اجرا', status: 'current', timestamp: new Date().toISOString() },
            ...(selectedPolicy.status === 'منقضی' ? [{ id: 'ev-4', title: 'اتمام دوره', description: 'بیمه‌نامه منقضی شد', timestamp: selectedPolicy.endDate, status: 'warn' as const }] : []),
            ...(selectedPolicy.status === 'لغو شده' ? [{ id: 'ev-4', title: 'لغو بیمه‌نامه', description: 'بیمه‌نامه لغو شد', status: 'failed' as const }] : []),
            { id: 'ev-5', title: 'اتمام دوره بیمه', timestamp: selectedPolicy.endDate || '2025-01-01', status: selectedPolicy.status === 'منقضی' ? 'completed' as const : 'pending' as const },
          ]} />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">بیمه‌نامه‌ها</h1>
        <p className="mt-1 text-sm text-text-muted">لیست بیمه‌نامه‌های صادر شده</p>
      </div>
      {error && <ErrorBanner error={error} />}
      {loading ? <Loading /> : policies.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-2 border-dashed border-border-default bg-bg-subtle/50 py-16">
          <FileText className="h-10 w-10 text-text-muted" />
          <p className="mt-2 text-sm text-text-muted">بیمه‌نامه‌ای یافت نشد</p>
        </Card>
      ) : (
        <Card className="overflow-x-auto overflow-hidden">
          <table className="min-w-full divide-y divide-border-default">
            <thead className="bg-bg-subtle">
              <tr>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">شماره</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">مشتری</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">نوع</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">حق بیمه</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">وضعیت</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">پایان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle bg-bg-raised">
              {policies.map((p) => (
                <tr key={p.id} onClick={() => handleSelectPolicy(p)} className="cursor-pointer transition-colors hover:bg-bg-subtle">
                  <td className="px-6 py-4 text-sm font-medium text-text-primary">{p.policyNumber || p.id}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{p.customerName || '-'}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{p.product || p.type || '-'}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{p.premium ? formatToman(Number(p.premium)) : '-'}</td>
                  <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                  <td className="px-6 py-4 text-sm text-text-muted">{p.endDate || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

export function PaymentsPage() {
  const [payments, setPayments] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');

  React.useEffect(() => {
    brokerApi.listPayments(statusFilter ? { status: statusFilter } : undefined)
      .then(r => setPayments(r.data?.rows || r.data || []))
      .catch(() => { setPayments(mockPayments); })
      .finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">پرداخت‌ها</h1>
          <p className="mt-1 text-sm text-text-muted">مدیریت پرداخت‌های بیمه‌ای</p>
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20">
          <option value="">همه</option>
          <option value="paid">پرداخت شده</option>
          <option value="pending">در انتظار</option>
          <option value="overdue">سررسید گذشته</option>
        </select>
      </div>
      {error && <ErrorBanner error={error} />}
      {loading ? <Loading /> : payments.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-2 border-dashed border-border-default bg-bg-subtle/50 py-16">
          <CreditCard className="h-10 w-10 text-text-muted" />
          <p className="mt-2 text-sm text-text-muted">پرداختی یافت نشد</p>
        </Card>
      ) : (
        <Card className="overflow-x-auto overflow-hidden">
          <table className="min-w-full divide-y divide-border-default">
            <thead className="bg-bg-subtle">
              <tr>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">شناسه</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">بیمه‌نامه</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">مشتری</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">مبلغ</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">روش</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">وضعیت</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">تاریخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle bg-bg-raised">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-4 text-sm font-medium text-text-primary">{p.id}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{p.policyId || p.policyNumber || '-'}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{p.customerName || '-'}</td>
                  <td className="px-6 py-4 text-sm font-medium text-text-primary">{p.amount ? formatToman(Number(p.amount)) : '-'}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{p.method || '-'}</td>
                  <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                  <td className="px-6 py-4 text-sm text-text-muted">{p.dueDate || p.date || p.createdAt || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

export function UnderwritingPage() {
  const [requests, setRequests] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [selected, setSelected] = React.useState<any>(null);
  const [appealReason, setAppealReason] = React.useState('');
  const [actionLoading, setActionLoading] = React.useState(false);

  React.useEffect(() => {
    brokerApi.listUnderwriting()
      .then(r => setRequests(r.data?.rows || r.data || []))
      .catch(() => { setRequests(mockUnderwriting); })
      .finally(() => setLoading(false));
  }, []);

  const handleAppeal = async () => {
    if (!selected || !appealReason) return;
    setActionLoading(true);
    try {
      await brokerApi.appealUnderwriting(selected.id, appealReason);
      const r = await brokerApi.listUnderwriting();
      setRequests(r.data?.rows || r.data || []);
      setSelected(null);
      setAppealReason('');
    } catch { setError('خطا در ثبت درخواست تجدید نظر'); } finally { setActionLoading(false); }
  };

  if (selected) {
    return (
      <div className="space-y-4" dir="rtl">
        <button onClick={() => setSelected(null)} className="flex items-center text-sm text-text-secondary hover:text-text-primary">
          <ChevronLeft className="h-4 w-4 ml-1" /> بازگشت
        </button>
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-bold text-text-primary">جزئیات درخواست بیمه‌نامه‌گذاری</h2>
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div className="rounded-lg bg-bg-subtle px-3 py-2"><span className="text-text-muted">شناسه:</span> <span className="font-medium text-text-primary">{selected.id}</span></div>
            <div className="rounded-lg bg-bg-subtle px-3 py-2"><span className="text-text-muted">وضعیت:</span> <StatusBadge status={selected.status} /></div>
            <div className="rounded-lg bg-bg-subtle px-3 py-2"><span className="text-text-muted">بیمه‌نامه:</span> <span className="font-medium text-text-primary">{selected.policyId || '-'}</span></div>
            <div className="rounded-lg bg-bg-subtle px-3 py-2"><span className="text-text-muted">مشتری:</span> <span className="font-medium text-text-primary">{selected.customerName || '-'}</span></div>
            <div className="rounded-lg bg-bg-subtle px-3 py-2"><span className="text-text-muted">بیمه‌گر:</span> <span className="font-medium text-text-primary">{selected.carrierName || '-'}</span></div>
            <div className="rounded-lg bg-bg-subtle px-3 py-2"><span className="text-text-muted">نوع محصول:</span> <span className="font-medium text-text-primary">{selected.productType || '-'}</span></div>
            <div className="rounded-lg bg-bg-subtle px-3 py-2"><span className="text-text-muted">حق بیمه:</span> <span className="font-medium text-text-primary">{selected.premium ? formatToman(Number(selected.premium)) : '-'}</span></div>
            <div className="rounded-lg bg-bg-subtle px-3 py-2"><span className="text-text-muted">تصمیم:</span> <span className="font-medium text-text-primary">{selected.decision || '-'}</span></div>
          </div>
          {selected.reason && (
            <div className="mt-3 rounded-lg border border-border-subtle bg-bg-subtle px-4 py-3">
              <span className="text-xs font-semibold text-text-muted">علت:</span>
              <p className="mt-1 text-sm text-text-secondary">{selected.reason}</p>
            </div>
          )}
        </Card>
        {selected.status?.includes('رد') && (
          <Card className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">درخواست تجدید نظر</h3>
            <textarea value={appealReason} onChange={e => setAppealReason(e.target.value)} className="w-full rounded-lg border border-border-default p-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20" rows={3} placeholder="دلیل تجدید نظر..." />
            <button onClick={handleAppeal} disabled={actionLoading || !appealReason} className="rounded-lg bg-brand-primary px-4 py-2 text-sm text-text-on-brand disabled:opacity-50 hover:opacity-90">
              {actionLoading ? 'در حال...' : 'ثبت درخواست'}
            </button>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">بیمه‌نامه‌گذاری</h1>
        <p className="mt-1 text-sm text-text-muted">درخواست‌های بیمه‌نامه‌گذاری و تجدید نظر</p>
      </div>
      {error && <ErrorBanner error={error} />}
      {loading ? <Loading /> : requests.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-2 border-dashed border-border-default bg-bg-subtle/50 py-16">
          <Scale className="h-10 w-10 text-text-muted" />
          <p className="mt-2 text-sm text-text-muted">درخواستی یافت نشد</p>
        </Card>
      ) : (
        <Card className="overflow-x-auto overflow-hidden">
          <table className="min-w-full divide-y divide-border-default">
            <thead className="bg-bg-subtle">
              <tr>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">شناسه</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">مشتری</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">بیمه‌گر</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">نوع</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">حق بیمه</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">وضعیت</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">تصمیم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle bg-bg-raised">
              {requests.map((r) => (
                <tr key={r.id} onClick={() => setSelected(r)} className="cursor-pointer transition-colors hover:bg-bg-subtle">
                  <td className="px-6 py-4 text-sm font-medium text-text-primary">{r.id}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{r.customerName || '-'}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{r.carrierName || '-'}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{r.productType || '-'}</td>
                  <td className="px-6 py-4 text-sm font-medium text-text-primary">{r.premium ? formatToman(Number(r.premium)) : '-'}</td>
                  <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{r.decision || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

export function CollectionsPage() {
  const [plans, setPlans] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [selectedPlan, setSelectedPlan] = React.useState<any>(null);
  const [installments, setInstallments] = React.useState<any[]>([]);

  React.useEffect(() => {
    brokerApi.listCollectionsPlans()
      .then(r => setPlans(r.data?.rows || r.data || []))
      .catch(() => { setPlans(mockCollectionsPlans); })
      .finally(() => setLoading(false));
  }, []);

  const handleSelectPlan = async (p: any) => {
    setSelectedPlan(p);
    try {
      const r = await brokerApi.listCollectionsInstallments(p.id);
      setInstallments(r.data?.rows || r.data || []);
    } catch { setInstallments(mockCollectionsInstallments[p.id] || []); }
  };

  if (selectedPlan) {
    return (
      <div className="space-y-4" dir="rtl">
        <button onClick={() => setSelectedPlan(null)} className="flex items-center text-sm text-text-secondary hover:text-text-primary">
          <ChevronLeft className="h-4 w-4 ml-1" /> بازگشت
        </button>
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-bold text-text-primary">جزئیات طرح وصول</h2>
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div className="rounded-lg bg-bg-subtle px-3 py-2"><span className="text-text-muted">شناسه:</span> <span className="font-medium text-text-primary">{selectedPlan.id}</span></div>
            <div className="rounded-lg bg-bg-subtle px-3 py-2"><span className="text-text-muted">بیمه‌نامه:</span> <span className="font-medium text-text-primary">{selectedPlan.policyId || '-'}</span></div>
            <div className="rounded-lg bg-bg-subtle px-3 py-2"><span className="text-text-muted">مشتری:</span> <span className="font-medium text-text-primary">{selectedPlan.customerName || '-'}</span></div>
            <div className="rounded-lg bg-bg-subtle px-3 py-2"><span className="text-text-muted">وضعیت:</span> <StatusBadge status={selectedPlan.status} /></div>
            <div className="rounded-lg bg-bg-subtle px-3 py-2"><span className="text-text-muted">مبلغ کل:</span> <span className="font-medium text-text-primary">{selectedPlan.totalAmount ? formatToman(Number(selectedPlan.totalAmount)) : '-'}</span></div>
            <div className="rounded-lg bg-bg-subtle px-3 py-2"><span className="text-text-muted">پرداخت شده:</span> <span className="font-medium text-feedback-success">{selectedPlan.paidAmount ? formatToman(Number(selectedPlan.paidAmount)) : '-'}</span></div>
            <div className="rounded-lg bg-bg-subtle px-3 py-2"><span className="text-text-muted">باقی‌مانده:</span> <span className="font-medium text-feedback-warning">{selectedPlan.remainingAmount ? formatToman(Number(selectedPlan.remainingAmount)) : '-'}</span></div>
            <div className="rounded-lg bg-bg-subtle px-3 py-2"><span className="text-text-muted">اقساط:</span> <span className="font-medium text-text-primary">{selectedPlan.paidCount || 0} / {selectedPlan.installmentCount || 0}</span></div>
          </div>
          {selectedPlan.nextDueDate && selectedPlan.nextDueDate !== '—' && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-feedback-warning/30 bg-feedback-warning-subtle px-4 py-2 text-sm text-feedback-warning">
              <RefreshCw className="h-4 w-4" />
              <span>اقساط بعدی سررسید: {selectedPlan.nextDueDate}</span>
            </div>
          )}
        </Card>
        {installments.length > 0 && (
          <Card className="overflow-hidden">
            <div className="border-b border-border-default bg-bg-subtle px-6 py-3">
              <h3 className="text-sm font-semibold text-text-primary">اقساط</h3>
            </div>
            <table className="min-w-full divide-y divide-border-default">
              <thead className="bg-bg-subtle">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">قسط</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">مبلغ</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">سررسید</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-bg-raised">
                {installments.map((inst, idx) => (
                  <tr key={inst.id || idx}>
                    <td className="px-6 py-4 text-sm font-medium text-text-primary">{inst.installmentNumber || idx + 1}</td>
                    <td className="px-6 py-4 text-sm text-text-secondary">{inst.amount ? formatToman(Number(inst.amount)) : '-'}</td>
                    <td className="px-6 py-4 text-sm text-text-muted">{inst.dueDate || '-'}</td>
                    <td className="px-6 py-4"><StatusBadge status={inst.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">وصول مطالبات</h1>
        <p className="mt-1 text-sm text-text-muted">طرح‌های وصول اقساط بیمه‌ای</p>
      </div>
      {error && <ErrorBanner error={error} />}
      {loading ? <Loading /> : plans.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-2 border-dashed border-border-default bg-bg-subtle/50 py-16">
          <RefreshCw className="h-10 w-10 text-text-muted" />
          <p className="mt-2 text-sm text-text-muted">طرح وصولی یافت نشد</p>
        </Card>
      ) : (
        <Card className="overflow-x-auto overflow-hidden">
          <table className="min-w-full divide-y divide-border-default">
            <thead className="bg-bg-subtle">
              <tr>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">شناسه</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">مشتری</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">بیمه‌نامه</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">مبلغ کل</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">پرداخت شده</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">باقی‌مانده</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">اقساط</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle bg-bg-raised">
              {plans.map((p) => (
                <tr key={p.id} onClick={() => handleSelectPlan(p)} className="cursor-pointer transition-colors hover:bg-bg-subtle">
                  <td className="px-6 py-4 text-sm font-medium text-text-primary">{p.id}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{p.customerName || '-'}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{p.policyId || '-'}</td>
                  <td className="px-6 py-4 text-sm font-medium text-text-primary">{p.totalAmount ? formatToman(Number(p.totalAmount)) : '-'}</td>
                  <td className="px-6 py-4 text-sm text-feedback-success">{p.paidAmount ? formatToman(Number(p.paidAmount)) : '-'}</td>
                  <td className="px-6 py-4 text-sm text-feedback-warning">{p.remainingAmount ? formatToman(Number(p.remainingAmount)) : '-'}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{p.paidCount || 0} / {p.installmentCount || 0}</td>
                  <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

export function RegulatoryPage() {
  const [tab, setTab] = React.useState<'license' | 'sanhab' | 'warehouse'>('license');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [result, setResult] = React.useState<any>(null);
  const [licenseData, setLicenseData] = React.useState({ brokerCentralCode: '', licenseNumber: '' });
  const [sanhabData, setSanhabData] = React.useState({ nationalId: '', inquiryType: '' });
  const [warehouseData, setWarehouseData] = React.useState({ nationalId: '', licenseNumber: '', warehouseId: '' });

  const handleValidateLicense = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await brokerApi.validateBrokerLicense(licenseData);
      setResult(r.data);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const handleSanhabInquiry = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await brokerApi.sanhabInquiry(sanhabData);
      setResult(r.data);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const handleWarehouseInquiry = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await brokerApi.warehouseFireInquiry(warehouseData);
      setResult(r.data);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">امور نظارتی</h1>
        <p className="mt-1 text-sm text-text-muted">اعتبارسنجی و استعلامات نظارتی</p>
      </div>
      <div className="flex gap-1 border-b border-border-default">
        {[
          { key: 'license' as const, label: 'اعتبارسنجی پروانه' },
          { key: 'sanhab' as const, label: 'استعلام سنهاب' },
          { key: 'warehouse' as const, label: 'استعلام آتش‌سوزی انبار' },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setResult(null); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-brand-primary text-brand-primary' : 'border-transparent text-text-muted hover:text-text-primary'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <ErrorBanner error={error} />}

      {tab === 'license' && (
        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">کد مرکزی کارگزاری</label>
              <input value={licenseData.brokerCentralCode} onChange={e => setLicenseData({ ...licenseData, brokerCentralCode: e.target.value })}
                className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">شماره پروانه</label>
              <input value={licenseData.licenseNumber} onChange={e => setLicenseData({ ...licenseData, licenseNumber: e.target.value })}
                className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
            </div>
          </div>
          <button onClick={handleValidateLicense} disabled={loading} className="rounded-lg bg-brand-primary px-4 py-2 text-sm text-text-on-brand disabled:opacity-50 hover:opacity-90">
            {loading ? 'در حال...' : 'اعتبارسنجی'}
          </button>
        </Card>
      )}

      {tab === 'sanhab' && (
        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">کد ملی</label>
              <input value={sanhabData.nationalId} onChange={e => setSanhabData({ ...sanhabData, nationalId: e.target.value })}
                className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">نوع استعلام</label>
              <select value={sanhabData.inquiryType} onChange={e => setSanhabData({ ...sanhabData, inquiryType: e.target.value })}
                className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20">
                <option value="">انتخاب...</option>
                <option value="CLAIM_HISTORY">تاریخچه خسارت</option>
                <option value="POLICY_STATUS">وضعیت بیمه‌نامه</option>
              </select>
            </div>
          </div>
          <button onClick={handleSanhabInquiry} disabled={loading} className="rounded-lg bg-brand-primary px-4 py-2 text-sm text-text-on-brand disabled:opacity-50 hover:opacity-90">
            {loading ? 'در حال...' : 'استعلام'}
          </button>
        </Card>
      )}

      {tab === 'warehouse' && (
        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">کد ملی</label>
              <input value={warehouseData.nationalId} onChange={e => setWarehouseData({ ...warehouseData, nationalId: e.target.value })}
                className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">شماره پروانه</label>
              <input value={warehouseData.licenseNumber} onChange={e => setWarehouseData({ ...warehouseData, licenseNumber: e.target.value })}
                className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">شناسه انبار</label>
              <input value={warehouseData.warehouseId} onChange={e => setWarehouseData({ ...warehouseData, warehouseId: e.target.value })}
                className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
            </div>
          </div>
          <button onClick={handleWarehouseInquiry} disabled={loading} className="rounded-lg bg-brand-primary px-4 py-2 text-sm text-text-on-brand disabled:opacity-50 hover:opacity-90">
            {loading ? 'در حال...' : 'استعلام'}
          </button>
        </Card>
      )}

      {result && (
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold text-text-primary">نتیجه</h3>
          <pre className="max-h-96 overflow-auto rounded-lg bg-bg-subtle p-3 text-xs">{JSON.stringify(result, null, 2)}</pre>
        </Card>
      )}
    </div>
  );
}
