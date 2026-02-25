'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Gauge, FileText, BriefcaseBusiness, ShieldAlert, Settings, Users, Building2, UserRound, FileSignature, CreditCard, ClipboardList, MessageSquareWarning, Landmark, Repeat, Package, BarChart3, Coins, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { AiToggle } from '@/components/ai-toggle';
import { UserSession } from '@/components/user-session';
import { getAuthUser, hasAuthToken } from '@/lib/api';
import { POLICY_NAV_ROLES } from '@/lib/policy-rbac';
import { enterprisePermissionsForRoles, hasEnterprisePermission, type EnterprisePermissionKey } from '@/lib/enterprise-rbac';

const nav = [
  { href: '/', label: 'داشبورد', icon: Gauge },
  { href: '/party', label: 'اشخاص / KYC', icon: UserRound, perm: 'party:list' satisfies EnterprisePermissionKey },
  { href: '/policies', label: 'بیمه‌نامه‌ها', icon: FileSignature, roles: POLICY_NAV_ROLES },
  { href: '/payments', label: 'پرداخت‌ها', icon: CreditCard, perm: 'payments:list' satisfies EnterprisePermissionKey },
  { href: '/collections', label: 'اقساط و وصول', icon: Coins, perm: 'collections:plan_list' satisfies EnterprisePermissionKey },
  { href: '/aml', label: 'AML / انطباق', icon: ShieldCheck, perm: 'aml:dashboard' satisfies EnterprisePermissionKey },
  { href: '/work-items', label: 'کارها (Work Items)', icon: ClipboardList, perm: 'work_items:list' satisfies EnterprisePermissionKey },
  { href: '/claims', label: 'خسارت', icon: BriefcaseBusiness, perm: 'claims:list' satisfies EnterprisePermissionKey },
  { href: '/documents', label: 'اسناد', icon: FileText, perm: 'documents:list' satisfies EnterprisePermissionKey },
  { href: '/fraud', label: 'تقلب', icon: ShieldAlert, perm: 'fraud:cases:list' satisfies EnterprisePermissionKey },
  { href: '/complaints', label: 'شکایات', icon: MessageSquareWarning, perm: 'complaints:list' satisfies EnterprisePermissionKey },
  {
    href: '/reporting',
    label: 'گزارش‌ها / KPI',
    icon: BarChart3,
    perm: 'reporting:view' satisfies EnterprisePermissionKey,
  },
  { href: '/reinsurance', label: 'اتکایی (Reinsurance)', icon: Repeat, roles: ['insurer_admin', 'head_office_ops', 'reinsurance_ops', 'finance_ops'] },
  { href: '/product', label: 'محصولات (Product)', icon: Package, roles: ['insurer_admin', 'head_office_ops', 'uw_ops', 'product_ops'] },
  { href: '/sanhab', label: 'سنهاب / کد یکتا', icon: Landmark },
  { href: '/users', label: 'کاربران', icon: Users, roles: ['insurer_admin'] },
  { href: '/org-units', label: 'واحدهای سازمانی', icon: Building2, roles: ['insurer_admin'] },
  { href: '/settings', label: 'تنظیمات', icon: Settings, roles: ['insurer_admin'] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const safePathname = pathname || '/';

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

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-neutral-900" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">Insurance Enterprise Console</div>
              <div className="text-xs text-neutral-600">Bun + NestJS</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AiToggle />
            <UserSession />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-6 md:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border bg-white p-3">
          <nav className="space-y-1">
            {effectiveNav.map((item) => {
              const active = item.href === '/' ? safePathname === '/' : safePathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors',
                    active ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
                  )}
                >
                  <Icon className={cn('h-4 w-4', active ? 'text-white' : 'text-neutral-600')} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="rounded-2xl border bg-white">{children}</div>
      </div>
    </div>
  );
}
