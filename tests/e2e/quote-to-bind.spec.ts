import { SubmissionService } from '../../services/submission-placement-service/src/submission.service';
import { PlacementService } from '../../services/submission-placement-service/src/placement/placement.service';
import { PlacementOrchestrator } from '../../services/submission-placement-service/src/placement/placement-orchestrator';
import { RfqEngine } from '../../services/submission-placement-service/src/rfq/rfq-engine';
import { ComparisonEngine } from '../../services/submission-placement-service/src/comparison/comparison-engine';
import { RankingRule } from '../../services/submission-placement-service/src/comparison/ranking-rule';
import { Submission } from '../../services/submission-placement-service/src/entities/Submission';
import { QuoteResponse } from '../../services/submission-placement-service/src/entities/QuoteResponse';
import { QuoteRequest } from '../../services/submission-placement-service/src/entities/QuoteRequest';
import { Placement } from '../../services/submission-placement-service/src/entities/Placement';
import { Subjectivity } from '../../services/submission-placement-service/src/entities/Subjectivity';

describe('E2E: Quote-to-Bind Happy Path', () => {
  let submissionService: any;
  let placementService: any;
  let orchestrator: any;
  let rfqEngine: any;
  let comparisonEngine: any;

  const tenantA = { tenantId: 'tenant-a', userId: 'user-a', roles: ['broker_agent'], correlationId: 'e2e-1' };
  const tenantB = { tenantId: 'tenant-b', userId: 'user-b', roles: ['broker_agent'], correlationId: 'e2e-2' };

  function makeSubmission(tenantId: string, status = 'draft'): Submission {
    return {
      submissionId: `sub-${tenantId}`,
      tenantId,
      brokerOrganizationId: `broker-${tenantId}`,
      partyId: `party-${tenantId}`,
      productId: 'prod-1',
      productVersion: 1,
      lineOfBusiness: 'motor',
      status,
      exposure: { vehicleValue: 100000 },
      effectiveFrom: new Date(),
      effectiveTo: new Date(Date.now() + 86400000),
    } as any as Submission;
  }

  function makeQuoteResponse(overrides: Partial<QuoteResponse> = {}): QuoteResponse {
    return {
      quoteResponseId: 'qresp-1',
      tenantId: 'tenant-a',
      quoteRequestId: 'qr-1',
      submissionId: 'sub-tenant-a',
      carrierOrganizationId: 'carrier-1',
      status: 'received',
      premiumAmountMinor: '500000',
      premiumCurrency: 'IRR',
      quoteSnapshot: { premium: 500000 },
      coverageSnapshot: [{ code: 'third_party', limit: 500000 }],
      commissionRateBps: 500,
      commissionAmountMinor: '25000',
      markupAmountMinor: '0',
      isSelected: false,
      expiresAt: new Date(Date.now() + 86400000),
      ...overrides,
    } as any as QuoteResponse;
  }

  beforeEach(() => {
    const submissionRepo = {
      findOne: jest.fn().mockResolvedValue(makeSubmission('tenant-a', 'submitted')),
      save: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockResolvedValue([]),
    };
    const documentRepo = { findOne: jest.fn(), save: jest.fn() };
    const dataSource = {
      manager: {
        transaction: jest.fn(async (cb: any) => cb({ save: jest.fn(), create: jest.fn((_, d) => d) })),
      },
    };
    const productClient = { getProductVersion: jest.fn().mockResolvedValue({ version: 1, lineOfBusiness: 'motor' }) };
    const salesClient = { checkEligibility: jest.fn().mockResolvedValue({ eligible: true }) };
    const audit = { record: jest.fn() };

    submissionService = new SubmissionService(submissionRepo, documentRepo, dataSource as any, productClient, salesClient, audit);

    const quoteResponseRepo = {
      findOne: jest.fn().mockResolvedValue(makeQuoteResponse({ isSelected: true })),
      find: jest.fn().mockResolvedValue([makeQuoteResponse()]),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const placementRepo = {
      findOne: jest.fn().mockResolvedValue({
        placementId: 'pl-1',
        tenantId: 'tenant-a',
        submissionId: 'sub-tenant-a',
        quoteResponseId: 'qresp-1',
        carrierOrganizationId: 'carrier-1',
        brokerOrganizationId: 'broker-tenant-a',
        status: 'draft',
        bindSagaState: 'not_started',
        sagaSteps: [],
        bindAttempts: 0,
        premiumReservationId: null,
        effectiveFrom: new Date(),
        effectiveTo: new Date(Date.now() + 86400000),
      }),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const subjectivityRepo = { find: jest.fn().mockResolvedValue([]) };
    const connectorService = { getActiveConnectorForCarrier: jest.fn().mockResolvedValue(null) };
    const factory = { getConnector: jest.fn() };
    const billingClient = {
      reservePremium: jest.fn().mockResolvedValue({ data: { reservationId: 'res-1' } }),
      releasePremium: jest.fn().mockResolvedValue(undefined),
    };
    const policyClient = {
      createFromPlacement: jest.fn().mockResolvedValue({ data: { policyId: 'pol-1', policyNumber: 'PN-001' } }),
      createProjection: jest.fn().mockResolvedValue(undefined),
      setUniqueCode: jest.fn().mockResolvedValue(undefined),
    };

    placementService = new PlacementService(placementRepo, quoteResponseRepo, submissionRepo, dataSource as any);
    orchestrator = new PlacementOrchestrator(
      placementRepo, quoteResponseRepo, submissionRepo, subjectivityRepo,
      dataSource as any, connectorService, factory, billingClient, policyClient, audit,
    );

    const quoteRequestRepo = { create: jest.fn((d) => d), findOne: jest.fn(), find: jest.fn().mockResolvedValue([]) };
    const dispatcher = {
      dispatchToCarrier: jest.fn().mockResolvedValue({
        status: 'received',
        carrierOrganizationId: 'carrier-1',
        premiumAmountMinor: '500000',
        premiumCurrency: 'IRR',
        quoteSnapshot: { premium: 500000 },
        coverageSnapshot: [{ code: 'third_party', limit: 500000 }],
        commissionRateBps: 500,
        commissionAmountMinor: '25000',
      }),
    };
    const aml = { check: jest.fn().mockResolvedValue({ passed: true, reasons: [] }) };
    const uw = { evaluate: jest.fn().mockResolvedValue({ referralRequired: false, notes: [] }) };

    rfqEngine = new RfqEngine(
      submissionRepo, quoteRequestRepo, quoteResponseRepo, subjectivityRepo,
      dataSource as any, dispatcher, aml, uw, audit,
    );

    const rankingRule = new RankingRule();
    comparisonEngine = new ComparisonEngine(quoteRequestRepo, quoteResponseRepo, rankingRule);
  });

  it('happy path: submission → RFQ → compare → select → bind → policy projection', async () => {
    // 1. Create submission (already mocked as submitted)
    const submission = await submissionService.get(tenantA, 'sub-tenant-a');
    expect(submission.status).toBe('submitted');

    // 2. RFQ
    const rfqResult = await rfqEngine.createRequest(tenantA, 'sub-tenant-a', { carriers: ['carrier-1'] });
    expect(rfqResult).toBeDefined();

    // 3. Compare quotes
    const comparison = await comparisonEngine.compare('tenant-a', 'qr-1', { sortBy: 'lowest_premium' });
    expect(comparison).toBeDefined();

    // 4. Select quote
    const selected = await placementService.selectQuote(tenantA, 'qresp-1');
    expect(selected).toBeDefined();

    // 5. Create placement
    const placement = await placementService.create(tenantA, 'qresp-1', 'idem-1');
    expect(placement.status).toBe('draft');

    // 6. Bind
    const bindResult = await orchestrator.bind(tenantA, 'pl-1');
    expect(bindResult.success).toBe(true);
    expect(bindResult.placement.status).toBe('completed');
    expect(bindResult.policyId).toBe('pol-1');
  });

  it('failure path: bind rejected by carrier → placement cancelled → refund', async () => {
    // Override billing to simulate failure at carrier bind step
    const connectorService = { getActiveConnectorForCarrier: jest.fn().mockResolvedValue({ connectorType: 'rest', config: {}, connectorId: 'c1' }) };
    const factory = {
      getConnector: jest.fn().mockReturnValue({
        bind: jest.fn().mockResolvedValue({ status: 'failed', errorCode: 'CARRIER_REJECTED', errorMessage: 'Risk too high' }),
      }),
    };
    const billingClient = {
      reservePremium: jest.fn().mockResolvedValue({ data: { reservationId: 'res-1' } }),
      releasePremium: jest.fn().mockResolvedValue(undefined),
    };
    const policyClient = {
      createFromPlacement: jest.fn(),
      createProjection: jest.fn(),
      setUniqueCode: jest.fn(),
    };
    const audit = { record: jest.fn() };
    const placementRepo = {
      findOne: jest.fn().mockResolvedValue({
        placementId: 'pl-1',
        tenantId: 'tenant-a',
        submissionId: 'sub-tenant-a',
        quoteResponseId: 'qresp-1',
        carrierOrganizationId: 'carrier-1',
        brokerOrganizationId: 'broker-tenant-a',
        status: 'draft',
        bindSagaState: 'not_started',
        sagaSteps: [],
        bindAttempts: 0,
        premiumReservationId: null,
        effectiveFrom: new Date(),
        effectiveTo: new Date(Date.now() + 86400000),
      }),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const subjectivityRepo = { find: jest.fn().mockResolvedValue([]) };
    const dataSource = {
      manager: {
        transaction: jest.fn(async (cb: any) => cb({ save: jest.fn(), create: jest.fn((_, d) => d) })),
      },
    };

    const failingOrchestrator = new PlacementOrchestrator(
      placementRepo, { findOne: jest.fn().mockResolvedValue(makeQuoteResponse()) },
      { findOne: jest.fn().mockResolvedValue(makeSubmission('tenant-a')), save: jest.fn() },
      subjectivityRepo, dataSource as any, connectorService, factory, billingClient, policyClient, audit,
    );

    const result = await failingOrchestrator.bind(tenantA, 'pl-1');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('CARRIER_REJECTED');
    expect(billingClient.releasePremium).toHaveBeenCalled();
  });

  it('multi-tenant isolation: broker A cannot see broker B submissions', async () => {
    // Tenant A submission
    const submissionRepo = {
      findOne: jest.fn().mockResolvedValue(makeSubmission('tenant-b', 'submitted')),
      save: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };
    const documentRepo = {};
    const dataSource = { manager: { transaction: jest.fn(async (cb: any) => cb({ save: jest.fn(), create: jest.fn((_, d) => d) })) } };
    const productClient = { getProductVersion: jest.fn() };
    const salesClient = { checkEligibility: jest.fn() };
    const audit = { record: jest.fn() };

    const isolatedService = new SubmissionService(submissionRepo, documentRepo as any, dataSource as any, productClient, salesClient, audit);

    // Tenant A trying to access Tenant B's submission
    await expect(isolatedService.get(tenantA, 'sub-tenant-b')).rejects.toThrow('Cross-tenant access denied');
  });
});
