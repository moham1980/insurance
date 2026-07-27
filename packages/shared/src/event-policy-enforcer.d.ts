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
    [eventType: string]: number;
}
export interface DlqPolicy {
    [eventType: string]: {
        enabled: boolean;
        maxRetryAttempts: number;
        backoffMs: number;
    };
}
/**
 * Validate event naming convention
 * Format: insurance.<domain>.<action>
 */
export declare function validateEventNaming(eventType: string): {
    valid: boolean;
    error?: string;
};
/**
 * Get retention policy for an event type
 */
export declare function getRetentionPolicy(eventType: string): number;
/**
 * Get DLQ policy for an event type
 */
export declare function getDlqPolicy(eventType: string): {
    enabled: boolean;
    maxRetryAttempts: number;
    backoffMs: number;
};
/**
 * Validate event against platform policies
 */
export declare function validateEventPolicy(eventType: string, metadata?: any): {
    valid: boolean;
    errors: string[];
    warnings: string[];
};
/**
 * Enforce event policy before publishing
 * Throws an error if validation fails
 */
export declare function enforceEventPolicy(eventType: string, metadata?: any): void;
/**
 * Calculate retention deadline for an event
 */
export declare function calculateRetentionDeadline(eventType: string, occurredAt: Date): Date;
/**
 * Check if an event should be archived based on retention policy
 */
export declare function shouldArchiveEvent(eventType: string, occurredAt: Date): boolean;
/**
 * Check if an event should be purged based on retention policy
 */
export declare function shouldPurgeEvent(eventType: string, occurredAt: Date): boolean;
/**
 * Get all registered event types
 */
export declare function getRegisteredEventTypes(): string[];
/**
 * Add custom retention policy for an event type
 */
export declare function addRetentionPolicy(eventType: string, retentionDays: number): void;
/**
 * Add custom DLQ policy for an event type
 */
export declare function addDlqPolicy(eventType: string, enabled: boolean, maxRetryAttempts: number, backoffMs: number): void;
