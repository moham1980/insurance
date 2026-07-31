import * as React from 'react';
import { cn } from '@insurance/ui-utils';

export interface ScoreDimension {
  dimension: string;
  label: string;
  score: number;
  maxScore: number;
  weight: number;
  reasonCode: string;
  description?: string;
}

export interface QuoteScoreBreakdownProps {
  totalScore: number;
  maxTotalScore: number;
  dimensions: ScoreDimension[];
  recommendationRank?: number;
  totalQuotes?: number;
  className?: string;
}

export function QuoteScoreBreakdown({
  totalScore,
  maxTotalScore,
  dimensions,
  recommendationRank,
  totalQuotes,
  className,
}: QuoteScoreBreakdownProps) {
  const percentage = maxTotalScore > 0 ? (totalScore / maxTotalScore) * 100 : 0;

  return (
    <div className={cn('rounded-xl border border-border-default p-6', className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-primary">تحلیل امتیاز quote</h3>
        {recommendationRank != null && totalQuotes != null && (
          <span className="rounded-full bg-accent-primary/10 px-3 py-1 text-sm text-accent-primary">
            رتبه {recommendationRank} از {totalQuotes}
          </span>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm text-text-secondary">امتیاز کل</span>
          <span className="text-2xl font-bold text-text-primary">
            {totalScore.toFixed(1)} / {maxTotalScore.toFixed(1)}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-bg-subtle">
          <div
            className="h-2 rounded-full bg-accent-primary transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {dimensions.map((dim) => {
          const dimPercentage = dim.maxScore > 0 ? (dim.score / dim.maxScore) * 100 : 0;
          return (
            <div key={dim.dimension}>
              <div className="flex items-baseline justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">{dim.label}</span>
                  <span className="text-xs text-text-tertiary">
                    وزن: {(dim.weight * 100).toFixed(0)}%
                  </span>
                </div>
                <span className="text-sm text-text-secondary">
                  {dim.score.toFixed(1)} / {dim.maxScore.toFixed(1)}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-bg-subtle">
                <div
                  className="h-1.5 rounded-full bg-accent-secondary transition-all duration-500"
                  style={{ width: `${dimPercentage}%` }}
                />
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded bg-bg-subtle px-1.5 py-0.5 text-xs font-mono text-text-tertiary">
                  {dim.reasonCode}
                </span>
                {dim.description && (
                  <span className="text-xs text-text-tertiary">{dim.description}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t border-border-default pt-4">
        <p className="text-xs text-text-tertiary">
          این امتیاز بر اساس قوانین مقایسه و شفاف است. هر dimension دارای reason code قابل audit است.
          انتخاب پیش‌فرض صرفاً بر اساس کمترین حق بیمه نیست.
        </p>
      </div>
    </div>
  );
}
