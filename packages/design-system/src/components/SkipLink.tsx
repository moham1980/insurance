import * as React from 'react';

export interface SkipLinkProps {
  targetId?: string;
  label?: string;
}

export function SkipLink({ targetId = 'main-content', label = 'پرش به محتوای اصلی' }: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:right-4 focus:z-50 focus:rounded-md focus:bg-brand-primary focus:px-4 focus:py-2 focus:text-text-on-brand focus:outline-none focus:ring-2 focus:ring-border-focus"
    >
      {label}
    </a>
  );
}
