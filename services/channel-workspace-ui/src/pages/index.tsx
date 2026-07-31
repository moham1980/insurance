'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, FileText, Users, DollarSign, ChevronLeft, Plus, Handshake, LayoutDashboard } from 'lucide-react';
import { Button, Card, DataTable } from '@insurance/design-system';
import { cn } from '@insurance/ui-utils';
import { fetchBFF } from '@/lib/api';

type Tab = 'overview' | 'offerings' | 'submissions' | 'commissions' | 'customers' | 'dashboard' | 'subAgents' | 'partners';

const tabPaths: Record<Tab, string> = {
  overview: '/api/v1/channel/workspaces/mine',
  offerings: '/api/v1/channel/offerings',
  submissions: '/api/v1/channel/submissions',
  commissions: '/api/v1/channel/commissions',
  customers: '/api/v1/channel/customers',
  dashboard: '/api/v1/channel/dashboard',
  subAgents: '/api/v1/channel/sub-agents',
  partners: '/api/v1/channel/partners',
};

const tabTitles: Record<Tab, { label: string; icon: any }> = {
  overview: { label: 'نمای کلی', icon: Briefcase },
  offerings: { label: 'محصولات مجاز', icon: FileText },
  submissions: { label: 'درخواست‌ها', icon: Plus },
  commissions: { label: 'پورسانت‌ها', icon: DollarSign },
  customers: { label: 'مشتریان', icon: Users },
  dashboard: { label: 'داشبورد', icon: LayoutDashboard },
  subAgents: { label: 'نمایندگان فرعی', icon: Users },
  partners: { label: 'شرکا', icon: Handshake },
};

export default function ChannelWorkspacePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
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

  return (
    <div className="min-h-screen bg-bg-base">
      <header className="sticky top-0 z-10 border-b border-border-default bg-bg-raised shadow-1">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
            <ChevronLeft className="h-5 w-5" />
            بازگشت
          </Button>
          <h1 className="text-h3 font-bold text-text-primary">پرتال کانال فروش</h1>
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

        {activeTab === 'overview' && <OverviewTab data={data} loading={loading} />}
        {activeTab === 'offerings' && <SimpleTableTab data={data} loading={loading} keyField="offeringId" title={tabTitles.offerings.label} />}
        {activeTab === 'submissions' && <SubmissionsTab data={data} loading={loading} />}
        {activeTab === 'commissions' && <SimpleTableTab data={data} loading={loading} keyField="commissionId" title={tabTitles.commissions.label} />}
        {activeTab === 'customers' && <SimpleTableTab data={data} loading={loading} keyField="partyId" title={tabTitles.customers.label} />}
        {activeTab === 'dashboard' && <ChannelDashboardTab data={data} loading={loading} />}
        {activeTab === 'subAgents' && <SimpleTableTab data={data} loading={loading} keyField="agentId" title={tabTitles.subAgents.label} />}
        {activeTab === 'partners' && <SimpleTableTab data={data} loading={loading} keyField="partnerId" title={tabTitles.partners.label} />}
      </main>
    </div>
  );
}

function OverviewTab({ data, loading }: { data: any; loading: boolean }) {
  if (loading) return <Loading />;
  const rows = Array.isArray(data) ? data : [];
  return (
    <div className="space-y-4">
      <h2 className="text-h3 font-semibold text-text-primary">workspaceهای من</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((ws: any) => (
          <Card key={ws.workspaceId} className="p-4">
            <p className="font-semibold text-text-primary">{ws.channelType}</p>
            <p className="text-body-sm text-text-secondary">برند: {ws.brandKey}</p>
            <p className="text-body-sm text-text-secondary">وضعیت: {ws.status}</p>
          </Card>
        ))}
      </div>
      {rows.length === 0 && <p className="text-text-muted">workspace‌ای یافت نشد</p>}
    </div>
  );
}

function SubmissionsTab({ data, loading }: { data: any; loading: boolean }) {
  const rows = data?.rows || [];
  const columns = [
    { key: 'submissionNumber', header: 'شماره', cell: (row: any) => row.submissionNumber || row.id || '-' },
    { key: 'productName', header: 'محصول', cell: (row: any) => row.productName || '-' },
    { key: 'status', header: 'وضعیت', cell: (row: any) => row.status || '-' },
    { key: 'createdAt', header: 'تاریخ', cell: (row: any) => row.createdAt || '-' },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-h3 font-semibold text-text-primary">درخواست‌ها</h2>
        <Button size="sm">
          <Plus className="ml-1 h-4 w-4" /> درخواست جدید
        </Button>
      </div>
      <DataTable columns={columns} rows={rows} keyExtractor={(row: any) => row.submissionId || row.id} loading={loading} />
    </div>
  );
}

function SimpleTableTab({ data, loading, keyField, title }: { data: any; loading: boolean; keyField: string; title: string }) {
  const rows = data?.rows || (Array.isArray(data) ? data : []);
  const keys = rows.length > 0 ? Object.keys(rows[0]).slice(0, 6) : [];
  const columns = keys.map((key) => ({ key, header: key, cell: (row: any) => String(row[key] ?? '-') }));
  return (
    <div className="space-y-4">
      <h2 className="text-h3 font-semibold text-text-primary">{title}</h2>
      {rows.length > 0 ? (
        <DataTable columns={columns} rows={rows} keyExtractor={(row: any) => row[keyField] || row.id || JSON.stringify(row)} loading={loading} />
      ) : (
        <p className="text-text-muted">داده‌ای یافت نشد</p>
      )}
    </div>
  );
}

function Loading() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-primary" />
    </div>
  );
}

function ChannelDashboardTab({ data, loading }: { data: any; loading: boolean }) {
  if (loading) return <Loading />;
  const stats = data?.stats || data || {};
  const cards = [
    { label: 'درخواست‌های فعال', value: stats.activeSubmissions ?? stats.submissions ?? '-', icon: Plus },
    { label: 'پورسانت کل', value: stats.totalCommissions ?? stats.commissions ?? '-', icon: DollarSign },
    { label: 'مشتریان', value: stats.totalCustomers ?? stats.customers ?? '-', icon: Users },
    { label: 'محصولات مجاز', value: stats.totalOfferings ?? stats.offerings ?? '-', icon: FileText },
  ];
  return (
    <div className="space-y-6">
      <h2 className="text-h3 font-semibold text-text-primary">داشبورد کانال فروش</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
    </div>
  );
}
