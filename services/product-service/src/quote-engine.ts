import { BadRequestException } from '@nestjs/common';
import { PricingRule, PricingRuleType } from './entities/PricingRule';
import { Money, Currency, SUPPORTED_CURRENCIES, toFiniteNumber } from './money';

type QuoteConditionOp = 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in';

interface QuoteCondition {
  field?: string;
  op?: QuoteConditionOp;
  value?: any;
  operator?: string;
}

interface QuoteAdjustment {
  code: string;
  nameFa?: string;
  type: 'add' | 'multiplier' | 'percent';
  value: number;
  applied: boolean;
  ruleId?: string;
  tier?: { min: number; max: number };
  region?: string;
}

interface QuoteRuleV1 {
  version: 1;
  basePremium: number;
  adjustments: Array<{
    code: string;
    nameFa?: string;
    when?: { field: string; op: 'eq' | 'in' | 'gte' | 'lte'; value: any };
    type: 'add' | 'multiplier';
    value: number;
  }>;
}

function isPlainObject(v: any): v is Record<string, any> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const ALLOWED_TYPES: PricingRuleType[] = ['base', 'conditional', 'tiered', 'regional', 'discount', 'surcharge'];

export interface QuoteInput {
  productId: string;
  tenantId: string;
  productStatus: string;
  currency: Currency;
  exposure?: Record<string, any>;
  region?: string;
  effectiveDate: Date;
}

export interface QuoteResult {
  productId: string;
  tenantId: string;
  currency: Currency;
  basePremium: string;
  basePremiumMinor: number;
  totalPremium: string;
  totalPremiumMinor: number;
  adjustments: QuoteAdjustment[];
  appliedRuleIds: string[];
  appliedRuleCodes: string[];
  effectiveDate: string;
  calculationSnapshot: any;
}

export class QuoteEngine {
  static compute(rules: PricingRule[], input: QuoteInput): QuoteResult {
    if (input.productStatus !== 'active') {
      throw new BadRequestException({
        success: false,
        error: { code: 'PRODUCT_NOT_ACTIVE', message: 'Product must be active to compute quote' },
      });
    }

    const exposure = isPlainObject(input.exposure) ? input.exposure : {};
    const currency = input.currency;
    let baseMoney: Money | null = null;
    const adjustments: QuoteAdjustment[] = [];
    const appliedRuleIds: string[] = [];
    const appliedRuleCodes: string[] = [];

    const sortedRules = [...rules]
      .filter((r) => r.tenantId === input.tenantId && r.productId === input.productId)
      .filter((r) => r.status === 'active')
      .filter((r) => this.isEffective(r, input.effectiveDate))
      .filter((r) => ALLOWED_TYPES.includes(r.ruleType))
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const rule of sortedRules) {
      if (!this.isApplicable(rule, exposure, input.region)) {
        continue;
      }

      appliedRuleIds.push(rule.pricingRuleId);
      appliedRuleCodes.push(rule.code);

      if (rule.ruleType === 'base') {
        const base = this.evaluateBaseRule(rule, currency);
        if (baseMoney) {
          // Reject multiple active base rules to avoid ambiguity
          throw new BadRequestException({
            success: false,
            error: { code: 'MULTIPLE_BASE_RULES', message: 'Multiple active base pricing rules found' },
          });
        }
        baseMoney = base;
      } else {
        const adj = this.evaluateTypedRule(rule, exposure, input.region, currency);
        if (adj) adjustments.push(adj);
      }
    }

    if (!baseMoney) {
      throw new BadRequestException({
        success: false,
        error: { code: 'NO_BASE_RULE', message: 'No active base pricing rule found for product' },
      });
    }

    let total = baseMoney;
    for (const adj of adjustments) {
      if (!adj.applied) continue;
      if (adj.type === 'add') {
        total = total.add(new Money({ amount: adj.value, currency }));
      } else if (adj.type === 'multiplier') {
        total = total.multiply(adj.value);
      } else if (adj.type === 'percent') {
        total = total.applyPercent(adj.value);
      }
    }

    return {
      productId: input.productId,
      tenantId: input.tenantId,
      currency,
      basePremium: baseMoney.toMajorString(),
      basePremiumMinor: baseMoney.minor,
      totalPremium: total.toMajorString(),
      totalPremiumMinor: total.minor,
      adjustments,
      appliedRuleIds,
      appliedRuleCodes,
      effectiveDate: input.effectiveDate.toISOString(),
      calculationSnapshot: {
        basePremiumMinor: baseMoney.minor,
        currency,
        adjustmentCount: adjustments.length,
        appliedRuleIds,
      },
    };
  }

  private static isEffective(rule: PricingRule, effectiveDate: Date): boolean {
    const now = new Date(effectiveDate);
    if (rule.validFrom && new Date(rule.validFrom) > now) return false;
    if (rule.validTo && new Date(rule.validTo) < now) return false;
    return true;
  }

  private static isApplicable(rule: PricingRule, exposure: Record<string, any>, region?: string): boolean {
    if (rule.regions && rule.regions.length > 0) {
      if (!region || !rule.regions.includes(region)) {
        return false;
      }
    }

    if (rule.conditions) {
      return this.evaluateConditions(rule.conditions, exposure);
    }

    return true;
  }

  private static evaluateConditions(conditions: Record<string, any>, exposure: Record<string, any>): boolean {
    for (const [key, condition] of Object.entries(conditions)) {
      if (!isPlainObject(condition)) continue;
      const value = exposure[key];
      const op = (condition.operator || condition.op) as string;
      if (!op) continue;

      if (op === 'eq' && value !== condition.value) return false;
      if (op === 'ne' && value === condition.value) return false;
      if (op === 'gt' && toFiniteNumber(value, Number.NEGATIVE_INFINITY) <= toFiniteNumber(condition.value, Number.POSITIVE_INFINITY)) return false;
      if (op === 'lt' && toFiniteNumber(value, Number.POSITIVE_INFINITY) >= toFiniteNumber(condition.value, Number.NEGATIVE_INFINITY)) return false;
      if (op === 'gte' && toFiniteNumber(value, Number.NEGATIVE_INFINITY) < toFiniteNumber(condition.value, Number.POSITIVE_INFINITY)) return false;
      if (op === 'lte' && toFiniteNumber(value, Number.POSITIVE_INFINITY) > toFiniteNumber(condition.value, Number.NEGATIVE_INFINITY)) return false;
      if (op === 'in' && Array.isArray(condition.value) && !condition.value.includes(value)) return false;
      if (op === 'not_in' && Array.isArray(condition.value) && condition.value.includes(value)) return false;
    }
    return true;
  }

  private static evaluateBaseRule(rule: PricingRule, currency: Currency): Money {
    const r = isPlainObject(rule.rule) ? rule.rule : {};
    const basePremium = toFiniteNumber(r.basePremium, 0);
    if (basePremium < 0) {
      throw new BadRequestException({ success: false, error: { code: 'INVALID_BASE_PREMIUM', message: 'Base premium cannot be negative' } });
    }
    return new Money({ amount: basePremium, currency });
  }

  private static evaluateTypedRule(rule: PricingRule, exposure: Record<string, any>, region: string | undefined, currency: Currency): QuoteAdjustment | null {
    const r = isPlainObject(rule.rule) ? rule.rule : {};

    if (rule.ruleType === 'conditional') {
      if (!this.evaluateConditions(rule.conditions || {}, exposure)) return null;
      const value = toFiniteNumber(r.value, 0);
      const type = r.type === 'multiplier' ? 'multiplier' : 'add';
      this.validateAdjustment(type, value);
      return { code: rule.code, nameFa: rule.nameFa, type, value, applied: true, ruleId: rule.pricingRuleId };
    }

    if (rule.ruleType === 'tiered') {
      const tiers = Array.isArray(r.tiers) ? r.tiers : [];
      const field = r.field;
      if (!field) return null;
      const value = toFiniteNumber(exposure[field], 0);
      for (const tier of tiers) {
        if (!isPlainObject(tier)) continue;
        const min = toFiniteNumber(tier.min, 0);
        const max = toFiniteNumber(tier.max, Infinity);
        if (value >= min && (max === Infinity || value < max)) {
          const tierValue = toFiniteNumber(tier.value, 0);
          const type = tier.type === 'multiplier' ? 'multiplier' : 'add';
          this.validateAdjustment(type, tierValue);
          return { code: rule.code, nameFa: tier.nameFa || rule.nameFa, type, value: tierValue, applied: true, ruleId: rule.pricingRuleId, tier: { min, max } };
        }
      }
      return null;
    }

    if (rule.ruleType === 'regional') {
      if (!region || !rule.regions || !rule.regions.includes(region)) return null;
      const value = toFiniteNumber(r.value, 0);
      const type = r.type === 'multiplier' ? 'multiplier' : 'add';
      this.validateAdjustment(type, value);
      return { code: rule.code, nameFa: rule.nameFa, type, value, applied: true, ruleId: rule.pricingRuleId, region };
    }

    if (rule.ruleType === 'discount') {
      if (!this.evaluateConditions(rule.conditions || {}, exposure)) return null;
      const value = -Math.abs(toFiniteNumber(r.value, 0));
      this.validatePercent(value);
      return { code: rule.code, nameFa: rule.nameFa, type: 'percent', value, applied: true, ruleId: rule.pricingRuleId };
    }

    if (rule.ruleType === 'surcharge') {
      if (!this.evaluateConditions(rule.conditions || {}, exposure)) return null;
      const value = Math.abs(toFiniteNumber(r.value, 0));
      this.validatePercent(value);
      return { code: rule.code, nameFa: rule.nameFa, type: 'percent', value, applied: true, ruleId: rule.pricingRuleId };
    }

    return null;
  }

  private static validateAdjustment(type: 'add' | 'multiplier' | 'percent', value: number): void {
    if (!Number.isFinite(value)) {
      throw new BadRequestException({ success: false, error: { code: 'INVALID_RULE_VALUE', message: 'Rule value must be finite' } });
    }
    if (type === 'add' && value < 0) {
      throw new BadRequestException({ success: false, error: { code: 'INVALID_ADD_AMOUNT', message: 'Add adjustment cannot be negative' } });
    }
    if (type === 'multiplier' && value < 0) {
      throw new BadRequestException({ success: false, error: { code: 'INVALID_MULTIPLIER', message: 'Multiplier cannot be negative' } });
    }
  }

  private static validatePercent(value: number): void {
    if (!Number.isFinite(value)) {
      throw new BadRequestException({ success: false, error: { code: 'INVALID_PERCENT', message: 'Percent value must be finite' } });
    }
    if (value < -100 || value > 100) {
      throw new BadRequestException({ success: false, error: { code: 'PERCENT_OUT_OF_BOUNDS', message: 'Percent must be between -100 and 100' } });
    }
  }

  static parseRuleV1(rule: any): QuoteRuleV1 {
    if (!isPlainObject(rule) || rule.version !== 1) return { version: 1, basePremium: 0, adjustments: [] };
    const basePremium = toFiniteNumber(rule.basePremium, 0);
    const adjustmentsRaw = Array.isArray(rule.adjustments) ? rule.adjustments : [];
    const adjustments = adjustmentsRaw
      .map((x: any) => {
        if (!isPlainObject(x)) return null;
        const code = String(x.code || '').trim();
        const type = x.type;
        const value = toFiniteNumber(x.value, NaN);
        if (!code) return null;
        if (type !== 'add' && type !== 'multiplier') return null;
        if (!Number.isFinite(value)) return null;

        let when: QuoteRuleV1['adjustments'][0]['when'] | undefined;
        if (isPlainObject(x.when)) {
          const field = String(x.when.field || '').trim();
          const op = x.when.op;
          if (field && (op === 'eq' || op === 'in' || op === 'gte' || op === 'lte')) {
            when = { field, op, value: x.when.value };
          }
        }

        return { code, nameFa: x.nameFa ? String(x.nameFa) : undefined, when, type, value };
      })
      .filter(Boolean) as QuoteRuleV1['adjustments'];

    return { version: 1, basePremium, adjustments };
  }
}
