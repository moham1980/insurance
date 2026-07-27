/**
 * Data Minimization Enforcement
 * Ensures only necessary data is collected, processed, and stored
 */

import { createHmac } from 'crypto';
import { DataSensitivity } from './data-inventory';

export interface DataMinimizationRule {
  id: string;
  name: string;
  description: string;
  appliesTo: string; // data category or field name
  ruleType: 'collection' | 'processing' | 'storage' | 'sharing';
  condition: MinimizationCondition;
  action: MinimizationAction;
}

export interface MinimizationCondition {
  field?: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'matches' | 'greater_than' | 'always';
  value?: any;
}

export interface MinimizationAction {
  type: 'exclude' | 'mask' | 'aggregate' | 'anonymize' | 'transform';
  parameters?: Record<string, any>;
}

/**
 * Predefined data minimization rules
 */
export const DATA_MINIMIZATION_RULES: DataMinimizationRule[] = [
  {
    id: 'DMIN-001',
    name: 'Exclude Non-Essential Contact Data',
    description: 'Exclude non-essential contact information from collection',
    appliesTo: 'customer',
    ruleType: 'collection',
    condition: { operator: 'always' },
    action: { type: 'exclude', parameters: { fields: ['work_phone', 'secondary_email', 'fax'] } },
  },
  {
    id: 'DMIN-002',
    name: 'Mask Partial National ID',
    description: 'Mask partial national ID in processing and storage',
    appliesTo: 'national_id',
    ruleType: 'processing',
    condition: { operator: 'always' },
    action: { type: 'mask', parameters: { strategy: 'partial', visibleChars: 4 } },
  },
  {
    id: 'DMIN-003',
    name: 'Anonymize Old Transaction Data',
    description: 'Anonymize transaction data older than 7 years',
    appliesTo: 'financial',
    ruleType: 'storage',
    condition: { field: 'age_days', operator: 'greater_than', value: 2555 },
    action: { type: 'anonymize', parameters: { fields: ['account_number', 'card_number'] } },
  },
  {
    id: 'DMIN-004',
    name: 'Aggregate Behavioral Data',
    description: 'Aggregate behavioral data for analytics instead of storing raw events',
    appliesTo: 'behavioral',
    ruleType: 'processing',
    condition: { operator: 'always' },
    action: { type: 'aggregate', parameters: { aggregation: 'daily_summary' } },
  },
  {
    id: 'DMIN-005',
    name: 'Exclude Medical Details for Non-Claims',
    description: 'Exclude medical details when not processing claims',
    appliesTo: 'medical',
    ruleType: 'collection',
    condition: { field: 'context', operator: 'not_equals', value: 'claims_processing' },
    action: { type: 'exclude', parameters: { fields: ['diagnosis', 'treatment_details'] } },
  },
  {
    id: 'DMIN-006',
    name: 'Transform Location Data',
    description: 'Transform precise location to general area for privacy',
    appliesTo: 'location',
    ruleType: 'processing',
    condition: { operator: 'always' },
    action: { type: 'transform', parameters: { precision: 'city_level' } },
  },
  {
    id: 'DMIN-007',
    name: 'Exclude Marketing Data for Non-Marketing',
    description: 'Exclude marketing-related data when not for marketing purposes',
    appliesTo: 'contact',
    ruleType: 'collection',
    condition: { field: 'purpose', operator: 'not_equals', value: 'marketing' },
    action: { type: 'exclude', parameters: { fields: ['preferences', 'interests', 'demographics'] } },
  },
];

/**
 * Data Minimization Service
 */
export class DataMinimizationService {
  /**
   * Apply minimization rules to data object
   */
  applyMinimization(data: any, context: { category: string; purpose?: string; ageDays?: number }): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const minimized = { ...data };

    // Get applicable rules
    const applicableRules = DATA_MINIMIZATION_RULES.filter(rule =>
      this.isRuleApplicable(rule, context),
    );

    // Apply each rule
    for (const rule of applicableRules) {
      this.applyRule(minimized, rule, context);
    }

    return minimized;
  }

  /**
   * Check if a rule is applicable to the current context
   */
  private isRuleApplicable(rule: DataMinimizationRule, context: { category: string; purpose?: string; ageDays?: number }): boolean {
    // Check if rule applies to the data category
    if (rule.appliesTo !== context.category && !this.fieldExistsInData(rule.appliesTo)) {
      return false;
    }

    // Check condition
    if (rule.condition.operator === 'always') {
      return true;
    }

    if (rule.condition.field === 'age_days' && context.ageDays !== undefined) {
      if (rule.condition.operator === 'greater_than' && context.ageDays > rule.condition.value) {
        return true;
      }
    }

    if (rule.condition.field === 'context' && context.purpose) {
      if (rule.condition.operator === 'not_equals' && context.purpose !== rule.condition.value) {
        return true;
      }
      if (rule.condition.operator === 'equals' && context.purpose === rule.condition.value) {
        return true;
      }
    }

    return false;
  }

  /**
   * Apply a single minimization rule
   */
  private applyRule(data: any, rule: DataMinimizationRule, context: any): void {
    if (!data) return;

    switch (rule.action.type) {
      case 'exclude':
        this.excludeFields(data, rule.action.parameters?.fields || []);
        break;
      case 'mask':
        this.maskFields(data, rule.action.parameters);
        break;
      case 'aggregate':
        this.aggregateData(data, rule.action.parameters);
        break;
      case 'anonymize':
        this.anonymizeFields(data, rule.action.parameters?.fields || []);
        break;
      case 'transform':
        this.transformField(data, rule.action.parameters);
        break;
    }
  }

  /**
   * Exclude specified fields from data
   */
  private excludeFields(data: any, fields: string[]): void {
    if (!Array.isArray(fields)) return;

    for (const field of fields) {
      delete data[field];
    }
  }

  /**
   * Mask specified fields
   */
  private maskFields(data: any, parameters?: { strategy?: string; visibleChars?: number }): void {
    const strategy = parameters?.strategy || 'partial';
    const visibleChars = parameters?.visibleChars || 4;

    for (const key in data) {
      if (typeof data[key] === 'string') {
        data[key] = this.maskString(data[key], strategy, visibleChars);
      }
    }
  }

  /**
   * Aggregate data
   */
  private aggregateData(data: any, parameters?: { aggregation?: string }): void {
    const aggregation = parameters?.aggregation || 'daily_summary';

    if (aggregation === 'daily_summary') {
      // Convert raw events to daily summary
      if (Array.isArray(data)) {
        data.length = 0; // Clear raw data
        // In a real implementation, this would compute daily summaries
      }
    }
  }

  /**
   * Anonymize specified fields
   */
  private anonymizeFields(data: any, fields: string[]): void {
    for (const field of fields) {
      if (data[field]) {
        data[field] = this.hashValue(String(data[field]));
      }
    }
  }

  /**
   * Transform field
   */
  private transformField(data: any, parameters?: { precision?: string }): void {
    const precision = parameters?.precision || 'city_level';

    if (precision === 'city_level' && data.location) {
      // In a real implementation, this would geocode to city level
      data.location = data.location.split(',').slice(0, 2).join(',');
    }
  }

  /**
   * Mask a string
   */
  private maskString(value: string, strategy: string, visibleChars: number): string {
    if (!value) return value;

    switch (strategy) {
      case 'full':
        return '*'.repeat(value.length);
      case 'partial':
        if (value.length <= visibleChars) return '*'.repeat(value.length);
        return value.substring(0, visibleChars) + '*'.repeat(value.length - visibleChars * 2) + value.substring(value.length - visibleChars);
      default:
        return value;
    }
  }

  /**
   * Hash a value using HMAC-SHA256.
   * Requires DATA_MINIMIZATION_SECRET to be configured in production.
   */
  private hashValue(value: string): string {
    const secret = process.env.DATA_MINIMIZATION_SECRET || 'dev-only-change-me';
    const hmac = createHmac('sha256', secret).update(value).digest('hex');
    return `HASH_${hmac}`;
  }

  /**
   * Check if a field exists in the data structure
   */
  private fieldExistsInData(fieldName: string): boolean {
    // In a real implementation, this would check against a schema
    return true;
  }

  /**
   * Validate that data collection follows minimization principles
   */
  validateCollection(data: any, requiredFields: string[]): {
    valid: boolean;
    violations: string[];
  } {
    const violations: string[] = [];
    const collectedFields = Object.keys(data);

    // Check for non-required fields
    for (const field of collectedFields) {
      if (!requiredFields.includes(field)) {
        const rule = DATA_MINIMIZATION_RULES.find(r =>
          r.ruleType === 'collection' &&
          r.action.type === 'exclude' &&
          r.action.parameters?.fields?.includes(field),
        );

        if (rule) {
          violations.push(`Field '${field}' should be excluded per rule ${rule.id}`);
        }
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  /**
   * Get minimization statistics
   */
  getMinimizationStats(): {
    totalRules: number;
    byType: Record<string, number>;
    byAction: Record<string, number>;
  } {
    const stats = {
      totalRules: DATA_MINIMIZATION_RULES.length,
      byType: {} as Record<string, number>,
      byAction: {} as Record<string, number>,
    };

    for (const rule of DATA_MINIMIZATION_RULES) {
      stats.byType[rule.ruleType] = (stats.byType[rule.ruleType] || 0) + 1;
      stats.byAction[rule.action.type] = (stats.byAction[rule.action.type] || 0) + 1;
    }

    return stats;
  }
}

// Export singleton instance
export const dataMinimizationService = new DataMinimizationService();
