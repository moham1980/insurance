import * as React from 'react';
import { cn } from '@insurance/ui-utils';
import { Button } from './Button';
import { Switch } from './Switch';

export interface ConsentPurpose {
  purpose: string;
  title: string;
  description?: string;
  dataTypes: string[];
  granted: boolean;
  validFrom?: string;
  validTo?: string;
}

export interface ConsentPanelProps {
  consents: ConsentPurpose[];
  onChange?: (purpose: string, granted: boolean) => void;
  onRevokeAll?: () => void;
  loading?: boolean;
  className?: string;
}

export function ConsentPanel({ consents, onChange, onRevokeAll, loading, className }: ConsentPanelProps) {
  return (
    <div className={cn('rounded-xl border border-border-default bg-bg-base p-6', className)}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-h3 font-semibold text-text-primary">مدیریت رضایت داده</h3>
          <p className="mt-1 text-body-sm text-text-secondary">
            هر سازمان فقط با رضایت صریح شما می‌تواند داده‌هایتان را مشاهده کند.
          </p>
        </div>
        {onRevokeAll && (
          <Button variant="ghost" size="sm" onClick={onRevokeAll} disabled={loading}>
            لغو همه
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {consents.map((consent) => (
          <div
            key={consent.purpose}
            className="flex items-start justify-between gap-4 rounded-lg border border-border-subtle p-4"
          >
            <div className="flex-1">
              <h4 className="font-medium text-text-primary">{consent.title}</h4>
              {consent.description && (
                <p className="mt-1 text-body-sm text-text-secondary">{consent.description}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {consent.dataTypes.map((type) => (
                  <span
                    key={type}
                    className="rounded-full bg-bg-subtle px-2 py-0.5 text-caption text-text-secondary"
                  >
                    {type}
                  </span>
                ))}
              </div>
              {(consent.validFrom || consent.validTo) && (
                <p className="mt-2 text-caption text-text-muted">
                  {consent.validFrom && `از ${new Date(consent.validFrom).toLocaleDateString('fa-IR')}`}
                  {consent.validFrom && consent.validTo && ' '}
                  {consent.validTo && `تا ${new Date(consent.validTo).toLocaleDateString('fa-IR')}`}
                </p>
              )}
            </div>
            <Switch
              checked={consent.granted}
              onCheckedChange={(checked) => onChange?.(consent.purpose, checked)}
              disabled={loading}
              aria-label={`رضایت ${consent.title}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
