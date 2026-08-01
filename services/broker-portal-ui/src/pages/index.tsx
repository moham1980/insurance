import * as React from 'react';
import dynamic from 'next/dynamic';
import {
  LayoutDashboard, FileText, ShieldAlert, CreditCard, Scale,
  RefreshCw, Gavel, Briefcase, Handshake, Package, FileStack,
  GitCompare, Layers, Wallet, Users, LogOut, Menu, X, Sparkles,
  Upload, DollarSign, Building2,
} from 'lucide-react';
import { ThemeToggle, SkipLink } from '../components/ui';
import { BrandWrapper, type BrandConfig } from '@insurance/design-system';
import { LoginPage } from '../components/LoginPage';
import { DashboardPage } from '../components/DashboardPage';
import { AgreementsPage } from '../components/AgreementsPage';
import { OfferingsPage } from '../components/OfferingsPage';
import { SubmissionsPage } from '../components/SubmissionsPage';
import { QuotesPage } from '../components/QuotesPage';
import { PlacementsPage } from '../components/PlacementsPage';
import { CommissionsPage } from '../components/CommissionsPage';
import { SubAgentsPage } from '../components/SubAgentsPage';
import { DocumentsPage } from '../components/DocumentsPage';
import { SettlementsPage } from '../components/SettlementsPage';
import { PartnersPage } from '../components/PartnersPage';
import { CopilotPanel } from '../components/CopilotPanel';
import { ClaimsPage, PoliciesPage, PaymentsPage, UnderwritingPage, CollectionsPage, RegulatoryPage } from './legacy-pages';
import { mockCapabilities } from '../lib/mock-data';
import { brokerApi } from '../lib/api';

type Page =
  | 'dashboard' | 'claims' | 'policies' | 'payments' | 'underwriting'
  | 'collections' | 'regulatory'
  | 'agreements' | 'offerings' | 'submissions' | 'quotes' | 'placements'
  | 'commissions' | 'subagents' | 'documents' | 'settlements' | 'partners';

const navGroups: { label: string; items: { key: Page; label: string; icon: any }[] }[] = [
  { label: 'اصلی', items: [{ key: 'dashboard', label: 'داشبورد', icon: LayoutDashboard }] },
  { label: 'بیمه‌گری', items: [
    { key: 'agreements', label: 'قراردادها', icon: Handshake },
    { key: 'offerings', label: 'محصولات', icon: Package },
    { key: 'submissions', label: 'درخواست‌ها', icon: FileStack },
    { key: 'quotes', label: 'مقایسه قیمت‌ها', icon: GitCompare },
    { key: 'placements', label: 'صدور بیمه‌نامه', icon: Layers },
  ] },
  { label: 'مدیریت', items: [
    { key: 'claims', label: 'خسارت‌ها', icon: ShieldAlert },
    { key: 'policies', label: 'بیمه‌نامه‌ها', icon: FileText },
    { key: 'payments', label: 'پرداخت‌ها', icon: CreditCard },
    { key: 'underwriting', label: 'بیمه‌نامه‌گذاری', icon: Scale },
    { key: 'collections', label: 'وصول مطالبات', icon: RefreshCw },
  ] },
  { label: 'مالی', items: [
    { key: 'commissions', label: 'پورسانت‌ها', icon: Wallet },
    { key: 'settlements', label: 'تسویه‌ها', icon: DollarSign },
  ] },
  { label: 'شبکه', items: [
    { key: 'subagents', label: 'نمایندگان فرعی', icon: Users },
    { key: 'partners', label: 'شرکا', icon: Building2 },
  ] },
  { label: 'اسناد', items: [
    { key: 'documents', label: 'مدارک و مستندات', icon: Upload },
  ] },
  { label: 'نظارتی', items: [{ key: 'regulatory', label: 'امور نظارتی', icon: Gavel }] },
];

const defaultBrand: BrandConfig = {
  brandKey: 'broker-portal',
  displayNameFa: 'پورتال کارگزاری بیمه',
  primaryColor: '#1d4ed8',
  secondaryColor: '#4f46e5',
  fontFamily: 'vazirmatn',
  direction: 'rtl',
  calendar: 'jalali',
  currency: 'تومان',
  footerText: '© ۱۴۰۳ پورتال کارگزاری بیمه',
  legalText: 'تمامی حقوق محفوظ است',
};

function BrokerPortal() {
  const [currentPage, setCurrentPage] = React.useState<Page>('dashboard');
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [token, setToken] = React.useState('');
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [copilotOpen, setCopilotOpen] = React.useState(false);
  const [capabilities, setCapabilities] = React.useState<string[]>(mockCapabilities);

  React.useEffect(() => {
    const m = document.cookie.match(new RegExp('(^| )auth-token=([^;]+)'));
    if (m) { setToken(decodeURIComponent(m[2])); setIsLoggedIn(true); }
    brokerApi.getCapabilities().then((res: any) => {
      const caps = res?.data || res;
      if (Array.isArray(caps) && caps.length > 0) setCapabilities(caps);
    }).catch(() => { /* use mock capabilities */ });
  }, []);

  const handleLogin = (t: string) => {
    setToken(t); setIsLoggedIn(true);
    document.cookie = `auth-token=${encodeURIComponent(t)}; path=/; max-age=86400`;
  };
  const handleLogout = () => {
    document.cookie = 'auth-token=; Max-Age=0; path=/';
    setToken(''); setIsLoggedIn(false);
  };

  if (!isLoggedIn) return <LoginPage onLogin={handleLogin} />;

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage data={null} />;
      case 'agreements': return <AgreementsPage />;
      case 'offerings': return <OfferingsPage />;
      case 'submissions': return <SubmissionsPage />;
      case 'quotes': return <QuotesPage />;
      case 'placements': return <PlacementsPage />;
      case 'commissions': return <CommissionsPage />;
      case 'subagents': return <SubAgentsPage />;
      case 'documents': return <DocumentsPage />;
      case 'settlements': return <SettlementsPage />;
      case 'partners': return <PartnersPage />;
      case 'claims': return <ClaimsPage />;
      case 'policies': return <PoliciesPage />;
      case 'payments': return <PaymentsPage />;
      case 'underwriting': return <UnderwritingPage />;
      case 'collections': return <CollectionsPage />;
      case 'regulatory': return <RegulatoryPage />;
      default: return <DashboardPage data={null} />;
    }
  };

  return (
    <BrandWrapper brand={defaultBrand}>
      <SkipLink targetId="main-content" label="پرش به محتوای اصلی" />
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-bg-overlay lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 right-0 z-50 w-64 transform bg-bg-raised shadow-xl transition-transform lg:translate-x-0 lg:shadow-none lg:border-l lg:border-border-default ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
        <div className="flex h-16 items-center justify-between border-b border-border-default px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary">
              <Briefcase className="h-5 w-5 text-text-on-brand" />
            </div>
            <span className="text-base font-bold text-text-primary">پورتال کارگزاری</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1 text-text-muted hover:bg-bg-subtle lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex h-[calc(100vh-4rem)] flex-col overflow-y-auto px-3 py-4">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(item => capabilities.includes(item.key));
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label} className="mb-4">
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-text-muted">{group.label}</p>
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.key;
                  return (
                    <button key={item.key} onClick={() => { setCurrentPage(item.key); setSidebarOpen(false); }}
                      className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${isActive ? 'bg-brand-primary/10 text-brand-primary' : 'text-text-secondary hover:bg-bg-subtle'}`}>
                      <Icon className={`h-5 w-5 ${isActive ? 'text-brand-primary' : 'text-text-muted'}`} />
                      {item.label}
                      {isActive && <div className="mr-auto h-1.5 w-1.5 rounded-full bg-brand-primary" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
          <div className="mt-auto border-t border-border-default pt-3">
            <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-feedback-error hover:bg-feedback-error/10">
              <LogOut className="h-5 w-5" /> خروج
            </button>
          </div>
        </nav>
      </aside>
      <div className="lg:pr-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border-default bg-bg-raised/80 px-4 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-text-secondary hover:bg-bg-subtle lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden items-center gap-2 lg:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary">
                <Briefcase className="h-4 w-4 text-text-on-brand" />
              </div>
              <span className="text-sm font-bold text-text-primary">پورتال کارگزاری</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle size="sm" />
            <button
              onClick={() => setCopilotOpen(!copilotOpen)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                copilotOpen
                  ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-text-on-brand shadow-lg shadow-brand-primary/25'
                  : 'border border-border-default text-text-secondary hover:bg-bg-subtle'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">دستیار هوشمند</span>
            </button>
          </div>
        </header>
        <main id="main-content" className={`mx-auto max-w-7xl p-4 lg:p-8 ${copilotOpen ? 'lg:pl-96' : ''}`}>{renderPage()}</main>
      </div>
      <CopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} />
    </BrandWrapper>
  );
}

export default dynamic(() => Promise.resolve(BrokerPortal), { ssr: false });
