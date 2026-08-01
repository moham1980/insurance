'use client';
import * as React from 'react';
import { cn } from '@insurance/ui-utils';
import { Card } from './Card';
import { TrendingUp, TrendingDown, Wallet, Calendar } from 'lucide-react';
import { formatCurrency } from '@insurance/ui-utils';

export interface CommissionLine {
  id: string;
  policyNumber?: string;
  policyholder?: string;
  amountMinor: number;
  currency: 'IRR' | 'IRT';
  type: 'accrual' | 'paid' | 'clawback' | 'pending';
  period: string;
  paidAt?: string;
}

export interface CommissionLedgerCardProps {
  balanceMinor: number;
  currency: 'IRR' | 'IRT';
  lines: CommissionLine[];
  pendingMinor: number;
  paidYtdMinor: number;
  className?: string;
}

export function CommissionLedgerCard({
  balanceMinor,
  currency,
  lines,
  pendingMinor,
  paidYtdMinor,
  className,
}: CommissionLedgerCardProps) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-bg-subtle p-4">
          <div className="flex items-center gap-2 text-text-muted">
            <Wallet className="h-4 w-4" />
            <span className="text-caption">مانده قابل تسویه</span>
          </div>
          <p className="mt-1 text-number-lg font-bold text-success">{formatCurrency(balanceMinor / 100, currency)}</p>
        </div>
        <div className="rounded-lg bg-bg-subtle p-4">
          <div className="flex items-center gap-2 text-text-muted">
            <TrendingUp className="h-4 w-4" />
            <span className="text-caption">تسویه شده امسال</span>
          </div>
          <p className="mt-1 text-number-lg font-bold text-text-primary">{formatCurrency(paidYtdMinor / 100, currency)}</p>
        </div>
        <div className="rounded-lg bg-bg-subtle p-4">
          <div className="flex items-center gap-2 text-text-muted">
            <TrendingDown className="h-4 w-4" />
            <span className="text-caption">در انتظار تسویه</span>
          </div>
          <p className="mt-1 text-number-lg font-bold text-warning">{formatCurrency(pendingMinor / 100, currency)}</p>
        </div>
      </div>

      <h4 className="mb-3 font-semibold text-text-primary">تراکنش‌های اخیر</h4>
      <div className="divide-y divide-border-default">
        {lines.map((line) => (
          <div key={line.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-text-primary">{line.policyNumber || '—'}</p>
              {line.policyholder && <p className="text-caption text-text-muted">{line.policyholder}</p>}
              <div className="mt-1 flex items-center gap-2 text-caption text-text-muted">
                <Calendar className="h-3 w-3" />
                {line.period}
              </div>
            </div>
            <div className="text-left">
              <p
                className={cn(
                  'font-semibold',
                  line.type === 'paid' && 'text-success',
                  line.type === 'clawback' && 'text-danger',
                  line.type === 'pending' && 'text-warning',
                  line.type === 'accrual' && 'text-text-primary'
                )}
              >
                {line.type === 'clawback' ? '-' : ''}
                {formatCurrency(line.amountMinor / 100, currency)}
              </p>
              <p className="text-caption text-text-muted">
                {line.type === 'accrual' && 'تخصیص'}
                {line.type === 'paid' && 'تسویه'}
                {line.type === 'clawback' && 'بازپرداخت'}
                {line.type === 'pending' && 'در انتظار'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
