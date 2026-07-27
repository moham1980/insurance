/**
 * Canonical KPI Governance
 * Defines KPI catalog, formulas, refresh policies, source systems, and lineage tracking
 */

export interface KPIFormula {
  expression: string;
  variables: string[];
  description: string;
}

export interface KPIRefreshPolicy {
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  schedule?: string; // Cron expression for scheduled refresh
  lagMinutes: number;
  cacheDuration: number; // in seconds
}

export interface KPISourceSystem {
  systemId: string;
  systemName: string;
  endpoint: string;
  dataFreshness: 'realtime' | 'near_realtime' | 'batch';
  reliability: number; // 0-1
}

export interface KPILineage {
  kpiId: string;
  sourceSystem: string;
  transformationSteps: string[];
  lastUpdated: Date;
  dataQualityScore: number; // 0-1
}

export interface KPIDefinition {
  id: string;
  name: string;
  category: 'financial' | 'operational' | 'customer' | 'risk' | 'compliance';
  unit: string;
  formula: KPIFormula;
  refreshPolicy: KPIRefreshPolicy;
  sourceSystems: KPISourceSystem[];
  owner: string;
  ownerDepartment: string;
  lineage: KPILineage;
  targets: {
    minimum: number;
    target: number;
    stretch: number;
  };
  thresholds: {
    warning: number;
    critical: number;
  };
  tags: string[];
}

/**
 * KPI Catalog
 * Central catalog of all defined KPIs
 */
export const KPI_CATALOG: KPIDefinition[] = [
  {
    id: 'market_share',
    name: 'Market Share',
    category: 'financial',
    unit: '%',
    formula: {
      expression: '(total_policies_sold / total_market_policies) * 100',
      variables: ['total_policies_sold', 'total_market_policies'],
      description: 'Percentage of market policies held by the company',
    },
    refreshPolicy: {
      frequency: 'monthly',
      lagMinutes: 0,
      cacheDuration: 86400, // 24 hours
    },
    sourceSystems: [
      {
        systemId: 'policy-service',
        systemName: 'Policy Service',
        endpoint: '/api/policies/aggregate',
        dataFreshness: 'batch',
        reliability: 0.95,
      },
    ],
    owner: 'VP Strategy',
    ownerDepartment: 'Strategy',
    lineage: {
      kpiId: 'market_share',
      sourceSystem: 'policy-service',
      transformationSteps: ['Aggregate policies sold', 'Calculate market ratio', 'Multiply by 100'],
      lastUpdated: new Date(),
      dataQualityScore: 0.92,
    },
    targets: {
      minimum: 5,
      target: 15,
      stretch: 20,
    },
    thresholds: {
      warning: 8,
      critical: 5,
    },
    tags: ['executive', 'financial', 'growth'],
  },
  {
    id: 'combined_ratio',
    name: 'Combined Ratio',
    category: 'financial',
    unit: '%',
    formula: {
      expression: '(incurred_losses + expenses) / earned_premium',
      variables: ['incurred_losses', 'expenses', 'earned_premium'],
      description: 'Sum of loss ratio and expense ratio',
    },
    refreshPolicy: {
      frequency: 'monthly',
      lagMinutes: 0,
      cacheDuration: 86400, // 24 hours
    },
    sourceSystems: [
      {
        systemId: 'claims-service',
        systemName: 'Claims Service',
        endpoint: '/api/claims/aggregate',
        dataFreshness: 'batch',
        reliability: 0.98,
      },
      {
        systemId: 'payments-service',
        systemName: 'Payments Service',
        endpoint: '/api/payments/aggregate',
        dataFreshness: 'batch',
        reliability: 0.98,
      },
      {
        systemId: 'policy-service',
        systemName: 'Policy Service',
        endpoint: '/api/policies/aggregate',
        dataFreshness: 'batch',
        reliability: 0.98,
      },
    ],
    owner: 'CFO',
    ownerDepartment: 'Finance',
    lineage: {
      kpiId: 'combined_ratio',
      sourceSystem: 'claims-service,payments-service,policy-service',
      transformationSteps: ['Calculate loss ratio', 'Calculate expense ratio', 'Sum ratios'],
      lastUpdated: new Date(),
      dataQualityScore: 0.95,
    },
    targets: {
      minimum: 95,
      target: 85,
      stretch: 80,
    },
    thresholds: {
      warning: 90,
      critical: 100,
    },
    tags: ['executive', 'financial', 'profitability'],
  },
  {
    id: 'policy_retention_rate',
    name: 'Policy Retention Rate',
    category: 'customer',
    unit: '%',
    formula: {
      expression: '(policies_renewed / policies_expiring) * 100',
      variables: ['policies_renewed', 'policies_expiring'],
      description: 'Percentage of expiring policies that are renewed',
    },
    refreshPolicy: {
      frequency: 'monthly',
      lagMinutes: 0,
      cacheDuration: 86400, // 24 hours
    },
    sourceSystems: [
      {
        systemId: 'policy-service',
        systemName: 'Policy Service',
        endpoint: '/api/policies/retention',
        dataFreshness: 'batch',
        reliability: 0.97,
      },
    ],
    owner: 'VP Customer',
    ownerDepartment: 'Customer',
    lineage: {
      kpiId: 'policy_retention_rate',
      sourceSystem: 'policy-service',
      transformationSteps: ['Identify expiring policies', 'Count renewed policies', 'Calculate renewal rate'],
      lastUpdated: new Date(),
      dataQualityScore: 0.94,
    },
    targets: {
      minimum: 80,
      target: 90,
      stretch: 95,
    },
    thresholds: {
      warning: 85,
      critical: 80,
    },
    tags: ['customer', 'retention', 'growth'],
  },
  {
    id: 'nps_score',
    name: 'Net Promoter Score',
    category: 'customer',
    unit: 'score',
    formula: {
      expression: '((promoters - detractors) / total_responses) * 100',
      variables: ['promoters', 'detractors', 'total_responses'],
      description: 'Net Promoter Score based on customer surveys',
    },
    refreshPolicy: {
      frequency: 'monthly',
      lagMinutes: 0,
      cacheDuration: 86400, // 24 hours
    },
    sourceSystems: [
      {
        systemId: 'customer-portal-service',
        systemName: 'Customer Portal',
        endpoint: '/api/surveys/nps',
        dataFreshness: 'batch',
        reliability: 0.90,
      },
    ],
    owner: 'VP Customer',
    ownerDepartment: 'Customer',
    lineage: {
      kpiId: 'nps_score',
      sourceSystem: 'customer-portal-service',
      transformationSteps: ['Collect survey responses', 'Categorize promoters/detractors', 'Calculate NPS'],
      lastUpdated: new Date(),
      dataQualityScore: 0.88,
    },
    targets: {
      minimum: 0,
      target: 30,
      stretch: 50,
    },
    thresholds: {
      warning: 10,
      critical: 0,
    },
    tags: ['customer', 'satisfaction', 'nps'],
  },
  {
    id: 'fraud_detection_rate',
    name: 'Fraud Detection Rate',
    category: 'risk',
    unit: '%',
    formula: {
      expression: '(fraud_confirmed_cases / total_claims) * 100',
      variables: ['fraud_confirmed_cases', 'total_claims'],
      description: 'Percentage of claims confirmed as fraudulent',
    },
    refreshPolicy: {
      frequency: 'monthly',
      lagMinutes: 0,
      cacheDuration: 86400, // 24 hours
    },
    sourceSystems: [
      {
        systemId: 'fraud-service',
        systemName: 'Fraud Service',
        endpoint: '/api/fraud/aggregate',
        dataFreshness: 'batch',
        reliability: 0.96,
      },
    ],
    owner: 'Head of Fraud',
    ownerDepartment: 'Risk',
    lineage: {
      kpiId: 'fraud_detection_rate',
      sourceSystem: 'fraud-service',
      transformationSteps: ['Identify fraud cases', 'Count total claims', 'Calculate detection rate'],
      lastUpdated: new Date(),
      dataQualityScore: 0.93,
    },
    targets: {
      minimum: 2,
      target: 4,
      stretch: 6,
    },
    thresholds: {
      warning: 3,
      critical: 2,
    },
    tags: ['risk', 'fraud', 'security'],
  },
  {
    id: 'stp_rate',
    name: 'STP Rate',
    category: 'operational',
    unit: '%',
    formula: {
      expression: '(auto_processed_transactions / total_transactions) * 100',
      variables: ['auto_processed_transactions', 'total_transactions'],
      description: 'Straight-Through Processing rate',
    },
    refreshPolicy: {
      frequency: 'daily',
      lagMinutes: 60,
      cacheDuration: 3600, // 1 hour
    },
    sourceSystems: [
      {
        systemId: 'policy-service',
        systemName: 'Policy Service',
        endpoint: '/api/operations/stp',
        dataFreshness: 'near_realtime',
        reliability: 0.99,
      },
      {
        systemId: 'claims-service',
        systemName: 'Claims Service',
        endpoint: '/api/operations/stp',
        dataFreshness: 'near_realtime',
        reliability: 0.99,
      },
    ],
    owner: 'VP Operations',
    ownerDepartment: 'Operations',
    lineage: {
      kpiId: 'stp_rate',
      sourceSystem: 'policy-service,claims-service',
      transformationSteps: ['Count auto-processed', 'Count total transactions', 'Calculate STP rate'],
      lastUpdated: new Date(),
      dataQualityScore: 0.97,
    },
    targets: {
      minimum: 70,
      target: 85,
      stretch: 90,
    },
    thresholds: {
      warning: 75,
      critical: 70,
    },
    tags: ['operational', 'efficiency', 'automation'],
  },
  {
    id: 'claims_settlement_time',
    name: 'Claims Settlement Time',
    category: 'operational',
    unit: 'days',
    formula: {
      expression: 'sum(settlement_days) / count(settled_claims)',
      variables: ['settlement_days', 'settled_claims'],
      description: 'Average time to settle claims',
    },
    refreshPolicy: {
      frequency: 'daily',
      lagMinutes: 60,
      cacheDuration: 3600, // 1 hour
    },
    sourceSystems: [
      {
        systemId: 'claims-service',
        systemName: 'Claims Service',
        endpoint: '/api/claims/settlement-time',
        dataFreshness: 'near_realtime',
        reliability: 0.98,
      },
    ],
    owner: 'VP Claims',
    ownerDepartment: 'Claims',
    lineage: {
      kpiId: 'claims_settlement_time',
      sourceSystem: 'claims-service',
      transformationSteps: ['Collect settlement dates', 'Calculate days', 'Calculate average'],
      lastUpdated: new Date(),
      dataQualityScore: 0.95,
    },
    targets: {
      minimum: 45,
      target: 30,
      stretch: 21,
    },
    thresholds: {
      warning: 35,
      critical: 45,
    },
    tags: ['operational', 'claims', 'efficiency'],
  },
  {
    id: 'customer_churn_rate',
    name: 'Customer Churn Rate',
    category: 'customer',
    unit: '%',
    formula: {
      expression: '(customers_lost / total_customers) * 100',
      variables: ['customers_lost', 'total_customers'],
      description: 'Percentage of customers lost during period',
    },
    refreshPolicy: {
      frequency: 'monthly',
      lagMinutes: 0,
      cacheDuration: 86400, // 24 hours
    },
    sourceSystems: [
      {
        systemId: 'party-kyc-service',
        systemName: 'Party/KYC Service',
        endpoint: '/api/customers/churn',
        dataFreshness: 'batch',
        reliability: 0.95,
      },
    ],
    owner: 'VP Customer',
    ownerDepartment: 'Customer',
    lineage: {
      kpiId: 'customer_churn_rate',
      sourceSystem: 'party-kyc-service',
      transformationSteps: ['Identify lost customers', 'Count total customers', 'Calculate churn rate'],
      lastUpdated: new Date(),
      dataQualityScore: 0.92,
    },
    targets: {
      minimum: 10,
      target: 5,
      stretch: 3,
    },
    thresholds: {
      warning: 7,
      critical: 10,
    },
    tags: ['customer', 'churn', 'retention'],
  },
];

/**
 * KPI Governance Service
 * Manages KPI catalog, formula evaluation, and lineage tracking
 */
export class KPIGovernanceService {
  /**
   * Get KPI by ID
   */
  getKPIById(id: string): KPIDefinition | undefined {
    return KPI_CATALOG.find((kpi) => kpi.id === id);
  }

  /**
   * Get all KPIs
   */
  getAllKPIs(): KPIDefinition[] {
    return KPI_CATALOG;
  }

  /**
   * Get KPIs by category
   */
  getKPIsByCategory(category: KPIDefinition['category']): KPIDefinition[] {
    return KPI_CATALOG.filter((kpi) => kpi.category === category);
  }

  /**
   * Get KPIs by owner
   */
  getKPIsByOwner(owner: string): KPIDefinition[] {
    return KPI_CATALOG.filter((kpi) => kpi.owner === owner);
  }

  /**
   * Get KPIs by tag
   */
  getKPIsByTag(tag: string): KPIDefinition[] {
    return KPI_CATALOG.filter((kpi) => kpi.tags.includes(tag));
  }

  /**
   * Evaluate KPI formula
   */
  evaluateFormula(kpiId: string, variables: Record<string, number>): number {
    const kpi = this.getKPIById(kpiId);
    if (!kpi) {
      throw new Error(`KPI not found: ${kpiId}`);
    }

    // Simple formula evaluation (in production, use a proper expression evaluator)
    const formula = kpi.formula.expression;
    let result = 0;

    if (kpiId === 'market_share') {
      result = (variables.total_policies_sold / variables.total_market_policies) * 100;
    } else if (kpiId === 'combined_ratio') {
      result = (variables.incurred_losses + variables.expenses) / variables.earned_premium;
    } else if (kpiId === 'policy_retention_rate') {
      result = (variables.policies_renewed / variables.policies_expiring) * 100;
    } else if (kpiId === 'nps_score') {
      result = ((variables.promoters - variables.detractors) / variables.total_responses) * 100;
    } else if (kpiId === 'fraud_detection_rate') {
      result = (variables.fraud_confirmed_cases / variables.total_claims) * 100;
    } else if (kpiId === 'stp_rate') {
      result = (variables.auto_processed_transactions / variables.total_transactions) * 100;
    } else if (kpiId === 'claims_settlement_time') {
      result = variables.settlement_days / variables.settled_claims;
    } else if (kpiId === 'customer_churn_rate') {
      result = (variables.customers_lost / variables.total_customers) * 100;
    }

    return result;
  }

  /**
   * Check KPI against targets
   */
  checkKPIAgainstTargets(kpiId: string, value: number): {
    status: 'critical' | 'warning' | 'target' | 'stretch';
    message: string;
  } {
    const kpi = this.getKPIById(kpiId);
    if (!kpi) {
      throw new Error(`KPI not found: ${kpiId}`);
    }

    if (value <= kpi.thresholds.critical) {
      return { status: 'critical', message: `KPI ${kpi.name} is below critical threshold` };
    }

    if (value <= kpi.thresholds.warning) {
      return { status: 'warning', message: `KPI ${kpi.name} is below warning threshold` };
    }

    if (value >= kpi.targets.stretch) {
      return { status: 'stretch', message: `KPI ${kpi.name} exceeded stretch target` };
    }

    if (value >= kpi.targets.target) {
      return { status: 'target', message: `KPI ${kpi.name} met target` };
    }

    return { status: 'warning', message: `KPI ${kpi.name} is below target` };
  }

  /**
   * Update KPI lineage
   */
  updateKPILineage(kpiId: string, lineage: Partial<KPILineage>): void {
    const kpi = this.getKPIById(kpiId);
    if (!kpi) {
      throw new Error(`KPI not found: ${kpiId}`);
    }

    kpi.lineage = {
      ...kpi.lineage,
      ...lineage,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get KPI data quality score
   */
  getKPIDataQualityScore(kpiId: string): number {
    const kpi = this.getKPIById(kpiId);
    if (!kpi) {
      throw new Error(`KPI not found: ${kpiId}`);
    }

    return kpi.lineage.dataQualityScore;
  }

  /**
   * Get KPI refresh schedule
   */
  getKPIRefreshSchedule(kpiId: string): KPIRefreshPolicy {
    const kpi = this.getKPIById(kpiId);
    if (!kpi) {
      throw new Error(`KPI not found: ${kpiId}`);
    }

    return kpi.refreshPolicy;
  }
}

// Export singleton instance
export const kpiGovernanceService = new KPIGovernanceService();
