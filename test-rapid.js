const jwt = require('jsonwebtoken');
const t = jwt.sign(
  { sub: 'broker-user', tenantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', roles: ['broker_owner'], organizationId: 'b1c2d3e4-f5a6-7890-abcd-ef1234567890', iss: 'http://localhost:18001', aud: 'insurance-platform' },
  'your-super-secret-jwt-key-change-in-production',
  { expiresIn: '1h' }
);

async function test(url, label, i) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const r = await fetch(url, { 
      headers: { Authorization: 'Bearer ' + t },
      signal: controller.signal 
    });
    clearTimeout(timeout);
    const d = await r.json();
    console.log(`[${i}] ${label}: ${r.status} in ${Date.now() - start}ms - success=${d.success}`);
  } catch (e) {
    console.log(`[${i}] ${label}: FAIL in ${Date.now() - start}ms - ${e.message}`);
  }
}

(async () => {
  // Test 15 rapid requests to submission-placement-service
  for (let i = 0; i < 15; i++) {
    await test('http://localhost:18005/api/v1/submissions?limit=10&offset=0', 'submissions', i);
  }
  // Test placements
  for (let i = 0; i < 15; i++) {
    await test('http://localhost:18005/api/v1/placements?limit=10&offset=0', 'placements', i);
  }
})();
