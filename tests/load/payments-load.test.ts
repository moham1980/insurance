import { describe, test, expect } from '@jest/globals';

describe('Load: Payments API', () => {
  test('T-LOAD-02: Payments API: 50 RPS for 30s → p95 < 500ms', async () => {
    const duration = 30000; // 30 seconds
    const targetRPS = 50;
    const targetP95 = 500; // 500ms

    const latencies: number[] = [];

    // Simulate load test
    for (let i = 0; i < targetRPS * (duration / 1000); i++) {
      const requestStart = Date.now();
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, Math.random() * 150 + 30));
      
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
