export interface EventSubject {
    [key: string]: string | undefined;
    policyId?: string;
    claimId?: string;
    fraudCaseId?: string;
    complaintId?: string;
    contractId?: string;
}
export interface EventEnvelope<T = unknown> {
    eventId: string;
    eventType: string;
    eventVersion: number;
    occurredAt: string;
    producer: string;
    correlationId: string;
    tenantId?: string;
    idempotencyKey?: string;
    causationId?: string;
    traceparent?: string;
    subject: EventSubject;
    payload: T;
}
export interface DomainEvent<T = unknown> {
    topic: string;
    envelope: EventEnvelope<T>;
}
export type CreateEventEnvelopeParams<TPayload> = {
    eventId: string;
    eventType: string;
    eventVersion: number;
    producer: string;
    correlationId: string;
    subject: EventSubject;
    payload: TPayload;
    tenantId?: string;
    idempotencyKey?: string;
    causationId?: string;
    traceparent?: string;
    occurredAt?: Date | string;
};
export declare function createEventEnvelope<TPayload>(params: CreateEventEnvelopeParams<TPayload>): EventEnvelope<TPayload>;
