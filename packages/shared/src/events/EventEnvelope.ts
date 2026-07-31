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
  organizationId?: string;
  idempotencyKey?: string;
  causationId?: string;
  traceparent?: string;
  dataClassification?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'PII';
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
  organizationId?: string;
  idempotencyKey?: string;
  causationId?: string;
  traceparent?: string;
  dataClassification?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'PII';
  occurredAt?: Date | string;
};

export function createEventEnvelope<TPayload>(params: CreateEventEnvelopeParams<TPayload>): EventEnvelope<TPayload> {
  const occurredAt =
    params.occurredAt instanceof Date
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
    organizationId: params.organizationId,
    idempotencyKey: params.idempotencyKey,
    causationId: params.causationId,
    traceparent: params.traceparent,
    dataClassification: params.dataClassification,
    subject: params.subject,
    payload: params.payload,
  };
}
