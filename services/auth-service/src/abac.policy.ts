/**
 * ABAC (Attribute-Based Access Control) Policy Definitions
 * Policies are evaluated based on user attributes, resource attributes, and context
 */

export type AttributeOperator = 'equals' | 'not_equals' | 'contains' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'exists';

export interface AttributeCondition {
  attribute: string; // e.g., 'user.department', 'resource.owner', 'context.time'
  operator: AttributeOperator;
  value: any;
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  effect: 'allow' | 'deny';
  conditions: AttributeCondition[];
  priority: number; // Higher priority rules are evaluated first
}

export interface PolicyEvaluationContext {
  user: {
    userId: string;
    roles: string[];
    orgUnitId?: string;
    department?: string;
    positionTitle?: string;
    nationalId?: string;
    attributes?: Record<string, any>;
  };
  resource: {
    type: string; // e.g., 'policy', 'claim', 'user'
    id?: string;
    owner?: string;
    orgUnitId?: string;
    tenantId?: string;
    attributes?: Record<string, any>;
  };
  action: string; // e.g., 'read', 'write', 'delete'
  context: {
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    attributes?: Record<string, any>;
  };
}

/**
 * Predefined ABAC policies
 */
export const ABAC_POLICIES: PolicyRule[] = [
  // Policy: Users can only access resources in their own org unit
  {
    id: 'POL-001',
    name: 'Org Unit Isolation',
    description: 'Users can only access resources belonging to their org unit',
    effect: 'allow',
    conditions: [
      {
        attribute: 'user.orgUnitId',
        operator: 'equals',
        value: 'resource.orgUnitId',
      },
    ],
    priority: 100,
  },
  // Policy: Resource owners have full access to their resources
  {
    id: 'POL-002',
    name: 'Resource Owner Access',
    description: 'Users have full access to resources they own',
    effect: 'allow',
    conditions: [
      {
        attribute: 'user.userId',
        operator: 'equals',
        value: 'resource.owner',
      },
    ],
    priority: 90,
  },
  // Policy: Branch managers can access resources in their branch
  {
    id: 'POL-003',
    name: 'Branch Manager Access',
    description: 'Branch managers can access resources in their branch',
    effect: 'allow',
    conditions: [
      {
        attribute: 'user.roles',
        operator: 'contains',
        value: 'branch_manager',
      },
      {
        attribute: 'user.orgUnitId',
        operator: 'equals',
        value: 'resource.orgUnitId',
      },
    ],
    priority: 85,
  },
  // Policy: Underwriters can only access policies in risk assessment
  {
    id: 'POL-004',
    name: 'Underwriter Policy Access',
    description: 'Underwriters can access policies in risk assessment',
    effect: 'allow',
    conditions: [
      {
        attribute: 'user.roles',
        operator: 'contains',
        value: 'underwriter',
      },
      {
        attribute: 'resource.type',
        operator: 'equals',
        value: 'policy',
      },
      {
        attribute: 'resource.attributes.status',
        operator: 'in',
        value: ['pending_review', 'risk_assessment'],
      },
    ],
    priority: 80,
  },
  // Policy: Claims handlers can only access active claims
  {
    id: 'POL-005',
    name: 'Claims Handler Access',
    description: 'Claims handlers can access active claims',
    effect: 'allow',
    conditions: [
      {
        attribute: 'user.roles',
        operator: 'contains',
        value: 'claims_handler',
      },
      {
        attribute: 'resource.type',
        operator: 'equals',
        value: 'claim',
      },
      {
        attribute: 'resource.attributes.status',
        operator: 'not_in',
        value: ['closed', 'settled'],
      },
    ],
    priority: 80,
  },
  // Policy: Deny access to sensitive data during non-business hours
  {
    id: 'POL-006',
    name: 'Business Hours Restriction',
    description: 'Sensitive data access is restricted to business hours',
    effect: 'deny',
    conditions: [
      {
        attribute: 'resource.attributes.sensitivity',
        operator: 'equals',
        value: 'high',
      },
      {
        attribute: 'context.attributes.hour',
        operator: 'not_in',
        value: [9, 10, 11, 12, 13, 14, 15, 16, 17], // 9 AM to 5 PM
      },
    ],
    priority: 95,
  },
  // Policy: Deny access from untrusted locations
  {
    id: 'POL-007',
    name: 'Location-Based Restriction',
    description: 'Deny access from untrusted geographic locations',
    effect: 'deny',
    conditions: [
      {
        attribute: 'context.location',
        operator: 'in',
        value: ['untrusted_region_1', 'untrusted_region_2'],
      },
    ],
    priority: 95,
  },
  // Policy: SoD — User cannot approve their own claim
  {
    id: 'POL-008',
    name: 'SoD Claim Approval',
    description: 'A user cannot approve a claim they registered',
    effect: 'deny',
    conditions: [
      {
        attribute: 'user.userId',
        operator: 'equals',
        value: 'resource.attributes.registrarId',
      },
      {
        attribute: 'resource.type',
        operator: 'equals',
        value: 'claim',
      },
      {
        attribute: 'action',
        operator: 'equals',
        value: 'approve',
      },
    ],
    priority: 99,
  },
  // Policy: SoD — User cannot approve their own payment
  {
    id: 'POL-009',
    name: 'SoD Payment Approval',
    description: 'A user cannot approve a payment they prepared',
    effect: 'deny',
    conditions: [
      {
        attribute: 'user.userId',
        operator: 'equals',
        value: 'resource.attributes.preparerId',
      },
      {
        attribute: 'resource.type',
        operator: 'equals',
        value: 'payment',
      },
      {
        attribute: 'action',
        operator: 'equals',
        value: 'approve',
      },
    ],
    priority: 99,
  },
  // Policy: SoD — User cannot underwrite their own policy
  {
    id: 'POL-010',
    name: 'SoD Policy Underwriting',
    description: 'A user cannot underwrite a policy they issued',
    effect: 'deny',
    conditions: [
      {
        attribute: 'user.userId',
        operator: 'equals',
        value: 'resource.attributes.issuerId',
      },
      {
        attribute: 'resource.type',
        operator: 'equals',
        value: 'policy',
      },
      {
        attribute: 'action',
        operator: 'equals',
        value: 'underwrite',
      },
    ],
    priority: 99,
  },
];

/**
 * Evaluate a single condition
 */
function evaluateCondition(
  condition: AttributeCondition,
  context: PolicyEvaluationContext,
): boolean {
  const { attribute, operator, value } = condition;

  // Resolve attribute value from context
  const attrValue = resolveAttributeValue(attribute, context);

  // Handle special case where value references another attribute
  const compareValue = typeof value === 'string' && value.startsWith('resource.')
    ? resolveAttributeValue(value, context)
    : value;

  switch (operator) {
    case 'equals':
      return attrValue === compareValue;
    case 'not_equals':
      return attrValue !== compareValue;
    case 'contains':
      return Array.isArray(attrValue) ? attrValue.includes(compareValue) : String(attrValue).includes(String(compareValue));
    case 'in':
      return Array.isArray(compareValue) ? compareValue.includes(attrValue) : false;
    case 'not_in':
      return Array.isArray(compareValue) ? !compareValue.includes(attrValue) : true;
    case 'greater_than':
      return Number(attrValue) > Number(compareValue);
    case 'less_than':
      return Number(attrValue) < Number(compareValue);
    case 'exists':
      return attrValue !== undefined && attrValue !== null;
    default:
      return false;
  }
}

/**
 * Resolve attribute value from context
 */
function resolveAttributeValue(attributePath: string, context: PolicyEvaluationContext): any {
  const parts = attributePath.split('.');
  let value: any = context;

  for (const part of parts) {
    if (value === null || value === undefined) return undefined;
    value = value[part];
  }

  return value;
}

/**
 * Evaluate all policies and return the final decision
 * Uses "deny overrides" logic: any deny policy results in denial
 */
export function evaluatePolicies(
  context: PolicyEvaluationContext,
  policies: PolicyRule[] = ABAC_POLICIES,
): { allowed: boolean; matchedPolicy?: PolicyRule } {
  // Sort policies by priority (highest first)
  const sortedPolicies = [...policies].sort((a, b) => b.priority - a.priority);

  let allowCount = 0;

  for (const policy of sortedPolicies) {
    const allConditionsMet = policy.conditions.every(condition =>
      evaluateCondition(condition, context),
    );

    if (allConditionsMet) {
      if (policy.effect === 'deny') {
        // Deny takes precedence
        return { allowed: false, matchedPolicy: policy };
      } else if (policy.effect === 'allow') {
        allowCount++;
      }
    }
  }

  // Default deny if no allow policies matched
  return { allowed: allowCount > 0 };
}
