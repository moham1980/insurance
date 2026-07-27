import 'reflect-metadata';
import { RiskScoringService } from './risk-scoring.service';

describe('RiskScoringService', () => {
  let service: RiskScoringService;

  beforeEach(() => {
    delete process.env.RISK_SCORING_CONFIG;
    service = new RiskScoringService();
  });

  it('computes a low risk score for a standard healthy profile', () => {
    const result = service.assess('tenant-1', 'product-1', {
      age: 35,
      pastClaimsCount: 0,
      coverageAmount: 100,
      premiumAmount: 50,
      itemAge: 3,
      policyType: 'life',
    });

    expect(result.riskScore).toBeLessThan(0.3);
    expect(result.riskLevel).toBe('low');
    expect(result.recommendations).toEqual([]);
    expect(result.assessedAt).toBeDefined();
  });

  it('computes a high risk score for a young driver with high claims', () => {
    const result = service.assess('tenant-1', undefined, {
      age: 22,
      pastClaimsCount: 4,
      coverageAmount: 1000,
      premiumAmount: 1,
      itemAge: 12,
      policyType: 'auto',
    });

    expect(result.riskScore).toBeGreaterThan(0.7);
    expect(result.riskLevel).toBe('critical');
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('applies a tenant-specific external config when provided', () => {
    process.env.RISK_SCORING_CONFIG = '__test_risk_config__.json';
    const fs = require('fs');
    fs.writeFileSync(
      '__test_risk_config__.json',
      JSON.stringify({
        default: {
          weights: { ageRisk: 0, claimHistoryRisk: 1, coverageRisk: 0, itemAgeRisk: 0, policyTypeRisk: 0 },
          thresholds: { low: 0.1, medium: 0.5, high: 0.9 },
          policyTypeRisk: {},
          ageRules: [],
          claimHistoryRules: [
            { max: 1, risk: 0.05 },
            { min: 1, risk: 0.95, recommendation: 'External config says high risk' },
          ],
          coverageRatioRules: [{ risk: 0 }],
          itemAgeRules: [{ risk: 0 }],
        },
      }),
    );

    const configuredService = new RiskScoringService();
    const result = configuredService.assess('tenant-2', undefined, { pastClaimsCount: 1 });

    expect(result.riskScore).toBeGreaterThan(0.9);
    expect(result.riskLevel).toBe('critical');
    expect(result.recommendations).toContain('External config says high risk');

    fs.unlinkSync('__test_risk_config__.json');
  });
});
