'use client';
import * as React from 'react';
import { cn } from '@insurance/ui-utils';
import { Button } from './Button';
import { Card } from './Card';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  content: React.ReactNode;
  isValid?: () => boolean;
}

export interface SubmissionWizardProps {
  steps: WizardStep[];
  onComplete: () => void;
  onCancel?: () => void;
  loading?: boolean;
  className?: string;
}

export function SubmissionWizard({ steps, onComplete, onCancel, loading, className }: SubmissionWizardProps) {
  const [current, setCurrent] = React.useState(0);

  const canNext = steps[current]?.isValid?.() ?? true;
  const isLast = current === steps.length - 1;

  const next = () => {
    if (isLast) {
      onComplete();
    } else if (canNext) {
      setCurrent((c) => Math.min(c + 1, steps.length - 1));
    }
  };

  const prev = () => setCurrent((c) => Math.max(c - 1, 0));

  return (
    <Card className={cn('w-full', className)}>
      <div className="border-b border-border-default px-6 py-4">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => {
            const state = idx < current ? 'done' : idx === current ? 'active' : 'pending';
            return (
              <div key={step.id} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold',
                      state === 'done' && 'border-brand-primary bg-brand-primary text-text-on-brand',
                      state === 'active' && 'border-brand-primary bg-bg-base text-brand-primary',
                      state === 'pending' && 'border-border-default bg-bg-subtle text-text-muted'
                    )}
                  >
                    {state === 'done' ? <Check className="h-4 w-4" /> : idx + 1}
                  </div>
                  <span
                    className={cn(
                      'text-caption',
                      state === 'active' ? 'text-text-primary' : 'text-text-secondary'
                    )}
                  >
                    {step.title}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={cn(
                      'mx-2 h-0.5 flex-1',
                      idx < current ? 'bg-brand-primary' : 'bg-border-default'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-6 py-6">
        <h3 className="text-h3 font-semibold text-text-primary">{steps[current].title}</h3>
        {steps[current].description && (
          <p className="mt-1 text-body-sm text-text-secondary">{steps[current].description}</p>
        )}
        <div className="mt-6">{steps[current].content}</div>
      </div>

      <div className="flex items-center justify-between border-t border-border-default px-6 py-4">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          انصراف
        </Button>
        <div className="flex items-center gap-2">
          {current > 0 && (
            <Button variant="secondary" onClick={prev} disabled={loading}>
              <ChevronRight className="ml-1 h-4 w-4" />
              قبلی
            </Button>
          )}
          <Button onClick={next} isLoading={loading} disabled={!canNext && !isLast}>
            {isLast ? (
              <>تکمیل و ارسال</>
            ) : (
              <>
                بعدی
                <ChevronLeft className="mr-1 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
