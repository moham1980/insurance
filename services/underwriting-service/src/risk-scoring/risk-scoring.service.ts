import { Injectable, Logger } from '@nestjs/common';
import { RiskScoringConfigData, RiskFactorRule } from './risk-config.types';
import { DEFAULT_RISK_CONFIG } from './default-risk-config';
import * as fs from 'fs';

export interface RiskFactorsInput {
  age?: number;
  pastClaimsCount?: number;
  coverageAmount?: number;
  premiumAmount?: number;
  itemAge?: number;
  policyType?: string;
}

export interface RiskAssessmentResult {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: Record<string, number>;
  recommendations: string[];
  assessedAt: string;
}

@Injectable()
export class RiskScoringService {
  private readonly logger = new Logger(RiskScoringService.name);

  assess(tenantId: string, productId: string | undefined, factors: RiskFactorsInput): RiskAssessmentResult {
    const config = this.resolveConfig(tenantId, productId);
    const recommendations: string[] = [];
    const computed: Record<string, number> = {};

    const age = typeof factors.age === 'number' ? factors.age : 35;
    computed.ageRisk = this.pickRule(config.ageRules, age, recommendations);

    const pastClaims = typeof factors.pastClaimsCount === 'number' ? factors.pastClaimsCount : 0;
    computed.claimHistoryRisk = this.pickRule(config.claimHistoryRules, pastClaims, recommendations);

    const coverageAmount = typeof factors.coverageAmount === 'number' ? factors.coverageAmount : 0;
    const premiumAmount = typeof factors.premiumAmount === 'number' && factors.premiumAmount > 0 ? factors.premiumAmount : 1;
    const coverageRatio = coverageAmount / premiumAmount;
    computed.coverageRisk = this.pickRule(config.coverageRatioRules, coverageRatio, recommendations);

    const itemAge = typeof factors.itemAge === 'number' ? factors.itemAge : 0;
    computed.itemAgeRisk = this.pickRule(config.itemAgeRules, itemAge, recommendations);

    const policyType = String(factors.policyType || 'auto');
    computed.policyTypeRisk = config.policyTypeRisk[policyType] ?? config.policyTypeRisk['auto'] ?? 0.4;

    let riskScore = 0;
    for (const [factor, weight] of Object.entries(config.weights)) {
      riskScore += (computed[factor] || 0) * weight;
    }
    riskScore = Math.round(riskScore * 100) / 100;

    const riskLevel: 'low' | 'medium' | 'high' | 'critical' =
      riskScore < config.thresholds.low
        ? 'low'
        : riskScore < config.thresholds.medium
          ? 'medium'
          : riskScore < config.thresholds.high
            ? 'high'
            : 'critical';

    return {
      riskScore,
      riskLevel,
      factors: computed,
      recommendations,
      assessedAt: new Date().toISOString(),
    };
  }

  private resolveConfig(tenantId: string, productId?: string): RiskScoringConfigData {
    try {
      const configPath = process.env.RISK_SCORING_CONFIG;
      if (configPath && fs.existsSync(configPath)) {
        const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as any;
        const tenantConfig = fileConfig?.tenants?.[tenantId] || fileConfig?.[tenantId];
        if (tenantConfig) {
          const productConfig = productId ? tenantConfig.products?.[productId] : undefined;
          return this.mergeConfig(DEFAULT_RISK_CONFIG, productConfig || tenantConfig.default || tenantConfig);
        }
        if (fileConfig?.default) {
          return this.mergeConfig(DEFAULT_RISK_CONFIG, fileConfig.default);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed to load risk scoring config: ${err.message}`);
    }
    return DEFAULT_RISK_CONFIG;
  }

  private mergeConfig(base: RiskScoringConfigData, override: Partial<RiskScoringConfigData> | undefined): RiskScoringConfigData {
    if (!override) return base;
    return {
      weights: { ...base.weights, ...override.weights },
      thresholds: { ...base.thresholds, ...override.thresholds },
      policyTypeRisk: { ...base.policyTypeRisk, ...override.policyTypeRisk },
      ageRules: override.ageRules ?? base.ageRules,
      claimHistoryRules: override.claimHistoryRules ?? base.claimHistoryRules,
      coverageRatioRules: override.coverageRatioRules ?? base.coverageRatioRules,
      itemAgeRules: override.itemAgeRules ?? base.itemAgeRules,
    };
  }

  private pickRule(rules: RiskFactorRule[], value: number, recommendations: string[]): number {
    for (const rule of rules) {
      const minOk = rule.min === undefined || value >= rule.min;
      const maxOk = rule.max === undefined || value < rule.max;
      if (minOk && maxOk) {
        if (rule.recommendation) {
          recommendations.push(rule.recommendation);
        }
        return rule.risk;
      }
    }
    return 0.5;
  }
}
