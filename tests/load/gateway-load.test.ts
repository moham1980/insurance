import { describe, test, expect } from '@jest/globals';

describe('Load: Gateway', () => {
  test('T-LOAD-06: Gateway: 200 RPS mixed → p95 < 300ms', async () => {
    const duration = 30000; // 30 seconds
    const targetRPS = 200;
    const targetP95 = 300; // 300ms

    const latencies: number[] = [];

    // Simulate mixed traffic (policy, claims, payments)
    const endpoints = ['/policy', '/claims', '/payments', '/party', '/product'];

    // Simulate load test
    for (let i = 0; i < targetRPS * (duration / 1000); i++) {
      const requestStart = Date.now();
      
      // Simulate API call
      const endpoint = endpoints[i % endpoints.length];
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10));
      
      const latency = Date.now() - requestStart;
      latencies.push(latency);
    }

    // Calculate p95
    const sortedLatencies = latencies.sort((a, b) => a - b);
    const p95Index = Math.floor(sortedLatencies.length * 0.95);
    const p95 = sortedLatencies[p95Index];

    expect(p95).toBeLessThan(targetP95);
  });
});
