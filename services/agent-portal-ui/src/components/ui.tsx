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

export function Loading({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="h-10 w-10 animate-spin rounded-full border-3 border-border-default border-t-brand-primary" />
      <p className="mt-3 text-sm text-text-muted">{label || 'در حال بارگذاری...'}</p>
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
        <button onClick={onRetry} className="rounded-lg px-3 py-1 text-xs font-medium text-feedback-error hover:bg-feedback-error-subtle">
          تلاش مجدد
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border-default bg-bg-base/50 py-16">
      <Icon className="h-12 w-12 text-text-muted" />
      <p className="mt-3 text-sm font-medium text-text-muted">{title}</p>
      {description && <p className="mt-1 text-xs text-text-muted">{description}</p>}
    </div>
  );
}

const statusConfig: Record<string, { label: string; className: string }> = {
  'ACTIVE': { label: 'فعال', className: 'bg-feedback-success-subtle text-feedback-success border-feedback-success/30' },
  'active': { label: 'فعال', className: 'bg-feedback-success-subtle text-feedback-success border-feedback-success/30' },
  'فعال': { label: 'فعال', className: 'bg-feedback-success-subtle text-feedback-success border-feedback-success/30' },
  'PENDING': { label: 'در انتظار', className: 'bg-feedback-warning-subtle text-feedback-warning border-feedback-warning/30' },
  'pending': { label: 'در انتظار', className: 'bg-feedback-warning-subtle text-feedback-warning border-feedback-warning/30' },
  'در انتظار': { label: 'در انتظار', className: 'bg-feedback-warning-subtle text-feedback-warning border-feedback-warning/30' },
  'EXPIRED': { label: 'منقضی', className: 'bg-bg-base text-text-muted border-border-default' },
  'expired': { label: 'منقضی', className: 'bg-bg-base text-text-muted border-border-default' },
  'منقضی': { label: 'منقضی', className: 'bg-bg-base text-text-muted border-border-default' },
  'CANCELLED': { label: 'لغو شده', className: 'bg-feedback-error-subtle text-feedback-error border-feedback-error/30' },
  'cancelled': { label: 'لغو شده', className: 'bg-feedback-error-subtle text-feedback-error border-feedback-error/30' },
  'لغو شده': { label: 'لغو شده', className: 'bg-feedback-error-subtle text-feedback-error border-feedback-error/30' },
  'PAID': { label: 'پرداخت شده', className: 'bg-feedback-success-subtle text-feedback-success border-feedback-success/30' },
  'paid': { label: 'پرداخت شده', className: 'bg-feedback-success-subtle text-feedback-success border-feedback-success/30' },
  'پرداخت شده': { label: 'پرداخت شده', className: 'bg-feedback-success-subtle text-feedback-success border-feedback-success/30' },
  'تأیید شده': { label: 'تأیید شده', className: 'bg-feedback-success-subtle text-feedback-success border-feedback-success/30' },
  'approved': { label: 'تأیید شده', className: 'bg-feedback-success-subtle text-feedback-success border-feedback-success/30' },
  'رد شده': { label: 'رد شده', className: 'bg-feedback-error-subtle text-feedback-error border-feedback-error/30' },
  'rejected': { label: 'رد شده', className: 'bg-feedback-error-subtle text-feedback-error border-feedback-error/30' },
  'در حال بررسی': { label: 'در حال بررسی', className: 'bg-brand-primary-subtle text-brand-primary border-brand-primary/30' },
  'جدید': { label: 'جدید', className: 'bg-brand-primary-subtle text-brand-primary border-brand-primary/30' },
  'تماس اول': { label: 'تماس اول', className: 'bg-feedback-warning-subtle text-feedback-warning border-feedback-warning/30' },
  'استعلام قیمت': { label: 'استعلام قیمت', className: 'bg-brand-secondary-subtle text-brand-secondary border-brand-secondary/30' },
  'در حال مذاکره': { label: 'در حال مذاکره', className: 'bg-feedback-warning-subtle text-feedback-warning border-feedback-warning/30' },
  'نهایی شده': { label: 'نهایی شده', className: 'bg-feedback-success-subtle text-feedback-success border-feedback-success/30' },
  'ارسال شده': { label: 'ارسال شده', className: 'bg-brand-primary-subtle text-brand-primary border-brand-primary/30' },
  'گزارش آماده': { label: 'گزارش آماده', className: 'bg-feedback-success-subtle text-feedback-success border-feedback-success/30' },
  'پذیرفته شده': { label: 'پذیرفته شده', className: 'bg-feedback-success-subtle text-feedback-success border-feedback-success/30' },
  'حل شده': { label: 'حل شده', className: 'bg-feedback-success-subtle text-feedback-success border-feedback-success/30' },
  'وصول شده': { label: 'وصول شده', className: 'bg-feedback-success-subtle text-feedback-success border-feedback-success/30' },
  'در حال پیگیری': { label: 'در حال پیگیری', className: 'bg-feedback-warning-subtle text-feedback-warning border-feedback-warning/30' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig[status?.toLowerCase()] || { label: status || '-', className: 'bg-bg-base text-text-muted border-border-default' };
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
        <thead className="bg-bg-base">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">{h}</th>
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
    <tr onClick={onClick} className={cn(onClick && 'cursor-pointer transition-colors hover:bg-bg-subtle')}>
      {children}
    </tr>
  );
}

export function TableCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn('px-6 py-4 text-sm text-text-muted', className)}>
      {children}
    </td>
  );
}
