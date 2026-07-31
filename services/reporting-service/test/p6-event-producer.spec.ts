import { describe, it, expect } from 'bun:test';
import { P6EventProducer } from '../src/events/p6-event-producer';

function createMockDataSource() {
  const savedEvents: any[] = [];
  return {
    _savedEvents: savedEvents,
    getRepository: () => ({
      create: (o: any) => ({ ...o }),
      save: async (o: any) => { savedEvents.push(o); return o; },
      update: async () => {},
      findOne: async () => null,
      find: async () => [],
    }),
  } as any;
}

describe('P6EventProducer', () => {
  it('publishes broker_report.generated event', async () => {
    const ds = createMockDataSource();
    const producer = new P6EventProducer(ds);
    const eventId = await producer.publishBrokerReportGenerated('r1', 't1', 'corr-1');
    expect(eventId).toBeTruthy();
    expect(ds._savedEvents.length).toBe(1);
    expect(ds._savedEvents[0].eventType).toBe('broker_report.generated');
    expect(ds._savedEvents[0].topic).toBe('insurance.reporting.events');
    expect(ds._savedEvents[0].correlationId).toBe('corr-1');
  });

  it('publishes broker_report.approved event with actor', async () => {
    const ds = createMockDataSource();
    const producer = new P6EventProducer(ds);
    const eventId = await producer.publishBrokerReportApproved('r1', 'user-1', 't1', 'corr-2');
    expect(eventId).toBeTruthy();
    expect(ds._savedEvents[0].eventType).toBe('broker_report.approved');
    expect(ds._savedEvents[0].payloadJson).toHaveProperty('approvedBy', 'user-1');
  });

  it('publishes broker_report.submitted event', async () => {
    const ds = createMockDataSource();
    const producer = new P6EventProducer(ds);
    await producer.publishBrokerReportSubmitted('r1', 't1');
    expect(ds._savedEvents[0].eventType).toBe('broker_report.submitted');
  });

  it('publishes tcor_report.generated event', async () => {
    const ds = createMockDataSource();
    const producer = new P6EventProducer(ds);
    await producer.publishTCoRReportGenerated('tcor-1', 't1');
    expect(ds._savedEvents[0].eventType).toBe('tcor_report.generated');
  });

  it('publishes tcor_report.submitted event', async () => {
    const ds = createMockDataSource();
    const producer = new P6EventProducer(ds);
    await producer.publishTCoRReportSubmitted('tcor-1', 't1');
    expect(ds._savedEvents[0].eventType).toBe('tcor_report.submitted');
  });

  it('publishes data_quality.issue_detected event with severity', async () => {
    const ds = createMockDataSource();
    const producer = new P6EventProducer(ds);
    await producer.publishDataQualityIssueDetected('dq-1', 'negative_premium', 'critical', 't1');
    expect(ds._savedEvents[0].eventType).toBe('data_quality.issue_detected');
    expect(ds._savedEvents[0].payloadJson).toHaveProperty('severity', 'critical');
  });

  it('publishes data_quality.issue_resolved event', async () => {
    const ds = createMockDataSource();
    const producer = new P6EventProducer(ds);
    await producer.publishDataQualityIssueResolved('dq-1', 'user-1', 't1');
    expect(ds._savedEvents[0].eventType).toBe('data_quality.issue_resolved');
  });

  it('publishes audit_report.generated event', async () => {
    const ds = createMockDataSource();
    const producer = new P6EventProducer(ds);
    await producer.publishAuditReportGenerated('ar-1', 'policy_issuance', 't1');
    expect(ds._savedEvents[0].eventType).toBe('audit_report.generated');
    expect(ds._savedEvents[0].payloadJson).toHaveProperty('reportType', 'policy_issuance');
  });

  it('publishes settlement.reconciled event with organizationId', async () => {
    const ds = createMockDataSource();
    const producer = new P6EventProducer(ds);
    await producer.publishSettlementReconciled('broker-org-1', 5000, 't1');
    expect(ds._savedEvents[0].eventType).toBe('settlement.reconciled');
    expect(ds._savedEvents[0].organizationId).toBe('broker-org-1');
    expect(ds._savedEvents[0].payloadJson).toHaveProperty('discrepancy', 5000);
  });

  it('generates correlationId when not provided', async () => {
    const ds = createMockDataSource();
    const producer = new P6EventProducer(ds);
    const eventId = await producer.publishBrokerReportGenerated('r1', 't1');
    expect(eventId).toBeTruthy();
    expect(ds._savedEvents[0].correlationId).toBeTruthy();
    expect(typeof ds._savedEvents[0].correlationId).toBe('string');
  });
});
