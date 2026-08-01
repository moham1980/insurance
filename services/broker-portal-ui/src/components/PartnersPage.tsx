import * as React from 'react';
import { Handshake, Plus, X, Phone, Mail, FileText, Building2 } from 'lucide-react';
import { PageHeader, Table, TableRow, TableCell, StatusBadge, EmptyState, Card, Button, Loading, ErrorBanner } from './ui';
import { brokerApi } from '../lib/api';
import { mockPartners } from '../lib/mock-data';

export function PartnersPage() {
  const [partners, setPartners] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [form, setForm] = React.useState({ name: '', type: 'بیمه‌گر', contactPerson: '', phone: '', email: '' });
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => { loadPartners(); }, []);

  const loadPartners = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await brokerApi.listPartners();
      setPartners(res?.data?.rows || res?.data || []);
    } catch (e: any) {
      setError(e.message);
      setPartners(mockPartners);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name) return;
    setCreating(true);
    try {
      await brokerApi.createPartner(form);
      setShowCreate(false);
      setForm({ name: '', type: 'بیمه‌گر', contactPerson: '', phone: '', email: '' });
      loadPartners();
    } catch (e: any) {
      const newPartner = {
        id: `PT-${Date.now()}`,
        ...form,
        status: 'در مذاکره',
        totalPolicies: 0,
        agreements: 0,
      };
      setPartners(prev => [newPartner, ...prev]);
      setShowCreate(false);
      setForm({ name: '', type: 'بیمه‌گر', contactPerson: '', phone: '', email: '' });
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader
        title="شرکای تجاری"
        subtitle="مدیریت بیمه‌گرها و شرکای کاری"
        action={
          <Button onClick={() => setShowCreate(!showCreate)}>
            <Plus className="ml-2 h-4 w-4" />
            شریک جدید
          </Button>
        }
      />

      {error && <ErrorBanner error="در حال نمایش داده‌های نمونه — ارتباط با سرور برقرار نشد" onRetry={loadPartners} />}

      {showCreate && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-text-primary">افزودن شریک جدید</h3>
            <button onClick={() => setShowCreate(false)} className="rounded-lg p-1 text-text-muted hover:bg-bg-subtle">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">نام</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="نام شرکت / سازمان"
                className="w-full rounded-lg border border-border-default bg-bg-raised px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">نوع همکاری</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full rounded-lg border border-border-default bg-bg-raised px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              >
                <option value="بیمه‌گر">بیمه‌گر</option>
                <option value="بیمه اتکایی">بیمه اتکایی</option>
                <option value="کارزار">کارزار</option>
                <option value="نماینده">نماینده</option>
                <option value="ارائه‌دهنده خدمت">ارائه‌دهنده خدمت</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">شخص مسئول</label>
              <input
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                placeholder="نام شخص مسئول ارتباط"
                className="w-full rounded-lg border border-border-default bg-bg-raised px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">تلفن</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="021-XXXXXXXX"
                className="w-full rounded-lg border border-border-default bg-bg-raised px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-text-primary">ایمیل</label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
                className="w-full rounded-lg border border-border-default bg-bg-raised px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>انصراف</Button>
            <Button size="sm" onClick={handleCreate} disabled={creating || !form.name}>
              {creating ? 'در حال...' : 'ایجاد'}
            </Button>
          </div>
        </Card>
      )}

      {partners.length === 0 ? (
        <EmptyState icon={Handshake} title="شریکی یافت نشد" description="برای افزودن شریک جدید روی دکمه شریک جدید کلیک کنید" />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {partners.map((p) => (
              <Card key={p.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/10">
                    <Building2 className="h-6 w-6 text-brand-primary" />
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <h3 className="mt-3 text-base font-semibold text-text-primary">{p.name}</h3>
                <p className="mt-1 text-xs text-text-muted">{p.type}</p>
                {p.contactPerson && (
                  <p className="mt-2 text-sm text-text-secondary">مسئول ارتباط: {p.contactPerson}</p>
                )}
                <div className="mt-2 space-y-1">
                  {p.phone && (
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <Phone className="h-3.5 w-3.5" />
                      {p.phone}
                    </div>
                  )}
                  {p.email && (
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <Mail className="h-3.5 w-3.5" />
                      {p.email}
                    </div>
                  )}
                </div>
                <div className="mt-3 flex gap-4 border-t border-border-default pt-3 text-xs">
                  <div>
                    <span className="text-text-muted">قراردادها: </span>
                    <span className="font-medium text-text-primary">{p.agreements}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">بیمه‌نامه‌ها: </span>
                    <span className="font-medium text-text-primary">{p.totalPolicies}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Table headers={['نام', 'نوع', 'شخص مسئول', 'تلفن', 'ایمیل', 'وضعیت', 'قراردادها', 'بیمه‌نامه‌ها']}>
            {partners.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium text-text-primary">{p.name}</TableCell>
                <TableCell>{p.type}</TableCell>
                <TableCell className="text-text-secondary">{p.contactPerson || '—'}</TableCell>
                <TableCell className="text-text-secondary">{p.phone || '—'}</TableCell>
                <TableCell className="text-text-secondary">{p.email || '—'}</TableCell>
                <TableCell><StatusBadge status={p.status} /></TableCell>
                <TableCell className="text-text-secondary">{p.agreements}</TableCell>
                <TableCell className="text-text-secondary">{p.totalPolicies}</TableCell>
              </TableRow>
            ))}
          </Table>
        </>
      )}
    </div>
  );
}
