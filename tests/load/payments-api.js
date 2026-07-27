import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.API_URL || 'http://localhost:18000';

export const options = {
  stages: [
    { duration: '30s', target: 5 },    // Ramp up to 5 users
    { duration: '1m', target: 5 },     // Stay at 5 users
    { duration: '30s', target: 20 },   // Ramp up to 20 users
    { duration: '1m', target: 20 },    // Stay at 20 users
    { duration: '30s', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests must complete below 1s
    http_req_failed: ['rate<0.02'],     // Error rate must be less than 2%
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

  // List payments
  const paymentsRes = http.get(`${BASE_URL}/payments`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  check(paymentsRes, {
    'payments list successful': (r) => r.status === 200,
  });

  sleep(1);
}
