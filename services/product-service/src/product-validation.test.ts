import { describe, it, expect } from 'bun:test';
import {
  requireTenant,
  assertResourceTenant,
  validateCurrency,
  validatePricingRuleSchema,
  validateTypedRuleSchema,
  validateConditions,
  clampInt,
  defaultPricingRule,
  isPlainObject,
} from './product.service';

function assertThrowsHttpPayload(fn: () => void, expectedMessage: string): void {
  try {
    fn();
    expect.unreachable('expected throw');
  } catch (e: any) {
    const response = e.getResponse?.() || {};
    const message = e.message;
    if (response?.error?.message) {
      expect(response.error.message).toBe(expectedMessage);
    } else {
      expect(message).toContain(expectedMessage);
    }
  }
}

describe('Tenant isolation helpers', () => {
  it('requireTenant trims and returns valid tenant UUID', () => {
    expect(requireTenant('  tenant-1  ')).toBe('tenant-1');
  });

  it('requireTenant throws for empty, whitespace or undefined tenant', () => {
    assertThrowsHttpPayload(() => requireTenant(undefined as any), 'Tenant context is required');
    assertThrowsHttpPayload(() => requireTenant(''), 'Tenant context is required');
    assertThrowsHttpPayload(() => requireTenant('   '), 'Tenant context is required');
  });

  it('assertResourceTenant passes for matching tenants', () => {
    expect(() => assertResourceTenant('tenant-1', 'tenant-1')).not.toThrow();
  });

  it('assertResourceTenant throws for cross-tenant access', () => {
    assertThrowsHttpPayload(
      () => assertResourceTenant('tenant-1', 'tenant-2'),
      'Resource belongs to a different tenant'
    );
  });
});

describe('Currency validation', () => {
  it('defaults to IRR and validates supported currencies', () => {
    expect(validateCurrency(undefined)).toBe('IRR');
    expect(validateCurrency('usd')).toBe('USD');
    expect(validateCurrency('IRT')).toBe('IRT');
  });

  it('rejects unsupported currencies', () => {
    assertThrowsHttpPayload(() => validateCurrency('EUR'), 'Currency EUR not supported');
  });
});

describe('Pricing rule schema validation', () => {
  it('accepts a valid base rule', () => {
    expect(() =>
      validatePricingRuleSchema({ version: 1, basePremium: 100 })
    ).not.toThrow();
  });

  it('rejects negative basePremium', () => {
    assertThrowsHttpPayload(
      () => validatePricingRuleSchema({ version: 1, basePremium: -10 }),
      'basePremium must be a non-negative finite number'
    );
  });

  it('rejects invalid rule version', () => {
    assertThrowsHttpPayload(
      () => validatePricingRuleSchema({ version: 2, basePremium: 100 }),
      'rule version must be 1'
    );
  });

  it('rejects adjustment with invalid type', () => {
    assertThrowsHttpPayload(
      () =>
        validatePricingRuleSchema({
          version: 1,
          basePremium: 100,
          adjustments: [{ code: 'X', type: 'invalid', value: 1 }],
        }),
      'adjustment type must be add or multiplier'
    );
  });

  it('validates typed base rule schema', () => {
    expect(() => validateTypedRuleSchema({ basePremium: 200 }, 'base')).not.toThrow();
    assertThrowsHttpPayload(
      () => validateTypedRuleSchema({}, 'base'),
      'base rule requires basePremium'
    );
  });

  it('validates tiered rule schema', () => {
    expect(() =>
      validateTypedRuleSchema(
        {
          field: 'age',
          tiers: [
            { min: 0, max: 30, value: 100, type: 'add' },
            { min: 30, max: 60, value: 50, type: 'add' },
          ],
        },
        'tiered'
      )
    ).not.toThrow();
  });

  it('rejects tiered rule missing field or tiers', () => {
    assertThrowsHttpPayload(
      () => validateTypedRuleSchema({ tiers: [] }, 'tiered'),
      'tiered rule requires field'
    );
    assertThrowsHttpPayload(
      () => validateTypedRuleSchema({ field: 'age' }, 'tiered'),
      'tiered rule requires tiers array'
    );
  });
});

describe('Condition validation', () => {
  it('accepts valid condition operators', () => {
    expect(() =>
      validateConditions({ age: { op: 'gte', value: 18 }, region: { operator: 'eq', value: 'THR' } })
    ).not.toThrow();
  });

  it('rejects invalid operators', () => {
    assertThrowsHttpPayload(
      () => validateConditions({ age: { op: 'unknown', value: 18 } }),
      'condition operator unknown not allowed'
    );
  });

  it('ignores non-object conditions', () => {
    assertThrowsHttpPayload(
      () => validateConditions({ age: 18 } as any),
      'condition age must be an object'
    );
  });
});

describe('Utility functions', () => {
  it('clampInt clamps values to range', () => {
    expect(clampInt(null, 50, 1, 200)).toBe(50);
    expect(clampInt(5, 50, 10, 100)).toBe(10);
    expect(clampInt(500, 50, 10, 100)).toBe(100);
    expect(clampInt(42, 50, 10, 100)).toBe(42);
  });

  it('defaultPricingRule returns valid shape', () => {
    expect(defaultPricingRule()).toEqual({ version: 1, basePremium: 0, adjustments: [] });
  });

  it('isPlainObject distinguishes objects from arrays and null', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(1)).toBe(false);
  });
});
