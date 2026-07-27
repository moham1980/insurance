/**
 * Data Retention Policy
 * Manages data retention periods and automated data deletion
 */

import { getRetentionPeriodDays } from './data-classification';

export interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  dataCategory: string;
  retentionPeriod: string;
  retentionPeriodDays: number;
  deletionAction: 'delete' | 'archive' | 'anonymize';
  conditions?: RetentionCondition[];
  exceptions?: RetentionException[];
}

export interface RetentionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in';
  value: any;
}

export interface RetentionException {
  type: 'legal_hold' | 'audit' | 'dispute' | 'regulatory';
  description: string;
  extendsRetentionBy?: string; // e.g., '90_days', '1_year'
}

/**
 * Predefined retention policies
 */
export const RETENTION_POLICIES: RetentionPolicy[] = [
  {
    id: 'RET-001',
    name: 'Customer Data Retention',
    description: 'Customer personal data retention policy',
    dataCategory: 'customer',
    retentionPeriod: '7_years',
    retentionPeriodDays: 2555,
    deletionAction: 'anonymize',
    exceptions: [
      {
        type: 'legal_hold',
        description: 'Data under legal hold cannot be deleted',
      },
      {
        type: 'audit',
        description: 'Audit data extends retention by 3 years',
        extendsRetentionBy: '3_years',
      },
    ],
  },
  {
    id: 'RET-002',
    name: 'Policy Data Retention',
    description: 'Insurance policy data retention policy',
    dataCategory: 'policy',
    retentionPeriod: '10_years',
    retentionPeriodDays: 3650,
    deletionAction: 'archive',
    exceptions: [
      {
        type: 'dispute',
        description: 'Policies under dispute extend retention by 2 years',
        extendsRetentionBy: '2_years',
      },
    ],
  },
  {
    id: 'RET-003',
    name: 'Claims Data Retention',
    description: 'Claims data retention policy',
    dataCategory: 'claim',
    retentionPeriod: '10_years',
    retentionPeriodDays: 3650,
    deletionAction: 'archive',
    exceptions: [
      {
        type: 'legal_hold',
        description: 'Claims under legal hold cannot be deleted',
      },
      {
        type: 'dispute',
        description: 'Disputed claims extend retention by 3 years',
        extendsRetentionBy: '3_years',
      },
    ],
  },
  {
    id: 'RET-004',
    name: 'Financial Transactions Retention',
    description: 'Financial transaction data retention policy',
    dataCategory: 'financial',
    retentionPeriod: '7_years',
    retentionPeriodDays: 2555,
    deletionAction: 'archive',
    exceptions: [
      {
        type: 'audit',
        description: 'Audit requirements extend retention by 3 years',
        extendsRetentionBy: '3_years',
      },
    ],
  },
  {
    id: 'RET-005',
    name: 'Sanhab Inquiry Logs Retention',
    description: 'Sanhab inquiry logs retention policy',
    dataCategory: 'operational',
    retentionPeriod: '3_years',
    retentionPeriodDays: 1095,
    deletionAction: 'delete',
    exceptions: [
      {
        type: 'regulatory',
        description: 'Regulatory investigations extend retention by 2 years',
        extendsRetentionBy: '2_years',
      },
    ],
  },
  {
    id: 'RET-006',
    name: 'Audit Logs Retention',
    description: 'System audit logs retention policy',
    dataCategory: 'operational',
    retentionPeriod: '3_years',
    retentionPeriodDays: 1095,
    deletionAction: 'archive',
    exceptions: [
      {
        type: 'audit',
        description: 'Critical audit logs are retained permanently',
        extendsRetentionBy: 'permanent',
      },
    ],
  },
];

/**
 * Data Retention Service
 */
export class DataRetentionService {
  /**
   * Get retention policy for a data category
   */
  getPolicyForCategory(category: string): RetentionPolicy | undefined {
    return RETENTION_POLICIES.find(policy => policy.dataCategory === category);
  }

  /**
   * Check if data is eligible for deletion
   */
  isEligibleForDeletion(
    category: string,
    createdAt: Date,
    exceptions?: Array<{ type: string; description?: string }>,
  ): { eligible: boolean; reason?: string; policy?: RetentionPolicy } {
    const policy = this.getPolicyForCategory(category);
    if (!policy) {
      return { eligible: false, reason: 'No retention policy found for category' };
    }

    // Check for exceptions
    if (exceptions && exceptions.length > 0) {
      const hasException = exceptions.some(exc =>
        policy.exceptions?.some(policyExc => policyExc.type === exc.type),
      );
      if (hasException) {
        return { eligible: false, reason: 'Data has active retention exceptions', policy };
      }
    }

    // Check retention period
    const retentionDate = new Date(createdAt);
    retentionDate.setDate(retentionDate.getDate() + policy.retentionPeriodDays);

    const now = new Date();
    if (now < retentionDate) {
      const daysUntilDeletion = Math.ceil((retentionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { eligible: false, reason: `Retention period not met (${daysUntilDeletion} days remaining)`, policy };
    }

    return { eligible: true, policy };
  }

  /**
   * Calculate deletion date for data
   */
  calculateDeletionDate(category: string, createdAt: Date, exceptions?: Array<{ type: string; description?: string }>): Date {
    const policy = this.getPolicyForCategory(category);
    if (!policy) {
      const defaultRetention = 365; // Default 1 year
      const deletionDate = new Date(createdAt);
      deletionDate.setDate(deletionDate.getDate() + defaultRetention);
      return deletionDate;
    }

    let retentionDays = policy.retentionPeriodDays;

    // Add exception extensions
    if (exceptions && exceptions.length > 0) {
      for (const exception of exceptions) {
        const policyException = policy.exceptions?.find(exc => exc.type === exception.type);
        if (policyException?.extendsRetentionBy) {
          retentionDays += getRetentionPeriodDays(policyException.extendsRetentionBy);
        }
      }
    }

    const deletionDate = new Date(createdAt);
    deletionDate.setDate(deletionDate.getDate() + retentionDays);
    return deletionDate;
  }

  /**
   * Get data eligible for deletion
   */
  getEligibleForDeletion(
    dataItems: Array<{ id: string; category: string; createdAt: Date; exceptions?: Array<{ type: string; description?: string }> }>,
  ): Array<{ id: string; category: string; deletionDate: Date; policy: RetentionPolicy }> {
    const eligible: Array<{ id: string; category: string; deletionDate: Date; policy: RetentionPolicy }> = [];

    for (const item of dataItems) {
      const eligibility = this.isEligibleForDeletion(item.category, item.createdAt, item.exceptions);
      if (eligibility.eligible && eligibility.policy) {
        eligible.push({
          id: item.id,
          category: item.category,
          deletionDate: this.calculateDeletionDate(item.category, item.createdAt, item.exceptions),
          policy: eligibility.policy,
        });
      }
    }

    return eligible.sort((a, b) => a.deletionDate.getTime() - b.deletionDate.getTime());
  }

  /**
   * Get retention statistics
   */
  getRetentionStats(
    dataItems: Array<{ category: string; createdAt: Date; exceptions?: Array<{ type: string }> }>,
  ): {
    total: number;
    eligibleForDeletion: number;
    byCategory: Record<string, { total: number; eligible: number }>;
  } {
    const stats = {
      total: dataItems.length,
      eligibleForDeletion: 0,
      byCategory: {} as Record<string, { total: number; eligible: number }>,
    };

    for (const item of dataItems) {
      if (!stats.byCategory[item.category]) {
        stats.byCategory[item.category] = { total: 0, eligible: 0 };
      }
      stats.byCategory[item.category].total++;

      const eligibility = this.isEligibleForDeletion(item.category, item.createdAt, item.exceptions);
      if (eligibility.eligible) {
        stats.eligibleForDeletion++;
        stats.byCategory[item.category].eligible++;
      }
    }

    return stats;
  }
}

// Export singleton instance
export const dataRetentionService = new DataRetentionService();
