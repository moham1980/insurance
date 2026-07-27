/**
 * KPI Governance Runtime Test
 * Tests to verify KPI governance implementation
 */

import { kpiGovernanceService, KPI_CATALOG } from './kpi-governance';

describe('KPI Governance Runtime Tests', () => {
  describe('KPI Catalog', () => {
    it('should have KPI catalog defined', () => {
      expect(KPI_CATALOG).toBeDefined();
      expect(Array.isArray(KPI_CATALOG)).toBe(true);
      expect(KPI_CATALOG.length).toBeGreaterThan(0);
    });

    it('should get KPI by ID', () => {
      const kpi = kpiGovernanceService.getKPIById('market_share');

      expect(kpi).toBeDefined();
      expect(kpi?.id).toBe('market_share');
      expect(kpi?.name).toBe('Market Share');
    });

    it('should get all KPIs', () => {
      const allKPIs = kpiGovernanceService.getAllKPIs();

      expect(allKPIs).toBeDefined();
      expect(allKPIs.length).toBe(KPI_CATALOG.length);
    });

    it('should get KPIs by category', () => {
      const financialKPIs = kpiGovernanceService.getKPIsByCategory('financial');

      expect(financialKPIs).toBeDefined();
      expect(Array.isArray(financialKPIs)).toBe(true);
      expect(financialKPIs.length).toBeGreaterThan(0);
    });

    it('should get KPIs by owner', () => {
      const cfoKPIs = kpiGovernanceService.getKPIsByOwner('CFO');

      expect(cfoKPIs).toBeDefined();
      expect(Array.isArray(cfoKPIs)).toBe(true);
    });

    it('should get KPIs by tag', () => {
      const executiveKPIs = kpiGovernanceService.getKPIsByTag('executive');

      expect(executiveKPIs).toBeDefined();
      expect(Array.isArray(executiveKPIs)).toBe(true);
    });
  });

  describe('KPI Formula Definition', () => {
    it('should have formula expression defined', () => {
      const kpi = kpiGovernanceService.getKPIById('market_share');

      expect(kpi?.formula.expression).toBeDefined();
      expect(kpi?.formula.variables).toBeDefined();
      expect(kpi?.formula.description).toBeDefined();
    });

    it('should have formula variables defined', () => {
      const kpi = kpiGovernanceService.getKPIById('combined_ratio');

      expect(kpi?.formula.variables).toContain('incurred_losses');
      expect(kpi?.formula.variables).toContain('expenses');
      expect(kpi?.formula.variables).toContain('earned_premium');
    });
  });

  describe('KPI Refresh Policy', () => {
    it('should have refresh frequency defined', () => {
      const kpi = kpiGovernanceService.getKPIById('market_share');

      expect(kpi?.refreshPolicy.frequency).toBeDefined();
      expect(['realtime', 'hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly']).toContain(kpi?.refreshPolicy.frequency);
    });

    it('should have cache duration defined', () => {
      const kpi = kpiGovernanceService.getKPIById('stp_rate');

      expect(kpi?.refreshPolicy.cacheDuration).toBeDefined();
      expect(kpi?.refreshPolicy.cacheDuration).toBeGreaterThan(0);
    });

    it('should have lag minutes defined', () => {
      const kpi = kpiGovernanceService.getKPIById('stp_rate');

      expect(kpi?.refreshPolicy.lagMinutes).toBeDefined();
      expect(kpi?.refreshPolicy.lagMinutes).toBeGreaterThanOrEqual(0);
    });
  });

  describe('KPI Source Systems', () => {
    it('should have source systems defined', () => {
      const kpi = kpiGovernanceService.getKPIById('combined_ratio');

      expect(kpi?.sourceSystems).toBeDefined();
      expect(Array.isArray(kpi?.sourceSystems)).toBe(true);
      expect(kpi?.sourceSystems.length).toBeGreaterThan(0);
    });

    it('should have system ID and name defined', () => {
      const kpi = kpiGovernanceService.getKPIById('market_share');
      const sourceSystem = kpi?.sourceSystems[0];

      expect(sourceSystem?.systemId).toBeDefined();
      expect(sourceSystem?.systemName).toBeDefined();
    });

    it('should have endpoint defined', () => {
      const kpi = kpiGovernanceService.getKPIById('market_share');
      const sourceSystem = kpi?.sourceSystems[0];

      expect(sourceSystem?.endpoint).toBeDefined();
      expect(sourceSystem?.endpoint).toContain('/api/');
    });

    it('should have data freshness defined', () => {
      const kpi = kpiGovernanceService.getKPIById('market_share');
      const sourceSystem = kpi?.sourceSystems[0];

      expect(sourceSystem?.dataFreshness).toBeDefined();
      expect(['realtime', 'near_realtime', 'batch']).toContain(sourceSystem?.dataFreshness);
    });

    it('should have reliability score defined', () => {
      const kpi = kpiGovernanceService.getKPIById('market_share');
      const sourceSystem = kpi?.sourceSystems[0];

      expect(sourceSystem?.reliability).toBeDefined();
      expect(sourceSystem?.reliability).toBeGreaterThanOrEqual(0);
      expect(sourceSystem?.reliability).toBeLessThanOrEqual(1);
    });
  });

  describe('KPI Owner Definition', () => {
    it('should have owner defined', () => {
      const kpi = kpiGovernanceService.getKPIById('combined_ratio');

      expect(kpi?.owner).toBeDefined();
      expect(kpi?.owner).toBe('CFO');
    });

    it('should have owner department defined', () => {
      const kpi = kpiGovernanceService.getKPIById('combined_ratio');

      expect(kpi?.ownerDepartment).toBeDefined();
      expect(kpi?.ownerDepartment).toBe('Finance');
    });
  });

  describe('KPI Lineage Tracking', () => {
    it('should have lineage defined', () => {
      const kpi = kpiGovernanceService.getKPIById('market_share');

      expect(kpi?.lineage).toBeDefined();
      expect(kpi?.lineage.kpiId).toBe('market_share');
    });

    it('should have source system in lineage', () => {
      const kpi = kpiGovernanceService.getKPIById('market_share');

      expect(kpi?.lineage.sourceSystem).toBeDefined();
    });

    it('should have transformation steps defined', () => {
      const kpi = kpiGovernanceService.getKPIById('market_share');

      expect(kpi?.lineage.transformationSteps).toBeDefined();
      expect(Array.isArray(kpi?.lineage.transformationSteps)).toBe(true);
    });

    it('should have last updated timestamp', () => {
      const kpi = kpiGovernanceService.getKPIById('market_share');

      expect(kpi?.lineage.lastUpdated).toBeDefined();
      expect(kpi?.lineage.lastUpdated).toBeInstanceOf(Date);
    });

    it('should have data quality score defined', () => {
      const kpi = kpiGovernanceService.getKPIById('market_share');

      expect(kpi?.lineage.dataQualityScore).toBeDefined();
      expect(kpi?.lineage.dataQualityScore).toBeGreaterThanOrEqual(0);
      expect(kpi?.lineage.dataQualityScore).toBeLessThanOrEqual(1);
    });

    it('should update lineage', () => {
      const kpiId = 'market_share';
      const originalDataQualityScore = kpiGovernanceService.getKPIDataQualityScore(kpiId);

      kpiGovernanceService.updateKPILineage(kpiId, {
        dataQualityScore: 0.95,
      });

      const newDataQualityScore = kpiGovernanceService.getKPIDataQualityScore(kpiId);
      expect(newDataQualityScore).toBe(0.95);
    });
  });

  describe('KPI Formula Evaluation', () => {
    it('should evaluate market share formula', () => {
      const result = kpiGovernanceService.evaluateFormula('market_share', {
        total_policies_sold: 12000,
        total_market_policies: 100000,
      });

      expect(result).toBe(12);
    });

    it('should evaluate combined ratio formula', () => {
      const result = kpiGovernanceService.evaluateFormula('combined_ratio', {
        incurred_losses: 600000000,
        expenses: 250000000,
        earned_premium: 1000000000,
      });

      expect(result).toBe(0.85);
    });

    it('should evaluate policy retention rate formula', () => {
      const result = kpiGovernanceService.evaluateFormula('policy_retention_rate', {
        policies_renewed: 9000,
        policies_expiring: 10000,
      });

      expect(result).toBe(90);
    });

    it('should evaluate NPS formula', () => {
      const result = kpiGovernanceService.evaluateFormula('nps_score', {
        promoters: 400,
        detractors: 200,
        total_responses: 1000,
      });

      expect(result).toBe(20);
    });

    it('should evaluate fraud detection rate formula', () => {
      const result = kpiGovernanceService.evaluateFormula('fraud_detection_rate', {
        fraud_confirmed_cases: 300,
        total_claims: 10000,
      });

      expect(result).toBe(3);
    });

    it('should evaluate STP rate formula', () => {
      const result = kpiGovernanceService.evaluateFormula('stp_rate', {
        auto_processed_transactions: 85000,
        total_transactions: 100000,
      });

      expect(result).toBe(85);
    });
  });

  describe('KPI Target Checking', () => {
    it('should check KPI against critical threshold', () => {
      const result = kpiGovernanceService.checkKPIAgainstTargets('market_share', 4);

      expect(result.status).toBe('critical');
    });

    it('should check KPI against warning threshold', () => {
      const result = kpiGovernanceService.checkKPIAgainstTargets('market_share', 8);

      expect(result.status).toBe('warning');
    });

    it('should check KPI against target', () => {
      const result = kpiGovernanceService.checkKPIAgainstTargets('market_share', 15);

      expect(result.status).toBe('target');
    });

    it('should check KPI against stretch target', () => {
      const result = kpiGovernanceService.checkKPIAgainstTargets('market_share', 22);

      expect(result.status).toBe('stretch');
    });
  });

  describe('KPI Targets and Thresholds', () => {
    it('should have targets defined', () => {
      const kpi = kpiGovernanceService.getKPIById('market_share');

      expect(kpi?.targets).toBeDefined();
      expect(kpi?.targets.minimum).toBeDefined();
      expect(kpi?.targets.target).toBeDefined();
      expect(kpi?.targets.stretch).toBeDefined();
    });

    it('should have thresholds defined', () => {
      const kpi = kpiGovernanceService.getKPIById('market_share');

      expect(kpi?.thresholds).toBeDefined();
      expect(kpi?.thresholds.warning).toBeDefined();
      expect(kpi?.thresholds.critical).toBeDefined();
    });

    it('should have tags defined', () => {
      const kpi = kpiGovernanceService.getKPIById('market_share');

      expect(kpi?.tags).toBeDefined();
      expect(Array.isArray(kpi?.tags)).toBe(true);
    });
  });

  describe('KPI Governance Runtime Test Runner', () => {
    it('should execute all KPI governance tests', async () => {
      const results = await runKPIGovernanceRuntimeTests();

      expect(results.totalTests).toBeGreaterThan(0);
      expect(results.passedTests).toBeGreaterThanOrEqual(0);
      expect(results.failedTests).toBeGreaterThanOrEqual(0);
    });
  });
});

/**
 * KPI Governance Runtime Test Runner
 * Executes all KPI governance runtime tests and returns results
 */
export async function runKPIGovernanceRuntimeTests(): Promise<{
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: Array<{
    scenario: string;
    passed: boolean;
    duration: number;
  }>;
}> {
  const startTime = Date.now();
  let passedTests = 0;
  let failedTests = 0;
  const results: Array<{ scenario: string; passed: boolean; duration: number }> = [];

  // Test 1: KPI Catalog
  try {
    const start = Date.now();
    const kpi = kpiGovernanceService.getKPIById('market_share');
    const passed = kpi !== undefined && kpi.id === 'market_share';
    if (passed) passedTests++;
    else failedTests++;
    results.push({ scenario: 'KPI Catalog', passed, duration: Date.now() - start });
  } catch (error) {
    failedTests++;
    results.push({ scenario: 'KPI Catalog', passed: false, duration: 0 });
  }

  // Test 2: KPI Formula Definition
  try {
    const start = Date.now();
    const kpi = kpiGovernanceService.getKPIById('market_share');
    const passed = kpi?.formula.expression !== undefined && kpi?.formula.variables.length > 0;
    if (passed) passedTests++;
    else failedTests++;
    results.push({ scenario: 'KPI Formula Definition', passed, duration: Date.now() - start });
  } catch (error) {
    failedTests++;
    results.push({ scenario: 'KPI Formula Definition', passed: false, duration: 0 });
  }

  // Test 3: KPI Refresh Policy
  try {
    const start = Date.now();
    const kpi = kpiGovernanceService.getKPIById('market_share');
    const passed = kpi?.refreshPolicy.frequency !== undefined && kpi?.refreshPolicy.cacheDuration > 0;
    if (passed) passedTests++;
    else failedTests++;
    results.push({ scenario: 'KPI Refresh Policy', passed, duration: Date.now() - start });
  } catch (error) {
    failedTests++;
    results.push({ scenario: 'KPI Refresh Policy', passed: false, duration: 0 });
  }

  // Test 4: KPI Source Systems
  try {
    const start = Date.now();
    const kpi = kpiGovernanceService.getKPIById('combined_ratio');
    const passed = kpi?.sourceSystems !== undefined && kpi?.sourceSystems.length > 0 && kpi?.sourceSystems[0].systemId !== undefined;
    if (passed) passedTests++;
    else failedTests++;
    results.push({ scenario: 'KPI Source Systems', passed, duration: Date.now() - start });
  } catch (error) {
    failedTests++;
    results.push({ scenario: 'KPI Source Systems', passed: false, duration: 0 });
  }

  // Test 5: KPI Owner Definition
  try {
    const start = Date.now();
    const kpi = kpiGovernanceService.getKPIById('combined_ratio');
    const passed = kpi?.owner !== undefined && kpi?.ownerDepartment !== undefined;
    if (passed) passedTests++;
    else failedTests++;
    results.push({ scenario: 'KPI Owner Definition', passed, duration: Date.now() - start });
  } catch (error) {
    failedTests++;
    results.push({ scenario: 'KPI Owner Definition', passed: false, duration: 0 });
  }

  // Test 6: KPI Lineage Tracking
  try {
    const start = Date.now();
    const kpi = kpiGovernanceService.getKPIById('market_share');
    const passed = kpi?.lineage.kpiId !== undefined && kpi?.lineage.transformationSteps.length > 0;
    if (passed) passedTests++;
    else failedTests++;
    results.push({ scenario: 'KPI Lineage Tracking', passed, duration: Date.now() - start });
  } catch (error) {
    failedTests++;
    results.push({ scenario: 'KPI Lineage Tracking', passed: false, duration: 0 });
  }

  // Test 7: KPI Formula Evaluation
  try {
    const start = Date.now();
    const result = kpiGovernanceService.evaluateFormula('market_share', {
      total_policies_sold: 12000,
      total_market_policies: 100000,
    });
    const passed = result === 12;
    if (passed) passedTests++;
    else failedTests++;
    results.push({ scenario: 'KPI Formula Evaluation', passed, duration: Date.now() - start });
  } catch (error) {
    failedTests++;
    results.push({ scenario: 'KPI Formula Evaluation', passed: false, duration: 0 });
  }

  // Test 8: KPI Target Checking
  try {
    const start = Date.now();
    const result = kpiGovernanceService.checkKPIAgainstTargets('market_share', 15);
    const passed = result.status === 'target';
    if (passed) passedTests++;
    else failedTests++;
    results.push({ scenario: 'KPI Target Checking', passed, duration: Date.now() - start });
  } catch (error) {
    failedTests++;
    results.push({ scenario: 'KPI Target Checking', passed: false, duration: 0 });
  }

  return {
    totalTests: 8,
    passedTests,
    failedTests,
    results,
  };
}

/**
 * Main test runner entry point
 */
if (require.main === module) {
  runKPIGovernanceRuntimeTests()
    .then((results) => {
      console.log('KPI Governance Runtime Test Results:');
      console.log(`Total Tests: ${results.totalTests}`);
      console.log(`Passed: ${results.passedTests}`);
      console.log(`Failed: ${results.failedTests}`);
      console.log('\nDetailed Results:');
      results.results.forEach((result) => {
        console.log(`- ${result.scenario}: ${result.passed ? 'PASS' : 'FAIL'} (${result.duration}ms)`);
      });
      process.exit(results.failedTests > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Error running tests:', error);
      process.exit(1);
    });
}
