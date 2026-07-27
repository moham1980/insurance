/**
 * Purpose-Based Access Control
 * Restricts data access based on the stated purpose of the access request
 */

import { ConsentPurpose } from './consent-management';

export interface AccessPurpose {
  id: string;
  name: string;
  description: string;
  dataCategories: string[];
  requiredConsent: ConsentPurpose[];
  allowedRoles: string[];
  timeRestrictions?: {
    allowedHours?: number[];
    allowedDays?: number[];
  };
  locationRestrictions?: {
    allowedLocations?: string[];
    blockedLocations?: string[];
  };
  auditRequired: boolean;
}

/**
 * Predefined access purposes
 */
export const ACCESS_PURPOSES: AccessPurpose[] = [
  {
    id: 'PURP-001',
    name: 'Underwriting',
    description: 'Access customer data for underwriting and risk assessment',
    dataCategories: ['customer', 'policy', 'vehicle', 'financial'],
    requiredConsent: ['underwriting'],
    allowedRoles: ['underwriter', 'branch_manager', 'head_office_ops', 'insurer_admin'],
    auditRequired: true,
  },
  {
    id: 'PURP-002',
    name: 'Claims Processing',
    description: 'Access customer data for claims processing and investigation',
    dataCategories: ['customer', 'policy', 'claim', 'medical', 'financial'],
    requiredConsent: ['claims_processing'],
    allowedRoles: ['claims_handler', 'loss_adjuster', 'branch_manager', 'insurer_admin'],
    auditRequired: true,
  },
  {
    id: 'PURP-003',
    name: 'Fraud Detection',
    description: 'Access data for fraud detection and investigation',
    dataCategories: ['customer', 'policy', 'claim', 'behavioral', 'transaction'],
    requiredConsent: ['fraud_detection'],
    allowedRoles: ['fraud_analyst', 'risk_manager', 'compliance_aml', 'insurer_admin'],
    auditRequired: true,
  },
  {
    id: 'PURP-004',
    name: 'Customer Service',
    description: 'Access customer data for customer service inquiries',
    dataCategories: ['customer', 'policy', 'claim'],
    requiredConsent: ['customer_service'],
    allowedRoles: ['call_center', 'branch_staff', 'branch_manager', 'insurer_admin'],
    timeRestrictions: {
      allowedHours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    },
    auditRequired: true,
  },
  {
    id: 'PURP-005',
    name: 'Regulatory Reporting',
    description: 'Access data for regulatory reporting and compliance',
    dataCategories: ['customer', 'policy', 'claim', 'financial', 'transaction'],
    requiredConsent: ['regulatory_reporting'],
    allowedRoles: ['compliance_aml', 'risk_manager', 'auditor', 'insurer_admin'],
    auditRequired: true,
  },
  {
    id: 'PURP-006',
    name: 'Analytics',
    description: 'Access data for analytics and reporting',
    dataCategories: ['policy', 'claim', 'behavioral', 'usage'],
    requiredConsent: ['analytics'],
    allowedRoles: ['risk_manager', 'head_office_ops', 'insurer_admin', 'auditor'],
    auditRequired: true,
  },
  {
    id: 'PURP-007',
    name: 'Marketing',
    description: 'Access customer data for marketing purposes',
    dataCategories: ['customer', 'contact'],
    requiredConsent: ['marketing'],
    allowedRoles: ['head_office_ops', 'insurer_admin'],
    auditRequired: true,
  },
];

/**
 * Purpose-Based Access Control Service
 */
export class PurposeBasedAccessControlService {
  /**
   * Get access purpose by ID
   */
  getPurpose(purposeId: string): AccessPurpose | undefined {
    return ACCESS_PURPOSES.find(purpose => purpose.id === purposeId);
  }

  /**
   * Check if user can access data for a specific purpose
   */
  canAccessForPurpose(params: {
    purposeId: string;
    userRoles: string[];
    customerId?: string;
    customerConsents?: ConsentPurpose[];
    currentTime?: Date;
    userLocation?: string;
  }): { allowed: boolean; reason?: string } {
    const purpose = this.getPurpose(params.purposeId);
    if (!purpose) {
      return { allowed: false, reason: 'Purpose not found' };
    }

    // Check role-based access
    const hasRequiredRole = purpose.allowedRoles.some(role => params.userRoles.includes(role));
    if (!hasRequiredRole) {
      return { allowed: false, reason: 'User does not have required role for this purpose' };
    }

    // Check consent requirements if customerId is provided
    if (params.customerId && params.customerConsents) {
      const hasRequiredConsent = purpose.requiredConsent.every(consent =>
        params.customerConsents!.includes(consent),
      );
      if (!hasRequiredConsent) {
        return { allowed: false, reason: 'Customer has not granted required consent' };
      }
    }

    // Check time restrictions
    if (purpose.timeRestrictions) {
      const currentTime = params.currentTime || new Date();
      const currentHour = currentTime.getHours();
      const currentDay = currentTime.getDay();

      if (purpose.timeRestrictions.allowedHours && !purpose.timeRestrictions.allowedHours.includes(currentHour)) {
        return { allowed: false, reason: 'Access not allowed at this time' };
      }

      if (purpose.timeRestrictions.allowedDays && !purpose.timeRestrictions.allowedDays.includes(currentDay)) {
        return { allowed: false, reason: 'Access not allowed on this day' };
      }
    }

    // Check location restrictions
    if (purpose.locationRestrictions && params.userLocation) {
      if (purpose.locationRestrictions.allowedLocations && 
          !purpose.locationRestrictions.allowedLocations.includes(params.userLocation)) {
        return { allowed: false, reason: 'Access not allowed from this location' };
      }

      if (purpose.locationRestrictions.blockedLocations && 
          purpose.locationRestrictions.blockedLocations.includes(params.userLocation)) {
        return { allowed: false, reason: 'Access blocked from this location' };
      }
    }

    return { allowed: true };
  }

  /**
   * Get purposes accessible to a user based on their roles
   */
  getAccessiblePurposes(userRoles: string[]): AccessPurpose[] {
    return ACCESS_PURPOSES.filter(purpose =>
      purpose.allowedRoles.some(role => userRoles.includes(role)),
    );
  }

  /**
   * Get data categories accessible for a purpose
   */
  getDataCategoriesForPurpose(purposeId: string): string[] {
    const purpose = this.getPurpose(purposeId);
    return purpose?.dataCategories || [];
  }

  /**
   * Check if audit logging is required for a purpose
   */
  isAuditRequired(purposeId: string): boolean {
    const purpose = this.getPurpose(purposeId);
    return purpose?.auditRequired || false;
  }
}

// Export singleton instance
export const purposeBasedAccessControlService = new PurposeBasedAccessControlService();
