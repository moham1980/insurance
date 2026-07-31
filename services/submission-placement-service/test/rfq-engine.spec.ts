import { RfqEngine } from '../src/rfq/rfq-engine';
import { QuoteDispatcher } from '../src/rfq/quote-dispatcher';
import { AmlCheckService } from '../src/rfq/aml-check.service';
import { UnderwritingReferral } from '../src/rfq/underwriting-referral';
import { Submission } from '../src/entities/Submission';
import { QuoteRequest } from '../src/entities/QuoteRequest';
import { QuoteResponse } from '../src/entities/QuoteResponse';
import { Subjectivity } from '../src/entities/Subjectivity';
import { QuoteError } from '../src/entities/QuoteError';

describe('RfqEngine', () => {
  let engine: RfqEngine;
  let submissionRepo: any;
  let quoteRequestRepo: any;
  let quoteResponseRepo: any;
  let subjectivityRepo: any;
  let dataSource: any;
  let dispatcher: any;
  let aml: any;
  let uw: any;
  let audit: any;

  const ctx = {
    tenantId: 'tenant-1',
    userId: 'user-1',
    roles: ['broker_agent'],
    correlationId: 'corr-1',
    authHeader: 'Bearer token',
  };

  function mockSubmission(overrides: Partial<Submission> = {}): Submission {
    return {
      submissionId: 'sub-1',
      tenantId: 'tenant-1',
      brokerOrganizationId: 'broker-1',
      partyId: 'party-1',
      productId: 'prod-1',
      productVersion: 1,
      lineOfBusiness: 'motor',
      status: 'submitted',
      exposure: { vehicleValue: 100000 },
      requestedDeductibles: null,
      documents: null,
      effectiveFrom: new Date(),
      effectiveTo: new Date(Date.now() + 86400000),
      territory: null,
      distributionAgreementId: null,
      metadata: null,
      idempotencyKey: null,
      createdBy: 'user-1',
      version: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      brokerTenantId: null,
      brokerLicenseId: null,
    } as any as Submission;
  }

  beforeEach(() => {
    submissionRepo = {
      findOne: jest.fn().mockResolvedValue(mockSubmission()),
    };
    quoteRequestRepo = {
      create: jest.fn((data) => data),
      findOne: jest.fn().mockResolvedValue(null),
    };
    quoteResponseRepo = {};
    subjectivityRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    const manager = {
      save: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((_, data) => data),
      findOne: jest.fn().mockResolvedValue({
        quoteRequestId: 'qr-1',
        quoteCount: 0,
        carriersResponded: [],
        amlSnapshot: { passed: true },
        underwritingSnapshot: { referralRequired: false },
        status: 'in_progress',
      }),
    };
    dataSource = {
      manager: {
        transaction: jest.fn(async (cb: any) => cb(manager)),
      },
    };

    dispatcher = {
      dispatchToCarrier: jest.fn().mockResolvedValue({
        status: 'received',
        carrierOrganizationId: 'carrier-1',
        quoteRequestId: 'qr-1',
        submissionId: 'sub-1',
        tenantId: 'tenant-1',
        premiumAmountMinor: '500000',
        premiumCurrency: 'IRR',
        quoteSnapshot: { premium: 500000 },
      }),
    };

    aml = {
      check: jest.fn().mockResolvedValue({ passed: true, riskScore: 0.1, reasons: [] }),
    };

    uw = {
      evaluate: jest.fn().mockResolvedValue({ referralRequired: false, notes: [] }),
    };

    audit = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    engine = new RfqEngine(
      submissionRepo,
      quoteRequestRepo,
      quoteResponseRepo,
      subjectivityRepo,
      dataSource,
      dispatcher,
      aml,
      uw,
      audit,
    );
  });

  it('creates an RFQ for a single carrier successfully', async () => {
    const result = await engine.createRequest(ctx, 'sub-1', {
      carriers: ['carrier-1'],
    });

    expect(result).toBeDefined();
    expect(result.status).toBe('in_progress');
    expect(result.carriersRequested).toEqual(['carrier-1']);
    expect(aml.check).toHaveBeenCalledWith('tenant-1', 'party-1', { vehicleValue: 100000 }, 'Bearer token');
    expect(uw.evaluate).toHaveBeenCalled();
    expect(dispatcher.dispatchToCarrier).toHaveBeenCalled();
  });

  it('rejects RFQ for submission in wrong state', async () => {
    submissionRepo.findOne = jest.fn().mockResolvedValue(mockSubmission({ status: 'draft' }));

    await expect(engine.createRequest(ctx, 'sub-1', { carriers: ['c1'] })).rejects.toThrow(
      'Submission is not in a valid state for RFQ',
    );
  });

  it('rejects cross-tenant RFQ', async () => {
    submissionRepo.findOne = jest.fn().mockResolvedValue(mockSubmission({ tenantId: 'other-tenant' }));

    await expect(engine.createRequest(ctx, 'sub-1', { carriers: ['c1'] })).rejects.toThrow(
      'Cross-tenant access denied',
    );
  });

  it('creates subjectivity when AML check fails', async () => {
    aml.check = jest.fn().mockResolvedValue({ passed: false, riskScore: 0.9, reasons: ['high_risk_party'] });

    const savedEntities: any[] = [];
    const manager = {
      save: jest.fn(async (entity: any) => {
        savedEntities.push(entity);
        return entity;
      }),
      create: jest.fn((_, data) => data),
      findOne: jest.fn().mockResolvedValue({
        quoteRequestId: 'qr-1',
        quoteCount: 0,
        carriersResponded: [],
        amlSnapshot: { passed: false },
        underwritingSnapshot: { referralRequired: false },
        status: 'in_progress',
      }),
    };
    dataSource.manager.transaction = jest.fn(async (cb: any) => cb(manager));

    await engine.createRequest(ctx, 'sub-1', { carriers: ['carrier-1'] });

    const subjectivities = savedEntities.filter((e) => e.kind === 'underwriting');
    expect(subjectivities.length).toBeGreaterThanOrEqual(1);
    expect(subjectivities[0].description).toContain('AML');
  });

  it('creates subjectivity when underwriting referral is required', async () => {
    uw.evaluate = jest.fn().mockResolvedValue({ referralRequired: true, notes: ['high_exposure'] });

    const savedEntities: any[] = [];
    const manager = {
      save: jest.fn(async (entity: any) => {
        savedEntities.push(entity);
        return entity;
      }),
      create: jest.fn((_, data) => data),
      findOne: jest.fn().mockResolvedValue({
        quoteRequestId: 'qr-1',
        quoteCount: 0,
        carriersResponded: [],
        amlSnapshot: { passed: true },
        underwritingSnapshot: { referralRequired: true },
        status: 'in_progress',
      }),
    };
    dataSource.manager.transaction = jest.fn(async (cb: any) => cb(manager));

    await engine.createRequest(ctx, 'sub-1', { carriers: ['carrier-1'] });

    const subjectivities = savedEntities.filter(
      (e) => e.kind === 'underwriting' && e.description?.includes('Underwriting referral'),
    );
    expect(subjectivities.length).toBeGreaterThanOrEqual(1);
  });

  it('handles multiple carriers with one timeout', async () => {
    dispatcher.dispatchToCarrier = jest.fn()
      .mockResolvedValueOnce({
        status: 'received',
        carrierOrganizationId: 'carrier-1',
        quoteRequestId: 'qr-1',
        submissionId: 'sub-1',
        tenantId: 'tenant-1',
        premiumAmountMinor: '500000',
        premiumCurrency: 'IRR',
        quoteSnapshot: { premium: 500000 },
      })
      .mockResolvedValueOnce({
        status: 'error',
        carrierOrganizationId: 'carrier-2',
        quoteRequestId: 'qr-1',
        submissionId: 'sub-1',
        tenantId: 'tenant-1',
        premiumAmountMinor: '0',
        premiumCurrency: 'IRR',
        errorCode: 'TIMEOUT',
        errorMessage: 'Timeout after 30000ms',
      });

    const result = await engine.createRequest(ctx, 'sub-1', {
      carriers: ['carrier-1', 'carrier-2'],
    });

    expect(result).toBeDefined();
    expect(dispatcher.dispatchToCarrier).toHaveBeenCalledTimes(2);
  });

  it('getRequest returns quote request for same tenant', async () => {
    quoteRequestRepo.findOne = jest.fn().mockResolvedValue({
      quoteRequestId: 'qr-1',
      tenantId: 'tenant-1',
      status: 'completed',
    });

    const result = await engine.getRequest(ctx, 'qr-1');
    expect(result.quoteRequestId).toBe('qr-1');
  });

  it('getRequest rejects cross-tenant access', async () => {
    quoteRequestRepo.findOne = jest.fn().mockResolvedValue({
      quoteRequestId: 'qr-1',
      tenantId: 'other-tenant',
      status: 'completed',
    });

    await expect(engine.getRequest(ctx, 'qr-1')).rejects.toThrow('Cross-tenant access denied');
  });

  it('listRequests filters by tenant', async () => {
    quoteRequestRepo.find = jest.fn().mockResolvedValue([]);
    await engine.listRequests(ctx, { submissionId: 'sub-1' });
    expect(quoteRequestRepo.find).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', submissionId: 'sub-1' },
      order: { createdAt: 'DESC' },
    });
  });
});
