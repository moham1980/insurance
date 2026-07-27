/**
 * Event Policy Enforcer
 * Enforces naming conventions and retention/DLQ policies at platform level
 */

export interface EventPolicyConfig {
  eventType: string;
  retentionDays?: number;
  dlqEnabled?: boolean;
  requiresCorrelationId?: boolean;
  requiresTenantId?: boolean;
}

export interface RetentionPolicy {
  [eventType: string]: number; // retention in days
}

export interface DlqPolicy {
  [eventType: string]: {
    enabled: boolean;
    maxRetryAttempts: number;
    backoffMs: number;
  };
}

// Default retention policies (in days)
const DEFAULT_RETENTION_POLICIES: RetentionPolicy = {
  // Policy domain events - 7 years
  'insurance.policy.issued': 2555,
  'insurance.policy.unique_code_set': 2555,
  'insurance.policy.underwriting_decided': 2555,
  'insurance.policy.change_recorded': 2555,
  'insurance.policy.renewed': 2555,
  'insurance.policy.cancelled': 2555,
  'insurance.policy.endorsed': 2555,
  
  // Claims domain events - 10 years
  'insurance.claim.registered': 3650,
  'insurance.claim.assessed': 3650,
  'insurance.claim.approved': 3650,
  'insurance.claim.rejected': 3650,
  'insurance.claim.paid': 3650,
  'insurance.claim.closed': 3650,
  'insurance.claim.documents_attached': 3650,
  
  // Payments domain events - 7 years
  'insurance.payment.prepared': 2555,
  'insurance.payment.approved': 2555,
  'insurance.payment.executed': 2555,
  'insurance.payment.notified': 2555,
  'insurance.payment.failed': 2555,
  
  // Fraud domain events - 10 years
  'insurance.fraud.score_computed': 3650,
  'insurance.fraud.case_escalated': 3650,
  'insurance.fraud.case_cleared': 3650,
  'insurance.fraud.case_confirmed': 3650,
  
  // Complaints domain events - 10 years
  'insurance.complaint.created': 3650,
  'insurance.complaint.status_updated': 3650,
  'insurance.complaint.sla_breached': 3650,
  'insurance.complaint.escalated': 3650,
  'insurance.complaint.resolved': 3650,
  'insurance.complaint.document_attached': 3650,
  'insurance.complaint.mobile_otp_requested': 3650,
  'insurance.complaint.mobile_verified': 3650,
  
  // Reinsurance domain events - 10 years
  'insurance.reinsurance.ceded_calculated': 3650,
  'insurance.reinsurance.borderaux_generated': 3650,
  'insurance.reinsurance.recovery_identified': 3650,
  'insurance.reinsurance.recovery_received': 3650,
  
  // Collections domain events - 7 years
  'insurance.collections.plan_created': 2555,
  'insurance.collections.installment_paid': 2555,
  
  // AML domain events - 10 years
  'insurance.aml.alert_created': 3650,
  'insurance.aml.alert_escalated': 3650,
  'insurance.aml.alert_cleared': 3650,
  
  // Other events - 5 years
  'default': 1825,
};

// Default DLQ policies
const DEFAULT_DLQ_POLICIES: DlqPolicy = {
  // Critical events - DLQ enabled with high retry
  'insurance.payment.executed': {
    enabled: true,
    maxRetryAttempts: 5,
    backoffMs: 1000,
  },
  'insurance.claim.paid': {
    enabled: true,
    maxRetryAttempts: 5,
    backoffMs: 1000,
  },
  'insurance.policy.issued': {
    enabled: true,
    maxRetryAttempts: 5,
    backoffMs: 1000,
  },
  
  // Non-critical events - DLQ enabled with low retry
  'insurance.notification.sent': {
    enabled: true,
    maxRetryAttempts: 3,
    backoffMs: 500,
  },
  'insurance.reporting.snapshot_created': {
    enabled: true,
    maxRetryAttempts: 3,
    backoffMs: 500,
  },
  
  // Default policy
  'default': {
    enabled: true,
    maxRetryAttempts: 3,
    backoffMs: 500,
  },
};

/**
 * Validate event naming convention
 * Format: insurance.<domain>.<action>
 */
export function validateEventNaming(eventType: string): { valid: boolean; error?: string } {
  if (!eventType || typeof eventType !== 'string') {
    return { valid: false, error: 'Event type must be a non-empty string' };
  }
  
  const pattern = /^insurance\.[a-z_]+\.[a-z_]+$/;
  if (!pattern.test(eventType)) {
    return {
      valid: false,
      error: `Event type "${eventType}" does not follow naming convention "insurance.<domain>.<action>"`,
    };
  }
  
  return { valid: true };
}

/**
 * Get retention policy for an event type
 */
export function getRetentionPolicy(eventType: string): number {
  return DEFAULT_RETENTION_POLICIES[eventType] || DEFAULT_RETENTION_POLICIES['default'] || 1825;
}

/**
 * Get DLQ policy for an event type
 */
export function getDlqPolicy(eventType: string) {
  return DEFAULT_DLQ_POLICIES[eventType] || DEFAULT_DLQ_POLICIES['default'] || {
    enabled: true,
    maxRetryAttempts: 3,
    backoffMs: 500,
  };
}

/**
 * Validate event against platform policies
 */
export function validateEventPolicy(eventType: string, metadata?: any): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate naming convention
  const namingValidation = validateEventNaming(eventType);
  if (!namingValidation.valid) {
    errors.push(namingValidation.error || 'Invalid event naming');
  }
  
  // Check if event type has a defined retention policy
  if (!DEFAULT_RETENTION_POLICIES[eventType]) {
    warnings.push(`Event type "${eventType}" uses default retention policy (${DEFAULT_RETENTION_POLICIES['default']} days)`);
  }
  
  // Check if event type has a defined DLQ policy
  if (!DEFAULT_DLQ_POLICIES[eventType]) {
    warnings.push(`Event type "${eventType}" uses default DLQ policy`);
  }
  
  // Validate required fields
  if (metadata) {
    if (!metadata.correlationId) {
      warnings.push(`Event "${eventType}" should include correlationId for traceability`);
    }
    if (!metadata.tenantId) {
      warnings.push(`Event "${eventType}" should include tenantId for multi-tenancy`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Enforce event policy before publishing
 * Throws an error if validation fails
 */
export function enforceEventPolicy(eventType: string, metadata?: any): void {
  const validation = validateEventPolicy(eventType, metadata);
  
  if (!validation.valid) {
    throw new Error(`Event policy validation failed for "${eventType}": ${validation.errors.join(', ')}`);
  }
  
  // Log warnings if any
  if (validation.warnings.length > 0) {
    console.warn(`[EventPolicy] Warnings for "${eventType}":`, validation.warnings);
  }
}

/**
 * Calculate retention deadline for an event
 */
export function calculateRetentionDeadline(eventType: string, occurredAt: Date): Date {
  const retentionDays = getRetentionPolicy(eventType);
  const deadline = new Date(occurredAt);
  deadline.setDate(deadline.getDate() + retentionDays);
  return deadline;
}

/**
 * Check if an event should be archived based on retention policy
 */
export function shouldArchiveEvent(eventType: string, occurredAt: Date): boolean {
  const retentionDays = getRetentionPolicy(eventType);
  const archiveAfterDays = Math.floor(retentionDays * 0.5); // Archive after 50% of retention period
  const archiveDeadline = new Date(occurredAt);
  archiveDeadline.setDate(archiveDeadline.getDate() + archiveAfterDays);
  
  return new Date() > archiveDeadline;
}

/**
 * Check if an event should be purged based on retention policy
 */
export function shouldPurgeEvent(eventType: string, occurredAt: Date): boolean {
  const retentionDays = getRetentionPolicy(eventType);
  const purgeDeadline = new Date(occurredAt);
  purgeDeadline.setDate(purgeDeadline.getDate() + retentionDays);
  
  return new Date() > purgeDeadline;
}

/**
 * Get all registered event types
 */
export function getRegisteredEventTypes(): string[] {
  return Object.keys(DEFAULT_RETENTION_POLICIES).filter(key => key !== 'default');
}

/**
 * Add custom retention policy for an event type
 */
export function addRetentionPolicy(eventType: string, retentionDays: number): void {
  if (retentionDays < 0) {
    throw new Error('Retention days must be non-negative');
  }
  DEFAULT_RETENTION_POLICIES[eventType] = retentionDays;
}

/**
 * Add custom DLQ policy for an event type
 */
export function addDlqPolicy(
  eventType: string,
  enabled: boolean,
  maxRetryAttempts: number,
  backoffMs: number,
): void {
  DEFAULT_DLQ_POLICIES[eventType] = {
    enabled,
    maxRetryAttempts,
    backoffMs,
  };
}
