import { RiskScoringConfigData } from './risk-config.types';

export const DEFAULT_RISK_CONFIG: RiskScoringConfigData = {
  weights: {
    ageRisk: 0.25,
    claimHistoryRisk: 0.35,
    coverageRisk: 0.15,
    itemAgeRisk: 0.1,
    policyTypeRisk: 0.15,
  },
  thresholds: {
    low: 0.3,
    medium: 0.5,
    high: 0.7,
  },
  policyTypeRisk: {
    auto: 0.5,
    life: 0.3,
    health: 0.4,
    fire: 0.4,
    liability: 0.3,
    travel: 0.2,
  },
  ageRules: [
    { max: 25, risk: 0.8, recommendation: 'Age < 25: Consider higher premium or additional coverage restrictions' },
    { min: 25, max: 65, risk: 0.2 },
    { min: 65, risk: 0.6, recommendation: 'Age > 65: Consider health verification requirements' },
  ],
  claimHistoryRules: [
    { max: 1, risk: 0.1 },
    { min: 1, max: 3, risk: 0.5, recommendation: 'Previous claims noted: Review claim patterns' },
    { min: 3, risk: 0.9, recommendation: 'High claim frequency: Consider risk mitigation measures or premium adjustment' },
  ],
  coverageRatioRules: [
    { max: 100, risk: 0.1 },
    { min: 100, max: 500, risk: 0.5 },
    { min: 500, max: 1000, risk: 0.7 },
    { min: 1000, risk: 0.9, recommendation: 'High coverage-to-premium ratio: Verify risk adequacy' },
  ],
  itemAgeRules: [
    { max: 5, risk: 0.1 },
    { min: 5, max: 10, risk: 0.3 },
    { min: 10, max: 15, risk: 0.4 },
    { min: 15, risk: 0.6, recommendation: 'Item age > 15 years: Consider depreciation adjustment' },
  ],
};
