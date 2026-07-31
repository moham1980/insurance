import * as React from 'react';
import { cn } from '@insurance/ui-utils';
import { Check } from 'lucide-react';

export interface StepperStep {
  id: string;
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: StepperStep[];
  currentStep: number;
  onStepClick?: (index: number) => void;
  className?: string;
}

export function Stepper({ steps, currentStep, onStepClick, className }: StepperProps) {
  return (
    <nav aria-label="Progress" className={cn('w-full', className)}>
      <ol className="flex items-center">
        {steps.map((step, idx) => {
          const isComplete = idx < currentStep;
          const isCurrent = idx === currentStep;
          const isClickable = onStepClick && idx <= currentStep;
          return (
            <li key={step.id} className={cn('flex items-center', idx < steps.length - 1 && 'flex-1')}>
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick?.(idx)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors',
                  isClickable && 'cursor-pointer hover:bg-bg-subtle',
                  !isClickable && 'cursor-default'
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors',
                    isComplete && 'border-brand-primary bg-brand-primary text-text-on-brand',
                    isCurrent && 'border-brand-primary text-brand-primary',
                    !isComplete && !isCurrent && 'border-border-default text-text-muted'
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : idx + 1}
                </span>
                <span className="hidden sm:block">
                  <span className={cn('block font-medium', isCurrent ? 'text-text-primary' : 'text-text-secondary')}>
                    {step.label}
                  </span>
                  {step.description && (
                    <span className="block text-xs text-text-muted">{step.description}</span>
                  )}
                </span>
              </button>
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    'mx-2 h-0.5 flex-1 rounded-full transition-colors',
                    idx < currentStep ? 'bg-brand-primary' : 'bg-border-default'
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
