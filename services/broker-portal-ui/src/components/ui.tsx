import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@insurance/ui-utils';

// Re-export design system components
export { Button } from '@insurance/design-system';
export { Card } from '@insurance/design-system';
export { Skeleton } from '@insurance/design-system';
export { StatCard, type StatCardProps } from '@insurance/design-system';
export { ProgressBar } from '@insurance/design-system';
export { ThemeToggle } from '@insurance/design-system';
export { SkipLink } from '@insurance/design-system';

export function Loading() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="h-10 w-10 animate-spin rounded-full border-3 border-border-default border-t-brand-primary" />
      <p className="mt-3 text-sm text-text-muted">در حال بارگذاری...</p>
    </div>
  );
}

export function ErrorBanner({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-feedback-error/30 bg-feedback-error-subtle px-4 py-3" role="alert">
      <div className="flex items-center gap-2 text-sm text-feedback-error">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        {error}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-md px-3 py-1 text-xs font-medium text-feedback-error hover:bg-feedback-error/10 transition-colors"
        >
          تلاش مجدد
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border-default bg-bg-subtle/50 py-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-overlay">
        <Icon className="h-8 w-8 text-text-muted" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-text-primary">{title}</h3>
      {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
    </div>
  );
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: 'فعال', className: 'bg-feedback-success-subtle text-feedback-success border-feedback-success/30' },
  'فعال': { label: 'فعال', className: 'bg-feedback-success-subtle text-feedback-success border-feedback-success/30' },
  pending: { label: 'در انتظار', className: 'bg-feedback-warning-subtle text-feedback-warning border-feedback-warning/30' },
  'در انتظار': { label: 'در انتظار', className: 'bg-feedback-warning-subtle text-feedback-warning border-feedback-warning/30' },
  'در انتظار قیمت‌گذاری': { label: 'در انتظار قیمت‌گذاری', className: 'bg-feedback-warning-subtle text-feedback-warning border-feedback-warning/30' },
  approved: { label: 'تایید شده', className: 'bg-feedback-success-subtle text-feedback-success border-feedback-success/30' },
  'تایید شده': { label: 'تایید شده', className: 'bg-feedback-success-subtle text-feedback-success border-feedback-success/30' },
  rejected: { label: 'رد شده', className: 'bg-feedback-error-subtle text-feedback-error border-feedback-error/30' },
  'رد شده': { label: 'رد شده', className: 'bg-feedback-error-subtle text-feedback-error border-feedback-error/30' },
  cancelled: { label: 'لغو شده', className: 'bg-bg-overlay text-text-secondary border-border-default' },
  'لغو شده': { label: 'لغو شده', className: 'bg-bg-overlay text-text-secondary border-border-default' },
  paid: { label: 'پرداخت شده', className: 'bg-feedback-success-subtle text-feedback-success border-feedback-success/30' },
  'پرداخت شده': { label: 'پرداخت شده', className: 'bg-feedback-success-subtle text-feedback-success border-feedback-success/30' },
  overdue: { label: 'سررسید گذشته', className: 'bg-feedback-error-subtle text-feedback-error border-feedback-error/30' },
  'سررسید گذشته': { label: 'سررسید گذشته', className: 'bg-feedback-error-subtle text-feedback-error border-feedback-error/30' },
  open: { label: 'باز', className: 'bg-feedback-info-subtle text-feedback-info border-feedback-info/30' },
  closed: { label: 'بسته', className: 'bg-bg-overlay text-text-secondary border-border-default' },
  'در حال بررسی': { label: 'در حال بررسی', className: 'bg-feedback-info-subtle text-feedback-info border-feedback-info/30' },
  'در حال صدور': { label: 'در حال صدور', className: 'bg-feedback-info-subtle text-feedback-info border-feedback-info/30' },
  'صادر شده': { label: 'صادر شده', className: 'bg-feedback-success-subtle text-feedback-success border-feedback-success/30' },
  'قیمت‌گذاری شده': { label: 'قیمت‌گذاری شده', className: 'bg-feedback-info-subtle text-feedback-info border-feedback-info/30' },
  'تسویه شده': { label: 'تسویه شده', className: 'bg-feedback-success-subtle text-feedback-success border-feedback-success/30' },
  'موفق': { label: 'موفق', className: 'bg-feedback-success-subtle text-feedback-success border-feedback-success/30' },
  'در مذاکره': { label: 'در مذاکره', className: 'bg-feedback-warning-subtle text-feedback-warning border-feedback-warning/30' },
  'منقضی': { label: 'منقضی', className: 'bg-bg-overlay text-text-secondary border-border-default' },
  'غیرفعال': { label: 'غیرفعال', className: 'bg-bg-overlay text-text-secondary border-border-default' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status?.toLowerCase()] || statusConfig[status] || { label: status || '-', className: 'bg-bg-overlay text-text-secondary border-border-default' };
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', config.className)}>
      {config.label}
    </span>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border-default bg-bg-raised shadow-sm">
      <table className="min-w-full divide-y divide-border-default">
        <thead className="bg-bg-subtle">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle bg-bg-raised">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function TableRow({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'transition-colors hover:bg-bg-subtle',
        onClick && 'cursor-pointer'
      )}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn('px-6 py-4 text-sm text-text-secondary', className)}>
      {children}
    </td>
  );
}
