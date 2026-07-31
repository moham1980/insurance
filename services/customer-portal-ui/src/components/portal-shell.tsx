'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, ShieldAlert, CreditCard, User, Gavel, MessageSquare, FileSearch, RefreshCw } from 'lucide-react';
import { cn } from '@insurance/ui-utils';
import { ThemeToggle, SkipLink, BottomNav } from '@insurance/design-system';
import { useBrandTheme } from '@/config/brand-provider';

const navItems = [
  { href: '/', label: 'خانه', icon: Home },
  { href: '/policies', label: 'بیمه‌نامه‌ها', icon: FileText },
  { href: '/claims', label: 'خسارات', icon: ShieldAlert },
  { href: '/payments', label: 'پرداخت‌ها', icon: CreditCard },
  { href: '/profile', label: 'پروفایل', icon: User },
];

const secondaryNavItems = [
  { href: '/advocacy', label: 'وکالت', icon: Gavel },
  { href: '/adjuster-communication', label: 'ارتباط با کارشناس', icon: MessageSquare },
  { href: '/endorsement-tracking', label: 'پیگیری الحاقیه', icon: FileSearch },
  { href: '/renewal-comparison', label: 'مقایسه تمدید', icon: RefreshCw },
];

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const safePathname = pathname || '/';
  const brand = useBrandTheme();

  const bottomNavItems = navItems.map((item) => ({
    href: item.href,
    label: item.label,
    icon: item.icon,
    active: item.href === '/' ? safePathname === '/' : safePathname.startsWith(item.href),
  }));

  return (
    <div className="min-h-screen bg-bg-base">
      <SkipLink targetId="main-content" label="پرش به محتوای اصلی" />

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border-default bg-bg-raised/80 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {brand.headerLogoUrl ? (
              <img src={brand.headerLogoUrl} alt={brand.displayNameFa} className="h-8 w-auto rounded-lg" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-brand-primary" />
            )}
            <span className="text-base font-bold text-text-primary">{brand.displayNameFa}</span>
          </div>
          <ThemeToggle size="sm" />
        </div>
        {/* Secondary nav */}
        <div className="mx-auto flex max-w-lg gap-1 overflow-x-auto px-4 pb-2">
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = safePathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  active ? 'bg-brand-primary/10 text-brand-primary' : 'text-text-secondary hover:bg-bg-base'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main */}
      <main id="main-content" className="mx-auto max-w-lg px-4 py-4 pb-24">
        {children}
      </main>

      {/* FAB for quick actions */}
      <div className="fixed bottom-20 left-4 z-40 md:hidden">
        <Link
          href="/fnol"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-text-on-brand shadow-2 transition-transform active:scale-90"
          aria-label="ثبت خسارت جدید"
          title="ثبت خسارت جدید"
        >
          <ShieldAlert className="h-6 w-6" />
        </Link>
      </div>

      {/* Bottom Nav */}
      <BottomNav items={bottomNavItems} />
    </div>
  );
}
