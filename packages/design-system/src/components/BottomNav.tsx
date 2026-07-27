import * as React from 'react';
import { cn } from '@insurance/ui-utils';

export interface BottomNavItem {
  href: string;
  label: string;
  icon: any;
  active?: boolean;
}

export interface BottomNavProps {
  items: BottomNavItem[];
  className?: string;
}

export function BottomNav({ items, className }: BottomNavProps) {
  return (
    <nav
      aria-label="ناوبری پایین"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 border-t border-border-default bg-bg-raised shadow-2 md:hidden',
        className
      )}
    >
      <ul className="flex items-center justify-around px-2 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <a
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition-colors',
                  item.active
                    ? 'text-brand-primary'
                    : 'text-text-secondary hover:text-text-primary'
                )}
                aria-current={item.active ? 'page' : undefined}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
