import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum IrregularityPattern {
  MULTIPLE_CLAIMS_SHORT_PERIOD = 'multiple_claims_short_period',
  SAME_PARTY_MULTIPLE_CLAIMS = 'same_party_multiple_claims',
  RAPID_POLICY_ISSUANCE_CLAIM = 'rapid_policy_issuance_claim',
  SUSPICIOUS_DOCUMENT_TIMING = 'suspicious_document_timing',
  UNUSUAL_CLAIM_AMOUNT = 'unusual_claim_amount',
  GEOGRAPHIC_PATTERN_ANOMALY = 'geographic_pattern_anomaly',
  FREQUENT_ADDRESS_CHANGES = 'frequent_address_changes',
  REPEATED_LOSS_TYPE = 'repeated_loss_type',
  UNUSUAL_TIME_PATTERN = 'unusual_time_pattern',
  SUSPICIOUS_PROVIDER_PATTERN = 'suspicious_provider_pattern',
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AlertStatus {
  NEW = 'new',
  INVESTIGATING = 'investigating',
  CONFIRMED = 'confirmed',
  FALSE_POSITIVE = 'false_positive',
  DISMISSED = 'dismissed',
}

@Entity('fraud_irregularity_alerts')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'severity'])
@Index(['tenantId', 'patternType'])
@Index(['claimId'])
export class FraudIrregularityAlert {
  @PrimaryGeneratedColumn('uuid', { name: 'alert_id' })
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId!: string | null;

  @Column({ name: 'claim_id', type: 'uuid' })
  claimId!: string;

  @Column({ name: 'alert_type', type: 'text' })
  patternType!: IrregularityPattern;

  @Column({ type: 'text' })
  severity!: AlertSeverity;

  @Column({ type: 'text', default: AlertStatus.NEW })
  status!: AlertStatus;

  @Column({ type: 'text' })
  description!: string;

  @Column({ name: 'detection_details', type: 'jsonb' })
  detectionDetails!: {
    pattern: string;
    threshold?: number;
    actualValue: number;
    confidence: number;
    timeframe?: {
      start: Date;
      end: Date;
    };
    relatedEntities?: Array<{
      type: string;
      id: string;
      name: string;
    }>;
  };

  @Column({ type: 'jsonb', nullable: true })
  recommendations!: string[] | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  assignedTo!: string | null;

  @Column({ name: 'assigned_at', type: 'timestamp', nullable: true })
  assignedAt!: Date | null;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt!: Date | null;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy!: string | null;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
