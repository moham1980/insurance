import * as React from 'react';

export interface DropdownMenuItem {
  id: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  align?: 'start' | 'end';
}

export function DropdownMenu({ trigger, items, align = 'start' }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div
          className={`absolute z-50 mt-1 w-48 rounded-md border bg-popover p-1 shadow-md ${
            align === 'end' ? 'left-0' : 'right-0'
          }`}
          role="menu"
        >
          {items.map((item) => (
            <button
              key={item.id}
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                item.onClick?.();
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm text-popover-foreground transition-colors ${
                item.disabled
                  ? 'pointer-events-none opacity-50'
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <span>{item.label}</span>
              {item.shortcut && (
                <kbd className="ml-2 rounded border bg-muted px-1 text-xs text-muted-foreground">
                  {item.shortcut}
                </kbd>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
