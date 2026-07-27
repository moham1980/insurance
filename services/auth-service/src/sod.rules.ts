/**
 * Separation of Duties (SoD) Rules
 * Prevents conflicts of interest by ensuring critical actions require multiple users
 */

export interface SodRule {
  id: string;
  name: string;
  description: string;
  conflictingRoles: string[]; // Roles that cannot be held by the same user
  conflictingActions: string[]; // Actions that cannot be performed by the same user
  severity: 'error' | 'warning';
}

/**
 * SoD Rules
 */
export const SOD_RULES: SodRule[] = [
  {
    id: 'SOD-001',
    name: 'Underwriter vs Claims Handler',
    description: 'A user cannot be both an underwriter and a claims handler to prevent fraud',
    conflictingRoles: ['underwriter', 'claims_handler'],
    conflictingActions: ['policy:underwriting_decide', 'claims:approve'],
    severity: 'error',
  },
  {
    id: 'SOD-002',
    name: 'Risk Manager vs Fraud Analyst',
    description: 'A user cannot be both a risk manager and a fraud analyst to prevent conflict of interest',
    conflictingRoles: ['risk_manager', 'fraud_analyst'],
    conflictingActions: ['risk:rules_manage', 'fraud:investigate'],
    severity: 'error',
  },
  {
    id: 'SOD-003',
    name: 'Finance vs Collections',
    description: 'A user cannot be both in finance and collections to prevent embezzlement',
    conflictingRoles: ['finance_ops', 'collections_ops'],
    conflictingActions: ['claims:pay', 'collections:collect'],
    severity: 'error',
  },
  {
    id: 'SOD-004',
    name: 'Compliance vs Operations',
    description: 'A user cannot be both in compliance and operations to maintain independence',
    conflictingRoles: ['compliance_aml', 'head_office_ops', 'branch_manager'],
    conflictingActions: ['aml:report', 'policy:issue'],
    severity: 'warning',
  },
  {
    id: 'SOD-005',
    name: 'Auditor vs Operations',
    description: 'A user cannot be both an auditor and in operations to maintain independence',
    conflictingRoles: ['auditor', 'head_office_ops', 'branch_manager', 'underwriter', 'claims_handler'],
    conflictingActions: ['reporting:view', 'policy:issue', 'claims:approve'],
    severity: 'error',
  },
  {
    id: 'SOD-006',
    name: 'Policy Issuance vs Payment',
    description: 'A user cannot both issue policies and process payments to prevent fraud',
    conflictingRoles: ['underwriter', 'branch_manager', 'finance_ops'],
    conflictingActions: ['policy:issue', 'claims:pay'],
    severity: 'error',
  },
  {
    id: 'SOD-007',
    name: 'Reinsurance vs Underwriting',
    description: 'A user cannot be both in reinsurance and underwriting to prevent conflict of interest',
    conflictingRoles: ['reinsurance_ops', 'underwriter'],
    conflictingActions: ['reinsurance:manage_program', 'policy:underwriting_decide'],
    severity: 'warning',
  },
];

/**
 * Check if a user's roles violate any SoD rules
 */
export function checkSodViolations(userRoles: string[]): { violations: SodRule[]; warnings: SodRule[] } {
  const violations: SodRule[] = [];
  const warnings: SodRule[] = [];

  for (const rule of SOD_RULES) {
    const matchedConflictingRoles = rule.conflictingRoles.filter(role => userRoles.includes(role));
    const hasConflictingRoles = matchedConflictingRoles.length >= 2;

    if (hasConflictingRoles) {
      if (rule.severity === 'error') {
        violations.push(rule);
      } else {
        warnings.push(rule);
      }
    }
  }

  return { violations, warnings };
}

/**
 * Check if a user can perform an action based on SoD rules
 */
export function checkActionSodViolation(userRoles: string[], action: string): SodRule | null {
  for (const rule of SOD_RULES) {
    if (!rule.conflictingActions.includes(action)) continue;

    const hasConflictingRoles = rule.conflictingRoles.some(role => userRoles.includes(role));

    if (hasConflictingRoles && rule.severity === 'error') {
      return rule;
    }
  }

  return null;
}

/**
 * Get recommended role assignments based on SoD rules
 */
export function getRoleAssignmentsWithSodWarnings(proposedRoles: string[]): {
  allowed: boolean;
  warnings: string[];
  errors: string[];
} {
  const { violations, warnings } = checkSodViolations(proposedRoles);

  return {
    allowed: violations.length === 0,
    warnings: warnings.map(w => `Warning: ${w.name} - ${w.description}`),
    errors: violations.map(v => `Error: ${v.name} - ${v.description}`),
  };
}
