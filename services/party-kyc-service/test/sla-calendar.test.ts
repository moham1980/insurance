// @ts-nocheck
import { describe, it, expect } from 'bun:test';
import { isBusinessDay, addBusinessDays, businessDaysBetween } from '../src/sla-calendar';

describe('sla-calendar', () => {
  it('considers weekdays as business days', () => {
    const monday = new Date('2026-07-13'); // known Monday
    expect(isBusinessDay(monday)).toBe(true);
  });

  it('considers weekends as non-business days', () => {
    const saturday = new Date('2026-07-11');
    const sunday = new Date('2026-07-12');
    expect(isBusinessDay(saturday)).toBe(false);
    expect(isBusinessDay(sunday)).toBe(false);
  });

  it('adds business days skipping weekends', () => {
    const friday = new Date('2026-07-10');
    const nextFriday = addBusinessDays(friday, 5);
    // 5 business days from Friday -> next Friday
    expect(nextFriday.toISOString().startsWith('2026-07-17')).toBe(true);
  });

  it('counts business days between two dates', () => {
    const monday = new Date('2026-07-13');
    const wednesday = new Date('2026-07-15');
    expect(businessDaysBetween(monday, wednesday)).toBe(2);
  });
});
