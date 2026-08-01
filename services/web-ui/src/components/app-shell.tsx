'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Gauge, FileText, Briefcase, ShieldAlert, Settings, Users, Building2, UserRound, FileSignature, CreditCard, ClipboardList, MessageSquare, Landmark, Repeat, Package, BarChart3, Coins, ShieldCheck, Brain, Search, Command, Rows3, Rows4 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ThemeToggle, SkipLink, BottomNav, WorkspaceSwitcher } from '@insurance/design-system';
import { AiToggle } from '@/components/ai-toggle';
import { UserSession } from '@/components/user-session';
import { RealtimeStatus } from '@/components/realtime-status';
import { CommandPalette } from '@/components/command-palette';
import { getAuthUser, hasAuthToken } from '@/lib/api';
import { POLICY_NAV_ROLES } from '@/lib/policy-rbac';
import { enterprisePermissionsForRoles, hasEnterprisePermission, type EnterprisePermissionKey } from '@/lib/enterprise-rbac';

const nav = [
  { href: '/', label: 'داشبورد', icon: Gauge },
  { href: '/insurer-operations', label: 'عملیات بیمه‌گری', icon: Briefcase, roles: ['insurer_admin', 'head_office_ops'] },
  { href: '/party', label: 'اشخاص / KYC', icon: UserRound, perm: 'party:list' satisfies EnterprisePermissionKey },
  { href: '/policies', label: 'بیمه‌نامه‌ها', icon: FileSignature, roles: POLICY_NAV_ROLES },
  { href: '/payments', label: 'پرداخت‌ها', icon: CreditCard, perm: 'payments:list' satisfies EnterprisePermissionKey },
  { href: '/collections', label: 'اقساط و وصول', icon: Coins, perm: 'collections:plan_list' satisfies EnterprisePermissionKey },
  { href: '/aml', label: 'AML / انطباق', icon: ShieldCheck, perm: 'aml:dashboard' satisfies EnterprisePermissionKey },
  { href: '/work-items', label: 'کارها (Work Items)', icon: ClipboardList, perm: 'work_items:list' satisfies EnterprisePermissionKey },
  { href: '/underwriting', label: 'بیمه‌نامه‌گذاری', icon: ClipboardList, roles: ['insurer_admin', 'head_office_ops', 'uw_ops'] },
  { href: '/claims', label: 'خسارت', icon: Briefcase, perm: 'rm:claims:view' satisfies EnterprisePermissionKey },
  { href: '/loss-adjuster', label: 'ارزیابان خسارت', icon: Users, perm: 'rm:claims:view' satisfies EnterprisePermissionKey },
  { href: '/documents', label: 'اسناد', icon: FileText, perm: 'documents:list' satisfies EnterprisePermissionKey },
  { href: '/fraud', label: 'تقلب', icon: ShieldAlert, perm: 'rm:fraud:view' satisfies EnterprisePermissionKey },
  { href: '/complaints', label: 'شکایات', icon: MessageSquare, perm: 'rm:complaints:view' satisfies EnterprisePermissionKey },
  { href: '/reinsurance/contracts', label: 'اتکایی (Reinsurance)', icon: Repeat, roles: ['insurer_admin', 'head_office_ops', 'reinsurance_ops', 'finance_ops'] },
  { href: '/product', label: 'محصولات (Product)', icon: Package, roles: ['insurer_admin', 'head_office_ops', 'uw_ops', 'product_ops'] },
  { href: '/sales-network/partners', label: 'شبکه فروش', icon: Users, perm: 'sales_network:partners:view' satisfies EnterprisePermissionKey },
  { href: '/reporting', label: 'گزارش‌ها / KPI', icon: BarChart3, perm: 'reporting:view' satisfies EnterprisePermissionKey },
  { href: '/admin/executive-bi', label: 'BI مدیریتی', icon: BarChart3, perm: 'reporting:view' satisfies EnterprisePermissionKey },
  { href: '/monitoring', label: 'Monitoring / SLO', icon: Gauge, perm: 'monitoring:dashboard:view' satisfies EnterprisePermissionKey },
  { href: '/dlq', label: 'DLQ', icon: ShieldAlert, perm: 'dlq:stats' satisfies EnterprisePermissionKey },
  { href: '/document-ai', label: 'Document AI', icon: FileText, perm: 'document_ai:jobs:list' satisfies EnterprisePermissionKey },
  { href: '/ai-governance', label: 'AI Governance', icon: Brain, perm: 'admin:users:list' satisfies EnterprisePermissionKey },
  { href: '/sanhab', label: 'سنهاب / کد یکتا', icon: Landmark },
  { href: '/admin/users', label: 'کاربران', icon: Users, perm: 'admin:users:list' satisfies EnterprisePermissionKey },
  { href: '/admin/jobs', label: 'کارهای پس‌زمینه', icon: ClipboardList, perm: 'admin:users:list' satisfies EnterprisePermissionKey },
  { href: '/admin/feature-flags', label: 'Feature Flags', icon: Settings, perm: 'admin:users:list' satisfies EnterprisePermissionKey },
  { href: '/admin/tracing', label: 'Distributed Tracing', icon: Repeat, perm: 'admin:users:list' satisfies EnterprisePermissionKey },
  { href: '/admin/audit-log', label: 'Audit Log', icon: FileText, perm: 'admin:users:list' satisfies EnterprisePermissionKey },
  { href: '/admin/realtime-test', label: 'تست زنده', icon: Gauge, perm: 'admin:users:list' satisfies EnterprisePermissionKey },
  { href: '/org-units', label: 'واحدهای سازمانی', icon: Building2, roles: ['insurer_admin'] },
  { href: '/admin/organization-settings', label: 'تنظیمات سازمان', icon: Settings, roles: ['insurer_admin'] },
  { href: '/admin/rbac-matrix', label: 'ماتریس دسترسی', icon: ShieldCheck, roles: ['insurer_admin'] },
  { href: '/settings', label: 'تنظیمات', icon: Settings, roles: ['insurer_admin'] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const safePathname = pathname || '/';
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('density');
    if (saved === 'compact') setCompact(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('density', compact ? 'compact' : 'comfortable');
  }, [compact]);

  const roles = getAuthUser()?.roles || [];
  const perms = enterprisePermissionsForRoles(roles);
  const effectiveNav = nav.filter((item: any) => {
    const requiredPerm = item?.perm as EnterprisePermissionKey | undefined;
    if (requiredPerm) return hasEnterprisePermission(perms, requiredPerm);
    const required = item?.roles;
    if (!required) return true;
    if (!Array.isArray(required) || required.length === 0) return true;
    return required.some((r: string) => roles.includes(r));
  });

  useEffect(() => {
    if (safePathname.startsWith('/login')) return;
    if (!hasAuthToken()) {
      try {
        window.location.href = '/login';
      } catch {
        // ignore
      }
    }
  }, [safePathname]);

  if (safePathname.startsWith('/login')) {
    return <>{children}</>;
  }

  if (!hasAuthToken()) {
    return null;
  }

  const bottomNavItems = effectiveNav.slice(0, 5).map((item: any) => ({
    href: item.href,
    label: item.label,
    icon: item.icon,
    active: item.href === '/' ? safePathname === '/' : safePathname.startsWith(item.href),
  }));

  const workspaces = [
    { id: 'ops', label: 'عملیات', icon: Gauge, href: '/' },
    { id: 'claims', label: 'خسارت', icon: Briefcase, href: '/claims', badge: '۳' },
    { id: 'uw', label: 'Underwriting', icon: ClipboardList, href: '/underwriting' },
    { id: 'fraud', label: 'تقلب', icon: ShieldAlert, href: '/fraud' },
    { id: 'admin', label: 'مدیریت', icon: Settings, href: '/admin/users' },
  ];
  const activeWorkspace = workspaces.find((w) => safePathname.startsWith(w.href))?.id ?? 'ops';

  const cmdItems = effectiveNav.map((item: any) => ({
    id: item.href,
    label: item.label,
    icon: item.icon,
    href: item.href,
  }));

  return (
    <div className="min-h-screen bg-bg-base" dir="rtl">
      <CommandPalette items={cmdItems} />
      <SkipLink />
      <header className="sticky top-0 z-10 border-b border-border-default bg-bg-raised/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-brand-primary" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">کنسول عملیات بیمه</div>
              <div className="text-xs text-text-muted">سیستم مدیریت بیمه‌گری</div>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <WorkspaceSwitcher
              workspaces={workspaces}
              activeId={activeWorkspace}
              onSwitch={(id: string) => {
                const ws = workspaces.find((w) => w.id === id);
                if (ws) window.location.href = ws.href;
              }}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true });
                window.dispatchEvent(event);
              }}
              className="hidden items-center gap-2 rounded-lg border border-border-default bg-bg-subtle px-3 py-1.5 text-sm text-text-muted hover:bg-bg-base md:flex"
            >
              <Search className="h-4 w-4" />
              <span>جستجو...</span>
              <kbd className="flex items-center gap-0.5 rounded border border-border-default bg-bg-raised px-1 text-[10px] font-medium text-text-muted">
                <Command className="h-3 w-3" />K
              </kbd>
            </button>
            <button
              onClick={() => setCompact(!compact)}
              className="flex items-center gap-1.5 rounded-lg border border-border-default bg-bg-subtle px-2.5 py-1.5 text-xs text-text-secondary hover:bg-bg-base"
              title={compact ? 'حالت راحت' : 'حالت فشرده'}
            >
              {compact ? <Rows4 className="h-4 w-4" /> : <Rows3 className="h-4 w-4" />}
              <span className="hidden lg:inline">{compact ? 'راحت' : 'فشرده'}</span>
            </button>
            <ThemeToggle size="sm" />
            <RealtimeStatus />
            <AiToggle />
            <UserSession />
          </div>
        </div>
      </header>

      <div className={cn('mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 pb-20 md:pb-6', compact ? 'py-3 gap-3' : 'py-6', 'md:grid-cols-[260px_1fr]')}>
        <aside className={cn('hidden rounded-2xl border border-border-default bg-bg-raised md:block', compact ? 'p-2' : 'p-3')}>
          <nav aria-label="Sidebar" className="space-y-1">
            {effectiveNav.map((item) => {
              const active = item.href === '/' ? safePathname === '/' : safePathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-xl text-sm transition-colors',
                    compact ? 'px-2.5 py-1.5' : 'px-3 py-2',
                    active ? 'bg-brand-primary text-text-on-brand' : 'text-text-secondary hover:bg-bg-subtle'
                  )}
                >
                  <Icon className={cn('h-4 w-4', active ? 'text-text-on-brand' : 'text-text-muted')} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main id="main-content" className="rounded-2xl border border-border-default bg-bg-raised">
          {children}
        </main>
      </div>

      <BottomNav items={bottomNavItems} />
    </div>
  );
}
