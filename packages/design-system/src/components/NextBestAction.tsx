'use client';
import * as React from 'react';
import { cn } from '@insurance/ui-utils';
import { ArrowLeft, Sparkles } from 'lucide-react';

export interface NBACardProps {
  title: string;
  description: string;
  actionLabel: string;
  actionHref?: string;
  onAction?: () => void;
  priority?: 'high' | 'medium' | 'low';
  className?: string;
}

const priorityStyles = {
  high: 'border-l-feedback-error bg-feedback-error-subtle',
  medium: 'border-l-feedback-warning bg-feedback-warning-subtle',
  low: 'border-l-feedback-info bg-feedback-info-subtle',
};

export function NextBestAction({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  priority = 'medium',
  className,
}: NBACardProps) {
  const Wrapper = actionHref ? 'a' : 'button';
  const wrapperProps = actionHref
    ? { href: actionHref, className: 'block' }
    : { type: 'button' as const, onClick: onAction };

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        'w-full rounded-lg border-l-4 p-3 text-right transition-colors hover:opacity-90',
        priorityStyles[priority],
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-text-secondary" />
          <h4 className="text-sm font-medium text-text-primary">{title}</h4>
        </div>
        <span className="flex items-center gap-1 text-xs text-text-secondary">
          {actionLabel}
          <ArrowLeft className="h-3 w-3" />
        </span>
      </div>
      <p className="mt-1 text-xs text-text-secondary">{description}</p>
    </Wrapper>
  );
}
