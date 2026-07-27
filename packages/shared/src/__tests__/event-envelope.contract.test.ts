import { createEventEnvelope } from '../events/EventEnvelope';

describe('EventEnvelope contract', () => {
  it('creates an envelope with required fields and ISO occurredAt', () => {
    const env = createEventEnvelope({
      eventId: 'e1',
      eventType: 'insurance.test.event',
      eventVersion: 1,
      producer: 'test-producer',
      correlationId: 'c1',
      subject: { tenantId: 't1', policyId: 'p1' },
      payload: { ok: true },
    });

    expect(env.eventId).toBe('e1');
    expect(env.eventType).toBe('insurance.test.event');
    expect(env.eventVersion).toBe(1);
    expect(env.producer).toBe('test-producer');
    expect(env.correlationId).toBe('c1');
    expect(env.tenantId).toBeUndefined();
    expect(env.subject).toEqual({ tenantId: 't1', policyId: 'p1' });
    expect(env.payload).toEqual({ ok: true });

    expect(typeof env.occurredAt).toBe('string');
    expect(() => new Date(env.occurredAt).toISOString()).not.toThrow();
  });

  it('accepts occurredAt as Date and passes through optional trace fields', () => {
    const d = new Date('2026-01-01T00:00:00.000Z');
    const env = createEventEnvelope({
      eventId: 'e2',
      eventType: 'insurance.test.event2',
      eventVersion: 2,
      producer: 'test-producer',
      correlationId: 'c2',
      tenantId: 't2',
      idempotencyKey: 'idem-1',
      causationId: 'cause-1',
      traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      occurredAt: d,
      subject: { claimId: 'cl1' },
      payload: { n: 1 },
    });

    expect(env.occurredAt).toBe('2026-01-01T00:00:00.000Z');
    expect(env.tenantId).toBe('t2');
    expect(env.idempotencyKey).toBe('idem-1');
    expect(env.causationId).toBe('cause-1');
    expect(env.traceparent).toBe('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');
  });
});
