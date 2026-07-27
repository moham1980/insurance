export function createEventEnvelope(params) {
    const occurredAt = params.occurredAt instanceof Date
        ? params.occurredAt.toISOString()
        : typeof params.occurredAt === 'string'
            ? params.occurredAt
            : new Date().toISOString();
    return {
        eventId: params.eventId,
        eventType: params.eventType,
        eventVersion: params.eventVersion,
        occurredAt,
        producer: params.producer,
        correlationId: params.correlationId,
        tenantId: params.tenantId,
        idempotencyKey: params.idempotencyKey,
        causationId: params.causationId,
        traceparent: params.traceparent,
        subject: params.subject,
        payload: params.payload,
    };
}
//# sourceMappingURL=EventEnvelope.js.map