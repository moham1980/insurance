/**
 * GDPR and Privacy Compliance utilities
 * Provides data anonymization, right-to-erasure, and data portability
 */
export interface AnonymizationConfig {
    /** Fields to hash/one-way anonymize */
    hashFields?: string[];
    /** Fields to mask partially */
    maskFields?: string[];
    /** Fields to remove completely */
    removeFields?: string[];
    /** Fields to replace with placeholder */
    placeholderFields?: Record<string, string>;
    /** Fields to generalize (e.g., age instead of birth date) */
    generalizeFields?: string[];
}
export interface ConsentRecord {
    partyId: string;
    purpose: string;
    granted: boolean;
    grantedAt: string;
    expiresAt?: string;
    revokedAt?: string;
    version: string;
    metadata?: Record<string, any>;
}
export interface DataSubjectRequest {
    partyId: string;
    requestType: 'access' | 'erasure' | 'portability' | 'rectification' | 'restriction';
    requestedAt: string;
    status: 'pending' | 'in_progress' | 'completed' | 'rejected';
    correlationId: string;
    metadata?: Record<string, any>;
}
/**
 * One-way hash for anonymization (using SHA-256)
 * Note: In production, use a keyed hash (HMAC) with a secret key
 */
export declare function anonymizeHash(value: string): string;
/**
 * Mask a value partially (e.g., phone number, email)
 */
export declare function maskPartial(value: string, visibleStart?: number, visibleEnd?: number): string;
/**
 * Generalize a date to just year and month
 */
export declare function generalizeDate(dateString: string): string;
/**
 * Anonymize an object according to config
 */
export declare function anonymizeObject<T extends Record<string, any>>(data: T, config: AnonymizationConfig): T;
/**
 * Standard anonymization config for Party data (GDPR compliant)
 */
export declare const PARTY_ANONYMIZATION_CONFIG: AnonymizationConfig;
/**
 * Check if a consent is valid (granted and not expired or revoked)
 */
export declare function isConsentValid(consent: ConsentRecord): boolean;
/**
 * Create a data subject access request record
 */
export declare function createDataSubjectRequest(partyId: string, requestType: DataSubjectRequest['requestType'], correlationId: string): DataSubjectRequest;
/**
 * Validate that a data processing operation has consent
 */
export declare function validateConsent(consent: ConsentRecord | null, purpose: string): {
    valid: boolean;
    reason?: string;
};
/**
 * Generate a data portability JSON export (GDPR Article 20)
 */
export declare function generateDataExport<T extends Record<string, any>>(data: T[], entityType: string, partyId: string): {
    exportId: string;
    generatedAt: string;
    entityType: string;
    partyId: string;
    recordCount: number;
    data: T[];
};
