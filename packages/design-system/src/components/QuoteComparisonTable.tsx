import * as React from 'react';
import { cn } from '@insurance/ui-utils';
import { Button } from './Button';
import { Dialog } from './Dialog';

export interface QuoteComparisonItem {
  quoteResponseId: string;
  carrierOrganizationId: string;
  carrierName: string;
  premiumAmountMinor: string;
  premiumCurrency: string;
  taxesMinor?: string;
  feesMinor?: string;
  coverages: Array<{ code: string; nameFa?: string; limit?: string; deductible?: string }>;
  exclusions: string[];
  validUntil: string;
  rankScore?: number;
  rankReasonCodes?: string[];
  commissionAmountMinor?: string;
  commissionRateBps?: number;
  isSelected?: boolean;
}

export interface QuoteComparisonTableProps {
  items: QuoteComparisonItem[];
  onSelect?: (quoteResponseId: string) => void;
  loading?: boolean;
  className?: string;
}

function formatMoney(minor: string, currency: string): string {
  const value = parseInt(minor, 10) / 100;
  return new Intl.NumberFormat('fa-IR', { style: 'currency', currency }).format(value);
}

export function QuoteComparisonTable({ items, onSelect, loading, className }: QuoteComparisonTableProps) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [confirmId, setConfirmId] = React.useState<string | null>(null);

  const handleSelect = (id: string) => {
    setConfirmId(id);
  };

  const handleConfirm = () => {
    if (confirmId) {
      setSelectedId(confirmId);
      onSelect?.(confirmId);
    }
    setConfirmId(null);
  };

  if (loading) {
    return (
      <div className={cn('animate-pulse rounded-xl border border-border-default p-8', className)}>
        <div className="h-4 w-1/3 bg-bg-subtle rounded mb-4" />
        <div className="h-32 bg-bg-subtle rounded" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className={cn('rounded-xl border border-border-default p-8 text-center text-text-secondary', className)}>
        هیچ quote‌ای برای مقایسه وجود ندارد
      </div>
    );
  }

  const allCoverages = items.flatMap((i) => i.coverages.map((c) => c.code));
  const uniqueCoverages = [...new Set(allCoverages)];

  return (
    <div className={cn('overflow-x-auto rounded-xl border border-border-default', className)}>
      <table className="w-full text-sm">
        <thead className="bg-bg-subtle">
          <tr>
            <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary">فاکتور</th>
            {items.map((item) => (
              <th
                key={item.quoteResponseId}
                className="px-4 py-3 text-right text-xs font-semibold text-text-primary"
              >
                {item.carrierName}
                {item.rankScore != null && (
                  <span className="ml-2 inline-block rounded-full bg-accent-primary/10 px-2 py-0.5 text-xs text-accent-primary">
                    امتیاز: {item.rankScore.toFixed(1)}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-default">
          <tr className="bg-bg-base">
            <td className="px-4 py-3 font-medium text-text-secondary">حق بیمه</td>
            {items.map((item) => (
              <td key={item.quoteResponseId} className="px-4 py-3 font-semibold text-text-primary">
                {formatMoney(item.premiumAmountMinor, item.premiumCurrency)}
              </td>
            ))}
          </tr>
          {uniqueCoverages.map((code) => (
            <tr key={code} className="bg-bg-base">
              <td className="px-4 py-3 font-medium text-text-secondary">پوشش: {code}</td>
              {items.map((item) => {
                const cov = item.coverages.find((c) => c.code === code);
                return (
                  <td key={item.quoteResponseId} className="px-4 py-3 text-text-primary">
                    {cov ? (cov.limit || '✓') : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="bg-bg-base">
            <td className="px-4 py-3 font-medium text-text-secondary">استثناها</td>
            {items.map((item) => (
              <td key={item.quoteResponseId} className="px-4 py-3 text-text-secondary">
                {item.exclusions.length > 0 ? item.exclusions.join('، ') : 'بدون استثنا'}
              </td>
            ))}
          </tr>
          <tr className="bg-bg-base">
            <td className="px-4 py-3 font-medium text-text-secondary">اعتبار quote</td>
            {items.map((item) => (
              <td key={item.quoteResponseId} className="px-4 py-3 text-text-secondary">
                {new Date(item.validUntil).toLocaleDateString('fa-IR')}
              </td>
            ))}
          </tr>
          {items.some((i) => i.commissionAmountMinor) && (
            <tr className="bg-bg-warning/5">
              <td className="px-4 py-3 font-medium text-text-secondary">کمیسیون (افشای منافع)</td>
              {items.map((item) => (
                <td key={item.quoteResponseId} className="px-4 py-3 text-text-secondary">
                  {item.commissionAmountMinor
                    ? formatMoney(item.commissionAmountMinor, item.premiumCurrency)
                    : '—'}
                </td>
              ))}
            </tr>
          )}
          <tr className="bg-bg-base">
            <td className="px-4 py-3 font-medium text-text-secondary">انتخاب</td>
            {items.map((item) => (
              <td key={item.quoteResponseId} className="px-4 py-3">
                <Button
                  size="sm"
                  variant={selectedId === item.quoteResponseId ? 'primary' : 'outline'}
                  onClick={() => handleSelect(item.quoteResponseId)}
                  disabled={item.isSelected}
                >
                  {item.isSelected ? 'انتخاب شده' : 'انتخاب'}
                </Button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      <Dialog
        open={confirmId !== null}
        onClose={() => setConfirmId(null)}
        title="تأیید انتخاب quote"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmId(null)}>انصراف</Button>
            <Button variant="primary" onClick={handleConfirm}>تأیید</Button>
          </>
        }
      >
        آیا از انتخاب این quote اطمینان دارید؟ این عمل قابل بازگشت نیست.
      </Dialog>
    </div>
  );
}
