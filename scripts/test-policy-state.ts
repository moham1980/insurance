import { createGatewayClient } from '../tests/helpers/api-client';
import { JwtFactory } from '../tests/helpers/jwt-factory';

const tenantId = 'test-state';
const token = JwtFactory.createAdminToken(tenantId);
const client = createGatewayClient(token);
client.setTenantId(tenantId);

async function test() {
  try {
    // Create party
    const party = await client.post('/party/party', {
      type: 'individual',
      fullName: 'Test User',
      nationalId: '9999999999',
      contact: { email: 'test@test.com', phone: '+98900000000' },
    });
    console.log('Party:', party.data.partyId, 'status:', party.data.type);

    // Create quote
    const quote = await client.post('/policies/policies/quote', {
      productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      lineOfBusiness: 'AUTO',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      premiumAmount: 15000000,
      coverages: [{ type: 'third_party', limit: 500000000 }],
      deductibles: [{ type: 'collision', amount: 5000000 }],
      partyId: party.data.partyId,
      tenantId,
    });
    console.log('Quote:', quote.data.policyId, 'status:', quote.data.status);

    // Convert to policy
    const policy = await client.post('/policies/policies/convert-quote', {
      quote: {
        productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        lineOfBusiness: 'AUTO',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        premiumAmount: 15000000,
        coverages: [{ type: 'third_party', limit: 500000000 }],
        deductibles: [{ type: 'collision', amount: 5000000 }],
        partyId: party.data.partyId,
        tenantId,
      },
      tenantId,
    });
    console.log('Policy:', policy.data.policyId, 'status:', policy.data.status);

    // Submit docs
    const docs = await client.post(`/policies/policies/${policy.data.policyId}/submit-docs`, {
      applicationData: { documents: [{ type: 'id_card', url: 'https://example.com/id.pdf' }] },
    });
    console.log('Docs:', docs.success, 'status:', docs.data?.status);

    // Risk assess
    const risk = await client.post(`/policies/policies/${policy.data.policyId}/risk-assess`, {
      riskAssessment: { riskScore: 25, assessorId: 'uw-1', notes: 'Low risk' },
    });
    console.log('Risk:', risk.success, 'status:', risk.data?.status);

    // Underwriting decision
    const uw = await client.post(`/policies/policies/${policy.data.policyId}/underwriting/decision`, {
      decision: 'approved',
      underwriterId: 'uw-1',
      notes: 'Approved',
    });
    console.log('UW:', uw.success, 'status:', uw.data?.status);

    // Issue
    try {
      const issue = await client.post(`/policies/policies/${policy.data.policyId}/issue`, {
        underwriterId: 'uw-1',
        decision: 'approved',
        paid: true,
      });
      console.log('Issue:', issue.success, 'status:', issue.data?.status, 'error:', issue.error);
    } catch (e: any) {
      console.log('Issue ERROR:', e.response?.data);
    }

    // Unique code
    try {
      const uc = await client.post(`/policies/policies/${policy.data.policyId}/unique-code`, {
        uniqueCode: 'SANHAB-TEST-001',
      });
      console.log('UC:', uc.success, 'status:', uc.data?.status, 'error:', uc.error);
    } catch (e: any) {
      console.log('UC ERROR:', e.response?.data);
    }

  } catch (e: any) {
    console.error('Error:', e.response?.data || e.message);
  }
}

test();
