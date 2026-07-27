import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('rm_fraud_case_escalations')
@Index(['occurredAt'])
@Index(['claimId'])
@Index(['fraudCaseId'])
@Index(['toUnit'])
export class RmFraudCaseEscalation {
  @Column({ type: 'uuid', name: 'tenant_id', nullable: true })
  tenantId?: string | null;

  @PrimaryColumn({ name: 'event_id', type: 'text' })
  eventId!: string;

  @Column({ name: 'occurred_at', type: 'timestamptz', nullable: true })
  occurredAt!: Date | null;

  @Column({ name: 'correlation_id', type: 'text', nullable: true })
  correlationId!: string | null;

  @Column({ name: 'fraud_case_id', type: 'uuid' })
  fraudCaseId!: string;

  @Column({ name: 'claim_id', type: 'uuid' })
  claimId!: string;

  @Column({ name: 'claim_number', type: 'text', nullable: true })
  claimNumber!: string | null;

  @Column({ name: 'escalated_at', type: 'timestamptz', nullable: true })
  escalatedAt!: Date | null;

  @Column({ name: 'to_unit', type: 'text' })
  toUnit!: string;

  @Column({ name: 'reason_codes', type: 'jsonb', nullable: true })
  reasonCodes!: string[] | null;

  @Column({ name: 'requires_human_approval', type: 'boolean', nullable: true })
  requiresHumanApproval!: boolean | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date;
}
