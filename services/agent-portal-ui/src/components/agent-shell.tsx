'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard, Calculator, Users, BarChart3, Settings, Command, Bell, Search,
} from 'lucide-react';
import { cn } from '@insurance/ui-utils';
import { ThemeToggle, CommandPalette } from '@insurance/design-system';

const sidebarNav = [
  { href: '/', label: 'داشبورد', icon: LayoutDashboard },
  { href: '/quotes', label: 'پیشنهادات', icon: Calculator },
  { href: '/customers', label: 'مشتریان', icon: Users },
  { href: '/commissions', label: 'کمیسیون', icon: BarChart3 },
  { href: '/settings', label: 'تنظیمات', icon: Settings },
];

export function AgentShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [cmdOpen, setCmdOpen] = useState(false);

  const commands = [
    { id: 'dash', label: 'برو به داشبورد', icon: LayoutDashboard, action: () => router.push('/') },
    { id: 'quote', label: 'پیشنهاد جدید', icon: Calculator, action: () => router.push('/quotes/new') },
    { id: 'cust', label: 'جستجوی مشتری', icon: Users, action: () => router.push('/customers') },
    { id: 'comm', label: 'گزارش کمیسیون', icon: BarChart3, action: () => router.push('/commissions') },
  ];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-border-default bg-bg-raised/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-brand-primary" />
            <span className="text-base font-bold text-text-primary">پرتال نماینده</span>
          </div>

          <button
            onClick={() => setCmdOpen(true)}
            className="flex w-64 items-center gap-2 rounded-lg border border-border-default bg-bg-base px-3 py-1.5 text-sm text-text-muted transition-colors hover:border-border-focus"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-right">جستجو...</span>
            <kbd className="rounded bg-bg-subtle px-1.5 text-xs">⌘K</kbd>
          </button>

          <div className="flex items-center gap-3">
            <button className="relative rounded-lg p-2 text-text-secondary hover:bg-bg-subtle">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-feedback-error" />
            </button>
            <ThemeToggle size="sm" />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-6 md:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <aside className="hidden rounded-2xl border border-border-default bg-bg-raised p-3 md:block">
          <nav aria-label="Sidebar" className="space-y-1">
            {sidebarNav.map((item) => {
              const active = router.pathname === item.href || router.pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors',
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

        {/* Main */}
        <main className="rounded-2xl border border-border-default bg-bg-raised p-6">
          {children}
        </main>
      </div>

      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} commands={commands} />
    </div>
  );
}
