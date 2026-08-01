'use client';
import * as React from 'react';
import { cn } from '@insurance/ui-utils';
import { Check, X } from 'lucide-react';

export interface CoverageItem {
  name: string;
  limit: string;
  deductible?: string;
  included: boolean;
}

export interface CoverageMatrixProps {
  coverages: CoverageItem[];
  className?: string;
}

export function CoverageMatrix({ coverages, className }: CoverageMatrixProps) {
  return (
    <div className={cn('rounded-xl border border-border-default bg-bg-raised', className)}>
      <div className="border-b border-border-default px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">پوشش‌ها</h3>
      </div>
      <ul className="divide-y divide-border-default">
        {coverages.map((coverage) => (
          <li key={coverage.name} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              {coverage.included ? (
                <Check className="h-4 w-4 text-feedback-success" />
              ) : (
                <X className="h-4 w-4 text-text-muted" />
              )}
              <span className={cn('text-sm', coverage.included ? 'text-text-primary' : 'text-text-muted line-through')}>
                {coverage.name}
              </span>
            </div>
            <div className="text-left">
              <span className="text-xs text-text-secondary">{coverage.limit}</span>
              {coverage.deductible && (
                <p className="text-xs text-text-muted">فرانشیز: {coverage.deductible}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
