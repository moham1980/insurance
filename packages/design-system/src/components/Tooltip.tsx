import * as React from 'react';

export interface TooltipProps {
  children: React.ReactNode;
  content: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ children, content, side = 'top' }: TooltipProps) {
  const [visible, setVisible] = React.useState(false);

  const sideClass = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1',
  }[side];

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          className={`absolute ${sideClass} z-50 whitespace-nowrap rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground shadow`}
          role="tooltip"
        >
          {content}
        </span>
      )}
    </span>
  );
}
