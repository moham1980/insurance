import * as React from 'react';
import { Target, Phone, Mail, Plus, Search } from 'lucide-react';
import { Loading, ErrorBanner, EmptyState, StatusBadge, PageHeader, Table, TableRow, TableCell, Button, Card } from './ui';
import { mockLeads } from '../lib/mock-data';
import { agentPortalAPI } from '../lib/api';

export function AgentLeadsPage() {
  const [leads, setLeads] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [showAddModal, setShowAddModal] = React.useState(false);

  React.useEffect(() => {
    agentPortalAPI.getLeads()
      .then(data => setLeads(Array.isArray(data) ? data : []))
      .catch(() => { setLeads(mockLeads); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = leads.filter(l =>
    !search || l.name?.includes(search) || l.phone?.includes(search) || l.product?.includes(search)
  );

  if (loading) return <div className="space-y-4" dir="rtl"><PageHeader title="سرنخ‌ها" subtitle="مدیریت سرنخ‌های فروش" /><Loading /></div>;
  if (error) return <div className="space-y-4" dir="rtl"><PageHeader title="سرنخ‌ها" subtitle="مدیریت سرنخ‌های فروش" /><ErrorBanner error={error} /></div>;

  return (
    <div className="space-y-4" dir="rtl">
      <PageHeader
        title="سرنخ‌ها"
        subtitle="مدیریت سرنخ‌های فروش و پیگیری"
        action={<Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2"><Plus className="h-4 w-4" /> سرنخ جدید</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Card className="p-3"><p className="text-xs text-text-muted">کل</p><p className="mt-1 text-lg font-bold text-text-primary">{leads.length}</p></Card>
        <Card className="p-3"><p className="text-xs text-brand-primary">جدید</p><p className="mt-1 text-lg font-bold text-brand-primary">{leads.filter(l => l.status === 'جدید').length}</p></Card>
        <Card className="p-3"><p className="text-xs text-feedback-warning">در حال پیگیری</p><p className="mt-1 text-lg font-bold text-feedback-warning">{leads.filter(l => l.status === 'تماس اول' || l.status === 'استعلام قیمت').length}</p></Card>
        <Card className="p-3"><p className="text-xs text-brand-secondary">در مذاکره</p><p className="mt-1 text-lg font-bold text-brand-secondary">{leads.filter(l => l.status === 'در حال مذاکره').length}</p></Card>
        <Card className="p-3"><p className="text-xs text-feedback-success">نهایی شده</p><p className="mt-1 text-lg font-bold text-feedback-success">{leads.filter(l => l.status === 'نهایی شده').length}</p></Card>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو در سرنخ‌ها..."
          className="w-full rounded-lg border border-border-default py-2 pr-10 pl-3 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Target} title="سرنخی یافت نشد" />
      ) : (
        <Table headers={['نام', 'تلفن', 'محصول', 'وضعیت', 'منبع', 'تاریخ', 'عملیات']}>
          {filtered.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="font-medium text-text-primary">{l.name}</TableCell>
              <TableCell>
                <a href={`tel:${l.phone}`} className="flex items-center gap-1 text-brand-primary hover:text-brand-primary">
                  <Phone className="h-3.5 w-3.5" /> {l.phone}
                </a>
              </TableCell>
              <TableCell>{l.product}</TableCell>
              <TableCell><StatusBadge status={l.status} /></TableCell>
              <TableCell className="text-text-muted">{l.source}</TableCell>
              <TableCell className="text-text-muted">{l.createdAt}</TableCell>
              <TableCell>
                <Button variant="ghost" className="px-2 py-1 text-xs">پیگیری</Button>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-bg-raised p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-bold text-text-primary">سرنخ جدید</h3>
            <div className="space-y-3">
              <input placeholder="نام و نام خانوادگی" className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
              <input placeholder="شماره تلفن" className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
              <select className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20">
                <option value="">انتخاب محصول...</option>
                <option>ثالثی شخصی</option>
                <option>آتش‌سوزی</option>
                <option>حوادث</option>
                <option>مهندسی</option>
                <option>درمان تکمیلی</option>
              </select>
              <select className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20">
                <option value="">منبع سرنخ...</option>
                <option>وب‌سایت</option>
                <option>معرفی</option>
                <option>اینستاگرام</option>
                <option>تماس مستقیم</option>
              </select>
            </div>
            <div className="mt-5 flex gap-2">
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>انصراف</Button>
              <Button onClick={() => setShowAddModal(false)}>ثبت سرنخ</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
