import { z } from 'zod';
const isoDateTime = z.string().datetime();
const baseEnvelope = z.object({
    eventId: z.string().min(1),
    eventType: z.string().min(1),
    eventVersion: z.number().int().positive(),
    occurredAt: isoDateTime,
    producer: z.string().min(1),
    correlationId: z.string().min(1),
    tenantId: z.string().min(1).optional(),
    idempotencyKey: z.string().min(1).optional(),
    causationId: z.string().min(1).optional(),
    traceparent: z.string().min(1).optional(),
    subject: z.record(z.string(), z.string().optional()),
    payload: z.unknown(),
});
function makeEnvelopeContract(params) {
    return baseEnvelope
        .extend({
        eventType: z.literal(params.eventType),
        eventVersion: z.literal(params.eventVersion),
        subject: params.subject,
        payload: params.payload,
    })
        .strict();
}
export const ClaimDocumentsAttachedSubjectV1 = z
    .object({
    claimId: z.string().min(1),
    documentIds: z.string().min(1).optional(),
})
    .strict();
export const ClaimDocumentsAttachedPayloadV1 = z
    .object({
    documents: z
        .array(z
        .object({
        documentId: z.string().min(1),
        type: z.string().min(1),
        source: z.enum(['upload', 'link']),
        storageRef: z.string().min(1),
    })
        .strict())
        .min(1),
})
    .strict();
export const ClaimDocumentsAttachedEnvelopeV1 = makeEnvelopeContract({
    eventType: 'ClaimDocumentsAttached',
    eventVersion: 1,
    subject: ClaimDocumentsAttachedSubjectV1,
    payload: ClaimDocumentsAttachedPayloadV1,
});
export const RecoveryIdentifiedSubjectV1 = z
    .object({
    claimId: z.string().min(1),
    contractId: z.string().min(1),
    recoveryId: z.string().min(1),
})
    .strict();
export const RecoveryIdentifiedPayloadV1 = z
    .object({
    recoverableAmount: z.number(),
    currency: z.string().min(1),
    counterpartyId: z.string().min(1).optional(),
    identifiedAt: isoDateTime,
})
    .strict();
export const RecoveryIdentifiedEnvelopeV1 = makeEnvelopeContract({
    eventType: 'RecoveryIdentified',
    eventVersion: 1,
    subject: RecoveryIdentifiedSubjectV1,
    payload: RecoveryIdentifiedPayloadV1,
});
export const RecoveryReceivedSubjectV1 = z
    .object({
    recoveryId: z.string().min(1),
    claimId: z.string().min(1),
    contractId: z.string().min(1),
})
    .strict();
export const RecoveryReceivedPayloadV1 = z
    .object({
    receivedAt: isoDateTime,
    amount: z.number(),
    currency: z.string().min(1),
    referenceNumber: z.string().min(1).nullable().optional(),
})
    .strict();
export const RecoveryReceivedEnvelopeV1 = makeEnvelopeContract({
    eventType: 'RecoveryReceived',
    eventVersion: 1,
    subject: RecoveryReceivedSubjectV1,
    payload: RecoveryReceivedPayloadV1,
});
export const CededCalculatedSubjectV1 = z
    .object({
    contractId: z.string().min(1),
    policyId: z.string().min(1).optional(),
    claimId: z.string().min(1).optional(),
})
    .strict();
export const CededCalculatedPayloadV1 = z
    .object({
    calculationBasis: z.enum(['policy', 'claim']),
    grossAmount: z.number(),
    cededAmount: z.number(),
    retainedAmount: z.number(),
    currency: z.string().min(1),
    layerRef: z
        .object({
        layerId: z.string().min(1).optional(),
    })
        .strict()
        .optional(),
    counterpartyId: z.string().min(1).optional(),
})
    .strict();
export const CededCalculatedEnvelopeV1 = makeEnvelopeContract({
    eventType: 'CededCalculated',
    eventVersion: 1,
    subject: CededCalculatedSubjectV1,
    payload: CededCalculatedPayloadV1,
});
export const BorderauxGeneratedSubjectV1 = z
    .object({
    borderauxId: z.string().min(1),
    contractId: z.string().min(1),
})
    .strict();
export const BorderauxGeneratedPayloadV1 = z
    .object({
    periodStart: isoDateTime,
    periodEnd: isoDateTime,
    itemsCount: z.number().int().nonnegative(),
    documentId: z.string().min(1).nullable().optional(),
})
    .strict();
export const BorderauxGeneratedEnvelopeV1 = makeEnvelopeContract({
    eventType: 'BorderauxGenerated',
    eventVersion: 1,
    subject: BorderauxGeneratedSubjectV1,
    payload: BorderauxGeneratedPayloadV1,
});
export const FraudCaseEscalatedSubjectV1 = z
    .object({
    fraudCaseId: z.string().min(1),
    claimId: z.string().min(1),
})
    .strict();
export const FraudCaseEscalatedPayloadV1 = z
    .object({
    fraudCaseId: z.string().min(1),
    claimId: z.string().min(1),
    claimNumber: z.string().min(1),
    escalatedAt: isoDateTime,
    toUnit: z.enum(['siu', 'legal']),
    reasonCodes: z.array(z.string()).default([]),
    requiresHumanApproval: z.boolean().optional(),
    notes: z.string().nullable().optional(),
})
    .strict();
export const FraudCaseEscalatedEnvelopeV1 = makeEnvelopeContract({
    eventType: 'FraudCaseEscalated',
    eventVersion: 1,
    subject: FraudCaseEscalatedSubjectV1,
    payload: FraudCaseEscalatedPayloadV1,
});
export const ComplaintSlaBreachedSubjectV1 = z
    .object({
    complaintId: z.string().min(1),
    policyId: z.string().min(1).optional(),
    claimId: z.string().min(1).optional(),
})
    .strict();
export const ComplaintSlaBreachedPayloadV1 = z
    .object({
    complaintId: z.string().min(1),
    complaintType: z.string().min(1),
    status: z.string().min(1),
    policyId: z.string().min(1).nullable().optional(),
    claimId: z.string().min(1).nullable().optional(),
    policyNumber: z.string().min(1).nullable().optional(),
    assignedTo: z.string().min(1).nullable().optional(),
    slaFirstResponseDueAt: isoDateTime.nullable().optional(),
    slaResolutionDueAt: isoDateTime.nullable().optional(),
    createdAt: isoDateTime,
    updatedAt: isoDateTime,
    tenantId: z.string().min(1).nullable().optional(),
    actorUserId: z.string().min(1).nullable().optional(),
    breachedAt: isoDateTime,
    slaHours: z.number().int().nullable().optional(),
    elapsedHours: z.number().int().nonnegative(),
})
    .strict();
export const ComplaintSlaBreachedEnvelopeV1 = makeEnvelopeContract({
    eventType: 'ComplaintSlaBreached',
    eventVersion: 1,
    subject: ComplaintSlaBreachedSubjectV1,
    payload: ComplaintSlaBreachedPayloadV1,
});
export const ClaimPaymentRequestedSubjectV1 = z
    .object({
    claimId: z.string().min(1),
    claimNumber: z.string().min(1),
    policyId: z.string().min(1),
})
    .strict();
export const ClaimPaymentRequestedPayloadV1 = z
    .object({
    claimId: z.string().min(1),
    claimNumber: z.string().min(1),
    policyId: z.string().min(1),
    approvedAmount: z.number().positive(),
    requestedAt: isoDateTime,
})
    .strict();
export const ClaimPaymentRequestedEnvelopeV1 = makeEnvelopeContract({
    eventType: 'ClaimPaymentRequested',
    eventVersion: 1,
    subject: ClaimPaymentRequestedSubjectV1,
    payload: ClaimPaymentRequestedPayloadV1,
});
export const EnterpriseEventContractsV1 = {
    ClaimDocumentsAttached: ClaimDocumentsAttachedEnvelopeV1,
    CededCalculated: CededCalculatedEnvelopeV1,
    BorderauxGenerated: BorderauxGeneratedEnvelopeV1,
    RecoveryIdentified: RecoveryIdentifiedEnvelopeV1,
    RecoveryReceived: RecoveryReceivedEnvelopeV1,
    FraudCaseEscalated: FraudCaseEscalatedEnvelopeV1,
    ComplaintSlaBreached: ComplaintSlaBreachedEnvelopeV1,
    ClaimPaymentRequested: ClaimPaymentRequestedEnvelopeV1,
};
//# sourceMappingURL=EventContracts.js.map