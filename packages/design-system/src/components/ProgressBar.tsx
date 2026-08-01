'use client';
import * as React from 'react';
import { cn } from '@insurance/ui-utils';

export interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md';
  color?: 'brand' | 'success' | 'warning';
  label?: string;
  showValue?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  color = 'brand',
  label,
  showValue = true,
  className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  const colorClass = {
    brand: 'bg-brand-primary',
    success: 'bg-feedback-success',
    warning: 'bg-feedback-warning',
  }[color];

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="mb-1 flex items-center justify-between text-xs">
          {label && <span className="text-text-secondary">{label}</span>}
          {showValue && <span className="font-medium text-text-primary">{Math.round(pct)}٪</span>}
        </div>
      )}
      <div className={cn('w-full overflow-hidden rounded-full bg-bg-subtle', size === 'sm' ? 'h-1.5' : 'h-2.5')}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', colorClass)}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
}
