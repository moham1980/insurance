'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase, FileText, Users, DollarSign, ChevronLeft, Plus,
  UsersRound, LayoutDashboard, Search, Phone, Mail, TrendingUp,
  Shield, Award, Target, ArrowUpRight, CheckCircle, Activity, BarChart3,
  Sparkles, FileCheck, Upload, Clock, Download, FileStack, Wallet,
} from 'lucide-react';
import { Button, Card, DataTable, SubmissionWizard, QuoteComparisonTable, SubAgentTree, CommissionLedgerCard, PolicyTimeline, BrandWrapper, ConsentPanel, CarrierSelector, type SubAgentNode, type WizardStep, type QuoteComparisonItem, type CommissionLine, type TimelineEvent, type BrandConfig, type ConsentPurpose, type CarrierOption } from '@insurance/design-system';
import { cn } from '@insurance/ui-utils';
import { fetchBFF, postBFF } from '@/lib/api';
import { CopilotPanel } from '@/components/CopilotPanel';
import {
  mockWorkspaces, mockOfferings, mockSubmissions, mockCommissions,
  mockCustomers, mockSubAgents, mockPartners, mockDashboardStats,
  mockSubAgentHierarchy, mockChannelCapabilities, formatToman,
  mockSettlements, mockBrokerDocuments,
} from '@/lib/mock-data';

type Tab = 'overview' | 'offerings' | 'submissions' | 'quotes' | 'placements' | 'commissions' | 'settlements' | 'customers' | 'claims' | 'dashboard' | 'subAgents' | 'partners' | 'documents' | 'brandSettings';

const tabTitles: Record<Tab, { label: string; icon: any }> = {
  overview: { label: 'نمای کلی', icon: Briefcase },
  offerings: { label: 'محصولات مجاز', icon: FileText },
  submissions: { label: 'درخواست‌ها', icon: Plus },
  quotes: { label: 'قیمت‌گذاری', icon: Shield },
  placements: { label: 'صدور و مستندات', icon: FileText },
  commissions: { label: 'پورسانت‌ها', icon: DollarSign },
  customers: { label: 'مشتریان', icon: Users },
  claims: { label: 'خسارت‌ها', icon: Target },
  dashboard: { label: 'داشبورد', icon: LayoutDashboard },
  subAgents: { label: 'نمایندگان فرعی', icon: Users },
  partners: { label: 'شرکا', icon: UsersRound },
  brandSettings: { label: 'تنظیمات برند', icon: Award },
  settlements: { label: 'تسویه‌ها', icon: Wallet },
  documents: { label: 'مدارک', icon: FileCheck },
};

const defaultBrand: BrandConfig = {
  brandKey: 'channel-workspace',
  displayNameFa: 'پورتال کانال فروش بیمه',
  primaryColor: '#1d4ed8',
  secondaryColor: '#4f46e5',
  fontFamily: 'vazirmatn',
  direction: 'rtl',
  calendar: 'jalali',
  currency: 'تومان',
  footerText: '© ۱۴۰۳ پورتال کانال فروش',
  legalText: 'تمامی حقوق محفوظ است',
};

export default function ChannelWorkspacePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({});
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [capabilities, setCapabilities] = useState<string[]>(mockChannelCapabilities);

  useEffect(() => {
    fetchBFF('/api/v1/channel/capabilities')
      .then((res: any) => {
        const caps = res?.data || res;
        if (Array.isArray(caps) && caps.length > 0) setCapabilities(caps);
      })
      .catch(() => { /* use mock capabilities */ });
  }, []);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    const tokenMatch = document.cookie.match(new RegExp('(^| )auth-token=([^;]+)'));
    if (!tokenMatch) { router.push('/login'); return; }
    loadData();
  }, [router, activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const tabPaths: Record<Tab, string> = {
        overview: '/api/v1/channel/workspaces/mine',
        offerings: '/api/v1/channel/offerings',
        submissions: '/api/v1/channel/submissions',
        quotes: '/api/v1/channel/quotes',
        placements: '/api/v1/channel/placements',
        commissions: '/api/v1/channel/commissions',
        settlements: '/api/v1/channel/settlements',
        customers: '/api/v1/channel/customers',
        claims: '/api/v1/channel/claims',
        dashboard: '/api/v1/channel/dashboard',
        subAgents: '/api/v1/channel/sub-agents',
        partners: '/api/v1/channel/partners',
        documents: '/api/v1/channel/documents',
        brandSettings: '/api/v1/channel/brand-settings',
      };
      const json = await fetchBFF(tabPaths[activeTab]);
      setData(json.data || {});
    } catch (err: any) {
      setError(err.message);
      const mockMap: Record<Tab, any> = {
        overview: mockWorkspaces, offerings: { rows: mockOfferings },
        submissions: { rows: mockSubmissions }, quotes: { rows: [] },
        placements: { rows: [] }, commissions: { rows: mockCommissions },
        settlements: mockSettlements, customers: { rows: mockCustomers }, claims: { rows: [] },
        dashboard: mockDashboardStats, subAgents: { rows: mockSubAgents },
        partners: { rows: mockPartners }, documents: mockBrokerDocuments, brandSettings: {},
      };
      setData(mockMap[activeTab]);
    } finally { setLoading(false); }
  };

  const tabs = Object.entries(tabTitles)
    .map(([key, value]) => ({ key: key as Tab, ...value }))
    .filter(tab => capabilities.includes(tab.key));

  return (
    <BrandWrapper brand={defaultBrand}>
      <header className="sticky top-0 z-10 border-b border-border-default bg-bg-raised/80 backdrop-blur shadow-1">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/login')}>
            <ChevronLeft className="h-5 w-5" /> بازگشت
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary">
              <Shield className="h-5 w-5 text-text-on-brand" />
            </div>
            <h1 className="text-h3 font-bold text-text-primary">پورتال کانال فروش</h1>
          </div>
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
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSelectedCustomer(null); }}
              className={cn('flex items-center gap-2 border-b-2 px-4 py-3 text-body-sm font-medium transition-colors',
                activeTab === tab.key ? 'border-brand-primary text-brand-primary' : 'border-transparent text-text-secondary hover:text-text-primary')}>
              <tab.icon className="h-4 w-4" /> {tab.label}
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
        {activeTab === 'overview' && <OverviewTab data={data} loading={loading} />}
        {activeTab === 'offerings' && <OfferingsTab data={data} loading={loading} />}
        {activeTab === 'submissions' && (showWizard
          ? <SubmissionWizardTab onCancel={() => setShowWizard(false)} onComplete={() => setShowWizard(false)} />
          : <SubmissionsTab data={data} loading={loading} onNew={() => setShowWizard(true)} />)}
        {activeTab === 'quotes' && <QuotesTab data={data} loading={loading} />}
        {activeTab === 'placements' && <PlacementsTab />}
        {activeTab === 'commissions' && <CommissionsTab data={data} loading={loading} />}
        {activeTab === 'settlements' && <SettlementsTab data={data} loading={loading} />}
        {activeTab === 'customers' && (selectedCustomer
          ? <CustomerDetail customer={selectedCustomer} onBack={() => setSelectedCustomer(null)} />
          : <CustomersTab data={data} loading={loading} onSelect={setSelectedCustomer} />)}
        {activeTab === 'claims' && <ClaimsTab data={data} loading={loading} />}
        {activeTab === 'subAgents' && <SubAgentsTab data={data} loading={loading} />}
        {activeTab === 'partners' && <PartnersTab data={data} loading={loading} />}
        {activeTab === 'documents' && <DocumentsTab data={data} loading={loading} />}
        {activeTab === 'brandSettings' && <BrandSettingsTab />}
      </main>
      <CopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} />
    </BrandWrapper>
  );
}

function Loading() {
  return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-primary" /></div>;
}

function DashboardTab({ data, loading }: { data: any; loading: boolean }) {
  if (loading) return <Loading />;
  const stats = data?.stats || data || mockDashboardStats;
  const cards = [
    { label: 'درخواست‌های فعال', value: stats.activeSubmissions ?? '-', icon: Plus, color: 'from-brand-primary to-brand-primary', bg: 'bg-brand-primary-subtle', textColor: 'text-brand-primary' },
    { label: 'پورسانت کل', value: stats.totalCommissions ?? '-', icon: DollarSign, color: 'from-feedback-success to-feedback-success', bg: 'bg-feedback-success-subtle', textColor: 'text-feedback-success' },
    { label: 'مشتریان', value: stats.totalCustomers ?? '-', icon: Users, color: 'from-brand-secondary to-brand-secondary', bg: 'bg-brand-secondary-subtle', textColor: 'text-brand-secondary' },
    { label: 'محصولات مجاز', value: stats.totalOfferings ?? '-', icon: FileText, color: 'from-feedback-warning to-feedback-warning', bg: 'bg-feedback-warning-subtle', textColor: 'text-feedback-warning' },
    { label: 'بیمه‌نامه‌ها', value: stats.totalPolicies ?? '-', icon: Shield, color: 'from-brand-primary to-brand-primary', bg: 'bg-brand-primary-subtle', textColor: 'text-brand-primary' },
    { label: 'پورسانت در انتظار', value: stats.pendingCommissions ?? '-', icon: Award, color: 'from-feedback-error to-feedback-error', bg: 'bg-feedback-error-subtle', textColor: 'text-feedback-error' },
    { label: 'نرخ تبدیل', value: stats.conversionRate ?? '-', icon: Target, color: 'from-brand-primary to-brand-primary', bg: 'bg-brand-primary-subtle', textColor: 'text-brand-primary' },
    { label: 'رشد ماهانه', value: stats.monthlyGrowth ?? '-', icon: TrendingUp, color: 'from-brand-primary to-brand-primary', bg: 'bg-brand-primary-subtle', textColor: 'text-brand-primary' },
  ];
  return (
    <div className="space-y-6">
      <h2 className="text-h3 font-semibold text-text-primary">داشبورد کانال فروش</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', card.bg)}>
                    <Icon className={cn('h-6 w-6', card.textColor)} />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-feedback-success" />
                </div>
                <p className="mt-3 text-body-sm text-text-secondary">{card.label}</p>
                <p className="mt-1 text-h4 font-bold text-text-primary">{card.value}</p>
              </div>
              <div className={cn('h-1 bg-gradient-to-l', card.color)} />
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-brand-primary" />
            <h3 className="text-sm font-semibold text-text-primary">عملکرد ماهانه</h3>
          </div>
          <div className="flex items-end justify-between gap-3" style={{ height: '200px' }}>
            {(stats.monthlyChartData || mockDashboardStats.monthlyChartData).map((item: any) => {
              const maxVal = Math.max(...(stats.monthlyChartData || mockDashboardStats.monthlyChartData).map((d: any) => d.commissions));
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

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-brand-primary" />
            <h3 className="text-sm font-semibold text-text-primary">فعالیت‌های اخیر</h3>
          </div>
          <div className="space-y-3">
            {(stats.recentActivity || mockDashboardStats.recentActivity).map((act: any, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand-primary" />
                <div className="flex-1">
                  <p className="text-xs text-text-primary">{act.description}</p>
                  <p className="mt-0.5 text-[10px] text-text-muted">{act.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function OverviewTab({ data, loading }: { data: any; loading: boolean }) {
  if (loading) return <Loading />;
  const rows = Array.isArray(data) ? data : mockWorkspaces;
  return (
    <div className="space-y-4">
      <h2 className="text-h3 font-semibold text-text-primary">ورک‌اسپیس‌های من</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((ws: any) => (
          <Card key={ws.workspaceId} className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10">
                <Briefcase className="h-5 w-5 text-brand-primary" />
              </div>
              <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                ws.status === 'فعال' ? 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success' : 'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning')}>{ws.status}</span>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-text-primary">{ws.channelType}</h3>
            <p className="mt-1 text-body-sm text-text-secondary">برند: {ws.brandKey}</p>
            {ws.description && <p className="mt-2 text-xs text-text-muted leading-relaxed">{ws.description}</p>}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-border-default pt-3">
              <div><p className="text-[10px] text-text-muted">نماینده فرعی</p><p className="text-sm font-bold text-text-primary">{ws.subAgentCount ?? 0}</p></div>
              <div><p className="text-[10px] text-text-muted">مشتری</p><p className="text-sm font-bold text-text-primary">{ws.totalCustomers ?? 0}</p></div>
              <div><p className="text-[10px] text-text-muted">بیمه‌نامه</p><p className="text-sm font-bold text-text-primary">{ws.totalPolicies ?? 0}</p></div>
            </div>
            {ws.totalCommissions != null && (
              <div className="mt-2 flex items-center gap-1 text-xs">
                <DollarSign className="h-3 w-3 text-feedback-success" />
                <span className="text-text-muted">کل پورسانت:</span>
                <span className="font-medium text-feedback-success">{formatToman(ws.totalCommissions)}</span>
              </div>
            )}
          </Card>
        ))}
      </div>
      {rows.length === 0 && <p className="text-text-muted">ورک‌اسپیس‌ای یافت نشد</p>}
    </div>
  );
}

function OfferingsTab({ data, loading }: { data: any; loading: boolean }) {
  const rows = data?.rows || (Array.isArray(data) ? data : mockOfferings);
  const columns = [
    { key: 'productName', header: 'نام محصول', cell: (row: any) => <span className="font-medium text-text-primary">{row.productName}</span> },
    { key: 'category', header: 'دسته‌بندی', cell: (row: any) => <span className="inline-flex items-center rounded-lg bg-bg-subtle px-2 py-0.5 text-xs text-text-secondary">{row.category || '—'}</span> },
    { key: 'carrierName', header: 'بیمه‌گر', cell: (row: any) => row.carrierName },
    { key: 'premiumRange', header: 'محدوده حق بیمه', cell: (row: any) => row.premiumRange },
    { key: 'commissionRate', header: 'نرخ پورسانت', cell: (row: any) => <span className="inline-flex items-center rounded-lg bg-brand-primary/10 px-2 py-0.5 text-xs font-medium text-brand-primary">{row.commissionRate}</span> },
    { key: 'status', header: 'وضعیت', cell: (row: any) => <span className="inline-flex items-center rounded-full border border-feedback-success/30 bg-feedback-success-subtle px-2.5 py-0.5 text-xs font-medium text-feedback-success">{row.status}</span> },
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-h3 font-semibold text-text-primary">محصولات مجاز</h2>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {rows.slice(0, 6).map((offering: any) => (
          <Card key={offering.offeringId} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10">
                <FileText className="h-5 w-5 text-brand-primary" />
              </div>
              <span className="inline-flex items-center rounded-lg bg-brand-primary/10 px-2 py-0.5 text-xs font-medium text-brand-primary">{offering.commissionRate}</span>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-text-primary">{offering.productName}</h3>
            <p className="mt-1 text-xs text-text-muted">{offering.carrierName}</p>
            {offering.description && <p className="mt-2 text-xs text-text-secondary leading-relaxed">{offering.description}</p>}
            <div className="mt-3 flex items-center justify-between border-t border-border-default pt-2">
              <span className="text-[10px] text-text-muted">{offering.category}</span>
              <span className="text-xs font-medium text-text-primary">{offering.premiumRange}</span>
            </div>
          </Card>
        ))}
      </div>
      <DataTable columns={columns} rows={rows} keyExtractor={(row: any) => row.offeringId} loading={loading} />
    </div>
  );
}

function SubmissionsTab({ data, loading, onNew }: { data: any; loading: boolean; onNew: () => void }) {
  const rows = data?.rows || (Array.isArray(data) ? data : mockSubmissions);
  const columns = [
    { key: 'submissionNumber', header: 'شماره', cell: (row: any) => <span className="font-medium text-text-primary">{row.submissionNumber}</span> },
    { key: 'productName', header: 'محصول', cell: (row: any) => row.productName },
    { key: 'customerName', header: 'مشتری', cell: (row: any) => row.customerName },
    { key: 'carrierName', header: 'بیمه‌گر', cell: (row: any) => row.carrierName || '—' },
    { key: 'premium', header: 'حق بیمه', cell: (row: any) => <span className="font-medium text-text-primary">{row.premium ? formatToman(row.premium) : '—'}</span> },
    { key: 'status', header: 'وضعیت', cell: (row: any) => <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', row.status === 'تسویه شده' || row.status === 'صدور شده' ? 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success' : row.status === 'قیمت‌گذاری شده' ? 'border-brand-primary/30 bg-brand-primary-subtle text-brand-primary' : 'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning')}>{row.status}</span> },
    { key: 'createdAt', header: 'تاریخ', cell: (row: any) => <span className="text-text-muted">{row.createdAt}</span> },
  ];
  return <div className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-h3 font-semibold text-text-primary">درخواست‌ها</h2><Button size="sm" onClick={onNew}><Plus className="ml-1 h-4 w-4" /> درخواست جدید</Button></div><DataTable columns={columns} rows={rows} keyExtractor={(row: any) => row.submissionId || row.id} loading={loading} /></div>;
}

const mockWizardCarriers: CarrierOption[] = [
  { carrierOrganizationId: 'irn-001', carrierName: 'بیمه ایران', description: 'بزرگترین بیمه‌گر کشور با پوشش کامل محصولات', enabled: true, inAgreement: true, bindingAuthority: true, lineOfBusiness: ['شخصی', 'مسکن', 'سلامت'], quoteCount: 3 },
  { carrierOrganizationId: 'asi-002', carrierName: 'بیمه آسیه', description: 'بیمه‌گر تخصصی آتش‌سوزی و مهندسی', enabled: true, inAgreement: true, bindingAuthority: false, lineOfBusiness: ['مسکن', 'مهندسی'], quoteCount: 2 },
  { carrierOrganizationId: 'psg-003', carrierName: 'بیمه پاسارگاد', description: 'بیمه‌گر نوآور با محصولات حوادث و درمان', enabled: true, inAgreement: true, bindingAuthority: true, lineOfBusiness: ['شخصی', 'سلامت'], quoteCount: 2 },
  { carrierOrganizationId: 'alb-004', carrierName: 'بیمه البرز', description: 'بیمه‌گر تخصصی مهندسی و باربری', enabled: true, inAgreement: true, bindingAuthority: false, lineOfBusiness: ['مهندسی', 'باربری'], quoteCount: 1 },
  { carrierOrganizationId: 'dan-005', carrierName: 'بیمه دانا', description: 'بیمه‌گر با محصولات متنوع شخصی و سازمانی', enabled: true, inAgreement: false, bindingAuthority: false, lineOfBusiness: ['شخصی', 'مسئولیت'], quoteCount: 0 },
];

function SubmissionWizardTab({ onCancel, onComplete }: { onCancel: () => void; onComplete: () => void }) {
  const [wizardData, setWizardData] = useState({ customerName: '', phone: '', product: '', carrier: '', premium: '', description: '' });
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const steps: WizardStep[] = [
    {
      id: 'customer',
      title: 'اطلاعات مشتری',
      description: 'مشتری هدف را مشخص کنید',
      isValid: () => !!wizardData.customerName && !!wizardData.phone,
      content: (
        <div className="space-y-4 py-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">نام مشتری</label>
            <input value={wizardData.customerName} onChange={(e) => setWizardData({ ...wizardData, customerName: e.target.value })}
              placeholder="نام و نام خانوادگی"
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">شماره تماس</label>
            <input value={wizardData.phone} onChange={(e) => setWizardData({ ...wizardData, phone: e.target.value })}
              placeholder="09xxxxxxxxx"
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
          </div>
        </div>
      ),
    },
    {
      id: 'product',
      title: 'انتخاب محصول',
      description: 'محصول و بیمه‌گر را انتخاب کنید',
      isValid: () => !!wizardData.product && selectedCarriers.length > 0,
      content: (
        <div className="space-y-4 py-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">نوع بیمه</label>
            <select value={wizardData.product} onChange={(e) => setWizardData({ ...wizardData, product: e.target.value })}
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none">
              <option value="">انتخاب کنید...</option>
              <option value="بیمه ثالثی شخصی">بیمه ثالثی شخصی</option>
              <option value="بیمه آتش‌سوزی مسکونی">بیمه آتش‌سوزی مسکونی</option>
              <option value="بیمه حوادث انفرادی">بیمه حوادث انفرادی</option>
              <option value="بیمه مهندسی عمران">بیمه مهندسی عمران</option>
              <option value="بیمه درمان تکمیلی">بیمه درمان تکمیلی</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary">انتخاب بیمه‌گرهای هدف برای استعلام قیمت</label>
            <p className="mb-3 text-xs text-text-muted">بیمه‌گرهایی که قرارداد توزیع فعال دارند قابل انتخاب هستند. حداقل یک بیمه‌گر انتخاب کنید.</p>
            <CarrierSelector
              carriers={mockWizardCarriers}
              selected={selectedCarriers}
              onChange={setSelectedCarriers}
              className="sm:grid-cols-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">حق بیمه پیشنهادی (تومان)</label>
            <input value={wizardData.premium} onChange={(e) => setWizardData({ ...wizardData, premium: e.target.value })}
              placeholder="مبلغ به تومان"
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
          </div>
        </div>
      ),
    },
    {
      id: 'review',
      title: 'بازبینی و ارسال',
      description: 'اطلاعات را تأیید و ارسال کنید',
      content: (
        <div className="space-y-3 py-2">
          <div className="rounded-lg bg-bg-subtle p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-text-muted">مشتری:</span><span className="font-medium text-text-primary">{wizardData.customerName || '—'}</span></div>
            <div className="flex justify-between text-sm"><span className="text-text-muted">تماس:</span><span className="font-medium text-text-primary">{wizardData.phone || '—'}</span></div>
            <div className="flex justify-between text-sm"><span className="text-text-muted">محصول:</span><span className="font-medium text-text-primary">{wizardData.product || '—'}</span></div>
            <div className="flex justify-between text-sm"><span className="text-text-muted">بیمه‌گرهای انتخابی:</span><span className="font-medium text-text-primary">{selectedCarriers.length > 0 ? selectedCarriers.map(id => mockWizardCarriers.find(c => c.carrierOrganizationId === id)?.carrierName).join('، ') : '—'}</span></div>
            <div className="flex justify-between text-sm"><span className="text-text-muted">حق بیمه:</span><span className="font-medium text-text-primary">{wizardData.premium ? formatToman(Number(wizardData.premium)) : '—'}</span></div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">توضیحات</label>
            <textarea value={wizardData.description} onChange={(e) => setWizardData({ ...wizardData, description: e.target.value })}
              placeholder="توضیحات تکمیلی..."
              rows={3}
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
          </div>
        </div>
      ),
    },
  ];

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      await postBFF('/api/v1/channel/submissions', {
        customerName: wizardData.customerName,
        phone: wizardData.phone,
        product: wizardData.product,
        carrierOrganizationIds: selectedCarriers,
        description: wizardData.description,
      });
    } catch {
      // fallback - still complete the wizard
    }
    setSubmitting(false);
    onComplete();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h2 className="text-h3 font-semibold text-text-primary">درخواست جدید (RFQ Wizard)</h2>
      <SubmissionWizard steps={steps} onComplete={handleComplete} onCancel={onCancel} loading={submitting} />
    </div>
  );
}

const mockQuotes: QuoteComparisonItem[] = [
  {
    quoteResponseId: 'q-001', carrierOrganizationId: 'c-001', carrierName: 'بیمه ایران',
    premiumAmountMinor: '450000000', premiumCurrency: 'IRR',
    taxesMinor: '90000000', feesMinor: '5000000',
    coverages: [
      { code: 'third_party', nameFa: 'مسئولیت شخص ثالث', limit: '۵۰٬۰۰۰٬۰۰۰ تومان' },
      { code: 'driver_accident', nameFa: 'حوادث راننده', limit: '۲۰٬۰۰۰٬۰۰۰ تومان' },
    ],
    exclusions: ['خسارت عمدی', 'رانندگی تحت تأثیر الکل'],
    validUntil: '۱۴۰۳/۰۶/۳۱', rankScore: 92, rankReasonCodes: ['best_price', 'fast_settlement'],
    commissionAmountMinor: '45000000', commissionRateBps: 1000,
  },
  {
    quoteResponseId: 'q-002', carrierOrganizationId: 'c-002', carrierName: 'بیمه آسیه',
    premiumAmountMinor: '520000000', premiumCurrency: 'IRR',
    taxesMinor: '104000000', feesMinor: '5000000',
    coverages: [
      { code: 'third_party', nameFa: 'مسئولیت شخص ثالث', limit: '۷۰٬۰۰۰٬۰۰۰ تومان' },
      { code: 'driver_accident', nameFa: 'حوادث راننده', limit: '۳۰٬۰۰۰٬۰۰۰ تومان' },
      { code: 'passenger', nameFa: 'حوادث سرنشین', limit: '۱۵٬۰۰۰٬۰۰۰ تومان' },
    ],
    exclusions: ['خسارت عمدی'],
    validUntil: '۱۴۰۳/۰۶/۳۱', rankScore: 88, rankReasonCodes: ['better_coverage'],
    commissionAmountMinor: '62400000', commissionRateBps: 1200,
  },
  {
    quoteResponseId: 'q-003', carrierOrganizationId: 'c-003', carrierName: 'بیمه پاسارگاد',
    premiumAmountMinor: '410000000', premiumCurrency: 'IRR',
    taxesMinor: '82000000', feesMinor: '3000000',
    coverages: [
      { code: 'third_party', nameFa: 'مسئولیت شخص ثالث', limit: '۴۰٬۰۰۰٬۰۰۰ تومان' },
    ],
    exclusions: ['خسارت عمدی', 'رانندگی تحت تأثیر الکل', 'خسارت سیلاب'],
    validUntil: '۱۴۰۳/۰۶/۳۱', rankScore: 75, rankReasonCodes: ['lowest_price'],
    commissionAmountMinor: '32800000', commissionRateBps: 800,
  },
];

const mockClaims = [
  { claimId: 'cl-001', claimNumber: 'CLM-1403-92145', policyNumber: 'POL-001', customerName: 'علی محمدی', lossType: 'تصادف', status: 'در حال بررسی', amount: 15000000, date: '۱۴۰۳/۰۵/۱۰' },
  { claimId: 'cl-002', claimNumber: 'CLM-1403-92146', policyNumber: 'POL-002', customerName: 'مریم احمدی', lossType: 'سرقت', status: 'تأیید شده', amount: 85000000, date: '۱۴۰۳/۰۵/۰۸' },
  { claimId: 'cl-003', claimNumber: 'CLM-1403-92147', policyNumber: 'POL-003', customerName: 'حسین رضایی', lossType: 'آتش‌سوزی', status: 'ثبت شده', amount: 0, date: '۱۴۰۳/۰۵/۱۴' },
  { claimId: 'cl-004', claimNumber: 'CLM-1403-92148', policyNumber: 'POL-004', customerName: 'فاطمه کریمی', lossType: 'سیلاب', status: 'پرداخت شده', amount: 42000000, date: '۱۴۰۳/۰۵/۰۵' },
];

function QuotesTab({ loading }: { data: any; loading: boolean }) {
  const [quotes, setQuotes] = useState<QuoteComparisonItem[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(true);

  useEffect(() => {
    fetchBFF('/api/v1/channel/submissions')
      .then(async (json) => {
        const subs = json.data?.rows || json.data || [];
        if (subs.length > 0) {
          const qRes = await fetchBFF(`/api/v1/channel/submissions/${subs[0].id || subs[0].submissionId}/quotes`);
          setQuotes(qRes.data?.rows || qRes.data || mockQuotes);
        } else {
          setQuotes(mockQuotes);
        }
      })
      .catch(() => setQuotes(mockQuotes))
      .finally(() => setQuotesLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-h3 font-semibold text-text-primary">مقایسه قیمت‌گذاری</h2>
        <span className="text-xs text-text-muted">{quotes.length} پیشنهاد</span>
      </div>
      <QuoteComparisonTable items={quotes} loading={loading || quotesLoading} onSelect={(id) => console.log('Selected quote:', id)} />
    </div>
  );
}

const mockPlacements = [
  { placementId: 'pl-001', submissionNumber: 'SUB-001', customerName: 'علی محمدی', carrierName: 'بیمه ایران', product: 'بیمه ثالثی شخصی', premium: 4500000, status: 'صدور شده', policyNumber: 'POL-IRN-001', docs: { idCard: true, vehicleCard: true, license: true, inspection: false } },
  { placementId: 'pl-002', submissionNumber: 'SUB-002', customerName: 'مریم احمدی', carrierName: 'بیمه آسیه', product: 'بیمه آتش‌سوزی مسکونی', premium: 3200000, status: 'در حال صدور', policyNumber: '', docs: { idCard: true, vehicleCard: false, license: false, inspection: true } },
  { placementId: 'pl-003', submissionNumber: 'SUB-003', customerName: 'حسین رضایی', carrierName: 'بیمه پاسارگاد', product: 'بیمه حوادث انفرادی', premium: 1800000, status: 'مستندات ناقص', policyNumber: '', docs: { idCard: true, vehicleCard: false, license: false, inspection: false } },
];

const carrierDocRequirements: Record<string, { key: string; label: string; required: boolean }[]> = {
  'بیمه ایران': [
    { key: 'idCard', label: 'کارت ملی', required: true },
    { key: 'vehicleCard', label: 'کارت خودرو', required: true },
    { key: 'license', label: 'گواهینامه', required: true },
    { key: 'inspection', label: 'گزارش معاینه فنی', required: false },
  ],
  'بیمه آسیه': [
    { key: 'idCard', label: 'کارت ملی', required: true },
    { key: 'license', label: 'گواهینامه', required: false },
    { key: 'inspection', label: 'گزارش معاینه فنی', required: true },
  ],
  'بیمه پاسارگاد': [
    { key: 'idCard', label: 'کارت ملی', required: true },
    { key: 'vehicleCard', label: 'کارت خودرو', required: true },
  ],
};

function PlacementsTab() {
  const [placements, setPlacements] = useState<any[]>(mockPlacements);
  const [placementsLoading, setPlacementsLoading] = useState(true);
  const [selectedPlacement, setSelectedPlacement] = useState<any>(null);
  const [showNew, setShowNew] = useState(false);
  const [newPlacement, setNewPlacement] = useState({ submissionNumber: '', customerName: '', carrierName: '', product: '', premium: '' });

  useEffect(() => {
    fetchBFF('/api/v1/channel/placements')
      .then(json => {
        const rows = json.data?.rows || json.data || [];
        if (rows.length > 0) setPlacements(rows);
      })
      .catch(() => {})
      .finally(() => setPlacementsLoading(false));
  }, []);

  if (selectedPlacement) {
    const docs = carrierDocRequirements[selectedPlacement.carrierName] || carrierDocRequirements['بیمه ایران'];
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedPlacement(null)} className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary">
          <ChevronLeft className="h-4 w-4" /> بازگشت
        </button>
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="p-5 md:col-span-1">
            <h3 className="text-sm font-semibold text-text-primary mb-3">اطلاعات صدور</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-text-muted">شماره درخواست:</span><span className="font-medium text-text-primary">{selectedPlacement.submissionNumber}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">مشتری:</span><span className="font-medium text-text-primary">{selectedPlacement.customerName}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">بیمه‌گر:</span><span className="font-medium text-text-primary">{selectedPlacement.carrierName}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">محصول:</span><span className="font-medium text-text-primary">{selectedPlacement.product}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">حق بیمه:</span><span className="font-medium text-text-primary">{formatToman(selectedPlacement.premium)}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">شماره بیمه‌نامه:</span><span className="font-medium text-text-primary">{selectedPlacement.policyNumber || '—'}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">وضعیت:</span>
                <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                  selectedPlacement.status === 'صدور شده' ? 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success' :
                  selectedPlacement.status === 'در حال صدور' ? 'border-brand-primary/30 bg-brand-primary-subtle text-brand-primary' :
                  'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning')}>{selectedPlacement.status}</span>
              </div>
            </div>
            {selectedPlacement.status !== 'صدور شده' && (
              <Button className="mt-4 w-full" size="sm">صدور بیمه‌نامه (Bind)</Button>
            )}
          </Card>

          <Card className="p-5 md:col-span-2">
            <h3 className="text-sm font-semibold text-text-primary mb-3">مستندات مورد نیاز ({selectedPlacement.carrierName})</h3>
            <div className="space-y-3">
              {docs.map(doc => {
                const uploaded = selectedPlacement.docs[doc.key];
                return (
                  <div key={doc.key} className="flex items-center justify-between rounded-lg border border-border-default p-3">
                    <div className="flex items-center gap-3">
                      <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', uploaded ? 'bg-feedback-success-subtle' : 'bg-bg-base')}>
                        {uploaded ? <CheckCircle className="h-4 w-4 text-feedback-success" /> : <FileText className="h-4 w-4 text-text-muted" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{doc.label}</p>
                        {doc.required && <p className="text-[10px] text-feedback-error">الزامی</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {uploaded ? (
                        <span className="text-xs text-feedback-success">آپلود شده</span>
                      ) : (
                        <label className="cursor-pointer rounded-lg border border-border-default px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-subtle">
                          آپلود
                          <input type="file" className="hidden" onChange={() => {}} />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 rounded-lg bg-bg-subtle p-3 text-xs text-text-muted">
              مجموع مستندات: {Object.values(selectedPlacement.docs).filter(Boolean).length} از {docs.length} — {docs.filter(d => d.required && !selectedPlacement.docs[d.key]).length > 0 ? `${docs.filter(d => d.required && !selectedPlacement.docs[d.key]).length} سند الزامی ناقص` : 'همه مستندات الزامی کامل'}
            </div>
          </Card>

          <Card className="p-5 md:col-span-3">
            <h3 className="mb-4 text-sm font-semibold text-text-primary">چرخه عمر صدور</h3>
            <PolicyTimeline events={[
              { id: 'pl-ev-1', title: 'ثبت درخواست', description: `درخواست ${selectedPlacement.submissionNumber} ثبت شد`, status: 'completed', actor: 'کاربر' },
              { id: 'pl-ev-2', title: 'قیمت‌گذاری', description: 'قیمت‌گذاری توسط بیمه‌گر انجام شد', status: 'completed', actor: selectedPlacement.carrierName },
              { id: 'pl-ev-3', title: 'تأیید و صدور', description: selectedPlacement.status === 'صدور شده' ? 'بیمه‌نامه صادر شد' : 'در حال صدور', status: selectedPlacement.status === 'صدور شده' ? 'completed' as const : 'current' as const, actor: 'سیستم صدور' },
              { id: 'pl-ev-4', title: 'تحویل بیمه‌نامه', description: selectedPlacement.policyNumber ? `بیمه‌نامه ${selectedPlacement.policyNumber} صادر شد` : 'در انتظار صدور', status: selectedPlacement.policyNumber ? 'completed' as const : 'pending' as const },
            ]} />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-h3 font-semibold text-text-primary">صدور و مستندات</h2>
        <Button size="sm" onClick={() => setShowNew(!showNew)}><Plus className="ml-1 h-4 w-4" /> صدور جدید</Button>
      </div>
      {showNew && (
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text-primary">صدور بیمه‌نامه جدید</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <input value={newPlacement.submissionNumber} onChange={(e) => setNewPlacement({ ...newPlacement, submissionNumber: e.target.value })} placeholder="شماره درخواست" className="rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
            <input value={newPlacement.customerName} onChange={(e) => setNewPlacement({ ...newPlacement, customerName: e.target.value })} placeholder="نام مشتری" className="rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
            <select value={newPlacement.carrierName} onChange={(e) => setNewPlacement({ ...newPlacement, carrierName: e.target.value })} className="rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none">
              <option value="">انتخاب بیمه‌گر...</option>
              <option value="بیمه ایران">بیمه ایران</option>
              <option value="بیمه آسیه">بیمه آسیه</option>
              <option value="بیمه پاسارگاد">بیمه پاسارگاد</option>
            </select>
            <input value={newPlacement.product} onChange={(e) => setNewPlacement({ ...newPlacement, product: e.target.value })} placeholder="نوع بیمه" className="rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
            <input value={newPlacement.premium} onChange={(e) => setNewPlacement({ ...newPlacement, premium: e.target.value })} placeholder="حق بیمه (تومان)" className="rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none md:col-span-2" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setShowNew(false)}>شروع صدور</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowNew(false)}>انصراف</Button>
          </div>
        </Card>
      )}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {placements.map(p => (
          <Card key={p.placementId} className="p-4 cursor-pointer hover:ring-2 hover:ring-brand-primary/20" onClick={() => setSelectedPlacement(p)}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">{p.customerName}</h3>
                <p className="mt-1 text-xs text-text-muted">{p.product} — {p.carrierName}</p>
              </div>
              <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
                p.status === 'صدور شده' ? 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success' :
                p.status === 'در حال صدور' ? 'border-brand-primary/30 bg-brand-primary-subtle text-brand-primary' :
                'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning')}>{p.status}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-text-muted">{p.submissionNumber}</span>
              <span className="font-medium text-text-primary">{formatToman(p.premium)}</span>
            </div>
            <div className="mt-2 flex items-center gap-1">
              {Object.entries(p.docs).map(([key, uploaded]) => (
                <div key={key} className={cn('h-2 w-2 rounded-full', uploaded ? 'bg-feedback-success' : 'bg-border-default')} />
              ))}
              <span className="mr-1 text-[10px] text-text-muted">{Object.values(p.docs).filter(Boolean).length}/{Object.keys(p.docs).length} سند</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ClaimsTab({ data, loading }: { data: any; loading: boolean }) {
  const rows = data?.rows || (Array.isArray(data) ? data : mockClaims);
  const [showNew, setShowNew] = useState(false);
  const [newClaim, setNewClaim] = useState({ policyNumber: '', customerName: '', lossType: '', description: '' });

  const columns = [
    { key: 'claimNumber', header: 'شماره خسارت', cell: (row: any) => <span className="font-medium text-text-primary">{row.claimNumber}</span> },
    { key: 'policyNumber', header: 'بیمه‌نامه', cell: (row: any) => row.policyNumber },
    { key: 'customerName', header: 'مشتری', cell: (row: any) => row.customerName },
    { key: 'lossType', header: 'نوع خسارت', cell: (row: any) => row.lossType },
    { key: 'amount', header: 'مبلغ', cell: (row: any) => <span className="font-medium text-text-primary">{row.amount > 0 ? formatToman(row.amount) : '—'}</span> },
    { key: 'status', header: 'وضعیت', cell: (row: any) => (
      <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        row.status === 'پرداخت شده' ? 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success' :
        row.status === 'تأیید شده' ? 'border-brand-primary/30 bg-brand-primary-subtle text-brand-primary' :
        row.status === 'در حال بررسی' ? 'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning' :
        'border-border-default bg-bg-base text-text-secondary')}>{row.status}</span>
    ) },
    { key: 'date', header: 'تاریخ', cell: (row: any) => <span className="text-text-muted">{row.date}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-h3 font-semibold text-text-primary">خسارت‌ها</h2>
        <Button size="sm" onClick={() => setShowNew(!showNew)}><Plus className="ml-1 h-4 w-4" /> ثبت خسارت</Button>
      </div>
      {showNew && (
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text-primary">ثبت خسارت جدید</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <input value={newClaim.policyNumber} onChange={(e) => setNewClaim({ ...newClaim, policyNumber: e.target.value })} placeholder="شماره بیمه‌نامه" className="rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
            <input value={newClaim.customerName} onChange={(e) => setNewClaim({ ...newClaim, customerName: e.target.value })} placeholder="نام مشتری" className="rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
            <select value={newClaim.lossType} onChange={(e) => setNewClaim({ ...newClaim, lossType: e.target.value })} className="rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none">
              <option value="">نوع خسارت...</option>
              <option value="تصادف">تصادف</option>
              <option value="سرقت">سرقت</option>
              <option value="آتش‌سوزی">آتش‌سوزی</option>
              <option value="سیلاب">سیلاب</option>
              <option value="حوادث">حوادث</option>
            </select>
            <input value={newClaim.description} onChange={(e) => setNewClaim({ ...newClaim, description: e.target.value })} placeholder="شرح خسارت" className="rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setShowNew(false)}>ثبت</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowNew(false)}>انصراف</Button>
          </div>
        </Card>
      )}
      <DataTable columns={columns} rows={rows} keyExtractor={(row: any) => row.claimId} loading={loading} />
    </div>
  );
}

function CommissionsTab({ data, loading }: { data: any; loading: boolean }) {
  const rows = data?.rows || (Array.isArray(data) ? data : mockCommissions);
  const totalPaid = rows.filter((r: any) => r.status === 'پرداخت شده').reduce((s: number, r: any) => s + r.amount, 0);
  const totalPending = rows.filter((r: any) => r.status === 'در انتظار').reduce((s: number, r: any) => s + r.amount, 0);

  const ledgerLines: CommissionLine[] = rows.slice(0, 5).map((r: any, i: number) => ({
    id: `ll-${i}`,
    policyNumber: r.policyNumber,
    policyholder: r.customerName || '—',
    amountMinor: r.amount * 100,
    currency: 'IRR' as const,
    type: r.status === 'پرداخت شده' ? 'paid' as const : 'pending' as const,
    period: r.dueDate || '۱۴۰۳/۰۴',
  }));

  const columns = [
    { key: 'policyNumber', header: 'بیمه‌نامه', cell: (row: any) => <span className="font-medium text-text-primary">{row.policyNumber}</span> },
    { key: 'carrierName', header: 'بیمه‌گر', cell: (row: any) => row.carrierName },
    { key: 'rate', header: 'نرخ', cell: (row: any) => <span className="inline-flex items-center rounded-lg bg-brand-primary/10 px-2 py-0.5 text-xs font-medium text-brand-primary">{row.rate}</span> },
    { key: 'amount', header: 'مبلغ', cell: (row: any) => <span className="font-medium text-text-primary">{formatToman(row.amount)}</span> },
    { key: 'status', header: 'وضعیت', cell: (row: any) => <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', row.status === 'پرداخت شده' ? 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success' : 'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning')}>{row.status}</span> },
    { key: 'dueDate', header: 'سررسید', cell: (row: any) => <span className="text-text-muted">{row.dueDate}</span> },
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-h3 font-semibold text-text-primary">پورسانت‌ها</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-feedback-success-subtle"><DollarSign className="h-5 w-5 text-feedback-success" /></div><p className="mt-2 text-xs text-text-secondary">پرداخت شده</p><p className="mt-1 text-lg font-bold text-feedback-success">{formatToman(totalPaid)}</p></Card>
        <Card className="p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-feedback-warning-subtle"><Award className="h-5 w-5 text-feedback-warning" /></div><p className="mt-2 text-xs text-text-secondary">در انتظار</p><p className="mt-1 text-lg font-bold text-feedback-warning">{formatToman(totalPending)}</p></Card>
        <Card className="p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary-subtle"><TrendingUp className="h-5 w-5 text-brand-primary" /></div><p className="mt-2 text-xs text-text-secondary">کل</p><p className="mt-1 text-lg font-bold text-text-primary">{formatToman(totalPaid + totalPending)}</p></Card>
      </div>
      <CommissionLedgerCard
        balanceMinor={(totalPaid + totalPending) * 100}
        currency="IRR"
        lines={ledgerLines}
        pendingMinor={totalPending * 100}
        paidYtdMinor={totalPaid * 100}
      />
      <DataTable columns={columns} rows={rows} keyExtractor={(row: any) => row.commissionId} loading={loading} />
    </div>
  );
}

function CustomersTab({ data, loading, onSelect }: { data: any; loading: boolean; onSelect: (c: any) => void }) {
  const rows = data?.rows || (Array.isArray(data) ? data : mockCustomers);
  const columns = [
    { key: 'name', header: 'نام', cell: (row: any) => <span className="font-medium text-text-primary">{row.name}</span> },
    { key: 'phone', header: 'تلفن', cell: (row: any) => <span className="flex items-center gap-1 text-brand-primary"><Phone className="h-3.5 w-3.5" />{row.phone}</span> },
    { key: 'policies', header: 'بیمه‌نامه‌ها', cell: (row: any) => row.policies },
    { key: 'totalPremium', header: 'کل حق بیمه', cell: (row: any) => <span className="font-medium text-text-primary">{formatToman(row.totalPremium)}</span> },
    { key: 'status', header: 'وضعیت', cell: (row: any) => <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', row.status === 'فعال' ? 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success' : 'border-border-default bg-bg-base text-text-muted')}>{row.status}</span> },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-h3 font-semibold text-text-primary">مشتریان</h2>
        <div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" /><input placeholder="جستجو..." className="w-48 rounded-lg border border-border-default py-2 pr-9 pl-3 text-sm focus:border-brand-primary focus:outline-none" /></div>
      </div>
      <DataTable columns={columns} rows={rows} keyExtractor={(row: any) => row.partyId} loading={loading} onRowClick={onSelect} />
    </div>
  );
}

function CustomerDetail({ customer, onBack }: { customer: any; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center text-sm text-text-secondary hover:text-text-primary"><ChevronLeft className="h-4 w-4 ml-1" /> بازگشت به لیست</button>
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-primary/10"><Users className="h-8 w-8 text-brand-primary" /></div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-text-primary">{customer.name}</h2>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-text-secondary">
              <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> {customer.phone}</span>
              <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> {customer.email}</span>
            </div>
            {customer.address && <p className="mt-1 text-xs text-text-muted">{customer.address}</p>}
          </div>
          <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', customer.status === 'فعال' ? 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success' : 'border-border-default bg-bg-base text-text-muted')}>{customer.status}</span>
        </div>
      </Card>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs text-text-secondary">تعداد بیمه‌نامه</p><p className="mt-1 text-2xl font-bold text-text-primary">{customer.policies}</p></Card>
        <Card className="p-4"><p className="text-xs text-text-secondary">کل حق بیمه</p><p className="mt-1 text-2xl font-bold text-text-primary">{formatToman(customer.totalPremium)}</p></Card>
        <Card className="p-4"><p className="text-xs text-text-secondary">میانگین حق بیمه</p><p className="mt-1 text-2xl font-bold text-text-primary">{formatToman(Math.round(customer.totalPremium / customer.policies))}</p></Card>
      </div>
      {(customer.nationalId || customer.joinDate || customer.lastActivity) && (
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-text-primary">اطلاعات تکمیلی</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {customer.nationalId && <div><p className="text-xs text-text-muted">کد ملی</p><p className="mt-1 text-sm font-medium text-text-primary">{customer.nationalId}</p></div>}
            {customer.joinDate && <div><p className="text-xs text-text-muted">تاریخ عضویت</p><p className="mt-1 text-sm font-medium text-text-primary">{customer.joinDate}</p></div>}
            {customer.lastActivity && <div><p className="text-xs text-text-muted">آخرین فعالیت</p><p className="mt-1 text-sm font-medium text-text-primary">{customer.lastActivity}</p></div>}
          </div>
        </Card>
      )}
    </div>
  );
}

function SubAgentsTab({ data, loading }: { data: any; loading: boolean }) {
  const rows = data?.rows || (Array.isArray(data) ? data : mockSubAgents);
  const [viewMode, setViewMode] = useState<'cards' | 'tree'>('cards');

  const adaptNode = (node: any): SubAgentNode => ({
    partyId: node.id || node.agentId,
    name: node.name,
    role: 'sub_agent',
    activePolicyCount: node.policies,
    status: node.status === 'فعال' ? 'active' : 'inactive',
    children: (node.children || []).map((c: any) => adaptNode(c)),
  });

  const treeNodes = mockSubAgentHierarchy ? [adaptNode(mockSubAgentHierarchy)] : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-h3 font-semibold text-text-primary">نمایندگان فرعی</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border-default p-0.5">
            <button onClick={() => setViewMode('cards')} className={cn('rounded-md px-3 py-1.5 text-xs font-medium', viewMode === 'cards' ? 'bg-brand-primary/10 text-brand-primary' : 'text-text-muted')}>کارت</button>
            <button onClick={() => setViewMode('tree')} className={cn('rounded-md px-3 py-1.5 text-xs font-medium', viewMode === 'tree' ? 'bg-brand-primary/10 text-brand-primary' : 'text-text-muted')}>درخت</button>
          </div>
          <Button size="sm"><Plus className="ml-1 h-4 w-4" /> نماینده جدید</Button>
        </div>
      </div>
      {viewMode === 'tree' && treeNodes.length > 0 ? (
        <SubAgentTree nodes={treeNodes} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((agent: any) => (
            <Card key={agent.agentId} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10"><Users className="h-5 w-5 text-brand-primary" /></div>
                <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', agent.status === 'فعال' ? 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success' : 'border-border-default bg-bg-base text-text-muted')}>{agent.status}</span>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-text-primary">{agent.name}</h3>
              <div className="mt-1 flex items-center gap-2 text-xs text-text-muted">
                <span>کد: {agent.code}</span>
                {agent.region && <span>• {agent.region}</span>}
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-text-secondary"><Phone className="h-3.5 w-3.5" /> {agent.phone}</div>
              {agent.email && <div className="mt-1 flex items-center gap-1 text-xs text-text-secondary"><Mail className="h-3.5 w-3.5" /> {agent.email}</div>}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-border-default pt-3">
                <div><span className="text-text-muted text-[10px]">بیمه‌نامه</span><p className="text-sm font-bold text-text-primary">{agent.policies}</p></div>
                {agent.customers != null && <div><span className="text-text-muted text-[10px]">مشتری</span><p className="text-sm font-bold text-text-primary">{agent.customers}</p></div>}
                <div><span className="text-text-muted text-[10px]">پورسانت</span><p className="text-sm font-bold text-feedback-success">{formatToman(agent.commission)}</p></div>
              </div>
              {agent.joinDate && <p className="mt-2 text-[10px] text-text-muted">عضویت: {agent.joinDate}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PartnersTab({ data, loading }: { data: any; loading: boolean }) {
  const rows = data?.rows || (Array.isArray(data) ? data : mockPartners);
  return (
    <div className="space-y-4">
      <h2 className="text-h3 font-semibold text-text-primary">شرکا</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((partner: any) => (
          <Card key={partner.partnerId} className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary-subtle"><UsersRound className="h-5 w-5 text-brand-primary" /></div>
              <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', partner.status === 'فعال' ? 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success' : 'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning')}>{partner.status}</span>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-text-primary">{partner.name}</h3>
            <p className="mt-1 text-xs text-text-muted">{partner.type}</p>
            {partner.contactPerson && <p className="mt-2 text-xs text-text-secondary">مسئول ارتباط: {partner.contactPerson}</p>}
            <div className="mt-2 space-y-1">
              {partner.phone && <div className="flex items-center gap-1 text-xs text-text-secondary"><Phone className="h-3.5 w-3.5" /> {partner.phone}</div>}
              {partner.email && <div className="flex items-center gap-1 text-xs text-text-secondary"><Mail className="h-3.5 w-3.5" /> {partner.email}</div>}
            </div>
            <div className="mt-3 flex gap-4 border-t border-border-default pt-3 text-xs">
              <div><span className="text-text-muted">قراردادها: </span><span className="font-medium text-text-primary">{partner.agreements}</span></div>
              <div><span className="text-text-muted">بیمه‌نامه‌ها: </span><span className="font-medium text-text-primary">{partner.totalPolicies}</span></div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function BrandSettingsTab() {
  const [brand, setBrand] = useState({
    name: 'کارگزاری بیمه آرمان',
    logo: '',
    primaryColor: '#1d4ed8',
    secondaryColor: '#4f46e5',
    fontFamily: 'Vazirmatn',
    rtl: true,
    showLogoOnDocs: true,
    customDomain: '',
    contactPhone: '021-88123456',
    contactEmail: 'info@arman-insurance.ir',
  });

  const [mockConsents, setMockConsents] = useState<ConsentPurpose[]>([
    { purpose: 'share-data-carrier', title: 'اشتراک داده با بیمه‌گر', description: 'اشتراک اطلاعات مشتری با بیمه‌گر جهت قیمت‌گذاری و صدور بیمه‌نامه', dataTypes: ['هویت', 'مخاطرات', 'سابقه خسارت'], granted: true, validFrom: '2024-01-01', validTo: '2025-01-01' },
    { purpose: 'credit-check', title: 'بررسی اعتباری', description: 'استعلام اعتبار مشتری جهت تأیید پرداخت اقساط', dataTypes: ['کد ملی', 'سابقه مالی'], granted: true, validFrom: '2024-01-01' },
    { purpose: 'marketing', title: 'بازاریابی و ارتباطات', description: 'ارسال پیشنهادات و اخبار بیمه‌ای از طریق پیامک و ایمیل', dataTypes: ['موبایل', 'ایمیل'], granted: false },
    { purpose: 'data-analysis', title: 'تحلیل داده', description: 'استفاده از داده‌ها برای بهبود خدمات و تحلیل ریسک', dataTypes: ['پروفایل', 'تاریخچه'], granted: true, validFrom: '2024-01-01' },
  ]);

  const colorPresets = [
    { name: 'آبی', primary: '#1d4ed8', secondary: '#4f46e5' },
    { name: 'سبز', primary: '#059669', secondary: '#10b981' },
    { name: 'بنفش', primary: '#7c3aed', secondary: '#a855f7' },
    { name: 'نارنجی', primary: '#ea580c', secondary: '#f97316' },
    { name: 'قرمز', primary: '#dc2626', secondary: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-h3 font-semibold text-text-primary">تنظیمات برند (White-Label)</h2>
        <p className="mt-1 text-sm text-text-muted">شخصی‌سازی ظاهر و هویت بصری پورتال</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Brand Identity */}
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">هویت برند</h3>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">نام برند</label>
            <input value={brand.name} onChange={(e) => setBrand({ ...brand, name: e.target.value })}
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">آدرس دامنه اختصاصی</label>
            <input value={brand.customDomain} onChange={(e) => setBrand({ ...brand, customDomain: e.target.value })}
              placeholder="portal.arman-insurance.ir"
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">شماره تماس</label>
            <input value={brand.contactPhone} onChange={(e) => setBrand({ ...brand, contactPhone: e.target.value })}
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">ایمیل</label>
            <input value={brand.contactEmail} onChange={(e) => setBrand({ ...brand, contactEmail: e.target.value })}
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
          </div>
        </Card>

        {/* Color & Theme */}
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">رنگ‌بندی و تم</h3>
          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary">پالت رنگی</label>
            <div className="flex flex-wrap gap-2">
              {colorPresets.map(preset => (
                <button key={preset.name} onClick={() => setBrand({ ...brand, primaryColor: preset.primary, secondaryColor: preset.secondary })}
                  className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all',
                    brand.primaryColor === preset.primary ? 'border-brand-primary ring-2 ring-brand-primary/20' : 'border-border-default hover:bg-bg-subtle')}>
                  <div className="flex">
                    <div className="h-4 w-4 rounded-full" style={{ backgroundColor: preset.primary }} />
                    <div className="h-4 w-4 rounded-full -mr-1" style={{ backgroundColor: preset.secondary }} />
                  </div>
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">رنگ اصلی</label>
              <div className="flex items-center gap-2">
                <input type="color" value={brand.primaryColor} onChange={(e) => setBrand({ ...brand, primaryColor: e.target.value })}
                  className="h-9 w-12 rounded border border-border-default" />
                <input value={brand.primaryColor} onChange={(e) => setBrand({ ...brand, primaryColor: e.target.value })}
                  className="flex-1 rounded-lg border border-border-default px-2 py-1.5 text-xs focus:border-brand-primary focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">رنگ ثانویه</label>
              <div className="flex items-center gap-2">
                <input type="color" value={brand.secondaryColor} onChange={(e) => setBrand({ ...brand, secondaryColor: e.target.value })}
                  className="h-9 w-12 rounded border border-border-default" />
                <input value={brand.secondaryColor} onChange={(e) => setBrand({ ...brand, secondaryColor: e.target.value })}
                  className="flex-1 rounded-lg border border-border-default px-2 py-1.5 text-xs focus:border-brand-primary focus:outline-none" />
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">فونت</label>
            <select value={brand.fontFamily} onChange={(e) => setBrand({ ...brand, fontFamily: e.target.value })}
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none">
              <option value="Vazirmatn">وزیرمتن</option>
              <option value="IRANSans">ایران سنس</option>
              <option value="Sahel">ساحل</option>
            </select>
          </div>
        </Card>

        {/* Preview */}
        <Card className="p-5 space-y-3 md:col-span-2">
          <h3 className="text-sm font-semibold text-text-primary">پیش‌نمایش</h3>
          <div className="rounded-xl border border-border-default p-6" style={{ fontFamily: brand.fontFamily }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl text-text-on-brand font-bold" style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})` }}>
                {brand.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary">{brand.name}</p>
                <p className="text-xs text-text-muted">{brand.contactPhone} | {brand.contactEmail}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button className="rounded-lg px-4 py-2 text-sm font-medium text-text-on-brand" style={{ backgroundColor: brand.primaryColor }}>دکمه اصلی</button>
              <button className="rounded-lg border px-4 py-2 text-sm font-medium" style={{ color: brand.primaryColor, borderColor: brand.primaryColor }}>دکمه ثانویه</button>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => { /* save */ }}>ذخیره تنظیمات</Button>
        <Button variant="ghost">بازنشانی</Button>
      </div>

      <ConsentPanel
        consents={mockConsents}
        onChange={(purpose, granted) => {
          setMockConsents(prev => prev.map(c => c.purpose === purpose ? { ...c, granted } : c));
        }}
        onRevokeAll={() => setMockConsents(prev => prev.map(c => ({ ...c, granted: false })))}
      />
    </div>
  );
}

function SettlementsTab({ data, loading }: { data: any; loading: boolean }) {
  const [filterStatus, setFilterStatus] = useState('');

  if (loading) return <Loading />;
  const settlements = data?.rows || [];
  const filtered = filterStatus ? settlements.filter((s: any) => s.status === filterStatus) : settlements;

  const totalSettled = settlements.filter((s: any) => s.status === 'تسویه شده').reduce((sum: number, s: any) => sum + (s.commissionAmount || 0), 0);
  const totalPending = settlements.filter((s: any) => s.status === 'در انتظار').reduce((sum: number, s: any) => sum + (s.commissionAmount || 0), 0);
  const totalPremium = settlements.reduce((sum: number, s: any) => sum + (s.totalPremium || 0), 0);

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-h3 font-semibold text-text-primary">تسویه حساب پورسانت</h2>
        <p className="mt-1 text-sm text-text-muted">مدیریت تسویه با بیمه‌گران</p>
      </div>

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
            <Wallet className="h-6 w-6 text-brand-primary" />
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
          <FileStack className="mx-auto h-12 w-12 text-text-muted" />
          <p className="mt-4 text-text-muted">تسویه‌ای یافت نشد</p>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border-default">
            <thead className="bg-bg-subtle">
              <tr>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">دوره</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">بیمه‌گر</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">کل حق بیمه</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">مبلغ پورسانت</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">وضعیت</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">تاریخ تسویه</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle bg-bg-raised">
              {filtered.map((s: any) => (
                <tr key={s.settlementId || s.id} className="transition-colors hover:bg-bg-subtle">
                  <td className="px-6 py-4 text-sm font-medium text-text-primary">{s.period}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{s.carrierName}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{formatToman(s.totalPremium)}</td>
                  <td className="px-6 py-4 text-sm font-medium text-text-primary">{formatToman(s.commissionAmount)}</td>
                  <td className="px-6 py-4">
                    <span className={cn('rounded-md px-2 py-0.5 text-xs font-medium',
                      s.status === 'تسویه شده' ? 'bg-feedback-success-subtle text-feedback-success' : 'bg-feedback-warning-subtle text-feedback-warning')}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-muted">{s.settlementDate || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function DocumentsTab({ data, loading }: { data: any; loading: boolean }) {
  const [filterCarrier, setFilterCarrier] = useState('');
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ carrierName: '', docType: '', fileName: '' });
  const [docs, setDocs] = useState<any[]>([]);

  useEffect(() => {
    if (data?.rows) setDocs(data.rows);
    else if (Array.isArray(data)) setDocs(data);
    else setDocs(mockBrokerDocuments.rows || []);
  }, [data]);

  if (loading) return <Loading />;

  const carrierNames = [...new Set(docs.map((d: any) => d.carrierName))];
  const docTypes = ['قرارداد کارگزاری', 'مجوز فعالیت', 'بیمه‌نامه نمونه', 'کارت ملی مدیر', 'سند مالکیت', 'گواهی عدم سوءپیشینه', 'سند دیگر'];

  const filtered = docs.filter((doc: any) => {
    if (filterCarrier && doc.carrierName !== filterCarrier) return false;
    if (search && !doc.fileName.includes(search) && !doc.docType.includes(search)) return false;
    return true;
  });

  const groupedByCarrier = filtered.reduce((acc: Record<string, any[]>, doc: any) => {
    if (!acc[doc.carrierName]) acc[doc.carrierName] = [];
    acc[doc.carrierName].push(doc);
    return acc;
  }, {});

  const handleUpload = () => {
    if (!uploadForm.carrierName || !uploadForm.docType || !uploadForm.fileName) return;
    const newDoc = {
      id: `DOC-${Date.now()}`,
      carrierName: uploadForm.carrierName,
      docType: uploadForm.docType,
      fileName: uploadForm.fileName,
      fileSize: '—',
      uploadDate: new Date().toLocaleDateString('fa-IR'),
      status: 'در انتظار',
      uploadedBy: 'کاربر فعلی',
    };
    setDocs(prev => [newDoc, ...prev]);
    setShowUpload(false);
    setUploadForm({ carrierName: '', docType: '', fileName: '' });
  };

  const statusConfig: Record<string, string> = {
    'تأیید شده': 'bg-feedback-success-subtle text-feedback-success',
    'در حال بررسی': 'bg-feedback-info-subtle text-feedback-info',
    'در انتظار': 'bg-feedback-warning-subtle text-feedback-warning',
    'رد شده': 'bg-feedback-error-subtle text-feedback-error',
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-h3 font-semibold text-text-primary">مدارک و مستندات</h2>
          <p className="mt-1 text-sm text-text-muted">بارگذاری و مدیریت مدارک به تفکیک بیمه‌گر</p>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)} className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          بارگذاری سند
        </Button>
      </div>

      {showUpload && (
        <Card className="p-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">بیمه‌گر</label>
              <select
                value={uploadForm.carrierName}
                onChange={(e) => setUploadForm({ ...uploadForm, carrierName: e.target.value })}
                className="w-full rounded-lg border border-border-default bg-bg-raised px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              >
                <option value="">انتخاب...</option>
                {carrierNames.map((c: string) => <option key={c} value={c}>{c}</option>)}
                <option value="بیمه ایران">بیمه ایران</option>
                <option value="بیمه آسیه">بیمه آسیه</option>
                <option value="بیمه پاسارگاد">بیمه پاسارگاد</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">نوع سند</label>
              <select
                value={uploadForm.docType}
                onChange={(e) => setUploadForm({ ...uploadForm, docType: e.target.value })}
                className="w-full rounded-lg border border-border-default bg-bg-raised px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              >
                <option value="">انتخاب...</option>
                {docTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">نام فایل</label>
              <input
                value={uploadForm.fileName}
                onChange={(e) => setUploadForm({ ...uploadForm, fileName: e.target.value })}
                placeholder="مثلاً: قرارداد-1403.pdf"
                className="w-full rounded-lg border border-border-default bg-bg-raised px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowUpload(false)}>انصراف</Button>
            <Button onClick={handleUpload} disabled={!uploadForm.carrierName || !uploadForm.docType || !uploadForm.fileName}>
              بارگذاری
            </Button>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی سند..."
            className="w-full rounded-lg border border-border-default bg-bg-raised pr-10 pl-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
        <select
          value={filterCarrier}
          onChange={(e) => setFilterCarrier(e.target.value)}
          className="rounded-lg border border-border-default bg-bg-raised px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        >
          <option value="">همه بیمه‌گران</option>
          {carrierNames.map((c: string) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <FileCheck className="mx-auto h-12 w-12 text-text-muted" />
          <p className="mt-4 text-text-muted">سندی یافت نشد</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByCarrier).map(([carrier, carrierDocs]) => (
            <div key={carrier}>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary">{carrier}</h3>
                <span className="rounded-full bg-bg-subtle px-2 py-0.5 text-xs text-text-muted">{carrierDocs.length} سند</span>
              </div>
              <Card className="overflow-hidden">
                <table className="min-w-full divide-y divide-border-default">
                  <thead className="bg-bg-subtle">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">نوع سند</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">نام فایل</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">حجم</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">تاریخ بارگذاری</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">بارگذاری توسط</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">وضعیت</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle bg-bg-raised">
                    {carrierDocs.map((doc: any) => (
                      <tr key={doc.id} className="transition-colors hover:bg-bg-subtle">
                        <td className="px-6 py-4 text-sm text-text-secondary">{doc.docType}</td>
                        <td className="px-6 py-4 text-sm font-medium text-text-primary">{doc.fileName}</td>
                        <td className="px-6 py-4 text-sm text-text-muted">{doc.fileSize}</td>
                        <td className="px-6 py-4 text-sm text-text-muted">{doc.uploadDate}</td>
                        <td className="px-6 py-4 text-sm text-text-muted">{doc.uploadedBy}</td>
                        <td className="px-6 py-4">
                          <span className={cn('rounded-md px-2 py-0.5 text-xs font-medium', statusConfig[doc.status] || 'bg-bg-subtle text-text-muted')}>
                            {doc.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button className="text-text-muted hover:text-brand-primary" title="دانلود">
                            <Download className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
