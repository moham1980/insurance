export type FraudCaseEscalatedEvent = {
  eventId: string;
  eventType: 'FraudCaseEscalated';
  eventVersion: 1;
  occurredAt: string;
  producer: string;
  correlationId: string;
  subject: {
    fraudCaseId: string;
    claimId: string;
  };
  payload: {
    fraudCaseId: string;
    claimId: string;
    claimNumber?: string;
    escalatedAt?: string;
    toUnit: 'siu' | 'legal' | string;
    reasonCodes?: string[];
    requiresHumanApproval?: boolean;
    notes?: string | null;
  };
};

export type ComplaintSlaBreachedEvent = {
  eventId: string;
  eventType: 'ComplaintSlaBreached';
  eventVersion: 1;
  occurredAt: string;
  producer: string;
  correlationId: string;
  subject: {
    complaintId: string;
    policyId?: string;
    claimId?: string;
  };
  payload: {
    complaintId: string;
    complaintType?: string;
    status?: string;
    policyId?: string | null;
    claimId?: string | null;
    assignedTo?: string | null;
    slaFirstResponseDueAt?: string | null;
    slaResolutionDueAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
    breachedAt: string;
    slaHours?: number | null;
    elapsedHours: number;
  };
};
