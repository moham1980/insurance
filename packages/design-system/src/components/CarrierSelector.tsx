import * as React from 'react';
import { cn } from '@insurance/ui-utils';
import { Card } from './Card';
import { Building2, Check, Info } from 'lucide-react';

export interface CarrierOption {
  carrierOrganizationId: string;
  carrierName: string;
  logoUrl?: string;
  description?: string;
  enabled: boolean;
  inAgreement: boolean;
  bindingAuthority: boolean;
  lineOfBusiness?: string[];
  quoteCount?: number;
}

export interface CarrierSelectorProps {
  carriers: CarrierOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  loading?: boolean;
  className?: string;
}

export function CarrierSelector({ carriers, selected, onChange, loading, className }: CarrierSelectorProps) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  if (loading) {
    return (
      <div className={cn('grid gap-3', className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-bg-subtle" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid gap-3', className)}>
      {carriers.map((carrier) => {
        const isSelected = selected.includes(carrier.carrierOrganizationId);
        const disabled = !carrier.enabled || !carrier.inAgreement;

        return (
          <Card
            key={carrier.carrierOrganizationId}
            onClick={() => !disabled && toggle(carrier.carrierOrganizationId)}
            className={cn(
              'cursor-pointer transition-all hover:shadow-2',
              isSelected && 'ring-2 ring-brand-primary',
              disabled && 'cursor-not-allowed opacity-60'
            )}
          >
            <div className="flex items-start gap-4 p-4">
              {carrier.logoUrl ? (
                <img
                  src={carrier.logoUrl}
                  alt={carrier.carrierName}
                  className="h-12 w-12 rounded-lg object-contain"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-bg-subtle text-text-secondary">
                  <Building2 className="h-6 w-6" />
                </div>
              )}

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-text-primary">{carrier.carrierName}</h4>
                  <div
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full border-2',
                      isSelected
                        ? 'border-brand-primary bg-brand-primary text-text-on-brand'
                        : 'border-border-default'
                    )}
                  >
                    {isSelected && <Check className="h-4 w-4" />}
                  </div>
                </div>
                {carrier.description && (
                  <p className="mt-1 text-body-sm text-text-secondary">{carrier.description}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-caption">
                  {carrier.lineOfBusiness?.map((lob) => (
                    <span key={lob} className="rounded-full bg-bg-subtle px-2 py-0.5 text-text-secondary">
                      {lob}
                    </span>
                  ))}
                  {carrier.quoteCount != null && (
                    <span className="text-text-muted">{carrier.quoteCount} quote</span>
                  )}
                </div>
                {!carrier.inAgreement && (
                  <div className="mt-2 flex items-center gap-1 text-caption text-danger">
                    <Info className="h-3.5 w-3.5" />
                    قرارداد توزیع فعال نیست
                  </div>
                )}
                {carrier.inAgreement && !carrier.bindingAuthority && (
                  <div className="mt-2 flex items-center gap-1 text-caption text-warning">
                    <Info className="h-3.5 w-3.5" />
                    بدون اختیار صدور مستقیم
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
