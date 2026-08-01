'use client';
import * as React from 'react';
import { cn } from '@insurance/ui-utils';
import { Lightbulb, ChevronLeft } from 'lucide-react';

export interface CopilotSuggestion {
  id: string;
  title: string;
  description: string;
  confidence?: number;
  source?: string;
  actionLabel?: string;
}

export interface CopilotSuggestionCardProps {
  suggestion: CopilotSuggestion;
  onClick?: (suggestion: CopilotSuggestion) => void;
  className?: string;
}

export function CopilotSuggestionCard({
  suggestion,
  onClick,
  className,
}: CopilotSuggestionCardProps) {
  return (
    <button
      onClick={() => onClick?.(suggestion)}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl border border-border-default bg-bg-base p-3 text-right transition-colors hover:border-brand-primary hover:bg-bg-subtle',
        className,
      )}
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
        <Lightbulb className="h-4 w-4" />
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <p className="font-medium text-text-primary">{suggestion.title}</p>
          {suggestion.confidence !== undefined && (
            <span className="text-caption text-text-muted">
              {Math.round(suggestion.confidence * 100)}٪ اطمینان
            </span>
          )}
        </div>
        {suggestion.description && (
          <p className="text-body-sm text-text-secondary line-clamp-2">{suggestion.description}</p>
        )}
        {suggestion.source && (
          <p className="text-caption text-text-muted">منبع: {suggestion.source}</p>
        )}
      </div>
      <ChevronLeft className="h-4 w-4 flex-shrink-0 text-text-muted" />
    </button>
  );
}
