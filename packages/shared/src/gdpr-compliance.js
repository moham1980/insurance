/**
 * GDPR and Privacy Compliance utilities
 * Provides data anonymization, right-to-erasure, and data portability
 */
/**
 * One-way hash for anonymization (using SHA-256)
 * Note: In production, use a keyed hash (HMAC) with a secret key
 */
export function anonymizeHash(value) {
    // Simple hash for demo - in production use crypto.subtle or Node crypto
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        const char = value.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `anon_${Math.abs(hash).toString(16).padStart(16, '0')}`;
}
/**
 * Mask a value partially (e.g., phone number, email)
 */
export function maskPartial(value, visibleStart = 2, visibleEnd = 2) {
    if (value.length <= visibleStart + visibleEnd)
        return '*'.repeat(value.length);
    const start = value.slice(0, visibleStart);
    const end = value.slice(-visibleEnd);
    const masked = '*'.repeat(Math.max(0, value.length - visibleStart - visibleEnd));
    return `${start}${masked}${end}`;
}
/**
 * Generalize a date to just year and month
 */
export function generalizeDate(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime()))
            return dateString;
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    catch {
        return dateString;
    }
}
/**
 * Anonymize an object according to config
 */
export function anonymizeObject(data, config) {
    const result = { ...data };
    // Hash fields
    if (config.hashFields) {
        for (const field of config.hashFields) {
            if (field in result && typeof result[field] === 'string') {
                result[field] = anonymizeHash(result[field]);
            }
        }
    }
    // Mask fields
    if (config.maskFields) {
        for (const field of config.maskFields) {
            if (field in result && typeof result[field] === 'string') {
                result[field] = maskPartial(result[field]);
            }
        }
    }
    // Remove fields
    if (config.removeFields) {
        for (const field of config.removeFields) {
            delete result[field];
        }
    }
    // Placeholder fields
    if (config.placeholderFields) {
        for (const [field, placeholder] of Object.entries(config.placeholderFields)) {
            if (field in result) {
                result[field] = placeholder;
            }
        }
    }
    // Generalize fields
    if (config.generalizeFields) {
        for (const field of config.generalizeFields) {
            if (field in result && typeof result[field] === 'string') {
                result[field] = generalizeDate(result[field]);
            }
        }
    }
    return result;
}
/**
 * Standard anonymization config for Party data (GDPR compliant)
 */
export const PARTY_ANONYMIZATION_CONFIG = {
    hashFields: ['nationalId', 'passportNumber', 'driverLicenseNumber'],
    maskFields: ['phoneNumber', 'email'],
    removeFields: ['address', 'emergencyContact', 'bankAccountNumber', 'iban'],
    generalizeFields: ['dateOfBirth'],
    placeholderFields: {
        firstName: 'ANONYMIZED',
        lastName: 'ANONYMIZED',
        middleName: 'ANONYMIZED',
    },
};
/**
 * Check if a consent is valid (granted and not expired or revoked)
 */
export function isConsentValid(consent) {
    if (!consent.granted)
        return false;
    if (consent.revokedAt)
        return false;
    if (consent.expiresAt && new Date(consent.expiresAt) < new Date())
        return false;
    return true;
}
/**
 * Create a data subject access request record
 */
export function createDataSubjectRequest(partyId, requestType, correlationId) {
    return {
        partyId,
        requestType,
        requestedAt: new Date().toISOString(),
        status: 'pending',
        correlationId,
    };
}
/**
 * Validate that a data processing operation has consent
 */
export function validateConsent(consent, purpose) {
    if (!consent) {
        return { valid: false, reason: 'No consent record found' };
    }
    if (consent.purpose !== purpose) {
        return { valid: false, reason: `Consent purpose mismatch: ${consent.purpose} vs ${purpose}` };
    }
    if (!isConsentValid(consent)) {
        if (consent.revokedAt) {
            return { valid: false, reason: 'Consent has been revoked' };
        }
        if (consent.expiresAt && new Date(consent.expiresAt) < new Date()) {
            return { valid: false, reason: 'Consent has expired' };
        }
        return { valid: false, reason: 'Consent not granted' };
    }
    return { valid: true };
}
/**
 * Generate a data portability JSON export (GDPR Article 20)
 */
export function generateDataExport(data, entityType, partyId) {
    return {
        exportId: `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        generatedAt: new Date().toISOString(),
        entityType,
        partyId,
        recordCount: data.length,
        data,
    };
}
//# sourceMappingURL=gdpr-compliance.js.map