import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { OutboxPublisher } from '@insurance/shared';
import { v4 as uuidv4 } from 'uuid';

export type P6EventType =
  | 'broker_report.generated'
  | 'broker_report.approved'
  | 'broker_report.submitted'
  | 'tcor_report.generated'
  | 'tcor_report.submitted'
  | 'data_quality.issue_detected'
  | 'data_quality.issue_resolved'
  | 'audit_report.generated'
  | 'settlement.reconciled'
  | 'bi_aggregate.refreshed'
  | 'reconciliation.discrepancy_detected';

interface P6PublishParams {
  eventType: P6EventType;
  tenantId?: string;
  correlationId?: string;
  subject: Record<string, any>;
  payload: Record<string, any>;
  organizationId?: string;
}

const TOPIC_MAP: Record<P6EventType, string> = {
  'broker_report.generated': 'insurance.reporting.events',
  'broker_report.approved': 'insurance.reporting.events',
  'broker_report.submitted': 'insurance.reporting.events',
  'tcor_report.generated': 'insurance.reporting.events',
  'tcor_report.submitted': 'insurance.reporting.events',
  'data_quality.issue_detected': 'insurance.reporting.events',
  'data_quality.issue_resolved': 'insurance.reporting.events',
  'audit_report.generated': 'insurance.reporting.events',
  'settlement.reconciled': 'insurance.reporting.events',
  'bi_aggregate.refreshed': 'insurance.reporting.events',
  'reconciliation.discrepancy_detected': 'insurance.reporting.events',
};

@Injectable()
export class P6EventProducer {
  private readonly logger = new Logger(P6EventProducer.name);
  private publisher: OutboxPublisher;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    this.publisher = new OutboxPublisher(dataSource);
  }

  async publish(params: P6PublishParams): Promise<string> {
    const correlationId = params.correlationId || uuidv4();
    const topic = TOPIC_MAP[params.eventType];

    const eventId = await this.publisher.publish({
      topic,
      eventType: params.eventType,
      eventVersion: 1,
      correlationId,
      tenantId: params.tenantId || 'unknown',
      organizationId: params.organizationId,
      subject: params.subject,
      payload: params.payload,
      producer: 'reporting-service',
      dataClassification: 'INTERNAL',
    });

    this.logger.log(`Published ${params.eventType} event ${eventId} to ${topic}`);
    return eventId;
  }

  async publishBrokerReportGenerated(reportId: string, tenantId?: string, correlationId?: string): Promise<string> {
    return this.publish({
      eventType: 'broker_report.generated',
      tenantId,
      correlationId,
      subject: { reportId, tenantId },
      payload: { reportId, status: 'generated', timestamp: new Date().toISOString() },
    });
  }

  async publishBrokerReportApproved(reportId: string, actorUserId: string, tenantId?: string, correlationId?: string): Promise<string> {
    return this.publish({
      eventType: 'broker_report.approved',
      tenantId,
      correlationId,
      subject: { reportId, tenantId },
      payload: { reportId, approvedBy: actorUserId, timestamp: new Date().toISOString() },
    });
  }

  async publishBrokerReportSubmitted(reportId: string, tenantId?: string, correlationId?: string): Promise<string> {
    return this.publish({
      eventType: 'broker_report.submitted',
      tenantId,
      correlationId,
      subject: { reportId, tenantId },
      payload: { reportId, status: 'submitted', timestamp: new Date().toISOString() },
    });
  }

  async publishTCoRReportGenerated(reportId: string, tenantId?: string, correlationId?: string): Promise<string> {
    return this.publish({
      eventType: 'tcor_report.generated',
      tenantId,
      correlationId,
      subject: { reportId, tenantId },
      payload: { reportId, status: 'generated', timestamp: new Date().toISOString() },
    });
  }

  async publishTCoRReportSubmitted(reportId: string, tenantId?: string, correlationId?: string): Promise<string> {
    return this.publish({
      eventType: 'tcor_report.submitted',
      tenantId,
      correlationId,
      subject: { reportId, tenantId },
      payload: { reportId, status: 'submitted', timestamp: new Date().toISOString() },
    });
  }

  async publishDataQualityIssueDetected(issueId: string, ruleId: string, severity: string, tenantId?: string, correlationId?: string): Promise<string> {
    return this.publish({
      eventType: 'data_quality.issue_detected',
      tenantId,
      correlationId,
      subject: { issueId, tenantId },
      payload: { issueId, ruleId, severity, timestamp: new Date().toISOString() },
    });
  }

  async publishDataQualityIssueResolved(issueId: string, resolvedBy: string, tenantId?: string, correlationId?: string): Promise<string> {
    return this.publish({
      eventType: 'data_quality.issue_resolved',
      tenantId,
      correlationId,
      subject: { issueId, tenantId },
      payload: { issueId, resolvedBy, timestamp: new Date().toISOString() },
    });
  }

  async publishAuditReportGenerated(reportId: string, reportType: string, tenantId?: string, correlationId?: string): Promise<string> {
    return this.publish({
      eventType: 'audit_report.generated',
      tenantId,
      correlationId,
      subject: { reportId, tenantId },
      payload: { reportId, reportType, timestamp: new Date().toISOString() },
    });
  }

  async publishSettlementReconciled(brokerOrganizationId: string, discrepancy: number, tenantId?: string, correlationId?: string): Promise<string> {
    return this.publish({
      eventType: 'settlement.reconciled',
      tenantId,
      correlationId,
      organizationId: brokerOrganizationId,
      subject: { brokerOrganizationId, tenantId },
      payload: { brokerOrganizationId, discrepancy, timestamp: new Date().toISOString() },
    });
  }

  async publishBIAggregateRefreshed(tenantId?: string, correlationId?: string): Promise<string> {
    return this.publish({
      eventType: 'bi_aggregate.refreshed',
      tenantId,
      correlationId,
      subject: { tenantId },
      payload: { refreshedAt: new Date().toISOString() },
    });
  }

  async publishReconciliationDiscrepancyDetected(reconciliationType: string, discrepancy: number, details: Record<string, any>, tenantId?: string, correlationId?: string): Promise<string> {
    return this.publish({
      eventType: 'reconciliation.discrepancy_detected',
      tenantId,
      correlationId,
      subject: { reconciliationType, tenantId },
      payload: { reconciliationType, discrepancy, details, timestamp: new Date().toISOString() },
    });
  }
}
