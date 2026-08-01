const jwt = require('jsonwebtoken');
const axios = require('axios');

const t = jwt.sign(
  { sub: 'broker-user', tenantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', roles: ['broker_owner'], organizationId: 'b1c2d3e4-f5a6-7890-abcd-ef1234567890', iss: 'http://localhost:18001', aud: 'insurance-platform' },
  'your-super-secret-jwt-key-change-in-production',
  { expiresIn: '1h' }
);

async function run() {
  const eps = [
    ['SN health', 'http://localhost:18022/health'],
    ['SN partners', 'http://localhost:18022/sales-network/partners?kind=agent&limit=10&offset=0'],
    ['SN agreements', 'http://localhost:18022/sales-network/agreements?limit=10&offset=0'],
    ['SN dashboard', 'http://localhost:18022/sales-network/broker/b1c2d3e4-f5a6-7890-abcd-ef1234567890/dashboard'],
    ['SP health', 'http://localhost:18005/health'],
    ['SP submissions', 'http://localhost:18005/api/v1/submissions?limit=10&offset=0'],
    ['SP placements', 'http://localhost:18005/api/v1/placements?limit=10&offset=0'],
    ['SP rfq', 'http://localhost:18005/api/v1/rfq/requests?limit=10&offset=0'],
    ['Product health', 'http://localhost:18018/health'],
    ['Product offerings', 'http://localhost:18018/api/v1/broker-offerings?limit=10&offset=0'],
  ];
  for (const [n, u] of eps) {
    try {
      const r = await axios.get(u, { headers: { Authorization: 'Bearer ' + t }, timeout: 35000 });
      console.log(n + ': OK ' + JSON.stringify(r.data).substring(0, 100));
    } catch (e) {
      console.log(n + ': ERR ' + (e.response?.status || 'timeout') + ' ' + JSON.stringify(e.response?.data || e.message).substring(0, 100));
    }
  }
}
run();
