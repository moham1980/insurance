import * as React from 'react';
import {
  ClipboardList, Gavel, UserCheck, RefreshCw,
  ChevronLeft, FileText, Phone,
} from 'lucide-react';
import {
  Loading, ErrorBanner, EmptyState, StatusBadge,
  PageHeader, Table, TableRow, TableCell, Card, Button,
} from './ui';
import {
  mockClaims, mockAdvocacy, mockAdjusterReferrals, mockRecovery, formatToman,
} from '../lib/mock-data';
import { agentPortalAPI } from '../lib/api';

export function AgentClaimsPage() {
  const [claims, setClaims] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<any>(null);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');

  React.useEffect(() => {
    agentPortalAPI.getClaims()
      .then(data => setClaims(Array.isArray(data) ? data : []))
      .catch(() => { setClaims(mockClaims); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = claims.filter(c => {
    if (search) {
      const s = search.trim();
      if (!c.claimNumber?.includes(s) && !c.customerName?.includes(s) && !c.policyNumber?.includes(s)) return false;
    }
    if (statusFilter && c.status !== statusFilter) return false;
    return true;
  });

  if (loading) return <div className="space-y-4" dir="rtl"><PageHeader title="خسارت‌ها" subtitle="مدیریت خسارت‌های ثبت شده" /><Loading /></div>;

  return (
    <div className="space-y-4" dir="rtl">
      <PageHeader title="خسارت‌ها" subtitle="مدیریت خسارت‌های ثبت شده — نمای split-view" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-3"><p className="text-xs text-text-muted">کل</p><p className="mt-1 text-lg font-bold text-text-primary">{claims.length}</p></Card>
        <Card className="p-3"><p className="text-xs text-brand-primary">در حال بررسی</p><p className="mt-1 text-lg font-bold text-brand-primary">{claims.filter(c => c.status === 'در حال بررسی').length}</p></Card>
        <Card className="p-3"><p className="text-xs text-feedback-success">تأیید شده</p><p className="mt-1 text-lg font-bold text-feedback-success">{claims.filter(c => c.status === 'تأیید شده').length}</p></Card>
        <Card className="p-3"><p className="text-xs text-feedback-error">رد شده</p><p className="mt-1 text-lg font-bold text-feedback-error">{claims.filter(c => c.status === 'رد شده').length}</p></Card>
      </div>

      {/* Split View */}
      <Card className="flex gap-4 overflow-hidden" style={{ minHeight: '500px' }}>
        {/* Left: List */}
        <div className="flex w-1/2 flex-col border-l border-border-default">
          <div className="border-b border-border-default p-3 space-y-2">
            <div className="flex gap-2">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="جستجو..."
                className="flex-1 rounded-lg border border-border-default px-3 py-1.5 text-sm focus:border-brand-primary focus:outline-none"
              />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-lg border border-border-default px-2 py-1.5 text-sm">
                <option value="">همه</option>
                <option value="در حال بررسی">در حال بررسی</option>
                <option value="تأیید شده">تأیید شده</option>
                <option value="رد شده">رد شده</option>
              </select>
            </div>
            <div className="text-xs text-text-muted">{filtered.length} خسارت</div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-text-muted">موردی یافت نشد</div>
            ) : (
              filtered.map(c => {
                const isSelected = selected?.id === c.id;
                const statusColors: Record<string, string> = {
                  'در حال بررسی': 'bg-brand-primary-subtle text-brand-primary border-brand-primary/30',
                  'تأیید شده': 'bg-feedback-success-subtle text-feedback-success border-feedback-success/30',
                  'رد شده': 'bg-feedback-error-subtle text-feedback-error border-feedback-error/30',
                };
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className={`flex w-full flex-col gap-1.5 border-b border-border-default p-3 text-right transition-colors ${isSelected ? 'bg-brand-primary-subtle' : 'hover:bg-bg-base'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-text-primary">{c.claimNumber}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusColors[c.status] || 'bg-bg-base text-text-secondary'}`}>{c.status}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted">{c.customerName}</span>
                      <span className="text-text-muted">{c.claimType}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted">{c.policyNumber}</span>
                      <span className="font-medium text-text-secondary">{formatToman(c.amount)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Detail */}
        <div className="flex w-1/2 flex-col bg-bg-base">
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center text-text-muted">
              <ClipboardList className="mb-2 h-10 w-10 opacity-30" />
              <p className="text-sm">یک خسارت را انتخاب کنید</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-text-primary">{selected.claimNumber}</h2>
                <StatusBadge status={selected.status} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Card className="p-3">
                  <p className="text-xs text-text-muted">مشتری</p>
                  <p className="text-sm font-medium text-text-primary">{selected.customerName}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-text-muted">بیمه‌نامه</p>
                  <p className="text-sm font-medium text-text-primary">{selected.policyNumber}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-text-muted">نوع خسارت</p>
                  <p className="text-sm font-medium text-text-primary">{selected.claimType}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-text-muted">مبلغ</p>
                  <p className="text-sm font-bold text-text-primary">{formatToman(selected.amount)}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-text-muted">تاریخ</p>
                  <p className="text-sm text-text-primary">{selected.date}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-text-muted">شرح</p>
                  <p className="text-sm text-text-secondary">{selected.description || '—'}</p>
                </Card>
              </div>
              {/* Timeline */}
              <Card className="p-4">
                <h3 className="mb-3 text-sm font-semibold text-text-primary">مراحل پیگیری</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-feedback-success text-text-on-brand">✓</div>
                    <span className="text-text-secondary">ثبت خسارت</span>
                    <span className="mr-auto text-text-muted">{selected.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-text-on-brand">●</div>
                    <span className="text-text-secondary">ارسال به بیمه‌گر</span>
                    <span className="mr-auto text-text-muted">در انتظار</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-bg-base text-text-muted">○</div>
                    <span className="text-text-muted">بررسی و پرداخت</span>
                  </div>
                </div>
              </Card>
              <div className="flex gap-2">
                <Button>پیگیری با بیمه‌گر</Button>
                <Button variant="secondary">ارسال به کارشناس</Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export function AgentAdvocacyPage() {
  const [cases, setCases] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    agentPortalAPI.getClaims()
      .then(async (claimsData) => {
        const claims = Array.isArray(claimsData) ? claimsData : [];
        const advocacyCases = await Promise.all(
          claims.slice(0, 10).map(c => agentPortalAPI.getClaimAdvocacy(c.id || c.claimId).catch(() => null))
        );
        setCases(advocacyCases.filter(Boolean) || mockAdvocacy);
      })
      .catch(() => { setCases(mockAdvocacy); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-4" dir="rtl"><PageHeader title="وکالت خسارت" subtitle="پرونده‌های وکالت و اعتراض" /><Loading /></div>;

  return (
    <div className="space-y-4" dir="rtl">
      <PageHeader title="وکالت خسارت" subtitle="پرونده‌های وکالت و اعتراض به تصمیمات بیمه‌گر" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cases.map((c) => (
          <Card key={c.id} className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-feedback-warning-subtle">
                <Gavel className="h-5 w-5 text-feedback-warning" />
              </div>
              <StatusBadge status={c.status} />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-text-primary">{c.caseNumber}</h3>
            <p className="mt-1 text-xs text-text-muted">{c.customerName} — {c.claimNumber}</p>
            <p className="mt-2 text-xs text-text-muted">{c.description}</p>
            <p className="mt-3 text-[11px] text-text-muted">تاریخ: {c.createdAt}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function AgentAdjusterReferralsPage() {
  const [referrals, setReferrals] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    agentPortalAPI.getClaims()
      .then(async (claimsData) => {
        const claims = Array.isArray(claimsData) ? claimsData : [];
        // Referrals are typically associated with claims; fetch them
        const referrals = await Promise.all(
          claims.slice(0, 10).map(c =>
            agentPortalAPI.getClaimDetails(c.id || c.claimId).catch(() => null)
          )
        );
        const valid = referrals.filter(Boolean);
        setReferrals(valid.length > 0 ? valid : mockAdjusterReferrals);
      })
      .catch(() => { setReferrals(mockAdjusterReferrals); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-4" dir="rtl"><PageHeader title="ارجاع به کارشناس" subtitle="مدیریت ارجاعات به کارشناسان خسارت" /><Loading /></div>;

  return (
    <div className="space-y-4" dir="rtl">
      <PageHeader title="ارجاع به کارشناس" subtitle="مدیریت ارجاعات به کارشناسان خسارت" />
      <Table headers={['شماره ارجاع', 'مشتری', 'خسارت', 'کارشناس', 'وضعیت', 'تاریخ']}>
        {referrals.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-medium text-text-primary">{r.referralNumber}</TableCell>
            <TableCell>{r.customerName}</TableCell>
            <TableCell>{r.claimNumber}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-base">
                  <UserCheck className="h-4 w-4 text-text-muted" />
                </div>
                {r.adjusterName}
              </div>
            </TableCell>
            <TableCell><StatusBadge status={r.status} /></TableCell>
            <TableCell className="text-text-muted">{r.createdAt}</TableCell>
          </TableRow>
        ))}
      </Table>
    </div>
  );
}

export function AgentRecoveryPage() {
  const [recoveries, setRecoveries] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    agentPortalAPI.getClaims()
      .then(async (claimsData) => {
        const claims = Array.isArray(claimsData) ? claimsData : [];
        const recoveries = await Promise.all(
          claims.slice(0, 10).map(c =>
            agentPortalAPI.listRecoveryCases(c.id || c.claimId).catch(() => [])
          )
        );
        const flat = recoveries.flat();
        setRecoveries(flat.length > 0 ? flat : mockRecovery);
      })
      .catch(() => { setRecoveries(mockRecovery); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-4" dir="rtl"><PageHeader title="استرداد" subtitle="پیگیری استرداد خسارت‌ها" /><Loading /></div>;

  const totalAmount = recoveries.reduce((sum, r) => sum + r.amount, 0);
  const recoveredAmount = recoveries.filter(r => r.status === 'وصول شده').reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-4" dir="rtl">
      <PageHeader title="استرداد" subtitle="پیگیری استرداد خسارت‌ها و مطالبات" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary-subtle">
            <RefreshCw className="h-5 w-5 text-brand-primary" />
          </div>
          <p className="mt-2 text-xs text-text-muted">کل استرداد</p>
          <p className="mt-1 text-lg font-bold text-text-primary">{formatToman(totalAmount)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-feedback-success-subtle">
            <FileText className="h-5 w-5 text-feedback-success" />
          </div>
          <p className="mt-2 text-xs text-text-muted">وصول شده</p>
          <p className="mt-1 text-lg font-bold text-feedback-success">{formatToman(recoveredAmount)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-feedback-warning-subtle">
            <RefreshCw className="h-5 w-5 text-feedback-warning" />
          </div>
          <p className="mt-2 text-xs text-text-muted">در انتظار</p>
          <p className="mt-1 text-lg font-bold text-feedback-warning">{formatToman(totalAmount - recoveredAmount)}</p>
        </Card>
      </div>
      <Table headers={['شماره', 'مشتری', 'خسارت', 'مبلغ', 'وضعیت', 'تاریخ']}>
        {recoveries.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-medium text-text-primary">{r.recoveryNumber}</TableCell>
            <TableCell>{r.customerName}</TableCell>
            <TableCell>{r.claimNumber}</TableCell>
            <TableCell className="font-medium text-text-primary">{formatToman(r.amount)}</TableCell>
            <TableCell><StatusBadge status={r.status} /></TableCell>
            <TableCell className="text-text-muted">{r.createdAt}</TableCell>
          </TableRow>
        ))}
      </Table>
    </div>
  );
}
