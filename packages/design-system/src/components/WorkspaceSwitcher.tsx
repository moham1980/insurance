import * as React from 'react';
import { cn } from '@insurance/ui-utils';
import { Briefcase, ShieldAlert, ClipboardCheck, Settings, ChevronDown } from 'lucide-react';

export interface Workspace {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  href: string;
  badge?: string;
}

export interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  activeId: string;
  onSwitch: (id: string) => void;
  className?: string;
}

export function WorkspaceSwitcher({ workspaces, activeId, onSwitch, className }: WorkspaceSwitcherProps) {
  const [open, setOpen] = React.useState(false);
  const active = workspaces.find((w) => w.id === activeId);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary hover:border-border-focus"
      >
        <span className="flex items-center gap-2">
          {active && <active.icon className="h-4 w-4 text-brand-primary" />}
          <span>{active?.label || 'فضای کاری'}</span>
        </span>
        <ChevronDown className={cn('h-4 w-4 text-text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-border-default bg-bg-raised shadow-3">
          <ul className="py-1">
            {workspaces.map((ws) => (
              <li key={ws.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSwitch(ws.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-2 text-sm transition-colors',
                    ws.id === activeId
                      ? 'bg-brand-primary/10 text-text-primary'
                      : 'text-text-secondary hover:bg-bg-subtle'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <ws.icon className="h-4 w-4 text-text-muted" />
                    {ws.label}
                  </span>
                  {ws.badge && (
                    <span className="rounded-full bg-feedback-error px-1.5 py-0.5 text-xs text-white">{ws.badge}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
