import { RankingRule } from '../src/comparison/ranking-rule';
import { ComparisonEngine } from '../src/comparison/comparison-engine';
import { QuoteResponse } from '../src/entities/QuoteResponse';
import { QuoteRequest } from '../src/entities/QuoteRequest';

describe('RankingRule', () => {
  it('ranks by lowest premium', async () => {
    const rule = new RankingRule();
    const responses = [
      makeResponse({ premiumAmountMinor: '2000000' }),
      makeResponse({ premiumAmountMinor: '1000000' }),
      makeResponse({ premiumAmountMinor: '3000000' }),
    ];
    const ranked = await rule.rank(responses, { sortBy: 'lowest_premium' });
    expect(ranked[0].premiumAmountMinor).toBe('1000000');
    expect(ranked[1].premiumAmountMinor).toBe('2000000');
    expect(ranked[2].premiumAmountMinor).toBe('3000000');
  });

  it('ranks by best value with commission disclosure', async () => {
    const rule = new RankingRule();
    const responses = [
      makeResponse({ premiumAmountMinor: '2000000', commissionAmountMinor: '50000', markupAmountMinor: '0' }),
      makeResponse({ premiumAmountMinor: '1000000', commissionAmountMinor: '10000', markupAmountMinor: '0' }),
    ];
    const ranked = await rule.rank(responses, { sortBy: 'best_value' });
    expect(ranked[0].rankScore).toBeDefined();
    expect(ranked[1].rankScore).toBeDefined();
  });
});

describe('ComparisonEngine', () => {
  it('returns recommendation and alternatives', async () => {
    const tenantId = 't1';
    const quoteRequestId = 'qr1';
    const quoteRequest = Object.assign(new QuoteRequest(), {
      quoteRequestId,
      tenantId,
      submissionId: 's1',
    });
    const responses = [
      Object.assign(new QuoteResponse(), {
        quoteResponseId: 'q1',
        quoteRequestId,
        tenantId,
        premiumAmountMinor: '1000000',
        premiumCurrency: 'IRR',
        commissionAmountMinor: '10000',
        markupAmountMinor: '0',
        status: 'received',
        expiresAt: new Date(Date.now() + 86400000),
      } as any),
      Object.assign(new QuoteResponse(), {
        quoteResponseId: 'q2',
        quoteRequestId,
        tenantId,
        premiumAmountMinor: '2000000',
        premiumCurrency: 'IRR',
        commissionAmountMinor: '20000',
        markupAmountMinor: '0',
        status: 'received',
        expiresAt: new Date(Date.now() + 86400000),
      } as any),
    ];

    const quoteRequestRepo = {
      findOne: jest.fn().mockResolvedValue(quoteRequest),
    };
    const quoteResponseRepo = {
      find: jest.fn().mockResolvedValue(responses),
    };

    const engine = new ComparisonEngine(quoteRequestRepo as any, quoteResponseRepo as any, new RankingRule());
    const result = await engine.compare(tenantId, quoteRequestId, { sortBy: 'lowest_premium' });
    expect(result.quoteRequestId).toBe(quoteRequestId);
    expect(result.recommendation.quoteResponseId).toBe('q1');
    expect(result.alternatives.length).toBe(1);
    expect(result.alternatives[0].quoteResponseId).toBe('q2');
    expect(result.factors.sortedBy).toBe('lowest_premium');
  });
});

function makeResponse(overrides: Partial<QuoteResponse>): QuoteResponse {
  return Object.assign(new QuoteResponse(), {
    quoteResponseId: 'qrx',
    quoteRequestId: 'qr1',
    tenantId: 't1',
    premiumAmountMinor: '1000000',
    premiumCurrency: 'IRR',
    commissionAmountMinor: '0',
    commissionRateBps: 0,
    markupAmountMinor: '0',
    taxesMinor: '0',
    feesMinor: '0',
    status: 'received',
    expiresAt: new Date(Date.now() + 86400000),
    ...overrides,
  } as any);
}
