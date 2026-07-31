import { CarrierConnectorFactory } from '../src/carrier-connectors/carrier-connector.factory';
import { CarrierConnectorRegistry } from '../src/carrier-connectors/carrier-connector.registry';
import { InternalConnectorAdapter } from '../src/carrier-connectors/internal-connector.adapter';
import { SoapConnectorAdapter } from '../src/carrier-connectors/soap-connector.adapter';

describe('CarrierConnectorFactory', () => {
  const registry = new CarrierConnectorRegistry();
  const productClient = { computeQuote: jest.fn() } as any;
  const workflowClient = { startManualQuote: jest.fn() } as any;

  it('registers default adapters', () => {
    const factory = new CarrierConnectorFactory(registry, productClient, workflowClient);
    ['internal', 'rest', 'soap', 'kafka', 'manual'].forEach((t) => {
      expect(factory.getConnector(t).connectorType).toBe(t);
    });
  });

  it('throws for unknown connector type', () => {
    const factory = new CarrierConnectorFactory(registry, productClient, workflowClient);
    expect(() => factory.getConnector('unknown')).toThrow('Unsupported connector type: unknown');
  });
});

describe('Adapters', () => {
  it('internal adapter returns an error when product client is unavailable', async () => {
    const productClient = {
      computeQuote: jest.fn().mockRejectedValue(new Error('product unavailable')),
    } as any;
    const adapter = new InternalConnectorAdapter(productClient);
    const res = await adapter.requestQuote({
      submissionId: 's1',
      quoteRequestId: 'q1',
      tenantId: 't1',
      carrierOrganizationId: 'c1',
      productId: 'p1',
      productVersion: 1,
      lineOfBusiness: 'motor',
      exposure: {},
      effectiveFrom: new Date(),
      effectiveTo: new Date(Date.now() + 86400000),
      correlationId: 'x',
    } as any, {});
    expect(res.status).toBe('error');
    expect(res.errorCode).toBe('PRODUCT_QUOTE_FAILED');
  });

  it('soap adapter builds an xml envelope', () => {
    const adapter = new SoapConnectorAdapter();
    const xml = (adapter as any).buildEnvelope('GetQuote', { a: 1 }, { namespace: 'urn:example' });
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('<a>1</a>');
  });
});
