'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, FileText, DollarSign, ShieldAlert, BarChart3, ChevronLeft, Users, UsersRound, LayoutDashboard, Plus, X, Activity, TrendingUp, Phone, Mail, ArrowUpRight, Sparkles, Upload, Download, Trash2, CheckCircle, Clock, FileCheck, Search, GitCompare, Award, UserCircle, FileStack } from 'lucide-react';
import { Button, Card, DataTable, SubAgentTree, CommissionLedgerCard, BrandWrapper, PolicyTimeline, ConsentPanel, type SubAgentNode, type CommissionLine, type BrandConfig, type TimelineEvent, type ConsentPurpose } from '@insurance/design-system';
import { cn } from '@insurance/ui-utils';
import { fetchBFF } from '@/lib/api';
import { CopilotPanel } from '@/components/CopilotPanel';
import {
  mockBrokerDashboard, mockAgreements, mockBrokerOfferings,
  mockPlacements, mockSettlements, mockBrokerClaims, mockContracts,
  mockBrokerSubAgents, mockBrokerPartners, mockBrokerDocuments,
  mockSubAgentHierarchy, mockBrokerQuotes, mockBrokerPolicies,
  mockBrokerBrandSettings, mockCustomers, mockSubmissions, mockCommissions,
  mockBrokerCapabilities, formatToman,
} from '@/lib/mock-data';

type Tab = 'dashboard' | 'agreements' | 'offerings' | 'placements' | 'settlements' | 'claims' | 'contracts' | 'subAgents' | 'partners' | 'documents' | 'subAgentTree' | 'customers' | 'submissions' | 'quotes' | 'commissions' | 'policies' | 'brandSettings';

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
  documents: '/api/v1/broker/documents',
  subAgentTree: '/api/v1/broker/sub-agents/hierarchy',
  customers: '/api/v1/broker/customers',
  submissions: '/api/v1/broker/submissions',
  quotes: '/api/v1/broker/quotes',
  commissions: '/api/v1/broker/commissions',
  policies: '/api/v1/broker/policies',
  brandSettings: '/api/v1/broker/brand-settings',
};

const tabTitles: Record<Tab, { label: string; icon: any }> = {
  dashboard: { label: 'داشبورد', icon: LayoutDashboard },
  agreements: { label: 'قراردادهای بیمه‌گر', icon: Briefcase },
  offerings: { label: 'محصولات کارگزاری', icon: FileText },
  submissions: { label: 'درخواست‌ها', icon: FileStack },
  quotes: { label: 'مقایسه قیمت‌ها', icon: GitCompare },
  placements: { label: 'سفارش‌ها', icon: BarChart3 },
  policies: { label: 'بیمه‌نامه‌ها', icon: FileCheck },
  settlements: { label: 'تسویه‌ها', icon: DollarSign },
  commissions: { label: 'پورسانت‌ها', icon: TrendingUp },
  claims: { label: 'پرونده‌های خسارت', icon: ShieldAlert },
  contracts: { label: 'قراردادها', icon: FileText },
  customers: { label: 'مشتریان', icon: UserCircle },
  subAgents: { label: 'نمایندگان فرعی', icon: Users },
  partners: { label: 'شرکا', icon: UsersRound },
  documents: { label: 'مدارک و مستندات', icon: Upload },
  subAgentTree: { label: 'درخت نمایندگان', icon: Users },
  brandSettings: { label: 'تنظیمات برند', icon: Award },
};

const brokerBrand: BrandConfig = {
  brandKey: 'broker-operations',
  displayNameFa: 'عملیات کارگزاری بیمه',
  primaryColor: '#1d4ed8',
  secondaryColor: '#4f46e5',
  fontFamily: 'vazirmatn',
  direction: 'rtl',
  calendar: 'jalali',
  currency: 'تومان',
  footerText: '© ۱۴۰۳ عملیات کارگزاری',
  legalText: 'تمامی حقوق محفوظ است',
};

export default function BrokerPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('agreements');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [capabilities, setCapabilities] = useState<string[]>(mockBrokerCapabilities);

  useEffect(() => {
    fetchBFF('/api/v1/broker/capabilities')
      .then((res: any) => {
        const caps = res?.data || res;
        if (Array.isArray(caps) && caps.length > 0) setCapabilities(caps);
      })
      .catch(() => { /* use mock capabilities */ });
  }, []);

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
      const mockMap: Record<string, any> = {
        dashboard: mockBrokerDashboard,
        agreements: mockAgreements,
        offerings: mockBrokerOfferings,
        placements: mockPlacements,
        settlements: mockSettlements,
        claims: mockBrokerClaims,
        contracts: mockContracts,
        subAgents: mockBrokerSubAgents,
        partners: mockBrokerPartners,
        documents: mockBrokerDocuments,
        subAgentTree: mockSubAgentHierarchy,
        customers: { rows: mockCustomers },
        submissions: { rows: mockSubmissions },
        quotes: mockBrokerQuotes,
        commissions: { rows: mockCommissions },
        policies: mockBrokerPolicies,
        brandSettings: mockBrokerBrandSettings,
      };
      setData(mockMap[activeTab] || {});
    } finally {
      setLoading(false);
    }
  };

  const tabs = Object.entries(tabTitles)
    .map(([key, value]) => ({ key: key as Tab, ...value }))
    .filter(tab => capabilities.includes(tab.key));

  return (
    <BrandWrapper brand={brokerBrand}>
      <header className="sticky top-0 z-10 border-b border-border-default bg-bg-raised shadow-1">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
            <ChevronLeft className="h-5 w-5" />
            بازگشت
          </Button>
          <h1 className="text-h3 font-bold text-text-primary">عملیات کارگزاری</h1>
          <div className="mr-auto">
            <button onClick={() => setCopilotOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-brand-primary/10 px-3 py-1.5 text-sm font-medium text-brand-primary hover:bg-brand-primary/20">
              <Sparkles className="h-4 w-4" /> دستیار هوشمند
            </button>
          </div>
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
          <div className="mb-4 rounded-lg border border-feedback-warning/30 bg-feedback-warning-subtle p-3 text-body-sm text-feedback-warning">
            در حال نمایش داده‌های نمونه — ارتباط با سرور برقرار نشد
          </div>
        )}

        {activeTab === 'dashboard' && <DashboardTab data={data} loading={loading} />}
        {activeTab === 'subAgents' && <SubAgentsTab data={data} loading={loading} />}
        {activeTab === 'partners' && <PartnersTab data={data} loading={loading} />}
        {activeTab === 'agreements' && <AgreementsTab data={data} loading={loading} />}
        {activeTab === 'offerings' && <BrokerOfferingsTab data={data} loading={loading} />}
        {activeTab === 'placements' && <PlacementsTab data={data} loading={loading} />}
        {activeTab === 'settlements' && <SettlementsTab data={data} loading={loading} />}
        {activeTab === 'claims' && <BrokerClaimsTab data={data} loading={loading} />}
        {activeTab === 'contracts' && <ContractsTab data={data} loading={loading} />}
        {activeTab === 'documents' && <DocumentsTab data={data} loading={loading} />}
        {activeTab === 'subAgentTree' && <SubAgentTreeTab data={data} loading={loading} />}
        {activeTab === 'customers' && <CustomersTab data={data} loading={loading} />}
        {activeTab === 'submissions' && <SubmissionsTab data={data} loading={loading} />}
        {activeTab === 'quotes' && <QuotesTab data={data} loading={loading} />}
        {activeTab === 'commissions' && <CommissionsTab data={data} loading={loading} />}
        {activeTab === 'policies' && <PoliciesTab data={data} loading={loading} />}
        {activeTab === 'brandSettings' && <BrandSettingsTab data={data} loading={loading} />}
      </main>
      <CopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} endpoint="/api/v1/broker/copilot/chat" />
    </BrandWrapper>
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
    { label: 'قراردادهای فعال', value: stats.activeAgreements ?? stats.agreements ?? '-', icon: Briefcase, bg: 'bg-brand-primary-subtle', textColor: 'text-brand-primary' },
    { label: 'سفارش‌های جاری', value: stats.activePlacements ?? stats.placements ?? '-', icon: BarChart3, bg: 'bg-brand-primary-subtle', textColor: 'text-brand-primary' },
    { label: 'تسویه‌های در انتظار', value: stats.pendingSettlements ?? stats.settlements ?? '-', icon: DollarSign, bg: 'bg-feedback-warning-subtle', textColor: 'text-feedback-warning' },
    { label: 'پرونده‌های خسارت', value: stats.activeClaims ?? stats.claims ?? '-', icon: ShieldAlert, bg: 'bg-feedback-error-subtle', textColor: 'text-feedback-error' },
    { label: 'نمایندگان فرعی', value: stats.subAgents ?? '-', icon: Users, bg: 'bg-brand-secondary-subtle', textColor: 'text-brand-secondary' },
    { label: 'شرکا', value: stats.partners ?? '-', icon: UsersRound, bg: 'bg-brand-primary-subtle', textColor: 'text-brand-primary' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-h3 font-semibold text-text-primary">داشبورد کارگزاری</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="p-5">
              <div className="flex items-center justify-between">
                <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', card.bg)}>
                  <Icon className={cn('h-6 w-6', card.textColor)} />
                </div>
                <ArrowUpRight className="h-4 w-4 text-feedback-success" />
              </div>
              <p className="mt-3 text-body-sm text-text-secondary">{card.label}</p>
              <p className="mt-1 text-h4 font-bold text-text-primary">{card.value}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {stats.monthlyChartData && Array.isArray(stats.monthlyChartData) && (
          <Card className="p-5 lg:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-brand-primary" />
              <h3 className="text-sm font-semibold text-text-primary">عملکرد ماهانه</h3>
            </div>
            <div className="flex items-end justify-between gap-3" style={{ height: '200px' }}>
              {stats.monthlyChartData.map((item: any) => {
                const maxVal = Math.max(...stats.monthlyChartData.map((d: any) => d.commissions));
                const heightPct = Math.round((item.commissions / maxVal) * 100);
                return (
                  <div key={item.month} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-[10px] font-medium text-text-muted">{formatToman(item.commissions).replace(' تومان', '')}</span>
                    <div className="flex w-full flex-col justify-end" style={{ height: '140px' }}>
                      <div className="w-full rounded-t-lg bg-brand-primary transition-all" style={{ height: `${heightPct}%` }} />
                    </div>
                    <span className="text-xs text-text-secondary">{item.month}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {stats.recentActivity && Array.isArray(stats.recentActivity) && stats.recentActivity.length > 0 && (
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-brand-primary" />
              <h3 className="text-sm font-semibold text-text-primary">فعالیت‌های اخیر</h3>
            </div>
            <div className="space-y-3">
              {stats.recentActivity.map((activity: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand-primary" />
                  <div className="flex-1">
                    <p className="text-xs text-text-primary">{activity.description || activity.action || '-'}</p>
                    <p className="mt-0.5 text-[10px] text-text-muted">{activity.timestamp || activity.date || ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
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
    { key: 'status', header: 'وضعیت', cell: (row: any) => <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', row.status === 'فعال' ? 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success' : 'border-border-default bg-bg-base text-text-muted')}>{row.status || '-'}</span> },
    { key: 'policies', header: 'بیمه‌نامه', cell: (row: any) => row.policies || '-' },
    { key: 'region', header: 'منطقه', cell: (row: any) => row.region || '-' },
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
        <div className="fixed inset-0 bg-bg-base/60 flex items-center justify-center z-50 p-4">
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
    { key: 'email', header: 'ایمیل', cell: (row: any) => row.email || '-' },
    { key: 'status', header: 'وضعیت', cell: (row: any) => <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', row.status === 'فعال' ? 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success' : 'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning')}>{row.status || '-'}</span> },
    { key: 'totalPolicies', header: 'بیمه‌نامه‌ها', cell: (row: any) => row.totalPolicies || '-' },
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
        <div className="fixed inset-0 bg-bg-base/60 flex items-center justify-center z-50 p-4">
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

function AgreementsTab({ data, loading }: { data: any; loading: boolean }) {
  const rows = data?.rows || (Array.isArray(data) ? data : []);
  const columns = [
    { key: 'agreementId', header: 'شماره', cell: (row: any) => <span className="font-medium text-text-primary">{row.agreementId || row.id || '-'}</span> },
    { key: 'carrierName', header: 'بیمه‌گر', cell: (row: any) => row.carrierName || '-' },
    { key: 'agreementType', header: 'نوع قرارداد', cell: (row: any) => row.agreementType || row.type || '-' },
    { key: 'commissionRate', header: 'نرخ پورسانت', cell: (row: any) => <span className="inline-flex items-center rounded-lg bg-brand-primary/10 px-2 py-0.5 text-xs font-medium text-brand-primary">{row.commissionRate || '-'}</span> },
    { key: 'startDate', header: 'شروع', cell: (row: any) => <span className="text-text-muted">{row.startDate || '-'}</span> },
    { key: 'endDate', header: 'پایان', cell: (row: any) => <span className="text-text-muted">{row.endDate || '-'}</span> },
    { key: 'products', header: 'محصولات', cell: (row: any) => row.products || '-' },
    { key: 'totalPolicies', header: 'بیمه‌نامه‌ها', cell: (row: any) => row.totalPolicies || '-' },
    { key: 'status', header: 'وضعیت', cell: (row: any) => <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', row.status === 'فعال' ? 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success' : 'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning')}>{row.status || '-'}</span> },
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-h3 font-semibold text-text-primary">قراردادهای بیمه‌گر</h2>
      <DataTable columns={columns} rows={rows} keyExtractor={(row: any) => row.agreementId || row.id} loading={loading} />
    </div>
  );
}

function BrokerOfferingsTab({ data, loading }: { data: any; loading: boolean }) {
  const rows = data?.rows || (Array.isArray(data) ? data : []);
  const columns = [
    { key: 'productName', header: 'نام محصول', cell: (row: any) => <span className="font-medium text-text-primary">{row.productName || '-'}</span> },
    { key: 'carrierName', header: 'بیمه‌گر', cell: (row: any) => row.carrierName || '-' },
    { key: 'premiumRange', header: 'محدوده حق بیمه', cell: (row: any) => row.premiumRange || '-' },
    { key: 'category', header: 'دسته‌بندی', cell: (row: any) => <span className="inline-flex items-center rounded-lg bg-bg-subtle px-2 py-0.5 text-xs text-text-secondary">{row.category || '-'}</span> },
    { key: 'commissionRate', header: 'نرخ پورسانت', cell: (row: any) => <span className="inline-flex items-center rounded-lg bg-brand-primary/10 px-2 py-0.5 text-xs font-medium text-brand-primary">{row.commissionRate || '-'}</span> },
    { key: 'status', header: 'وضعیت', cell: (row: any) => <span className="inline-flex items-center rounded-full border border-feedback-success/30 bg-feedback-success-subtle px-2.5 py-0.5 text-xs font-medium text-feedback-success">{row.status || '-'}</span> },
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-h3 font-semibold text-text-primary">محصولات کارگزاری</h2>
      <DataTable columns={columns} rows={rows} keyExtractor={(row: any) => row.offeringId || row.id} loading={loading} />
    </div>
  );
}

function PlacementsTab({ data, loading }: { data: any; loading: boolean }) {
  const rows = data?.rows || (Array.isArray(data) ? data : []);
  const columns = [
    { key: 'placementNumber', header: 'شماره سفارش', cell: (row: any) => <span className="font-medium text-text-primary">{row.placementNumber || row.id || '-'}</span> },
    { key: 'customerName', header: 'مشتری', cell: (row: any) => row.customerName || '-' },
    { key: 'productName', header: 'محصول', cell: (row: any) => row.productName || '-' },
    { key: 'carrierName', header: 'بیمه‌گر', cell: (row: any) => row.carrierName || '-' },
    { key: 'premium', header: 'حق بیمه', cell: (row: any) => <span className="font-medium text-text-primary">{row.premium ? formatToman(row.premium) : '-'}</span> },
    { key: 'policyNumber', header: 'شماره بیمه‌نامه', cell: (row: any) => row.policyNumber || '-' },
    { key: 'status', header: 'وضعیت', cell: (row: any) => <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', row.status === 'صادر شده' ? 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success' : row.status === 'در حال صدور' ? 'border-brand-primary/30 bg-brand-primary-subtle text-brand-primary' : 'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning')}>{row.status || '-'}</span> },
    { key: 'date', header: 'تاریخ', cell: (row: any) => <span className="text-text-muted">{row.date || '-'}</span> },
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-h3 font-semibold text-text-primary">سفارش‌ها</h2>
      <DataTable columns={columns} rows={rows} keyExtractor={(row: any) => row.placementId || row.id} loading={loading} />
    </div>
  );
}

function SettlementsTab({ data, loading }: { data: any; loading: boolean }) {
  const rows = data?.rows || (Array.isArray(data) ? data : []);
  const totalSettled = rows.filter((r: any) => r.status === 'تسویه شده').reduce((s: number, r: any) => s + (r.commissionAmount || 0), 0);
  const totalPending = rows.filter((r: any) => r.status === 'در انتظار').reduce((s: number, r: any) => s + (r.commissionAmount || 0), 0);
  const columns = [
    { key: 'period', header: 'دوره', cell: (row: any) => <span className="font-medium text-text-primary">{row.period || '-'}</span> },
    { key: 'carrierName', header: 'بیمه‌گر', cell: (row: any) => row.carrierName || '-' },
    { key: 'totalPremium', header: 'کل حق بیمه', cell: (row: any) => <span className="text-text-muted">{row.totalPremium ? formatToman(row.totalPremium) : '-'}</span> },
    { key: 'commissionAmount', header: 'مبلغ پورسانت', cell: (row: any) => <span className="font-medium text-text-primary">{row.commissionAmount ? formatToman(row.commissionAmount) : '-'}</span> },
    { key: 'status', header: 'وضعیت', cell: (row: any) => <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', row.status === 'تسویه شده' ? 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success' : 'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning')}>{row.status || '-'}</span> },
    { key: 'settlementDate', header: 'تاریخ تسویه', cell: (row: any) => <span className="text-text-muted">{row.settlementDate || '-'}</span> },
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-h3 font-semibold text-text-primary">تسویه‌ها</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-feedback-success-subtle"><DollarSign className="h-5 w-5 text-feedback-success" /></div><p className="mt-2 text-xs text-text-secondary">تسویه شده</p><p className="mt-1 text-lg font-bold text-feedback-success">{formatToman(totalSettled)}</p></Card>
        <Card className="p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-feedback-warning-subtle"><DollarSign className="h-5 w-5 text-feedback-warning" /></div><p className="mt-2 text-xs text-text-secondary">در انتظار</p><p className="mt-1 text-lg font-bold text-feedback-warning">{formatToman(totalPending)}</p></Card>
      </div>
      <DataTable columns={columns} rows={rows} keyExtractor={(row: any) => row.settlementId || row.id} loading={loading} />
    </div>
  );
}

function BrokerClaimsTab({ data, loading }: { data: any; loading: boolean }) {
  const rows = data?.rows || (Array.isArray(data) ? data : []);
  const columns = [
    { key: 'claimNumber', header: 'شماره خسارت', cell: (row: any) => <span className="font-medium text-text-primary">{row.claimNumber || '-'}</span> },
    { key: 'policyNumber', header: 'بیمه‌نامه', cell: (row: any) => row.policyNumber || '-' },
    { key: 'customerName', header: 'مشتری', cell: (row: any) => row.customerName || '-' },
    { key: 'lossType', header: 'نوع خسارت', cell: (row: any) => row.lossType || '-' },
    { key: 'amount', header: 'مبلغ', cell: (row: any) => <span className="font-medium text-text-primary">{row.amount > 0 ? formatToman(row.amount) : '-'}</span> },
    { key: 'status', header: 'وضعیت', cell: (row: any) => <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', row.status === 'تأیید شده' || row.status === 'پرداخت شده' ? 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success' : row.status === 'در حال بررسی' ? 'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning' : 'border-border-default bg-bg-base text-text-muted')}>{row.status || '-'}</span> },
    { key: 'date', header: 'تاریخ', cell: (row: any) => <span className="text-text-muted">{row.date || '-'}</span> },
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-h3 font-semibold text-text-primary">پرونده‌های خسارت</h2>
      <DataTable columns={columns} rows={rows} keyExtractor={(row: any) => row.claimId || row.id} loading={loading} />
    </div>
  );
}

function ContractsTab({ data, loading }: { data: any; loading: boolean }) {
  const rows = data?.rows || (Array.isArray(data) ? data : []);
  const columns = [
    { key: 'contractNumber', header: 'شماره قرارداد', cell: (row: any) => <span className="font-medium text-text-primary">{row.contractNumber || row.id || '-'}</span> },
    { key: 'carrierName', header: 'بیمه‌گر', cell: (row: any) => row.carrierName || '-' },
    { key: 'contractType', header: 'نوع قرارداد', cell: (row: any) => row.contractType || '-' },
    { key: 'startDate', header: 'شروع', cell: (row: any) => <span className="text-text-muted">{row.startDate || '-'}</span> },
    { key: 'endDate', header: 'پایان', cell: (row: any) => <span className="text-text-muted">{row.endDate || '-'}</span> },
    { key: 'value', header: 'ارزش قرارداد', cell: (row: any) => <span className="font-medium text-text-primary">{row.value ? formatToman(row.value) : '-'}</span> },
    { key: 'status', header: 'وضعیت', cell: (row: any) => <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', row.status === 'فعال' ? 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success' : 'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning')}>{row.status || '-'}</span> },
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-h3 font-semibold text-text-primary">قراردادها</h2>
      <DataTable columns={columns} rows={rows} keyExtractor={(row: any) => row.contractId || row.id} loading={loading} />
    </div>
  );
}

function DocumentsTab({ data, loading }: { data: any; loading: boolean }) {
  const rows = data?.rows || (Array.isArray(data) ? data : []);
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCarrier, setFilterCarrier] = useState('');

  const carrierOptions = ['بیمه ایران', 'بیمه آسیه', 'بیمه پاسارگاد', 'بیمه البرز', 'بیمه دانا'];
  const docTypeOptions = ['قرارداد کارگزاری', 'مجوز فعالیت', 'بیمه‌نامه نمونه', 'کارت ملی مدیر', 'سند مالکیت', 'گواهی عدم سوءپیشینه', 'دستورالعمل فروش', 'سند دیگر'];

  const filtered = rows.filter((doc: any) => {
    if (filterCarrier && doc.carrierName !== filterCarrier) return false;
    if (search && !doc.fileName?.includes(search) && !doc.docType?.includes(search)) return false;
    return true;
  });

  const groupedByCarrier = filtered.reduce((acc: Record<string, any[]>, doc: any) => {
    if (!acc[doc.carrierName]) acc[doc.carrierName] = [];
    acc[doc.carrierName].push(doc);
    return acc;
  }, {});

  const statusConfig: Record<string, { className: string; icon: any }> = {
    'تأیید شده': { className: 'bg-feedback-success-subtle text-feedback-success border-feedback-success/30', icon: CheckCircle },
    'در حال بررسی': { className: 'bg-brand-primary-subtle text-brand-primary border-brand-primary/30', icon: Clock },
    'در انتظار': { className: 'bg-feedback-warning-subtle text-feedback-warning border-feedback-warning/30', icon: Clock },
    'رد شده': { className: 'bg-feedback-error-subtle text-feedback-error border-feedback-error/30', icon: X },
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-h3 font-semibold text-text-primary">مدارک و مستندات</h2>
        <Button size="sm" onClick={() => setShowUpload(!showUpload)}>
          <Upload className="ml-1 h-4 w-4" /> آپلود سند
        </Button>
      </div>

      {showUpload && (
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text-primary">آپلود سند جدید</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <select className="rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none">
              <option value="">انتخاب بیمه‌گر...</option>
              {carrierOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none">
              <option value="">نوع سند...</option>
              {docTypeOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border-default px-3 py-2 text-sm text-text-muted hover:border-brand-primary hover:bg-brand-primary/5">
              <Upload className="h-4 w-4" /> انتخاب فایل...
              <input type="file" className="hidden" />
            </label>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setShowUpload(false)}>آپلود</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowUpload(false)}>انصراف</Button>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی سند..."
            className="w-full rounded-lg border border-border-default py-2 pr-9 pl-3 text-sm focus:border-brand-primary focus:outline-none" />
        </div>
        <select value={filterCarrier} onChange={(e) => setFilterCarrier(e.target.value)}
          className="rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none">
          <option value="">همه بیمه‌گرها</option>
          {carrierOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-text-muted text-center py-8">سندی یافت نشد</p>
      ) : (
        <div className="space-y-6">
          {(Object.entries(groupedByCarrier) as [string, any[]][]).map(([carrier, docs]) => (
            <div key={carrier}>
              <div className="mb-3 flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-brand-primary" />
                <h3 className="text-sm font-semibold text-text-primary">{carrier}</h3>
                <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-xs font-medium text-brand-primary">{docs.length} سند</span>
              </div>
              <Card className="p-4">
                <div className="space-y-2">
                  {docs.map((doc) => {
                    const sc = statusConfig[doc.status] || statusConfig['در انتظار'];
                    const StatusIcon = sc.icon;
                    return (
                      <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border-default p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-subtle">
                            <FileText className="h-4 w-4 text-text-muted" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-text-primary">{doc.docType}</p>
                            <p className="text-xs text-text-muted">{doc.fileName} — {doc.fileSize}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-text-muted">{doc.uploadDate}</span>
                          <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium', sc.className)}>
                            <StatusIcon className="h-3 w-3" /> {doc.status}
                          </span>
                          <div className="flex items-center gap-1">
                            <button className="rounded-lg p-1.5 text-text-muted hover:bg-bg-subtle hover:text-brand-primary"><Download className="h-4 w-4" /></button>
                            <button className="rounded-lg p-1.5 text-text-muted hover:bg-feedback-error/10 hover:text-feedback-error"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubAgentTreeTab({ data, loading }: { data: any; loading: boolean }) {
  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-primary" /></div>;
  }

  const rawTree = data?.id ? data : mockSubAgentHierarchy;

  const adaptNode = (node: any): SubAgentNode => ({
    partyId: node.id,
    name: node.name,
    role: node.id === 'root' ? 'broker' : 'sub_agent',
    activePolicyCount: node.policies,
    status: node.status === 'فعال' ? 'active' : 'inactive',
    children: (node.children || []).map((c: any) => adaptNode(c)),
  });

  const treeNodes = [adaptNode(rawTree)];

  return (
    <div className="space-y-4">
      <h2 className="text-h3 font-semibold text-text-primary">درخت سلسله نمایندگان</h2>
      <SubAgentTree nodes={treeNodes} onSelect={(node) => console.log('Selected:', node)} />
    </div>
  );
}

function CustomersTab({ data, loading }: { data: any; loading: boolean }) {
  const rows = data?.rows || (Array.isArray(data) ? data : []);
  const [search, setSearch] = useState('');

  const filtered = rows.filter((c: any) => {
    if (search && !c.name?.includes(search) && !c.phone?.includes(search) && !c.nationalId?.includes(search)) return false;
    return true;
  });

  const columns = [
    { key: 'name', header: 'نام مشتری', cell: (row: any) => <span className="font-medium text-text-primary">{row.name || '-'}</span> },
    { key: 'phone', header: 'تلفن', cell: (row: any) => row.phone || '-' },
    { key: 'nationalId', header: 'کد ملی', cell: (row: any) => row.nationalId || '-' },
    { key: 'policies', header: 'بیمه‌نامه‌ها', cell: (row: any) => <span className="font-medium text-text-primary">{row.policies || 0}</span> },
    { key: 'totalPremium', header: 'کل حق بیمه', cell: (row: any) => <span className="font-medium text-text-primary">{row.totalPremium ? formatToman(row.totalPremium) : '-'}</span> },
    { key: 'status', header: 'وضعیت', cell: (row: any) => (
      <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', row.status === 'فعال' ? 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success' : 'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning')}>{row.status || '-'}</span>
    ) },
    { key: 'lastActivity', header: 'آخرین فعالیت', cell: (row: any) => <span className="text-text-muted">{row.lastActivity || '-'}</span> },
  ];

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-h3 font-semibold text-text-primary">مشتریان</h2>
        <div className="relative w-64">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی مشتری..."
            className="w-full rounded-lg border border-border-default py-2 pr-9 pl-3 text-sm focus:border-brand-primary focus:outline-none" />
        </div>
      </div>
      <DataTable columns={columns} rows={filtered} keyExtractor={(row: any) => row.partyId || row.id} loading={false} />
    </div>
  );
}

function SubmissionsTab({ data, loading }: { data: any; loading: boolean }) {
  const rows = data?.rows || (Array.isArray(data) ? data : []);
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = statusFilter ? rows.filter((s: any) => s.status === statusFilter) : rows;
  const statusOptions = ['در انتظار قیمت‌گذاری', 'قیمت‌گذاری شده', 'تسویه شده', 'صدور شده'];

  const columns = [
    { key: 'submissionNumber', header: 'شماره درخواست', cell: (row: any) => <span className="font-medium text-text-primary">{row.submissionNumber || row.id || '-'}</span> },
    { key: 'customerName', header: 'مشتری', cell: (row: any) => row.customerName || '-' },
    { key: 'productName', header: 'محصول', cell: (row: any) => row.productName || '-' },
    { key: 'carrierName', header: 'بیمه‌گر', cell: (row: any) => row.carrierName || '-' },
    { key: 'premium', header: 'حق بیمه', cell: (row: any) => <span className="font-medium text-text-primary">{row.premium ? formatToman(row.premium) : '-'}</span> },
    { key: 'status', header: 'وضعیت', cell: (row: any) => (
      <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        row.status === 'تسویه شده' || row.status === 'صدور شده' ? 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success' :
        row.status === 'قیمت‌گذاری شده' ? 'border-brand-primary/30 bg-brand-primary-subtle text-brand-primary' :
        'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning')}>{row.status || '-'}</span>
    ) },
    { key: 'createdAt', header: 'تاریخ', cell: (row: any) => <span className="text-text-muted">{row.createdAt || '-'}</span> },
  ];

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-h3 font-semibold text-text-primary">درخواست‌های بیمه</h2>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none">
          <option value="">همه وضعیت‌ها</option>
          {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <DataTable columns={columns} rows={filtered} keyExtractor={(row: any) => row.submissionId || row.id} loading={false} />
    </div>
  );
}

function QuotesTab({ data, loading }: { data: any; loading: boolean }) {
  const rows = data?.rows || (Array.isArray(data) ? data : []);
  const groupedBySubmission = rows.reduce((acc: Record<string, any[]>, q: any) => {
    const key = q.submissionNumber || '—';
    if (!acc[key]) acc[key] = [];
    acc[key].push(q);
    return acc;
  }, {});

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-h3 font-semibold text-text-primary">مقایسه قیمت‌ها</h2>
      {rows.length === 0 ? (
        <p className="text-text-muted text-center py-8">قیمتی برای مقایسه یافت نشد</p>
      ) : (
        <div className="space-y-6">
          {(Object.entries(groupedBySubmission) as [string, any[]][]).map(([submission, quotes]) => {
            const sorted = [...quotes].sort((a, b) => (b.score || 0) - (a.score || 0));
            const best = sorted[0];
            return (
              <div key={submission}>
                <div className="mb-3 flex items-center gap-2">
                  <GitCompare className="h-5 w-5 text-brand-primary" />
                  <h3 className="text-sm font-semibold text-text-primary">{submission}</h3>
                  <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-xs font-medium text-brand-primary">{quotes.length} پیشنهاد</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {sorted.map((q) => {
                    const isBest = q.quoteId === best.quoteId;
                    return (
                      <Card key={q.quoteId} className={cn('p-4', isBest && 'ring-2 ring-brand-primary')}>
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm font-bold text-text-primary">{q.carrierName}</span>
                          {isBest && <span className="rounded-full bg-brand-primary px-2 py-0.5 text-xs font-medium text-text-on-brand">بهترین پیشنهاد</span>}
                          {q.status === 'منقضی' && <span className="rounded-full bg-feedback-error/10 px-2 py-0.5 text-xs font-medium text-feedback-error">منقضی</span>}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-text-muted">حق بیمه:</span> <span className="font-bold text-text-primary">{formatToman(q.premium)}</span></div>
                          <div className="flex justify-between"><span className="text-text-muted">پوشش:</span> <span className="text-text-secondary">{q.coverage}</span></div>
                          <div className="flex justify-between"><span className="text-text-muted">فرانشیز:</span> <span className="text-text-secondary">{q.deductible}</span></div>
                          <div className="flex justify-between"><span className="text-text-muted">پورسانت:</span> <span className="text-text-secondary">{q.commissionRate}</span></div>
                          <div className="flex justify-between"><span className="text-text-muted">امتیاز:</span> <span className="font-medium text-brand-primary">{q.score} / ۱۰۰</span></div>
                          <div className="flex justify-between"><span className="text-text-muted">اعتبار تا:</span> <span className="text-text-muted">{q.validUntil}</span></div>
                        </div>
                        <Button size="sm" variant={isBest ? 'primary' : 'ghost'} fullWidth className="mt-3">انتخاب این پیشنهاد</Button>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CommissionsTab({ data, loading }: { data: any; loading: boolean }) {
  const rows = data?.rows || (Array.isArray(data) ? data : []);
  const totalAmount = rows.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
  const paidAmount = rows.filter((r: any) => r.status === 'پرداخت شده').reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
  const pendingAmount = totalAmount - paidAmount;

  const columns = [
    { key: 'policyNumber', header: 'بیمه‌نامه', cell: (row: any) => <span className="font-medium text-text-primary">{row.policyNumber || '-'}</span> },
    { key: 'carrierName', header: 'بیمه‌گر', cell: (row: any) => row.carrierName || '-' },
    { key: 'premium', header: 'حق بیمه', cell: (row: any) => <span className="text-text-secondary">{row.premium ? formatToman(row.premium) : '-'}</span> },
    { key: 'rate', header: 'نرخ', cell: (row: any) => <span className="text-text-secondary">{row.rate || '-'}</span> },
    { key: 'amount', header: 'مبلغ پورسانت', cell: (row: any) => <span className="font-medium text-text-primary">{row.amount ? formatToman(row.amount) : '-'}</span> },
    { key: 'status', header: 'وضعیت', cell: (row: any) => (
      <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', row.status === 'پرداخت شده' ? 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success' : 'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning')}>{row.status || '-'}</span>
    ) },
    { key: 'dueDate', header: 'سررسید', cell: (row: any) => <span className="text-text-muted">{row.dueDate || '-'}</span> },
  ];

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-h3 font-semibold text-text-primary">پورسانت‌ها</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-text-muted">کل پورسانت</p>
          <p className="mt-1 text-lg font-bold text-text-primary">{formatToman(totalAmount)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-muted">پرداخت شده</p>
          <p className="mt-1 text-lg font-bold text-feedback-success">{formatToman(paidAmount)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-muted">در انتظار</p>
          <p className="mt-1 text-lg font-bold text-feedback-warning">{formatToman(pendingAmount)}</p>
        </Card>
      </div>
      <CommissionLedgerCard
        balanceMinor={totalAmount * 100}
        currency="IRR"
        lines={rows.slice(0, 5).map((r: any, i: number) => ({
          id: `bl-${i}`,
          policyNumber: r.policyNumber,
          policyholder: r.customerName || '—',
          amountMinor: (r.amount || 0) * 100,
          currency: 'IRR' as const,
          type: r.status === 'پرداخت شده' ? 'paid' as const : 'pending' as const,
          period: r.dueDate || '۱۴۰۳/۰۴',
        }))}
        pendingMinor={pendingAmount * 100}
        paidYtdMinor={paidAmount * 100}
      />
      <DataTable columns={columns} rows={rows} keyExtractor={(row: any) => row.commissionId || row.id} loading={false} />
    </div>
  );
}

function PoliciesTab({ data, loading }: { data: any; loading: boolean }) {
  const rows = data?.rows || (Array.isArray(data) ? data : []);
  const [filterCarrier, setFilterCarrier] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);
  const carrierOptions = Array.from(new Set(rows.map((r: any) => r.carrierName).filter(Boolean))) as string[];
  const filtered = filterCarrier ? rows.filter((r: any) => r.carrierName === filterCarrier) : rows;

  const columns = [
    { key: 'policyNumber', header: 'شماره بیمه‌نامه', cell: (row: any) => <span className="font-medium text-text-primary">{row.policyNumber || '-'}</span> },
    { key: 'uniqueCode', header: 'کد یکتا', cell: (row: any) => <span className="text-text-muted">{row.uniqueCode || '-'}</span> },
    { key: 'customerName', header: 'مشتری', cell: (row: any) => row.customerName || '-' },
    { key: 'carrierName', header: 'بیمه‌گر', cell: (row: any) => row.carrierName || '-' },
    { key: 'productName', header: 'محصول', cell: (row: any) => row.productName || '-' },
    { key: 'premium', header: 'حق بیمه', cell: (row: any) => <span className="font-medium text-text-primary">{row.premium ? formatToman(row.premium) : '-'}</span> },
    { key: 'startDate', header: 'شروع', cell: (row: any) => <span className="text-text-muted">{row.startDate || '-'}</span> },
    { key: 'endDate', header: 'پایان', cell: (row: any) => <span className="text-text-muted">{row.endDate || '-'}</span> },
    { key: 'status', header: 'وضعیت', cell: (row: any) => (
      <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', row.status === 'فعال' ? 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success' : 'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning')}>{row.status || '-'}</span>
    ) },
  ];

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-primary" /></div>;
  }

  if (selectedPolicy) {
    const timelineEvents: TimelineEvent[] = [
      { id: 'ev-1', title: 'ثبت درخواست', description: 'درخواست بیمه‌نامه ثبت شد', timestamp: selectedPolicy.createdAt || '۱۴۰۳/۰۱/۰۱', status: 'completed', actor: 'کارشناس فروش' },
      { id: 'ev-2', title: 'پذیرش بیمه‌گر', description: `بیمه‌گر ${selectedPolicy.carrierName} درخواست را پذیرفت`, timestamp: selectedPolicy.startDate || '۱۴۰۳/۰۱/۰۵', status: 'completed', actor: selectedPolicy.carrierName },
      { id: 'ev-3', title: 'صدور بیمه‌نامه', description: `بیمه‌نامه ${selectedPolicy.policyNumber} صادر شد`, timestamp: selectedPolicy.startDate || '۱۴۰۳/۰۱/۱۰', status: 'completed', actor: 'سیستم صدور' },
      { id: 'ev-4', title: 'پرداخت حق بیمه', description: 'حق بیمه پرداخت شد', timestamp: selectedPolicy.startDate || '۱۴۰۳/۰۱/۱۲', status: 'completed', actor: 'مشتری' },
      { id: 'ev-5', title: 'در حال اعتبار', description: 'بیمه‌نامه فعال است', timestamp: selectedPolicy.endDate || '۱۴۰۳/۱۲/۲۹', status: 'current', actor: 'سیستم' },
      { id: 'ev-6', title: 'تمدید بیمه‌نامه', description: 'نیاز به تمدید قبل از انقضا', timestamp: selectedPolicy.endDate || '۱۴۰۳/۱۲/۲۹', status: 'pending', actor: 'سیستم' },
    ];
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedPolicy(null)}>
            <ChevronLeft className="h-5 w-5" /> بازگشت
          </Button>
          <h2 className="text-h3 font-semibold text-text-primary">جزئیات بیمه‌نامه {selectedPolicy.policyNumber}</h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">اطلاعات بیمه‌نامه</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-text-muted">شماره:</span> <span className="font-medium text-text-primary">{selectedPolicy.policyNumber || '-'}</span></div>
              <div><span className="text-text-muted">کد یکتا:</span> <span className="font-medium text-text-primary">{selectedPolicy.uniqueCode || '-'}</span></div>
              <div><span className="text-text-muted">مشتری:</span> <span className="text-text-primary">{selectedPolicy.customerName || '-'}</span></div>
              <div><span className="text-text-muted">بیمه‌گر:</span> <span className="text-text-primary">{selectedPolicy.carrierName || '-'}</span></div>
              <div><span className="text-text-muted">محصول:</span> <span className="text-text-primary">{selectedPolicy.productName || '-'}</span></div>
              <div><span className="text-text-muted">حق بیمه:</span> <span className="font-medium text-text-primary">{selectedPolicy.premium ? formatToman(selectedPolicy.premium) : '-'}</span></div>
              <div><span className="text-text-muted">شروع:</span> <span className="text-text-secondary">{selectedPolicy.startDate || '-'}</span></div>
              <div><span className="text-text-muted">پایان:</span> <span className="text-text-secondary">{selectedPolicy.endDate || '-'}</span></div>
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-text-primary">چرخه حیات بیمه‌نامه</h3>
            <PolicyTimeline events={timelineEvents} />
          </Card>
        </div>
      </div>
    );
  }

  const columnsWithClick = [...columns, {
    key: 'actions', header: '', cell: (row: any) => (
      <button onClick={() => setSelectedPolicy(row)} className="text-xs text-brand-primary hover:underline">مشاهده جزئیات</button>
    )
  }];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-h3 font-semibold text-text-primary">بیمه‌نامه‌ها</h2>
        <select value={filterCarrier} onChange={(e) => setFilterCarrier(e.target.value)}
          className="rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none">
          <option value="">همه بیمه‌گرها</option>
          {carrierOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <DataTable columns={columnsWithClick} rows={filtered} keyExtractor={(row: any) => row.policyId || row.id} loading={false} />
    </div>
  );
}

function BrandSettingsTab({ data, loading }: { data: any; loading: boolean }) {
  const [settings, setSettings] = useState<any>(data || {});
  const [saved, setSaved] = useState(false);
  const [brokerConsents, setBrokerConsents] = useState<ConsentPurpose[]>([
    { purpose: 'share-data-carrier', title: 'اشتراک داده با بیمه‌گر', description: 'اشتراک اطلاعات مشتری با بیمه‌گر جهت قیمت‌گذاری و صدور بیمه‌نامه', dataTypes: ['هویت', 'مخاطرات', 'سابقه خسارت'], granted: true, validFrom: '2024-01-01', validTo: '2025-01-01' },
    { purpose: 'credit-check', title: 'بررسی اعتباری', description: 'استعلام اعتبار مشتری جهت تأیید پرداخت اقساط', dataTypes: ['کد ملی', 'سابقه مالی'], granted: true, validFrom: '2024-01-01' },
    { purpose: 'marketing', title: 'بازاریابی و ارتباطات', description: 'ارسال پیشنهادات و اخبار بیمه‌ای از طریق پیامک و ایمیل', dataTypes: ['موبایل', 'ایمیل'], granted: false },
    { purpose: 'data-analysis', title: 'تحلیل داده', description: 'استفاده از داده‌ها برای بهبود خدمات و تحلیل ریسک', dataTypes: ['پروفایل', 'تاریخچه'], granted: true, validFrom: '2024-01-01' },
  ]);

  useEffect(() => {
    if (data && Object.keys(data).length > 0) setSettings(data);
  }, [data]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-primary" /></div>;
  }

  const update = (key: string, value: any) => {
    setSettings({ ...settings, [key]: value });
    setSaved(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-h3 font-semibold text-text-primary">تنظیمات برند</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">اطلاعات هویتی</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">نام نمایشی (فارسی)</label>
              <input value={settings.displayNameFa || ''} onChange={(e) => update('displayNameFa', e.target.value)}
                className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">نام نمایشی (انگلیسی)</label>
              <input value={settings.displayNameEn || ''} onChange={(e) => update('displayNameEn', e.target.value)}
                className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" dir="ltr" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">دامنه</label>
              <input value={settings.domain || ''} onChange={(e) => update('domain', e.target.value)}
                className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" dir="ltr" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">آدرس لوگو</label>
              <input value={settings.logoUrl || ''} onChange={(e) => update('logoUrl', e.target.value)}
                className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" dir="ltr" />
            </div>
          </div>
        </Card>
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">تنظیمات ارتباطی و نمایش</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">تلفن پشتیبانی</label>
              <input value={settings.supportPhone || ''} onChange={(e) => update('supportPhone', e.target.value)}
                className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" dir="ltr" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">ایمیل پشتیبانی</label>
              <input value={settings.supportEmail || ''} onChange={(e) => update('supportEmail', e.target.value)}
                className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" dir="ltr" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">رنگ اصلی برند</label>
              <div className="flex items-center gap-2">
                <input type="color" value={settings.primaryColor || '#1a56db'} onChange={(e) => update('primaryColor', e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded-lg border border-border-default" />
                <input value={settings.primaryColor || ''} onChange={(e) => update('primaryColor', e.target.value)}
                  className="flex-1 rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" dir="ltr" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">RTL</label>
                <select value={settings.rtl ? 'true' : 'false'} onChange={(e) => update('rtl', e.target.value === 'true')}
                  className="w-full rounded-lg border border-border-default px-2 py-2 text-sm focus:border-brand-primary focus:outline-none">
                  <option value="true">بله</option>
                  <option value="false">خیر</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">تقویم</label>
                <select value={settings.calendarType || 'jalali'} onChange={(e) => update('calendarType', e.target.value)}
                  className="w-full rounded-lg border border-border-default px-2 py-2 text-sm focus:border-brand-primary focus:outline-none">
                  <option value="jalali">جلالی</option>
                  <option value="gregorian">میلادی</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">ارز</label>
                <select value={settings.defaultCurrency || 'IRT'} onChange={(e) => update('defaultCurrency', e.target.value)}
                  className="w-full rounded-lg border border-border-default px-2 py-2 text-sm focus:border-brand-primary focus:outline-none">
                  <option value="IRT">تومان</option>
                  <option value="IRR">ریال</option>
                </select>
              </div>
            </div>
          </div>
        </Card>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={() => setSaved(true)}>ذخیره تغییرات</Button>
        {saved && <span className="flex items-center gap-1 text-sm text-feedback-success"><CheckCircle className="h-4 w-4" /> تنظیمات ذخیره شد</span>}
      </div>

      <ConsentPanel
        consents={brokerConsents}
        onChange={(purpose, granted) => {
          setBrokerConsents(prev => prev.map(c => c.purpose === purpose ? { ...c, granted } : c));
        }}
        onRevokeAll={() => setBrokerConsents(prev => prev.map(c => ({ ...c, granted: false })))}
      />
    </div>
  );
}
