'use client';
import * as React from 'react';
import { cn } from '@insurance/ui-utils';

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral' | 'warning';
  icon: React.ComponentType<any>;
  className?: string;
}

export function StatCard({ title, value, change, changeType = 'neutral', icon: Icon, className }: StatCardProps) {
  const changeColor = {
    positive: 'text-feedback-success',
    negative: 'text-feedback-error',
    neutral: 'text-text-muted',
    warning: 'text-feedback-warning',
  }[changeType];

  return (
    <div className={cn('rounded-xl border border-border-default bg-bg-raised p-4', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-text-muted">{title}</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{value}</p>
          {change && <p className={cn('mt-1 text-xs', changeColor)}>{change}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
