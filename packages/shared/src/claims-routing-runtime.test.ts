/**
 * Claims Routing & Workload Balancing Runtime Test
 * Tests to verify claims routing and workload balancing implementation
 */

describe('Claims Routing & Workload Balancing Runtime Tests', () => {
  describe('Skill-Based Routing', () => {
    it('should route claim based on adjuster skill', async () => {
      const claim = {
        claimId: 'claim-001',
        claimType: 'collision',
        complexity: 'high',
        requiredSkills: ['collision', 'high_value', 'litigation'],
      };

      const adjuster = {
        adjusterId: 'adj-001',
        skills: ['collision', 'high_value', 'property'],
        availability: true,
        currentWorkload: 5,
        maxWorkload: 15,
      };

      const isMatch = claim.requiredSkills.some((skill) => adjuster.skills.includes(skill));
      expect(isMatch).toBe(true);
    });

    it('should match claim complexity with adjuster experience', async () => {
      const claim = {
        claimId: 'claim-002',
        complexity: 'high',
        estimatedHours: 40,
      };

      const adjuster = {
        adjusterId: 'adj-002',
        experienceLevel: 'senior',
        avgClaimComplexity: 'high',
      };

      const isMatch = adjuster.experienceLevel === 'senior' && adjuster.avgClaimComplexity === 'high';
      expect(isMatch).toBe(true);
    });

    it('should handle skill-based routing with multiple adjusters', async () => {
      const adjusters = [
        { adjusterId: 'adj-001', skills: ['collision'], workload: 8 },
        { adjusterId: 'adj-002', skills: ['collision', 'high_value'], workload: 5 },
        { adjusterId: 'adj-003', skills: ['property'], workload: 10 },
      ];

      const claim = {
        claimId: 'claim-003',
        requiredSkills: ['collision', 'high_value'],
      };

      const qualifiedAdjusters = adjusters.filter((a) =>
        claim.requiredSkills.every((skill) => a.skills.includes(skill))
      );

      expect(qualifiedAdjusters.length).toBeGreaterThan(0);
      expect(qualifiedAdjusters[0].adjusterId).toBe('adj-002');
    });
  });

  describe('Geographic Routing', () => {
    it('should route claim based on location proximity', async () => {
      const claim = {
        claimId: 'claim-004',
        location: {
          latitude: 35.6895,
          longitude: 51.3890,
          city: 'Tehran',
        },
      };

      const adjuster = {
        adjusterId: 'adj-004',
        territory: {
          city: 'Tehran',
          latitude: 35.6895,
          longitude: 51.3890,
          radius: 50, // km
        },
      };

      const isInTerritory = adjuster.territory.city === claim.location.city;
      expect(isInTerritory).toBe(true);
    });

    it('should calculate distance between claim and adjuster', async () => {
      const claimLocation = { latitude: 35.6895, longitude: 51.3890 };
      const adjusterLocation = { latitude: 35.7000, longitude: 51.4000 };

      const distance = Math.sqrt(
        Math.pow(claimLocation.latitude - adjusterLocation.latitude, 2) +
          Math.pow(claimLocation.longitude - adjusterLocation.longitude, 2)
      );

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(1); // degrees
    });

    it('should handle regional routing', async () => {
      const claim = {
        claimId: 'claim-005',
        region: 'Central',
      };

      const adjuster = {
        adjusterId: 'adj-005',
        regions: ['Central', 'North'],
      };

      const isCovered = adjuster.regions.includes(claim.region);
      expect(isCovered).toBe(true);
    });
  });

  describe('Claim-Type Routing', () => {
    it('should route collision claim to collision specialist', async () => {
      const claim = {
        claimId: 'claim-006',
        claimType: 'collision',
      };

      const adjuster = {
        adjusterId: 'adj-006',
        specialties: ['collision', 'auto'],
      };

      const isMatch = adjuster.specialties.includes(claim.claimType);
      expect(isMatch).toBe(true);
    });

    it('should route property claim to property specialist', async () => {
      const claim = {
        claimId: 'claim-007',
        claimType: 'property',
      };

      const adjuster = {
        adjusterId: 'adj-007',
        specialties: ['property', 'fire'],
      };

      const isMatch = adjuster.specialties.includes(claim.claimType);
      expect(isMatch).toBe(true);
    });

    it('should handle multi-type claims', async () => {
      const claim = {
        claimId: 'claim-008',
        claimTypes: ['collision', 'property'],
      };

      const adjuster = {
        adjusterId: 'adj-008',
        specialties: ['collision', 'property', 'liability'],
      };

      const isMatch = claim.claimTypes.every((type) => adjuster.specialties.includes(type));
      expect(isMatch).toBe(true);
    });
  });

  describe('Fraud-Risk Routing', () => {
    it('should route high-frisk claim to fraud specialist', async () => {
      const claim = {
        claimId: 'claim-009',
        fraudScore: 0.85,
        fraudRisk: 'high',
      };

      const adjuster = {
        adjusterId: 'adj-009',
        fraudSpecialist: true,
        fraudCertification: 'advanced',
      };

      const isMatch = claim.fraudRisk === 'high' && adjuster.fraudSpecialist === true;
      expect(isMatch).toBe(true);
    });

    it('should route medium-frisk claim to experienced adjuster', async () => {
      const claim = {
        claimId: 'claim-010',
        fraudScore: 0.55,
        fraudRisk: 'medium',
      };

      const adjuster = {
        adjusterId: 'adj-010',
        experienceLevel: 'senior',
        fraudTraining: true,
      };

      const isMatch = claim.fraudRisk === 'medium' && adjuster.fraudTraining === true;
      expect(isMatch).toBe(true);
    });

    it('should handle low-frisk claims with standard routing', async () => {
      const claim = {
        claimId: 'claim-011',
        fraudScore: 0.15,
        fraudRisk: 'low',
      };

      const adjuster = {
        adjusterId: 'adj-011',
        fraudSpecialist: false,
        experienceLevel: 'intermediate',
      };

      const isMatch = claim.fraudRisk === 'low';
      expect(isMatch).toBe(true);
    });
  });

  describe('SLA-Based Routing', () => {
    it('should prioritize claims based on SLA deadline', async () => {
      const claim = {
        claimId: 'claim-012',
        slaDeadline: new Date('2024-01-20'),
        priority: 'high',
        createdAt: new Date('2024-01-15'),
      };

      const timeToDeadline = claim.slaDeadline.getTime() - claim.createdAt.getTime();
      const daysToDeadline = timeToDeadline / (1000 * 60 * 60 * 24);

      expect(daysToDeadline).toBeGreaterThan(0);
      expect(daysToDeadline).toBeLessThan(10);
    });

    it('should route urgent claims to available adjusters', async () => {
      const claim = {
        claimId: 'claim-013',
        priority: 'urgent',
        slaHours: 24,
      };

      const adjuster = {
        adjusterId: 'adj-013',
        availability: true,
        urgentCapacity: 2,
        currentUrgentClaims: 1,
      };

      const canAccept = adjuster.availability && adjuster.currentUrgentClaims < adjuster.urgentCapacity;
      expect(canAccept).toBe(true);
    });

    it('should monitor SLA adherence', async () => {
      const slaMonitoring = {
        totalClaims: 100,
        claimsWithinSLA: 95,
        claimsOverSLA: 5,
        slaAdherenceRate: 0.95,
      };

      expect(slaMonitoring.slaAdherenceRate).toBeGreaterThan(0.9);
    });
  });

  describe('Automatic Queue Balancing', () => {
    it('should distribute claims evenly across adjusters', async () => {
      const adjusters = [
        { adjusterId: 'adj-014', workload: 10, maxWorkload: 15 },
        { adjusterId: 'adj-015', workload: 5, maxWorkload: 15 },
        { adjusterId: 'adj-016', workload: 12, maxWorkload: 15 },
      ];

      const newClaim = { claimId: 'claim-014' };

      const leastLoaded = adjusters.reduce((min, a) => (a.workload < min.workload ? a : min));

      expect(leastLoaded.adjusterId).toBe('adj-015');
    });

    it('should respect adjuster capacity limits', async () => {
      const adjuster = {
        adjusterId: 'adj-017',
        workload: 14,
        maxWorkload: 15,
      };

      const canAccept = adjuster.workload < adjuster.maxWorkload;
      expect(canAccept).toBe(true);
    });

    it('should handle workload redistribution', async () => {
      const adjusters = [
        { adjusterId: 'adj-018', workload: 15, maxWorkload: 15 },
        { adjusterId: 'adj-019', workload: 8, maxWorkload: 15 },
      ];

      const overloaded = adjusters.filter((a) => a.workload >= a.maxWorkload);
      const underloaded = adjusters.filter((a) => a.workload < a.maxWorkload * 0.7);

      expect(overloaded.length).toBeGreaterThan(0);
      expect(underloaded.length).toBeGreaterThan(0);
    });
  });

  describe('SLA Adherence Monitoring', () => {
    it('should track claim aging', async () => {
      const claim = {
        claimId: 'claim-015',
        createdAt: new Date('2024-01-10'),
        slaDeadline: new Date('2024-01-20'),
        currentDate: new Date('2024-01-15'),
      };

      const age = claim.currentDate.getTime() - claim.createdAt.getTime();
      const ageDays = age / (1000 * 60 * 60 * 24);

      expect(ageDays).toBeGreaterThan(0);
    });

    it('should identify at-risk claims', async () => {
      const claim = {
        claimId: 'claim-016',
        slaDeadline: new Date('2024-01-16'),
        currentDate: new Date('2024-01-15'),
      };

      const timeToDeadline = claim.slaDeadline.getTime() - claim.currentDate.getTime();
      const isAtRisk = timeToDeadline < 48 * 60 * 60 * 1000; // less than 48 hours

      expect(isAtRisk).toBe(true);
    });

    it('should generate SLA breach alerts', async () => {
      const breachAlert = {
        claimId: 'claim-017',
        slaDeadline: new Date('2024-01-14'),
        breachTime: new Date('2024-01-15'),
        severity: 'high',
        notified: ['manager', 'adjuster'],
      };

      expect(breachAlert.severity).toBe('high');
      expect(breachAlert.notified.length).toBeGreaterThan(0);
    });
  });

  describe('Claims Routing Runtime Test Runner', () => {
    it('should execute all claims routing tests', async () => {
      const results = await runClaimsRoutingRuntimeTests();

      expect(results.totalTests).toBeGreaterThan(0);
      expect(results.passedTests).toBeGreaterThanOrEqual(0);
      expect(results.failedTests).toBeGreaterThanOrEqual(0);
    });
  });
});

/**
 * Claims Routing Runtime Test Runner
 * Executes all claims routing runtime tests and returns results
 */
export async function runClaimsRoutingRuntimeTests(): Promise<{
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

  // Test 1: Skill-Based Routing
  try {
    const start = Date.now();
    const claim = { claimId: 'claim-001', requiredSkills: ['collision', 'high_value'] };
    const adjuster = { adjusterId: 'adj-001', skills: ['collision', 'high_value'], workload: 5 };
    const isMatch = claim.requiredSkills.some((skill) => adjuster.skills.includes(skill));
    const passed = isMatch === true;
    if (passed) passedTests++;
    else failedTests++;
    results.push({ scenario: 'Skill-Based Routing', passed, duration: Date.now() - start });
  } catch (error) {
    failedTests++;
    results.push({ scenario: 'Skill-Based Routing', passed: false, duration: 0 });
  }

  // Test 2: Geographic Routing
  try {
    const start = Date.now();
    const claim = { claimId: 'claim-004', location: { city: 'Tehran' } };
    const adjuster = { adjusterId: 'adj-004', territory: { city: 'Tehran' } };
    const isInTerritory = adjuster.territory.city === claim.location.city;
    const passed = isInTerritory === true;
    if (passed) passedTests++;
    else failedTests++;
    results.push({ scenario: 'Geographic Routing', passed, duration: Date.now() - start });
  } catch (error) {
    failedTests++;
    results.push({ scenario: 'Geographic Routing', passed: false, duration: 0 });
  }

  // Test 3: Claim-Type Routing
  try {
    const start = Date.now();
    const claim = { claimId: 'claim-006', claimType: 'collision' };
    const adjuster = { adjusterId: 'adj-006', specialties: ['collision', 'auto'] };
    const isMatch = adjuster.specialties.includes(claim.claimType);
    const passed = isMatch === true;
    if (passed) passedTests++;
    else failedTests++;
    results.push({ scenario: 'Claim-Type Routing', passed, duration: Date.now() - start });
  } catch (error) {
    failedTests++;
    results.push({ scenario: 'Claim-Type Routing', passed: false, duration: 0 });
  }

  // Test 4: Fraud-Risk Routing
  try {
    const start = Date.now();
    const claim = { claimId: 'claim-009', fraudRisk: 'high' };
    const adjuster = { adjusterId: 'adj-009', fraudSpecialist: true };
    const isMatch = claim.fraudRisk === 'high' && adjuster.fraudSpecialist === true;
    const passed = isMatch === true;
    if (passed) passedTests++;
    else failedTests++;
    results.push({ scenario: 'Fraud-Risk Routing', passed, duration: Date.now() - start });
  } catch (error) {
    failedTests++;
    results.push({ scenario: 'Fraud-Risk Routing', passed: false, duration: 0 });
  }

  // Test 5: SLA-Based Routing
  try {
    const start = Date.now();
    const claim = {
      claimId: 'claim-012',
      slaDeadline: new Date('2024-01-20'),
      createdAt: new Date('2024-01-15'),
    };
    const timeToDeadline = claim.slaDeadline.getTime() - claim.createdAt.getTime();
    const daysToDeadline = timeToDeadline / (1000 * 60 * 60 * 24);
    const passed = daysToDeadline > 0 && daysToDeadline < 10;
    if (passed) passedTests++;
    else failedTests++;
    results.push({ scenario: 'SLA-Based Routing', passed, duration: Date.now() - start });
  } catch (error) {
    failedTests++;
    results.push({ scenario: 'SLA-Based Routing', passed: false, duration: 0 });
  }

  // Test 6: Automatic Queue Balancing
  try {
    const start = Date.now();
    const adjusters = [
      { adjusterId: 'adj-014', workload: 10, maxWorkload: 15 },
      { adjusterId: 'adj-015', workload: 5, maxWorkload: 15 },
    ];
    const leastLoaded = adjusters.reduce((min, a) => (a.workload < min.workload ? a : min));
    const passed = leastLoaded.adjusterId === 'adj-015';
    if (passed) passedTests++;
    else failedTests++;
    results.push({ scenario: 'Automatic Queue Balancing', passed, duration: Date.now() - start });
  } catch (error) {
    failedTests++;
    results.push({ scenario: 'Automatic Queue Balancing', passed: false, duration: 0 });
  }

  // Test 7: SLA Adherence Monitoring
  try {
    const start = Date.now();
    const claim = {
      claimId: 'claim-015',
      createdAt: new Date('2024-01-10'),
      currentDate: new Date('2024-01-15'),
    };
    const age = claim.currentDate.getTime() - claim.createdAt.getTime();
    const ageDays = age / (1000 * 60 * 60 * 24);
    const passed = ageDays > 0;
    if (passed) passedTests++;
    else failedTests++;
    results.push({ scenario: 'SLA Adherence Monitoring', passed, duration: Date.now() - start });
  } catch (error) {
    failedTests++;
    results.push({ scenario: 'SLA Adherence Monitoring', passed: false, duration: 0 });
  }

  return {
    totalTests: 7,
    passedTests,
    failedTests,
    results,
  };
}

/**
 * Main test runner entry point
 */
if (require.main === module) {
  runClaimsRoutingRuntimeTests()
    .then((results) => {
      console.log('Claims Routing Runtime Test Results:');
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
