export interface RiskFactorRule {
  max?: number;
  min?: number;
  risk: number;
  recommendation?: string;
}

export interface RiskLevelThresholds {
  low: number;
  medium: number;
  high: number;
}

export interface RiskScoringConfigData {
  weights: Record<string, number>;
  thresholds: RiskLevelThresholds;
  policyTypeRisk: Record<string, number>;
  ageRules: RiskFactorRule[];
  claimHistoryRules: RiskFactorRule[];
  coverageRatioRules: RiskFactorRule[];
  itemAgeRules: RiskFactorRule[];
}

export interface RiskScoringTenantConfig {
  default: RiskScoringConfigData;
  products?: Record<string, RiskScoringConfigData>;
}

export interface RiskScoringConfigFile {
  default?: RiskScoringConfigData;
  tenants?: Record<string, RiskScoringTenantConfig>;
}
