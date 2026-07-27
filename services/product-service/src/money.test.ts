import { describe, it, expect } from 'bun:test';
import { Money, toFiniteNumber } from './money';

describe('Money', () => {
  it('parses IRR string and whole numbers', () => {
    const m = new Money({ amount: '1500000', currency: 'IRR' });
    expect(m.currency).toBe('IRR');
    expect(m.minor).toBe(1500000);
    expect(m.toMajorString()).toBe('1500000');
  });

  it('parses USD with two decimals', () => {
    const m = new Money({ amount: '12.34', currency: 'USD' });
    expect(m.minor).toBe(1234);
    expect(m.toMajorString()).toBe('12.34');
  });

  it('rejects unsupported currency', () => {
    expect(() => new Money({ amount: 100, currency: 'EUR' })).toThrow('Unsupported currency');
  });

  it('rejects negative amounts', () => {
    expect(() => new Money({ amount: -5, currency: 'IRR' })).toThrow('Money amount cannot be negative');
  });

  it('adds and multiplies without floating-point drift', () => {
    const base = new Money({ amount: '10.10', currency: 'USD' });
    const fee = new Money({ amount: '2.05', currency: 'USD' });
    const total = base.add(fee).multiply(1.5);
    expect(total.toMajorString()).toBe('18.23');
  });

  it('throws on currency mismatch', () => {
    const a = new Money({ amount: 100, currency: 'IRR' });
    const b = new Money({ amount: 1, currency: 'USD' });
    expect(() => a.add(b)).toThrow('Currency mismatch');
  });
});

describe('toFiniteNumber', () => {
  it('normalizes strings with commas and whitespace', () => {
    expect(toFiniteNumber('1,234,567')).toBe(1234567);
    expect(toFiniteNumber('  42  ')).toBe(42);
  });

  it('returns default for non-numeric values', () => {
    expect(toFiniteNumber('abc', 0)).toBe(0);
    expect(toFiniteNumber(null, -1)).toBe(-1);
  });
});
