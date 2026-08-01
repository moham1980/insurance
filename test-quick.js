const jwt = require('jsonwebtoken');
const t = jwt.sign(
  { sub: 'broker-user', tenantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', roles: ['broker_owner'], organizationId: 'b1c2d3e4-f5a6-7890-abcd-ef1234567890', iss: 'http://localhost:18001', aud: 'insurance-platform' },
  'your-super-secret-jwt-key-change-in-production',
  { expiresIn: '1h' }
);

async function test(url, label) {
  const start = Date.now();
  try {
    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + t } });
    const d = await r.json();
    console.log(`${label}: ${r.status} in ${Date.now() - start}ms - ${JSON.stringify(d).slice(0, 300)}`);
  } catch (e) {
    console.log(`${label}: FAIL in ${Date.now() - start}ms - ${e.message}`);
  }
}

(async () => {
  await test('http://localhost:18005/api/v1/submissions?limit=10&offset=0', 'submissions');
  await test('http://localhost:18005/api/v1/placements?limit=10&offset=0', 'placements');
  await test('http://localhost:3030/api/v1/broker/submissions?limit=10&offset=0', 'bff-submissions');
  await test('http://localhost:3030/api/v1/broker/placements?limit=10&offset=0', 'bff-placements');
  await test('http://localhost:3030/api/v1/broker/reports/broker-transactions', 'bff-reports');
})();
