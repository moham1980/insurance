'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Command, ArrowLeft } from 'lucide-react';
import { Card } from '@insurance/design-system';

export interface CmdItem {
  id: string;
  label: string;
  icon?: any;
  shortcut?: string;
  href?: string;
  action?: () => void;
}

export function CommandPalette({ items }: { items: CmdItem[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) close();
        else open();
      }
      if (e.key === 'Escape' && isOpen) close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, open, close]);

  const filtered = items.filter(item =>
    item.label.includes(query) || item.id.includes(query.toLowerCase())
  );

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        const item = filtered[selectedIndex];
        if (item.action) item.action();
        else if (item.href) window.location.href = item.href;
        close();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, filtered, selectedIndex, close]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" dir="rtl">
      <div className="absolute inset-0 bg-bg-overlay backdrop-blur-sm" onClick={close} />
      <Card className="relative w-full max-w-lg shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border-default px-4 py-3">
          <Search className="h-5 w-5 text-text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="جستجو یا دستور..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          <kbd className="flex items-center gap-1 rounded-md border border-border-default bg-bg-subtle px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
            <Command className="h-3 w-3" /> K
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-text-muted">نتیجه‌ای یافت نشد</div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.action) item.action();
                    else if (item.href) window.location.href = item.href;
                    close();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    idx === selectedIndex ? 'bg-brand-primary/10 text-brand-primary' : 'text-text-secondary hover:bg-bg-subtle'
                  }`}
                >
                  {Icon && <Icon className="h-4 w-4 text-text-muted" />}
                  <span className="flex-1 text-right">{item.label}</span>
                  {item.shortcut && (
                    <kbd className="rounded-md border border-border-default bg-bg-subtle px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                      {item.shortcut}
                    </kbd>
                  )}
                  {idx === selectedIndex && <ArrowLeft className="h-4 w-4 text-brand-primary" />}
                </button>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
