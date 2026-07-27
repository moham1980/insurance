export const SUPPORTED_CURRENCIES = ['IRR', 'IRT', 'USD'] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

const DECIMALS: Record<Currency, number> = {
  IRR: 0,
  IRT: 0,
  USD: 2,
};

export class Money {
  readonly currency: Currency;
  readonly minor: number;

  constructor(raw: { amount: string | number; currency?: string }) {
    this.currency = this.normalizeCurrency(raw.currency);
    const parsed = this.parseAmount(raw.amount);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Invalid money amount: ${raw.amount}`);
    }
    this.minor = Math.round(parsed * Math.pow(10, DECIMALS[this.currency]));
    if (this.minor < 0) {
      throw new Error(`Money amount cannot be negative: ${this.minor}`);
    }
    if (this.minor > Number.MAX_SAFE_INTEGER) {
      throw new Error(`Money amount overflow: ${this.minor}`);
    }
  }

  static zero(currency: Currency): Money {
    return new Money({ amount: 0, currency });
  }

  static fromMinor(minor: number, currency: Currency): Money {
    const m = new Money({ amount: 0, currency });
    (m as any).minor = minor;
    return m;
  }

  private normalizeCurrency(c?: string): Currency {
    if (!c) return 'IRR';
    const upper = String(c).toUpperCase();
    if (!SUPPORTED_CURRENCIES.includes(upper as Currency)) {
      throw new Error(`Unsupported currency: ${c}`);
    }
    return upper as Currency;
  }

  private parseAmount(v: string | number): number {
    if (typeof v === 'number') return v;
    const s = String(v).replace(/,/g, '').trim();
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.fromMinor(this.minor + other.minor, this.currency);
  }

  multiply(factor: number): Money {
    if (!Number.isFinite(factor) || factor < 0) {
      throw new Error(`Invalid multiplier: ${factor}`);
    }
    const result = Math.round(this.minor * factor);
    if (!Number.isFinite(result)) throw new Error('Money multiplication overflow');
    return Money.fromMinor(result, this.currency);
  }

  applyPercent(percent: number): Money {
    if (!Number.isFinite(percent)) {
      throw new Error(`Invalid percent: ${percent}`);
    }
    const factor = 1 + percent / 100;
    return this.multiply(factor);
  }

  toMajorString(): string {
    const divisor = Math.pow(10, DECIMALS[this.currency]);
    return (this.minor / divisor).toFixed(DECIMALS[this.currency]);
  }

  toNumber(): number {
    const divisor = Math.pow(10, DECIMALS[this.currency]);
    return this.minor / divisor;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
  }
}

export function toFiniteNumber(v: any, def: number = 0): number {
  if (v === null || v === undefined) return def;
  if (typeof v === 'number') return Number.isFinite(v) ? v : def;
  const s = String(v).replace(/,/g, '').trim();
  if (s === '') return def;
  const n = Number(s);
  return Number.isFinite(n) ? n : def;
}
