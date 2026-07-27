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
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  tenantId!: string | null;

  @Column({ type: 'uuid' })
  claimId!: string;

  @Column({ type: 'enum', enum: IrregularityPattern })
  patternType!: IrregularityPattern;

  @Column({ type: 'enum', enum: AlertSeverity })
  severity!: AlertSeverity;

  @Column({ type: 'enum', enum: AlertStatus, default: AlertStatus.NEW })
  status!: AlertStatus;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'jsonb' })
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

  @Column({ type: 'uuid', nullable: true })
  assignedTo!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  assignedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  resolvedBy!: string | null;

  @Column({ type: 'text', nullable: true })
  resolutionNotes!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
