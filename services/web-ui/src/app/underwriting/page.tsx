'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Scale, ChevronLeft, Search, FileText, Clock, CheckCircle2, AlertTriangle, Filter } from 'lucide-react';
import { apiFetch, getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';
import { Button, Card, DataTable } from '@insurance/design-system';
import { cn } from '@/lib/cn';

type RequestRow = {
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

type DashboardStats = {
  totalRequests: number;
  pending: number;
  inReview: number;
  approved: number;
  rejected: number;
  escalated: number;
  avgRiskScore: number;
  highRiskCount: number;
};

const mockStats: DashboardStats = {
  totalRequests: 48,
  pending: 12,
  inReview: 8,
  approved: 22,
  rejected: 4,
  escalated: 2,
  avgRiskScore: 42.5,
  highRiskCount: 6,
};

const mockRows: RequestRow[] = [
  { requestId: 'req-001', policyId: 'POL-1403-0231', status: 'pending', riskScore: 35.2, riskLevel: 'LOW', createdAt: '2024-07-10T10:00:00Z', insuredName: 'علی محمدی', product: 'بیمه ثالثی', premium: 3200000 },
  { requestId: 'req-002', policyId: 'POL-1403-0232', status: 'in_review', riskScore: 62.8, riskLevel: 'MEDIUM', createdAt: '2024-07-11T14:30:00Z', insuredName: 'مریم احمدی', product: 'بیمه آتش‌سوزی', premium: 1800000 },
  { requestId: 'req-003', policyId: 'POL-1403-0233', status: 'approved', riskScore: 28.1, riskLevel: 'LOW', createdAt: '2024-07-08T09:15:00Z', insuredName: 'حسین رضایی', product: 'بیمه حوادث', premium: 2500000 },
  { requestId: 'req-004', policyId: 'POL-1403-0234', status: 'escalated', riskScore: 85.3, riskLevel: 'HIGH', createdAt: '2024-07-14T16:45:00Z', insuredName: 'فاطمه کریمی', product: 'بیمه مهندسی', premium: 8500000 },
  { requestId: 'req-005', policyId: 'POL-1403-0235', status: 'pending', riskScore: 45.0, riskLevel: 'MEDIUM', createdAt: '2024-07-15T11:20:00Z', insuredName: 'رضا صادقی', product: 'بیمه درمان', premium: 5200000 },
  { requestId: 'req-006', policyId: 'POL-1403-0236', status: 'rejected', riskScore: 92.7, riskLevel: 'CRITICAL', createdAt: '2024-07-09T13:00:00Z', insuredName: 'سارا نوری', product: 'بیمه عمر', premium: 15000000 },
];

function formatToman(amount: number): string {
  return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
}

export default function UnderwritingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const authUser = getAuthUser();
    if (!authUser) { router.push('/login'); return; }
    const perms = enterprisePermissionsForRoles(authUser.roles || []);
    if (!hasEnterprisePermission(perms, 'underwriting:view')) { router.push('/forbidden'); return; }
    fetchData();
    fetchStats();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (riskFilter) params.append('riskLevel', riskFilter);
      const url = `/underwriting/requests${params.toString() ? '?' + params.toString() : ''}`;
      const res = await apiFetch<RequestRow[]>(url);
      if (res.success) setRows(res.data || []);
      else { setError(res.error?.message || 'خطا در دریافت داده‌ها'); setRows(mockRows); }
    } catch (e: any) {
      setError(e?.message || 'خطا در ارتباط با سرور');
      setRows(mockRows);
    } finally { setLoading(false); }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await apiFetch<DashboardStats>('/underwriting/stats');
      if (res.success) setStats(res.data);
      else setStats(mockStats);
    } catch (e: any) {
      setStats(mockStats);
    } finally { setStatsLoading(false); }
  };

  const filteredRows = rows.filter(r => {
    const s = search.trim();
    if (!s) return true;
    return r.requestId.includes(s) || r.policyId.includes(s) || (r.insuredName && r.insuredName.includes(s));
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning',
      in_review: 'border-brand-primary/30 bg-brand-primary-subtle text-brand-primary',
      approved: 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success',
      rejected: 'border-feedback-error/30 bg-feedback-error-subtle text-feedback-error',
      escalated: 'border-brand-secondary/30 bg-brand-secondary-subtle text-brand-secondary',
    };
    const labels: Record<string, string> = {
      pending: 'در انتظار',
      in_review: 'در حال بررسی',
      approved: 'تأیید شده',
      rejected: 'رد شده',
      escalated: 'ارجاع شده',
    };
    return (
      <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', styles[status] || 'border-border-default bg-bg-base text-text-muted')}>
        {labels[status] || status}
      </span>
    );
  };

  const getRiskBadge = (riskLevel?: string | null) => {
    if (!riskLevel) return <span className="text-text-muted">-</span>;
    const styles: Record<string, string> = {
      LOW: 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success',
      MEDIUM: 'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning',
      HIGH: 'border-feedback-error/30 bg-feedback-error-subtle text-feedback-error',
      CRITICAL: 'border-feedback-error/30 bg-feedback-error-subtle text-feedback-error',
    };
    const labels: Record<string, string> = {
      LOW: 'کم',
      MEDIUM: 'متوسط',
      HIGH: 'زیاد',
      CRITICAL: 'بحرانی',
    };
    return (
      <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', styles[riskLevel])}>
        {labels[riskLevel]}
      </span>
    );
  };

  const statCards = [
    { label: 'کل درخواست‌ها', value: stats?.totalRequests ?? '-', icon: FileText, color: 'bg-brand-primary-subtle text-brand-primary' },
    { label: 'در انتظار بررسی', value: stats ? stats.pending + stats.inReview : '-', icon: Clock, color: 'bg-feedback-warning-subtle text-feedback-warning' },
    { label: 'تأیید شده', value: stats?.approved ?? '-', icon: CheckCircle2, color: 'bg-feedback-success-subtle text-feedback-success' },
    { label: 'ریسک بالا', value: stats?.highRiskCount ?? '-', icon: AlertTriangle, color: 'bg-feedback-error-subtle text-feedback-error' },
  ];

  const columns = [
    { key: 'requestId', header: 'شناسه درخواست', cell: (row: RequestRow) => <span className="font-mono text-body-sm font-medium text-text-primary">{row.requestId.slice(0, 12)}</span> },
    { key: 'policyId', header: 'بیمه‌نامه', cell: (row: RequestRow) => <span className="font-mono text-body-sm text-text-muted">{row.policyId.slice(0, 12)}</span> },
    { key: 'insuredName', header: 'بیمه‌گذار', cell: (row: RequestRow) => <span className="text-text-primary">{row.insuredName || '-'}</span> },
    { key: 'product', header: 'محصول', cell: (row: RequestRow) => row.product || '-' },
    { key: 'premium', header: 'حق بیمه', cell: (row: RequestRow) => <span className="font-medium text-text-primary">{row.premium ? formatToman(row.premium) : '-'}</span> },
    { key: 'status', header: 'وضعیت', cell: (row: RequestRow) => getStatusBadge(row.status) },
    { key: 'riskLevel', header: 'سطح ریسک', cell: (row: RequestRow) => getRiskBadge(row.riskLevel) },
    { key: 'riskScore', header: 'امتیاز ریسک', cell: (row: RequestRow) => <span className="text-text-muted">{row.riskScore ? row.riskScore.toFixed(2) : '-'}</span> },
    { key: 'createdAt', header: 'تاریخ ایجاد', cell: (row: RequestRow) => <span className="text-text-muted">{new Date(row.createdAt).toLocaleDateString('fa-IR')}</span> },
    { key: 'actions', header: 'عملیات', cell: (row: RequestRow) => (
      <Button size="sm" variant="secondary" onClick={() => router.push(`/underwriting/${row.requestId}`)}>
        جزئیات
      </Button>
    ) },
  ];

  return (
    <div className="min-h-screen bg-bg-base" dir="rtl">
      <header className="sticky top-0 z-10 border-b border-border-default bg-bg-raised shadow-1">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
              <ChevronLeft className="h-5 w-5" />
              بازگشت
            </Button>
            <h1 className="text-h3 font-bold text-text-primary">بیمه‌نامه‌نویسی</h1>
          </div>
          <Button size="sm" onClick={() => router.push('/underwriting/workstation')}>
            <Scale className="h-4 w-4" />
            ایستگاه کار
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        {error && (
          <div className="rounded-lg border border-feedback-warning/30 bg-feedback-warning-subtle p-3 text-body-sm text-feedback-warning">
            در حال نمایش داده‌های نمونه — ارتباط با سرور برقرار نشد
          </div>
        )}

        {!statsLoading && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.label} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', card.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-body-sm text-text-secondary">{card.label}</p>
                      <p className="text-h4 font-bold text-text-primary">{card.value}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="جستجو بر اساس شناسه، بیمه‌نامه یا نام بیمه‌گذار"
                className="w-full rounded-lg border border-border-default bg-bg-base py-2 pr-10 pl-3 text-body-sm text-text-primary placeholder:text-text-muted"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); fetchData(); }}
              className="rounded-lg border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary"
            >
              <option value="">همه وضعیت‌ها</option>
              <option value="pending">در انتظار</option>
              <option value="in_review">در حال بررسی</option>
              <option value="approved">تأیید شده</option>
              <option value="rejected">رد شده</option>
              <option value="escalated">ارجاع شده</option>
            </select>
            <select
              value={riskFilter}
              onChange={e => { setRiskFilter(e.target.value); fetchData(); }}
              className="rounded-lg border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary"
            >
              <option value="">همه سطوح ریسک</option>
              <option value="LOW">کم</option>
              <option value="MEDIUM">متوسط</option>
              <option value="HIGH">زیاد</option>
              <option value="CRITICAL">بحرانی</option>
            </select>
            <Button size="sm" variant="secondary" onClick={fetchData}>
              <Filter className="h-4 w-4" />
              بروزرسانی
            </Button>
          </div>
        </Card>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-primary" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={filteredRows}
            keyExtractor={(row: RequestRow) => row.requestId}
          />
        )}
      </main>
    </div>
  );
}
