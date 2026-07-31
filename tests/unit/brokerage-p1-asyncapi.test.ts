import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const asyncApiPath = resolve(__dirname, '../../../../ecosystem/contracts/asyncapi/insurance-service/asyncapi.yaml');

describe('P1 AsyncAPI contract', () => {
  let content: string;

  it('loads the AsyncAPI file', () => {
    content = readFileSync(asyncApiPath, 'utf8');
    expect(content.length).toBeGreaterThan(0);
  });

  it('includes product and sales_network event channels', () => {
    expect(content).toContain('insurance.product.events:');
    expect(content).toContain('insurance.sales_network.events:');
  });

  it('registers required P1 product event payloads', () => {
    expect(content).toContain('const: insurance.product.created');
    expect(content).toContain('const: insurance.product.version_activated');
    expect(content).toContain('const: insurance.product.version_retired');
    expect(content).toContain('const: insurance.product.visibility_granted');
    expect(content).toContain('const: insurance.product.visibility_revoked');
    expect(content).toContain('const: insurance.product.offering_created');
    expect(content).toContain('const: insurance.product.offering_activated');
    expect(content).toContain('const: insurance.product.offering_inactivated');
  });

  it('registers required P1 sales network event payloads', () => {
    expect(content).toContain('const: insurance.sales_network.agreement_submitted');
    expect(content).toContain('const: insurance.sales_network.agreement_approved');
    expect(content).toContain('const: insurance.sales_network.agreement_rejected');
    expect(content).toContain('const: insurance.sales_network.agreement_terminated');
    expect(content).toContain('const: insurance.sales_network.agreement_returned');
  });

  it('declares operations for all P1 events', () => {
    expect(content).toContain('publishProductCreated:');
    expect(content).toContain('publishProductVersionActivated:');
    expect(content).toContain('publishProductVersionRetired:');
    expect(content).toContain('publishProductVisibilityGranted:');
    expect(content).toContain('publishProductVisibilityRevoked:');
    expect(content).toContain('publishBrokerProductOfferingCreated:');
    expect(content).toContain('publishBrokerProductOfferingActivated:');
    expect(content).toContain('publishBrokerProductOfferingInactivated:');
    expect(content).toContain('publishDistributionAgreementSubmitted:');
    expect(content).toContain('publishDistributionAgreementApproved:');
    expect(content).toContain('publishDistributionAgreementRejected:');
    expect(content).toContain('publishDistributionAgreementReturned:');
    expect(content).toContain('publishDistributionAgreementTerminated:');
  });
});
