import { describe, it, expect } from 'bun:test';
import { QuoteEngine } from './quote-engine';
import type { PricingRule } from './entities/PricingRule';

function baseRule(overrides?: Partial<PricingRule>): PricingRule {
  return {
    pricingRuleId: 'rule-base',
    tenantId: 't1',
    productId: 'p1',
    code: 'BASE',
    nameFa: 'پایه',
    ruleType: 'base',
    priority: 100,
    rule: { version: 1, basePremium: 1000 },
    conditions: null,
    regions: null,
    validFrom: null,
    validTo: null,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as PricingRule;
}

function adjustmentRule(overrides?: Partial<PricingRule>): PricingRule {
  return {
    pricingRuleId: 'rule-adj',
    tenantId: 't1',
    productId: 'p1',
    code: 'ADJ',
    nameFa: 'اضافه',
    ruleType: 'conditional',
    priority: 50,
    rule: { version: 1, type: 'add', value: 100 },
    conditions: { age: { op: 'gte', value: 18 } },
    regions: null,
    validFrom: null,
    validTo: null,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as PricingRule;
}

describe('QuoteEngine', () => {
  it('computes a basic premium', () => {
    const result = QuoteEngine.compute([baseRule()], {
      productId: 'p1',
      tenantId: 't1',
      productStatus: 'active',
      currency: 'IRR',
      exposure: {},
      effectiveDate: new Date(),
    });
    expect(result.basePremium).toBe('1000');
    expect(result.totalPremium).toBe('1000');
    expect(result.appliedRuleCodes).toEqual(['BASE']);
  });

  it('applies conditional adjustment when exposure matches', () => {
    const result = QuoteEngine.compute([baseRule(), adjustmentRule()], {
      productId: 'p1',
      tenantId: 't1',
      productStatus: 'active',
      currency: 'IRR',
      exposure: { age: 25 },
      effectiveDate: new Date(),
    });
    expect(result.totalPremium).toBe('1100');
    expect(result.adjustments.length).toBe(1);
  });

  it('rejects non-active product status', () => {
    try {
      QuoteEngine.compute([baseRule()], {
        productId: 'p1',
        tenantId: 't1',
        productStatus: 'draft',
        currency: 'IRR',
        exposure: {},
        effectiveDate: new Date(),
      });
      expect.unreachable('expected throw');
    } catch (e: any) {
      expect(e.getResponse?.()?.error?.message).toBe('Product must be active to compute quote');
    }
  });

  it('filters rules outside effective date range', () => {
    const rule = baseRule({
      validFrom: new Date('2030-01-01'),
      validTo: new Date('2030-12-31'),
    });
    try {
      QuoteEngine.compute([rule], {
        productId: 'p1',
        tenantId: 't1',
        productStatus: 'active',
        currency: 'IRR',
        exposure: {},
        effectiveDate: new Date(),
      });
      expect.unreachable('expected throw');
    } catch (e: any) {
      expect(e.getResponse?.()?.error?.message).toBe('No active base pricing rule found for product');
    }
  });

  it('filters rules from other tenants or products', () => {
    const otherTenant = baseRule({ tenantId: 't2', pricingRuleId: 'rule-other' });
    const result = QuoteEngine.compute([otherTenant, baseRule()], {
      productId: 'p1',
      tenantId: 't1',
      productStatus: 'active',
      currency: 'IRR',
      exposure: {},
      effectiveDate: new Date(),
    });
    expect(result.appliedRuleIds).not.toContain('rule-other');
    expect(result.totalPremium).toBe('1000');
  });

  it('rejects multiple active base rules', () => {
    const r1 = baseRule({ pricingRuleId: 'b1' });
    const r2 = baseRule({ pricingRuleId: 'b2' });
    try {
      QuoteEngine.compute([r1, r2], {
        productId: 'p1',
        tenantId: 't1',
        productStatus: 'active',
        currency: 'IRR',
        exposure: {},
        effectiveDate: new Date(),
      });
      expect.unreachable('expected throw');
    } catch (e: any) {
      expect(e.getResponse?.()?.error?.message).toBe('Multiple active base pricing rules found');
    }
  });
});
