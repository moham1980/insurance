'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, FileText, DollarSign, ShieldAlert, BarChart3, ChevronLeft, Users, Handshake, LayoutDashboard, Plus, X } from 'lucide-react';
import { Button, Card, DataTable } from '@insurance/design-system';
import { cn } from '@insurance/ui-utils';
import { fetchBFF } from '@/lib/api';

type Tab = 'dashboard' | 'agreements' | 'offerings' | 'placements' | 'settlements' | 'claims' | 'contracts' | 'subAgents' | 'partners';

const tabPaths: Record<Tab, string> = {
  dashboard: '/api/v1/broker/dashboard',
  agreements: '/api/v1/broker/carrier-agreements',
  offerings: '/api/v1/broker/product-offerings',
  placements: '/api/v1/broker/placements',
  settlements: '/api/v1/broker/settlements',
  claims: '/api/v1/broker/claim-advocacy-cases',
  contracts: '/api/v1/broker/contracts',
  subAgents: '/api/v1/broker/sub-agents',
  partners: '/api/v1/broker/partners',
};

const tabTitles: Record<Tab, { label: string; icon: any }> = {
  dashboard: { label: 'داشبورد', icon: LayoutDashboard },
  agreements: { label: 'قراردادهای بیمه‌گر', icon: Briefcase },
  offerings: { label: 'محصولات کارگزاری', icon: FileText },
  placements: { label: 'سفارش‌ها', icon: BarChart3 },
  settlements: { label: 'تسویه‌ها', icon: DollarSign },
  claims: { label: 'پرونده‌های خسارت', icon: ShieldAlert },
  contracts: { label: 'قراردادها', icon: FileText },
  subAgents: { label: 'نمایندگان فرعی', icon: Users },
  partners: { label: 'شرکا', icon: Handshake },
};

export default function BrokerPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('agreements');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tokenMatch = document.cookie.match(new RegExp('(^| )auth-token=([^;]+)'));
    if (!tokenMatch) {
      router.push('/');
      return;
    }
    loadData();
  }, [router, activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await fetchBFF(tabPaths[activeTab]);
      setData(json.data || {});
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = Object.entries(tabTitles).map(([key, value]) => ({ key: key as Tab, ...value }));

  const rows = data?.rows || (Array.isArray(data) ? data : []);
  const keys = rows.length > 0 ? Object.keys(rows[0]).slice(0, 6) : [];
  const columns = keys.map((key) => ({ key, header: key, cell: (row: any) => String(row[key] ?? '-') }));

  return (
    <div className="min-h-screen bg-bg-base">
      <header className="sticky top-0 z-10 border-b border-border-default bg-bg-raised shadow-1">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
            <ChevronLeft className="h-5 w-5" />
            بازگشت
          </Button>
          <h1 className="text-h3 font-bold text-text-primary">عملیات کارگزاری</h1>
        </div>
      </header>

      <div className="border-b border-border-default bg-bg-raised">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 border-b-2 px-4 py-3 text-body-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {error && (
          <div className="mb-4 rounded-lg border border-danger bg-danger/10 p-3 text-body-sm text-danger">
            {error}
          </div>
        )}

        {activeTab === 'dashboard' && <DashboardTab data={data} loading={loading} />}
        {activeTab === 'subAgents' && <SubAgentsTab data={data} loading={loading} />}
        {activeTab === 'partners' && <PartnersTab data={data} loading={loading} />}
        {['agreements', 'offerings', 'placements', 'settlements', 'claims', 'contracts'].includes(activeTab) && (
          rows.length > 0 ? (
            <Card className="p-4">
              <DataTable
                columns={columns}
                rows={rows}
                keyExtractor={(row: any) => row.id || row.agreementId || JSON.stringify(row)}
                loading={loading}
              />
            </Card>
          ) : (
            <p className="text-text-muted">داده‌ای یافت نشد</p>
          )
        )}
      </main>
    </div>
  );
}

function DashboardTab({ data, loading }: { data: any; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-primary" />
      </div>
    );
  }

  const stats = data?.stats || data || {};
  const cards = [
    { label: 'قراردادهای فعال', value: stats.activeAgreements ?? stats.agreements ?? '-', icon: Briefcase },
    { label: 'سفارش‌های جاری', value: stats.activePlacements ?? stats.placements ?? '-', icon: BarChart3 },
    { label: 'تسویه‌های در انتظار', value: stats.pendingSettlements ?? stats.settlements ?? '-', icon: DollarSign },
    { label: 'پرونده‌های خسارت', value: stats.activeClaims ?? stats.claims ?? '-', icon: ShieldAlert },
    { label: 'نمایندگان فرعی', value: stats.subAgents ?? '-', icon: Users },
    { label: 'شرکا', value: stats.partners ?? '-', icon: Handshake },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-h3 font-semibold text-text-primary">داشبورد کارگزاری</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10">
                  <Icon className="h-5 w-5 text-brand-primary" />
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

      {stats.recentActivity && Array.isArray(stats.recentActivity) && stats.recentActivity.length > 0 && (
        <div>
          <h3 className="text-body-lg font-semibold text-text-primary mb-3">فعالیت‌های اخیر</h3>
          <Card className="p-4">
            <div className="space-y-2">
              {stats.recentActivity.map((activity: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between border-b border-border-default pb-2 last:border-0">
                  <span className="text-body-sm text-text-primary">{activity.description || activity.action || '-'}</span>
                  <span className="text-body-xs text-text-muted">{activity.timestamp || activity.date || ''}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function SubAgentsTab({ data, loading }: { data: any; loading: boolean }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', code: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const rows = data?.rows || (Array.isArray(data) ? data : []);

  const handleCreate = async () => {
    if (!form.name) return;
    setActionLoading(true);
    try {
      const { postBFF } = await import('@/lib/api');
      await postBFF('/api/v1/broker/sub-agents', form);
      setShowModal(false);
      setForm({ name: '', phone: '', email: '', code: '' });
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'خطا در ایجاد نماینده فرعی');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    { key: 'name', header: 'نام', cell: (row: any) => row.name || row.agentName || '-' },
    { key: 'code', header: 'کد', cell: (row: any) => row.code || row.agentCode || '-' },
    { key: 'phone', header: 'تلفن', cell: (row: any) => row.phone || '-' },
    { key: 'email', header: 'ایمیل', cell: (row: any) => row.email || '-' },
    { key: 'status', header: 'وضعیت', cell: (row: any) => row.status || '-' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-h3 font-semibold text-text-primary">نمایندگان فرعی</h2>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="ml-1 h-4 w-4" /> نماینده جدید
        </Button>
      </div>
      {rows.length > 0 ? (
        <Card className="p-4">
          <DataTable columns={columns} rows={rows} keyExtractor={(row: any) => row.id || row.agentId} loading={loading} />
        </Card>
      ) : (
        <p className="text-text-muted">نماینده فرعی یافت نشد</p>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-raised rounded-xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-text-primary">نماینده فرعی جدید</h3>
              <button onClick={() => setShowModal(false)}><X className="h-5 w-5 text-text-muted" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-text-muted">نام</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-border-default rounded-lg p-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-text-muted">کد نمایندگی</label>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full border border-border-default rounded-lg p-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-text-muted">تلفن</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-border-default rounded-lg p-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-text-muted">ایمیل</label>
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-border-default rounded-lg p-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowModal(false)} className="px-3 py-1.5 text-sm text-text-secondary rounded-lg">انصراف</button>
              <button onClick={handleCreate} disabled={actionLoading || !form.name}
                className="px-3 py-1.5 text-sm bg-brand-primary text-text-on-brand rounded-lg disabled:opacity-50">
                {actionLoading ? 'در حال...' : 'ایجاد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PartnersTab({ data, loading }: { data: any; loading: boolean }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', type: '', contactPerson: '', phone: '', email: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const rows = data?.rows || (Array.isArray(data) ? data : []);

  const handleCreate = async () => {
    if (!form.name) return;
    setActionLoading(true);
    try {
      const { postBFF } = await import('@/lib/api');
      await postBFF('/api/v1/broker/partners', form);
      setShowModal(false);
      setForm({ name: '', type: '', contactPerson: '', phone: '', email: '' });
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'خطا در ایجاد شریک');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    { key: 'name', header: 'نام', cell: (row: any) => row.name || row.partnerName || '-' },
    { key: 'type', header: 'نوع', cell: (row: any) => row.type || row.partnerType || '-' },
    { key: 'contactPerson', header: 'شخص مسئول', cell: (row: any) => row.contactPerson || '-' },
    { key: 'phone', header: 'تلفن', cell: (row: any) => row.phone || '-' },
    { key: 'status', header: 'وضعیت', cell: (row: any) => row.status || '-' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-h3 font-semibold text-text-primary">شرکا</h2>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="ml-1 h-4 w-4" /> شریک جدید
        </Button>
      </div>
      {rows.length > 0 ? (
        <Card className="p-4">
          <DataTable columns={columns} rows={rows} keyExtractor={(row: any) => row.id || row.partnerId} loading={loading} />
        </Card>
      ) : (
        <p className="text-text-muted">شریکی یافت نشد</p>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-raised rounded-xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-text-primary">شریک جدید</h3>
              <button onClick={() => setShowModal(false)}><X className="h-5 w-5 text-text-muted" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-text-muted">نام</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-border-default rounded-lg p-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-text-muted">نوع همکاری</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full border border-border-default rounded-lg p-2 text-sm">
                  <option value="">انتخاب...</option>
                  <option value="INSURER">بیمه‌گر</option>
                  <option value="REINSURER">بیمه اتکایی</option>
                  <option value="BROKER">کارزار</option>
                  <option value="AGENT">نماینده</option>
                  <option value="SERVICE_PROVIDER">ارائه‌دهنده خدمت</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-text-muted">شخص مسئول</label>
                <input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  className="w-full border border-border-default rounded-lg p-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-text-muted">تلفن</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-border-default rounded-lg p-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-text-muted">ایمیل</label>
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-border-default rounded-lg p-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowModal(false)} className="px-3 py-1.5 text-sm text-text-secondary rounded-lg">انصراف</button>
              <button onClick={handleCreate} disabled={actionLoading || !form.name}
                className="px-3 py-1.5 text-sm bg-brand-primary text-text-on-brand rounded-lg disabled:opacity-50">
                {actionLoading ? 'در حال...' : 'ایجاد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
