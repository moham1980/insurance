import * as React from 'react';
import { cn } from '@insurance/ui-utils';
import { Check, Clock, X, AlertCircle } from 'lucide-react';

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  timestamp?: string;
  status: 'completed' | 'current' | 'pending' | 'failed' | 'warn';
  actor?: string;
}

export interface PolicyTimelineProps {
  events: TimelineEvent[];
  className?: string;
}

const statusConfig = {
  completed: { icon: Check, color: 'text-success', bg: 'bg-success/10', border: 'border-success' },
  current: { icon: Clock, color: 'text-brand-primary', bg: 'bg-brand-primary/10', border: 'border-brand-primary' },
  pending: { icon: Clock, color: 'text-text-muted', bg: 'bg-bg-subtle', border: 'border-border-default' },
  failed: { icon: X, color: 'text-danger', bg: 'bg-danger/10', border: 'border-danger' },
  warn: { icon: AlertCircle, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning' },
};

export function PolicyTimeline({ events, className }: PolicyTimelineProps) {
  return (
    <div className={cn('space-y-0', className)}>
      {events.map((event, idx) => {
        const config = statusConfig[event.status];
        const Icon = config.icon;
        const isLast = idx === events.length - 1;

        return (
          <div key={event.id} className="relative flex gap-4">
            {!isLast && (
              <div
                className={cn(
                  'absolute right-[19px] top-10 h-full w-0.5',
                  event.status === 'completed' ? 'bg-success' : 'bg-border-default'
                )}
              />
            )}
            <div
              className={cn(
                'relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2',
                config.bg,
                config.border,
                config.color
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className={cn('pb-8', isLast && 'pb-0')}>
              <h4 className={cn('font-semibold', config.color)}>{event.title}</h4>
              {event.description && <p className="text-body-sm text-text-secondary">{event.description}</p>}
              {event.timestamp && (
                <p className="mt-1 text-caption text-text-muted">
                  {new Date(event.timestamp).toLocaleString('fa-IR')}
                </p>
              )}
              {event.actor && <p className="text-caption text-text-muted">توسط: {event.actor}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
