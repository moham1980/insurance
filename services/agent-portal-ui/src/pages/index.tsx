import * as React from 'react';
import {
  LayoutDashboard, FileText, DollarSign, Briefcase, Target,
  ClipboardList, Gavel, UserCheck, RefreshCw, LogOut,
  Menu, X, Shield, Command, Bell, Search, Moon, Sun, Sparkles,
} from 'lucide-react';
import { AgentLoginPage } from '../components/AgentLoginPage';
import { AgentDashboardPage } from '../components/AgentDashboardPage';
import { AgentPoliciesPage } from '../components/AgentPoliciesPage';
import { AgentCommissionsPage } from '../components/AgentCommissionsPage';
import { AgentPortfolioPage } from '../components/AgentPortfolioPage';
import { AgentLeadsPage } from '../components/AgentLeadsPage';
import {
  AgentClaimsPage, AgentAdvocacyPage,
  AgentAdjusterReferralsPage, AgentRecoveryPage,
} from '../components/AgentMiscPages';
import { CommandPalette, type CommandItem } from '../components/CommandPalette';
import { CopilotChatPanel } from '../components/CopilotChatPanel';
import { QuoteWizardPage } from '../components/QuoteWizardPage';
import { mockNotifications } from '../lib/mock-data';

type Page = 'dashboard' | 'policies' | 'commissions' | 'portfolio' | 'leads' | 'claims' | 'advocacy' | 'adjuster-referrals' | 'recovery' | 'quoteWizard';

const navGroups: { label: string; items: { key: Page; label: string; icon: any }[] }[] = [
  { label: 'اصلی', items: [{ key: 'dashboard', label: 'داشبورد', icon: LayoutDashboard }] },
  { label: 'بیمه‌نامه', items: [
    { key: 'policies', label: 'بیمه‌نامه‌ها', icon: FileText },
    { key: 'portfolio', label: 'پورتفولیو', icon: Briefcase },
    { key: 'quoteWizard', label: 'ویزارد قیمت‌گذاری', icon: Sparkles },
  ] },
  { label: 'فروش', items: [
    { key: 'leads', label: 'سرنخ‌ها', icon: Target },
    { key: 'commissions', label: 'کمیسیون‌ها', icon: DollarSign },
  ] },
  { label: 'خسارت', items: [
    { key: 'claims', label: 'خسارت‌ها', icon: ClipboardList },
    { key: 'advocacy', label: 'وکالت', icon: Gavel },
    { key: 'adjuster-referrals', label: 'کارشناسان', icon: UserCheck },
    { key: 'recovery', label: 'استرداد', icon: RefreshCw },
  ] },
];

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export default function AgentPortal() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [cmdOpen, setCmdOpen] = React.useState(false);
  const [showNotifs, setShowNotifs] = React.useState(false);
  const [darkMode, setDarkMode] = React.useState(false);
  const [copilotOpen, setCopilotOpen] = React.useState(false);

  React.useEffect(() => {
    const saved = localStorage.getItem('agent-dark-mode');
    if (saved === 'true') setDarkMode(true);
  }, []);

  React.useEffect(() => {
    localStorage.setItem('agent-dark-mode', String(darkMode));
  }, [darkMode]);

  React.useEffect(() => {
    const token = getCookie('auth-token');
    const agentId = getCookie('agent_id');
    const partnerId = getCookie('partner_id');
    if (token && agentId && partnerId) setIsLoggedIn(true);
  }, []);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleLogin = (token: string, agentId: string, partnerId: string, tenantId: string) => {
    document.cookie = `auth-token=${encodeURIComponent(token)}; path=/; max-age=86400; samesite=lax`;
    document.cookie = `agent_id=${encodeURIComponent(agentId)}; path=/; max-age=86400; samesite=lax`;
    document.cookie = `partner_id=${encodeURIComponent(partnerId)}; path=/; max-age=86400; samesite=lax`;
    document.cookie = `tenant_id=${encodeURIComponent(tenantId)}; path=/; max-age=86400; samesite=lax`;
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    document.cookie = 'auth-token=; Max-Age=0; path=/';
    document.cookie = 'agent_id=; Max-Age=0; path=/';
    document.cookie = 'partner_id=; Max-Age=0; path=/';
    document.cookie = 'tenant_id=; Max-Age=0; path=/';
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) return <AgentLoginPage onLogin={handleLogin} />;

  const cmdItems: CommandItem[] = navGroups.flatMap(g => g.items).map(item => ({
    id: item.key,
    label: item.label,
    icon: item.icon,
    action: () => setCurrentPage(item.key as Page),
  }));

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <AgentDashboardPage />;
      case 'policies': return <AgentPoliciesPage />;
      case 'commissions': return <AgentCommissionsPage />;
      case 'portfolio': return <AgentPortfolioPage />;
      case 'leads': return <AgentLeadsPage />;
      case 'claims': return <AgentClaimsPage />;
      case 'advocacy': return <AgentAdvocacyPage />;
      case 'adjuster-referrals': return <AgentAdjusterReferralsPage />;
      case 'recovery': return <AgentRecoveryPage />;
      case 'quoteWizard': return <QuoteWizardPage onClose={() => setCurrentPage('dashboard')} />;
      default: return <AgentDashboardPage />;
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-bg-base' : 'bg-bg-base'}`} dir="rtl">
      <CommandPalette items={cmdItems} isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-bg-overlay lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 right-0 z-50 w-64 transform bg-bg-raised shadow-xl transition-transform lg:translate-x-0 lg:shadow-none lg:border-l lg:border-border-default ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
        <div className="flex h-16 items-center justify-between border-b border-border-default px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary">
              <Shield className="h-5 w-5 text-text-on-brand" />
            </div>
            <span className="text-base font-bold text-text-primary">پورتال نماینده</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1 text-text-muted hover:bg-bg-base lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex h-[calc(100vh-4rem)] flex-col overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-text-muted">{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.key;
                return (
                  <button key={item.key} onClick={() => { setCurrentPage(item.key); setSidebarOpen(false); }}
                    className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${isActive ? 'bg-brand-primary-subtle text-brand-primary' : 'text-text-muted hover:bg-bg-base'}`}>
                    <Icon className={`h-5 w-5 ${isActive ? 'text-brand-primary' : 'text-text-muted'}`} />
                    {item.label}
                    {isActive && <div className="mr-auto h-1.5 w-1.5 rounded-full bg-brand-primary" />}
                  </button>
                );
              })}
            </div>
          ))}
          <div className="mt-auto border-t border-border-default pt-3">
            <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-feedback-error hover:bg-feedback-error-subtle">
              <LogOut className="h-5 w-5" /> خروج
            </button>
          </div>
        </nav>
      </aside>

      <div className="lg:pr-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border-default bg-bg-raised/80 px-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-text-muted hover:bg-bg-base lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <button onClick={() => setCmdOpen(true)} className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-base px-3 py-1.5 text-sm text-text-muted hover:bg-bg-base">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">جستجو...</span>
              <kbd className="flex items-center gap-0.5 rounded border border-border-default bg-bg-raised px-1 text-[10px] font-medium text-text-muted">
                <Command className="h-3 w-3" />K
              </kbd>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCopilotOpen(!copilotOpen)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${copilotOpen ? 'bg-brand-primary-subtle text-brand-primary' : 'bg-gradient-to-l from-brand-primary to-brand-secondary text-text-on-brand hover:opacity-90'}`}>
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">دستیار AI</span>
            </button>
            <button onClick={() => setDarkMode(!darkMode)} className="rounded-lg p-2 text-text-muted hover:bg-bg-base dark:text-text-muted dark:hover:opacity-90">
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <div className="relative">
            <button onClick={() => setShowNotifs(!showNotifs)} className="relative rounded-lg p-2 text-text-muted hover:bg-bg-base">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-feedback-error" />
            </button>
            {showNotifs && (
              <div className="absolute left-0 mt-2 w-80 rounded-2xl border border-border-default bg-bg-raised shadow-xl">
                <div className="border-b border-border-default px-4 py-3">
                  <h3 className="text-sm font-semibold text-text-primary">اعلان‌ها</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {mockNotifications.map(n => (
                    <div key={n.id} className="border-b border-border-default px-4 py-3 hover:bg-bg-base">
                      <p className="text-sm font-medium text-text-primary">{n.title}</p>
                      <p className="mt-0.5 text-xs text-text-muted">{n.description}</p>
                      <p className="mt-1 text-[10px] text-text-muted">{n.time}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 lg:p-8">{renderPage()}</main>
      </div>
      {copilotOpen && <CopilotChatPanel onClose={() => setCopilotOpen(false)} />}
    </div>
  );
}


