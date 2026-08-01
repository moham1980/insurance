import * as React from 'react';
import { Search, Command, ArrowLeft } from 'lucide-react';

export interface CommandItem {
  id: string;
  label: string;
  icon?: any;
  shortcut?: string;
  action: () => void;
}

export function CommandPalette({ items, isOpen, onClose }: { items: CommandItem[]; isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const filtered = items.filter(item =>
    item.label.includes(query) || item.id.includes(query.toLowerCase())
  );

  React.useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        filtered[selectedIndex].action();
        onClose();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, filtered, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" dir="rtl">
      <div className="absolute inset-0 bg-bg-overlay backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-border-default bg-bg-raised shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border-default px-4 py-3">
          <Search className="h-5 w-5 text-text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="جستجو یا دستور..."
            className="flex-1 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          <kbd className="flex items-center gap-1 rounded-md border border-border-default bg-bg-base px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
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
                  onClick={() => { item.action(); onClose(); }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    idx === selectedIndex ? 'bg-brand-primary-subtle text-brand-primary' : 'text-text-secondary hover:bg-bg-base'
                  }`}
                >
                  {Icon && <Icon className="h-4 w-4 text-text-muted" />}
                  <span className="flex-1 text-right">{item.label}</span>
                  {item.shortcut && (
                    <kbd className="rounded-md border border-border-default bg-bg-base px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                      {item.shortcut}
                    </kbd>
                  )}
                  {idx === selectedIndex && <ArrowLeft className="h-4 w-4 text-brand-primary" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
