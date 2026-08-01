import * as React from 'react';
import { FileText, Search, Filter, Download } from 'lucide-react';
import { Loading, ErrorBanner, EmptyState, StatusBadge, PageHeader, Table, TableRow, TableCell, Button, Card } from './ui';
import { mockPolicies, formatToman } from '../lib/mock-data';
import { agentPortalAPI } from '../lib/api';

export function AgentPoliciesPage() {
  const [policies, setPolicies] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');

  React.useEffect(() => {
    agentPortalAPI.getPolicies()
      .then(data => setPolicies(Array.isArray(data) ? data : []))
      .catch(() => { setPolicies(mockPolicies); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = policies.filter(p => {
    const matchesSearch = !search ||
      p.policyNumber?.includes(search) ||
      p.customerName?.includes(search) ||
      p.product?.includes(search);
    const matchesStatus = !statusFilter || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className="space-y-4" dir="rtl"><PageHeader title="بیمه‌نامه‌ها" subtitle="مدیریت و مشاهده بیمه‌نامه‌های صادر شده" /><Loading /></div>;
  if (error) return <div className="space-y-4" dir="rtl"><PageHeader title="بیمه‌نامه‌ها" subtitle="مدیریت و مشاهده بیمه‌نامه‌های صادر شده" /><ErrorBanner error={error} /></div>;

  return (
    <div className="space-y-4" dir="rtl">
      <PageHeader
        title="بیمه‌نامه‌ها"
        subtitle="مدیریت و مشاهده بیمه‌نامه‌های صادر شده"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex items-center gap-2">
              <Download className="h-4 w-4" /> خروجی
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو بر اساس شماره، مشتری، محصول..."
            className="w-full rounded-lg border border-border-default py-2 pr-10 pl-3 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="ACTIVE">فعال</option>
          <option value="PENDING">در انتظار</option>
          <option value="EXPIRED">منقضی</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-3">
          <p className="text-xs text-text-muted">کل</p>
          <p className="mt-1 text-lg font-bold text-text-primary">{filtered.length}</p>
        </Card>
        <div className="rounded-xl border border-feedback-success/30 bg-feedback-success-subtle p-3">
          <p className="text-xs text-feedback-success">فعال</p>
          <p className="mt-1 text-lg font-bold text-feedback-success">{filtered.filter(p => p.status === 'ACTIVE').length}</p>
        </div>
        <div className="rounded-xl border border-feedback-warning/30 bg-feedback-warning-subtle p-3">
          <p className="text-xs text-feedback-warning">در انتظار</p>
          <p className="mt-1 text-lg font-bold text-feedback-warning">{filtered.filter(p => p.status === 'PENDING').length}</p>
        </div>
        <div className="rounded-xl border border-border-default bg-bg-base p-3">
          <p className="text-xs text-text-muted">منقضی</p>
          <p className="mt-1 text-lg font-bold text-text-secondary">{filtered.filter(p => p.status === 'EXPIRED').length}</p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="بیمه‌نامه‌ای یافت نشد" description="با فیلترهای انتخاب شده بیمه‌نامه‌ای موجود نیست" />
      ) : (
        <Table headers={['شماره', 'محصول', 'مشتری', 'وضعیت', 'حق بیمه', 'تاریخ صدور', 'تاریخ انقضا']}>
          {filtered.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium text-text-primary">{p.policyNumber}</TableCell>
              <TableCell>{p.product}</TableCell>
              <TableCell>{p.customerName}</TableCell>
              <TableCell><StatusBadge status={p.status} /></TableCell>
              <TableCell className="font-medium text-text-primary">{formatToman(p.premium)}</TableCell>
              <TableCell className="text-text-muted">{p.issueDate}</TableCell>
              <TableCell className="text-text-muted">{p.endDate}</TableCell>
            </TableRow>
          ))}
        </Table>
      )}
    </div>
  );
}
