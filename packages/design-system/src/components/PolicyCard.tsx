import * as React from 'react';
import { cn } from '@insurance/ui-utils';
import { FileText, Calendar, Shield } from 'lucide-react';

export interface PolicyCardProps {
  policyNumber: string;
  type: string;
  status: 'active' | 'expired' | 'pending' | 'cancelled';
  startDate: string;
  endDate: string;
  premium: string;
  className?: string;
  onClick?: () => void;
}

const statusConfig = {
  active: { label: 'فعال', color: 'bg-feedback-success-subtle text-feedback-success border-feedback-success' },
  expired: { label: 'منقضی', color: 'bg-feedback-error-subtle text-feedback-error border-feedback-error' },
  pending: { label: 'در انتظار', color: 'bg-feedback-warning-subtle text-feedback-warning border-feedback-warning' },
  cancelled: { label: 'لغو شده', color: 'bg-neutral-100 text-neutral-600 border-neutral-300' },
};

export function PolicyCard({ policyNumber, type, status, startDate, endDate, premium, className, onClick }: PolicyCardProps) {
  const config = statusConfig[status];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border border-border-default bg-bg-raised p-4 text-right transition-all active:scale-[0.98] hover:border-border-focus',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{type}</h3>
            <p className="text-xs text-text-muted">{policyNumber}</p>
          </div>
        </div>
        <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', config.color)}>
          {config.label}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-text-secondary">
        <div className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          <span>{endDate}</span>
        </div>
        <div className="flex items-center gap-1">
          <Shield className="h-3.5 w-3.5" />
          <span>{premium}</span>
        </div>
      </div>
    </button>
  );
}
