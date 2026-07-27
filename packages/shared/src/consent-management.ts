/**
 * Consent Lifecycle Management
 * Manages user consent for data processing according to GDPR-like requirements
 */

import { DataSource, Repository } from 'typeorm';
import { ConsentRecordEntity } from './entities/ConsentRecordEntity';
import { v4 as uuidv4 } from 'uuid';

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
  tenantId?: string | null;
  purpose: ConsentPurpose;
  status: ConsentStatus;
  grantedAt?: Date | null;
  expiresAt?: Date | null;
  revokedAt?: Date | null;
  consentText: string;
  version: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any> | null;
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
  private repo?: Repository<ConsentRecordEntity>;
  private consentRecords: ConsentRecord[] = [];

  constructor(dataSource?: DataSource) {
    if (dataSource) {
      this.repo = dataSource.getRepository(ConsentRecordEntity);
    }
  }

  setDataSource(dataSource: DataSource): void {
    this.repo = dataSource.getRepository(ConsentRecordEntity);
  }

  /**
   * Get consent template by purpose
   */
  getTemplate(purpose: ConsentPurpose): ConsentTemplate | undefined {
    return CONSENT_TEMPLATES.find(template => template.purpose === purpose);
  }

  /**
   * Create a new consent record
   */
  async createConsent(params: {
    customerId: string;
    tenantId?: string;
    purpose: ConsentPurpose;
    status: ConsentStatus;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): Promise<ConsentRecord> {
    const template = this.getTemplate(params.purpose);
    if (!template) {
      throw new Error(`No consent template found for purpose: ${params.purpose}`);
    }

    const now = new Date();
    const id = uuidv4();
    const consentRecord: ConsentRecord = {
      id,
      customerId: params.customerId,
      tenantId: params.tenantId,
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
      const retentionDays = this.getRetentionDays(template.retentionPeriod);
      if (retentionDays > 0) {
        consentRecord.expiresAt = new Date(now);
        consentRecord.expiresAt.setDate(consentRecord.expiresAt.getDate() + retentionDays);
      }
    }

    if (this.repo) {
      const entity = this.repo.create(consentRecord);
      await this.repo.save(entity);
    } else {
      this.consentRecords.push(consentRecord);
    }

    return consentRecord;
  }

  /**
   * Get consent record for customer and purpose
   */
  async getConsent(customerId: string, purpose: ConsentPurpose): Promise<ConsentRecord | undefined> {
    if (this.repo) {
      const entity = await this.repo.findOne({
        where: { customerId, purpose },
        order: { createdAt: 'DESC' },
      });
      return entity ? this.toRecord(entity) : undefined;
    }

    return this.consentRecords
      .filter(record => record.customerId === customerId && record.purpose === purpose)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  }

  /**
   * Get all consents for a customer
   */
  async getCustomerConsents(customerId: string): Promise<ConsentRecord[]> {
    if (this.repo) {
      const entities = await this.repo.find({
        where: { customerId },
        order: { createdAt: 'DESC' },
      });
      return entities.map(e => this.toRecord(e));
    }

    return this.consentRecords
      .filter(record => record.customerId === customerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Check if customer has granted consent for a purpose
   */
  async hasConsent(customerId: string, purpose: ConsentPurpose): Promise<boolean> {
    const consent = await this.getConsent(customerId, purpose);

    if (!consent || consent.status !== 'granted') {
      return false;
    }

    if (consent.expiresAt && consent.expiresAt < new Date()) {
      return false;
    }

    if (consent.revokedAt) {
      return false;
    }

    return true;
  }

  /**
   * Revoke consent
   */
  async revokeConsent(customerId: string, purpose: ConsentPurpose): Promise<ConsentRecord | null> {
    const template = this.getTemplate(purpose);
    if (!template || !template.revocable) {
      throw new Error('This consent cannot be revoked');
    }

    if (this.repo) {
      const entity = await this.repo.findOne({
        where: { customerId, purpose, status: 'granted' },
        order: { createdAt: 'DESC' },
      });
      if (!entity) return null;
      entity.status = 'revoked';
      entity.revokedAt = new Date();
      entity.updatedAt = new Date();
      await this.repo.save(entity);
      return this.toRecord(entity);
    }

    const consent = await this.getConsent(customerId, purpose);
    if (!consent || consent.status !== 'granted') {
      return null;
    }

    consent.status = 'revoked';
    consent.revokedAt = new Date();
    consent.updatedAt = new Date();
    return consent;
  }

  /**
   * Renew consent (create new record with same purpose)
   */
  async renewConsent(customerId: string, purpose: ConsentPurpose, ipAddress?: string, userAgent?: string): Promise<ConsentRecord> {
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
  async checkExpiredConsents(): Promise<number> {
    const now = new Date();
    let expiredCount = 0;

    if (this.repo) {
      const granted = await this.repo.find({ where: { status: 'granted' } });
      for (const entity of granted) {
        if (entity.expiresAt && entity.expiresAt < now) {
          entity.status = 'expired';
          entity.updatedAt = now;
          await this.repo.save(entity);
          expiredCount++;
        }
      }
      return expiredCount;
    }

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
  async getConsentStats(): Promise<{
    total: number;
    byStatus: Record<ConsentStatus, number>;
    byPurpose: Record<ConsentPurpose, number>;
    expired: number;
  }> {
    const records = this.repo ? (await this.repo.find()).map(e => this.toRecord(e)) : this.consentRecords;

    const stats = {
      total: records.length,
      byStatus: {} as Record<ConsentStatus, number>,
      byPurpose: {} as Record<ConsentPurpose, number>,
      expired: 0,
    };

    for (const consent of records) {
      stats.byStatus[consent.status] = (stats.byStatus[consent.status] || 0) + 1;
      stats.byPurpose[consent.purpose] = (stats.byPurpose[consent.purpose] || 0) + 1;

      if (consent.status === 'expired' || (consent.expiresAt && consent.expiresAt < new Date())) {
        stats.expired++;
      }
    }

    return stats;
  }

  private toRecord(entity: ConsentRecordEntity): ConsentRecord {
    return { ...entity };
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
