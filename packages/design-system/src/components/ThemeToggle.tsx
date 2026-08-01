'use client';
import * as React from 'react';
import { useTheme, useReducedMotion } from '@insurance/ui-utils';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@insurance/ui-utils';

export interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export function ThemeToggle({ className, size = 'md', showLabel = false }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const reducedMotion = useReducedMotion();

  const iconSize = size === 'sm' ? 16 : 20;

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const Icon = resolvedTheme === 'dark' ? Moon : Sun;
  const label = theme === 'system' ? 'سیستم' : theme === 'dark' ? 'تاریک' : 'روشن';

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className={cn(
        'inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-base px-2 py-1.5 text-sm text-text-primary transition-colors hover:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
        reducedMotion && 'transition-none',
        className
      )}
      aria-label={`تم فعلی: ${label}. کلیک کنید برای تغییر`}
      title={`تم: ${label}`}
    >
      <Icon size={iconSize} />
      {showLabel && <span>{label}</span>}
    </button>
  );
}
