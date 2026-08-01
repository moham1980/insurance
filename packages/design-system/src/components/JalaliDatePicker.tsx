'use client';
import * as React from 'react';
import { cn } from '@insurance/ui-utils';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const jalaliMonths = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

const jalaliDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

function toJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  let gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

function toGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let gy = jy <= 979 ? 621 : 1600;
  jy -= jy <= 979 ? 0 : 979;
  let days =
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor((jy % 33 + 3) / 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [
    0,
    31,
    (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
    31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
  ];
  let gm = 0;
  for (gm = 0; gm < 13; gm++) {
    const v = sal_a[gm];
    if (gd <= v) break;
    gd -= v;
  }
  return [gy, gm, gd];
}

function getDaysInJalaliMonth(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  const isLeap = (((((jy - 474) % 2820) + 474 + 38) * 682) % 2816) < 682;
  return isLeap ? 30 : 29;
}

function getFirstDayOfWeek(jy: number, jm: number): number {
  const [gy, gm, gd] = toGregorian(jy, jm, 1);
  const date = new Date(gy, gm - 1, gd);
  const day = date.getDay();
  return (day + 1) % 7;
}

function formatJalaliDate(jy: number, jm: number, jd: number): string {
  return `${jy}/${jm.toString().padStart(2, '0')}/${jd.toString().padStart(2, '0')}`;
}

export interface JalaliDatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
}

export function JalaliDatePicker({
  value,
  onChange,
  label,
  placeholder = 'تاریخ را انتخاب کنید',
  className,
  disabled,
  min,
  max,
}: JalaliDatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const today = new Date();
  const [todayJalali] = React.useState(() => toJalali(today.getFullYear(), today.getMonth() + 1, today.getDate()));
  const [viewYear, setViewYear] = React.useState(todayJalali[0]);
  const [viewMonth, setViewMonth] = React.useState(todayJalali[1]);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedDate = value
    ? value.split('/').map(Number) as [number, number, number]
    : null;

  const daysInMonth = getDaysInJalaliMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDayClick = (day: number) => {
    const dateStr = formatJalaliDate(viewYear, viewMonth, day);
    onChange?.(dateStr);
    setOpen(false);
  };

  const isDayDisabled = (day: number): boolean => {
    if (!min && !max) return false;
    const dateStr = formatJalaliDate(viewYear, viewMonth, day);
    if (min && dateStr < min) return true;
    if (max && dateStr > max) return true;
    return false;
  };

  return (
    <div ref={ref} className={cn('relative', className)}>
      {label && (
        <label className="mb-1 block text-sm font-medium text-text-primary">{label}</label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary transition-colors',
          'hover:border-border-focus focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Calendar className="h-4 w-4 text-text-muted" />
        <span className={cn(!value && 'text-text-muted')}>
          {value || placeholder}
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 rounded-lg border border-border-default bg-bg-raised p-3 shadow-3" dir="rtl">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={handlePrevMonth} className="rounded p-1 hover:bg-bg-subtle" aria-label="ماه قبل">
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-text-primary">
              {jalaliMonths[viewMonth - 1]} {viewYear}
            </span>
            <button type="button" onClick={handleNextMonth} className="rounded p-1 hover:bg-bg-subtle" aria-label="ماه بعد">
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {jalaliDays.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-text-muted">
                {day.charAt(0)}
              </div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected =
                selectedDate &&
                selectedDate[0] === viewYear &&
                selectedDate[1] === viewMonth &&
                selectedDate[2] === day;
              const isToday =
                todayJalali[0] === viewYear &&
                todayJalali[1] === viewMonth &&
                todayJalali[2] === day;
              const isDisabled = isDayDisabled(day);
              return (
                <button
                  key={day}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    'h-8 w-8 rounded-md text-sm transition-colors',
                    isSelected && 'bg-brand-primary text-text-on-brand',
                    !isSelected && isToday && 'border border-brand-primary text-brand-primary',
                    !isSelected && !isToday && 'text-text-primary hover:bg-bg-subtle',
                    isDisabled && 'opacity-30 cursor-not-allowed'
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
