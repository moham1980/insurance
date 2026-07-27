'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, ShieldAlert, CreditCard, User } from 'lucide-react';
import { cn } from '@insurance/ui-utils';
import { ThemeToggle, SkipLink, BottomNav } from '@insurance/design-system';

const navItems = [
  { href: '/', label: 'خانه', icon: Home },
  { href: '/policies', label: 'بیمه‌نامه‌ها', icon: FileText },
  { href: '/claims', label: 'خسارات', icon: ShieldAlert },
  { href: '/payments', label: 'پرداخت‌ها', icon: CreditCard },
  { href: '/profile', label: 'پروفایل', icon: User },
];

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const safePathname = pathname || '/';

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
            <div className="h-8 w-8 rounded-lg bg-brand-primary" />
            <span className="text-base font-bold text-text-primary">بیمه پلاس</span>
          </div>
          <ThemeToggle size="sm" />
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
