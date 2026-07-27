/**
 * Consent Lifecycle Management
 * Manages user consent for data processing according to GDPR-like requirements
 */

export type ConsentStatus = 'pending' | 'granted' | 'denied' | 'expired' | 'revoked';

export type ConsentPurpose = 
  | 'underwriting'
  | 'claims_processing'
  | 'fraud_detection'
  | 'marketing'
  | 'analytics'
  | 'regulatory_reporting'
  | 'customer_service'
  | 'third_party_sharing';

export interface ConsentRecord {
  id: string;
  customerId: string;
  purpose: ConsentPurpose;
  status: ConsentStatus;
  grantedAt?: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  consentText: string;
  version: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsentTemplate {
  id: string;
  purpose: ConsentPurpose;
  title: string;
  description: string;
  consentText: string;
  version: string;
  lawfulBasis: string;
  dataCategories: string[];
  retentionPeriod: string;
  thirdPartySharing: boolean;
  revocable: boolean;
  effectiveDate: Date;
}

/**
 * Predefined consent templates
 */
export const CONSENT_TEMPLATES: ConsentTemplate[] = [
  {
    id: 'CONSENT-001',
    purpose: 'underwriting',
    title: 'Consent for Underwriting',
    description: 'Consent to process personal data for insurance underwriting',
    consentText: 'I consent to the processing of my personal data for the purpose of insurance underwriting, including risk assessment and policy issuance.',
    version: '1.0',
    lawfulBasis: 'contract',
    dataCategories: ['personal', 'financial', 'vehicle'],
    retentionPeriod: '7_years',
    thirdPartySharing: false,
    revocable: true,
    effectiveDate: new Date('2025-01-01'),
  },
  {
    id: 'CONSENT-002',
    purpose: 'claims_processing',
    title: 'Consent for Claims Processing',
    description: 'Consent to process personal data for claims processing',
    consentText: 'I consent to the processing of my personal data for the purpose of claims processing, including investigation, assessment, and payment.',
    version: '1.0',
    lawfulBasis: 'contract',
    dataCategories: ['personal', 'financial', 'medical'],
    retentionPeriod: '10_years',
    thirdPartySharing: true,
    revocable: true,
    effectiveDate: new Date('2025-01-01'),
  },
  {
    id: 'CONSENT-003',
    purpose: 'fraud_detection',
    title: 'Consent for Fraud Detection',
    description: 'Consent to process personal data for fraud detection and prevention',
    consentText: 'I consent to the processing of my personal data for fraud detection and prevention purposes.',
    version: '1.0',
    lawfulBasis: 'legitimate_interest',
    dataCategories: ['personal', 'behavioral'],
    retentionPeriod: '3_years',
    thirdPartySharing: false,
    revocable: true,
    effectiveDate: new Date('2025-01-01'),
  },
  {
    id: 'CONSENT-004',
    purpose: 'marketing',
    title: 'Consent for Marketing Communications',
    description: 'Consent to receive marketing communications',
    consentText: 'I consent to receive marketing communications about products and services that may be of interest to me.',
    version: '1.0',
    lawfulBasis: 'consent',
    dataCategories: ['contact'],
    retentionPeriod: '2_years',
    thirdPartySharing: false,
    revocable: true,
    effectiveDate: new Date('2025-01-01'),
  },
  {
    id: 'CONSENT-005',
    purpose: 'analytics',
    title: 'Consent for Analytics',
    description: 'Consent to process personal data for analytics and improvement',
    consentText: 'I consent to the processing of my personal data for analytics and service improvement purposes.',
    version: '1.0',
    lawfulBasis: 'legitimate_interest',
    dataCategories: ['behavioral', 'usage'],
    retentionPeriod: '1_year',
    thirdPartySharing: false,
    revocable: true,
    effectiveDate: new Date('2025-01-01'),
  },
];

/**
 * Consent Management Service
 */
export class ConsentManagementService {
  private consentRecords: ConsentRecord[] = [];

  /**
   * Get consent template by purpose
   */
  getTemplate(purpose: ConsentPurpose): ConsentTemplate | undefined {
    return CONSENT_TEMPLATES.find(template => template.purpose === purpose);
  }

  /**
   * Create a new consent record
   */
  createConsent(params: {
    customerId: string;
    purpose: ConsentPurpose;
    status: ConsentStatus;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): ConsentRecord {
    const template = this.getTemplate(params.purpose);
    if (!template) {
      throw new Error(`No consent template found for purpose: ${params.purpose}`);
    }

    const now = new Date();
    const consentRecord: ConsentRecord = {
      id: `CONSENT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      customerId: params.customerId,
      purpose: params.purpose,
      status: params.status,
      consentText: template.consentText,
      version: template.version,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata,
      createdAt: now,
      updatedAt: now,
    };

    if (params.status === 'granted') {
      consentRecord.grantedAt = now;
      // Set expiration based on retention period
      const retentionDays = this.getRetentionDays(template.retentionPeriod);
      if (retentionDays > 0) {
        consentRecord.expiresAt = new Date(now);
        consentRecord.expiresAt.setDate(consentRecord.expiresAt.getDate() + retentionDays);
      }
    }

    this.consentRecords.push(consentRecord);
    return consentRecord;
  }

  /**
   * Get consent record for customer and purpose
   */
  getConsent(customerId: string, purpose: ConsentPurpose): ConsentRecord | undefined {
    return this.consentRecords
      .filter(record => record.customerId === customerId && record.purpose === purpose)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  }

  /**
   * Get all consents for a customer
   */
  getCustomerConsents(customerId: string): ConsentRecord[] {
    return this.consentRecords
      .filter(record => record.customerId === customerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Check if customer has granted consent for a purpose
   */
  hasConsent(customerId: string, purpose: ConsentPurpose): boolean {
    const consent = this.getConsent(customerId, purpose);
    
    if (!consent || consent.status !== 'granted') {
      return false;
    }

    // Check if consent has expired
    if (consent.expiresAt && consent.expiresAt < new Date()) {
      return false;
    }

    // Check if consent has been revoked
    if (consent.revokedAt) {
      return false;
    }

    return true;
  }

  /**
   * Revoke consent
   */
  revokeConsent(customerId: string, purpose: ConsentPurpose): ConsentRecord | null {
    const consent = this.getConsent(customerId, purpose);
    
    if (!consent || consent.status !== 'granted') {
      return null;
    }

    const template = this.getTemplate(purpose);
    if (!template || !template.revocable) {
      throw new Error('This consent cannot be revoked');
    }

    consent.status = 'revoked';
    consent.revokedAt = new Date();
    consent.updatedAt = new Date();

    return consent;
  }

  /**
   * Renew consent (create new record with same purpose)
   */
  renewConsent(customerId: string, purpose: ConsentPurpose, ipAddress?: string, userAgent?: string): ConsentRecord {
    const template = this.getTemplate(purpose);
    if (!template) {
      throw new Error(`No consent template found for purpose: ${purpose}`);
    }

    return this.createConsent({
      customerId,
      purpose,
      status: 'granted',
      ipAddress,
      userAgent,
    });
  }

  /**
   * Check for expired consents and update their status
   */
  checkExpiredConsents(): number {
    const now = new Date();
    let expiredCount = 0;

    for (const consent of this.consentRecords) {
      if (consent.status === 'granted' && consent.expiresAt && consent.expiresAt < now) {
        consent.status = 'expired';
        consent.updatedAt = now;
        expiredCount++;
      }
    }

    return expiredCount;
  }

  /**
   * Get consent statistics
   */
  getConsentStats(): {
    total: number;
    byStatus: Record<ConsentStatus, number>;
    byPurpose: Record<ConsentPurpose, number>;
    expired: number;
  } {
    const stats = {
      total: this.consentRecords.length,
      byStatus: {} as Record<ConsentStatus, number>,
      byPurpose: {} as Record<ConsentPurpose, number>,
      expired: 0,
    };

    for (const consent of this.consentRecords) {
      stats.byStatus[consent.status] = (stats.byStatus[consent.status] || 0) + 1;
      stats.byPurpose[consent.purpose] = (stats.byPurpose[consent.purpose] || 0) + 1;
      
      if (consent.status === 'expired' || (consent.expiresAt && consent.expiresAt < new Date())) {
        stats.expired++;
      }
    }

    return stats;
  }

  /**
   * Get retention days from period string
   */
  private getRetentionDays(period: string): number {
    const periodMap: Record<string, number> = {
      '1_year': 365,
      '2_years': 730,
      '3_years': 1095,
      '7_years': 2555,
      '10_years': 3650,
    };
    return periodMap[period] || 365;
  }
}

// Export singleton instance
export const consentManagementService = new ConsentManagementService();
