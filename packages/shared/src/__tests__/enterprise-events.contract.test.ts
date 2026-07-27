import {
  BorderauxGeneratedEnvelopeV1,
  CededCalculatedEnvelopeV1,
  ClaimDocumentsAttachedEnvelopeV1,
  ClaimPaymentRequestedEnvelopeV1,
  ComplaintSlaBreachedEnvelopeV1,
  FraudCaseEscalatedEnvelopeV1,
  RecoveryIdentifiedEnvelopeV1,
  RecoveryReceivedEnvelopeV1,
} from '../schema/EventContracts';

describe('Enterprise event contracts (v1)', () => {
  it('validates ClaimDocumentsAttached v1', () => {
    const env = {
      eventId: '11111111-1111-1111-1111-111111111111',
      eventType: 'ClaimDocumentsAttached',
      eventVersion: 1,
      occurredAt: '2026-01-01T00:00:00.000Z',
      producer: 'document-service',
      correlationId: 'c1',
      subject: {
        claimId: 'c-1',
        documentIds: '["d1","d2"]',
      },
      payload: {
        documents: [
          { documentId: 'd1', type: 'invoice', source: 'upload', storageRef: 's3://bucket/key1' },
          { documentId: 'd2', type: 'photo', source: 'link', storageRef: 's3://bucket/key2' },
        ],
      },
    };

    expect(() => ClaimDocumentsAttachedEnvelopeV1.parse(env)).not.toThrow();
  });

  it('validates RecoveryIdentified v1', () => {
    const env = {
      eventId: '22222222-2222-2222-2222-222222222222',
      eventType: 'RecoveryIdentified',
      eventVersion: 1,
      occurredAt: '2026-01-01T00:00:00.000Z',
      producer: 'reinsurance-service',
      correlationId: 'c2',
      subject: {
        claimId: 'cl-1',
        contractId: 'tr-1',
        recoveryId: 'rc-1',
      },
      payload: {
        recoverableAmount: 1000,
        currency: 'IRR',
        counterpartyId: 'ReinsurerA',
        identifiedAt: '2026-01-01T00:00:00.000Z',
      },
    };

    expect(() => RecoveryIdentifiedEnvelopeV1.parse(env)).not.toThrow();
  });

  it('validates RecoveryReceived v1', () => {
    const env = {
      eventId: '33333333-3333-3333-3333-333333333333',
      eventType: 'RecoveryReceived',
      eventVersion: 1,
      occurredAt: '2026-01-01T00:00:00.000Z',
      producer: 'reinsurance-service',
      correlationId: 'c3',
      subject: {
        claimId: 'cl-1',
        contractId: 'tr-1',
        recoveryId: 'rc-1',
      },
      payload: {
        receivedAt: '2026-01-01T00:00:00.000Z',
        amount: 500,
        currency: 'IRR',
        referenceNumber: null,
      },
    };

    expect(() => RecoveryReceivedEnvelopeV1.parse(env)).not.toThrow();
  });

  it('validates CededCalculated v1', () => {
    const env = {
      eventId: '44444444-4444-4444-4444-444444444444',
      eventType: 'CededCalculated',
      eventVersion: 1,
      occurredAt: '2026-01-01T00:00:00.000Z',
      producer: 'reinsurance-service',
      correlationId: 'c4',
      subject: {
        contractId: 'tr-1',
        policyId: 'pol-1',
      },
      payload: {
        calculationBasis: 'policy',
        grossAmount: 100000,
        cededAmount: 25000,
        retainedAmount: 75000,
        currency: 'IRR',
        counterpartyId: 'ReinsurerA',
      },
    };

    expect(() => CededCalculatedEnvelopeV1.parse(env)).not.toThrow();
  });

  it('validates BorderauxGenerated v1', () => {
    const env = {
      eventId: '55555555-5555-5555-5555-555555555555',
      eventType: 'BorderauxGenerated',
      eventVersion: 1,
      occurredAt: '2026-01-01T00:00:00.000Z',
      producer: 'reinsurance-service',
      correlationId: 'c5',
      subject: {
        borderauxId: 'st-1',
        contractId: 'tr-1',
      },
      payload: {
        periodStart: '2026-01-01T00:00:00.000Z',
        periodEnd: '2026-01-31T00:00:00.000Z',
        itemsCount: 10,
        documentId: null,
      },
    };

    expect(() => BorderauxGeneratedEnvelopeV1.parse(env)).not.toThrow();
  });

  it('validates FraudCaseEscalated v1', () => {
    const env = {
      eventId: '66666666-6666-6666-6666-666666666666',
      eventType: 'FraudCaseEscalated',
      eventVersion: 1,
      occurredAt: '2026-01-01T00:00:00.000Z',
      producer: 'fraud-service',
      correlationId: 'c6',
      subject: {
        fraudCaseId: '33333333-3333-3333-3333-333333333333',
        claimId: '11111111-1111-1111-1111-111111111111',
      },
      payload: {
        fraudCaseId: '33333333-3333-3333-3333-333333333333',
        claimId: '11111111-1111-1111-1111-111111111111',
        claimNumber: 'CLM-TEST-1',
        escalatedAt: '2026-01-01T00:00:00.000Z',
        toUnit: 'siu',
        reasonCodes: ['MANUAL_ESCALATION'],
        requiresHumanApproval: true,
        notes: 'needs SIU review',
      },
    };

    expect(() => FraudCaseEscalatedEnvelopeV1.parse(env)).not.toThrow();
  });

  it('validates ComplaintSlaBreached v1', () => {
    const env = {
      eventId: '77777777-7777-7777-7777-777777777777',
      eventType: 'ComplaintSlaBreached',
      eventVersion: 1,
      occurredAt: '2026-01-01T00:00:00.000Z',
      producer: 'complaints-service',
      correlationId: 'c7',
      subject: {
        complaintId: '22222222-2222-2222-2222-222222222222',
        claimId: '11111111-1111-1111-1111-111111111111',
      },
      payload: {
        complaintId: '22222222-2222-2222-2222-222222222222',
        complaintType: 'delay',
        status: 'open',
        policyId: null,
        claimId: '11111111-1111-1111-1111-111111111111',
        policyNumber: null,
        assignedTo: null,
        slaFirstResponseDueAt: null,
        slaResolutionDueAt: '2025-12-31T00:00:00.000Z',
        createdAt: '2025-12-01T00:00:00.000Z',
        updatedAt: '2025-12-15T00:00:00.000Z',
        tenantId: null,
        actorUserId: null,
        breachedAt: '2026-01-01T00:00:00.000Z',
        slaHours: 72,
        elapsedHours: 10,
      },
    };

    expect(() => ComplaintSlaBreachedEnvelopeV1.parse(env)).not.toThrow();
  });

  it('validates ClaimPaymentRequested v1', () => {
    const env = {
      eventId: '88888888-8888-8888-8888-888888888888',
      eventType: 'ClaimPaymentRequested',
      eventVersion: 1,
      occurredAt: '2026-01-01T00:00:00.000Z',
      producer: 'claims-service',
      correlationId: 'c8',
      subject: {
        claimId: '11111111-1111-1111-1111-111111111111',
        claimNumber: 'CLM-TEST-2',
        policyId: '22222222-2222-2222-2222-222222222222',
      },
      payload: {
        claimId: '11111111-1111-1111-1111-111111111111',
        claimNumber: 'CLM-TEST-2',
        policyId: '22222222-2222-2222-2222-222222222222',
        approvedAmount: 1500000,
        requestedAt: '2026-01-01T00:00:00.000Z',
      },
    };

    expect(() => ClaimPaymentRequestedEnvelopeV1.parse(env)).not.toThrow();
  });
});
