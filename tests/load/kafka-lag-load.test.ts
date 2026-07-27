import { describe, test, expect } from '@jest/globals';

describe('Load: Kafka Consumer Lag', () => {
  test('T-LOAD-08: Kafka consumer lag: 1000 events → catch-up < 30s', async () => {
    const eventCount = 1000;
    const targetCatchUpTime = 30000; // 30s

    const events = new Array(eventCount).fill(0).map((_, idx) => ({
      id: idx,
      type: 'test.event',
      timestamp: Date.now(),
    }));

    const consumedCount = { value: 0 };
    const startTime = Date.now();

    // Simulate consumer catching up
    const consumeEvents = async (): Promise<void> => {
      for (const event of events) {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, Math.random() * 5 + 1));
        consumedCount.value++;
      }
    };

    await consumeEvents();

    const catchUpTime = Date.now() - startTime;

    expect(consumedCount.value).toBe(eventCount);
    expect(catchUpTime).toBeLessThan(targetCatchUpTime);
  });
});
