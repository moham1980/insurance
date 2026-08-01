import * as React from 'react';
import { DollarSign, TrendingUp, Clock, CheckCircle, FileText, Download } from 'lucide-react';
import { PageHeader, Table, TableRow, TableCell, StatusBadge, Card, Button, Loading, ErrorBanner } from './ui';
import { brokerApi } from '../lib/api';
import { mockSettlements, formatToman } from '../lib/mock-data';

export function SettlementsPage() {
  const [settlements, setSettlements] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filterStatus, setFilterStatus] = React.useState('');

  React.useEffect(() => { loadSettlements(); }, []);

  const loadSettlements = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await brokerApi.listSettlements();
      setSettlements(res?.data?.rows || res?.data || []);
    } catch (e: any) {
      setError(e.message);
      setSettlements(mockSettlements);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filterStatus ? settlements.filter(s => s.status === filterStatus) : settlements;

  const totalSettled = settlements.filter(s => s.status === 'تسویه شده').reduce((sum, s) => sum + (s.commissionAmount || 0), 0);
  const totalPending = settlements.filter(s => s.status === 'در انتظار').reduce((sum, s) => sum + (s.commissionAmount || 0), 0);
  const totalPremium = settlements.reduce((sum, s) => sum + (s.totalPremium || 0), 0);

  if (loading) return <Loading />;

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader
        title="تسویه‌ها"
        subtitle="مدیریت تسویه حساب پورسانت با بیمه‌گرها"
      />

      {error && <ErrorBanner error="در حال نمایش داده‌های نمونه — ارتباط با سرور برقرار نشد" onRetry={loadSettlements} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-feedback-success-subtle">
            <CheckCircle className="h-6 w-6 text-feedback-success" />
          </div>
          <p className="mt-3 text-sm text-text-secondary">تسویه شده</p>
          <p className="mt-1 text-xl font-bold text-feedback-success">{formatToman(totalSettled)}</p>
        </Card>
        <Card className="p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-feedback-warning-subtle">
            <Clock className="h-6 w-6 text-feedback-warning" />
          </div>
          <p className="mt-3 text-sm text-text-secondary">در انتظار تسویه</p>
          <p className="mt-1 text-xl font-bold text-feedback-warning">{formatToman(totalPending)}</p>
        </Card>
        <Card className="p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary-subtle">
            <DollarSign className="h-6 w-6 text-brand-primary" />
          </div>
          <p className="mt-3 text-sm text-text-secondary">کل حق بیمه</p>
          <p className="mt-1 text-xl font-bold text-text-primary">{formatToman(totalPremium)}</p>
        </Card>
        <Card className="p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-secondary-subtle">
            <TrendingUp className="h-6 w-6 text-brand-secondary" />
          </div>
          <p className="mt-3 text-sm text-text-secondary">تعداد تسویه</p>
          <p className="mt-1 text-xl font-bold text-text-primary">{settlements.length}</p>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-border-default bg-bg-raised px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="تسویه شده">تسویه شده</option>
          <option value="در انتظار">در انتظار</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-text-muted" />
          <p className="mt-4 text-text-muted">تسویه‌ای یافت نشد</p>
        </Card>
      ) : (
        <Table headers={['دوره', 'بیمه‌گر', 'کل حق بیمه', 'مبلغ پورسانت', 'تعداد بیمه‌نامه', 'وضعیت', 'تاریخ تسویه', 'شماره مرجع', 'عملیات']}>
          {filtered.map((st) => (
            <TableRow key={st.id}>
              <TableCell className="font-medium text-text-primary">{st.period}</TableCell>
              <TableCell>{st.carrierName}</TableCell>
              <TableCell className="text-text-secondary">{formatToman(st.totalPremium)}</TableCell>
              <TableCell className="font-medium text-text-primary">{formatToman(st.commissionAmount)}</TableCell>
              <TableCell className="text-text-secondary">{st.policyCount}</TableCell>
              <TableCell><StatusBadge status={st.status} /></TableCell>
              <TableCell className="text-text-muted">{st.settlementDate || '—'}</TableCell>
              <TableCell className="text-text-muted">{st.referenceNumber || '—'}</TableCell>
              <TableCell>
                {st.status === 'تسویه شده' && (
                  <button className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-brand-primary hover:bg-brand-primary/10" title="دانلود رسید">
                    <Download className="h-3.5 w-3.5" />
                    رسید
                  </button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </Table>
      )}
    </div>
  );
}
