import { createGatewayClient } from '../tests/helpers/api-client';
import { JwtFactory } from '../tests/helpers/jwt-factory';

const tenantId = 'test-aml';
const token = JwtFactory.createAdminToken(tenantId);
const client = createGatewayClient(token);
client.setTenantId(tenantId);

async function test() {
  try {
    const ruleResponse = await client.post('/aml/aml/rules', {
      ruleName: `Test Rule ${Date.now()}`,
      ruleType: 'transaction_amount',
      expression: 'amount > 100',
      severity: 'high',
      description: 'Test',
      status: 'active',
    });
    console.log('Rule:', JSON.stringify(ruleResponse, null, 2));
  } catch (e: any) {
    console.error('Error:', e.response?.status, e.response?.data || e.message);
  }
}

test();
