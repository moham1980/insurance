import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type AmlAlertStatus = 'open' | 'in_review' | 'cleared' | 'escalated' | 'closed';

@Entity('aml_alerts')
@Index(['status', 'createdAt'])
@Index(['subjectNationalId', 'createdAt'])
@Index(['ruleId'])
@Index(['partyId', 'createdAt'])
@Index(['referenceType', 'referenceId'])
export class AmlAlert {
  @PrimaryGeneratedColumn('uuid', { name: 'alert_id' })
  alertId!: string;

  @Column({ name: 'subject_national_id', type: 'text', nullable: true })
  subjectNationalId!: string | null;

  @Column({ name: 'rule_id', type: 'uuid', nullable: true })
  ruleId!: string | null;

  @Column({ name: 'status', type: 'text', default: 'open' })
  status!: AmlAlertStatus;

  @Column({ name: 'severity', type: 'text', default: 'medium' })
  severity!: 'low' | 'medium' | 'high' | 'critical';

  @Column({ name: 'risk_level', type: 'text', nullable: true })
  riskLevel!: string | null;

  @Column({ name: 'risk_score', type: 'numeric', nullable: true })
  riskScore!: number | null;

  @Column({ name: 'title', type: 'text' })
  title!: string;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason!: string | null;

  @Column({ name: 'party_id', type: 'text', nullable: true })
  partyId!: string | null;

  @Column({ name: 'party_name', type: 'text', nullable: true })
  partyName!: string | null;

  @Column({ name: 'transaction_type', type: 'text', nullable: true })
  transactionType!: string | null;

  @Column({ name: 'amount', type: 'numeric', nullable: true })
  amount!: number | null;

  @Column({ name: 'currency', type: 'text', nullable: true })
  currency!: string | null;

  @Column({ name: 'reference_type', type: 'text', nullable: true })
  referenceType!: string | null;

  @Column({ name: 'reference_id', type: 'text', nullable: true })
  referenceId!: string | null;

  @Column({ name: 'matched_rules', type: 'jsonb', nullable: true })
  matchedRules!: string[] | null;

  @Column({ name: 'details', type: 'jsonb', nullable: true })
  details!: any | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @Column({ name: 'assigned_to', type: 'text', nullable: true })
  assignedTo!: string | null;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'escalated_at', type: 'timestamptz', nullable: true })
  escalatedAt!: Date | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @Column({ name: 'resolution', type: 'text', nullable: true })
  resolution!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
