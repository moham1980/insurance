const jwt = require('jsonwebtoken');
const axios = require('axios');

const t = jwt.sign(
  { sub: 'broker-user', tenantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', roles: ['broker_owner'], organizationId: 'b1c2d3e4-f5a6-7890-abcd-ef1234567890', iss: 'http://localhost:18001', aud: 'insurance-platform' },
  'your-super-secret-jwt-key-change-in-production',
  { expiresIn: '1h' }
);

async function run() {
  const eps = [
    ['dashboard', 'http://localhost:3030/api/v1/broker/dashboard'],
    ['agreements', 'http://localhost:3030/api/v1/broker/agreements?limit=10&offset=0'],
    ['submissions', 'http://localhost:3030/api/v1/broker/submissions?limit=10&offset=0'],
    ['placements', 'http://localhost:3030/api/v1/broker/placements?limit=10&offset=0'],
    ['payments', 'http://localhost:3030/api/v1/broker/payments?limit=10&offset=0'],
    ['policies', 'http://localhost:3030/api/v1/broker/policies?limit=10&offset=0'],
  ];
  for (const [n, u] of eps) {
    try {
      const r = await axios.get(u, { headers: { Authorization: 'Bearer ' + t }, timeout: 35000 });
      console.log(n + ': ' + (r.data.success ? 'OK' : 'FAIL') + ' ' + JSON.stringify(r.data).substring(0, 80));
    } catch (e) {
      console.log(n + ': ERR ' + (e.response?.status || 'timeout') + ' ' + JSON.stringify(e.response?.data || e.message).substring(0, 80));
    }
  }
}
run();
