import * as React from 'react';

export interface PopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function Popover({ trigger, children, align = 'center', side = 'bottom' }: PopoverProps) {
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

  const alignClass = {
    start: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'left-0',
  }[align];

  const sideClass = {
    top: 'bottom-full mb-1',
    bottom: 'top-full mt-1',
    left: 'right-full mr-1',
    right: 'left-full ml-1',
  }[side];

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div
          className={`absolute z-50 ${alignClass} ${sideClass} w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
