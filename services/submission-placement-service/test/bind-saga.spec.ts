import { PlacementOrchestrator } from '../src/placement/placement-orchestrator';
import { Placement } from '../src/entities/Placement';
import { QuoteResponse } from '../src/entities/QuoteResponse';
import { Submission } from '../src/entities/Submission';
import { Subjectivity } from '../src/entities/Subjectivity';

describe('PlacementOrchestrator (Bind Saga)', () => {
  let orchestrator: PlacementOrchestrator;
  let placementRepo: any;
  let quoteResponseRepo: any;
  let submissionRepo: any;
  let subjectivityRepo: any;
  let dataSource: any;
  let connectorService: any;
  let factory: any;
  let billingClient: any;
  let policyClient: any;
  let audit: any;

  const ctx = {
    tenantId: 'tenant-1',
    userId: 'user-1',
    roles: ['broker_agent'],
    correlationId: 'corr-1',
    authHeader: 'Bearer token',
  };

  function mockPlacement(overrides: Partial<Placement> = {}): Placement {
    return {
      placementId: 'pl-1',
      tenantId: 'tenant-1',
      submissionId: 'sub-1',
      quoteRequestId: 'qr-1',
      quoteResponseId: 'qresp-1',
      carrierOrganizationId: 'carrier-1',
      brokerOrganizationId: 'broker-1',
      brokerLicenseId: null,
      status: 'draft',
      bindSagaState: 'not_started',
      policyId: null,
      policyNumber: null,
      premiumReservationId: null,
      subjectivitiesStatus: 'pending',
      sagaSteps: [],
      bindAttempts: 0,
      lastError: null,
      effectiveFrom: new Date(),
      effectiveTo: new Date(Date.now() + 86400000),
      idempotencyKey: null,
      createdBy: 'user-1',
      version: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as any as Placement;
  }

  function mockQuoteResponse(): QuoteResponse {
    return {
      quoteResponseId: 'qresp-1',
      tenantId: 'tenant-1',
      quoteRequestId: 'qr-1',
      submissionId: 'sub-1',
      carrierOrganizationId: 'carrier-1',
      carrierConnectorId: null,
      status: 'received',
      receivedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      premiumAmountMinor: '500000',
      premiumCurrency: 'IRR',
      basePremiumMinor: null,
      taxesMinor: null,
      feesMinor: null,
      deductibleAmountMinor: null,
      coverageSnapshot: [{ code: 'third_party', limit: 500000 }],
      quoteSnapshot: { premium: 500000 },
      rankScore: null,
      comparisonFactors: null,
      commissionRateBps: 500,
      commissionAmountMinor: '25000',
      markupAmountMinor: '0',
      isSelected: true,
      selectedAt: new Date(),
      idempotencyKey: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any as QuoteResponse;
  }

  beforeEach(() => {
    const savedPlacement = mockPlacement();
    placementRepo = {
      findOne: jest.fn().mockResolvedValue(savedPlacement),
      save: jest.fn(async (p: any) => { Object.assign(savedPlacement, p); return savedPlacement; }),
    };
    quoteResponseRepo = {
      findOne: jest.fn().mockResolvedValue(mockQuoteResponse()),
    };
    submissionRepo = {
      findOne: jest.fn().mockResolvedValue({
        submissionId: 'sub-1',
        tenantId: 'tenant-1',
        partyId: 'party-1',
        lineOfBusiness: 'motor',
        status: 'selected',
      }),
      save: jest.fn().mockResolvedValue(undefined),
    };
    subjectivityRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    const manager = {
      save: jest.fn().mockResolvedValue(undefined),
    };
    dataSource = {
      manager: {
        transaction: jest.fn(async (cb: any) => cb(manager)),
      },
    };

    connectorService = {
      getActiveConnectorForCarrier: jest.fn().mockResolvedValue(null),
    };

    factory = {
      getConnector: jest.fn(),
    };

    billingClient = {
      reservePremium: jest.fn().mockResolvedValue({ data: { reservationId: 'res-1' } }),
      releasePremium: jest.fn().mockResolvedValue(undefined),
    };

    policyClient = {
      createFromPlacement: jest.fn().mockResolvedValue({
        data: { policyId: 'pol-1', policyNumber: 'PN-001' },
      }),
      createProjection: jest.fn().mockResolvedValue(undefined),
      setUniqueCode: jest.fn().mockResolvedValue(undefined),
    };

    audit = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    orchestrator = new PlacementOrchestrator(
      placementRepo,
      quoteResponseRepo,
      submissionRepo,
      subjectivityRepo,
      dataSource,
      connectorService,
      factory,
      billingClient,
      policyClient,
      audit,
    );
  });

  it('binds successfully with policy projection creation', async () => {
    const result = await orchestrator.bind(ctx, 'pl-1');

    expect(result.success).toBe(true);
    expect(result.placement?.status).toBe('completed');
    expect(result.placement?.policyId).toBe('pol-1');
    expect(result.placement?.policyNumber).toBe('PN-001');
    expect(result.placement?.bindSagaState).toBe('completed');
    expect(billingClient.reservePremium).toHaveBeenCalled();
    expect(policyClient.createFromPlacement).toHaveBeenCalled();
    expect(policyClient.createProjection).toHaveBeenCalled();
  });

  it('fails with compensating action when premium reservation fails', async () => {
    billingClient.reservePremium = jest.fn().mockRejectedValue(new Error('billing unavailable'));

    const result = await orchestrator.bind(ctx, 'pl-1');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('RESERVE_FAILED');
    expect(result.placement?.status).toBe('bind_failed');
  });

  it('fails when subjectivities are pending', async () => {
    subjectivityRepo.find = jest.fn().mockResolvedValue([
      { subjectivityId: 'subj-1', status: 'pending', placementId: 'pl-1', tenantId: 'tenant-1' },
    ]);

    const result = await orchestrator.bind(ctx, 'pl-1');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('SUBJECTIVITIES_PENDING');
    expect(result.placement?.status).toBe('bind_failed');
  });

  it('fails with compensating action when policy creation fails', async () => {
    policyClient.createFromPlacement = jest.fn().mockRejectedValue(new Error('policy service down'));

    const result = await orchestrator.bind(ctx, 'pl-1');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('POLICY_CREATE_FAILED');
    expect(result.placement?.status).toBe('bind_failed');
    expect(billingClient.releasePremium).toHaveBeenCalled();
  });

  it('fails when carrier bind returns failed status', async () => {
    connectorService.getActiveConnectorForCarrier = jest.fn().mockResolvedValue({
      connectorType: 'rest',
      config: { baseUrl: 'http://example.com' },
      connectorId: 'conn-1',
    });
    factory.getConnector = jest.fn().mockReturnValue({
      bind: jest.fn().mockResolvedValue({ status: 'failed', errorCode: 'CARRIER_REJECTED', errorMessage: 'Risk too high' }),
    });

    const result = await orchestrator.bind(ctx, 'pl-1');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('CARRIER_REJECTED');
    expect(billingClient.releasePremium).toHaveBeenCalled();
  });

  it('retries a failed placement', async () => {
    placementRepo.findOne = jest.fn().mockResolvedValue(mockPlacement({ status: 'bind_failed', bindAttempts: 1 }));
    billingClient.reservePremium = jest.fn().mockResolvedValue({ data: { reservationId: 'res-2' } });

    const result = await orchestrator.retry(ctx, 'pl-1');

    expect(result.success).toBe(true);
    expect(result.placement?.bindAttempts).toBe(2);
  });

  it('rejects retry for non-failed placement', async () => {
    placementRepo.findOne = jest.fn().mockResolvedValue(mockPlacement({ status: 'completed' }));

    await expect(orchestrator.retry(ctx, 'pl-1')).rejects.toThrow('Only failed placements can be retried');
  });

  it('cancels a placement and releases premium', async () => {
    placementRepo.findOne = jest.fn().mockResolvedValue(
      mockPlacement({ status: 'bind_failed', premiumReservationId: 'res-1' }),
    );

    const result = await orchestrator.cancel(ctx, 'pl-1');

    expect(result.status).toBe('cancelled');
    expect(billingClient.releasePremium).toHaveBeenCalledWith('tenant-1', 'res-1', 'Bearer token');
  });

  it('rejects cancel for completed placement', async () => {
    placementRepo.findOne = jest.fn().mockResolvedValue(mockPlacement({ status: 'completed' }));

    await expect(orchestrator.cancel(ctx, 'pl-1')).rejects.toThrow('Completed placement cannot be cancelled');
  });

  it('saga steps are recorded with name, status, and timestamp', async () => {
    const result = await orchestrator.bind(ctx, 'pl-1');

    const steps = result.placement?.sagaSteps || [];
    expect(steps.length).toBeGreaterThanOrEqual(5);
    expect(steps.map((s: any) => s.name)).toEqual(
      expect.arrayContaining([
        'reserve_premium',
        'fulfill_subjectivities',
        'confirm_bind',
        'create_policy',
        'project_policy',
      ]),
    );
    expect(steps.every((s: any) => s.status === 'completed' && s.at)).toBe(true);
  });
});
