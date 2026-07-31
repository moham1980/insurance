import { describe, it, expect } from '@jest/globals';
import {
  ActorContext,
  requireContext,
  hasCapability,
  parseDate,
  moneyFromBody,
  moneyFields,
  normalizePaging,
} from '../../services/product-service/src/brokerage-product.utils';

describe('P1 Brokerage Product helper functions', () => {
  it('requireContext returns tenant and organization when present', () => {
    const ctx: ActorContext = { tenantId: 't1', organizationId: 'o1' };
    const res = requireContext(ctx);
    expect(res.tenantId).toBe('t1');
    expect(res.orgId).toBe('o1');
  });

  it('requireContext throws when tenant or organization is missing', () => {
    expect(() => requireContext({ tenantId: 't1' } as any)).toThrow();
    expect(() => requireContext({ organizationId: 'o1' } as any)).toThrow();
  });

  it('hasCapability checks capabilities and admin roles', () => {
    expect(hasCapability({ tenantId: 't', capabilities: ['CARRIER'] }, 'CARRIER')).toBe(true);
    expect(hasCapability({ tenantId: 't', capabilities: ['BROKER'] }, 'CARRIER')).toBe(false);
    expect(hasCapability({ tenantId: 't', roles: ['insurer_admin'] }, 'CARRIER')).toBe(true);
    expect(hasCapability({ tenantId: 't', roles: ['system_admin'] }, 'CARRIER')).toBe(true);
  });

  it('parseDate handles ISO strings and invalid values', () => {
    const d = parseDate('2025-01-01T00:00:00Z');
    expect(d).toBeInstanceOf(Date);
    expect(parseDate(null)).toBeNull();
    expect(parseDate('invalid')).toBeNull();
  });

  it('moneyFromBody parses amountMinor and currency', () => {
    expect(moneyFromBody({ amountMinor: '1000', currency: 'IRR' })).toEqual({ amountMinor: '1000', currency: 'IRR' });
    expect(moneyFromBody({ amount: '2500', currency: 'USD' })).toEqual({ amountMinor: '2500', currency: 'USD' });
    expect(moneyFromBody(null)).toBeNull();
    expect(moneyFromBody({})).toBeNull();
  });

  it('moneyFields returns default IRR when currency missing', () => {
    const fields = moneyFields({ amountMinor: '500' });
    expect(fields.amountMinor).toBe('500');
    expect(fields.currency).toBe('IRR');
  });

  it('normalizePaging enforces defaults and bounds', () => {
    expect(normalizePaging(undefined, undefined)).toEqual({ limit: 50, offset: 0 });
    expect(normalizePaging(1000, -10)).toEqual({ limit: 200, offset: 0 });
    expect(normalizePaging(20, 40)).toEqual({ limit: 20, offset: 40 });
    expect(normalizePaging('abc', '5')).toEqual({ limit: 50, offset: 5 });
  });
});
