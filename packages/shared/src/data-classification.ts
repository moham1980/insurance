import { DataSensitivity } from './data-inventory';

/**
 * Data Classification Service
 * Handles data sensitivity classification and access control based on sensitivity
 */

export interface ClassificationRule {
  id: string;
  name: string;
  description: string;
  sensitivity: DataSensitivity;
  conditions: ClassificationCondition[];
  actions: ClassificationAction[];
}

export interface ClassificationCondition {
  field: string;
  operator: 'contains' | 'equals' | 'matches' | 'in';
  value: any;
}

export interface ClassificationAction {
  type: 'encrypt' | 'mask' | 'restrict_access' | 'audit' | 'require_approval';
  parameters?: Record<string, any>;
}

/**
 * Predefined classification rules
 */
export const CLASSIFICATION_RULES: ClassificationRule[] = [
  {
    id: 'RULE-001',
    name: 'National ID Classification',
    description: 'Classify national ID as PII',
    sensitivity: 'pii',
    conditions: [
      { field: 'name', operator: 'equals', value: 'national_id' },
    ],
    actions: [
      { type: 'encrypt', parameters: { algorithm: 'aes-256-gcm' } },
      { type: 'mask', parameters: { strategy: 'partial', visibleChars: 4 } },
      { type: 'audit', parameters: { logAccess: true } },
    ],
  },
  {
    id: 'RULE-002',
    name: 'Financial Data Classification',
    description: 'Classify financial amounts as confidential',
    sensitivity: 'confidential',
    conditions: [
      { field: 'type', operator: 'in', value: ['decimal', 'numeric', 'money'] },
      { field: 'name', operator: 'matches', value: /amount|balance|premium|payment/i },
    ],
    actions: [
      { type: 'restrict_access', parameters: { roles: ['finance_ops', 'auditor', 'insurer_admin'] } },
      { type: 'audit', parameters: { logAccess: true, logRead: true } },
    ],
  },
  {
    id: 'RULE-003',
    name: 'Payment Card Classification',
    description: 'Classify payment card numbers as restricted',
    sensitivity: 'restricted',
    conditions: [
      { field: 'name', operator: 'matches', value: /card|credit|debit/i },
    ],
    actions: [
      { type: 'encrypt', parameters: { algorithm: 'aes-256-gcm', keyRotation: '90_days' } },
      { type: 'mask', parameters: { strategy: 'partial', visibleChars: 4 } },
      { type: 'audit', parameters: { logAccess: true, logRead: true, logWrite: true } },
      { type: 'require_approval', parameters: { approverRoles: ['finance_ops'] } },
    ],
  },
  {
    id: 'RULE-004',
    name: 'Personal Contact Information Classification',
    description: 'Classify contact information as PII',
    sensitivity: 'pii',
    conditions: [
      { field: 'name', operator: 'in', value: ['phone', 'email', 'address', 'mobile'] },
    ],
    actions: [
      { type: 'encrypt', parameters: { algorithm: 'aes-256-gcm' } },
      { type: 'mask', parameters: { strategy: 'partial' } },
      { type: 'audit', parameters: { logAccess: true } },
    ],
  },
  {
    id: 'RULE-005',
    name: 'Health Information Classification',
    description: 'Classify health/medical information as restricted',
    sensitivity: 'restricted',
    conditions: [
      { field: 'name', operator: 'matches', value: /medical|health|diagnosis|treatment/i },
    ],
    actions: [
      { type: 'encrypt', parameters: { algorithm: 'aes-256-gcm' } },
      { type: 'restrict_access', parameters: { roles: ['claims_handler', 'medical_reviewer', 'auditor'] } },
      { type: 'audit', parameters: { logAccess: true, logRead: true } },
    ],
  },
];

/**
 * Classify data based on field metadata
 */
export function classifyData(field: { name: string; type: string; value?: any }): {
  sensitivity: DataSensitivity;
  actions: ClassificationAction[];
} {
  const matchingRules = CLASSIFICATION_RULES.filter(rule =>
    rule.conditions.every(condition =>
      evaluateCondition(condition, field),
    ),
  );

  // Use the highest sensitivity level from matching rules
  const sensitivityOrder: DataSensitivity[] = ['restricted', 'pii', 'confidential', 'internal', 'public'];
  let highestSensitivity: DataSensitivity = 'internal';
  const allActions: ClassificationAction[] = [];

  for (const rule of matchingRules) {
    const ruleIndex = sensitivityOrder.indexOf(rule.sensitivity);
    const currentIndex = sensitivityOrder.indexOf(highestSensitivity);
    
    if (ruleIndex < currentIndex) {
      highestSensitivity = rule.sensitivity;
    }
    
    allActions.push(...rule.actions);
  }

  return {
    sensitivity: highestSensitivity,
    actions: allActions,
  };
}

/**
 * Evaluate a classification condition
 */
function evaluateCondition(condition: ClassificationCondition, field: { name: string; type: string; value?: any }): boolean {
  const fieldValue = field.value !== undefined ? field.value : field[condition.field as keyof typeof field];

  switch (condition.operator) {
    case 'equals':
      return fieldValue === condition.value;
    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
    case 'matches':
      return condition.value instanceof RegExp ? condition.value.test(String(fieldValue)) : false;
    case 'in':
      return Array.isArray(condition.value) ? condition.value.includes(fieldValue) : false;
    default:
      return false;
  }
}

/**
 * Mask PII data based on strategy
 */
export function maskPii(data: string, strategy: 'full' | 'partial' | 'hash' | 'tokenize' | null): string {
  if (!data || !strategy) return data;

  switch (strategy) {
    case 'full':
      return '*'.repeat(data.length);
    case 'partial':
      // Show first 2 and last 2 characters
      if (data.length <= 4) return '*'.repeat(data.length);
      return data.substring(0, 2) + '*'.repeat(data.length - 4) + data.substring(data.length - 2);
    case 'hash':
      // Simple hash for demonstration (use proper crypto in production)
      return Buffer.from(data).toString('base64').substring(0, 16);
    case 'tokenize':
      // Tokenization placeholder
      return `TOKEN_${Buffer.from(data).toString('base64').substring(0, 8)}`;
    default:
      return data;
  }
}

/**
 * Check if data access requires approval based on classification
 */
export function requiresApproval(sensitivity: DataSensitivity, userRoles: string[]): boolean {
  if (sensitivity === 'restricted') {
    return !userRoles.some(role => ['finance_ops', 'insurer_admin', 'compliance_aml'].includes(role));
  }
  if (sensitivity === 'pii') {
    return !userRoles.some(role => ['insurer_admin', 'compliance_aml', 'auditor'].includes(role));
  }
  return false;
}

/**
 * Get retention period in days
 */
export function getRetentionPeriodDays(period: string): number {
  const periodMap: Record<string, number> = {
    '1_day': 1,
    '7_days': 7,
    '30_days': 30,
    '90_days': 90,
    '1_year': 365,
    '3_years': 1095,
    '7_years': 2555,
    '10_years': 3650,
    'permanent': -1,
  };
  return periodMap[period] || 365;
}
