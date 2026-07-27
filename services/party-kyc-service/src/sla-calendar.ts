/**
 * Simple business calendar for SLA calculations.
 * By default excludes Saturday and Sunday. Holidays can be configured via
 * SLA_HOLIDAYS environment variable as ISO date strings separated by commas.
 */

const DEFAULT_WEEKEND_DAYS = [0, 6]; // Sunday and Saturday in JS getDay()

function parseHolidays(): Set<string> {
  const env = process.env.SLA_HOLIDAYS || '';
  if (!env) return new Set();
  return new Set(
    env
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean)
  );
}

export function isBusinessDay(date: Date): boolean {
  const iso = date.toISOString().split('T')[0];
  const holidays = parseHolidays();
  if (holidays.has(iso)) return false;
  const weekend = process.env.SLA_WEEKEND_DAYS
    ? process.env.SLA_WEEKEND_DAYS.split(',').map((d) => parseInt(d.trim(), 10))
    : DEFAULT_WEEKEND_DAYS;
  return !weekend.includes(date.getDay());
}

export function addBusinessDays(start: Date, days: number): Date {
  const result = new Date(start.getTime());
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (isBusinessDay(result)) added++;
  }
  return result;
}

export function businessDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const cursor = new Date(start.getTime());
  while (cursor.getTime() < end.getTime()) {
    cursor.setDate(cursor.getDate() + 1);
    if (isBusinessDay(cursor)) count++;
  }
  return count;
}
