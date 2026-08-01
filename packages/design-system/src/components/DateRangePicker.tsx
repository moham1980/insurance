'use client';
import * as React from 'react';
import { cn } from '@insurance/ui-utils';
import { JalaliDatePicker, type JalaliDatePickerProps } from './JalaliDatePicker';

export interface DateRangePickerProps {
  startValue?: string;
  endValue?: string;
  onStartChange?: (value: string) => void;
  onEndChange?: (value: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function DateRangePicker({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  label,
  className,
  disabled,
}: DateRangePickerProps) {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="mb-1 block text-sm font-medium text-text-primary">{label}</label>
      )}
      <div className="flex items-center gap-2">
        <JalaliDatePicker
          value={startValue}
          onChange={onStartChange}
          placeholder="تاریخ شروع"
          disabled={disabled}
          max={endValue}
          className="flex-1"
        />
        <span className="text-text-muted">—</span>
        <JalaliDatePicker
          value={endValue}
          onChange={onEndChange}
          placeholder="تاریخ پایان"
          disabled={disabled}
          min={startValue}
          className="flex-1"
        />
      </div>
    </div>
  );
}
