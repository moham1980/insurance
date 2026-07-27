import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.API_URL || 'http://localhost:18000';

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 10 },    // Stay at 10 users
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '1m', target: 50 },    // Stay at 50 users
    { duration: '30s', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],    // Error rate must be less than 1%
  },
};

export default function () {
  // Login to get JWT token
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    username: 'test_user',
    password: 'test_password',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'login successful': (r) => r.status === 200,
  });

  const token = loginRes.json('token');

  // List claims
  const claimsRes = http.get(`${BASE_URL}/claims`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  check(claimsRes, {
    'claims list successful': (r) => r.status === 200,
    'claims list has data': (r) => r.json('data').length >= 0,
  });

  sleep(1);
}
