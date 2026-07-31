import { SubmissionService } from '../src/submission.service';
import { PlacementService } from '../src/placement/placement.service';
import { PlacementOrchestrator } from '../src/placement/placement-orchestrator';
import { RfqEngine } from '../src/rfq/rfq-engine';

describe('P2 Security & Isolation Tests', () => {
  let submissionService: any;
  let placementService: any;
  let orchestrator: any;
  let rfqEngine: any;

  const brokerA = { tenantId: 'tenant-a', userId: 'user-a', roles: ['broker_agent'], correlationId: 'sec-1' };
  const brokerB = { tenantId: 'tenant-b', userId: 'user-b', roles: ['broker_agent'], correlationId: 'sec-2' };
  const insurerAdmin = { tenantId: 'tenant-a', userId: 'admin-1', roles: ['insurer_admin'], correlationId: 'sec-3' };

  function makeSubmission(tenantId: string, status = 'submitted'): any {
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
    };
  }

  function makeQuoteResponse(tenantId: string): any {
    return {
      quoteResponseId: `qresp-${tenantId}`,
      tenantId,
      quoteRequestId: `qr-${tenantId}`,
      submissionId: `sub-${tenantId}`,
      carrierOrganizationId: 'carrier-1',
      status: 'received',
      premiumAmountMinor: '500000',
      premiumCurrency: 'IRR',
      quoteSnapshot: { premium: 500000 },
      coverageSnapshot: [{ code: 'third_party', limit: 500000 }],
      commissionRateBps: 500,
      commissionAmountMinor: '25000',
      isSelected: false,
      expiresAt: new Date(Date.now() + 86400000),
    };
  }

  function makePlacement(tenantId: string, status = 'draft'): any {
    return {
      placementId: `pl-${tenantId}`,
      tenantId,
      submissionId: `sub-${tenantId}`,
      quoteResponseId: `qresp-${tenantId}`,
      carrierOrganizationId: 'carrier-1',
      brokerOrganizationId: `broker-${tenantId}`,
      status,
      bindSagaState: 'not_started',
      sagaSteps: [],
      bindAttempts: 0,
      premiumReservationId: null,
      effectiveFrom: new Date(),
      effectiveTo: new Date(Date.now() + 86400000),
    };
  }

  beforeEach(() => {
    const dataSource = {
      manager: {
        transaction: jest.fn(async (cb: any) => cb({ save: jest.fn(), create: jest.fn((_, d: any) => d) })),
      },
    };
    const audit = { record: jest.fn() };

    // Submission service with configurable repo
    const submissionRepo = {
      findOne: jest.fn().mockResolvedValue(makeSubmission('tenant-a')),
      save: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockResolvedValue([]),
    };
    const documentRepo = { findOne: jest.fn(), save: jest.fn() };
    const productClient = { getProductVersion: jest.fn().mockResolvedValue({ version: 1 }) };
    const salesClient = { checkEligibility: jest.fn().mockResolvedValue({ eligible: true }) };

    submissionService = new SubmissionService(submissionRepo, documentRepo, dataSource as any, productClient, salesClient, audit);

    // Placement service
    const quoteResponseRepo = {
      findOne: jest.fn().mockResolvedValue(makeQuoteResponse('tenant-a')),
      find: jest.fn().mockResolvedValue([makeQuoteResponse('tenant-a')]),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const placementRepo = {
      findOne: jest.fn().mockResolvedValue(makePlacement('tenant-a')),
      save: jest.fn().mockResolvedValue(undefined),
    };
    placementService = new PlacementService(placementRepo, quoteResponseRepo, submissionRepo, dataSource as any);

    // Orchestrator
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
    orchestrator = new PlacementOrchestrator(
      placementRepo, quoteResponseRepo, submissionRepo, subjectivityRepo,
      dataSource as any, connectorService, factory, billingClient, policyClient, audit,
    );

    // RFQ Engine
    const quoteRequestRepo = { create: jest.fn((d: any) => d), findOne: jest.fn(), find: jest.fn().mockResolvedValue([]) };
    const dispatcher = { dispatchToCarrier: jest.fn().mockResolvedValue({ status: 'received' }) };
    const aml = { check: jest.fn().mockResolvedValue({ passed: true, reasons: [] }) };
    const uw = { evaluate: jest.fn().mockResolvedValue({ referralRequired: false, notes: [] }) };
    rfqEngine = new RfqEngine(
      submissionRepo, quoteRequestRepo, quoteResponseRepo, subjectivityRepo,
      dataSource as any, dispatcher, aml, uw, audit,
    );
  });

  describe('Cross-tenant isolation', () => {
    it('broker A cannot see broker B submissions', async () => {
      const submissionRepo = {
        findOne: jest.fn().mockResolvedValue(makeSubmission('tenant-b')),
        save: jest.fn(),
        find: jest.fn().mockResolvedValue([]),
      };
      const documentRepo = {};
      const dataSource = { manager: { transaction: jest.fn(async (cb: any) => cb({ save: jest.fn(), create: jest.fn((_, d: any) => d) })) } };
      const productClient = { getProductVersion: jest.fn() };
      const salesClient = { checkEligibility: jest.fn() };
      const audit = { record: jest.fn() };

      const svc = new SubmissionService(submissionRepo, documentRepo as any, dataSource as any, productClient, salesClient, audit);

      await expect(svc.get(brokerA, 'sub-tenant-b')).rejects.toThrow('Cross-tenant access denied');
    });

    it('broker A cannot see broker B quote responses', async () => {
      const quoteResponseRepo = {
        findOne: jest.fn().mockResolvedValue(makeQuoteResponse('tenant-b')),
        find: jest.fn().mockResolvedValue([]),
        save: jest.fn(),
      };
      const placementRepo = { findOne: jest.fn(), save: jest.fn() };
      const submissionRepo = { findOne: jest.fn(), save: jest.fn() };
      const dataSource = { manager: { transaction: jest.fn(async (cb: any) => cb({ save: jest.fn(), create: jest.fn((_, d: any) => d) })) } };

      const svc = new PlacementService(placementRepo, quoteResponseRepo, submissionRepo, dataSource as any);

      await expect(svc.selectQuote(brokerA, 'qresp-tenant-b')).rejects.toThrow('Quote response not found');
    });

    it('broker A cannot bind broker B placement', async () => {
      const placementRepo = {
        findOne: jest.fn().mockResolvedValue(makePlacement('tenant-b')),
        save: jest.fn().mockResolvedValue(undefined),
      };
      const quoteResponseRepo = { findOne: jest.fn(), find: jest.fn(), save: jest.fn() };
      const submissionRepo = { findOne: jest.fn(), save: jest.fn() };
      const subjectivityRepo = { find: jest.fn().mockResolvedValue([]) };
      const dataSource = { manager: { transaction: jest.fn(async (cb: any) => cb({ save: jest.fn(), create: jest.fn((_, d: any) => d) })) } };
      const connectorService = { getActiveConnectorForCarrier: jest.fn().mockResolvedValue(null) };
      const factory = { getConnector: jest.fn() };
      const billingClient = { reservePremium: jest.fn(), releasePremium: jest.fn() };
      const policyClient = { createFromPlacement: jest.fn(), createProjection: jest.fn(), setUniqueCode: jest.fn() };
      const audit = { record: jest.fn() };

      const orch = new PlacementOrchestrator(
        placementRepo, quoteResponseRepo, submissionRepo, subjectivityRepo,
        dataSource as any, connectorService, factory, billingClient, policyClient, audit,
      );

      await expect(orch.bind(brokerA, 'pl-tenant-b')).rejects.toThrow('Placement not found');
    });

    it('broker A cannot create RFQ for broker B submission', async () => {
      const submissionRepo = {
        findOne: jest.fn().mockResolvedValue(makeSubmission('tenant-b')),
        save: jest.fn(),
        find: jest.fn().mockResolvedValue([]),
      };
      const quoteRequestRepo = { create: jest.fn((d: any) => d), findOne: jest.fn(), find: jest.fn() };
      const quoteResponseRepo = {};
      const subjectivityRepo = { find: jest.fn() };
      const dataSource = { manager: { transaction: jest.fn(async (cb: any) => cb({ save: jest.fn(), create: jest.fn((_, d: any) => d) })) } };
      const dispatcher = { dispatchToCarrier: jest.fn() };
      const aml = { check: jest.fn() };
      const uw = { evaluate: jest.fn() };
      const audit = { record: jest.fn() };

      const engine = new RfqEngine(
        submissionRepo, quoteRequestRepo, quoteResponseRepo, subjectivityRepo,
        dataSource as any, dispatcher, aml, uw, audit,
      );

      await expect(engine.createRequest(brokerA, 'sub-tenant-b', { carriers: ['c1'] })).rejects.toThrow(
        'Cross-tenant access denied',
      );
    });
  });

  describe('Expired quote rejection', () => {
    it('bind with expired QuoteResponse is rejected', async () => {
      const quoteResponseRepo = {
        findOne: jest.fn().mockResolvedValue({
          ...makeQuoteResponse('tenant-a'),
          expiresAt: new Date(Date.now() - 86400000), // expired yesterday
        }),
        find: jest.fn(),
        save: jest.fn(),
      };
      const placementRepo = {
        findOne: jest.fn().mockResolvedValue(makePlacement('tenant-a')),
        save: jest.fn().mockResolvedValue(undefined),
      };
      const submissionRepo = { findOne: jest.fn(), save: jest.fn() };
      const subjectivityRepo = { find: jest.fn().mockResolvedValue([]) };
      const dataSource = { manager: { transaction: jest.fn(async (cb: any) => cb({ save: jest.fn(), create: jest.fn((_, d: any) => d) })) } };
      const connectorService = { getActiveConnectorForCarrier: jest.fn().mockResolvedValue(null) };
      const factory = { getConnector: jest.fn() };
      const billingClient = { reservePremium: jest.fn().mockResolvedValue({ data: { reservationId: 'res-1' } }), releasePremium: jest.fn() };
      const policyClient = { createFromPlacement: jest.fn(), createProjection: jest.fn(), setUniqueCode: jest.fn() };
      const audit = { record: jest.fn() };

      const orch = new PlacementOrchestrator(
        placementRepo, quoteResponseRepo, submissionRepo, subjectivityRepo,
        dataSource as any, connectorService, factory, billingClient, policyClient, audit,
      );

      const result = await orch.bind(brokerA, 'pl-tenant-a');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('QUOTE_EXPIRED');
    });
  });

  describe('Unauthorized bind prevention', () => {
    it('placement without selected quote cannot be created', async () => {
      const quoteResponseRepo = {
        findOne: jest.fn().mockResolvedValue({
          ...makeQuoteResponse('tenant-a'),
          isSelected: false,
        }),
        find: jest.fn(),
        save: jest.fn(),
      };
      const placementRepo = { findOne: jest.fn(), save: jest.fn() };
      const submissionRepo = { findOne: jest.fn(), save: jest.fn() };
      const dataSource = { manager: { transaction: jest.fn(async (cb: any) => cb({ save: jest.fn(), create: jest.fn((_, d: any) => d) })) } };

      const svc = new PlacementService(placementRepo, quoteResponseRepo, submissionRepo, dataSource as any);

      await expect(svc.create(brokerA, 'qresp-tenant-a')).rejects.toThrow('Quote response not selected');
    });
  });

  describe('insurer_admin cross-tenant access', () => {
    it('insurer_admin can access cross-tenant submissions', async () => {
      const submissionRepo = {
        findOne: jest.fn().mockResolvedValue(makeSubmission('tenant-b')),
        save: jest.fn(),
        find: jest.fn().mockResolvedValue([]),
      };
      const documentRepo = {};
      const dataSource = { manager: { transaction: jest.fn(async (cb: any) => cb({ save: jest.fn(), create: jest.fn((_, d: any) => d) })) } };
      const productClient = { getProductVersion: jest.fn() };
      const salesClient = { checkEligibility: jest.fn() };
      const audit = { record: jest.fn() };

      const svc = new SubmissionService(submissionRepo, documentRepo as any, dataSource as any, productClient, salesClient, audit);

      const result = await svc.get(insurerAdmin, 'sub-tenant-b');
      expect(result.tenantId).toBe('tenant-b');
    });
  });
});
