import { z } from 'zod';
export declare const ClaimDocumentsAttachedSubjectV1: z.ZodObject<{
    claimId: z.ZodString;
    documentIds: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    claimId?: string;
    documentIds?: string;
}, {
    claimId?: string;
    documentIds?: string;
}>;
export declare const ClaimDocumentsAttachedPayloadV1: z.ZodObject<{
    documents: z.ZodArray<z.ZodObject<{
        documentId: z.ZodString;
        type: z.ZodString;
        source: z.ZodEnum<["upload", "link"]>;
        storageRef: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        type?: string;
        documentId?: string;
        source?: "link" | "upload";
        storageRef?: string;
    }, {
        type?: string;
        documentId?: string;
        source?: "link" | "upload";
        storageRef?: string;
    }>, "many">;
}, "strict", z.ZodTypeAny, {
    documents?: {
        type?: string;
        documentId?: string;
        source?: "link" | "upload";
        storageRef?: string;
    }[];
}, {
    documents?: {
        type?: string;
        documentId?: string;
        source?: "link" | "upload";
        storageRef?: string;
    }[];
}>;
export declare const ClaimDocumentsAttachedEnvelopeV1: z.ZodObject<{
    eventId: z.ZodString;
    occurredAt: z.ZodString;
    producer: z.ZodString;
    correlationId: z.ZodString;
    tenantId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    traceparent: z.ZodOptional<z.ZodString>;
} & {
    eventType: z.ZodLiteral<string>;
    eventVersion: z.ZodLiteral<number>;
    subject: z.ZodObject<{
        claimId: z.ZodString;
        documentIds: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        claimId?: string;
        documentIds?: string;
    }, {
        claimId?: string;
        documentIds?: string;
    }>;
    payload: z.ZodObject<{
        documents: z.ZodArray<z.ZodObject<{
            documentId: z.ZodString;
            type: z.ZodString;
            source: z.ZodEnum<["upload", "link"]>;
            storageRef: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            type?: string;
            documentId?: string;
            source?: "link" | "upload";
            storageRef?: string;
        }, {
            type?: string;
            documentId?: string;
            source?: "link" | "upload";
            storageRef?: string;
        }>, "many">;
    }, "strict", z.ZodTypeAny, {
        documents?: {
            type?: string;
            documentId?: string;
            source?: "link" | "upload";
            storageRef?: string;
        }[];
    }, {
        documents?: {
            type?: string;
            documentId?: string;
            source?: "link" | "upload";
            storageRef?: string;
        }[];
    }>;
}, "strict", z.ZodTypeAny, {
    eventType?: string;
    occurredAt?: string;
    correlationId?: string;
    eventVersion?: number;
    eventId?: string;
    producer?: string;
    traceparent?: string;
    subject?: {
        claimId?: string;
        documentIds?: string;
    };
    tenantId?: string;
    idempotencyKey?: string;
    causationId?: string;
    payload?: {
        documents?: {
            type?: string;
            documentId?: string;
            source?: "link" | "upload";
            storageRef?: string;
        }[];
    };
}, {
    eventType?: string;
    occurredAt?: string;
    correlationId?: string;
    eventVersion?: number;
    eventId?: string;
    producer?: string;
    traceparent?: string;
    subject?: {
        claimId?: string;
        documentIds?: string;
    };
    tenantId?: string;
    idempotencyKey?: string;
    causationId?: string;
    payload?: {
        documents?: {
            type?: string;
            documentId?: string;
            source?: "link" | "upload";
            storageRef?: string;
        }[];
    };
}>;
export declare const RecoveryIdentifiedSubjectV1: z.ZodObject<{
    claimId: z.ZodString;
    contractId: z.ZodString;
    recoveryId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    claimId?: string;
    contractId?: string;
    recoveryId?: string;
}, {
    claimId?: string;
    contractId?: string;
    recoveryId?: string;
}>;
export declare const RecoveryIdentifiedPayloadV1: z.ZodObject<{
    recoverableAmount: z.ZodNumber;
    currency: z.ZodString;
    counterpartyId: z.ZodOptional<z.ZodString>;
    identifiedAt: z.ZodString;
}, "strict", z.ZodTypeAny, {
    recoverableAmount?: number;
    currency?: string;
    counterpartyId?: string;
    identifiedAt?: string;
}, {
    recoverableAmount?: number;
    currency?: string;
    counterpartyId?: string;
    identifiedAt?: string;
}>;
export declare const RecoveryIdentifiedEnvelopeV1: z.ZodObject<{
    eventId: z.ZodString;
    occurredAt: z.ZodString;
    producer: z.ZodString;
    correlationId: z.ZodString;
    tenantId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    traceparent: z.ZodOptional<z.ZodString>;
} & {
    eventType: z.ZodLiteral<string>;
    eventVersion: z.ZodLiteral<number>;
    subject: z.ZodObject<{
        claimId: z.ZodString;
        contractId: z.ZodString;
        recoveryId: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        claimId?: string;
        contractId?: string;
        recoveryId?: string;
    }, {
        claimId?: string;
        contractId?: string;
        recoveryId?: string;
    }>;
    payload: z.ZodObject<{
        recoverableAmount: z.ZodNumber;
        currency: z.ZodString;
        counterpartyId: z.ZodOptional<z.ZodString>;
        identifiedAt: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        recoverableAmount?: number;
        currency?: string;
        counterpartyId?: string;
        identifiedAt?: string;
    }, {
        recoverableAmount?: number;
        currency?: string;
        counterpartyId?: string;
        identifiedAt?: string;
    }>;
}, "strict", z.ZodTypeAny, {
    eventType?: string;
    occurredAt?: string;
    correlationId?: string;
    eventVersion?: number;
    eventId?: string;
    producer?: string;
    traceparent?: string;
    subject?: {
        claimId?: string;
        contractId?: string;
        recoveryId?: string;
    };
    tenantId?: string;
    idempotencyKey?: string;
    causationId?: string;
    payload?: {
        recoverableAmount?: number;
        currency?: string;
        counterpartyId?: string;
        identifiedAt?: string;
    };
}, {
    eventType?: string;
    occurredAt?: string;
    correlationId?: string;
    eventVersion?: number;
    eventId?: string;
    producer?: string;
    traceparent?: string;
    subject?: {
        claimId?: string;
        contractId?: string;
        recoveryId?: string;
    };
    tenantId?: string;
    idempotencyKey?: string;
    causationId?: string;
    payload?: {
        recoverableAmount?: number;
        currency?: string;
        counterpartyId?: string;
        identifiedAt?: string;
    };
}>;
export declare const RecoveryReceivedSubjectV1: z.ZodObject<{
    recoveryId: z.ZodString;
    claimId: z.ZodString;
    contractId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    claimId?: string;
    contractId?: string;
    recoveryId?: string;
}, {
    claimId?: string;
    contractId?: string;
    recoveryId?: string;
}>;
export declare const RecoveryReceivedPayloadV1: z.ZodObject<{
    receivedAt: z.ZodString;
    amount: z.ZodNumber;
    currency: z.ZodString;
    referenceNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    currency?: string;
    receivedAt?: string;
    amount?: number;
    referenceNumber?: string;
}, {
    currency?: string;
    receivedAt?: string;
    amount?: number;
    referenceNumber?: string;
}>;
export declare const RecoveryReceivedEnvelopeV1: z.ZodObject<{
    eventId: z.ZodString;
    occurredAt: z.ZodString;
    producer: z.ZodString;
    correlationId: z.ZodString;
    tenantId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    traceparent: z.ZodOptional<z.ZodString>;
} & {
    eventType: z.ZodLiteral<string>;
    eventVersion: z.ZodLiteral<number>;
    subject: z.ZodObject<{
        recoveryId: z.ZodString;
        claimId: z.ZodString;
        contractId: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        claimId?: string;
        contractId?: string;
        recoveryId?: string;
    }, {
        claimId?: string;
        contractId?: string;
        recoveryId?: string;
    }>;
    payload: z.ZodObject<{
        receivedAt: z.ZodString;
        amount: z.ZodNumber;
        currency: z.ZodString;
        referenceNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strict", z.ZodTypeAny, {
        currency?: string;
        receivedAt?: string;
        amount?: number;
        referenceNumber?: string;
    }, {
        currency?: string;
        receivedAt?: string;
        amount?: number;
        referenceNumber?: string;
    }>;
}, "strict", z.ZodTypeAny, {
    eventType?: string;
    occurredAt?: string;
    correlationId?: string;
    eventVersion?: number;
    eventId?: string;
    producer?: string;
    traceparent?: string;
    subject?: {
        claimId?: string;
        contractId?: string;
        recoveryId?: string;
    };
    tenantId?: string;
    idempotencyKey?: string;
    causationId?: string;
    payload?: {
        currency?: string;
        receivedAt?: string;
        amount?: number;
        referenceNumber?: string;
    };
}, {
    eventType?: string;
    occurredAt?: string;
    correlationId?: string;
    eventVersion?: number;
    eventId?: string;
    producer?: string;
    traceparent?: string;
    subject?: {
        claimId?: string;
        contractId?: string;
        recoveryId?: string;
    };
    tenantId?: string;
    idempotencyKey?: string;
    causationId?: string;
    payload?: {
        currency?: string;
        receivedAt?: string;
        amount?: number;
        referenceNumber?: string;
    };
}>;
export declare const CededCalculatedSubjectV1: z.ZodObject<{
    contractId: z.ZodString;
    policyId: z.ZodOptional<z.ZodString>;
    claimId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    policyId?: string;
    claimId?: string;
    contractId?: string;
}, {
    policyId?: string;
    claimId?: string;
    contractId?: string;
}>;
export declare const CededCalculatedPayloadV1: z.ZodObject<{
    calculationBasis: z.ZodEnum<["policy", "claim"]>;
    grossAmount: z.ZodNumber;
    cededAmount: z.ZodNumber;
    retainedAmount: z.ZodNumber;
    currency: z.ZodString;
    layerRef: z.ZodOptional<z.ZodObject<{
        layerId: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        layerId?: string;
    }, {
        layerId?: string;
    }>>;
    counterpartyId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    currency?: string;
    counterpartyId?: string;
    calculationBasis?: "policy" | "claim";
    grossAmount?: number;
    cededAmount?: number;
    retainedAmount?: number;
    layerRef?: {
        layerId?: string;
    };
}, {
    currency?: string;
    counterpartyId?: string;
    calculationBasis?: "policy" | "claim";
    grossAmount?: number;
    cededAmount?: number;
    retainedAmount?: number;
    layerRef?: {
        layerId?: string;
    };
}>;
export declare const CededCalculatedEnvelopeV1: z.ZodObject<{
    eventId: z.ZodString;
    occurredAt: z.ZodString;
    producer: z.ZodString;
    correlationId: z.ZodString;
    tenantId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    traceparent: z.ZodOptional<z.ZodString>;
} & {
    eventType: z.ZodLiteral<string>;
    eventVersion: z.ZodLiteral<number>;
    subject: z.ZodObject<{
        contractId: z.ZodString;
        policyId: z.ZodOptional<z.ZodString>;
        claimId: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        policyId?: string;
        claimId?: string;
        contractId?: string;
    }, {
        policyId?: string;
        claimId?: string;
        contractId?: string;
    }>;
    payload: z.ZodObject<{
        calculationBasis: z.ZodEnum<["policy", "claim"]>;
        grossAmount: z.ZodNumber;
        cededAmount: z.ZodNumber;
        retainedAmount: z.ZodNumber;
        currency: z.ZodString;
        layerRef: z.ZodOptional<z.ZodObject<{
            layerId: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            layerId?: string;
        }, {
            layerId?: string;
        }>>;
        counterpartyId: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        currency?: string;
        counterpartyId?: string;
        calculationBasis?: "policy" | "claim";
        grossAmount?: number;
        cededAmount?: number;
        retainedAmount?: number;
        layerRef?: {
            layerId?: string;
        };
    }, {
        currency?: string;
        counterpartyId?: string;
        calculationBasis?: "policy" | "claim";
        grossAmount?: number;
        cededAmount?: number;
        retainedAmount?: number;
        layerRef?: {
            layerId?: string;
        };
    }>;
}, "strict", z.ZodTypeAny, {
    eventType?: string;
    occurredAt?: string;
    correlationId?: string;
    eventVersion?: number;
    eventId?: string;
    producer?: string;
    traceparent?: string;
    subject?: {
        policyId?: string;
        claimId?: string;
        contractId?: string;
    };
    tenantId?: string;
    idempotencyKey?: string;
    causationId?: string;
    payload?: {
        currency?: string;
        counterpartyId?: string;
        calculationBasis?: "policy" | "claim";
        grossAmount?: number;
        cededAmount?: number;
        retainedAmount?: number;
        layerRef?: {
            layerId?: string;
        };
    };
}, {
    eventType?: string;
    occurredAt?: string;
    correlationId?: string;
    eventVersion?: number;
    eventId?: string;
    producer?: string;
    traceparent?: string;
    subject?: {
        policyId?: string;
        claimId?: string;
        contractId?: string;
    };
    tenantId?: string;
    idempotencyKey?: string;
    causationId?: string;
    payload?: {
        currency?: string;
        counterpartyId?: string;
        calculationBasis?: "policy" | "claim";
        grossAmount?: number;
        cededAmount?: number;
        retainedAmount?: number;
        layerRef?: {
            layerId?: string;
        };
    };
}>;
export declare const BorderauxGeneratedSubjectV1: z.ZodObject<{
    borderauxId: z.ZodString;
    contractId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    contractId?: string;
    borderauxId?: string;
}, {
    contractId?: string;
    borderauxId?: string;
}>;
export declare const BorderauxGeneratedPayloadV1: z.ZodObject<{
    periodStart: z.ZodString;
    periodEnd: z.ZodString;
    itemsCount: z.ZodNumber;
    documentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    documentId?: string;
    periodStart?: string;
    periodEnd?: string;
    itemsCount?: number;
}, {
    documentId?: string;
    periodStart?: string;
    periodEnd?: string;
    itemsCount?: number;
}>;
export declare const BorderauxGeneratedEnvelopeV1: z.ZodObject<{
    eventId: z.ZodString;
    occurredAt: z.ZodString;
    producer: z.ZodString;
    correlationId: z.ZodString;
    tenantId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    traceparent: z.ZodOptional<z.ZodString>;
} & {
    eventType: z.ZodLiteral<string>;
    eventVersion: z.ZodLiteral<number>;
    subject: z.ZodObject<{
        borderauxId: z.ZodString;
        contractId: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        contractId?: string;
        borderauxId?: string;
    }, {
        contractId?: string;
        borderauxId?: string;
    }>;
    payload: z.ZodObject<{
        periodStart: z.ZodString;
        periodEnd: z.ZodString;
        itemsCount: z.ZodNumber;
        documentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strict", z.ZodTypeAny, {
        documentId?: string;
        periodStart?: string;
        periodEnd?: string;
        itemsCount?: number;
    }, {
        documentId?: string;
        periodStart?: string;
        periodEnd?: string;
        itemsCount?: number;
    }>;
}, "strict", z.ZodTypeAny, {
    eventType?: string;
    occurredAt?: string;
    correlationId?: string;
    eventVersion?: number;
    eventId?: string;
    producer?: string;
    traceparent?: string;
    subject?: {
        contractId?: string;
        borderauxId?: string;
    };
    tenantId?: string;
    idempotencyKey?: string;
    causationId?: string;
    payload?: {
        documentId?: string;
        periodStart?: string;
        periodEnd?: string;
        itemsCount?: number;
    };
}, {
    eventType?: string;
    occurredAt?: string;
    correlationId?: string;
    eventVersion?: number;
    eventId?: string;
    producer?: string;
    traceparent?: string;
    subject?: {
        contractId?: string;
        borderauxId?: string;
    };
    tenantId?: string;
    idempotencyKey?: string;
    causationId?: string;
    payload?: {
        documentId?: string;
        periodStart?: string;
        periodEnd?: string;
        itemsCount?: number;
    };
}>;
export declare const FraudCaseEscalatedSubjectV1: z.ZodObject<{
    fraudCaseId: z.ZodString;
    claimId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    claimId?: string;
    fraudCaseId?: string;
}, {
    claimId?: string;
    fraudCaseId?: string;
}>;
export declare const FraudCaseEscalatedPayloadV1: z.ZodObject<{
    fraudCaseId: z.ZodString;
    claimId: z.ZodString;
    claimNumber: z.ZodString;
    escalatedAt: z.ZodString;
    toUnit: z.ZodEnum<["siu", "legal"]>;
    reasonCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    requiresHumanApproval: z.ZodOptional<z.ZodBoolean>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    claimId?: string;
    fraudCaseId?: string;
    claimNumber?: string;
    escalatedAt?: string;
    toUnit?: "siu" | "legal";
    reasonCodes?: string[];
    requiresHumanApproval?: boolean;
    notes?: string;
}, {
    claimId?: string;
    fraudCaseId?: string;
    claimNumber?: string;
    escalatedAt?: string;
    toUnit?: "siu" | "legal";
    reasonCodes?: string[];
    requiresHumanApproval?: boolean;
    notes?: string;
}>;
export declare const FraudCaseEscalatedEnvelopeV1: z.ZodObject<{
    eventId: z.ZodString;
    occurredAt: z.ZodString;
    producer: z.ZodString;
    correlationId: z.ZodString;
    tenantId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    traceparent: z.ZodOptional<z.ZodString>;
} & {
    eventType: z.ZodLiteral<string>;
    eventVersion: z.ZodLiteral<number>;
    subject: z.ZodObject<{
        fraudCaseId: z.ZodString;
        claimId: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        claimId?: string;
        fraudCaseId?: string;
    }, {
        claimId?: string;
        fraudCaseId?: string;
    }>;
    payload: z.ZodObject<{
        fraudCaseId: z.ZodString;
        claimId: z.ZodString;
        claimNumber: z.ZodString;
        escalatedAt: z.ZodString;
        toUnit: z.ZodEnum<["siu", "legal"]>;
        reasonCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        requiresHumanApproval: z.ZodOptional<z.ZodBoolean>;
        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strict", z.ZodTypeAny, {
        claimId?: string;
        fraudCaseId?: string;
        claimNumber?: string;
        escalatedAt?: string;
        toUnit?: "siu" | "legal";
        reasonCodes?: string[];
        requiresHumanApproval?: boolean;
        notes?: string;
    }, {
        claimId?: string;
        fraudCaseId?: string;
        claimNumber?: string;
        escalatedAt?: string;
        toUnit?: "siu" | "legal";
        reasonCodes?: string[];
        requiresHumanApproval?: boolean;
        notes?: string;
    }>;
}, "strict", z.ZodTypeAny, {
    eventType?: string;
    occurredAt?: string;
    correlationId?: string;
    eventVersion?: number;
    eventId?: string;
    producer?: string;
    traceparent?: string;
    subject?: {
        claimId?: string;
        fraudCaseId?: string;
    };
    tenantId?: string;
    idempotencyKey?: string;
    causationId?: string;
    payload?: {
        claimId?: string;
        fraudCaseId?: string;
        claimNumber?: string;
        escalatedAt?: string;
        toUnit?: "siu" | "legal";
        reasonCodes?: string[];
        requiresHumanApproval?: boolean;
        notes?: string;
    };
}, {
    eventType?: string;
    occurredAt?: string;
    correlationId?: string;
    eventVersion?: number;
    eventId?: string;
    producer?: string;
    traceparent?: string;
    subject?: {
        claimId?: string;
        fraudCaseId?: string;
    };
    tenantId?: string;
    idempotencyKey?: string;
    causationId?: string;
    payload?: {
        claimId?: string;
        fraudCaseId?: string;
        claimNumber?: string;
        escalatedAt?: string;
        toUnit?: "siu" | "legal";
        reasonCodes?: string[];
        requiresHumanApproval?: boolean;
        notes?: string;
    };
}>;
export declare const ComplaintSlaBreachedSubjectV1: z.ZodObject<{
    complaintId: z.ZodString;
    policyId: z.ZodOptional<z.ZodString>;
    claimId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    policyId?: string;
    claimId?: string;
    complaintId?: string;
}, {
    policyId?: string;
    claimId?: string;
    complaintId?: string;
}>;
export declare const ComplaintSlaBreachedPayloadV1: z.ZodObject<{
    complaintId: z.ZodString;
    complaintType: z.ZodString;
    status: z.ZodString;
    policyId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    claimId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    policyNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    assignedTo: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    slaFirstResponseDueAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    slaResolutionDueAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    tenantId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    actorUserId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    breachedAt: z.ZodString;
    slaHours: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    elapsedHours: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    policyId?: string;
    claimId?: string;
    complaintId?: string;
    tenantId?: string;
    complaintType?: string;
    policyNumber?: string;
    assignedTo?: string;
    slaFirstResponseDueAt?: string;
    slaResolutionDueAt?: string;
    actorUserId?: string;
    breachedAt?: string;
    slaHours?: number;
    elapsedHours?: number;
}, {
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    policyId?: string;
    claimId?: string;
    complaintId?: string;
    tenantId?: string;
    complaintType?: string;
    policyNumber?: string;
    assignedTo?: string;
    slaFirstResponseDueAt?: string;
    slaResolutionDueAt?: string;
    actorUserId?: string;
    breachedAt?: string;
    slaHours?: number;
    elapsedHours?: number;
}>;
export declare const ComplaintSlaBreachedEnvelopeV1: z.ZodObject<{
    eventId: z.ZodString;
    occurredAt: z.ZodString;
    producer: z.ZodString;
    correlationId: z.ZodString;
    tenantId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    traceparent: z.ZodOptional<z.ZodString>;
} & {
    eventType: z.ZodLiteral<string>;
    eventVersion: z.ZodLiteral<number>;
    subject: z.ZodObject<{
        complaintId: z.ZodString;
        policyId: z.ZodOptional<z.ZodString>;
        claimId: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        policyId?: string;
        claimId?: string;
        complaintId?: string;
    }, {
        policyId?: string;
        claimId?: string;
        complaintId?: string;
    }>;
    payload: z.ZodObject<{
        complaintId: z.ZodString;
        complaintType: z.ZodString;
        status: z.ZodString;
        policyId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        claimId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        policyNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        assignedTo: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        slaFirstResponseDueAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        slaResolutionDueAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        tenantId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        actorUserId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        breachedAt: z.ZodString;
        slaHours: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        elapsedHours: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        status?: string;
        createdAt?: string;
        updatedAt?: string;
        policyId?: string;
        claimId?: string;
        complaintId?: string;
        tenantId?: string;
        complaintType?: string;
        policyNumber?: string;
        assignedTo?: string;
        slaFirstResponseDueAt?: string;
        slaResolutionDueAt?: string;
        actorUserId?: string;
        breachedAt?: string;
        slaHours?: number;
        elapsedHours?: number;
    }, {
        status?: string;
        createdAt?: string;
        updatedAt?: string;
        policyId?: string;
        claimId?: string;
        complaintId?: string;
        tenantId?: string;
        complaintType?: string;
        policyNumber?: string;
        assignedTo?: string;
        slaFirstResponseDueAt?: string;
        slaResolutionDueAt?: string;
        actorUserId?: string;
        breachedAt?: string;
        slaHours?: number;
        elapsedHours?: number;
    }>;
}, "strict", z.ZodTypeAny, {
    eventType?: string;
    occurredAt?: string;
    correlationId?: string;
    eventVersion?: number;
    eventId?: string;
    producer?: string;
    traceparent?: string;
    subject?: {
        policyId?: string;
        claimId?: string;
        complaintId?: string;
    };
    tenantId?: string;
    idempotencyKey?: string;
    causationId?: string;
    payload?: {
        status?: string;
        createdAt?: string;
        updatedAt?: string;
        policyId?: string;
        claimId?: string;
        complaintId?: string;
        tenantId?: string;
        complaintType?: string;
        policyNumber?: string;
        assignedTo?: string;
        slaFirstResponseDueAt?: string;
        slaResolutionDueAt?: string;
        actorUserId?: string;
        breachedAt?: string;
        slaHours?: number;
        elapsedHours?: number;
    };
}, {
    eventType?: string;
    occurredAt?: string;
    correlationId?: string;
    eventVersion?: number;
    eventId?: string;
    producer?: string;
    traceparent?: string;
    subject?: {
        policyId?: string;
        claimId?: string;
        complaintId?: string;
    };
    tenantId?: string;
    idempotencyKey?: string;
    causationId?: string;
    payload?: {
        status?: string;
        createdAt?: string;
        updatedAt?: string;
        policyId?: string;
        claimId?: string;
        complaintId?: string;
        tenantId?: string;
        complaintType?: string;
        policyNumber?: string;
        assignedTo?: string;
        slaFirstResponseDueAt?: string;
        slaResolutionDueAt?: string;
        actorUserId?: string;
        breachedAt?: string;
        slaHours?: number;
        elapsedHours?: number;
    };
}>;
export declare const ClaimPaymentRequestedSubjectV1: z.ZodObject<{
    claimId: z.ZodString;
    claimNumber: z.ZodString;
    policyId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    policyId?: string;
    claimId?: string;
    claimNumber?: string;
}, {
    policyId?: string;
    claimId?: string;
    claimNumber?: string;
}>;
export declare const ClaimPaymentRequestedPayloadV1: z.ZodObject<{
    claimId: z.ZodString;
    claimNumber: z.ZodString;
    policyId: z.ZodString;
    approvedAmount: z.ZodNumber;
    requestedAt: z.ZodString;
}, "strict", z.ZodTypeAny, {
    policyId?: string;
    claimId?: string;
    claimNumber?: string;
    approvedAmount?: number;
    requestedAt?: string;
}, {
    policyId?: string;
    claimId?: string;
    claimNumber?: string;
    approvedAmount?: number;
    requestedAt?: string;
}>;
export declare const ClaimPaymentRequestedEnvelopeV1: z.ZodObject<{
    eventId: z.ZodString;
    occurredAt: z.ZodString;
    producer: z.ZodString;
    correlationId: z.ZodString;
    tenantId: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    traceparent: z.ZodOptional<z.ZodString>;
} & {
    eventType: z.ZodLiteral<string>;
    eventVersion: z.ZodLiteral<number>;
    subject: z.ZodObject<{
        claimId: z.ZodString;
        claimNumber: z.ZodString;
        policyId: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        policyId?: string;
        claimId?: string;
        claimNumber?: string;
    }, {
        policyId?: string;
        claimId?: string;
        claimNumber?: string;
    }>;
    payload: z.ZodObject<{
        claimId: z.ZodString;
        claimNumber: z.ZodString;
        policyId: z.ZodString;
        approvedAmount: z.ZodNumber;
        requestedAt: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        policyId?: string;
        claimId?: string;
        claimNumber?: string;
        approvedAmount?: number;
        requestedAt?: string;
    }, {
        policyId?: string;
        claimId?: string;
        claimNumber?: string;
        approvedAmount?: number;
        requestedAt?: string;
    }>;
}, "strict", z.ZodTypeAny, {
    eventType?: string;
    occurredAt?: string;
    correlationId?: string;
    eventVersion?: number;
    eventId?: string;
    producer?: string;
    traceparent?: string;
    subject?: {
        policyId?: string;
        claimId?: string;
        claimNumber?: string;
    };
    tenantId?: string;
    idempotencyKey?: string;
    causationId?: string;
    payload?: {
        policyId?: string;
        claimId?: string;
        claimNumber?: string;
        approvedAmount?: number;
        requestedAt?: string;
    };
}, {
    eventType?: string;
    occurredAt?: string;
    correlationId?: string;
    eventVersion?: number;
    eventId?: string;
    producer?: string;
    traceparent?: string;
    subject?: {
        policyId?: string;
        claimId?: string;
        claimNumber?: string;
    };
    tenantId?: string;
    idempotencyKey?: string;
    causationId?: string;
    payload?: {
        policyId?: string;
        claimId?: string;
        claimNumber?: string;
        approvedAmount?: number;
        requestedAt?: string;
    };
}>;
export declare const EnterpriseEventContractsV1: {
    readonly ClaimDocumentsAttached: z.ZodObject<{
        eventId: z.ZodString;
        occurredAt: z.ZodString;
        producer: z.ZodString;
        correlationId: z.ZodString;
        tenantId: z.ZodOptional<z.ZodString>;
        idempotencyKey: z.ZodOptional<z.ZodString>;
        causationId: z.ZodOptional<z.ZodString>;
        traceparent: z.ZodOptional<z.ZodString>;
    } & {
        eventType: z.ZodLiteral<string>;
        eventVersion: z.ZodLiteral<number>;
        subject: z.ZodObject<{
            claimId: z.ZodString;
            documentIds: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            claimId?: string;
            documentIds?: string;
        }, {
            claimId?: string;
            documentIds?: string;
        }>;
        payload: z.ZodObject<{
            documents: z.ZodArray<z.ZodObject<{
                documentId: z.ZodString;
                type: z.ZodString;
                source: z.ZodEnum<["upload", "link"]>;
                storageRef: z.ZodString;
            }, "strict", z.ZodTypeAny, {
                type?: string;
                documentId?: string;
                source?: "link" | "upload";
                storageRef?: string;
            }, {
                type?: string;
                documentId?: string;
                source?: "link" | "upload";
                storageRef?: string;
            }>, "many">;
        }, "strict", z.ZodTypeAny, {
            documents?: {
                type?: string;
                documentId?: string;
                source?: "link" | "upload";
                storageRef?: string;
            }[];
        }, {
            documents?: {
                type?: string;
                documentId?: string;
                source?: "link" | "upload";
                storageRef?: string;
            }[];
        }>;
    }, "strict", z.ZodTypeAny, {
        eventType?: string;
        occurredAt?: string;
        correlationId?: string;
        eventVersion?: number;
        eventId?: string;
        producer?: string;
        traceparent?: string;
        subject?: {
            claimId?: string;
            documentIds?: string;
        };
        tenantId?: string;
        idempotencyKey?: string;
        causationId?: string;
        payload?: {
            documents?: {
                type?: string;
                documentId?: string;
                source?: "link" | "upload";
                storageRef?: string;
            }[];
        };
    }, {
        eventType?: string;
        occurredAt?: string;
        correlationId?: string;
        eventVersion?: number;
        eventId?: string;
        producer?: string;
        traceparent?: string;
        subject?: {
            claimId?: string;
            documentIds?: string;
        };
        tenantId?: string;
        idempotencyKey?: string;
        causationId?: string;
        payload?: {
            documents?: {
                type?: string;
                documentId?: string;
                source?: "link" | "upload";
                storageRef?: string;
            }[];
        };
    }>;
    readonly CededCalculated: z.ZodObject<{
        eventId: z.ZodString;
        occurredAt: z.ZodString;
        producer: z.ZodString;
        correlationId: z.ZodString;
        tenantId: z.ZodOptional<z.ZodString>;
        idempotencyKey: z.ZodOptional<z.ZodString>;
        causationId: z.ZodOptional<z.ZodString>;
        traceparent: z.ZodOptional<z.ZodString>;
    } & {
        eventType: z.ZodLiteral<string>;
        eventVersion: z.ZodLiteral<number>;
        subject: z.ZodObject<{
            contractId: z.ZodString;
            policyId: z.ZodOptional<z.ZodString>;
            claimId: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            policyId?: string;
            claimId?: string;
            contractId?: string;
        }, {
            policyId?: string;
            claimId?: string;
            contractId?: string;
        }>;
        payload: z.ZodObject<{
            calculationBasis: z.ZodEnum<["policy", "claim"]>;
            grossAmount: z.ZodNumber;
            cededAmount: z.ZodNumber;
            retainedAmount: z.ZodNumber;
            currency: z.ZodString;
            layerRef: z.ZodOptional<z.ZodObject<{
                layerId: z.ZodOptional<z.ZodString>;
            }, "strict", z.ZodTypeAny, {
                layerId?: string;
            }, {
                layerId?: string;
            }>>;
            counterpartyId: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            currency?: string;
            counterpartyId?: string;
            calculationBasis?: "policy" | "claim";
            grossAmount?: number;
            cededAmount?: number;
            retainedAmount?: number;
            layerRef?: {
                layerId?: string;
            };
        }, {
            currency?: string;
            counterpartyId?: string;
            calculationBasis?: "policy" | "claim";
            grossAmount?: number;
            cededAmount?: number;
            retainedAmount?: number;
            layerRef?: {
                layerId?: string;
            };
        }>;
    }, "strict", z.ZodTypeAny, {
        eventType?: string;
        occurredAt?: string;
        correlationId?: string;
        eventVersion?: number;
        eventId?: string;
        producer?: string;
        traceparent?: string;
        subject?: {
            policyId?: string;
            claimId?: string;
            contractId?: string;
        };
        tenantId?: string;
        idempotencyKey?: string;
        causationId?: string;
        payload?: {
            currency?: string;
            counterpartyId?: string;
            calculationBasis?: "policy" | "claim";
            grossAmount?: number;
            cededAmount?: number;
            retainedAmount?: number;
            layerRef?: {
                layerId?: string;
            };
        };
    }, {
        eventType?: string;
        occurredAt?: string;
        correlationId?: string;
        eventVersion?: number;
        eventId?: string;
        producer?: string;
        traceparent?: string;
        subject?: {
            policyId?: string;
            claimId?: string;
            contractId?: string;
        };
        tenantId?: string;
        idempotencyKey?: string;
        causationId?: string;
        payload?: {
            currency?: string;
            counterpartyId?: string;
            calculationBasis?: "policy" | "claim";
            grossAmount?: number;
            cededAmount?: number;
            retainedAmount?: number;
            layerRef?: {
                layerId?: string;
            };
        };
    }>;
    readonly BorderauxGenerated: z.ZodObject<{
        eventId: z.ZodString;
        occurredAt: z.ZodString;
        producer: z.ZodString;
        correlationId: z.ZodString;
        tenantId: z.ZodOptional<z.ZodString>;
        idempotencyKey: z.ZodOptional<z.ZodString>;
        causationId: z.ZodOptional<z.ZodString>;
        traceparent: z.ZodOptional<z.ZodString>;
    } & {
        eventType: z.ZodLiteral<string>;
        eventVersion: z.ZodLiteral<number>;
        subject: z.ZodObject<{
            borderauxId: z.ZodString;
            contractId: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            contractId?: string;
            borderauxId?: string;
        }, {
            contractId?: string;
            borderauxId?: string;
        }>;
        payload: z.ZodObject<{
            periodStart: z.ZodString;
            periodEnd: z.ZodString;
            itemsCount: z.ZodNumber;
            documentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, "strict", z.ZodTypeAny, {
            documentId?: string;
            periodStart?: string;
            periodEnd?: string;
            itemsCount?: number;
        }, {
            documentId?: string;
            periodStart?: string;
            periodEnd?: string;
            itemsCount?: number;
        }>;
    }, "strict", z.ZodTypeAny, {
        eventType?: string;
        occurredAt?: string;
        correlationId?: string;
        eventVersion?: number;
        eventId?: string;
        producer?: string;
        traceparent?: string;
        subject?: {
            contractId?: string;
            borderauxId?: string;
        };
        tenantId?: string;
        idempotencyKey?: string;
        causationId?: string;
        payload?: {
            documentId?: string;
            periodStart?: string;
            periodEnd?: string;
            itemsCount?: number;
        };
    }, {
        eventType?: string;
        occurredAt?: string;
        correlationId?: string;
        eventVersion?: number;
        eventId?: string;
        producer?: string;
        traceparent?: string;
        subject?: {
            contractId?: string;
            borderauxId?: string;
        };
        tenantId?: string;
        idempotencyKey?: string;
        causationId?: string;
        payload?: {
            documentId?: string;
            periodStart?: string;
            periodEnd?: string;
            itemsCount?: number;
        };
    }>;
    readonly RecoveryIdentified: z.ZodObject<{
        eventId: z.ZodString;
        occurredAt: z.ZodString;
        producer: z.ZodString;
        correlationId: z.ZodString;
        tenantId: z.ZodOptional<z.ZodString>;
        idempotencyKey: z.ZodOptional<z.ZodString>;
        causationId: z.ZodOptional<z.ZodString>;
        traceparent: z.ZodOptional<z.ZodString>;
    } & {
        eventType: z.ZodLiteral<string>;
        eventVersion: z.ZodLiteral<number>;
        subject: z.ZodObject<{
            claimId: z.ZodString;
            contractId: z.ZodString;
            recoveryId: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            claimId?: string;
            contractId?: string;
            recoveryId?: string;
        }, {
            claimId?: string;
            contractId?: string;
            recoveryId?: string;
        }>;
        payload: z.ZodObject<{
            recoverableAmount: z.ZodNumber;
            currency: z.ZodString;
            counterpartyId: z.ZodOptional<z.ZodString>;
            identifiedAt: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            recoverableAmount?: number;
            currency?: string;
            counterpartyId?: string;
            identifiedAt?: string;
        }, {
            recoverableAmount?: number;
            currency?: string;
            counterpartyId?: string;
            identifiedAt?: string;
        }>;
    }, "strict", z.ZodTypeAny, {
        eventType?: string;
        occurredAt?: string;
        correlationId?: string;
        eventVersion?: number;
        eventId?: string;
        producer?: string;
        traceparent?: string;
        subject?: {
            claimId?: string;
            contractId?: string;
            recoveryId?: string;
        };
        tenantId?: string;
        idempotencyKey?: string;
        causationId?: string;
        payload?: {
            recoverableAmount?: number;
            currency?: string;
            counterpartyId?: string;
            identifiedAt?: string;
        };
    }, {
        eventType?: string;
        occurredAt?: string;
        correlationId?: string;
        eventVersion?: number;
        eventId?: string;
        producer?: string;
        traceparent?: string;
        subject?: {
            claimId?: string;
            contractId?: string;
            recoveryId?: string;
        };
        tenantId?: string;
        idempotencyKey?: string;
        causationId?: string;
        payload?: {
            recoverableAmount?: number;
            currency?: string;
            counterpartyId?: string;
            identifiedAt?: string;
        };
    }>;
    readonly RecoveryReceived: z.ZodObject<{
        eventId: z.ZodString;
        occurredAt: z.ZodString;
        producer: z.ZodString;
        correlationId: z.ZodString;
        tenantId: z.ZodOptional<z.ZodString>;
        idempotencyKey: z.ZodOptional<z.ZodString>;
        causationId: z.ZodOptional<z.ZodString>;
        traceparent: z.ZodOptional<z.ZodString>;
    } & {
        eventType: z.ZodLiteral<string>;
        eventVersion: z.ZodLiteral<number>;
        subject: z.ZodObject<{
            recoveryId: z.ZodString;
            claimId: z.ZodString;
            contractId: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            claimId?: string;
            contractId?: string;
            recoveryId?: string;
        }, {
            claimId?: string;
            contractId?: string;
            recoveryId?: string;
        }>;
        payload: z.ZodObject<{
            receivedAt: z.ZodString;
            amount: z.ZodNumber;
            currency: z.ZodString;
            referenceNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, "strict", z.ZodTypeAny, {
            currency?: string;
            receivedAt?: string;
            amount?: number;
            referenceNumber?: string;
        }, {
            currency?: string;
            receivedAt?: string;
            amount?: number;
            referenceNumber?: string;
        }>;
    }, "strict", z.ZodTypeAny, {
        eventType?: string;
        occurredAt?: string;
        correlationId?: string;
        eventVersion?: number;
        eventId?: string;
        producer?: string;
        traceparent?: string;
        subject?: {
            claimId?: string;
            contractId?: string;
            recoveryId?: string;
        };
        tenantId?: string;
        idempotencyKey?: string;
        causationId?: string;
        payload?: {
            currency?: string;
            receivedAt?: string;
            amount?: number;
            referenceNumber?: string;
        };
    }, {
        eventType?: string;
        occurredAt?: string;
        correlationId?: string;
        eventVersion?: number;
        eventId?: string;
        producer?: string;
        traceparent?: string;
        subject?: {
            claimId?: string;
            contractId?: string;
            recoveryId?: string;
        };
        tenantId?: string;
        idempotencyKey?: string;
        causationId?: string;
        payload?: {
            currency?: string;
            receivedAt?: string;
            amount?: number;
            referenceNumber?: string;
        };
    }>;
    readonly FraudCaseEscalated: z.ZodObject<{
        eventId: z.ZodString;
        occurredAt: z.ZodString;
        producer: z.ZodString;
        correlationId: z.ZodString;
        tenantId: z.ZodOptional<z.ZodString>;
        idempotencyKey: z.ZodOptional<z.ZodString>;
        causationId: z.ZodOptional<z.ZodString>;
        traceparent: z.ZodOptional<z.ZodString>;
    } & {
        eventType: z.ZodLiteral<string>;
        eventVersion: z.ZodLiteral<number>;
        subject: z.ZodObject<{
            fraudCaseId: z.ZodString;
            claimId: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            claimId?: string;
            fraudCaseId?: string;
        }, {
            claimId?: string;
            fraudCaseId?: string;
        }>;
        payload: z.ZodObject<{
            fraudCaseId: z.ZodString;
            claimId: z.ZodString;
            claimNumber: z.ZodString;
            escalatedAt: z.ZodString;
            toUnit: z.ZodEnum<["siu", "legal"]>;
            reasonCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            requiresHumanApproval: z.ZodOptional<z.ZodBoolean>;
            notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, "strict", z.ZodTypeAny, {
            claimId?: string;
            fraudCaseId?: string;
            claimNumber?: string;
            escalatedAt?: string;
            toUnit?: "siu" | "legal";
            reasonCodes?: string[];
            requiresHumanApproval?: boolean;
            notes?: string;
        }, {
            claimId?: string;
            fraudCaseId?: string;
            claimNumber?: string;
            escalatedAt?: string;
            toUnit?: "siu" | "legal";
            reasonCodes?: string[];
            requiresHumanApproval?: boolean;
            notes?: string;
        }>;
    }, "strict", z.ZodTypeAny, {
        eventType?: string;
        occurredAt?: string;
        correlationId?: string;
        eventVersion?: number;
        eventId?: string;
        producer?: string;
        traceparent?: string;
        subject?: {
            claimId?: string;
            fraudCaseId?: string;
        };
        tenantId?: string;
        idempotencyKey?: string;
        causationId?: string;
        payload?: {
            claimId?: string;
            fraudCaseId?: string;
            claimNumber?: string;
            escalatedAt?: string;
            toUnit?: "siu" | "legal";
            reasonCodes?: string[];
            requiresHumanApproval?: boolean;
            notes?: string;
        };
    }, {
        eventType?: string;
        occurredAt?: string;
        correlationId?: string;
        eventVersion?: number;
        eventId?: string;
        producer?: string;
        traceparent?: string;
        subject?: {
            claimId?: string;
            fraudCaseId?: string;
        };
        tenantId?: string;
        idempotencyKey?: string;
        causationId?: string;
        payload?: {
            claimId?: string;
            fraudCaseId?: string;
            claimNumber?: string;
            escalatedAt?: string;
            toUnit?: "siu" | "legal";
            reasonCodes?: string[];
            requiresHumanApproval?: boolean;
            notes?: string;
        };
    }>;
    readonly ComplaintSlaBreached: z.ZodObject<{
        eventId: z.ZodString;
        occurredAt: z.ZodString;
        producer: z.ZodString;
        correlationId: z.ZodString;
        tenantId: z.ZodOptional<z.ZodString>;
        idempotencyKey: z.ZodOptional<z.ZodString>;
        causationId: z.ZodOptional<z.ZodString>;
        traceparent: z.ZodOptional<z.ZodString>;
    } & {
        eventType: z.ZodLiteral<string>;
        eventVersion: z.ZodLiteral<number>;
        subject: z.ZodObject<{
            complaintId: z.ZodString;
            policyId: z.ZodOptional<z.ZodString>;
            claimId: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            policyId?: string;
            claimId?: string;
            complaintId?: string;
        }, {
            policyId?: string;
            claimId?: string;
            complaintId?: string;
        }>;
        payload: z.ZodObject<{
            complaintId: z.ZodString;
            complaintType: z.ZodString;
            status: z.ZodString;
            policyId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            claimId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            policyNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            assignedTo: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            slaFirstResponseDueAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            slaResolutionDueAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            createdAt: z.ZodString;
            updatedAt: z.ZodString;
            tenantId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            actorUserId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            breachedAt: z.ZodString;
            slaHours: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            elapsedHours: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            status?: string;
            createdAt?: string;
            updatedAt?: string;
            policyId?: string;
            claimId?: string;
            complaintId?: string;
            tenantId?: string;
            complaintType?: string;
            policyNumber?: string;
            assignedTo?: string;
            slaFirstResponseDueAt?: string;
            slaResolutionDueAt?: string;
            actorUserId?: string;
            breachedAt?: string;
            slaHours?: number;
            elapsedHours?: number;
        }, {
            status?: string;
            createdAt?: string;
            updatedAt?: string;
            policyId?: string;
            claimId?: string;
            complaintId?: string;
            tenantId?: string;
            complaintType?: string;
            policyNumber?: string;
            assignedTo?: string;
            slaFirstResponseDueAt?: string;
            slaResolutionDueAt?: string;
            actorUserId?: string;
            breachedAt?: string;
            slaHours?: number;
            elapsedHours?: number;
        }>;
    }, "strict", z.ZodTypeAny, {
        eventType?: string;
        occurredAt?: string;
        correlationId?: string;
        eventVersion?: number;
        eventId?: string;
        producer?: string;
        traceparent?: string;
        subject?: {
            policyId?: string;
            claimId?: string;
            complaintId?: string;
        };
        tenantId?: string;
        idempotencyKey?: string;
        causationId?: string;
        payload?: {
            status?: string;
            createdAt?: string;
            updatedAt?: string;
            policyId?: string;
            claimId?: string;
            complaintId?: string;
            tenantId?: string;
            complaintType?: string;
            policyNumber?: string;
            assignedTo?: string;
            slaFirstResponseDueAt?: string;
            slaResolutionDueAt?: string;
            actorUserId?: string;
            breachedAt?: string;
            slaHours?: number;
            elapsedHours?: number;
        };
    }, {
        eventType?: string;
        occurredAt?: string;
        correlationId?: string;
        eventVersion?: number;
        eventId?: string;
        producer?: string;
        traceparent?: string;
        subject?: {
            policyId?: string;
            claimId?: string;
            complaintId?: string;
        };
        tenantId?: string;
        idempotencyKey?: string;
        causationId?: string;
        payload?: {
            status?: string;
            createdAt?: string;
            updatedAt?: string;
            policyId?: string;
            claimId?: string;
            complaintId?: string;
            tenantId?: string;
            complaintType?: string;
            policyNumber?: string;
            assignedTo?: string;
            slaFirstResponseDueAt?: string;
            slaResolutionDueAt?: string;
            actorUserId?: string;
            breachedAt?: string;
            slaHours?: number;
            elapsedHours?: number;
        };
    }>;
    readonly ClaimPaymentRequested: z.ZodObject<{
        eventId: z.ZodString;
        occurredAt: z.ZodString;
        producer: z.ZodString;
        correlationId: z.ZodString;
        tenantId: z.ZodOptional<z.ZodString>;
        idempotencyKey: z.ZodOptional<z.ZodString>;
        causationId: z.ZodOptional<z.ZodString>;
        traceparent: z.ZodOptional<z.ZodString>;
    } & {
        eventType: z.ZodLiteral<string>;
        eventVersion: z.ZodLiteral<number>;
        subject: z.ZodObject<{
            claimId: z.ZodString;
            claimNumber: z.ZodString;
            policyId: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            policyId?: string;
            claimId?: string;
            claimNumber?: string;
        }, {
            policyId?: string;
            claimId?: string;
            claimNumber?: string;
        }>;
        payload: z.ZodObject<{
            claimId: z.ZodString;
            claimNumber: z.ZodString;
            policyId: z.ZodString;
            approvedAmount: z.ZodNumber;
            requestedAt: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            policyId?: string;
            claimId?: string;
            claimNumber?: string;
            approvedAmount?: number;
            requestedAt?: string;
        }, {
            policyId?: string;
            claimId?: string;
            claimNumber?: string;
            approvedAmount?: number;
            requestedAt?: string;
        }>;
    }, "strict", z.ZodTypeAny, {
        eventType?: string;
        occurredAt?: string;
        correlationId?: string;
        eventVersion?: number;
        eventId?: string;
        producer?: string;
        traceparent?: string;
        subject?: {
            policyId?: string;
            claimId?: string;
            claimNumber?: string;
        };
        tenantId?: string;
        idempotencyKey?: string;
        causationId?: string;
        payload?: {
            policyId?: string;
            claimId?: string;
            claimNumber?: string;
            approvedAmount?: number;
            requestedAt?: string;
        };
    }, {
        eventType?: string;
        occurredAt?: string;
        correlationId?: string;
        eventVersion?: number;
        eventId?: string;
        producer?: string;
        traceparent?: string;
        subject?: {
            policyId?: string;
            claimId?: string;
            claimNumber?: string;
        };
        tenantId?: string;
        idempotencyKey?: string;
        causationId?: string;
        payload?: {
            policyId?: string;
            claimId?: string;
            claimNumber?: string;
            approvedAmount?: number;
            requestedAt?: string;
        };
    }>;
};
