import * as React from 'react';
import { cn } from '@insurance/ui-utils';
import { Search, FileText, User, Calculator, BarChart3, LogOut, Settings } from 'lucide-react';

export interface CommandItem {
  id: string;
  label: string;
  shortcut?: string;
  icon: React.ComponentType<any>;
  action: () => void;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

export function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [query, commands]);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  React.useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        isOpen ? onClose() : null; // caller toggles
      }
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        filtered[selectedIndex]?.action();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose, filtered, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[20vh]" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border-default bg-bg-raised shadow-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border-default px-3 py-2">
          <Search className="h-4 w-4 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو یا دستور..."
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
          />
          <kbd className="rounded border border-border-default bg-bg-base px-1.5 py-0.5 text-xs text-text-muted">ESC</kbd>
        </div>
        <ul className="max-h-64 overflow-y-auto py-1">
          {filtered.map((cmd, i) => {
            const Icon = cmd.icon;
            return (
              <li
                key={cmd.id}
                className={cn(
                  'flex cursor-pointer items-center justify-between px-3 py-2 text-sm',
                  i === selectedIndex ? 'bg-brand-primary/10 text-text-primary' : 'text-text-secondary hover:bg-bg-subtle'
                )}
                onClick={() => {
                  cmd.action();
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-text-muted" />
                  {cmd.label}
                </span>
                {cmd.shortcut && <kbd className="rounded bg-bg-base px-1.5 py-0.5 text-xs text-text-muted">{cmd.shortcut}</kbd>}
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-3 py-4 text-center text-sm text-text-muted">نتیجه‌ای یافت نشد</li>
          )}
        </ul>
      </div>
    </div>
  );
}
